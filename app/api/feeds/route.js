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

  // --- LIV Golf -----------------------------------------------------------
  // There is NO dedicated single-publisher LIV RSS feed: livgolf.com runs on
  // Next.js + Sanity with no feed, and other outlets' "LIV" pages aren't
  // syndicated as feeds. Rather than re-add an unverifiable guess (the reason
  // the old "LIV News" entry was deleted), LIV coverage is gathered a
  // different way: the categorizer (categorizeArticle) now pulls LIV stories
  // OUT of the pro feeds already in this list — BBC, Sky, ESPN, Golf.com,
  // Golf365, National Club Golfer all cover the hot LIV stories — and tags
  // them category:"LIV" so they collect in the LIV bucket. No aggregator, no
  // new dependency. If a real LIV publisher feed is ever confirmed, add it
  // here with category:"LIV" and it will slot straight into that bucket.

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

  // --- LIV Golf: its own bucket so the "hot" LIV stories are easy to find
  //     across EVERY feed, not just the dedicated LIV source. Checked early
  //     so a LIV funding/signing story isn't grabbed by Industry ("signs",
  //     "new ceo") first. Kept tight: "liv golf" anywhere, or whole-word
  //     "liv" / a LIV team name in the TITLE. We deliberately DON'T match
  //     bare player names (Rahm, DeChambeau, Koepka…) — they also play the
  //     majors, and a major story is not a LIV story. ---
  if (
    has(["liv golf", "liv golf league", "liv tour"]) ||
    titleHas([
      "liv", "4aces", "crushers gc", "legion xiii", "ripper gc", "rangegoats",
      "fireballs gc", "smash gc", "stinger gc", "cleeks gc", "iron heads",
      "torque gc", "hyflyers gc", "majesticks gc",
    ])
  ) {
    return "LIV";
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
  // Honor the feed hint for sources whose whole identity IS a category the
  // keyword rules can't always infer from a headline — e.g. a LIV recap like
  // "Niemann edges Gooch in Korea" never contains the word "LIV". The
  // dedicated LIV feed is tagged category:"LIV", so its un-matched items stay
  // LIV here instead of defaulting to Tour News.
  if (
    feedHintCategory === "European Tour" ||
    feedHintCategory === "Community" ||
    feedHintCategory === "LIV"
  ) {
    return feedHintCategory;
  }
  return "Tour News";
}

/**
 * Tag an article's freshness by age. This drives the "keep current" goal:
 * the UI can show fresh counts and the ranker can gate on it.
 *
 * When an article has no parseable date (some feeds — notably Sky Sports —
 * ship items with no usable date field), we DON'T sink it to "unknown" and
 * make it invisible. RSS feeds are reverse-chronological, so the item's
 * position is a reliable proxy: the first few items are the newest.
 *   - feedIndex 0-2 -> "recent"  (top of an active feed = today-ish)
 *   - feedIndex 3+  -> "evergreen"
 * We never award "fresh" to a dated-by-position article — "fresh" should
 * mean a known sub-24h timestamp, not a guess. "recent" keeps it visible
 * and rankable without claiming precision we don't have.
 */
function freshnessOf(isoDate, feedIndex) {
  if (!isoDate) {
    if (typeof feedIndex === "number" && feedIndex <= 2) return "recent";
    return "evergreen";
  }
  const ageH = (Date.now() - new Date(isoDate).getTime()) / 3600000;
  if (ageH < 24) return "fresh"; // last day
  if (ageH < 72) return "recent"; // last 3 days
  return "evergreen"; // older — useful filler, not headline material
}

/**
 * ===========================================================================
 * AUTO-RANKER
 * ===========================================================================
 * The daily job: out of ~350 articles, the user hand-picks 10 for The
 * Mulligan Report, 3x/day. The ranker does the first pass — it scores every
 * article and pre-selects a top 10, so the user reviews/tweaks instead of
 * hunting. They keep final say; this just removes the needle-in-haystack step.
 *
 * SCORE = freshness + tier + topicHeat  (0-100ish, higher = stronger pick)
 *
 *   freshness  — the north star ("the game is keep current"). Weighted
 *                heaviest. A "position"-confidence article (date guessed
 *                from feed slot, not parsed) takes a small haircut so a
 *                KNOWN recent timestamp always beats a GUESSED one.
 *   tier       — pro journalism over community blogs for a newsletter.
 *   topicHeat  — how headline-worthy the category is, plus a small bump
 *                for breaking-news words in the title.
 *
 * HARD FRESHNESS GATE: an "evergreen" article can never be auto-selected,
 * no matter how high it otherwise scores. Nothing stale slips into the
 * lineup. The auto-10 is drawn only from "fresh" + "recent".
 */
