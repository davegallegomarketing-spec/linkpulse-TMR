// /api/tickers/route.js — Stores and serves ticker data
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
    var section = body.section;
    var data = body.data;

    if (!section || !data) {
      return new Response(JSON.stringify({ error: "Missing section or data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get existing ticker data
    var existing = await fetchBlob("tickers/current.json") || {};

    if (section === "all") {
      // Broadcast all tickers at once
      existing.ticker1 = data.ticker1 || existing.ticker1;
      existing.ticker2 = data.ticker2 || existing.ticker2;
      existing.ticker3 = data.ticker3 || existing.ticker3;
    } else {
      // Broadcast single ticker
      existing[section] = data;
    }

    existing.lastUpdated = new Date().toISOString();

    await put("tickers/current.json", JSON.stringify(existing), {
      contentType: "application/json",
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return new Response(
      JSON.stringify({ success: true, section: section, updatedAt: existing.lastUpdated }),
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
        JSON.stringify({ error: "No ticker data yet" }),
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
