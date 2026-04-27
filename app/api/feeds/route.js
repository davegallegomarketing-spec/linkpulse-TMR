import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "LinkPulse Golf/1.0 (RSS Aggregator)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
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

  // === EQUIPMENT ===
  { name: "GolfWRX", url: "https://www.golfwrx.com/feed/", category: "Equipment" },
  { name: "GolfHQ", url: "https://golfhq.com/blogs/blog.atom", category: "Equipment" },

  // === REVIEWS ===
  { name: "MyGolfSpy", url: "https://feeds.feedburner.com/Mygolfspy", category: "Reviews" },
  { name: "Breaking Eighty", url: "https://breakingeighty.com/feed/", category: "Reviews" },

  // === INDUSTRY ===
  { name: "Golf Business News", url: "https://golfbusinessnews.com/feed/", category: "Industry" },
  { name: "Golf Australia", url: "https://golf.org.au/feed/", category: "Industry" },

  // === LPGA ===
  { name: "Women's Golf", url: "https://womensgolf.com/feed/", category: "LPGA" },

  // === EUROPEAN TOUR ===
  { name: "Golf News UK", url: "https://golfnews.co.uk/feed/", category: "European Tour" },
  { name: "Your Golf Travel", url: "https://yourgolftravel.com/19th-hole/feed/", category: "European Tour" },

  // === COMMUNITY ===
  { name: "The Sand Trap", url: "https://thesandtrap.com/b/feed", category: "Community" },
  { name: "Hooked On Golf Blog", url: "https://hookedongolfblog.com/feed/", category: "Community" },

  // === LIFESTYLE & TRAVEL ===
  { name: "GolfNow Blog", url: "https://blog.golfnow.com/feed/", category: "Lifestyle" },
  { name: "Cookie Jar Golf", url: "https://cookiejargolf.com/feed/", category: "Travel" },

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
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const results = await Promise.allSettled(
    GOLF_FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        return (parsed.items || []).slice(0, 15).map((item) => ({
          title: item.title || "Untitled",
          link: item.link || item.guid || "#",
          description: (item.contentSnippet || item.content || "").slice(0, 300),
          pubDate: item.pubDate || item.isoDate || "",
          feedName: feed.name,
          feedCategory: feed.category,
        }));
      } catch (err) {
        return { error: feed.name, message: err.message };
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

  return new Response(JSON.stringify({
    articles,
    errors,
    total: articles.length,
    sources: GOLF_FEEDS.length,
    fetchedAt: new Date().toISOString(),
  }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  });
}