const FRESHNESS_POINTS = { fresh: 50, recent: 28, evergreen: 6 };
const TIER_POINTS = { pro: 25, community: 12 };

// Category heat — how likely a category is to carry headline news.
const TOPIC_HEAT = {
  "Tour News": 25,
  LIV: 24, // hot right now — rank LIV stories just below general tour news
  LPGA: 22,
  "European Tour": 20,
  "Senior Golf": 16,
  Industry: 15,
  Reviews: 14,
  Equipment: 13,
  Instruction: 11,
  Travel: 10,
  Community: 10,
  "Mental Game": 8,
  Fashion: 8,
};

// Breaking-news signals in a title — a small, capped bonus on top of heat.
const BREAKING_RE = new RegExp(
  "(^|[^a-z])(" +
    [
      "wins", "win", "won", "victory", "champion", "clinches", "seals",
      "withdraws", "withdrawal", "injured", "injury", "leads", "leader",
      "shoots", "card", "cards", "breaks", "record", "announces", "announced",
      "signs", "joins", "results", "final round", "playoff", "disqualified",
    ].join("|") +
    ")([^a-z]|$)",
  "i"
);

/**
 * Score a single article. Pure function of the article's own fields —
 * no external state — so it's trivially testable.
 */
function scoreArticle(article) {
  let freshness = FRESHNESS_POINTS[article.freshness] || 0;
  // Haircut for position-inferred dates: keep them in contention but never
  // let a guess outrank a known timestamp of the same tier.
  if (article.dateConfidence === "position") freshness *= 0.85;

  const tier = TIER_POINTS[article.tier] || TIER_POINTS.community;
  let topicHeat = TOPIC_HEAT[article.feedCategory] != null ? TOPIC_HEAT[article.feedCategory] : 10;
  if (BREAKING_RE.test(article.title || "")) topicHeat += 8;

  const total = freshness + tier + topicHeat;
  return {
    total: Math.round(total * 10) / 10,
    freshness: Math.round(freshness * 10) / 10,
    tier,
    topicHeat,
  };
}

/**
 * Rank all articles and pick the auto-lineup.
 *
 * Returns the articles array with each article carrying a `rank` object
 * { score, breakdown, autoPick, autoRank }, plus a separate ordered list of
 * the picked article links.
 *
 *   - HARD GATE: only "fresh" / "recent" articles are eligible. "evergreen"
 *     gets a score (for transparency) but autoPick is always false.
 *   - DIVERSITY CAP: at most `perCategoryCap` from any one category, so the
 *     lineup isn't 10 driver reviews. The user wanted the ~15 subcategories
 *     kept distinct — this makes the auto-pick honour that spread.
 */
/**
 * ===========================================================================
 * STORY DE-DUPLICATION (conservative first pass)
 * ===========================================================================
 * The same event gets covered by many feeds — e.g. one PGA Tour win shows up
 * 5x (ESPN, BBC, Sky, etc.). For a 10-slot newsletter we want ONE copy.
 *
 * This is a CONSERVATIVE pass: it only merges articles when it is confident
 * they are the same story — same SUBJECT (the player the headline is about)
 * AND same EVENT group AND published within 48h. It deliberately errs toward
 * UNDER-merging: a missed duplicate just means the editor sees a story twice
 * and drops one (trivial). A false merge would silently hide a real story —
 * far worse — so we never merge on a weak signal.
 *
 * Known limits (headline-only matching can't catch these — see HANDOFF):
 *   - headlines that never name the event ("Clark ends two-year wait...")
 *   - headlines with no person named ("The CJ Cup Byron Nelson Recap")
 *   - a leading place name stealing the subject slot ("Canada's Huang...")
 * These remain as separate clusters — visible, not hidden.
 *
 * Each article gains `duplicateOf` (link of the cluster's kept article, or
 * null if it IS the kept one / is unclustered). The ranker skips articles
 * whose duplicateOf is set, so only one per cluster can be auto-picked.
 */
