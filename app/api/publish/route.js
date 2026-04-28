// /api/publish/route.js — Stores curated articles in Vercel Blob (persistent)
import { put } from "@vercel/blob";

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

    // Build the edition object
    const now = new Date();
    const dateKey = now.toISOString().split("T")[0];
    const editionName = edition || "daily";
    const storeKey = dateKey + "_" + editionName;

    const editionData = {
      key: storeKey,
      title: title || "Golf Daily — " + now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      edition: editionName,
      publishedAt: now.toISOString(),
      articleCount: articles.length,
      articles: articles.map(function (a, i) {
        return {
          position: i + 1,
          title: a.title || "",
          link: a.link || "",
          description: a.description || "",
          source: a.feedName || a.source || "",
          category: a.feedCategory || a.category || "",
          image: a.image || "",
          pubDate: a.pubDate || "",
        };
      }),
    };

    const jsonString = JSON.stringify(editionData);

    // Store the edition in Vercel Blob (public store)
    await put("editions/" + storeKey + ".json", jsonString, {
      contentType: "application/json",
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // Also store as "latest.json" for easy retrieval
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
        articleCount: articles.length,
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
