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
      ["dc:date", "dc:date"],
      ["published", "published"],
      ["updated", "updated"],
      ["lastBuildDate", "lastBuildDate"],
    ],
  },
});

/**
 * Feed list.
 *
 * tier:
 *   "pro"       = professional golf journalism / established publications.
 *                 These should dominate the newsletter.
 *   "community" = blogs / fan content / lighter material. Useful for variety
 *                 and for filling quiet news days, but lower priority.
 *
 * NOTE: Reddit r/golf was REMOVED. It posted constantly and dominated the
 * "newest" articles with non-news chatter ("Stole my sandwich", "Broke 80
 * today"). To replace that lost volume we widened the pro/evergreen sources
 * below — instruction, equipment, course/travel — which publish steadily even
 * when no tournament is on.
 */
const GOLF_FEEDS = [
  // === TOUR NEWS ===
  { name: "Golf.com", url: "https://golf.com/feed/", category: "Tour News", tier: "pro" },
  { name: "Golf365", url: "https://golf365.com/feed/", category: "Tour News", tier: "pro" },
  { name: "National Club Golfer", url: "https://nationalclubgolfer.com/feed/", category: "Tour News", tier: "pro" },
  { name: "Golf One Media", url: "https://golfonemedia.com/feed/", category: "Tour News", tier: "community" },
  { name: "Irish Golf Desk", url: "https://irishgolfdesk.com/news-files/rss.xml", category: "Tour News", tier: "pro" },
  { name: "The Golf News Net", url: "https://thegolfnewsnet.com/feed/", category: "Tour News", tier: "pro" },
  { name: "GolfBlogger", url: "https://golfblogger.com/feed/", category: "Tour News", tier: "community" },
  { name: "Golf Channel", url: "https://www.golfchannel.com/rss", category: "Tour News", tier: "pro" },
  { name: "PGA Tour", url: "https://www.pgatour.com/feed", category: "Tour News", tier: "pro" },
  { name: "Golf Digest", url: "https://www.golfdigest.com/feed/rss", category: "Tour News", tier: "pro" },
  { name: "BBC Golf", url: "https://feeds.bbci.co.uk/sport/golf/rss.xml", category: "Tour News", tier: "pro" },
  { name: "ESPN Golf", url: "https://www.espn.com/espn/rss/golf/news", category: "Tour News", tier: "pro" },
  { name: "Sky Sports Golf", url: "https://www.skysports.com/rss/12176", category: "Tour News", tier: "pro" },
  { name: "Golfweek", url: "https://golfweek.usatoday.com/feed/", category: "Tour News", tier: "pro" },
  { name: "Golfweek PGA Tour", url: "https://golfweek.usatoday.com/category/pga-tour/feed/", category: "Tour News", tier: "pro" },
  // NEW pro source — verify in feeds?verbose=true
  { name: "Yardbarker Golf", url: "https://www.yardbarker.com/rss/sport/8", category: "Tour News", tier: "pro" },

  // === LIV GOLF ===
  { name: "LIV Golf Official", url: "https://www.livgolf.com/rss.xml", category: "LIV Golf", tier: "pro" },
  { name: "Flushing It", url: "https://flushingitgolf.com/feed/", category: "LIV Golf", tier: "community" },

  // === EQUIPMENT ===
  { name: "GolfWRX", url: "https://www.golfwrx.com/feed/", category: "Equipment", tier: "pro" },
  { name: "GolfHQ", url: "https://golfhq.com/blogs/blog.atom", category: "Equipment", tier: "community" },
  { name: "Today's Golfer", url: "https://www.todays-golfer.com/feed/", category: "Equipment", tier: "pro" },
  { name: "Plugged In Golf", url: "https://pluggedingolf.com/feed/", category: "Equipment", tier: "pro" },
  // NEW evergreen equipment source — verify in feeds?verbose=true
  { name: "Golfalot", url: "https://www.golfalot.com/rss/news.xml", category: "Equipment", tier: "pro" },

  // === REVIEWS ===
  { name: "MyGolfSpy", url: "https://feeds.feedburner.com/Mygolfspy", category: "Reviews", tier: "pro" },
  { name: "Breaking Eighty", url: "https://breakingeighty.com/feed/", category: "Reviews", tier: "community" },
  { name: "GolfMagic", url: "https://www.golfmagic.com/feed", category: "Reviews", tier: "pro" },

  // === INDUSTRY ===
  { name: "Golf Business News", url: "https://golfbusinessnews.com/feed/", category: "Industry", tier: "pro" },
  { name: "Golf Australia", url: "https://golf.org.au/feed/", category: "Industry", tier: "pro" },
  { name: "Golf Course Industry", url: "https://www.golfcourseindustry.com/rss/", category: "Industry", tier: "pro" },

  // === LPGA ===
  { name: "Women's Golf", url: "https://womensgolf.com/feed/", category: "LPGA", tier: "pro" },
  { name: "Ladies European Tour", url: "https://ladieseuropeantour.com/feed/", category: "LPGA", tier: "pro" },
  { name: "Women & Golf", url: "https://womenandgolf.com/feed", category: "LPGA", tier: "pro" },

  // === EUROPEAN TOUR ===
  { name: "Golf News UK", url: "https://golfnews.co.uk/feed/", category: "European Tour", tier: "pro" },
  { name: "Your Golf Travel", url: "https://yourgolftravel.com/19th-hole/feed/", category: "European Tour", tier: "community" },
  { name: "Bunkered", url: "https://bunkered.co.uk/feed", category: "European Tour", tier: "pro" },
  { name: "Golf Canada", url: "https://www.golfcanada.ca/feed/", category: "European Tour", tier: "pro" },

  // === COMMUNITY (blogs — kept deliberately small) ===
  { name: "The Sand Trap", url: "https://thesandtrap.com/b/feed", category: "Community", tier: "community" },
  { name: "Hooked On Golf Blog", url: "https://hookedongolfblog.com/feed/", category: "Community", tier: "community" },
  { name: "No Laying Up", url: "https://www.nolayingup.com/blog?format=rss", category: "Community", tier: "pro" },

  // === LIFESTYLE & TRAVEL ===
  { name: "GolfNow Blog", url: "https://blog.golfnow.com/feed/", category: "Lifestyle", tier: "community" },
  { name: "Cookie Jar Golf", url: "https://cookiejargolf.com/feed/", category: "Travel", tier: "community" },
  { name: "Top 100 Golf Courses", url: "https://www.top100golfcourses.com/feed", category: "Travel", tier: "pro" },
  { name: "LINKS Magazine", url: "https://www.linksmagazine.com/feed/", category: "Travel", tier: "pro" },

  // === MENTAL GAME ===
  { name: "Golf State of Mind", url: "https://golfstateofmind.com/feed/", category: "Mental Game", tier: "community" },

  // === INSTRUCTION (evergreen — fills quiet news days) ===
  { name: "Golf Span", url: "https://golfspan.com/feed/", category: "Instruction", tier: "community" },
  { name: "The Pro Golf", url: "https://theprogolf.com/feed/", category: "Instruction", tier: "community" },
  { name: "Andrew Rice Golf", url: "https://andrewricegolf.com/andrew-rice-golf/feed/", category: "Instruction", tier: "community" },

  // === SENIOR GOLF ===
  { name: "Senior Golf Source", url: "https://seniorgolfsource.com/feed/", category: "Senior Golf", tier: "community" },

  // === FASHION ===
  { name: "Golf Threads", url: "https://golf-threads.com/feed/", category: "Fashion", tier: "community" },

  // === MAGAZINE ===
  { name: "Golf Monthly", url: "https://golfmonthly.com/feed/", category: "Magazine", tier: "pro" },

  // === BETTING ===
  { name: "Cal Golf News", url: "https://calgolfnews.com/feed/", category: "Betting", tier: "community" },

  // === ARCHITECTURE ===
  { name: "The Fried Egg", url: "https://thefriedegg.com/feed/", category: "Architecture", tier: "pro" },
  { name: "Geoff Shackelford", url: "https://geoffshackelford.com/feed/", category: "Architecture", tier: "pro" },

  // === STATS ===
  { name: "Data Golf", url: "https://datagolf.com/blog-feed", category: "Stats", tier: "pro" },

  // NOTE: Google News feeds removed per client requirement (no google.com links).
  // NOTE: Reddit r/golf removed — community chatter, not newsletter-grade news.
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Turn whatever an RSS item gives us into a valid ISO date string, or null.
 * Tries every known date field in order of reliability. Prevents the
 * "Invalid Date" bug and the NaN-corrupted sort.
 */
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
        const parsed = await parser.parseURL(feed.url);
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

          // --- Date ---
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
            // Source quality tier — lets the UI favor pro journalism.
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

  // Safe sort: newest-first, undated articles sink to the bottom.
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