const DEDUP_STOPCAP = new Set([
  // articles / generic leading words
  "The", "A", "An", "This", "These", "That", "After", "Before", "How",
  "What", "Why", "When", "Where", "Who", "Best", "New", "Now", "Top",
  // generic golf words that aren't people
  "Golf", "Tour", "Cup", "Day", "Open", "Pro", "Club", "Course", "Event",
  "Round", "Win", "Wins", "Final", "Photos", "Watch", "Video", "Latest",
  "Report", "Recap", "Preview", "Throwback", "Time", "Machine", "Slabs",
  "Inside", "Former", "Revealed", "Most", "Live", "Lead", "Ways",
  // event / place words — must NOT be picked as a person-subject
  "Byron", "Nelson", "Masters", "Augusta", "Aronimink", "Soudal", "PGA",
  "LPGA", "LIV", "Morocco", "Lalla", "Meryem", "Shinnecock", "Schwab",
  "Colonial", "Championship", "Texas", "Dallas", "Charles", "CJ", "NCAA",
]);

// Event groups: alias tokens that all point to the same real-world event.
const DEDUP_EVENT_GROUPS = [
  { key: "byron-nelson", toks: ["byron", "nelson"] },
  { key: "let-morocco", toks: ["morocco", "meryem", "lalla"] },
  { key: "pga-champ", toks: ["pga championship", "aronimink"] },
  { key: "soudal", toks: ["soudal"] },
  { key: "masters", toks: ["masters", "augusta"] },
  { key: "us-open", toks: ["us open", "shinnecock"] },
  { key: "schwab", toks: ["schwab challenge", "colonial"] },
];

