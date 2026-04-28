// /api/publish/route.js — Stores curated articles in Vercel Blob (persistent)
// Articles ACCUMULATE — each publish adds to the existing edition for that day
import { put, list } from "@vercel/blob";

async function getExistingEdition(filename) {
  try {
    const { blobs } = await list({ prefix: filename, limit: 1 });
    if (!blobs || blobs.length === 0) return null;
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { articles, edition, title } = body;

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return new Response(JSON.stringify({ error: "No articles provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build keys
    const now = new Date();
    const dateKey = now.toISOString().split("T")[0];
    const editionName = edition || "daily";
    const storeKey = dateKey + "_" + editionName;
    const filename = "editions/" + storeKey + ".json";

    // Get existing edition for today (if any)
    const existing = await getExistingEdition(filename);

    // Merge: keep existing articles, add new ones (skip duplicates by link)
    var existingArticles = (existing && existing.articles) ? existing.articles : [];
    var existingLinks = {};
    existingArticles.forEach(function (a) { existingLinks[a.link] = true; });

    var newArticles = [];
    articles.forEach(function (a) {
      var link = a.link || "";
      if (!existingLinks[link]) {
        newArticles.push({
          position: 0, // will be renumbered below
          title: a.title || "",
          link: link,
          description: a.description || "",
          source: a.feedName || a.source || "",
          category: a.feedCategory || a.category || "",
          image: a.image || "",
          pubDate: a.pubDate || "",
        });
        existingLinks[link] = true;
      }
    });

    // Combined: new articles first (latest picks on top), then existing
    var allArticles = newArticles.concat(existingArticles);
    // Renumber positions
    allArticles.forEach(function (a, i) { a.position = i + 1; });

    const editionData = {
      key: storeKey,
      title: title || "Golf Daily — " + now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      edition: editionName,
      publishedAt: now.toISOString(),
      articleCount: allArticles.length,
      articles: allArticles,
    };

    const jsonString = JSON.stringify(editionData);

    // Store the edition
    await put(filename, jsonString, {
      contentType: "application/json",
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // Also store as "latest.json"
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

// Handle CORS preflight
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
