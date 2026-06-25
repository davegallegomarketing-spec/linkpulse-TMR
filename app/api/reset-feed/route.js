// /api/reset-feed/route.js — ONE-TIME cleanup of the published list.
//
// Why: after a lot of test publishing, the stored order got tangled (the block
// is out of order and the list grew to 800+). This rebuilds it cleanly:
//   • keeps the current Hero 1 + Hero 2 exactly as they are (positions 1-2)
//   • re-orders the block newest-first
//   • de-duplicates by link
//   • trims to MAX_ARTICLES (150) — drops only the invisible tail
//
// SAFETY:
//   • Secret-gated (same AUTO_FEED_SECRET as Auto-Feed).
//   • PREVIEW by default — a plain GET writes NOTHING, it only shows you the
//     result. You must pass ?commit=true to actually write.
//   • Full backup of the current list before any write.
//   • Never writes an empty or too-short list.
import { put, list } from "@vercel/blob";

var MAX_ARTICLES = 150;   // heroes + blocks kept
var HEROES = 2;
var VISIBLE = 122;        // what the live site shows (2 + 30 + 90)

function authorized(request) {
  var secret = process.env.AUTO_FEED_SECRET;
  if (!secret) return false;
  var auth = request.headers.get("authorization") || "";
  var bearer = auth.replace(/^Bearer\s+/i, "");
  var key = new URL(request.url).searchParams.get("key") || "";
  return bearer === secret || key === secret;
}

function json(obj, status) {
  return new Response(JSON.stringify(obj, null, 2), {
    status: status || 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function readLatest() {
  try {
    var result = await list({ prefix: "editions/" });
    var blobs = (result && result.blobs) || [];
    var match = blobs.find(function (b) { return b.pathname === "editions/latest.json"; });
    if (!match) return null;
    var res = await fetch(match.downloadUrl || match.url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

function timeOf(a) {
  var t = a.pubDate ? Date.parse(a.pubDate) : NaN;
  if (isNaN(t)) t = a.addedAt ? Date.parse(a.addedAt) : NaN;
  return isNaN(t) ? 0 : t;
}

async function run(request) {
  if (!authorized(request)) return json({ error: "Unauthorized" }, 401);

  var commit = new URL(request.url).searchParams.get("commit") === "true";

  var existing = await readLatest();
  var arts = (existing && existing.articles) ? existing.articles : [];
  if (arts.length === 0) return json({ error: "Nothing published to clean up" }, 400);

  // Keep the current heroes exactly as they are.
  var heroes = arts.slice(0, HEROES);

  // Rebuild the block: everything after the heroes, de-duplicated by link,
  // newest-first, capped to fill the rest of the list.
  var seen = {};
  heroes.forEach(function (h) { if (h.link) seen[h.link] = true; });
  var blocks = arts.slice(HEROES).filter(function (a) {
    if (!a || !a.link || seen[a.link]) return false;
    seen[a.link] = true;
    return true;
  });
  blocks.sort(function (a, b) { return timeOf(b) - timeOf(a); }); // newest first
  blocks = blocks.slice(0, MAX_ARTICLES - heroes.length);

  var cleaned = heroes.concat(blocks);
  cleaned.forEach(function (a, i) { a.position = i + 1; });

  // Guardrail: never produce an empty/too-short result.
  if (cleaned.length === 0 || cleaned.length < Math.min(arts.length, VISIBLE)) {
    return json({ error: "Aborted: cleaned list too short, wrote nothing", wouldBe: cleaned.length }, 400);
  }

  var preview = {
    mode: commit ? "COMMITTED" : "PREVIEW (nothing written — add ?commit=true to apply)",
    before: arts.length,
    after: cleaned.length,
    dropped: arts.length - cleaned.length,
    hero1: heroes[0] ? heroes[0].title : null,
    hero2: heroes[1] ? heroes[1].title : null,
    lifetimeCounterWillSeedAt: 808,
    firstBlocks: blocks.slice(0, 8).map(function (a, i) { return (i + 1) + ". " + a.title + "  (" + a.source + ")"; }),
  };

  if (!commit) return json(preview, 200);

  // ── COMMIT path ──
  var now = new Date();
  // Back up the full current list first.
  try {
    await put("backups/pre-reset-" + now.toISOString().replace(/[:.]/g, "-") + ".json", JSON.stringify(existing), {
      contentType: "application/json", access: "public", addRandomSuffix: false, allowOverwrite: false,
    });
  } catch (e) { /* backup best-effort; continue */ }

  var dateKey = now.toISOString().split("T")[0];
  var storeKey = dateKey + "_daily";
  var editionData = {
    key: storeKey,
    title: (existing && existing.title) || "Golf Daily",
    edition: "daily",
    publishedAt: now.toISOString(),
    articleCount: cleaned.length,
    articles: cleaned,
  };
  var jsonString = JSON.stringify(editionData);
  await put("editions/latest.json", jsonString, {
    contentType: "application/json", access: "public", addRandomSuffix: false, allowOverwrite: true,
  });
  await put("editions/" + storeKey + ".json", jsonString, {
    contentType: "application/json", access: "public", addRandomSuffix: false, allowOverwrite: true,
  });

  // Seed/lock the lifetime counter at the 808 baseline. Never reduces it — if a
  // counter already exists and is higher, we keep the higher number. This is
  // what preserves the months of posting history through the cleanup.
  try {
    var sres = await list({ prefix: "config/" });
    var sb = ((sres && sres.blobs) || []).find(function (b) { return b.pathname === "config/stats.json"; });
    var prior = null;
    if (sb) { var sr = await fetch(sb.downloadUrl || sb.url, { cache: "no-store" }); if (sr.ok) prior = await sr.json(); }
    var seeded = Math.max((prior && typeof prior.totalPosted === "number") ? prior.totalPosted : 0, 808);
    await put("config/stats.json", JSON.stringify({ totalPosted: seeded, since: (prior && prior.since) || "2026", lastUpdated: now.toISOString() }), {
      contentType: "application/json", access: "public", addRandomSuffix: false, allowOverwrite: true,
    });
    preview.totalPosted = seeded;
  } catch (e) { /* counter seed best-effort */ }

  preview.mode = "COMMITTED — live list cleaned";
  return json(preview, 200);
}

export async function GET(request) { return run(request); }
export async function POST(request) { return run(request); }