// SUBJECT = the person a story is about. We take the first capitalized word
// that is NOT a generic headline word and NOT an event/place name. If none
// qualifies, return null — meaning "can't identify a subject, do not story-
// match this article." Returning null is the SAFE outcome: a missed merge
// just shows a story twice; a wrong subject causes a wrong merge (e.g.
// "How to bet the CJ Cup" wrongly merging with the tournament recap).
function dedupSubject(title) {
  const matches = (title || "").match(/\b[A-Z][a-z]{2,}('s)?\b/g) || [];
  for (const w of matches) {
    const c = w.replace(/'s$/, "");
    if (!DEDUP_STOPCAP.has(c)) return c.toLowerCase();
  }
  return null;
}

function dedupEventKey(title) {
  const lc = (title || "").toLowerCase();
  for (const g of DEDUP_EVENT_GROUPS) {
    if (g.toks.some((tk) => lc.includes(tk))) return g.key;
  }
  return null;
}

// Two articles are the same story only if subject + event match and (when
// both dated) they are within 48h. Undated articles pass on subject+event.
function dedupSameStory(a, b) {
  const sa = dedupSubject(a.title), sb = dedupSubject(b.title);
  if (!sa || !sb || sa !== sb) return false;
  const ea = dedupEventKey(a.title), eb = dedupEventKey(b.title);
  if (!ea || !eb || ea !== eb) return false;
  if (a.pubDate && b.pubDate) {
    const dh = Math.abs(new Date(a.pubDate) - new Date(b.pubDate)) / 3600000;
    if (dh > 48) return false;
  }
  return true;
}

/**
 * A stable "story identity" for an article: subject + event, e.g.
 * "clark|byron-nelson". Used so the UI can tell when an article covers a
 * story that was ALREADY PUBLISHED (even if it's a different article from a
 * different source). Returns null when there isn't enough signal to identify
 * the story — callers must treat null as "no story match", never group nulls.
 */
function storyKeyOf(title) {
  const subj = dedupSubject(title);
  const evt = dedupEventKey(title);
  if (!subj || !evt) return null;
  return subj + "|" + evt;
}

/**
 * Tag duplicates in place. Must run AFTER scoreArticle so we can keep the
 * highest-scoring article of each cluster as the canonical one.
 */
function markDuplicates(articles) {
  // Union-find clustering.
  const parent = articles.map((_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      if (dedupSameStory(articles[i], articles[j])) parent[find(i)] = find(j);
    }
  }
  const clusters = {};
  articles.forEach((a, i) => {
    const r = find(i);
    (clusters[r] = clusters[r] || []).push(a);
  });
  let duplicateCount = 0;
  Object.values(clusters).forEach((group) => {
    if (group.length < 2) {
      group[0].duplicateOf = null;
      return;
    }
    // Keep the highest-scoring article; mark the rest as duplicates of it.
    const keep = group.reduce((m, x) => (x.rank.score > m.rank.score ? x : m));
    group.forEach((a) => {
      a.duplicateOf = a === keep ? null : keep.link;
      if (a !== keep) duplicateCount++;
    });
  });
  return duplicateCount;
}

function rankArticles(articles, limit = 10, perCategoryCap = 3) {
  // Score everything.
  articles.forEach((a) => {
    const s = scoreArticle(a);
    a.rank = {
      score: s.total,
      breakdown: { freshness: s.freshness, tier: s.tier, topicHeat: s.topicHeat },
      autoPick: false,
      autoRank: null,
    };
  });

  // De-duplicate AFTER scoring (needs scores to pick the canonical article).
  const duplicateCount = markDuplicates(articles);

  // Eligible = passes the hard freshness gate AND is not a duplicate of a
  // higher-scoring article. Sorted strongest-first; ties broken by a known
  // date being newer (exact dates only).
  const eligible = articles
    .filter((a) => (a.freshness === "fresh" || a.freshness === "recent") && !a.duplicateOf)
    .sort((a, b) => {
      if (b.rank.score !== a.rank.score) return b.rank.score - a.rank.score;
      const at = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const bt = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return bt - at;
    });

  // Walk the sorted list, taking the top `limit` while respecting the
  // per-category cap.
  const perCat = {};
  const picked = [];
  for (const a of eligible) {
    if (picked.length >= limit) break;
    const c = a.feedCategory || "Tour News";
    if ((perCat[c] || 0) >= perCategoryCap) continue;
    perCat[c] = (perCat[c] || 0) + 1;
    a.rank.autoPick = true;
    a.rank.autoRank = picked.length + 1;
    picked.push(a);
  }

  return {
    picks: picked.map((a) => ({
      autoRank: a.rank.autoRank,
      title: a.title,
      link: a.link,
      feedName: a.feedName,
      feedCategory: a.feedCategory,
      freshness: a.freshness,
      score: a.rank.score,
    })),
    eligibleCount: eligible.length,
    duplicateCount: duplicateCount,
  };
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

/**
 * ===========================================================================
 * LLM ENRICHMENT PASS  ("the Haiku brain")
 * ===========================================================================
 * The keyword categorizer (categorizeArticle) is fast and free but matches on
 * surface tokens, so it MISSES stories whose headline doesn't contain the
 * tell-tale word — most importantly LIV recaps like "Niemann edges Gooch in
 * Korea" (a LIV event, LIV players, but the word "LIV" never appears).
 *
 * This pass sends the RECENT articles (fresh/recent only — we don't spend
 * tokens on evergreen filler) to Claude Haiku in small batches and lets it
 * RE-LABEL them by reading meaning, not keywords. It is purely additive:
 *   - It only overrides feedCategory when Claude returns a VALID category.
 *   - Any error / missing key / bad JSON → the article keeps its keyword
 *     category. The brain can never break or empty the feed.
 *   - Results are cached by article id, so each article is classified once
 *     and not re-sent on every refresh (keeps cost at pennies-scale).
 *
 * NOTE: this is best-effort caching via an in-process Map. On Vercel it
 * survives while a lambda stays warm (consecutive refreshes benefit) but is
 * wiped on cold start. For durable caching across all instances, back
 * `llmCache` with Vercel KV / Upstash later — same interface.
 */
const LLM_MODEL = "claude-haiku-4-5";
const LLM_BATCH_SIZE = 25;          // articles per Claude call
const LLM_MAX_ARTICLES = 120;       // hard ceiling per refresh (cost guard)
const VALID_CATEGORIES = new Set([
  "LIV", "Tour News", "LPGA", "European Tour", "Senior Golf", "Equipment",
  "Reviews", "Instruction", "Travel", "Industry", "Mental Game", "Fashion",
  "Community",
]);

// articleId -> category. Best-effort, warm-instance cache (see note above).
const llmCache = new Map();

// Stable per-article key for the cache. Mirrors page.js's articleId(): a real
// link when present, else feedName+title+pubDate. Defined locally so this pass
// has no dependency on the front-end module.
function llmKey(a) {
  const link = a.link || "";
  if (link && link !== "#" && link.indexOf("http") === 0) return link;
  return (a.feedName || "") + "::" + (a.title || "") + "::" + (a.pubDate || "");
}

const LLM_SYSTEM = `You categorize golf news articles for a newsletter aggregator. For each article you are given an id, title, and short description.

Assign EXACTLY ONE category from this list:
LIV, Tour News, LPGA, European Tour, Senior Golf, Equipment, Reviews, Instruction, Travel, Industry, Mental Game, Fashion, Community.

Key rule — LIV:
- Use "LIV" for anything about the LIV Golf League: its tournaments (e.g. LIV Golf Korea, Andalucia), its teams (4Aces, Crushers GC, Legion XIII, Ripper GC, Fireballs GC, Torque GC, Cleeks, HyFlyers, Majesticks, RangeGoats, Iron Heads, Stinger, Southern Guards, OKGC, Korean Golf Club), or league business (funding, signings, defections, schedule).
- IMPORTANT: tag LIV even when the headline never contains the word "LIV" — e.g. a result/recap of a LIV event, or LIV players competing at a LIV tournament.
- Do NOT tag something LIV just because a LIV-affiliated player appears at a major championship or a non-LIV event. A U.S. Open or PGA Tour story is not a LIV story.

For everything else pick the single best fit from the remaining categories.

Respond with ONLY a JSON array, no prose and no markdown fences. Each element must be:
{"id":"<the id you were given>","category":"<one category from the list>"}`;

async function classifyBatchWithClaude(batch) {
  const userPayload = batch.map((a) => ({
    id: a.id,
    title: a.title || "",
    description: (a.description || "").slice(0, 200),
  }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 1500,
      // System prompt is marked for prompt caching: it's identical on every
      // call, so Anthropic caches the prefix and we only pay full price for
      // the (small) per-batch article list. Big saving across refreshes.
      system: [{ type: "text", text: LLM_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: JSON.stringify(userPayload) }],
    }),
  });

  if (!res.ok) throw new Error("Anthropic API HTTP " + res.status);
  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  // Be tolerant of stray text around the JSON array.
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array in LLM reply");
  return JSON.parse(text.slice(start, end + 1)); // [{id, category}]
}

/**
 * Enrich `articles` in place. Returns diagnostics so GET can surface them.
 * Safe to call unconditionally — it no-ops (and reports disabled) when no
 * API key is configured.
 */
async function enrichWithClaude(articles) {
  const diag = { enabled: false, eligible: 0, fromCache: 0, classified: 0, overridden: 0, errors: 0 };
  if (!process.env.ANTHROPIC_API_KEY) return diag;
  diag.enabled = true;

  // Only spend tokens on current material; evergreen filler keeps keywords.
  const recent = articles.filter((a) => a.freshness === "fresh" || a.freshness === "recent");
  diag.eligible = recent.length;

  // 1) Serve from cache where we can; collect the rest to classify.
  const toClassify = [];
  for (const a of recent) {
    const id = llmKey(a);
    if (llmCache.has(id)) {
      diag.fromCache++;
      applyCategory(a, llmCache.get(id), diag);
    } else {
      toClassify.push({ ref: a, id, title: a.title, description: a.description });
    }
  }

  // 2) Cap per-refresh volume, then batch the remainder.
  const capped = toClassify.slice(0, LLM_MAX_ARTICLES);
  const batches = [];
  for (let i = 0; i < capped.length; i += LLM_BATCH_SIZE) {
    batches.push(capped.slice(i, i + LLM_BATCH_SIZE));
  }

  // 3) Run batches in parallel; a failed batch just leaves keyword labels.
  await Promise.all(
    batches.map(async (batch) => {
      try {
        const results = await classifyBatchWithClaude(batch);
        const byId = new Map(results.map((r) => [String(r.id), r.category]));
        for (const item of batch) {
          const cat = byId.get(String(item.id));
          if (cat && VALID_CATEGORIES.has(cat)) {
            llmCache.set(item.id, cat);
            diag.classified++;
            applyCategory(item.ref, cat, diag);
          }
        }
      } catch (err) {
        diag.errors++;
        // swallow — keyword categories already stand for this batch
      }
    })
  );

  return diag;
}

function applyCategory(article, cat, diag) {
  if (!VALID_CATEGORIES.has(cat)) return;
  if (article.feedCategory !== cat) diag.overridden++;
  article.feedCategory = cat;
  article.classifiedBy = "llm";
}

export async function GET(request) {
  const url = new URL(request.url);
  const verbose = url.searchParams.get("verbose") === "true";

  let undatedCount = 0;

  const results = await Promise.allSettled(
    GOLF_FEEDS.map(async (feed) => {
      try {
        const parsed = await fetchFeed(feed.url);
        return (parsed.items || []).slice(0, 20).map((item, feedIndex) => {
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
            // "exact" = parsed from the feed; "position" = inferred from the
            // item's slot in a reverse-chronological feed. The ranker should
            // trust "exact" freshness over "position" freshness when sorting.
            dateConfidence: isoDate !== null ? "exact" : "position",
            feedName: feed.name,
            tier: feed.tier || "community",
            image: image,
          };

          // The article decides its own category from its own text.
          article.feedCategory = categorizeArticle(article, feed.category);
          // Freshness tag — drives "keep current" in the UI and ranker.
          // Undated articles fall back to feed position instead of vanishing.
          article.freshness = freshnessOf(isoDate, feedIndex);
          // Stable story identity (subject+event) — lets the UI hide an
          // article whose STORY was already published, even from another
          // source. null when the story can't be identified from the title.
          article.storyKey = storyKeyOf(article.title);

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

  // Newest-first. Articles with a real date sort by it. Articles with no
  // parseable date but tagged "recent" by feed position (e.g. Sky Sports)
  // get a synthetic timestamp ~72h old — below genuinely fresh dated news,
  // but well above evergreen filler, so current-but-undated stories stay
  // visible instead of sinking to the bottom of the list.
  const SYNTH_RECENT = Date.now() - 72 * 3600000;
  articles.sort((a, b) => {
    const score = (x) => {
      if (x.pubDate) return new Date(x.pubDate).getTime();
      if (x.freshness === "recent") return SYNTH_RECENT;
      return -Infinity; // undated + not position-recent: genuine filler
    };
    return score(b) - score(a);
  });

  // --- LLM enrichment ("the Haiku brain") ----------------------------------
  // Re-label recent articles by meaning (catches LIV stories the keyword
  // categorizer misses). Runs BEFORE ranking because category feeds into the
  // auto-pick. No-ops safely if ANTHROPIC_API_KEY isn't set.
  const llmDiag = await enrichWithClaude(articles);

  // --- Auto-ranking pass ---------------------------------------------------
  // Score every article and pre-select the top 10 (hard freshness gate +
  // per-category diversity cap). Each article gains a `rank` field; the
  // chosen lineup is returned separately as `autoLineup`.
  const ranking = rankArticles(articles, 10, 3);

  const payload = {
    articles,
    autoLineup: ranking.picks,
    errors,
    total: articles.length,
    sources: GOLF_FEEDS.length,
    llm: llmDiag,
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
      // freshness is always one of fresh/recent/evergreen now — undated
      // articles get a position-based tag, never "unknown".
      byCategory[c][a.freshness]++;
    });

    payload.diagnostics = {
      workingFeeds: GOLF_FEEDS.length - errors.length,
      brokenFeeds: errors.length,
      undatedArticles: undatedCount,
      // Of the undated ones, how many we kept visible via feed-position
      // freshness (tagged "recent") vs. let settle to "evergreen".
      datedByPosition: articles.filter((a) => a.dateConfidence === "position").length,
      proArticles: articles.filter((a) => a.tier === "pro").length,
      communityArticles: articles.filter((a) => a.tier === "community").length,
      freshArticles: articles.filter((a) => a.freshness === "fresh").length,
      // Auto-ranker: how many articles cleared the freshness gate and were
      // eligible for the lineup, and what the cut-off score ended up being.
      ranker: {
        eligibleArticles: ranking.eligibleCount,
        autoPicked: ranking.picks.length,
        duplicatesCollapsed: ranking.duplicateCount,
        lineupScoreRange: ranking.picks.length
          ? {
              top: ranking.picks[0].score,
              cutoff: ranking.picks[ranking.picks.length - 1].score,
            }
          : null,
        positionDatedInLineup: ranking.picks.filter((p) => p.freshness === "recent").length,
      },
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
