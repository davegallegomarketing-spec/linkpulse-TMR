"use client";
import { useState, useEffect, useCallback } from "react";

var CATEGORY_COLORS = {
  "Tour News": { bg: "#064e1f", text: "#4ade80", icon: "\uD83C\uDFCC\uFE0F" },
  Equipment: { bg: "#4a2508", text: "#fbbf24", icon: "\uD83C\uDFCC\uFE0F\u200D\u2642\uFE0F" },
  Reviews: { bg: "#4a0833", text: "#f472b6", icon: "\u2B50" },
  Industry: { bg: "#082f4a", text: "#38bdf8", icon: "\uD83D\uDCBC" },
  LPGA: { bg: "#35084a", text: "#c084fc", icon: "\uD83C\uDFCC\uFE0F\u200D\u2640\uFE0F" },
  Community: { bg: "#1e4a08", text: "#a3e635", icon: "\uD83D\uDCAC" },
  Lifestyle: { bg: "#4a1f08", text: "#fb923c", icon: "\u2600\uFE0F" },
  "Mental Game": { bg: "#084a4a", text: "#2dd4bf", icon: "\uD83E\uDDE0" },
  Instruction: { bg: "#08204a", text: "#60a5fa", icon: "\uD83C\uDFAF" },
  "Senior Golf": { bg: "#4a4a08", text: "#facc15", icon: "\uD83C\uDFC6" },
  "European Tour": { bg: "#20084a", text: "#a78bfa", icon: "\uD83C\uDDEA\uD83C\uDDFA" },
  Travel: { bg: "#4a0820", text: "#fb7185", icon: "\u2708\uFE0F" },
  Fashion: { bg: "#334a08", text: "#bef264", icon: "\uD83D\uDC54" },
  Magazine: { bg: "#083a3a", text: "#5eead4", icon: "\uD83D\uDCF0" },
  Betting: { bg: "#4a3308", text: "#fdba74", icon: "\uD83C\uDFB0" },
};

