"use client";
import { useState, useEffect, useCallback } from "react";

const CATEGORY_COLORS = {
  "Tour News": { bg: "#0c3d1a", text: "#4ade80" },
  Equipment: { bg: "#3d2e0c", text: "#fbbf24" },
  Reviews: { bg: "#3d0c2e", text: "#f472b6" },
  Industry: { bg: "#0c2e3d", text: "#38bdf8" },
  LPGA: { bg: "#2e0c3d", text: "#c084fc" },
  Community: { bg: "#1a3d0c", text: "#a3e635" },
  Lifestyle: { bg: "#3d1a0c", text: "#fb923c" },
  "Mental Game": { bg: "#0c3d3d", text: "#2dd4bf" },
  Instruction: { bg: "#0c1a3d", text: "#60a5fa" },
  "Senior Golf": { bg: "#3d3d0c", text: "#facc15" },
  "European Tour": { bg: "#1a0c3d", text: "#a78bfa" },
  Travel: { bg: "#3d0c1a", text: "#fb7185" },
  Fashion: { bg: "#2e3d0c", text: "#bef264" },
  Magazine: { bg: "#0c2e2e", text: "#5eead4" },
  Betting: { bg: "#3d2e1a", text: "#fdba74" },
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  var d = new Date(dateStr);
  var now = new Date();
  var diff = now - d;
  if (diff < 0) return "Just now";
  if (diff < 3600000)
    return Math.max(1, Math.floor(diff / 60000)) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  if (diff < 604800000) return Math.floor(diff / 86400000) + "d ago";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function truncate(str, len) {
  if (!str) return "";
  var clean = str
    .replace(/<[^>]*>/g, "")
    .replace(/&[^;]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > len ? clean.slice(0, len) + "\u2026" : clean;
}

function generateNewsletterHTML(title, articles) {
  var header =
    '<h2 style="font-family:Georgia,serif;color:#1a1a1a;border-bottom:2px solid #15803d;padding-bottom:8px;">' +
    title +
    "</h2>\n";
  var body = articles
    .map(function (a, i) {
      return (
        '<div style="margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #e5e5e5;">\n' +
        '<h3 style="margin:0 0 6px;font-family:Georgia,serif;"><a href="' +
        a.link +
        '" style="color:#15803d;text-decoration:none;">' +
        (i + 1) +
        ". " +
        a.title +
        "</a></h3>\n" +
        '<p style="margin:0 0 8px;color:#666;font-size:14px;">' +
        truncate(a.description, 160) +
        "</p>\n" +
        '<a href="' +
        a.link +
        '" style="color:#15803d;font-size:13px;text-decoration:none;font-weight:bold;">Read full article \u2192</a>\n' +
        '<span style="color:#999;font-size:12px;margin-left:12px;">' +
        a.feedName +
        " \u00B7 " +
        formatDate(a.pubDate) +
        "</span>\n" +
        "</div>"
      );
    })
    .join("\n");
  return header + body;
}

function generatePlainText(title, articles) {
  var lines = [title, "=".repeat(title.length), ""];
  articles.forEach(function (a, i) {
    lines.push((i + 1) + ". " + a.title);
    lines.push("   " + truncate(a.description, 130));
    lines.push("   " + a.link);
    lines.push(
      "   \u2014 " + a.feedName + " \u00B7 " + formatDate(a.pubDate)
    );
    lines.push("");
  });
  lines.push("---");
  lines.push("Curated with LinkPulse Golf");
  return lines.join("\n");
}

function Tab({ active, onClick, children, count }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 18px",
        border: "none",
        borderBottom: active ? "2px solid #15803d" : "2px solid transparent",
        background: "transparent",
        color: active ? "#4ade80" : "#6b7280",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 7,
      }}
    >
      {children}
      {count !== undefined && (
        <span
          style={{
            background: active ? "#15803d" : "#374151",
            color: "#fff",
            borderRadius: 10,
            padding: "1px 7px",
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function CopyButton({ url }) {
  const [copied, setCopied] = useState(false);
  function handleCopy(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(url).then(function () {
      setCopied(true);
      setTimeout(function () { setCopied(false); }, 1500);
    });
  }
  return (
    <button
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy URL"}
      style={{
        background: copied ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)",
        border: copied ? "1px solid rgba(74,222,128,0.3)" : "1px solid rgba(255,255,255,0.1)",
        borderRadius: 4,
        padding: "2px 5px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 3,
        flexShrink: 0,
        transition: "all 0.15s",
      }}
    >
      {copied ? (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="#9ca3af">
          <path d="M4 2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1H2z"/>
        </svg>
      )}
      <span style={{ fontSize: 9, color: copied ? "#4ade80" : "#6b7280", fontWeight: 600 }}>
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

function ArticleCard({ article, selected, onToggle }) {
  var catColor = CATEGORY_COLORS[article.feedCategory] || {
    bg: "#1f2937",
    text: "#9ca3af",
  };
  var domain = "";
  var urlPath = "";
  try {
    var u = new URL(article.link);
    domain = u.hostname.replace("www.", "");
    urlPath = u.pathname.length > 1 ? u.pathname.slice(0, 60) : "";
  } catch (e) {
    domain = "";
  }

  return (
    <div
      onClick={onToggle}
      style={{
        display: "flex",
        gap: 12,
        padding: "14px 16px",
        background: selected
          ? "rgba(21,128,61,0.08)"
          : "rgba(255,255,255,0.015)",
        borderRadius: 10,
        cursor: "pointer",
        border: selected
          ? "1px solid rgba(21,128,61,0.35)"
          : "1px solid rgba(255,255,255,0.05)",
        transition: "all 0.12s",
        alignItems: "flex-start",
        animation: "fadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          flexShrink: 0,
          marginTop: 2,
          border: selected ? "2px solid #15803d" : "2px solid #4b5563",
          background: selected ? "#15803d" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.12s",
        }}
      >
        {selected && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6L5 8.5L9.5 3.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginBottom: 4,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              background: catColor.bg,
              color: catColor.text,
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            {article.feedName}
          </span>
          <span style={{ color: "#6b7280", fontSize: 11 }}>
            {formatDate(article.pubDate)}
          </span>
        </div>
        <div
          style={{
            color: "#e5e7eb",
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.4,
            marginBottom: 4,
          }}
        >
          {article.title}
        </div>
        <div
          style={{
            color: "#6b7280",
            fontSize: 12,
            lineHeight: 1.5,
            marginBottom: 6,
          }}
        >
          {truncate(article.description, 130)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="#4ade80">
            <path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9.874a2 2 0 0 1-1.874 2H5a2 2 0 1 1 0-4h1.354zM9.646 10.5H12a3 3 0 1 0 0-6H9a3 3 0 0 0-2.83 4h1.016A2 2 0 0 1 9 6.5h3a2 2 0 1 1 0 4h-1.354z" />
          </svg>
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={function (e) { e.stopPropagation(); }}
            style={{
              color: "#4ade80",
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              opacity: 0.8,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 370,
              textDecoration: "none",
            }}
          >
            {domain}{urlPath}
          </a>
          <CopyButton url={article.link} />
        </div>
      </div>
    </div>
  );
}

function CostCalculator() {
  const [newsletters, setNewsletters] = useState(10);
  const [links, setLinks] = useState(10);
  const [subscribers, setSubscribers] = useState(500);
  var platformCost =
    subscribers <= 2500 ? 0 : subscribers <= 10000 ? 39 : 99;

  return (
    <div>
      <div
        style={{
          color: "#4ade80",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 20,
        }}
      >
        Cost Breakdown
      </div>
      <div style={{ display: "grid", gap: 22 }}>
        <div>
          <label
            style={{
              color: "#9ca3af",
              fontSize: 12,
              display: "block",
              marginBottom: 6,
            }}
          >
            Newsletters per day
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={newsletters}
            onChange={function (e) {
              setNewsletters(+e.target.value);
            }}
            style={{ width: "100%", accentColor: "#15803d" }}
          />
          <span style={{ color: "#fff", fontSize: 24, fontWeight: 700 }}>
            {newsletters}
          </span>
        </div>
        <div>
          <label
            style={{
              color: "#9ca3af",
              fontSize: 12,
              display: "block",
              marginBottom: 6,
            }}
          >
            Links per newsletter
          </label>
          <input
            type="range"
            min="3"
            max="20"
            value={links}
            onChange={function (e) {
              setLinks(+e.target.value);
            }}
            style={{ width: "100%", accentColor: "#15803d" }}
          />
          <span style={{ color: "#fff", fontSize: 24, fontWeight: 700 }}>
            {links}
          </span>
        </div>
        <div>
          <label
            style={{
              color: "#9ca3af",
              fontSize: 12,
              display: "block",
              marginBottom: 6,
            }}
          >
            Subscribers
          </label>
          <input
            type="range"
            min="100"
            max="50000"
            step="100"
            value={subscribers}
            onChange={function (e) {
              setSubscribers(+e.target.value);
            }}
            style={{ width: "100%", accentColor: "#15803d" }}
          />
          <span style={{ color: "#fff", fontSize: 24, fontWeight: 700 }}>
            {subscribers.toLocaleString()}
          </span>
        </div>
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(21,128,61,0.12), rgba(21,128,61,0.03))",
            borderRadius: 12,
            padding: 22,
            border: "1px solid rgba(21,128,61,0.25)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{ color: "#6b7280", fontSize: 11, marginBottom: 4 }}
              >
                RSS Feeds
              </div>
              <div
                style={{ color: "#4ade80", fontSize: 20, fontWeight: 700 }}
              >
                FREE
              </div>
            </div>
            <div>
              <div
                style={{ color: "#6b7280", fontSize: 11, marginBottom: 4 }}
              >
                Vercel Host
              </div>
              <div
                style={{ color: "#4ade80", fontSize: 20, fontWeight: 700 }}
              >
                FREE
              </div>
            </div>
            <div>
              <div
                style={{ color: "#6b7280", fontSize: 11, marginBottom: 4 }}
              >
                Platform
              </div>
              <div
                style={{
                  color: platformCost === 0 ? "#4ade80" : "#fbbf24",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {platformCost === 0 ? "FREE" : "$" + platformCost + "/mo"}
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid rgba(21,128,61,0.2)",
            }}
          >
            <div style={{ color: "#9ca3af", fontSize: 12 }}>
              Total monthly cost
            </div>
            <div style={{ color: "#fff", fontSize: 32, fontWeight: 800 }}>
              ${platformCost}
              <span
                style={{ fontSize: 14, color: "#6b7280", fontWeight: 400 }}
              >
                /month
              </span>
            </div>
            <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
              {newsletters * 30} newsletters/month &middot; Zero API costs
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState("curate");
  const [articles, setArticles] = useState([]);
  const [selectedArticles, setSelectedArticles] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [previewFormat, setPreviewFormat] = useState("html");
  const [filterCategory, setFilterCategory] = useState("All");
  const [fetchMeta, setFetchMeta] = useState(null);

  var loadFeeds = useCallback(async function () {
    setLoading(true);
    setError(null);
    try {
      var res = await fetch("/api/feeds");
      if (!res.ok) throw new Error("HTTP " + res.status);
      var data = await res.json();
      setArticles(data.articles || []);
      setFetchMeta({
        total: data.total,
        sources: data.sources,
        errors: data.errors || [],
        fetchedAt: data.fetchedAt,
      });
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(
    function () {
      loadFeeds();
    },
    [loadFeeds]
  );

  var categories = [
    "All",
    ...Array.from(new Set(articles.map(function (a) { return a.feedCategory; }))),
  ];
  var filteredArticles =
    filterCategory === "All"
      ? articles
      : articles.filter(function (a) {
          return a.feedCategory === filterCategory;
        });
  var selectedList = articles.filter(function (_, i) {
    return selectedArticles.has(i);
  });

  function toggleArticle(idx) {
    setSelectedArticles(function (prev) {
      var next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }

  function selectTop(n) {
    var indices = new Set();
    filteredArticles.slice(0, n).forEach(function (a) {
      var i = articles.indexOf(a);
      if (i >= 0) indices.add(i);
    });
    setSelectedArticles(indices);
  }

  function copyNewsletter() {
    var title =
      "Golf Daily \u2014 " +
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    var text =
      previewFormat === "html"
        ? generateNewsletterHTML(title, selectedList)
        : generatePlainText(title, selectedList);
    navigator.clipboard.writeText(text).then(function () {
      setCopied(true);
      setTimeout(function () {
        setCopied(false);
      }, 2000);
    });
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", minHeight: "100vh" }}>
      {/* HEADER */}
      <div
        style={{
          padding: "28px 24px 0",
          borderBottom: "1px solid rgba(21,128,61,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #15803d, #166534)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              ⛳
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 26,
                  fontWeight: 800,
                  color: "#fff",
                  fontFamily: "'Playfair Display', Georgia, serif",
                  letterSpacing: "-0.5px",
                }}
              >
                LinkPulse <span style={{ color: "#4ade80" }}>Golf</span>
              </h1>
              <div style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>
                {loading
                  ? "Fetching live feeds\u2026"
                  : fetchMeta
                  ? fetchMeta.total +
                    " articles from " +
                    fetchMeta.sources +
                    " sources" +
                    (fetchMeta.errors.length
                      ? " \u00B7 " + fetchMeta.errors.length + " unavailable"
                      : "")
                  : ""}
              </div>
            </div>
          </div>
          <button
            onClick={loadFeeds}
            disabled={loading}
            style={{
              padding: "8px 16px",
              background: loading ? "#374151" : "rgba(21,128,61,0.15)",
              color: loading ? "#6b7280" : "#4ade80",
              border: "1px solid rgba(21,128,61,0.25)",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {loading && (
              <div
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid #4ade80",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            )}
            {loading ? "Fetching\u2026" : "\u21BB Refresh"}
          </button>
        </div>
        <div
          style={{
            display: "flex",
            gap: 0,
            marginTop: 16,
            overflowX: "auto",
          }}
        >
          <Tab
            active={tab === "curate"}
            onClick={function () {
              setTab("curate");
            }}
            count={loading ? undefined : articles.length}
          >
            Curate
          </Tab>
          <Tab
            active={tab === "preview"}
            onClick={function () {
              setTab("preview");
            }}
            count={selectedList.length}
          >
            Export
          </Tab>
          <Tab
            active={tab === "costs"}
            onClick={function () {
              setTab("costs");
            }}
          >
            Costs
          </Tab>
        </div>
      </div>

      <div style={{ padding: 22 }}>
        {/* LOADING */}
        {loading && (
          <div style={{ padding: "50px 0", textAlign: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                border: "3px solid #15803d",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 18px",
              }}
            />
            <div
              style={{
                color: "#4ade80",
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Pulling live golf feeds...
            </div>
            <div
              style={{
                color: "#6b7280",
                fontSize: 12,
                animation: "pulse 2s infinite",
              }}
            >
              Fetching from 14 RSS sources
            </div>
          </div>
        )}

        {/* ERROR */}
        {error && !loading && (
          <div
            style={{
              padding: 18,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                color: "#f87171",
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Feed fetch failed
            </div>
            <div style={{ color: "#9ca3af", fontSize: 12 }}>{error}</div>
            <button
              onClick={loadFeeds}
              style={{
                marginTop: 10,
                padding: "7px 16px",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* CURATE TAB */}
        {tab === "curate" && !loading && (
          <div>
            {articles.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {categories.map(function (cat) {
                    return (
                      <button
                        key={cat}
                        onClick={function () {
                          setFilterCategory(cat);
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: "none",
                          background:
                            filterCategory === cat
                              ? "#15803d"
                              : "rgba(255,255,255,0.05)",
                          color:
                            filterCategory === cat ? "#fff" : "#6b7280",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {cat}
                        {cat !== "All"
                          ? " (" +
                            articles.filter(function (a) {
                              return a.feedCategory === cat;
                            }).length +
                            ")"
                          : ""}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <button
                    onClick={function () {
                      selectTop(10);
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "1px solid rgba(21,128,61,0.3)",
                      background: "transparent",
                      color: "#4ade80",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Top 10
                  </button>
                  <button
                    onClick={function () {
                      selectTop(filteredArticles.length);
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "1px solid rgba(21,128,61,0.3)",
                      background: "transparent",
                      color: "#4ade80",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    All
                  </button>
                  <button
                    onClick={function () {
                      setSelectedArticles(new Set());
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "transparent",
                      color: "#6b7280",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {articles.length === 0 && !error ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 60,
                  color: "#4b5563",
                }}
              >
                <div style={{ fontSize: 44, marginBottom: 16 }}>⛳</div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#9ca3af",
                    marginBottom: 8,
                  }}
                >
                  No articles loaded
                </div>
                <div style={{ fontSize: 13 }}>
                  Click Refresh above to fetch live golf news
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {filteredArticles.map(function (article) {
                  var idx = articles.indexOf(article);
                  return (
                    <ArticleCard
                      key={idx}
                      article={article}
                      selected={selectedArticles.has(idx)}
                      onToggle={function () {
                        toggleArticle(idx);
                      }}
                    />
                  );
                })}
              </div>
            )}

            {selectedArticles.size > 0 && (
              <div
                style={{
                  position: "sticky",
                  bottom: 16,
                  marginTop: 16,
                  background: "linear-gradient(135deg, #15803d, #166534)",
                  borderRadius: 12,
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 8px 28px rgba(21,128,61,0.35)",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  {selectedArticles.size} links selected
                </span>
                <button
                  onClick={function () {
                    setTab("preview");
                  }}
                  style={{
                    padding: "8px 20px",
                    background: "rgba(0,0,0,0.25)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Export
                </button>
              </div>
            )}

            {fetchMeta && fetchMeta.errors && fetchMeta.errors.length > 0 && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  background: "rgba(251,191,36,0.06)",
                  borderRadius: 8,
                  border: "1px solid rgba(251,191,36,0.15)",
                }}
              >
                <div
                  style={{
                    color: "#fbbf24",
                    fontSize: 11,
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  Some feeds were unavailable
                </div>
                <div
                  style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.5 }}
                >
                  {fetchMeta.errors
                    .map(function (e) {
                      return e.error || e;
                    })
                    .join(", ")}
                </div>
              </div>
            )}
          </div>
        )}

        {/* EXPORT TAB */}
        {tab === "preview" && !loading && (
          <div>
            {selectedList.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 60,
                  color: "#4b5563",
                }}
              >
                <div style={{ fontSize: 30, marginBottom: 12 }}>📭</div>
                No links selected. Go to Curate to pick articles.
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", gap: 6 }}>
                    {["html", "text"].map(function (f) {
                      return (
                        <button
                          key={f}
                          onClick={function () {
                            setPreviewFormat(f);
                          }}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 6,
                            border: "none",
                            background:
                              previewFormat === f
                                ? "#15803d"
                                : "rgba(255,255,255,0.05)",
                            color: previewFormat === f ? "#fff" : "#6b7280",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {f === "html" ? "HTML (Substack)" : "Plain Text"}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={copyNewsletter}
                    style={{
                      padding: "8px 20px",
                      background: copied ? "#4ade80" : "#15803d",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: 13,
                      transition: "all 0.2s",
                    }}
                  >
                    {copied ? "\u2713 Copied!" : "Copy to Clipboard"}
                  </button>
                </div>

                <div
                  style={{
                    background:
                      previewFormat === "html"
                        ? "#fafaf9"
                        : "rgba(255,255,255,0.02)",
                    borderRadius: 12,
                    padding: 24,
                    maxHeight: 500,
                    overflowY: "auto",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {previewFormat === "html" ? (
                    <div>
                      <h2
                        style={{
                          fontFamily: "Georgia, serif",
                          color: "#1a1a1a",
                          borderBottom: "2px solid #15803d",
                          paddingBottom: 10,
                          marginTop: 0,
                          fontSize: 20,
                        }}
                      >
                        Golf Daily &mdash;{" "}
                        {new Date().toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </h2>
                      {selectedList.map(function (a, i) {
                        return (
                          <div
                            key={i}
                            style={{
                              marginBottom: 20,
                              paddingBottom: 20,
                              borderBottom:
                                i < selectedList.length - 1
                                  ? "1px solid #e5e5e5"
                                  : "none",
                            }}
                          >
                            <h3
                              style={{
                                margin: "0 0 6px",
                                fontSize: 15,
                                fontFamily: "Georgia, serif",
                              }}
                            >
                              <a
                                href={a.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "#15803d",
                                  textDecoration: "none",
                                }}
                              >
                                {i + 1}. {a.title}
                              </a>
                            </h3>
                            <p
                              style={{
                                margin: "0 0 8px",
                                color: "#666",
                                fontSize: 13,
                                lineHeight: 1.5,
                              }}
                            >
                              {truncate(a.description, 160)}
                            </p>
                            <a
                              href={a.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "#15803d",
                                fontSize: 12,
                                fontWeight: 600,
                                textDecoration: "none",
                              }}
                            >
                              Read full article &rarr;
                            </a>
                            <span
                              style={{
                                color: "#999",
                                fontSize: 11,
                                marginLeft: 10,
                              }}
                            >
                              {a.feedName}
                            </span>
                            <div
                              style={{
                                color: "#b0b0b0",
                                fontSize: 10,
                                marginTop: 4,
                                fontFamily: "monospace",
                                wordBreak: "break-all",
                              }}
                            >
                              {a.link}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <pre
                      style={{
                        color: "#d1d5db",
                        fontSize: 12,
                        fontFamily: "'JetBrains Mono', monospace",
                        whiteSpace: "pre-wrap",
                        margin: 0,
                        lineHeight: 1.7,
                      }}
                    >
                      {generatePlainText(
                        "Golf Daily \u2014 " +
                          new Date().toLocaleDateString(),
                        selectedList
                      )}
                    </pre>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    background: "rgba(21,128,61,0.06)",
                    borderRadius: 10,
                    border: "1px solid rgba(21,128,61,0.12)",
                  }}
                >
                  <div
                    style={{
                      color: "#4ade80",
                      fontSize: 12,
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    Every link is the real original URL
                  </div>
                  <div
                    style={{
                      color: "#6b7280",
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    Copy &rarr; Paste into Substack &rarr; Publish. All links
                    go directly to the original source.
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* COSTS TAB */}
        {tab === "costs" && !loading && <CostCalculator />}
      </div>
    </div>
  );
}
