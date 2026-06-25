// /api/auto-feed/route.js — stores the Auto-Feed ON/OFF switch in Vercel Blob.
// GET  → { enabled, updatedAt }   (read by the tool's toggle + the scheduler)
// POST → { enabled }              (flip it from the tool)
import { put, list } from "@vercel/blob";

var FLAG_KEY = "config/auto-feed.json";

async function readFlag() {
  try {
    var result = await list({ prefix: "config/" });
    var blobs = (result && result.blobs) || [];
    var match = blobs.find(function (b) { return b.pathname === FLAG_KEY; });
    if (!match) return { enabled: false, updatedAt: null };
    var res = await fetch(match.downloadUrl || match.url, { cache: "no-store" });
    if (!res.ok) return { enabled: false, updatedAt: null };
    var data = await res.json();
    return { enabled: !!data.enabled, updatedAt: data.updatedAt || null };
  } catch (e) {
    return { enabled: false, updatedAt: null };
  }
}

async function readLastRun() {
  try {
    var result = await list({ prefix: "config/" });
    var blobs = (result && result.blobs) || [];
    var match = blobs.find(function (b) { return b.pathname === "config/auto-feed-status.json"; });
    if (!match) return null;
    var res = await fetch(match.downloadUrl || match.url, { cache: "no-store" });
    if (!res.ok) return null;
    var data = await res.json();
    if (!data || !data.at) return null;
    return { count: data.count || 0, at: data.at };
  } catch (e) {
    return null;
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function GET() {
  var flag = await readFlag();
  var lastRun = await readLastRun();
  flag.lastRun = lastRun;
  return json(flag, 200);
}

export async function POST(request) {
  try {
    var body = await request.json();
    var payload = { enabled: !!body.enabled, updatedAt: new Date().toISOString() };
    await put(FLAG_KEY, JSON.stringify(payload), {
      contentType: "application/json",
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return json(payload, 200);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
