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
  // NEW additions
  { name: "ESPN Golf", url: "https://www.espn.com/espn/rss/golf/news", category: "Tour News" },
  { name: "Sky Sports Golf", url: "https://www.skysports.com/rss/12176", category: "Tour News" },
  // NEW 2026 additions — major outlets to verify in feeds?verbose=true
  { name: "Golfweek", url: "https://golfweek.usatoday.com/feed/", category: "Tour News" },
  { name: "Golfweek PGA Tour", url: "https://golfweek.usatoday.com/category/pga-tour/feed/", category: "Tour News" },

  // === LIV GOLF (NEW CATEGORY) ===
  { name: "LIV Golf Official", url: "https://www.livgolf.com/rss.xml", category: "LIV Golf" },
  { name: "Flushing It", url: "https://flushingitgolf.com/feed/", category: "LIV Golf" },

  // === EQUIPMENT ===
  { name: "GolfWRX", url: "https://www.golfwrx.com/feed/", category: "Equipment" },
  { name: "GolfHQ", url: "https://golfhq.com/blogs/blog.atom", category: "Equipment" },
  // NEW additions
  { name: "Today's Golfer", url: "https://www.todays-golfer.com/feed/", category: "Equipment" },
  { name: "Plugged In Golf", url: "https://pluggedingolf.com/feed/", category: "Equipment" },

  // === REVIEWS ===
  { name: "MyGolfSpy", url: "https://feeds.feedburner.com/Mygolfspy", category: "Reviews" },
  { name: "Breaking Eighty", url: "https://breakingeighty.com/feed/", category: "Reviews" },
  // NEW additions
  { name: "GolfMagic", url: "https://www.golfmagic.com/feed", category: "Reviews" },

  // === INDUSTRY ===
  { name: "Golf Business News", url: "https://golfbusinessnews.com/feed/", category: "Industry" },
  { name: "Golf Australia", url: "https://golf.org.au/feed/", category: "Industry" },
  // NEW 2026 addition — verify in feeds?verbose=true
  { name: "Golf Course Industry", url: "https://www.golfcourseindustry.com/rss/", category: "Industry" },

  // === LPGA ===
  { name: "Women's Golf", url: "https://womensgolf.com/feed/", category: "LPGA" },
  // NEW additions
  { name: "Ladies European Tour", url: "https://ladieseuropeantour.com/feed/", category: "LPGA" },
  // NEW 2026 addition — verify in feeds?verbose=true
  { name: "Women & Golf", url: "https://womenandgolf.com/feed", category: "LPGA" },

  // === EUROPEAN TOUR ===
  { name: "Golf News UK", url: "https://golfnews.co.uk/feed/", category: "European Tour" },
  { name: "Your Golf Travel", url: "https://yourgolftravel.com/19th-hole/feed/", category: "European Tour" },
  // NEW additions
  { name: "Bunkered", url: "https://bunkered.co.uk/feed", category: "European Tour" },
  // NEW 2026 addition (national tour news) — verify in feeds?verbose=true
  { name: "Golf Canada", url: "https://www.golfcanada.ca/feed/", category: "European Tour" },

  // === COMMUNITY ===
  { name: "The Sand Trap", url: "https://thesandtrap.com/b/feed", category: "Community" },
  { name: "Hooked On Golf Blog", url: "https://hookedongolfblog.com/feed/", category: "Community" },
  // NEW additions
  { name: "No Laying Up", url: "https://www.nolayingup.com/blog?format=rss", category: "Community" },

  // === LIFESTYLE & TRAVEL ===
  { name: "GolfNow Blog", url: "https://blog.golfnow.com/feed/", category: "Lifestyle" },
  { name: "Cookie Jar Golf", url: "https://cookiejargolf.com/feed/", category: "Travel" },
  // NEW additions
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

  // === ARCHITECTURE (NEW CATEGORY) ===
  { name: "The Fried Egg", url: "https://thefriedegg.com/feed/", category: "Architecture" },
  { name: "Geoff Shackelford", url: "https://geoffshackelford.com/feed/", category: "Architecture" },

  // === STATS (NEW CATEGORY) ===
  { name: "Data Golf", url: "https://datagolf.com/blog-feed", category: "Stats" },

  // === AGGREGATOR / SEARCH-BASED FEEDS ===
  // NOTE: Google News feeds removed per client requirement — all articles must
  // link directly to the original news source, never through google.com.
  // Reddit r/golf: fan discussion, course photos, hot takes — not pro journalism
  { name: "Reddit r/golf", url: "https://www.reddit.com/r/golf/.rss", category: "Community" },
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  // ?verbose=true returns per-feed diagnostics so we can see which feeds are failing
  const url = new URL(request.url);
  const verbose = url.searchParams.get("verbose") === "true";

  const results = await Promise.allSettled(
    GOLF_FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        return (parsed.items || []).slice(0, 15).map((item) => {
          // Extract image from every possible RSS field
          var image = null;

          // 1. Media content (most common for news feeds)
          if (item["media:content"] && item["media:content"]["$"] && item["media:content"]["$"].url) {
            image = item["media:content"]["$"].url;
          }
          // 2. Media thumbnail
          if (!image && item["media:thumbnail"] && item["media:thumbnail"]["$"] && item["media:thumbnail"]["$"].url) {
            image = item["media:thumbnail"]["$"].url;
          }
          // 3. Enclosure (podcast/media style)
          if (!image && item.enclosure && item.enclosure.url) {
            image = item.enclosure.url;
          }
          // 4. itunes image
          if (!image && item["itunes"] && item["itunes"]["image"]) {
            image = item["itunes"]["image"];
          }
          // 5. Extract from content HTML (img tag)
          if (!image && item.content) {
            var imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)/);
            if (imgMatch) image = imgMatch[1];
          }
          // 6. Extract from content:encoded
          if (!image && item["content:encoded"]) {
            var imgMatch2 = item["content:encoded"].match(/<img[^>]+src=["']([^"']+)/);
            if (imgMatch2) image = imgMatch2[1];
          }
          // 7. Extract from description HTML
          if (!image && item.description) {
            var imgMatch3 = item.description.match(/<img[^>]+src=["']([^"']+)/);
            if (imgMatch3) image = imgMatch3[1];
          }

          return {
            title: item.title || "Untitled",
            link: item.link || item.guid || "#",
            description: (item.contentSnippet || item.content || "").slice(0, 300),
            pubDate: item.pubDate || item.isoDate || "",
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

  articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  const payload = {
    articles,
    errors,
    total: articles.length,
    sources: GOLF_FEEDS.length,
    fetchedAt: new Date().toISOString(),
  };

  // Verbose mode: return diagnostic info so we can see exactly which feeds are broken
  if (verbose) {
    const working = GOLF_FEEDS.length - errors.length;
    payload.diagnostics = {
      workingFeeds: working,
      brokenFeeds: errors.length,
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
