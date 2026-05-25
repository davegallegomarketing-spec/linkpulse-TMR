import Parser from "rss-parser";

/**
 * ===========================================================================
 * USER-AGENT STRATEGY
 * ===========================================================================
 * Each feed is fetched with up to THREE identities. If one is blocked we try
 * the next: real Chrome, then Googlebot, then a generic feed reader.
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
 * Repair malformed XML so rss-parser's strict mode can read it. Handles the
 * common offenders: bare ampersands, stray control characters.
 */
function sanitizeXml(xml) {
  return xml
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;");
}

/**
 * Fetch + parse a feed, trying each User-Agent. On an XML-format error,
 * fetch the raw text, sanitize it, and parse from string.
 */
async function fetchFeed(feedUrl) {
  let lastErr;
  for (const ua of USER_AGENTS) {
    const parser = new Parser({ ...PARSER_OPTS, headers: { ...COMMON_HEADERS, "User-Agent": ua } });
    try {
      return await parser.parseURL(feedUrl);
    } catch (err) {
      lastErr = err;
      const msg = String(err && err.message);
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
    }
  }
  throw lastErr || new Error("Unknown feed error");
}

/**
 * ===========================================================================
 * FEED LIST
 * ===========================================================================
 * Each feed still carries a `category`, but it is now only a HINT / fallback.
 * The real category is decided per-article by categorizeArticle() below.
 *
 * tier: "pro" = professional journalism · "community" = blogs/fan content.
 */
const GOLF_FEEDS = [
  { name: "Golf.com", url: "https://golf.com/feed/", category: "Tour News", tier: "pro" },
  { name: "Golf365", url: "https://golf365.com/feed/", category: "Tour News", tier: "pro" },
  { name: "National Club Golfer", url: "https://nationalclubgolfer.com/feed/", category: "Tour News", tier: "pro" },
  { name: "Golf One Media", url: "https://golfonemedia.com/feed/", category: "Lifestyle", tier: "community" },
  { name: "Irish Golf Desk", url: "https://irishgolfdesk.com/news-files/rss.xml", category: "Tour News", tier: "pro" },
  { name: "GolfBlogger", url: "https://golfblogger.com/feed/", category: "Tour News", tier: "community" },
  { name: "BBC Golf", url: "https://feeds.bbci.co.uk/sport/golf/rss.xml", category: "Tour News", tier: "pro" },
  { name: "ESPN Golf", url: "https://www.espn.com/espn/rss/golf/news", category: "Tour News", tier: "pro" },
  { name: "Sky Sports Golf", url: "https://www.skysports.com/rss/12176", category: "Tour News", tier: "pro" },

  { name: "GolfWRX", url: "https://www.golfwrx.com/feed/", category: "Equipment", tier: "pro" },
  { name: "GolfHQ", url: "https://golfhq.com/blogs/blog.atom", category: "Equipment", tier: "community" },
  { name: "Plugged In Golf", url: "https://pluggedingolf.com/feed/", category: "Equipment", tier: "pro" },

  { name: "MyGolfSpy", url: "https://feeds.feedburner.com/Mygolfspy", category: "Reviews", tier: "pro" },
  { name: "Breaking Eighty", url: "https://breakingeighty.com/feed/", category: "Reviews", tier: "community" },

  { name: "Golf Course Industry", url: "https://www.golfcourseindustry.com/rss/", category: "Industry", tier: "pro" },

  { name: "Women's Golf", url: "https://womensgolf.com/feed/", category: "LPGA", tier: "pro" },
  { name: "Women & Golf", url: "https://womenandgolf.com/feed", category: "LPGA", tier: "pro" },

  { name: "Golf News UK", url: "https://golfnews.co.uk/feed/", category: "European Tour", tier: "pro" },
  { name: "Your Golf Travel", url: "https://yourgolftravel.com/19th-hole/feed/", category: "Travel", tier: "community" },
  { name: "Golf Canada", url: "https://www.golfcanada.ca/feed/", category: "European Tour", tier: "pro" },

  { name: "The Sand Trap", url: "https://thesandtrap.com/b/feed", category: "Community", tier: "community" },

  { name: "GolfNow Blog", url: "https://blog.golfnow.com/feed/", category: "Lifestyle", tier: "community" },
  { name: "Cookie Jar Golf", url: "https://cookiejargolf.com/feed/", category: "Travel", tier: "community" },
  { name: "LINKS Magazine", url: "https://linksmagazine.com/feed/", category: "Travel", tier: "pro" },

  { name: "Golf State of Mind", url: "https://golfstateofmind.com/feed/", category: "Mental Game", tier: "community" },

  { name: "Golf Span", url: "https://golfspan.com/feed/", category: "Instruction", tier: "community" },

  { name: "Senior Golf Source", url: "https://seniorgolfsource.com/feed/", category: "Senior Golf", tier: "community" },

  { name: "Golf Threads", url: "https://golf-threads.com/feed/", category: "Fashion", tier: "community" },

  // NOTE: Removed Reddit r/golf, Flushing It, The Golf News Net, and the
  // unverifiable replacement guesses (SI Golf, LIV News, Golfweek, etc.).
  // Yardbarker removed — it was leaking MotoGP/NASCAR articles into golf.
];

