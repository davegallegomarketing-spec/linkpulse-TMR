import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "LinkPulse Golf/1.0 (RSS Aggregator)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  customFields: {
    item: [
      ["media:content", "media:content"],
      ["media:thumbnail", "media:thumbnail"],
      ["content:encoded", "content:encoded"],
      // Some feeds (Atom, certain WordPress configs) only expose these:
      ["dc:date", "dc:date"],
      ["published", "published"],
      ["updated", "updated"],
      ["lastBuildDate", "lastBuildDate"],
    ],
  },
});

const GOLF_FEEDS = [
  // === TOUR NEWS (high frequency) ===
  { name: "Golf.com", url: "https://golf.com/feed/", category: "Tour News" },
  { name: "Golf365", url: "https://golf365.com/feed/", category: "Tour News" },
  { name: "National Club Golfer", url: "https://nationalclubgolfer.com/feed/", category: "Tour News" },
  { name: "Golf One Media", url: "https://golfonemedia.com/feed/", category: "Tour News" },
  { name: "Irish Golf Desk", url: "https://irishgolfdesk.com/news-files/rss.xml", category: "Tour News" },
  { name: "The Golf News Net", url: "https://thegolfnewsnet.com/feed/", category: "Tour News" },
  { name: "GolfBlogger", url: "https://golfblogger.com/feed/", category: "Tour News" },
  { name: "Golf Channel", url: "https://www.golfchannel.com/rss", category: "Tour News" },
  { name: "PGA Tour", url: "https://www.pgatour.com/feed", category: "Tour News" },
  { name: "Golf Digest", url: "https://www.golfdigest.com/feed/rss", category: "Tour News" },
  { name: "BBC Golf", url: "https://feeds.bbci.co.uk/sport/golf/rss.xml", category: "Tour News" },
  { name: "ESPN Golf", url: "https://www.espn.com/espn/rss/golf/news", category: "Tour News" },
  { name: "Sky Sports Golf", url: "https://www.skysports.com/rss/12176", category: "Tour News" },
  { name: "Golfweek", url: "https://golfweek.usatoday.com/feed/", category: "Tour News" },
  { name: "Golfweek PGA Tour", url: "https://golfweek.usatoday.com/category/pga-tour/feed/", category: "Tour News" },

  // === LIV GOLF ===
  { name: "LIV Golf Official", url: "https://www.livgolf.com/rss.xml", category: "LIV Golf" },
  { name: "Flushing It", url: "https://flushingitgolf.com/feed/", category: "LIV Golf" },

  // === EQUIPMENT ===
  { name: "GolfWRX", url: "https://www.golfwrx.com/feed/", category: "Equipment" },
  { name: "GolfHQ", url: "https://golfhq.com/blogs/blog.atom", category: "Equipment" },
  { name: "Today's Golfer", url: "https://www.todays-golfer.com/feed/", category: "Equipment" },
  { name: "Plugged In Golf", url: "https://pluggedingolf.com/feed/", category: "Equipment" },

  // === REVIEWS ===
  { name: "MyGolfSpy", url: "https://feeds.feedburner.com/Mygolfspy", category: "Reviews" },
  { name: "Breaking Eighty", url: "https://breakingeighty.com/feed/", category: "Reviews" },
  { name: "GolfMagic", url: "https://www.golfmagic.com/feed", category: "Reviews" },

  // === INDUSTRY ===
  { name: "Golf Business News", url: "https://golfbusinessnews.com/feed/", category: "Industry" },
  { name: "Golf Australia", url: "https://golf.org.au/feed/", category: "Industry" },
  { name: "Golf Course Industry", url: "https://www.golfcourseindustry.com/rss/", category: "Industry" },

  // === LPGA ===
  { name: "Women's Golf", url: "https://womensgolf.com/feed/", category: "LPGA" },
  { name: "Ladies European Tour", url: "https://ladieseuropeantour.com/feed/", category: "LPGA" },
  { name: "Women & Golf", url: "https://womenandgolf.com/feed", category: "LPGA" },

  // === EUROPEAN TOUR ===
  { name: "Golf News UK", url: "https://golfnews.co.uk/feed/", category: "European Tour" },
  { name: "Your Golf Travel", url: "https://yourgolftravel.com/19th-hole/feed/", category: "European Tour" },
  { name: "Bunkered", url: "https://bunkered.co.uk/feed", category: "European Tour" },
  { name: "Golf Canada", url: "https://www.golfcanada.ca/feed/", category: "European Tour" },

  // === COMMUNITY ===
  { name: "The Sand Trap", url: "https://thesandtrap.com/b/feed", category: "Community" },
  { name: "Hooked On Golf Blog", url: "https://hookedongolfblog.com/feed/", category: "Community" },
  { name: "No Laying Up", url: "https://www.nolayingup.com/blog?format=rss", category: "Community" },

  // === LIFESTYLE & TRAVEL ===
  { name: "GolfNow Blog", url: "https://blog.golfnow.com/feed/", category: "Lifestyle" },
  { name: "Cookie Jar Golf", url: "https://cookiejargolf.com/feed/", category: "Travel" },
  { name: "Top 100 Golf Courses", url: "https://www.top100golfcourses.com/feed", category: "Travel" },
  { name: "LINKS Magazine", url: "https://www.linksmagazine.com/feed/", category: "Travel" },

  // === MENTAL GAME ===
  { name: "Golf State of Mind", url: "https://golfstateofmind.com/feed/", category: "Mental Game" },

  // === INSTRUCTION ===
  { name: "Golf Span", url: "https://golfspan.com/feed/", category: "Instruction" },
  { name: "The Pro Golf", url: "https://theprogolf.com/feed/", category: "Instruction" },
  { name: "Andrew Rice Golf", url: "https://andrewricegolf.com/andrew-rice-golf/feed/", category: "Instruction" },

  // === SENIOR GOLF ===
  { name: "Senior Golf Source", url: "https://seniorgolfsource.com/feed/", category: "Senior Golf" },

  // === FASHION ===
  { name: "Golf Threads", url: "https://golf-threads.com/feed/", category: "Fashion" },

  // === MAGAZINE ===
  { name: "Golf Monthly", url: "https://golfmonthly.com/feed/", category: "Magazine" },

  // === BETTING ===
  { name: "Cal Golf News", url: "https://calgolfnews.com/feed/", category: "Betting" },

  // === ARCHITECTURE ===
  { name: "The Fried Egg", url: "https://thefriedegg.com/feed/", category: "Architecture" },
  { name: "Geoff Shackelford", url: "https://geoffshackelford.com/feed/", category: "Architecture" },

  // === STATS ===
  { name: "Data Golf", url: "https://datagolf.com/blog-feed", category: "Stats" },

  // === AGGREGATOR / SEARCH-BASED FEEDS ===
  // NOTE: Google News feeds removed per client requirement — all articles must
  // link directly to the original news source, never through google.com.
  { name: "Reddit r/golf", url: "https://www.reddit.com/r/golf/.rss", category: "Community" },
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Robustly turn whatever an RSS item gives us into a valid ISO date string.
 *
 * Why this exists: rss-parser populates `item.pubDate` / `item.isoDate` for
 * well-behaved feeds, but several feeds (Sky Sports, some Atom feeds, certain
 * WordPress setups) put the date under a different element. When that happens
 * the old code produced "" -> new Date("") -> Invalid Date, which (a) showed
 * "Invalid Date" in the UI and (b) returned NaN inside the sort comparator,
 * corrupting the entire article order.
 *
 * Strategy: try every known field, in order of reliability. If a candidate
 * parses to a real date, return its ISO string. If absolutely nothing works,
 * return null so the caller can decide what to do (we treat it as "unknown").
 */
function normalizeDate(item) {
  const candidates = [
    item.isoDate, // rss-parser's own normalized field — most reliable
    item.pubDate, // standard RSS <pubDate>
    item.published, // Atom <published>
    item.updated, // Atom <updated>
    item["dc:date"], // Dublin Core <dc:date>
    item.date, // some feeds use a bare <date>
    item.lastBuildDate, // last-resort feed-level field
  ];

  for (const c of candidates) {
    if (!c) continue;
    const t = new Date(c).getTime();
    if (!Number.isNaN(t)) {
      return new Date(t).toISOString();
    }
  }

  return null; // genuinely no usable date
}

export async function GET(request) {
  const url = new URL(request.url);
  const verbose = url.searchParams.get("verbose") === "true";

  // Counts how many articles had no parseable date — surfaced in verbose mode.
  let undatedCount = 0;

  const results = await Promise.allSettled(
    GOLF_FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        return (parsed.items || []).slice(0, 20).map((item) => {
          // --- Image extraction (unchanged) ---
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

          // --- Date normalization (the fix) ---
          const isoDate = normalizeDate(item);
          if (!isoDate) undatedCount++;

          return {
            title: item.title || "Untitled",
            link: item.link || item.guid || "#",
            description: (item.contentSnippet || item.content || "").slice(0, 300),
            // pubDate is now ALWAYS a valid ISO string, or null. Never "".
            pubDate: isoDate,
            // dateKnown lets the UI distinguish "real date" from "we guessed".
            dateKnown: isoDate !== null,
            feedName: feed.name,
            feedCategory: feed.category,
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

  // --- Safe sort: never returns NaN ---
  // Articles with a known date sort newest-first. Articles with NO date are
  // pushed to the bottom (treated as oldest) instead of scrambling the list.
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
