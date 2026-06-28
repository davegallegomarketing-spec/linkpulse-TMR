// /api/auto-publish/route.js — Auto-Feed: scheduled "best 10 blocks" publish.
//
// An external scheduler (GitHub Actions) calls this every 4 hours. It:
//   1. checks the secret (only the scheduler may trigger it)
//   2. checks the Auto-Feed ON/OFF flag — does nothing if OFF
//   3. reuses the existing ranker (/api/feeds) to score fresh articles
//   4. skips anything already published (by link or story key)
//   5. publishes the top 10 as BLOCK stories — the two heroes are left exactly
//      as they are on the site (features: [null, null])
import { list, put } from "@vercel/blob";

var AUTO_COUNT = 6;        // block stories per run (6 × 6 runs/day = 36/day)
var PER_CATEGORY_CAP = 3;  // diversity cap — matches the manual Auto-pick
var MAX_AGE_HOURS = 24;    // only auto-post articles newer than this. On slow
                           // days (weekends) the feed has little new material, so
                           // this posts FEWER (even 0) rather than dredging up old
                           // news — the system waits and accumulates for next run.

async function readFlagEnabled() {
  try {
    var result = await list({ prefix: "config/" });
    var blobs = (result && result.blobs) || [];
    var match = blobs.find(function (b) { return b.pathname === "config/auto-feed.json"; });
    if (!match) return false;
    var res = await fetch(match.downloadUrl || match.url, { cache: "no-store" });
    if (!res.ok) return false;
    var data = await res.json();
    return !!data.enabled;
  } catch (e) { return false; }
}

function authorized(request) {
  // Accept either secret: AUTO_FEED_SECRET (manual tests / GitHub) or
  // CRON_SECRET (Vercel Cron sends "Authorization: Bearer <CRON_SECRET>"
  // automatically when that env var is set).
  var secrets = [process.env.AUTO_FEED_SECRET, process.env.CRON_SECRET].filter(Boolean);
  if (secrets.length === 0) return false; // nothing configured → allow nothing
  var auth = request.headers.get("authorization") || "";
  var bearer = auth.replace(/^Bearer\s+/i, "");
  var key = new URL(request.url).searchParams.get("key") || "";
  return secrets.indexOf(bearer) !== -1 || secrets.indexOf(key) !== -1;
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function run(request) {
  // 1. Auth — only the scheduler (holding the secret) may trigger a publish.
  if (!authorized(request)) return json({ error: "Unauthorized" }, 401);

  // 2. ON/OFF flag.
  var enabled = await readFlagEnabled();
  if (!enabled) return json({ skipped: true, reason: "Auto-Feed is OFF" }, 200);

  // Always self-call the STABLE PUBLIC domain — never the incoming host.
  // Vercel Cron arrives on a protected deployment URL (linkpulse-xxxx.vercel.app);
  // self-fetching that URL hits deployment authentication and fails (the GET 500s).
  // The production domain is public, so internal /api/feeds, /api/published and
  // /api/publish calls succeed no matter who triggered the run. Override with the
  // SELF_BASE_URL env var if the domain ever changes.
  var origin = process.env.SELF_BASE_URL || "https://linkpulse-tmr.vercel.app";

  try {
    // 3. Fresh, scored articles from the existing ranker pipeline.
    var feedsRes = await fetch(origin + "/api/feeds", { cache: "no-store" });
    if (!feedsRes.ok) throw new Error("feeds fetch " + feedsRes.status);
    var feeds = await feedsRes.json();
    var articles = (feeds && feeds.articles) || [];

    // 4. Already-published links + story keys (so we never repeat a story), and
    //    keep the current edition title so the auto-publish doesn't rename it.
    var publishedLinks = {}, publishedStories = {};
    var currentTitle = "";
    try {
      var pubRes = await fetch(origin + "/api/published", { cache: "no-store" });
      if (pubRes.ok) {
        var pub = await pubRes.json();
        currentTitle = (pub && pub.title) || "";
        var pubArts = (pub && pub.articles) || [];
        pubArts.forEach(function (a) {
          if (a.link) publishedLinks[a.link] = true;
          if (a.storyKey) publishedStories[a.storyKey] = true;
        });
      }
    } catch (e) {}

    // 5. Eligible = genuinely FRESH, not a duplicate, not already published.
    //    The age cutoff is the weekend guard: if the newest available stories are
    //    older than MAX_AGE_HOURS, they're skipped, so a slow day posts fewer
    //    (or none) instead of old news.
    var nowMs = Date.now();
    var eligible = articles.filter(function (a) {
      if (!a || !a.link) return false;
      if (a.freshness !== "fresh" && a.freshness !== "recent") return false;
      if (a.duplicateOf) return false;
      if (publishedLinks[a.link]) return false;
      if (a.storyKey && publishedStories[a.storyKey]) return false;
      // Freshness cutoff by real publish time.
      var t = a.pubDate ? new Date(a.pubDate).getTime() : NaN;
      if (isNaN(t)) return false;                       // no date → can't confirm fresh
      if ((nowMs - t) / 3600000 > MAX_AGE_HOURS) return false; // too old → wait
      return true;
    });

    // 6. Most recent FIRST (so Auto-Feed always reflects what just broke, not
    //    stories that have been sitting a few hours). Quality score only breaks
    //    ties between articles published at the same time. Then per-category cap.
    eligible.sort(function (a, b) {
      var at = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      var bt = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      if (bt !== at) return bt - at;          // newest first
      var sa = a.rank ? a.rank.score : 0;
      var sb = b.rank ? b.rank.score : 0;
      return sb - sa;                         // tie-break by quality
    });
    var perCat = {};
    var picks = [];
    for (var i = 0; i < eligible.length && picks.length < AUTO_COUNT; i++) {
      var a = eligible[i];
      var c = a.feedCategory || "Tour News";
      if ((perCat[c] || 0) >= PER_CATEGORY_CAP) continue;
      perCat[c] = (perCat[c] || 0) + 1;
      picks.push(a);
    }

    if (picks.length === 0) {
      return json({ published: 0, reason: "No new fresh articles to publish" }, 200);
    }

    // 7. Publish as BLOCK stories — heroes left as-is (features: [null, null]).
    var pubBody = {
      articles: picks,
      features: [null, null],
      edition: "daily",
      title: currentTitle || "The Mulligan Report",
    };
    var publishRes = await fetch(origin + "/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pubBody),
    });
    if (!publishRes.ok) {
      var t = "";
      try { t = await publishRes.text(); } catch (e) {}
      throw new Error("publish " + publishRes.status + " " + t);
    }
    var pubResult = await publishRes.json();

    // Record this run for the tool's "Last Auto-Feed" visor. Only successful
    // publishes (count > 0) are saved, so the line always shows the last time
    // stories actually went out and holds until the next real run.
    var ranAt = new Date().toISOString();
    try {
      await put("config/auto-feed-status.json", JSON.stringify({ count: picks.length, at: ranAt, ok: true }), {
        contentType: "application/json",
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    } catch (e) { /* status is best-effort; never fail the publish over it */ }

    return json({
      published: picks.length,
      picks: picks.map(function (a) { return { title: a.title, source: a.feedName, link: a.link }; }),
      publish: pubResult,
      at: ranAt,
    }, 200);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

export async function POST(request) { return run(request); }
// Some schedulers only send GET — same behavior, still secret-gated.
export async function GET(request) { return run(request); }
