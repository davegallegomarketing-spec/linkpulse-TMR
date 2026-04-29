// /api/tickers/route.js — Stores and serves ticker data for the Mulligan Report
import { put, list } from "@vercel/blob";

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

export async function POST(request) {
  try {
    var body = await request.json();
    var { section, data } = body;

    if (!section || !data) {
      return new Response(JSON.stringify({ error: "Missing section or data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Valid sections: tournament, course, tv, leaderboard, breaking
    var validSections = ["tournament", "course", "tv", "leaderboard", "breaking"];
    if (validSections.indexOf(section) === -1) {
      return new Response(JSON.stringify({ error: "Invalid section. Use: " + validSections.join(", ") }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get existing ticker data
    var existing = await fetchBlob("tickers/current.json") || {};

    // Merge the updated section
    existing[section] = data;
    existing.lastUpdated = new Date().toISOString();
    existing[section + "_updatedAt"] = new Date().toISOString();

    // Save
    await put("tickers/current.json", JSON.stringify(existing), {
      contentType: "application/json",
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        section: section,
        updatedAt: existing[section + "_updatedAt"],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Ticker update failed: " + err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET() {
  try {
    var data = await fetchBlob("tickers/current.json");

    if (!data) {
      return new Response(
        JSON.stringify({ error: "No ticker data yet", hint: "Use the Ticker Broadcast Station to set up tickers" }),
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

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
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
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
