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
    if (existingArticles.length > 0) {
      var backupKey = "backups/pre-publish-" + now.toISOString().replace(/[:.]/g, "-") + ".json";
      await put(backupKey, JSON.stringify(existing), {
        contentType: "application/json",
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: false,
      });
      console.log("[publish] Backup saved:", backupKey, "with", existingArticles.length, "articles");
    }

    // Build lookup of existing links
    var existingLinks = {};
    existingArticles.forEach(function (a) { if (a.link) existingLinks[a.link] = true; });

    // Process new articles, skip duplicates
    var newArticles = [];
    articles.forEach(function (a) {
      var link = a.link || "";
      if (link && !existingLinks[link]) {
        newArticles.push({
          position: 0,
          title: a.title || "",
          link: link,
          description: a.description || "",
          source: a.feedName || a.source || "",
          category: a.feedCategory || a.category || "",
          image: a.image || "",
          pubDate: a.pubDate || "",
          addedAt: now.toISOString(),
        });
        existingLinks[link] = true;
      }
    });

    // New on top, existing below
    var allArticles = newArticles.concat(existingArticles);
    allArticles.forEach(function (a, i) { a.position = i + 1; });

    // ═══ SAFETY CHECK: never write fewer articles than we started with ═══
    if (allArticles.length < existingArticles.length) {
      console.error("[publish] BLOCKED — would reduce articles from", existingArticles.length, "to", allArticles.length);
      return new Response(JSON.stringify({
        error: "Safety block: publish would reduce article count",
        existing: existingArticles.length,
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

    console.log("[publish] Saving:", newArticles.length, "new +", existingArticles.length, "existing =", allArticles.length, "total");

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

    return new Response(
      JSON.stringify({
        success: true,
        key: storeKey,
        merged: existingArticles.length > 0,
        existingArticles: existingArticles.length,
        newArticles: newArticles.length,
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