/**
 * ===========================================================================
 * ARTICLE-LEVEL CATEGORIZER
 * ===========================================================================
 * The feed's category label is unreliable: Golf.com is tagged "Tour News" so
 * a shorts review or a putting tip from Golf.com wrongly inherits "Tour News".
 *
 * This function reads each article's OWN title + description and assigns the
 * real category from keyword signals. Order matters — the first rule that
 * matches wins, so more specific buckets are checked before generic ones.
 *
 * Categories returned (your existing set, kept intact):
 *   Instruction, Equipment, Reviews, Travel, LPGA, Industry,
 *   Senior Golf, Mental Game, Fashion, Tour News (default)
 */
function categorizeArticle(article, feedHintCategory) {
  const title = (article.title || "").toLowerCase();
  const text = (title + " " + (article.description || "")).toLowerCase();

  // Whole-phrase match: a phrase only counts if it sits on word boundaries.
  // This stops "let " matching "wallet"/"complete", "tip" matching "multiple",
  // "shorts" matching "short game", "style" matching "lifestyle", etc.
  const re = (phrase) =>
    new RegExp("(^|[^a-z])" + phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z]|$)", "i");
  const hasIn = (str, words) => words.some((w) => re(w).test(str));
  const has = (words) => hasIn(text, words);
  const titleHas = (words) => hasIn(title, words);

  // --- Senior Golf (checked FIRST so "best driver for seniors" doesn't
  //     get grabbed by the Equipment rule) ---
  if (has(["senior golf", "for seniors", "senior golfers", "champions tour", "pga tour champions"])) {
    return "Senior Golf";
  }

  // --- Instruction: how-to, drills, swing/putting tips.
  //     "tip"/"tips" must be a whole word (no "multiple"); "lesson" too. ---
  if (
    has([
      "how to", "tip", "tips", "drill", "drills", "lesson", "lessons",
      "fix your", "fix my", "improve your", "swing fault", "stop slicing",
      "stop hitting", "stop duffing", "ball striking", "perfect your",
      "master your", "the secret to", "fundamentals", "backswing", "downswing",
      "short game", "putting stroke", "green reading", "ball-then-turf",
      "ball first contact", "release the club", "common mistakes",
      "driver mistakes", "swing speed", "low point",
    ])
  ) {
    return "Instruction";
  }

  // --- Reviews / Equipment: gear, WITB, club tests.
  //     Checked before Mental Game so a putter review isn't read as "pressure". ---
  if (
    has([
      "review", "reviews", "witb", "what's in the bag", "first look",
      "tested", "we tried", "buying guide", "gift guide", "best driver",
      "best drivers", "best iron", "best irons", "best putter", "best putters",
      "best wedge", "best wedges", "best golf ball", "best golf balls",
      "best golf shoe", "best golf shoes", "best golf glove", "best golf gloves",
      "best golf bag", "best fairway", "best game improvement", "best gps",
      "rangefinder", "gps watch", "club junkie", "shaft review", "driver review",
      "iron review", "putter review", "wedge review", "special edition",
    ])
  ) {
    if (has(["review", "reviews", "tested", "we tried", "first look", "club junkie"])) {
      return "Reviews";
    }
    return "Equipment";
  }

  // --- Mental Game (needs a real psychology signal, not bare "pressure") ---
  if (
    has([
      "mental game", "mindset", "mental toughness", "breathwork", "psychology",
      "stay calm", "anxiety", "mental side", "course management mindset",
    ])
  ) {
    return "Mental Game";
  }

  // --- Travel: courses, destinations, resorts, architecture.
  //     "course" alone is far too broad — require a real travel phrase.
  //     "tee time" lives here only as "booking tee times" (not a penalty
  //     for a late tee time at a tournament). ---
  if (
    has([
      "golf course", "course closeup", "course diaries", "resort", "resorts",
      "destination", "destinations", "getaway", "getaways", "links course",
      "course architecture", "course design", "feat of architecture",
      "golf architecture", "renovation", "renovations", "redesign",
      "clubhouse", "bucket list", "must-play", "where to play",
      "booking tee times", "golf travel", "golf holiday", "golf trip",
      "course renovation", "links look", "golf city", "best golf course",
    ])
  ) {
    return "Travel";
  }

  // --- LPGA / Women's golf. "let " removed — use the full phrase.
  //     Tour-name signals must be in the TITLE (a multi-tour schedule
  //     roundup mentions "LPGA" in its body but isn't an LPGA story);
  //     specific women's events/players match anywhere. ---
  if (
    titleHas(["lpga", "women's golf", "womens golf", "ladies european tour"]) ||
    has([
      "solheim cup", "curtis cup", "women's open", "womens open",
      "women's amateur", "ladies european tour title", "let title",
      "nelly korda", "lottie woad", "lilia vu", "leona maguire",
      "anna huang", "female golfer", "women golfers",
    ])
  ) {
    return "LPGA";
  }

  // --- Industry: business, course management, the trade ---
  if (
    has([
      "golf industry", "superintendent", "superintendents", "greenkeeper",
      "greenkeeping", "turf", "management company", "troon", "acquisition",
      "course management company", "golf business", "appointed", "new ceo",
      "distributor", "webinar", "licensing program", "merchandise program",
    ])
  ) {
    return "Industry";
  }

  // --- Fashion: apparel & style. "shorts"/"style" only as whole words,
  //     and only when it's clearly the subject (title-level signal). ---
  if (
    titleHas([
      "fashion", "apparel", "outfit", "outfits", "footwear", "golf shorts",
      "polo", "polos", "what they wore", "dimes & crimes", "collection",
      "capsule", "sneaker", "sneakers", "boutique",
    ])
  ) {
    return "Fashion";
  }

  // --- Default: genuine tournament / player news ---
  if (feedHintCategory === "European Tour" || feedHintCategory === "Community") {
    return feedHintCategory;
  }
  return "Tour News";
}

