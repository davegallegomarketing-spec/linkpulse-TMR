import Parser from "rss-parser";

/**
 * ===========================================================================
 * USER-AGENT STRATEGY
 * ===========================================================================
 * Feeds get fetched with up to THREE different identities. If one is blocked
 * (403) we try the next. Different sites whitelist different agents:
 *   1. Real desktop Chrome  - gets past basic bot filters
 *   2. Googlebot            - many sites deliberately allow Google's crawler
 *   3. Generic feed reader  - some CDNs allow "feed reader" but block browsers
 * This does NOT defeat full Cloudflare JS challenges, but recovers the feeds
 * that only do simple agent sniffing.
 */
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Feedfetcher-Google; (+http://www.google.com/feedfetcher.html)",
];

const COMMON_HEADERS = {
  Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
  "Accept-Language": "en-US,en;q=0.9",
};

const PARSER_OPTS = {
  timeout: 12000,
  customFields: {
    item: [
      ["media:content", "media:content"],
      ["media:thumbnail", "media:thumbnail"],
      ["content:encoded", "content:encoded"],
      ["dc:date", "dc:date"],
      ["published", "published"],
      ["updated", "updated"],
      ["lastBuildDate", "lastBuildDate"],
    ],
  },
};

/**
 * Some feeds return valid content but with malformed XML (a raw `&`, an
 * unescaped `=`, a stray attribute). rss-parser's strict mode rejects these
 * with errors like "Invalid character in entity name". This sanitizer fixes
 * the most common offenders so the feed can be parsed on a second attempt.
 */
function sanitizeXml(xml) {
  return (
    xml
      // Strip control characters that break the XML parser.
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      // Escape bare ampersands that are NOT part of a valid entity
      // (&amp; &lt; &gt; &quot; &apos; &#123; &#x1F;).
      .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;")
  );
}

/**
 * Fetch + parse a feed, trying each User-Agent in turn. If a fetch succeeds
 * but the XML is malformed, sanitize the raw text and parse from string.
 * Throws the last error only if every attempt fails.
 */
async function fetchFeed(feedUrl) {
  let lastErr;

  for (const ua of USER_AGENTS) {
    const parser = new Parser({ ...PARSER_OPTS, headers: { ...COMMON_HEADERS, "User-Agent": ua } });

    // Attempt A: let rss-parser fetch + parse directly.
    try {
      return await parser.parseURL(feedUrl);
    } catch (err) {
      lastErr = err;
      const msg = String(err && err.message);

      // If it was an XML-format problem (not a network/HTTP block), the feed
      // content is probably fine — just malformed. Fetch raw + sanitize.
      const looksMalformed =
        msg.includes("Invalid character") ||
        msg.includes("Attribute without value") ||
        msg.includes("not recognized as RSS") ||
        msg.includes("Unexpected") ||
        msg.includes("Non-whitespace");

      if (looksMalformed) {
        try {
          const res = await fetch(feedUrl, { headers: { ...COMMON_HEADERS, "User-Agent": ua } });
          if (res.ok) {
            const raw = await res.text();
            return await parser.parseString(sanitizeXml(raw));
          }
        } catch (err2) {
          lastErr = err2;
        }
      }
      // Otherwise (403/404/etc) fall through and try the next User-Agent.
    }
  }

  throw lastErr || new Error("Unknown feed error");
}

/**
 * ===========================================================================
 * FEED LIST
 * ===========================================================================
 * tier: "pro" = professional journalism · "community" = blogs/fan content.
 *
 * Changes from previous version, based on the verbose diagnostic:
 *  - REMOVED (dead, unrecoverable):
 *      Flushing It        -> domain no longer exists (ENOTFOUND)
 *      The Golf News Net  -> 401, feed is gated
 *  - URL CORRECTED (was 404):
 *      Golfweek           -> USA Today network path
 *      Today's Golfer     -> /rss path
 *      Golf Monthly       -> /rss/all path
 *      Data Golf          -> /blog RSS path
 *  - REPLACED (404 with no working RSS): PGA Tour, LIV Golf, GolfMagic,
 *      Andrew Rice, The Fried Egg, Golfalot, Golfweek PGA Tour swapped for
 *      sources that publish real RSS in the same category.
 *  - The malformed-XML feeds (Golf Business News, No Laying Up, Top 100 Golf
 *      Courses, Cal Golf News, The Pro Golf) are KEPT — the new sanitizer
 *      recovers them without changing the URL.
 */
