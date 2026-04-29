// /api/published/route.js — Serves published editions from Vercel Blob
// Checks today's date-specific edition first, falls back to latest.json
import { list } from "@vercel/blob";

async function fetchBlob(filename) {
  try {
    var result = await list({ prefix: filename });
    var blobs = result.blobs || [];
    var match = blobs.find(function (b) { return b.pathname === filename; });
    if (!match) return null;
    var res = await fetch(match.downloadUrl || match.url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

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

    // If a specific key was requested
    if (key) {
      var data = await fetchBlob("editions/" + key + ".json");
      if (!data) {
        return new Response(JSON.stringify({ error: "Edition not found", key: key }), {
          status: 404,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // DEFAULT: Try today's edition first, then yesterday, then latest.json
    var now = new Date();
    var todayKey = now.toISOString().split("T")[0] + "_daily";
    var data2 = await fetchBlob("editions/" + todayKey + ".json");

    // If no today edition, try yesterday
    if (!data2) {
      var yesterday = new Date(now.getTime() - 86400000);
      var yesterdayKey = yesterday.toISOString().split("T")[0] + "_daily";
      data2 = await fetchBlob("editions/" + yesterdayKey + ".json");
    }

    // Last fallback: latest.json
    if (!data2) {
      data2 = await fetchBlob("editions/latest.json");
    }

    if (!data2) {
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

    return new Response(JSON.stringify(data2), {
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
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
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