function formatDate(d) {
  if (!d) return "";
  var dt = new Date(d), now = new Date(), diff = now - dt;
  if (diff < 0) return "Just now";
  if (diff < 3600000) return Math.max(1, Math.floor(diff / 60000)) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  if (diff < 604800000) return Math.floor(diff / 86400000) + "d ago";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function truncate(s, n) {
  if (!s) return "";
  var c = s.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
  return c.length > n ? c.slice(0, n) + "\u2026" : c;
}

function detectTrending(articles) {
  if (!articles || articles.length === 0) return {};
  var breakingWords = { "wins": 2, "won": 2, "victory": 2, "champion": 2, "breaks record": 4, "new record": 4, "injury": 3, "withdraws": 4, "withdrawn": 4, "suspended": 4, "banned": 4, "disqualified": 4, "fired": 4, "retires": 4, "retirement": 4, "ace": 2, "hole-in-one": 3, "albatross": 4, "playoff": 2, "controversial": 2 };
  var majorSources = { "Golf.com": 1, "BBC Golf": 2, "Golf Digest": 1, "PGA Tour": 2, "GolfWRX": 1 };
  var topicMap = {};
  articles.forEach(function (a) {
    var m, re = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
    while ((m = re.exec(a.title)) !== null) {
      var name = m[1]; if (name.length < 6) continue;
      var k = name.toLowerCase();
      if (!topicMap[k]) topicMap[k] = { name: name, sources: new Set(), count: 0 };
      topicMap[k].sources.add(a.feedName); topicMap[k].count++;
    }
  });
  var trendingTopics = {};
  Object.keys(topicMap).forEach(function (t) { if (topicMap[t].sources.size >= 3) trendingTopics[t] = topicMap[t]; });
  var scores = {};
  articles.forEach(function (a) {
    var score = 0, reasons = [], tl = a.title.toLowerCase();
    var ageH = (Date.now() - new Date(a.pubDate).getTime()) / 3600000;
    if (ageH > 72) return;
    Object.keys(breakingWords).forEach(function (w) { if (tl.indexOf(w.toLowerCase()) !== -1) score += breakingWords[w]; });
    Object.keys(trendingTopics).forEach(function (t) { if (tl.indexOf(t) !== -1) { score += trendingTopics[t].sources.size * 2; reasons.push(trendingTopics[t].sources.size + " sources on " + trendingTopics[t].name); } });
    if (majorSources[a.feedName]) score += majorSources[a.feedName];
    if (ageH < 2) score *= 1.8; else if (ageH < 6) score *= 1.3; else if (ageH < 24) score *= 0.7; else score *= 0.4;
    score = Math.round(score * 10) / 10;
    if (score >= 4) scores[a.link] = { score: score, reason: reasons.length > 0 ? reasons[0] : "" };
  });
  return scores;
}

function CopyButton({ url }) {
  var _s = useState(false), cp = _s[0], setCp = _s[1];
  return (
    <button onClick={function (e) { e.stopPropagation(); navigator.clipboard.writeText(url).then(function () { setCp(true); setTimeout(function () { setCp(false); }, 1500); }); }}
      style={{ background: cp ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)", border: cp ? "1px solid rgba(74,222,128,0.3)" : "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "2px 5px", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
      <span style={{ fontSize: 9, color: cp ? "#4ade80" : "#6b7280", fontWeight: 600 }}>{cp ? "\u2713 Copied" : "Copy"}</span>
    </button>
  );
}

function ArticleCard({ article, selected, onToggle, isSent, trendScore, orderNum }) {
  var cc = CATEGORY_COLORS[article.feedCategory] || { bg: "#1f2937", text: "#9ca3af", icon: "" };
  var domain = "", urlPath = "";
  try { var u = new URL(article.link); domain = u.hostname.replace("www.", ""); urlPath = u.pathname.length > 1 ? u.pathname.slice(0, 50) : ""; } catch (e) {}
  var ageH = (Date.now() - new Date(article.pubDate).getTime()) / 3600000;
  var isSiren = trendScore && trendScore.score >= 20;
  var labels = [];
  if (isSiren) labels.push({ text: "\uD83D\uDEA8 SIREN", bg: "#dc2626", color: "#fff", siren: true });
  else if (trendScore && trendScore.score >= 12) labels.push({ text: "BREAKING", bg: "#dc2626", color: "#fff" });
  else if (trendScore && trendScore.score >= 7) labels.push({ text: "TRENDING", bg: "#7c3aed", color: "#fff" });
  else if (trendScore && trendScore.score >= 4) labels.push({ text: "BUZZ", bg: "#0369a1", color: "#fff" });
  if (ageH < 3) labels.push({ text: "NEW", bg: "#dc2626", color: "#fff" });
  else if (ageH < 8) labels.push({ text: "HOT", bg: "#ea580c", color: "#fff" });
  else if (ageH < 24) labels.push({ text: "TODAY", bg: "#0c2e3d", color: "#38bdf8" });
  var hasImg = article.image && article.image.length > 10 && article.image.startsWith("http");

  return (
    <div onClick={onToggle} style={{
      display: "flex", gap: 12, padding: "14px 16px",
      background: selected ? "rgba(21,128,61,0.12)" : isSiren ? "rgba(220,38,38,0.06)" : isSent ? "rgba(251,146,60,0.03)" : "rgba(255,255,255,0.02)",
      borderRadius: 10, cursor: "pointer",
      border: selected ? "1px solid rgba(74,222,128,0.4)" : isSiren ? "2px solid #dc2626" : isSent ? "1px solid rgba(251,146,60,0.15)" : "1px solid rgba(255,255,255,0.06)",
      opacity: isSent && !selected ? 0.5 : 1, boxShadow: selected ? "0 0 16px rgba(21,128,61,0.15)" : "none",
      transition: "all 0.15s", alignItems: "flex-start",
      animation: isSiren ? "sirenPulse 1.4s ease-in-out infinite" : "none",
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 2,
        border: selected ? "2px solid #4ade80" : "2px solid #4b5563",
        background: selected ? "linear-gradient(135deg, #15803d, #22c55e)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: selected ? "0 0 8px rgba(74,222,128,0.3)" : "none",
      }}>
        {selected && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
              {orderNum && <span style={{ background: "#15803d", color: "#fff", width: 20, height: 20, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{orderNum}</span>}
              <span style={{ background: cc.bg, color: cc.text, padding: "2px 9px", borderRadius: 5, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", border: "1px solid " + cc.text + "33", display: "flex", alignItems: "center", gap: 3 }}>
                {cc.icon && <span style={{ fontSize: 10 }}>{cc.icon}</span>}{article.feedName}
              </span>
              <span style={{ color: "#6b7280", fontSize: 11 }}>{formatDate(article.pubDate)}</span>
              {!isSent && labels.map(function (lb, li) {
                return <span key={li} style={{ background: lb.bg, color: lb.color, padding: "1px 7px", borderRadius: 3, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", animation: lb.siren ? "sirenBadge 0.9s ease-in-out infinite" : "none" }}>{lb.text}</span>;
              })}
              {isSent && <span style={{ background: "rgba(251,146,60,0.15)", color: "#fb923c", padding: "1px 7px", borderRadius: 3, fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>Published</span>}
            </div>
            <div style={{ color: selected ? "#fff" : "#f0f0f0", fontSize: 15, fontWeight: 700, lineHeight: 1.4, marginBottom: 5 }}>{article.title}</div>
            <div style={{ color: selected ? "#a7f3d0" : "#8b8b8b", fontSize: 12, lineHeight: 1.5, marginBottom: 6 }}>{truncate(article.description, 130)}</div>
          </div>
          {hasImg && (
            <a href={article.image} target="_blank" rel="noopener noreferrer" onClick={function (e) { e.stopPropagation(); }}
              title="View source image" style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, textDecoration: "none" }}>
              {"\uD83D\uDDBC\uFE0F"}
            </a>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="#4ade80"><path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9.874a2 2 0 0 1-1.874 2H5a2 2 0 1 1 0-4h1.354zM9.646 10.5H12a3 3 0 1 0 0-6H9a3 3 0 0 0-2.83 4h1.016A2 2 0 0 1 9 6.5h3a2 2 0 1 1 0 4h-1.354z"/></svg>
          <a href={article.link} target="_blank" rel="noopener noreferrer" onClick={function (e) { e.stopPropagation(); }}
            style={{ color: "#4ade80", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 370, textDecoration: "none" }}>
            {domain}{urlPath}
          </a>
          <CopyButton url={article.link} />
        </div>
      </div>
    </div>
  );
}

function SelectionPanel({ selectedList, articles, onReorder, onRemove, onClear }) {
  var _drag = useState(null), dragIdx = _drag[0], setDragIdx = _drag[1];
  var _over = useState(null), overIdx = _over[0], setOverIdx = _over[1];

  function handleDrop(dropIdx) {
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); setOverIdx(null); return; }
    var newOrder = selectedList.slice();
    var item = newOrder.splice(dragIdx, 1)[0];
    newOrder.splice(dropIdx, 0, item);
    onReorder(newOrder);
    setDragIdx(null); setOverIdx(null);
  }

  if (selectedList.length === 0) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center", color: "#4b5563" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>{"\uD83D\uDCCB"}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Your lineup</div>
        <div style={{ fontSize: 11 }}>Select articles from the left to build your newsletter</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>{selectedList.length} {selectedList.length === 1 ? "story" : "stories"}</span>
        <button onClick={onClear} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 11, cursor: "pointer" }}>Clear all</button>
      </div>
      <div style={{ padding: "8px 0" }}>
        {selectedList.map(function (article, i) {
          var isOver = overIdx === i;
          return (
            <div key={article.link}
              draggable onDragStart={function () { setDragIdx(i); }} onDragOver={function (e) { e.preventDefault(); setOverIdx(i); }} onDragLeave={function () { setOverIdx(null); }} onDrop={function () { handleDrop(i); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", cursor: "grab",
                borderTop: isOver ? "2px solid #4ade80" : "2px solid transparent",
                background: dragIdx === i ? "rgba(21,128,61,0.1)" : "transparent",
                transition: "all 0.1s",
              }}>
              <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 700, width: 20, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
              <div style={{ fontSize: 6, color: "#4b5563", flexShrink: 0, lineHeight: 1, userSelect: "none" }}>{"\u2630"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#e5e7eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{article.title}</div>
                <div style={{ fontSize: 10, color: "#6b7280" }}>{article.feedName}</div>
              </div>
              <button onClick={function (e) { e.stopPropagation(); onRemove(article); }}
                style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", fontSize: 14, padding: "0 4px", flexShrink: 0 }}>{"\u00D7"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// CostCalculator component removed (Costs tab deleted)


export default function Home() {
  var _art = useState([]), articles = _art[0], setArticles = _art[1];
  var _ord = useState([]), orderedSelection = _ord[0], setOrderedSelection = _ord[1];
  var _load = useState(true), loading = _load[0], setLoading = _load[1];
  var _err = useState(null), error = _err[0], setError = _err[1];
  var _fcat = useState("All"), filterCategory = _fcat[0], setFilterCategory = _fcat[1];
  var _ftime = useState("all"), filterTime = _ftime[0], setFilterTime = _ftime[1];
  var _imgOnly = useState(false), imagesOnly = _imgOnly[0], setImagesOnly = _imgOnly[1];
  var _meta = useState(null), fetchMeta = _meta[0], setFetchMeta = _meta[1];
  var _pub = useState(false), publishing = _pub[0], setPublishing = _pub[1];
  var _pubResult = useState(null), pubResult = _pubResult[0], setPubResult = _pubResult[1];

  var loadFeeds = useCallback(async function () {
    setLoading(true); setError(null);
    try {
      var res = await fetch("/api/feeds?t=" + Date.now());
      if (!res.ok) throw new Error("HTTP " + res.status);
      var data = await res.json();
      setArticles(data.articles || []);
      setFetchMeta({ total: data.total, sources: data.sources, errors: data.errors || [], fetchedAt: data.fetchedAt });
    } catch (err) { setError(err.message); }
    setLoading(false);
  }, []);

  useEffect(function () { loadFeeds(); }, [loadFeeds]);
  useEffect(function () { var iv = setInterval(function () { loadFeeds(); }, 15 * 60 * 1000); return function () { clearInterval(iv); }; }, [loadFeeds]);

  var categories = ["All", ...Array.from(new Set(articles.map(function (a) { return a.feedCategory; })))];
  var trendScores = detectTrending(articles);

  var filteredArticles = filterCategory === "All" ? articles : articles.filter(function (a) { return a.feedCategory === filterCategory; });
  if (filterTime !== "all" && filterTime !== "trending" && filterTime !== "breaking" && filterTime !== "siren") {
    var now = Date.now();
    filteredArticles = filteredArticles.filter(function (a) {
      var age = now - new Date(a.pubDate).getTime();
      if (filterTime === "3h") return age < 3 * 3600000;
      if (filterTime === "8h") return age >= 3 * 3600000 && age < 8 * 3600000;
      if (filterTime === "24h") return age < 24 * 3600000;
      if (filterTime === "48h") return age < 48 * 3600000;
      return true;
    });
  }
  if (filterTime === "trending") { filteredArticles = filteredArticles.filter(function (a) { var ts = trendScores[a.link]; return ts && ts.score >= 4; }).sort(function (a, b) { return ((trendScores[b.link] || {}).score || 0) - ((trendScores[a.link] || {}).score || 0); }); }
  if (filterTime === "breaking") { filteredArticles = filteredArticles.filter(function (a) { var ts = trendScores[a.link]; return ts && ts.score >= 12; }); }
  if (filterTime === "siren") { filteredArticles = filteredArticles.filter(function (a) { var ts = trendScores[a.link]; return ts && ts.score >= 20; }).sort(function (a, b) { return ((trendScores[b.link] || {}).score || 0) - ((trendScores[a.link] || {}).score || 0); }); }
  if (imagesOnly) { filteredArticles = filteredArticles.filter(function (a) { return a.image && a.image.length > 10 && a.image.startsWith("http"); }); }

  var countBase = filterCategory === "All" ? articles : articles.filter(function (a) { return a.feedCategory === filterCategory; });
  var countNew = countBase.filter(function (a) { return (Date.now() - new Date(a.pubDate).getTime()) < 3 * 3600000; }).length;
  var countHot = countBase.filter(function (a) { var age = Date.now() - new Date(a.pubDate).getTime(); return age >= 3 * 3600000 && age < 8 * 3600000; }).length;
  var countToday = countBase.filter(function (a) { return (Date.now() - new Date(a.pubDate).getTime()) < 24 * 3600000; }).length;
  var countTrending = countBase.filter(function (a) { var ts = trendScores[a.link]; return ts && ts.score >= 4; }).length;
  var countBreaking = countBase.filter(function (a) { var ts = trendScores[a.link]; return ts && ts.score >= 12; }).length;
  var countSiren = countBase.filter(function (a) { var ts = trendScores[a.link]; return ts && ts.score >= 20; }).length;
  var countImg = countBase.filter(function (a) { return a.image && a.image.length > 10 && a.image.startsWith("http"); }).length;

  function toggleArticle(article) {
    var exists = orderedSelection.find(function (a) { return a.link === article.link; });
    if (exists) { setOrderedSelection(orderedSelection.filter(function (a) { return a.link !== article.link; })); }
    else { setOrderedSelection(orderedSelection.concat([article])); }
  }
  function isSelected(article) { return !!orderedSelection.find(function (a) { return a.link === article.link; }); }
  function removeFromSelection(article) { setOrderedSelection(orderedSelection.filter(function (a) { return a.link !== article.link; })); }
  function selectTop(n) { var sel = filteredArticles.slice(0, n); setOrderedSelection(sel); }

  // === PUBLISH WORKFLOW ===
  function buildNewsletterTitle() {
    return "Golf Daily \u2014 " + new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function generateNewsletterHTML(title, list) {
    var h = '<h2 style="font-family:Georgia,serif;color:#1a1a1a;border-bottom:2px solid #15803d;padding-bottom:8px;">' + title + "</h2>\n";
    var b = list.map(function (a, i) {
      var img = "";
      if (a.image && a.image.length > 10 && a.image.startsWith("http")) {
        img = '<a href="' + a.link + '" style="display:block;margin:0 0 10px;"><img src="' + a.image + '" alt="" style="width:100%;max-width:600px;height:auto;border-radius:8px;display:block;" /></a>\n<p style="margin:0 0 8px;color:#bbb;font-size:10px;font-style:italic;">Photo: ' + a.feedName + "</p>\n";
      }
      return '<div style="margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #e5e5e5;">\n<h3 style="margin:0 0 6px;font-family:Georgia,serif;"><a href="' + a.link + '" style="color:#15803d;text-decoration:none;">' + (i + 1) + ". " + a.title + "</a></h3>\n" + img + '<p style="margin:0 0 8px;color:#666;font-size:14px;">' + truncate(a.description, 160) + '</p>\n<a href="' + a.link + '" style="color:#15803d;font-size:13px;text-decoration:none;font-weight:bold;">Read full article \u2192</a>\n<span style="color:#999;font-size:12px;margin-left:12px;">' + a.feedName + " \u00B7 " + formatDate(a.pubDate) + "</span>\n</div>";
    }).join("\n");
    return h + b;
  }

  function generatePlainText(title, list) {
    var l = [title, "=".repeat(title.length), ""];
    list.forEach(function (a, i) {
      l.push((i + 1) + ". " + a.title);
      l.push("   " + truncate(a.description, 130));
      l.push("   " + a.link);
      l.push("   \u2014 " + a.feedName + " \u00B7 " + formatDate(a.pubDate));
      l.push("");
    });
    l.push("---"); l.push("Curated with LinkPulse Golf");
    return l.join("\n");
  }

  async function handlePublish() {
    if (orderedSelection.length === 0 || publishing) return;
    setPublishing(true);
    setPubResult(null);
    var results = { clipboard: false, website: false, error: null };
    try {
      var title = buildNewsletterTitle();
      var html = generateNewsletterHTML(title, orderedSelection);
      var plain = generatePlainText(title, orderedSelection);
      // 1. Copy newsletter HTML to clipboard (rich + plain fallback)
      try {
        var b1 = new Blob([html], { type: "text/html" });
        var b2 = new Blob([plain], { type: "text/plain" });
        try { await navigator.clipboard.write([new ClipboardItem({ "text/html": b1, "text/plain": b2 })]); }
        catch (e) { await navigator.clipboard.writeText(html); }
        results.clipboard = true;
      } catch (e) { results.clipboard = false; }
      // 2. Publish to Mulligan Report site
      try {
        var res = await fetch("/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articles: orderedSelection, edition: "daily", title: title }),
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        results.website = true;
      } catch (e) { results.error = "Site publish failed: " + e.message; }
      setPubResult(results);
    } catch (err) {
      results.error = err.message;
      setPubResult(results);
    }
    setPublishing(false);
  }


  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#0a0f0a", color: "#e5e7eb", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{"\n@keyframes spin { to { transform: rotate(360deg); } }\n@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }\n@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }\n@keyframes sirenPulse { 0%,100% { border-color:#dc2626; box-shadow:0 0 0 0 rgba(220,38,38,0.55); } 50% { border-color:#f87171; box-shadow:0 0 0 6px rgba(220,38,38,0); } }\n@keyframes sirenBadge { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.55; transform:scale(1.06); } }\nbutton { transition: all 0.15s; } button:hover { opacity:0.9; }\n"}</style>

      {/* HEADER */}
      <div style={{ padding: "24px 24px 0", borderBottom: "1px solid rgba(21,128,61,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #15803d, #166534)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{"\u26F3"}</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: "-0.5px" }}>LinkPulse <span style={{ color: "#4ade80" }}>Golf</span></h1>
              <div style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>
                {loading ? "Fetching\u2026" : fetchMeta ? fetchMeta.total + " articles from " + fetchMeta.sources + " sources" + (fetchMeta.errors.length ? " \u00B7 " + fetchMeta.errors.length + " unavailable" : "") : ""}
              </div>
            </div>
          </div>
          <button onClick={loadFeeds} disabled={loading} style={{ padding: "8px 16px", background: loading ? "#374151" : "rgba(21,128,61,0.15)", color: loading ? "#6b7280" : "#4ade80", border: "1px solid rgba(21,128,61,0.25)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {loading && <div style={{ width: 14, height: 14, border: "2px solid #4ade80", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
            {loading ? "Fetching\u2026" : "\u21BB Refresh"}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ display: "flex", gap: 0 }}>
        {/* LEFT: Content */}
        <div style={{ flex: 1, padding: 22, minWidth: 0 }}>
          {loading && (
            <div style={{ padding: "50px 0", textAlign: "center" }}>
              <div style={{ width: 44, height: 44, border: "3px solid #15803d", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 18px" }} />
              <div style={{ color: "#4ade80", fontSize: 15, fontWeight: 600 }}>Pulling live golf feeds...</div>
            </div>
          )}

          {error && !loading && (
            <div style={{ padding: 18, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, marginBottom: 18 }}>
              <div style={{ color: "#f87171", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Feed fetch failed</div>
              <div style={{ color: "#9ca3af", fontSize: 12 }}>{error}</div>
              <button onClick={loadFeeds} style={{ marginTop: 10, padding: "7px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Retry</button>
            </div>
          )}

          {/* CURATE */}
          {!loading && (
            <div>
              {articles.length > 0 && (
                <div>
                  {/* Time filters */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                    {[
                      { id: "all", label: "All", count: countBase.length, bg: "#15803d", c: "#fff", dimBg: "rgba(21,128,61,0.12)", dimC: "#86efac" },
                      { id: "siren", label: "\uD83D\uDEA8 Siren", count: countSiren, bg: "#dc2626", c: "#fff", dimBg: "rgba(220,38,38,0.12)", dimC: "#fca5a5" },
                      { id: "breaking", label: "\u26A1 Breaking", count: countBreaking, bg: "#dc2626", c: "#fff", dimBg: "rgba(220,38,38,0.12)", dimC: "#fca5a5" },
                      { id: "trending", label: "\u2191 Trending", count: countTrending, bg: "#7c3aed", c: "#fff", dimBg: "rgba(124,58,237,0.15)", dimC: "#c4b5fd" },
                      { id: "3h", label: "NEW", count: countNew, bg: "#dc2626", c: "#fff", dimBg: "rgba(220,38,38,0.12)", dimC: "#fca5a5" },
                      { id: "8h", label: "HOT", count: countHot, bg: "#ea580c", c: "#fff", dimBg: "rgba(234,88,12,0.14)", dimC: "#fdba74" },
                      { id: "24h", label: "Today", count: countToday, bg: "#0c2e3d", c: "#38bdf8", dimBg: "rgba(56,189,248,0.10)", dimC: "#7dd3fc" },
                      { id: "48h", label: "48h", bg: "#374151", c: "#fff", dimBg: "rgba(255,255,255,0.05)", dimC: "#9ca3af" },
                    ].map(function (t) {
                      var act = filterTime === t.id;
                      return <button key={t.id} onClick={function () { setFilterTime(t.id); }} style={{
                        padding: "8px 14px", borderRadius: 7,
                        border: act ? "1px solid " + t.bg : "1px solid " + t.dimC + "33",
                        background: act ? t.bg : t.dimBg,
                        color: act ? t.c : t.dimC,
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        {t.label}{t.count !== undefined && <span style={{ background: act ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.3)", color: act ? "#fff" : t.dimC, padding: "1px 7px", borderRadius: 9, fontSize: 11, fontWeight: 700 }}>{t.count}</span>}
                      </button>;
                    })}
                    <button onClick={function () { setImagesOnly(!imagesOnly); }} style={{
                      padding: "8px 14px", borderRadius: 7,
                      border: imagesOnly ? "1px solid #15803d" : "1px solid rgba(74,222,128,0.25)",
                      background: imagesOnly ? "#15803d" : "rgba(21,128,61,0.10)",
                      color: imagesOnly ? "#fff" : "#86efac",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {"\uD83D\uDDBC\uFE0F"} Images <span style={{ background: imagesOnly ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.3)", color: imagesOnly ? "#fff" : "#86efac", padding: "1px 7px", borderRadius: 9, fontSize: 11, fontWeight: 700 }}>{countImg}</span>
                    </button>
                    <span style={{ marginLeft: "auto", color: "#4b5563", fontSize: 10 }}>{fetchMeta ? "Updated " + formatDate(fetchMeta.fetchedAt) : ""}</span>
                  </div>
                  {/* Separator between time row and topic row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 10px" }}>
                    <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />
                    <span style={{ color: "#4b5563", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>Filter by Topic</span>
                    <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />
                  </div>

                  {/* Category filters */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(function () {
                        // Group categories into 3 themes — each theme shares one color family
                        var GROUPS = {
                          tours: { cats: ["Tour News", "LPGA", "European Tour", "Senior Golf"], bg: "rgba(21,128,61,0.14)", border: "rgba(74,222,128,0.25)", text: "#86efac", activeBg: "#15803d" },
                          lifestyle: { cats: ["Lifestyle", "Travel", "Fashion", "Community"], bg: "rgba(234,88,12,0.12)", border: "rgba(251,146,60,0.25)", text: "#fdba74", activeBg: "#c2410c" },
                          gear: { cats: ["Equipment", "Reviews", "Instruction", "Mental Game", "Industry", "Magazine", "Betting"], bg: "rgba(56,189,248,0.10)", border: "rgba(96,165,250,0.22)", text: "#93c5fd", activeBg: "#1e40af" },
                        };
                        function groupOf(cat) {
                          if (cat === "All") return { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.12)", text: "#d1d5db", activeBg: "#15803d" };
                          var g; Object.keys(GROUPS).forEach(function (k) { if (GROUPS[k].cats.indexOf(cat) !== -1) g = GROUPS[k]; });
                          return g || { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.10)", text: "#9ca3af", activeBg: "#374151" };
                        }
                        // Sort categories so they group visually: All first, then tours, lifestyle, gear
                        var order = ["All"].concat(GROUPS.tours.cats, GROUPS.lifestyle.cats, GROUPS.gear.cats);
                        var sorted = categories.slice().sort(function (a, b) {
                          var ai = order.indexOf(a), bi = order.indexOf(b);
                          if (ai === -1) ai = 999; if (bi === -1) bi = 999;
                          return ai - bi;
                        });
                        return sorted.map(function (cat) {
                          var act = filterCategory === cat;
                          var g = groupOf(cat);
                          var icon = cat === "All" ? "" : ((CATEGORY_COLORS[cat] || {}).icon || "");
                          var count = cat === "All" ? articles.length : articles.filter(function (a) { return a.feedCategory === cat; }).length;
                          return <button key={cat} onClick={function () { setFilterCategory(cat); }} style={{
                            padding: "8px 14px", borderRadius: 7,
                            border: act ? "1px solid " + g.text : "1px solid " + g.border,
                            background: act ? g.activeBg : g.bg,
                            color: act ? "#fff" : g.text,
                            fontSize: 12, fontWeight: 700, cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 6,
                          }}>
                            {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
                            {cat}
                            {cat !== "All" && <span style={{ background: act ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.3)", color: act ? "#fff" : g.text, padding: "1px 7px", borderRadius: 9, fontSize: 11, fontWeight: 700 }}>{count}</span>}
                          </button>;
                        });
                      })()}
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={function () { selectTop(10); }} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(21,128,61,0.3)", background: "transparent", color: "#4ade80", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Top 10</button>
                      <button onClick={function () { selectTop(filteredArticles.length); }} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(21,128,61,0.3)", background: "transparent", color: "#4ade80", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>All</button>
                      <button onClick={function () { setOrderedSelection([]); }} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#6b7280", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Clear</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Article list */}
              {articles.length === 0 && !error ? (
                <div style={{ textAlign: "center", padding: 60, color: "#4b5563" }}>
                  <div style={{ fontSize: 44, marginBottom: 16 }}>{"\u26F3"}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#9ca3af" }}>No articles loaded</div>
                  <div style={{ fontSize: 13 }}>Click Refresh above</div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {filteredArticles.map(function (article) {
                    var sel = isSelected(article);
                    var orderNum = sel ? orderedSelection.findIndex(function (a) { return a.link === article.link; }) + 1 : null;
                    return <ArticleCard key={article.link} article={article} selected={sel} isSent={false} trendScore={trendScores[article.link] || null} orderNum={orderNum} onToggle={function () { toggleArticle(article); }} />;
                  })}
                </div>
              )}

              {fetchMeta && fetchMeta.errors && fetchMeta.errors.length > 0 && (
                <div style={{ marginTop: 16, padding: 14, background: "rgba(251,191,36,0.06)", borderRadius: 8, border: "1px solid rgba(251,191,36,0.15)" }}>
                  <div style={{ color: "#fbbf24", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Some feeds were unavailable</div>
                  <div style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.5 }}>{fetchMeta.errors.map(function (e) { return e.error || e; }).join(", ")}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Selection Panel */}
        {!loading && (
          <div style={{ width: 280, flexShrink: 0, borderLeft: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)", minHeight: "calc(100vh - 120px)", position: "sticky", top: 0, overflowY: "auto", maxHeight: "calc(100vh - 120px)" }}>
            <SelectionPanel
              selectedList={orderedSelection}
              articles={articles}
              onReorder={function (newOrder) { setOrderedSelection(newOrder); }}
              onRemove={function (article) { removeFromSelection(article); }}
              onClear={function () { setOrderedSelection([]); }}
            />
            {orderedSelection.length > 0 && (
              <div style={{ padding: "14px 14px 18px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <button onClick={handlePublish} disabled={publishing} style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10, border: "none",
                  background: publishing ? "#374151" : (pubResult && !pubResult.error && pubResult.website ? "#15803d" : "linear-gradient(135deg, #15803d, #059669)"),
                  color: "#fff", fontWeight: 800, fontSize: 14, cursor: publishing ? "default" : "pointer",
                  boxShadow: publishing ? "none" : "0 4px 14px rgba(21,128,61,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  {publishing && <div style={{ width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
                  {publishing ? "Publishing\u2026" : "\uD83D\uDE80 Publish " + orderedSelection.length + " " + (orderedSelection.length === 1 ? "story" : "stories")}
                </button>
                <div style={{ marginTop: 8, fontSize: 10, color: "#6b7280", textAlign: "center", lineHeight: 1.5 }}>
                  Copies newsletter HTML to clipboard<br/>+ pushes to The Mulligan Report
                </div>
                {pubResult && (
                  <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: pubResult.error ? "rgba(239,68,68,0.1)" : "rgba(74,222,128,0.08)", border: pubResult.error ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(74,222,128,0.25)" }}>
                    {pubResult.error ? (
                      <div style={{ color: "#f87171", fontSize: 11 }}>{"\u274C"} {pubResult.error}</div>
                    ) : (
                      <div>
                        <div style={{ color: "#4ade80", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{"\u2705"} Published</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 10, color: "#9ca3af" }}>
                          {pubResult.clipboard && <span>{"\u2713"} Newsletter copied to clipboard</span>}
                          {pubResult.website && <span>{"\u2713"} Live on The Mulligan Report</span>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                          {pubResult.clipboard && <a href="https://davegallego.substack.com/publish/post" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#4ade80", fontWeight: 600, textDecoration: "none" }}>{"\u2192"} Open Substack to paste</a>}
                          {pubResult.website && <a href="https://mulligan-report-drudge.vercel.app" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#b8860b", fontWeight: 600, textDecoration: "none" }}>{"\u2192"} View on Mulligan Report</a>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
