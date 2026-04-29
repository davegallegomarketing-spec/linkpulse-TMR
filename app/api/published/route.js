// /api/published/route.js — Serves published editions from Vercel Blob
// No caching — always returns fresh data
import { list } from "@vercel/blob";

export async function GET(request) {
  try {
    var url = new URL(request.url);
    var key = url.searchParams.get("key");
    var history = url.searchParams.get("history");

    if (history === "true") {
      var result = await list({ prefix: "editions/", limit: 100 });
      var blobs = result.blobs || [];

      var editions = await Promise.all(
        blobs
          .filter(function (b) { return b.pathname !== "editions/latest.json"; })
          .map(async function (b) {
            try {
              var res = await fetch(b.downloadUrl || b.url, { cache: "no-store" });
              var data = await res.json();
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

      var filtered = editions.filter(function (e) { return e !== null; })
        .sort(function (a, b) { return new Date(b.publishedAt) - new Date(a.publishedAt); });

      return new Response(JSON.stringify({ editions: filtered, count: filtered.length }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // Determine which file to fetch
    var filename = key ? "editions/" + key + ".json" : "editions/latest.json";

    var result2 = await list({ prefix: filename });
    var blobs2 = result2.blobs || [];

    // Find exact pathname match
    var match = blobs2.find(function (b) { return b.pathname === filename; });

    if (!match) {
      if (key) {
        return new Response(JSON.stringify({ error: "Edition not found", key: key }), {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
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
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        }
      );
    }

    // Fetch fresh — bypass any CDN cache
    var blobRes = await fetch(match.downloadUrl || match.url, { cache: "no-store" });
    var data = await blobRes.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "no-cache, no-store, must-revalidate",
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
