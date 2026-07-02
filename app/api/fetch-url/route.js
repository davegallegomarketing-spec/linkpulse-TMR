// /api/fetch-url/route.js — Reads a pasted article URL and extracts its
// headline, image, source and (if present) publish date, so the operator can
// drop ANY story into a hero slot — even ones the feed didn't pull in.
//
// It reads the page's OpenGraph / meta tags (what sites publish for link
// previews). Some sites hide their image or title; the tool lets the operator
// fix those by hand after fetching, so a partial result is still useful.

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}

// Pull the content of a meta tag, matching either attribute order:
//   <meta property="og:title" content="...">  OR  <meta content="..." property="og:title">
// and both property= and name=.
function meta(html, key) {
  var patterns = [
    new RegExp('<meta[^>]+(?:property|name)=["\']' + key + '["\'][^>]*content=["\']([^"\']*)["\']', "i"),
    new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']' + key + '["\']', "i"),
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = html.match(patterns[i]);
    if (m && m[1]) return decode(m[1].trim());
  }
  return "";
}

function decode(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&#8217;/g, "\u2019").replace(/&#8216;/g, "\u2018")
    .replace(/&#8220;/g, "\u201C").replace(/&#8221;/g, "\u201D").replace(/&#8211;/g, "\u2013");
}

function hostOf(u) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
}

// Basic safety: only http(s), and don't let it reach internal/localhost hosts.
function safeUrl(u) {
  var parsed;
  try { parsed = new URL(u); } catch (e) { return false; }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  var h = parsed.hostname;
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return false;
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  return true;
}

async function run(url) {
  if (!url || !safeUrl(url)) return json({ error: "Please paste a valid http(s) article URL" }, 400);

  var res;
  try {
    res = await fetch(url, {
      redirect: "follow",
      headers: {
        // A real browser UA so sites don't serve a bot-blocked page.
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
  } catch (e) {
    return json({ error: "Could not reach that URL (" + e.message + ")" }, 200);
  }
  if (!res.ok) return json({ error: "That page returned " + res.status, source: hostOf(url), link: url }, 200);

  var html = "";
  try { html = await res.text(); } catch (e) { html = ""; }
  // Only need the <head>; cap the size so a huge page doesn't blow memory.
  var head = html.slice(0, 200000);

  var title = meta(head, "og:title") || meta(head, "twitter:title");
  if (!title) {
    var t = head.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (t && t[1]) title = decode(t[1].trim());
  }
  var image = meta(head, "og:image") || meta(head, "twitter:image") || meta(head, "twitter:image:src");
  // Resolve a relative image URL against the page.
  if (image && !/^https?:\/\//i.test(image)) {
    try { image = new URL(image, url).href; } catch (e) {}
  }
  var source = meta(head, "og:site_name") || hostOf(url);
  var description = meta(head, "og:description") || meta(head, "twitter:description") || meta(head, "description");
  var pubDate = meta(head, "article:published_time") || meta(head, "og:published_time") ||
    meta(head, "publish-date") || meta(head, "date") || "";

  return json({
    ok: true,
    title: title || "",
    image: image || "",
    source: source || hostOf(url),
    description: description || "",
    pubDate: pubDate || "",
    link: url,
    partial: !title || !image, // tells the UI to nudge the operator to fill gaps
  });
}

export async function GET(request) {
  var url = new URL(request.url).searchParams.get("url") || "";
  return run(url);
}

export async function POST(request) {
  var body = {};
  try { body = await request.json(); } catch (e) {}
  return run(body && body.url ? body.url : "");
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
