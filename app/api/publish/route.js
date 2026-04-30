// /api/publish/route.js — Stores curated articles in Vercel Blob (persistent)
// Articles ACCUMULATE within the same day. Each new publish adds to existing.
import { put, list } from "@vercel/blob";

async function getExistingData(filename) {
  try {
    // Use the folder prefix to list, then match by filename ending
    var folderPrefix = filename.substring(0, filename.lastIndexOf("/") + 1);
    var baseName = filename.substring(filename.lastIndexOf("/") + 1);
    var result = await list({ prefix: folderPrefix });
    var blobs = (result && result.blobs) || [];
    if (blobs.length === 0) {
      console.log("[publish] No blobs found with prefix:", folderPrefix);
      return null;
    }
    // Match by exact pathname OR by ending with the base filename
    var match = blobs.find(function (b) {
      return b.pathname === filename || b.pathname.endsWith(baseName);
    });
    if (!match) {
      console.log("[publish] No exact match for:", filename, "among", blobs.length, "blobs");
      return null;
    }
    var url = match.downloadUrl || match.url;
    console.log("[publish] Found existing edition at:", url);
    var res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.log("[publish] Fetch failed for existing edition:", res.status);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error("[publish] Error reading existing data:", e.message);
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
    var dateKey = now.toISOString().split("T")[0];
    var editionName = edition || "daily";
    var storeKey = dateKey + "_" + editionName;
    var filename = "editions/" + storeKey + ".json";

    // Get existing edition for today
    var existing = await getExistingData(filename);
    var existingArticles = (existing && existing.articles) ? existing.articles : [];

    // Build lookup of existing links to avoid duplicates
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

    // New articles on top, existing below
    var allArticles = newArticles.concat(existingArticles);
    allArticles.forEach(function (a, i) { a.position = i + 1; });

    var editionData = {
      key: storeKey,
      title: title || "Golf Daily — " + now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      edition: editionName,
      publishedAt: now.toISOString(),
      articleCount: allArticles.length,
      articles: allArticles,
    };

    console.log("[publish] Saving:", newArticles.length, "new +", existingArticles.length, "existing =", allArticles.length, "total");

    var jsonString = JSON.stringify(editionData);

    // Write to date-specific file
    await put(filename, jsonString, {
      contentType: "application/json",
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // Also write to latest.json
    await put("editions/latest.json", jsonString, {
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
        title: editionData.title,
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
