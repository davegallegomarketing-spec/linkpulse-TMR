// /api/published/route.js — Serves published editions from Vercel Blob
import { list } from "@vercel/blob";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key"); // optional: fetch specific edition
    const history = searchParams.get("history"); // optional: "true" to list all

    if (history === "true") {
      // List all published editions
      const { blobs } = await list({ prefix: "editions/", limit: 100 });

      const editions = await Promise.all(
        blobs
          .filter(function (b) { return b.pathname !== "editions/latest.json"; })
          .map(async function (b) {
            try {
              const res = await fetch(b.url);
              const data = await res.json();
              return {
                key: data.key,
                title: data.title,
                publishedAt: data.publishedAt,
                articleCount: data.articleCount,
              };
            } catch (e) {
              return null;
            }
          })
      );

      const filtered = editions.filter(function (e) { return e !== null; })
        .sort(function (a, b) { return new Date(b.publishedAt) - new Date(a.publishedAt); });

      return new Response(JSON.stringify({ editions: filtered, count: filtered.length }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    // Determine which file to fetch
    const filename = key ? "editions/" + key + ".json" : "editions/latest.json";

    // Find the blob by listing with exact prefix
    const { blobs } = await list({ prefix: filename, limit: 1 });

    if (!blobs || blobs.length === 0) {
      if (key) {
        return new Response(JSON.stringify({ error: "Edition not found", key: key }), {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
      // No latest edition yet
      return new Response(
        JSON.stringify({
          error: "No published edition yet",
          hint: "Curate articles in LinkPulse and click Publish",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=60",
          },
        }
      );
    }

    // Fetch the actual JSON content from the blob URL
    const blobRes = await fetch(blobs[0].url);
    const data = await blobRes.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Read failed: " + err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

// CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
