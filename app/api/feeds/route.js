import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "LinkPulse Golf/1.0 (RSS Aggregator)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

const GOLF_FEEDS = [
  { name: "Golf.com", url: "https://golf.com/feed/", category: "Tour News" },
  {
    name: "GolfWRX",
    url: "https://www.golfwrx.com/feed/",
    category: "Equipment",
  },
  {
    name: "MyGolfSpy",
    url: "https://feeds.feedburner.com/Mygolfspy",
    category: "Reviews",
  },
  {
    name: "Golf Business News",
    url: "https://golfbusinessnews.com/feed/",
    category: "Industry",
  },
  {
    name: "National Club Golfer",
    url: "https://nationalclubgolfer.com/feed/",
    category: "Tour News",
  },
  {
    name: "Golf365",
    url: "https://golf365.com/feed/",
    category: "Tour News",
  },
  {
    name: "Women's Golf",
    url: "https://womensgolf.com/feed/",
    category: "LPGA",
  },
  {
    name: "The Sand Trap",
    url: "https://thesandtrap.com/b/feed",
    category: "Community",
  },
  {
    name: "GolfNow Blog",
    url: "https://blog.golfnow.com/feed/",
    category: "Lifestyle",
  },
  {
    name: "Golf State of Mind",
    url: "https://golfstateofmind.com/feed/",
    category: "Mental Game",
  },
  {
    name: "Golf Span",
    url: "https://golfspan.com/feed/",
    category: "Tips",
  },
  {
    name: "Senior Golf Source",
    url: "https://seniorgolfsource.com/feed/",
    category: "Senior Golf",
  },
  {
    name: "Irish Golf Desk",
    url: "https://irishgolfdesk.com/news-files/rss.xml",
    category: "Tour News",
  },
  {
    name: "Golf One Media",
    url: "https://golfonemedia.com/feed/",
    category: "Tour News",
  },
];

export async function GET() {
  const results = await Promise.allSettled(
    GOLF_FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        return (parsed.items || []).slice(0, 10).map((item) => ({
          title: item.title || "Untitled",
          link: item.link || item.guid || "#",
          description: (item.contentSnippet || item.content || "").slice(
            0,
            300
          ),
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

  return Response.json({
    articles,
    errors,
    total: articles.length,
    sources: GOLF_FEEDS.length,
    fetchedAt: new Date().toISOString(),
  });
}