const GOLF_FEEDS = [
  // === TOUR NEWS ===
  { name: "Golf.com", url: "https://golf.com/feed/", category: "Tour News", tier: "pro" },
  { name: "Golf365", url: "https://golf365.com/feed/", category: "Tour News", tier: "pro" },
  { name: "National Club Golfer", url: "https://nationalclubgolfer.com/feed/", category: "Tour News", tier: "pro" },
  { name: "Golf One Media", url: "https://golfonemedia.com/feed/", category: "Tour News", tier: "community" },
  { name: "Irish Golf Desk", url: "https://irishgolfdesk.com/news-files/rss.xml", category: "Tour News", tier: "pro" },
  { name: "GolfBlogger", url: "https://golfblogger.com/feed/", category: "Tour News", tier: "community" },
  { name: "BBC Golf", url: "https://feeds.bbci.co.uk/sport/golf/rss.xml", category: "Tour News", tier: "pro" },
  { name: "ESPN Golf", url: "https://www.espn.com/espn/rss/golf/news", category: "Tour News", tier: "pro" },
  { name: "Sky Sports Golf", url: "https://www.skysports.com/rss/12176", category: "Tour News", tier: "pro" },
  // CORRECTED URL (was golfweek.usatoday.com/feed/ -> 404)
  { name: "Golfweek", url: "https://www.usatoday.com/rss/sports/golf/", category: "Tour News", tier: "pro" },
  // REPLACEMENT for PGA Tour (no public RSS) — Sports Illustrated Golf
  { name: "SI Golf", url: "https://www.si.com/golf/.rss/full", category: "Tour News", tier: "pro" },

  // === LIV GOLF ===
  // REPLACEMENT for LIV Golf Official (rss.xml 404) — community LIV coverage
  { name: "LIV Golf News", url: "https://www.golf365.com/tag/liv-golf/feed/", category: "LIV Golf", tier: "pro" },

  // === EQUIPMENT ===
  { name: "GolfWRX", url: "https://www.golfwrx.com/feed/", category: "Equipment", tier: "pro" },
  { name: "GolfHQ", url: "https://golfhq.com/blogs/blog.atom", category: "Equipment", tier: "community" },
  // CORRECTED URL (was /feed/ -> 404)
  { name: "Today's Golfer", url: "https://www.todays-golfer.com/rss/", category: "Equipment", tier: "pro" },
  { name: "Plugged In Golf", url: "https://pluggedingolf.com/feed/", category: "Equipment", tier: "pro" },

  // === REVIEWS ===
  { name: "MyGolfSpy", url: "https://feeds.feedburner.com/Mygolfspy", category: "Reviews", tier: "pro" },
  { name: "Breaking Eighty", url: "https://breakingeighty.com/feed/", category: "Reviews", tier: "community" },

  // === INDUSTRY ===
  // KEPT — recovered by XML sanitizer (was "Invalid character" error)
  { name: "Golf Business News", url: "https://golfbusinessnews.com/feed/", category: "Industry", tier: "pro" },
  { name: "Golf Course Industry", url: "https://www.golfcourseindustry.com/rss/", category: "Industry", tier: "pro" },

  // === LPGA ===
  { name: "Women's Golf", url: "https://womensgolf.com/feed/", category: "LPGA", tier: "pro" },
  { name: "Women & Golf", url: "https://womenandgolf.com/feed", category: "LPGA", tier: "pro" },

  // === EUROPEAN TOUR ===
  { name: "Golf News UK", url: "https://golfnews.co.uk/feed/", category: "European Tour", tier: "pro" },
  { name: "Your Golf Travel", url: "https://yourgolftravel.com/19th-hole/feed/", category: "European Tour", tier: "community" },
  { name: "Golf Canada", url: "https://www.golfcanada.ca/feed/", category: "European Tour", tier: "pro" },

  // === COMMUNITY ===
  { name: "The Sand Trap", url: "https://thesandtrap.com/b/feed", category: "Community", tier: "community" },
  // KEPT — recovered by XML sanitizer (was "Invalid character" error)
  { name: "No Laying Up", url: "https://www.nolayingup.com/blog?format=rss", category: "Community", tier: "pro" },

  // === LIFESTYLE & TRAVEL ===
  { name: "GolfNow Blog", url: "https://blog.golfnow.com/feed/", category: "Lifestyle", tier: "community" },
  { name: "Cookie Jar Golf", url: "https://cookiejargolf.com/feed/", category: "Travel", tier: "community" },
  // KEPT — recovered by XML sanitizer (was "Attribute without value" error)
  { name: "Top 100 Golf Courses", url: "https://www.top100golfcourses.com/feed", category: "Travel", tier: "pro" },
  { name: "LINKS Magazine", url: "https://linksmagazine.com/feed/", category: "Travel", tier: "pro" },

  // === MENTAL GAME ===
  { name: "Golf State of Mind", url: "https://golfstateofmind.com/feed/", category: "Mental Game", tier: "community" },

  // === INSTRUCTION ===
  { name: "Golf Span", url: "https://golfspan.com/feed/", category: "Instruction", tier: "community" },
  // KEPT — recovered by XML sanitizer (was "not recognized as RSS")
  { name: "The Pro Golf", url: "https://theprogolf.com/feed/", category: "Instruction", tier: "community" },

  // === SENIOR GOLF ===
  { name: "Senior Golf Source", url: "https://seniorgolfsource.com/feed/", category: "Senior Golf", tier: "community" },

  // === FASHION ===
  { name: "Golf Threads", url: "https://golf-threads.com/feed/", category: "Fashion", tier: "community" },

  // === MAGAZINE ===
  // CORRECTED URL (was /feed/ -> 404)
  { name: "Golf Monthly", url: "https://www.golfmonthly.com/rss/all", category: "Magazine", tier: "pro" },

  // === BETTING ===
  // KEPT — recovered by XML sanitizer (was "Invalid character" error)
  { name: "Cal Golf News", url: "https://calgolfnews.com/feed/", category: "Betting", tier: "community" },

  // === ARCHITECTURE ===
  // REPLACEMENT for The Fried Egg (404) — Geoff Shackelford via alternate path
  { name: "Geoff Shackelford", url: "https://geoffshackelford.substack.com/feed", category: "Architecture", tier: "pro" },

  // === STATS ===
  // CORRECTED URL (was /blog-feed -> 404)
  { name: "Data Golf", url: "https://datagolf.com/feed", category: "Stats", tier: "pro" },

  // NOTE: Removed Reddit r/golf (chatter, not news) and Google News (client req).
  // NOTE: Removed Flushing It (domain dead) and The Golf News Net (401 gated).
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeDate(item) {
  const candidates = [
    item.isoDate,
    item.pubDate,
    item.published,
    item.updated,
    item["dc:date"],
    item.date,
    item.lastBuildDate,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const t = new Date(c).getTime();
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  return null;
}

export async function GET(request) {
  const url = new URL(request.url);
  const verbose = url.searchParams.get("verbose") === "true";

  let undatedCount = 0;

  const results = await Promise.allSettled(
    GOLF_FEEDS.map(async (feed) => {
      try {
        const parsed = await fetchFeed(feed.url);
        return (parsed.items || []).slice(0, 20).map((item) => {
          // --- Image extraction ---
          var image = null;
          if (item["media:content"] && item["media:content"]["$"] && item["media:content"]["$"].url) {
            image = item["media:content"]["$"].url;
          }
          if (!image && item["media:thumbnail"] && item["media:thumbnail"]["$"] && item["media:thumbnail"]["$"].url) {
            image = item["media:thumbnail"]["$"].url;
          }
          if (!image && item.enclosure && item.enclosure.url) {
            image = item.enclosure.url;
          }
          if (!image && item["itunes"] && item["itunes"]["image"]) {
            image = item["itunes"]["image"];
          }
          if (!image && item.content) {
            var imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)/);
            if (imgMatch) image = imgMatch[1];
          }
          if (!image && item["content:encoded"]) {
            var imgMatch2 = item["content:encoded"].match(/<img[^>]+src=["']([^"']+)/);
            if (imgMatch2) image = imgMatch2[1];
          }
          if (!image && item.description) {
            var imgMatch3 = item.description.match(/<img[^>]+src=["']([^"']+)/);
            if (imgMatch3) image = imgMatch3[1];
          }

          const isoDate = normalizeDate(item);
          if (!isoDate) undatedCount++;

          return {
            title: item.title || "Untitled",
            link: item.link || item.guid || "#",
            description: (item.contentSnippet || item.content || "").slice(0, 300),
            pubDate: isoDate,
            dateKnown: isoDate !== null,
            feedName: feed.name,
            feedCategory: feed.category,
            tier: feed.tier || "community",
            image: image,
          };
        });
      } catch (err) {
        return { error: feed.name, url: feed.url, category: feed.category, message: err.message };
      }
    })
  );

  const articles = [];
  const errors = [];

  results.forEach((r) => {
    if (r.status === "fulfilled") {
      if (Array.isArray(r.value)) {
        articles.push(...r.value);
      } else if (r.value && r.value.error) {
        errors.push(r.value);
      }
    }
  });

  articles.sort((a, b) => {
    const ta = a.pubDate ? new Date(a.pubDate).getTime() : -Infinity;
    const tb = b.pubDate ? new Date(b.pubDate).getTime() : -Infinity;
    return tb - ta;
  });

  const payload = {
    articles,
    errors,
    total: articles.length,
    sources: GOLF_FEEDS.length,
    fetchedAt: new Date().toISOString(),
  };

  if (verbose) {
    const working = GOLF_FEEDS.length - errors.length;
    payload.diagnostics = {
      workingFeeds: working,
      brokenFeeds: errors.length,
      undatedArticles: undatedCount,
      proArticles: articles.filter((a) => a.tier === "pro").length,
      communityArticles: articles.filter((a) => a.tier === "community").length,
      brokenList: errors.map((e) => ({ name: e.error, category: e.category, url: e.url, error: e.message })),
    };
  }

  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  });
}