/**
 * Tag an article's freshness by age. This drives the "keep current" goal:
 * the UI can show fresh counts and the ranker can gate on it.
 */
function freshnessOf(isoDate) {
  if (!isoDate) return "unknown";
  const ageH = (Date.now() - new Date(isoDate).getTime()) / 3600000;
  if (ageH < 24) return "fresh"; // last day
  if (ageH < 72) return "recent"; // last 3 days
  return "evergreen"; // older — useful filler, not headline material
}

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
            var m1 = item.content.match(/<img[^>]+src=["']([^"']+)/);
            if (m1) image = m1[1];
          }
          if (!image && item["content:encoded"]) {
            var m2 = item["content:encoded"].match(/<img[^>]+src=["']([^"']+)/);
            if (m2) image = m2[1];
          }
          if (!image && item.description) {
            var m3 = item.description.match(/<img[^>]+src=["']([^"']+)/);
            if (m3) image = m3[1];
          }

          const isoDate = normalizeDate(item);
          if (!isoDate) undatedCount++;

          const article = {
            title: item.title || "Untitled",
            link: item.link || item.guid || "#",
            description: (item.contentSnippet || item.content || "").slice(0, 300),
            pubDate: isoDate,
            dateKnown: isoDate !== null,
            feedName: feed.name,
            tier: feed.tier || "community",
            image: image,
          };

          // The article decides its own category from its own text.
          article.feedCategory = categorizeArticle(article, feed.category);
          // Freshness tag — drives "keep current" in the UI and ranker.
          article.freshness = freshnessOf(isoDate);

          return article;
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

  // Newest-first; undated articles sink to the bottom.
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
    // Per-category breakdown, split by freshness — so you can see at a glance
    // which categories actually have current material.
    const byCategory = {};
    articles.forEach((a) => {
      const c = a.feedCategory;
      if (!byCategory[c]) byCategory[c] = { total: 0, fresh: 0, recent: 0, evergreen: 0 };
      byCategory[c].total++;
      byCategory[c][a.freshness === "unknown" ? "evergreen" : a.freshness]++;
    });

    payload.diagnostics = {
      workingFeeds: GOLF_FEEDS.length - errors.length,
      brokenFeeds: errors.length,
      undatedArticles: undatedCount,
      proArticles: articles.filter((a) => a.tier === "pro").length,
      communityArticles: articles.filter((a) => a.tier === "community").length,
      freshArticles: articles.filter((a) => a.freshness === "fresh").length,
      categoryBreakdown: byCategory,
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
