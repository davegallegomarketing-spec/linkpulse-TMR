// /api/publish/route.js — Simple accumulating publish with backup safety net
// RULE: Never overwrite without backing up first. Articles only grow.
import { put, list } from "@vercel/blob";

async function getExistingData(filename) {
  try {
    var folderPrefix = filename.substring(0, filename.lastIndexOf("/") + 1);
    var baseName = filename.substring(filename.lastIndexOf("/") + 1);
    var result = await list({ prefix: folderPrefix });
    var blobs = (result && result.blobs) || [];
    if (blobs.length === 0) return null;
    var match = blobs.find(function (b) {
      return b.pathname === filename || b.pathname.endsWith(baseName);
    });
    if (!match) return null;
    var url = match.downloadUrl || match.url;
    var res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("[publish] Error reading:", filename, e.message);
    return null;
  }
}

export async function POST(request) {
  try {
    var body = await request.json();
    var articles = body.articles;
    var edition = body.edition;
    var title = body.title;
    // Optional: the hero links for THIS publish, slot-preserving and in hero
    // order — e.g. [link|null, link|null]. A null means "leave that hero slot
    // as it is on the site." When this key is PRESENT we use the activation
    // model below (heroes pinned to the top, existing heroes kept for empty
    // slots). When it's ABSENT (older caller), we fall back to the original
    // new-on-top behavior, so nothing else breaks.
    var hasFeatures = Array.isArray(body.features);
    var features = hasFeatures ? body.features : [];

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return new Response(JSON.stringify({ error: "No articles provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    var now = new Date();
    var editionName = edition || "daily";

    // ALWAYS read from latest.json — single source of truth
    var existing = await getExistingData("editions/latest.json");
    var existingArticles = (existing && existing.articles) ? existing.articles : [];

    console.log("[publish] Existing articles in latest.json:", existingArticles.length);

    // ═══ SAFETY NET: backup current state before ANY write ═══
    // Non-fatal: if the backup write hiccups (e.g. storage limit, transient
    // Blob error) we log it and still publish, rather than failing the whole
    // request. The publish itself is what matters to the user.
    if (existingArticles.length > 0) {
      try {
        var backupKey = "backups/pre-publish-" + now.toISOString().replace(/[:.]/g, "-") + ".json";
        await put(backupKey, JSON.stringify(existing), {
          contentType: "application/json",
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: false,
        });
        console.log("[publish] Backup saved:", backupKey, "with", existingArticles.length, "articles");
      } catch (backupErr) {
        console.error("[publish] Backup failed (continuing anyway):", backupErr && backupErr.message);
      }
    }

    // Normalize an incoming article into the stored shape.
    function normalize(a) {
      return {
        position: 0,
        title: a.title || "",
        link: a.link || "",
        description: a.description || "",
        source: a.feedName || a.source || "",
        category: a.feedCategory || a.category || "",
        image: a.image || "",
        pubDate: a.pubDate || "",
        addedAt: now.toISOString(),
      };
    }

    // Lookups
    var existingByLink = {};
    existingArticles.forEach(function (a) { if (a.link) existingByLink[a.link] = a; });
    var incomingByLink = {};
    articles.forEach(function (a) { if (a.link) incomingByLink[a.link] = a; });

    // Net-new = every incoming article whose link wasn't already published —
    // heroes AND blocks. This is what the lifetime counter increments by, so a
    // hero-only publish still counts. (newCount below tracks only new BLOCKS,
    // which is what the response/log report; the two are intentionally separate.)
    var netNewCount = 0;
    var _countedNew = {};
    articles.forEach(function (a) {
      var l = a.link || "";
      if (l && !existingByLink[l] && !_countedNew[l]) { _countedNew[l] = true; netNewCount++; }
    });

    var allArticles;
    var newCount = 0;

    if (hasFeatures) {
      // ═══ ACTIVATION MODEL ═══
      // The site's current heroes (positions #1 and #2). existingArticles is
      // already stored in position order, so the first two ARE the live heroes.
      var existingTop2 = [existingArticles[0] || null, existingArticles[1] || null];

      // Decide the final hero for each slot: the freshly chosen one if the user
      // set it this publish, otherwise the hero already live in that slot. This
      // is why untouched heroes never get buried — they're explicitly re-placed
      // at the top.
      var heroLinks = [];
      for (var s = 0; s < 2; s++) {
        var chosen = features[s];
        if (chosen) heroLinks.push(chosen);
        else if (existingTop2[s] && existingTop2[s].link) heroLinks.push(existingTop2[s].link);
      }

      // Build hero objects in order, de-duplicated, preferring the fresh copy.
      var heroSet = {};
      var heroObjs = [];
      heroLinks.forEach(function (link) {
        if (!link || heroSet[link]) return;
        var src = incomingByLink[link] || existingByLink[link];
        if (!src) return;
        heroSet[link] = true;
        heroObjs.push(incomingByLink[link] ? normalize(src) : src);
      });

      // New block stories: incoming items that aren't heroes and aren't already
      // published.
      var newBlocks = [];
      articles.forEach(function (a) {
        var link = a.link || "";
        if (link && !heroSet[link] && !existingByLink[link]) {
          newBlocks.push(normalize(a));
          existingByLink[link] = a; // guard against dupes within this batch
        }
      });

      // Everything already published, minus the heroes (which moved to the top).
      // Any previous hero that got replaced naturally falls back into this pile.
      var existingRest = existingArticles.filter(function (a) { return !heroSet[a.link]; });

      // Final order: heroes → fresh stories → older pile.
      allArticles = heroObjs.concat(newBlocks).concat(existingRest);
      newCount = newBlocks.length;
    } else {
      // ═══ LEGACY: new on top, existing below (unchanged) ═══
      var legacyNew = [];
      articles.forEach(function (a) {
        var link = a.link || "";
        if (link && !existingByLink[link]) {
          legacyNew.push(normalize(a));
          existingByLink[link] = a;
        }
      });
      allArticles = legacyNew.concat(existingArticles);
      newCount = legacyNew.length;
    }

    allArticles.forEach(function (a, i) { a.position = i + 1; });

    // ═══ CAP: keep only the most recent MAX_ARTICLES ═══
    // The live site only ever shows the first 122 (2 heroes + 30 + 90). We keep
    // 150 (122 + buffer) and drop the older tail — articles past here are just
    // redirect links no reader can see. Heroes (1-2) and the whole visible page
    // are at the FRONT, so trimming the tail can never touch them.
    var MAX_ARTICLES = 150;
    var beforeCap = allArticles.length;
    if (allArticles.length > MAX_ARTICLES) {
      allArticles = allArticles.slice(0, MAX_ARTICLES);
      allArticles.forEach(function (a, i) { a.position = i + 1; });
    }

    // ═══ SAFETY CHECK: never write an empty or suspiciously short list ═══
    // The cap intentionally reduces the count, so we no longer block on "fewer
    // than before". Instead: never write empty, and never drop below the count
    // the site shows (122) when we clearly had enough to fill it. This still
    // catches a real bug (e.g. logic that loses articles) without blocking the
    // intended cap.
    var VISIBLE = 122;
    var minSafe = Math.min(beforeCap, VISIBLE);
    if (allArticles.length === 0 || allArticles.length < minSafe) {
      console.error("[publish] BLOCKED — unsafe result:", allArticles.length, "from", beforeCap);
      return new Response(JSON.stringify({
        error: "Safety block: result too short, writing nothing",
        before: beforeCap,
        wouldBe: allArticles.length,
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    var dateKey = now.toISOString().split("T")[0];
    var storeKey = dateKey + "_" + editionName;

    var editionData = {
      key: storeKey,
      title: title || "Golf Daily \u2014 " + now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      edition: editionName,
      publishedAt: now.toISOString(),
      articleCount: allArticles.length,
      articles: allArticles,
    };

    console.log("[publish] Saving:", newCount, "new +", existingArticles.length, "existing =", allArticles.length, "total");

    var jsonString = JSON.stringify(editionData);

    // Write to latest.json (what TMR reads)
    await put("editions/latest.json", jsonString, {
      contentType: "application/json",
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // Also write date-specific backup
    await put("editions/" + storeKey + ".json", jsonString, {
      contentType: "application/json",
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // ═══ LIFETIME COUNTER (best-effort, never blocks the publish) ═══
    // Tracks every article ever posted, separate from the live list, so the
    // cap/cleanup trimming old links never reduces the running total. Seeds at
    // 808 (the verified baseline) if the file doesn't exist yet.
    try {
      var stats = await getExistingData("config/stats.json");
      var base = (stats && typeof stats.totalPosted === "number") ? stats.totalPosted : 808;
      var updatedStats = {
        totalPosted: base + netNewCount,
        since: (stats && stats.since) || "2026",
        lastUpdated: now.toISOString(),
      };
      await put("config/stats.json", JSON.stringify(updatedStats), {
        contentType: "application/json",
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      console.log("[publish] Lifetime total:", updatedStats.totalPosted);
    } catch (statsErr) {
      console.error("[publish] Counter update failed (continuing):", statsErr && statsErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        key: storeKey,
        merged: existingArticles.length > 0,
        existingArticles: existingArticles.length,
        newArticles: newCount,
        totalArticles: allArticles.length,
        publishedAt: editionData.publishedAt,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Publish failed: " + err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
