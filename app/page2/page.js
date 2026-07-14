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

// The first two slots of the published lineup are the "features". On the TMR
// index they become hero #1 / hero #2 (arts[0] / arts[1]); in the AWeber email
// they become the full-width hero (list[0]) and the first side story (list[1]).
// Each slot is filled only when ACTIVATED; a deactivated slot is empty and the
// site keeps whatever hero is already live there.
var FEATURE_COUNT = 2;

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

// Stable unique identifier for an article. Uses link when it's a real URL;
// falls back to feedName+title+pubDate so articles with missing or
// duplicate links (e.g. some Google News items) don't collide.
function articleId(a) {
  if (!a) return "";
  var link = a.link || "";
  if (link && link !== "#" && link.indexOf("http") === 0) return link;
  return (a.feedName || "") + "::" + (a.title || "") + "::" + (a.pubDate || "");
}

// Is this article "fresh" — current enough to anchor today's edition?
// Prefers route.js's freshness tag (which also handles undated articles
// via feed position). Falls back to a <24h pubDate check for older feed
// payloads that predate the freshness field.
function isFreshArticle(a) {
  if (!a) return false;
  if (a.freshness) return a.freshness === "fresh";
  if (!a.pubDate) return false;
  return (Date.now() - new Date(a.pubDate).getTime()) < 24 * 3600000;
}

// "recent" = fresh OR within ~48h — the wider net for a quiet news day.
function isRecentArticle(a) {
  if (!a) return false;
  if (a.freshness) return a.freshness === "fresh" || a.freshness === "recent";
  if (!a.pubDate) return false;
  return (Date.now() - new Date(a.pubDate).getTime()) < 48 * 3600000;
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
    if (score >= 4) scores[articleId(a)] = { score: score, reason: reasons.length > 0 ? reasons[0] : "" };
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

function ArticleCard({ article, selected, onToggle, isSent, trendScore, orderNum, newestAgeH }) {
  var cc = CATEGORY_COLORS[article.feedCategory] || { bg: "#1f2937", text: "#9ca3af", icon: "" };
  var domain = "", urlPath = "";
  try { var u = new URL(article.link); domain = u.hostname.replace("www.", ""); urlPath = u.pathname.length > 1 ? u.pathname.slice(0, 50) : ""; } catch (e) {}
  var hasDate = !!article.pubDate;
  var ageH = hasDate ? (Date.now() - new Date(article.pubDate).getTime()) / 3600000 : Infinity;
  var isSiren = trendScore && trendScore.score >= 20;
  var labels = [];
  if (isSiren) labels.push({ text: "\uD83D\uDEA8 SIREN", bg: "#dc2626", color: "#fff", siren: true });
  else if (trendScore && trendScore.score >= 12) labels.push({ text: "BREAKING", bg: "#dc2626", color: "#fff" });
  else if (trendScore && trendScore.score >= 7) labels.push({ text: "TRENDING", bg: "#7c3aed", color: "#fff" });
  else if (trendScore && trendScore.score >= 4) labels.push({ text: "BUZZ", bg: "#0369a1", color: "#fff" });
  // Relative freshness: "NEW"/"HOT" are measured against the freshest
  // article currently in the feed (newestAgeH), not a fixed clock. This
  // keeps the newest-available content flagged even on a quiet news day.
  // "TODAY" stays absolute (genuine <24h). Undated articles get no
  // freshness label — they shouldn't masquerade as current.
  var anchor = typeof newestAgeH === "number" ? newestAgeH : 0;
  if (hasDate) {
    if (ageH <= anchor + 3) labels.push({ text: "NEW", bg: "#dc2626", color: "#fff" });
    else if (ageH <= anchor + 9) labels.push({ text: "HOT", bg: "#ea580c", color: "#fff" });
    else if (ageH < 24) labels.push({ text: "TODAY", bg: "#0c2e3d", color: "#38bdf8" });
  }
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
              <span style={{ color: "#6b7280", fontSize: 11 }}>
                {hasDate ? formatDate(article.pubDate)
                  : (article.dateConfidence === "position"
                      ? "recent \u00B7 no date"
                      : "no date")}
              </span>
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

function SelectionPanel({ heroes, blocks, activeSlots, onToggleActive, onReorderBlocks, onRemove, onClear, onSetHero }) {
  var _drag = useState(null), dragIdx = _drag[0], setDragIdx = _drag[1];
  var _over = useState(null), overIdx = _over[0], setOverIdx = _over[1];

  // ── ADD + (paste a URL into a hero slot) ──
  var _addSlot = useState(null), addSlot = _addSlot[0], setAddSlot = _addSlot[1];   // which slot's box is open
  var _addUrl = useState(""), addUrl = _addUrl[0], setAddUrl = _addUrl[1];
  var _addBusy = useState(false), addBusy = _addBusy[0], setAddBusy = _addBusy[1];
  var _addRes = useState(null), addRes = _addRes[0], setAddRes = _addRes[1];        // fetched + editable {title,image,source,...}
  var _addErr = useState(null), addErr = _addErr[0], setAddErr = _addErr[1];

  function openAdd(i) {
    setAddSlot(i); setAddUrl(""); setAddRes(null); setAddErr(null); setAddBusy(false);
  }
  function closeAdd() {
    setAddSlot(null); setAddUrl(""); setAddRes(null); setAddErr(null); setAddBusy(false);
  }
  function fetchUrl() {
    var u = (addUrl || "").trim();
    if (!u) return;
    setAddBusy(true); setAddErr(null); setAddRes(null);
    fetch("/api/fetch-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: u }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || d.error) { setAddErr((d && d.error) || "Could not read that URL"); return; }
        setAddRes({ title: d.title || "", image: d.image || "", source: d.source || "", description: d.description || "", pubDate: d.pubDate || "", link: d.link || u });
      })
      .catch(function (e) { setAddErr(e.message); })
      .finally(function () { setAddBusy(false); });
  }
  function acceptAdd(i) {
    if (!addRes || !addRes.title) { setAddErr("A headline is required"); return; }
    // Shape it like a feed article so publish/render treat it the same.
    var article = {
      title: addRes.title,
      link: addRes.link,
      image: addRes.image || "",
      feedName: addRes.source || "Added",
      feedCategory: "Featured",
      pubDate: addRes.pubDate || new Date().toISOString(),
      description: addRes.description || "",
    };
    onSetHero(i, article);
    closeAdd();
  }

  var filledHeroes = heroes.filter(Boolean).length;
  var total = filledHeroes + blocks.length;

  // Drag reorder applies to BLOCK stories only (heroes live in fixed slots).
  function handleDrop(dropIdx) {
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); setOverIdx(null); return; }
    var newOrder = blocks.slice();
    var item = newOrder.splice(dragIdx, 1)[0];
    newOrder.splice(dropIdx, 0, item);
    onReorderBlocks(newOrder);
    setDragIdx(null); setOverIdx(null);
  }

  // One hero slot: shows the Activate/Active toggle plus its state
  // (deactivated + empty, active + empty, or active + filled).
  function renderSlot(i) {
    var active = !!activeSlots[i];
    var hero = heroes[i];
    var bg = active ? "rgba(184,134,11,0.10)" : "transparent";
    var toggleBtn = (
      <button
        onClick={function (e) { e.stopPropagation(); onToggleActive(i); }}
        title={active ? "Active \u2014 click to deactivate (clears this slot)" : "Activate slot to add hero #" + (i + 1)}
        style={{
          background: active ? "rgba(74,222,128,0.16)" : "rgba(255,255,255,0.04)",
          border: active ? "1px solid rgba(74,222,128,0.5)" : "1px solid rgba(255,255,255,0.14)",
          color: active ? "#4ade80" : "#9ca3af",
          borderRadius: 6, padding: "3px 9px", fontSize: 10, fontWeight: 700,
          cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
        }}>
        {active ? "\u25CF Active" : "Activate"}
      </button>
    );
    return (
      <div key={"slot" + i}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: bg, opacity: active ? 1 : 0.7 }}>
          <span style={{ color: "#d4a017", fontSize: 12, fontWeight: 700, width: 20, textAlign: "center", flexShrink: 0 }}>{"\u2605"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {(active && hero) ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#f5deb3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hero.title}</div>
                <div style={{ fontSize: 10, color: "#6b7280" }}>{"Hero #" + (i + 1) + " \u00B7 " + hero.feedName}</div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: active ? "#d4a017" : "#6b7280", fontStyle: "italic" }}>
                {active ? ("Open \u2014 click a story or ADD+ to set hero #" + (i + 1)) : ("Hero #" + (i + 1) + " \u2014 deactivated")}
              </div>
            )}
          </div>
          {/* remove (only when the slot is active AND has a hero) */}
          {active && hero && (
            <button onClick={function (e) { e.stopPropagation(); onRemove(hero); }}
              title="Remove this hero (slot stays open)"
              style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 14, padding: "0 2px", flexShrink: 0 }}>{"\u00D7"}</button>
          )}
          {/* ADD + — only when the slot is active */}
          {active && (
            <button onClick={function (e) { e.stopPropagation(); addSlot === i ? closeAdd() : openAdd(i); }}
              title={"Add a hero from any article URL"}
              style={{
                background: addSlot === i ? "rgba(96,165,250,0.2)" : "rgba(96,165,250,0.1)",
                border: "1px solid rgba(96,165,250,0.4)", color: "#60a5fa",
                borderRadius: 6, padding: "3px 9px", fontSize: 10, fontWeight: 700,
                cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
              }}>
              {addSlot === i ? "Close" : "ADD +"}
            </button>
          )}
          {toggleBtn}
        </div>
        {/* URL box for this slot */}
        {active && addSlot === i && (
          <div style={{ padding: "10px 14px 12px", background: "rgba(96,165,250,0.06)", borderTop: "1px solid rgba(96,165,250,0.15)" }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={addUrl}
                onChange={function (e) { setAddUrl(e.target.value); }}
                onKeyDown={function (e) { if (e.key === "Enter") fetchUrl(); }}
                placeholder={"Paste an article URL\u2026"}
                style={{ flex: 1, minWidth: 0, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#e5e7eb", fontSize: 11, padding: "6px 8px" }}
              />
              <button onClick={fetchUrl} disabled={addBusy || !addUrl.trim()}
                style={{ background: addBusy ? "#374151" : "rgba(96,165,250,0.2)", border: "1px solid rgba(96,165,250,0.4)", color: "#60a5fa", borderRadius: 6, padding: "6px 10px", fontSize: 10, fontWeight: 700, cursor: addBusy ? "default" : "pointer", flexShrink: 0 }}>
                {addBusy ? "\u2026" : "Fetch"}
              </button>
            </div>
            {addErr && <div style={{ fontSize: 10, color: "#f87171", marginTop: 6 }}>{addErr}</div>}
            {addRes && (
              <div style={{ marginTop: 8 }}>
                {addRes.image
                  ? <img src={addRes.image} alt="" style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)" }} onError={function (e) { e.target.style.display = "none"; }} />
                  : <div style={{ fontSize: 10, color: "#d4a017", padding: "4px 0" }}>No image found \u2014 paste an image URL below.</div>}
                <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "8px 0 2px" }}>Headline</div>
                <textarea value={addRes.title} onChange={function (e) { setAddRes(Object.assign({}, addRes, { title: e.target.value })); }}
                  rows={2} style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#f5deb3", fontSize: 11, padding: "6px 8px", resize: "vertical", fontFamily: "inherit" }} />
                <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "8px 0 2px" }}>Image URL</div>
                <input value={addRes.image} onChange={function (e) { setAddRes(Object.assign({}, addRes, { image: e.target.value })); }}
                  placeholder={"https://\u2026 (optional)"} style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#e5e7eb", fontSize: 10, padding: "6px 8px" }} />
                <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "8px 0 2px" }}>Source</div>
                <input value={addRes.source} onChange={function (e) { setAddRes(Object.assign({}, addRes, { source: e.target.value })); }}
                  style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#e5e7eb", fontSize: 10, padding: "6px 8px" }} />
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button onClick={function () { acceptAdd(i); }}
                    style={{ flex: 1, background: "linear-gradient(135deg,#15803d,#059669)", border: "none", color: "#fff", borderRadius: 6, padding: "7px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                    {"Accept \u2192 Hero #" + (i + 1)}
                  </button>
                  <button onClick={closeAdd}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#9ca3af", borderRadius: 6, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderBlockRow(article, bi) {
    var isOver = overIdx === bi;
    return (
      <div key={articleId(article)}
        draggable
        onDragStart={function () { setDragIdx(bi); }}
        onDragOver={function (e) { e.preventDefault(); setOverIdx(bi); }}
        onDragLeave={function () { setOverIdx(null); }}
        onDrop={function () { handleDrop(bi); }}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", cursor: "grab",
          borderTop: isOver ? "2px solid #4ade80" : "2px solid transparent",
          background: dragIdx === bi ? "rgba(21,128,61,0.1)" : "transparent", transition: "all 0.1s",
        }}>
        <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 700, width: 20, textAlign: "center", flexShrink: 0 }}>{bi + 1}</span>
        <div style={{ fontSize: 6, color: "#4b5563", flexShrink: 0, lineHeight: 1, userSelect: "none" }}>{"\u2630"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e5e7eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{article.title}</div>
          <div style={{ fontSize: 10, color: "#6b7280" }}>{article.feedName}</div>
        </div>
        <button onClick={function (e) { e.stopPropagation(); onRemove(article); }}
          style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", fontSize: 14, padding: "0 4px", flexShrink: 0 }}>{"\u00D7"}</button>
      </div>
    );
  }

  var anyActive = activeSlots.some(Boolean);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>{total} {total === 1 ? "story" : "stories"}</span>
        <button onClick={onClear} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 11, cursor: "pointer" }}>Clear</button>
      </div>

      {/* ── FEATURES (the two heroes — site + email) ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 6px" }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#d4a017", display: "flex", alignItems: "center", gap: 5 }}>
          {"\u2605"} Features
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: anyActive ? "#4ade80" : "#4b5563" }}>
          {anyActive ? "Pick a story \u2192 hero" : "Activate to add"}
        </span>
      </div>
      <div style={{ padding: "0 0 4px" }}>
        {[0, 1].map(function (i) { return renderSlot(i); })}
      </div>

      {/* ── BLOCK STORIES (#3, 4, 5 …) ── */}
      <div style={{ padding: "10px 14px 6px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280" }}>
          Block stories
        </span>
      </div>
      <div style={{ padding: "0 0 8px" }}>
        {blocks.length === 0 ? (
          <div style={{ padding: "6px 14px 10px", fontSize: 11, color: "#4b5563", fontStyle: "italic" }}>
            No block stories yet {"\u2014"} select more on the left.
          </div>
        ) : blocks.map(function (article, bi) { return renderBlockRow(article, bi); })}
      </div>
    </div>
  );
}

// CostCalculator component removed (Costs tab deleted)


export default function Home() {
  var _art = useState([]), articles = _art[0], setArticles = _art[1];
  var _auto = useState([]), autoLineup = _auto[0], setAutoLineup = _auto[1];
  // ── Activation model ──
  // The two hero slots start DEACTIVATED and EMPTY on load. Picks go into the
  // block stories by default. To put a story in hero #1 or #2 you ACTIVATE
  // that slot first (independently), then your next pick fills it. Deactivating
  // a slot CLEARS it (empty again). Each slot is controlled on its own, so you
  // can open #1, or #2, or both.
  var _heroes = useState([null, null]), heroes = _heroes[0], setHeroes = _heroes[1];
  var _blocks = useState([]), blocks = _blocks[0], setBlocks = _blocks[1];
  var _active = useState([false, false]), activeSlots = _active[0], setActiveSlots = _active[1];
  // Canonical ordered list (heroes first, compacted, then blocks). Everything
  // downstream — the newsletter HTML, the publish payload, the counters — reads
  // from this, exactly as before.
  var orderedSelection = heroes.filter(Boolean).concat(blocks);
  var _load = useState(true), loading = _load[0], setLoading = _load[1];
  var _err = useState(null), error = _err[0], setError = _err[1];
  var _fcat = useState("All"), filterCategory = _fcat[0], setFilterCategory = _fcat[1];
  var _ftime = useState("all"), filterTime = _ftime[0], setFilterTime = _ftime[1];
  var _imgOnly = useState(false), imagesOnly = _imgOnly[0], setImagesOnly = _imgOnly[1];
  var _meta = useState(null), fetchMeta = _meta[0], setFetchMeta = _meta[1];
  var _pub = useState(false), publishing = _pub[0], setPublishing = _pub[1];
  // Cooldown after a successful publish. Storage takes up to ~60s to propagate an
  // overwrite; publishing again inside that window is what made heroes revert.
  // The button simply won't arm until the window has passed.
  var _cd = useState(0), cooldown = _cd[0], setCooldown = _cd[1];
  // Auto-Feed switch: when ON, the scheduler publishes the best 10 block
  // stories every 4 hours (heroes untouched). This just reflects/flips the
  // server-side flag in /api/auto-feed.
  var _af = useState(false), autoFeedOn = _af[0], setAutoFeedOn = _af[1];
  var _afb = useState(false), autoFeedBusy = _afb[0], setAutoFeedBusy = _afb[1];
  var _cOff = useState(false), confirmOff = _cOff[0], setConfirmOff = _cOff[1];
  var _cTxt = useState(""), confirmText = _cTxt[0], setConfirmText = _cTxt[1];
  var _afr = useState(null), autoFeedLastRun = _afr[0], setAutoFeedLastRun = _afr[1];
  var _tot = useState(null), totalPosted = _tot[0], setTotalPosted = _tot[1];
  // The version of the live site this session is building on (its publishedAt).
  // Sent with every publish so the server can refuse to write from a stale read
  // or over someone else's newer publish — this is what stops heroes reverting.
  var _sv = useState(null), siteVersion = _sv[0], setSiteVersion = _sv[1];
  // "On Site Now" panel — shows what's actually live on themulliganreport.com.
  var _liveShow = useState(false), liveShow = _liveShow[0], setLiveShow = _liveShow[1];
  var _liveData = useState(null), liveData = _liveData[0], setLiveData = _liveData[1];
  var _liveLoad = useState(false), liveLoading = _liveLoad[0], setLiveLoading = _liveLoad[1];
  var _liveErr = useState(null), liveErr = _liveErr[0], setLiveErr = _liveErr[1];

  // Snapshot of the articles + title from the most recent successful publish.
  // Kept so the post-publish "Download AWeber HTML" button still works after
  // orderedSelection has been cleared. Null until the first publish.
  var _last = useState(null), lastPublished = _last[0], setLastPublished = _last[1];
  var _pubResult = useState(null), pubResult = _pubResult[0], setPubResult = _pubResult[1];
  // Links of articles already published — these are removed from the fetch
  // list entirely so they can't be re-picked. Sourced from /api/published
  // (Blob-backed), so it survives page refreshes and new tabs — not just
  // the current session.
  var _sent = useState({}), sentLinks = _sent[0], setSentLinks = _sent[1];

  // Pull every already-published article from the published editions —
  // both exact LINKS and STORY KEYS (subject+event). Story keys let us hide
  // an article whose story was already published even from another source
  // (e.g. publish the ESPN Clark win, the BBC/Sky versions also drop out).
  // Returns { links: {...}, stories: {...} }. Fails soft — if the endpoint
  // is down we just don't filter, rather than break the whole feed.
  async function fetchPublishedSets() {
    var links = {}, stories = {};
    try {
      var res = await fetch("/api/published?history=true&t=" + Date.now());
      if (!res.ok) return { links: links, stories: stories };
      var data = await res.json();
      var editions = (data && data.editions) || [];
      await Promise.all(editions.map(async function (ed) {
        try {
          var r = await fetch("/api/published?key=" + encodeURIComponent(ed.key) + "&t=" + Date.now());
          if (!r.ok) return;
          var full = await r.json();
          ((full && full.articles) || []).forEach(function (a) {
            if (!a) return;
            if (a.link) links[a.link] = true;
            // storyKey may be absent on older editions published before this
            // feature — that's fine, link-filtering still covers those.
            if (a.storyKey) stories[a.storyKey] = true;
          });
        } catch (e) { /* skip this edition, keep going */ }
      }));
    } catch (e) { /* endpoint unavailable — return whatever we have */ }
    return { links: links, stories: stories };
  }

  var loadFeeds = useCallback(async function () {
    setLoading(true); setError(null);
    try {
      var res = await fetch("/api/feeds?t=" + Date.now());
      if (!res.ok) throw new Error("HTTP " + res.status);
      var data = await res.json();
      var pub = await fetchPublishedSets();
      setSentLinks(pub.links);
      // Remove already-published articles from the fetch list — by exact link
      // OR by story key (so the same story from another source also drops).
      function isPublished(a) {
        if (pub.links[a.link]) return true;
        if (a.storyKey && pub.stories[a.storyKey]) return true;
        return false;
      }
      var fresh = (data.articles || []).filter(function (a) { return !isPublished(a); });
      setArticles(fresh);
      setAutoLineup((data.autoLineup || []).filter(function (p) {
        // autoLineup entries carry link; match on link (storyKey not in lineup).
        return !pub.links[p.link];
      }));
      setFetchMeta({ total: fresh.length, sources: data.sources, errors: data.errors || [], fetchedAt: data.fetchedAt });
    } catch (err) { setError(err.message); }
    setLoading(false);
  }, []);

  useEffect(function () { loadFeeds(); }, [loadFeeds]);
  useEffect(function () { var iv = setInterval(function () { loadFeeds(); }, 15 * 60 * 1000); return function () { clearInterval(iv); }; }, [loadFeeds]);

  // Read the current Auto-Feed ON/OFF state once on load.
  useEffect(function () {
    var alive = true;
    fetch("/api/auto-feed", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (alive && d) { setAutoFeedOn(!!d.enabled); setAutoFeedLastRun(d.lastRun || null); if (typeof d.totalPosted === "number") setTotalPosted(d.totalPosted); } })
      .catch(function () {});
    return function () { alive = false; };
  }, []);

  // Tick the publish cooldown down to zero.
  useEffect(function () {
    if (cooldown <= 0) return;
    var iv = setInterval(function () { setCooldown(function (c) { return c > 0 ? c - 1 : 0; }); }, 1000);
    return function () { clearInterval(iv); };
  }, [cooldown > 0]);

  // Learn which version of the live site we're building on, so the server can
  // reject a publish made from stale data (the cause of heroes reverting).
  useEffect(function () {
    var alive = true;
    fetch("/api/published", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (alive && d && d.publishedAt) setSiteVersion(d.publishedAt); })
      .catch(function () {});
    return function () { alive = false; };
  }, []);

  // Flip the switch and persist it server-side.
  // Persist the enabled flag to the server.
  function applyAutoFeed(next) {
    if (autoFeedBusy) return;
    setAutoFeedBusy(true);
    setAutoFeedOn(next); // optimistic
    fetch("/api/auto-feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && typeof d.enabled === "boolean") setAutoFeedOn(d.enabled); })
      .catch(function () { setAutoFeedOn(!next); }) // revert on failure
      .finally(function () { setAutoFeedBusy(false); });
  }

  // Turning ON is one click. Turning OFF opens a confirm box (type "Deactivate")
  // so the whole site's auto-updating can't be stopped by an accidental click.
  function toggleAutoFeed() {
    if (autoFeedBusy) return;
    if (autoFeedOn) { setConfirmText(""); setConfirmOff(true); }
    else { applyAutoFeed(true); }
  }

  function confirmDeactivate() {
    if ((confirmText || "").trim().toLowerCase() !== "deactivate") return;
    setConfirmOff(false);
    setConfirmText("");
    applyAutoFeed(false);
  }

  // Open the "On Site Now" panel and load exactly what's published right now,
  // straight from the same data the live site reads (/api/published).
  function openLive() {
    setLiveShow(true);
    setLiveLoading(true);
    setLiveErr(null);
    fetch("/api/published", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && Array.isArray(d.articles)) { setLiveData(d); if (d.publishedAt) setSiteVersion(d.publishedAt); }
        else { setLiveData(null); setLiveErr(d && d.error ? d.error : "No published edition yet"); }
      })
      .catch(function (e) { setLiveErr(e.message); })
      .finally(function () { setLiveLoading(false); });
  }

  var categories = ["All", ...Array.from(new Set(articles.map(function (a) { return a.feedCategory; })))];
  var trendScores = detectTrending(articles);

  var filteredArticles = filterCategory === "All" ? articles : articles.filter(function (a) { return a.feedCategory === filterCategory; });
  if (filterTime !== "all" && filterTime !== "trending" && filterTime !== "breaking" && filterTime !== "siren") {
    var now = Date.now();
    // NEW/HOT filters are RELATIVE — anchored to the freshest article in the
    // feed — so they MATCH the countNew/countHot pill badges. Previously these
    // used fixed absolute windows (<3h / 3-8h): on a quiet news day the pill
    // would read "NEW 4" but clicking it returned nothing, because nothing was
    // under an absolute 3h. 24h/48h stay absolute (genuine "today"/"two days").
    var filterAnchorH = (function () {
      var min = Infinity;
      articles.forEach(function (a) {
        if (!a.pubDate) return;
        var h = (now - new Date(a.pubDate).getTime()) / 3600000;
        if (h >= 0 && h < min) min = h;
      });
      return min === Infinity ? 0 : min;
    })();
    filteredArticles = filteredArticles.filter(function (a) {
      if (!a.pubDate) return false;
      var ageH = (now - new Date(a.pubDate).getTime()) / 3600000;
      if (filterTime === "3h") return ageH <= filterAnchorH + 3;
      if (filterTime === "8h") return ageH > filterAnchorH + 3 && ageH <= filterAnchorH + 9;
      if (filterTime === "24h") return ageH < 24;
      if (filterTime === "48h") return ageH < 48;
      return true;
    });
  }
  if (filterTime === "trending") { filteredArticles = filteredArticles.filter(function (a) { var ts = trendScores[articleId(a)]; return ts && ts.score >= 4; }).sort(function (a, b) { return ((trendScores[articleId(b)] || {}).score || 0) - ((trendScores[articleId(a)] || {}).score || 0); }); }
  if (filterTime === "breaking") { filteredArticles = filteredArticles.filter(function (a) { var ts = trendScores[articleId(a)]; return ts && ts.score >= 12; }); }
  if (filterTime === "siren") { filteredArticles = filteredArticles.filter(function (a) { var ts = trendScores[articleId(a)]; return ts && ts.score >= 20; }).sort(function (a, b) { return ((trendScores[articleId(b)] || {}).score || 0) - ((trendScores[articleId(a)] || {}).score || 0); }); }
  if (imagesOnly) { filteredArticles = filteredArticles.filter(function (a) { return a.image && a.image.length > 10 && a.image.startsWith("http"); }); }

  var countBase = filterCategory === "All" ? articles : articles.filter(function (a) { return a.feedCategory === filterCategory; });

  // Relative-freshness anchor. The "NEW" badge should always light up on
  // whatever is currently freshest — on a quiet day the newest story might
  // be 9h old, not 3h. We find the minimum age across all dated articles
  // and let ArticleCard label relative to that, so the dashboard never
  // looks dead just because nothing is sub-3h.
  var newestAgeH = (function () {
    var min = Infinity;
    articles.forEach(function (a) {
      if (!a.pubDate) return;
      var h = (Date.now() - new Date(a.pubDate).getTime()) / 3600000;
      if (h >= 0 && h < min) min = h;
    });
    return min === Infinity ? 0 : min;
  })();

  // NEW / HOT pill counts use the SAME relative thresholds as the card
  // badges in ArticleCard (anchor + 3 / anchor + 9). Previously these used
  // fixed absolute windows (<3h / 3-8h), so the pill could read "NEW 0"
  // while cards showed red NEW badges. Anchoring both to newestAgeH keeps
  // the pill and the card badges in agreement.
  function ageHours(a) { return (Date.now() - new Date(a.pubDate).getTime()) / 3600000; }
  var countNew = countBase.filter(function (a) {
    if (!a.pubDate) return false;
    return ageHours(a) <= newestAgeH + 3;
  }).length;
  var countHot = countBase.filter(function (a) {
    if (!a.pubDate) return false;
    var age = ageHours(a);
    return age > newestAgeH + 3 && age <= newestAgeH + 9;
  }).length;
  var countToday = countBase.filter(function (a) { return (Date.now() - new Date(a.pubDate).getTime()) < 24 * 3600000; }).length;
  var countTrending = countBase.filter(function (a) { var ts = trendScores[articleId(a)]; return ts && ts.score >= 4; }).length;
  var countBreaking = countBase.filter(function (a) { var ts = trendScores[articleId(a)]; return ts && ts.score >= 12; }).length;
  var countSiren = countBase.filter(function (a) { var ts = trendScores[articleId(a)]; return ts && ts.score >= 20; }).length;
  var countImg = countBase.filter(function (a) { return a.image && a.image.length > 10 && a.image.startsWith("http"); }).length;

  // ── Activation-model helpers ──
  function heroIndexOf(article) {
    var aid = articleId(article);
    for (var i = 0; i < FEATURE_COUNT; i++) { if (heroes[i] && articleId(heroes[i]) === aid) return i; }
    return -1;
  }
  function isInBlocks(article) {
    var aid = articleId(article);
    return blocks.some(function (b) { return articleId(b) === aid; });
  }
  function isSelected(article) { return heroIndexOf(article) !== -1 || isInBlocks(article); }
  function filledHeroCount() { return heroes.filter(Boolean).length; }

  // Clicking an article card:
  //  • already a hero  → empty that slot (slot stays as-is so you can re-pick)
  //  • already a block → remove it
  //  • brand new pick  → drop into the first ACTIVE-but-empty hero slot;
  //    if no slot is open, it goes to the block stories.
  function toggleArticle(article) {
    var hi = heroIndexOf(article);
    if (hi !== -1) { var nh = heroes.slice(); nh[hi] = null; setHeroes(nh); return; }
    if (isInBlocks(article)) {
      var aid = articleId(article);
      setBlocks(blocks.filter(function (b) { return articleId(b) !== aid; }));
      return;
    }
    var slot = -1;
    for (var i = 0; i < FEATURE_COUNT; i++) { if (activeSlots[i] && !heroes[i]) { slot = i; break; } }
    if (slot !== -1) { var nh2 = heroes.slice(); nh2[slot] = article; setHeroes(nh2); }
    else { setBlocks(blocks.concat([article])); }
  }
  function removeFromSelection(article) {
    var hi = heroIndexOf(article);
    if (hi !== -1) { var nh = heroes.slice(); nh[hi] = null; setHeroes(nh); return; }
    var aid = articleId(article);
    setBlocks(blocks.filter(function (b) { return articleId(b) !== aid; }));
  }

  // Activate / deactivate a hero slot. Activating opens it for the next pick.
  // Deactivating CLEARS the slot (its hero is removed and it goes empty) — a
  // deactivated slot simply means "I'm not touching this one," and the site
  // keeps whatever hero is already live there.
  function toggleSlotActive(i) {
    var turningOff = !!activeSlots[i];
    setActiveSlots(function (prev) {
      var next = prev.slice();
      next[i] = !next[i];
      return next;
    });
    if (turningOff && heroes[i]) {
      var nh = heroes.slice();
      nh[i] = null;
      setHeroes(nh);
    }
  }

  // Fill from a list of candidate picks: open (active+empty) hero slots first,
  // in slot order, then everything else into blocks. Heroes already placed in
  // active slots are left untouched.
  function fillFrom(picks) {
    var nh = heroes.slice();
    var used = {};
    nh.forEach(function (h) { if (h) used[articleId(h)] = true; });
    var queue = picks.filter(function (a) { return a && !used[articleId(a)]; });
    for (var i = 0; i < FEATURE_COUNT; i++) {
      if (activeSlots[i] && !nh[i]) {
        var p = queue.shift();
        if (p) { nh[i] = p; used[articleId(p)] = true; }
      }
    }
    setHeroes(nh);
    setBlocks(queue);
  }

  function selectTop(n) { fillFrom(filteredArticles.slice(0, n)); }

  // Clear: empty both hero slots and all block stories. (Deactivated slots
  // are already empty, so there's nothing to "keep" — leave a slot deactivated
  // to keep its live hero on the site.)
  function clearSelection() {
    setHeroes([null, null]);
    setBlocks([]);
  }

  // Apply the auto-ranker's lineup. route.js scores every article
  // (freshness x tier x topic-heat), gates out anything stale, and returns
  // the top 10 as `autoLineup` ordered by autoRank. We match those back to
  // the full article objects by link and feed them through fillFrom so open
  // hero slots get filled first, then the rest become block stories.
  function applyAutoLineup() {
    if (!autoLineup || autoLineup.length === 0) return;
    var byLink = {};
    articles.forEach(function (a) { byLink[a.link] = a; });
    var sel = autoLineup
      .slice()
      .sort(function (a, b) { return (a.autoRank || 0) - (b.autoRank || 0); })
      .map(function (p) { return byLink[p.link]; })
      .filter(function (a) { return a && !sentLinks[a.link]; });
    if (sel.length === 0) return;
    fillFrom(sel);
  }

  // === PUBLISH WORKFLOW ===
  function buildNewsletterTitle() {
    return "Golf Daily \u2014 " + new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  // Escape user-supplied strings before inserting into HTML.
  function escHtml(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Strip HTML tags & decode common entities for a clean text summary.
  function cleanSummary(s, max) {
    if (!s) return "";
    var c = String(s).replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
    if (c.length > max) c = c.slice(0, max).trim() + "\u2026";
    return c;
  }

  function generateNewsletterHTML(title, list) {
    // AWeber-ready email template (faithful port of the approved
    // workstation buildAweberHTML design). Three story tiers:
    //   - Story 1: full-width hero with image
    //   - Stories 2–3: side image + text (alternating left/right)
    //   - Stories 4–8: compact text block with colored side bar
    // Table-based + inline styles only = renders consistently in AWeber,
    // Gmail, Outlook, Apple Mail, Yahoo, etc.
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    var now = new Date();
    var today = months[now.getMonth()] + " " + now.getDate() + ", " + now.getFullYear();
    var tmrUrl = "https://mulligan-report-clubhouse.vercel.app";

    // AWeber gets top 8 stories.
    var aweberArticles = list.slice(0, 8);

    var storyBlocks = "";
    aweberArticles.forEach(function (a, i) {
      var headline = escHtml(a.title || "Untitled");
      var source = escHtml(a.feedName || "The Mulligan Report");
      var summary = escHtml(cleanSummary(a.description, 200));
      var storyUrl = a.link && a.link !== "#" ? a.link : tmrUrl;
      var imgUrl = a.image && a.image.length > 10 && a.image.indexOf("http") === 0 ? a.image : "";
      var catLabel = escHtml(a.feedCategory || "Pro Tour");

      if (i === 0 && imgUrl) {
        // Tier 1: full-width hero with image
        storyBlocks += ''
          + '<tr><td style="padding:0"><a href="' + storyUrl + '" target="_blank" style="text-decoration:none"><img src="' + imgUrl + '" alt="' + headline + '" width="600" style="width:100%;display:block;max-height:220px;object-fit:cover" /></a></td></tr>'
          + '<tr><td style="padding:20px 32px 6px;text-align:center">'
          +   '<a href="' + storyUrl + '" target="_blank" style="text-decoration:none"><div style="font-family:Georgia,serif;font-size:24px;font-weight:700;line-height:1.25;color:#1a1a1a;margin-bottom:8px">' + headline + '</div></a>'
          +   '<div style="font-family:Trebuchet MS,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#4a4a4a;margin-bottom:12px">' + summary + '</div>'
          +   '<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="border:2px solid #2d5a27;border-radius:3px;padding:9px 24px"><a href="' + storyUrl + '" target="_blank" style="font-family:Trebuchet MS,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2d5a27;text-decoration:none;letter-spacing:0.06em">READ NOW</a></td></tr></table>'
          + '</td></tr>'
          + '<tr><td style="padding:16px 32px 0"><div style="border-bottom:2px solid #d4c9a8"></div></td></tr>';
      } else if (i < 3 && imgUrl) {
        // Tier 2: side image + text (alternates left/right)
        var imgSide = i % 2 === 1; // 1 = image on right, 0 = image on left
        var shortSummary = escHtml(cleanSummary(a.description, 120));
        var imgTd = '<td width="180" valign="top" style="padding:0"><a href="' + storyUrl + '" target="_blank"><img src="' + imgUrl + '" alt="' + headline + '" width="180" style="width:180px;display:block;border-radius:3px" /></a></td>';
        var textTd = '<td valign="middle" style="padding:0 ' + (imgSide ? '0' : '16px') + ' 0 ' + (imgSide ? '16px' : '0') + '">'
          + '<a href="' + storyUrl + '" target="_blank" style="text-decoration:none"><div style="font-family:Georgia,serif;font-size:18px;font-weight:700;line-height:1.3;color:#1a1a1a;margin-bottom:6px">' + headline + '</div></a>'
          + '<div style="font-family:Trebuchet MS,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#2d5a27;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">via ' + source + '</div>'
          + '<div style="font-family:Trebuchet MS,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#4a4a4a;margin-bottom:10px">' + shortSummary + '</div>'
          + '<table cellpadding="0" cellspacing="0" border="0"><tr><td style="border:2px solid #2d5a27;border-radius:3px;padding:7px 18px"><a href="' + storyUrl + '" target="_blank" style="font-family:Trebuchet MS,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#2d5a27;text-decoration:none;letter-spacing:0.06em">READ NOW</a></td></tr></table>'
          + '</td>';
        storyBlocks += '<tr><td style="padding:20px 32px"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
          + (imgSide ? textTd + imgTd : imgTd + '<td width="16"></td>' + textTd)
          + '</tr></table></td></tr>'
          + '<tr><td style="padding:0 32px"><div style="border-bottom:1px solid #d4c9a8"></div></td></tr>';
      } else {
        // Tier 3: compact text block with colored side bar (alt green/gold)
        var barColor = i % 2 === 0 ? "#2d5a27" : "#b8860b";
        var midSummary = escHtml(cleanSummary(a.description, 160));
        storyBlocks += '<tr><td style="padding:20px 32px"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
          + '<td width="4" style="background:' + barColor + ';border-radius:2px"></td>'
          + '<td style="padding-left:16px">'
          +   '<div style="font-family:Trebuchet MS,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a7e6b;margin-bottom:6px">' + catLabel + '</div>'
          +   '<a href="' + storyUrl + '" target="_blank" style="text-decoration:none"><div style="font-family:Georgia,serif;font-size:18px;font-weight:700;line-height:1.3;color:#1a1a1a;margin-bottom:6px">' + headline + '</div></a>'
          +   '<div style="font-family:Trebuchet MS,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#4a4a4a;margin-bottom:6px">' + midSummary + '</div>'
          +   '<div style="font-family:Trebuchet MS,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#2d5a27;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">via ' + source + '</div>'
          +   '<table cellpadding="0" cellspacing="0" border="0"><tr><td style="border:2px solid #2d5a27;border-radius:3px;padding:7px 18px"><a href="' + storyUrl + '" target="_blank" style="font-family:Trebuchet MS,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#2d5a27;text-decoration:none;letter-spacing:0.06em">READ NOW</a></td></tr></table>'
          + '</td></tr></table></td></tr>'
          + '<tr><td style="padding:0 32px"><div style="border-bottom:1px solid #d4c9a8"></div></td></tr>';
      }
    });

    return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>The Mulligan Report</title></head><body style="margin:0;padding:0;background:#e8e3d9;font-family:Trebuchet MS,Helvetica,sans-serif">'
      + '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e8e3d9"><tr><td align="center" style="padding:24px 16px">'
      +   '<table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;overflow:hidden;max-width:600px">'
      // MASTHEAD
      +     '<tr><td style="background:#0f2b1f;padding:28px 32px;text-align:center">'
      +       '<div style="font-family:Georgia,serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#b8860b;margin-bottom:8px">\u26F3 Your Morning Golf Briefing</div>'
      +       '<div style="font-family:Georgia,serif;font-size:30px;font-weight:700;color:#f5f0e8;line-height:1.1;letter-spacing:0.02em">The Mulligan Report</div>'
      +       '<div style="width:60px;height:2px;background:linear-gradient(to right,transparent,#b8860b,transparent);margin:10px auto 8px"></div>'
      +       '<div style="font-family:Trebuchet MS,Helvetica,sans-serif;font-size:11px;color:rgba(245,240,232,0.4);letter-spacing:0.04em">' + today + '</div>'
      +     '</td></tr>'
      // TAGLINE STRIP — TMR branding + clear "you're going to the TMR site" CTA
      +     '<tr><td style="padding:26px 32px;background:#f5f0e8;border-bottom:1px solid #d4c9a8;text-align:center">'
      +       '<div style="font-family:Georgia,serif;font-size:15px;color:#5a5243;line-height:1.75;max-width:400px;margin:0 auto 22px">Your daily golf briefing is ready. The Mulligan Report is your caddie for everything golf &mdash; we pull the best stories, gear reviews, and instruction from across the web so you never waste time searching again.</div>'
      +       '<a href="https://themulliganreport.com/" target="_blank" rel="noopener" style="display:inline-block;font-family:Trebuchet MS,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.04em;color:#0f2b1f;background:#b8860b;padding:11px 26px;border-radius:3px;text-decoration:none">Experience The Mulligan Report &rarr;</a>'
      +     '</td></tr>'
      // STORIES
      +     storyBlocks
      // CTA PANEL
      +     '<tr><td style="padding:0"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f2b1f"><tr><td align="center" style="padding:24px 32px;text-align:center">'
      +       '<div style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#f5f0e8;margin-bottom:5px">Want more stories?</div>'
      +       '<div style="font-family:Trebuchet MS,Helvetica,sans-serif;font-size:13px;color:rgba(245,240,232,0.5);margin-bottom:14px">Fresh golf news every morning \u2014 free, no spam, just the game.</div>'
      +       '<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr><td style="background:#b8860b;border-radius:3px;padding:10px 28px"><a href="' + tmrUrl + '" target="_blank" style="font-family:Trebuchet MS,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.06em">VISIT THE MULLIGAN REPORT \u2192</a></td></tr></table>'
      +     '</td></tr></table></td></tr>'
      // FORWARD BLOCK
      +     '<tr><td align="center" style="padding:22px 32px;text-align:center;background:#f5f0e8;border-bottom:1px solid #d4c9a8">'
      +       '<div style="font-family:Georgia,serif;font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:4px">Know a golfer who&#39;d love this?</div>'
      +       '<div style="font-family:Trebuchet MS,Helvetica,sans-serif;font-size:12px;color:#6b6459;margin-bottom:14px">Forward this email \u2014 they&#39;ll thank you on the first tee.</div>'
      +     '</td></tr>'
      // FOOTER
      +     '<tr><td align="center" style="padding:20px 32px;text-align:center;background:#ffffff;border-top:1px solid #e5ddd0">'
      +       '<div style="font-family:Trebuchet MS,Helvetica,sans-serif;font-size:10px;color:#a09585;line-height:2">'
      +         '<strong style="color:#1a1a1a">The Mulligan Report</strong> \u00B7 Your daily golf briefing<br>'
      +         '<a href="' + tmrUrl + '" target="_blank" style="color:#2d5a27;text-decoration:none">themulliganreport.com</a> \u00B7 <a href="{!unsubscribe_url}" style="color:#a09585;text-decoration:underline">Unsubscribe</a>'
      +       '</div>'
      +     '</td></tr>'
      +   '</table>'
      + '</td></tr></table></body></html>';
  }

  // Trigger a browser download of the AWeber HTML as a .html file.
  // Uses the passed-in list/title when given (e.g. the post-publish snapshot);
  // otherwise falls back to the current working selection.
  function downloadAweberHTML(listArg, titleArg) {
    var list = (listArg && listArg.length) ? listArg : orderedSelection;
    if (!list || list.length === 0) return;
    var title = titleArg || buildNewsletterTitle();
    var html = generateNewsletterHTML(title, list);
    var d = new Date();
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    var stamp = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    var filename = "mulligan-report-" + stamp + ".html";
    var blob = new Blob([html], { type: "text/html;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
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
    if (orderedSelection.length === 0 || publishing || cooldown > 0) return;
    setPublishing(true);
    setPubResult(null);
    var results = { clipboard: false, website: false, error: null };
    try {
      var title = buildNewsletterTitle();
      var html = generateNewsletterHTML(title, orderedSelection);
      var plain = generatePlainText(title, orderedSelection);

      // The heroes for THIS publish, in slot order (#1 then #2). A slot the
      // user never filled is sent as null — the server keeps whatever hero is
      // already live in that slot, so untouched heroes never get buried.
      var featureLinks = heroes.map(function (h) { return h ? h.link : null; });
      var heroIdSet = {};
      heroes.forEach(function (h) { if (h) heroIdSet[articleId(h)] = true; });

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
          body: JSON.stringify({ articles: orderedSelection, features: featureLinks, edition: "daily", title: title, basedOn: siteVersion }),
        });
        if (!res.ok) {
          var errText = "";
          try { var ej = await res.json(); errText = ej && ej.error ? ej.error : ""; } catch (e2) {}
          throw new Error(errText ? (errText) : ("HTTP " + res.status));
        }
        var okJson = null;
        try { okJson = await res.json(); } catch (e2) {}
        if (okJson && okJson.publishedAt) setSiteVersion(okJson.publishedAt);
        results.website = true;
        setCooldown(45); // let storage settle before another publish is allowed
      } catch (e) {
        results.error = e.message;
        // We may have been refused because the site moved on. Re-sync to the
        // live version so the next publish is clean.
        try {
          var rj = await (await fetch("/api/published", { cache: "no-store" })).json();
          if (rj && rj.publishedAt) setSiteVersion(rj.publishedAt);
        } catch (e3) {}
      }
      setPubResult(results);
      // On a successful site publish: remove the published articles from the
      // fetch list immediately — by link AND by story key, so the same story
      // from another source also disappears. The next loadFeeds re-confirms
      // this via /api/published; this just makes it instant.
      if (results.website) {
        // Snapshot what we just published (full edition: heroes + blocks) so
        // the post-publish Download AWeber button reflects exactly what went out.
        setLastPublished({ articles: orderedSelection.slice(), title: title });

        // Everything in this edition (heroes + blocks) is consumed — marked
        // sent and pulled from the feed so it can't be re-picked.
        var consumed = orderedSelection.slice();

        var pubLinks = {}, pubStories = {};
        consumed.forEach(function (a) {
          pubLinks[a.link] = true;
          if (a.storyKey) pubStories[a.storyKey] = true;
        });
        setSentLinks(Object.assign({}, sentLinks, pubLinks));
        setArticles(function (prev) {
          return prev.filter(function (a) {
            if (pubLinks[a.link]) return false;
            if (a.storyKey && pubStories[a.storyKey]) return false;
            return true;
          });
        });
        setAutoLineup(function (prev) {
          return prev.filter(function (p) { return !pubLinks[p.link]; });
        });

        // Reset to the clean default: both slots empty and deactivated, no
        // blocks. The heroes you just published stay live on the site; next
        // edition you only activate a slot if you want to change one.
        setHeroes([null, null]);
        setBlocks([]);
        setActiveSlots([false, false]);
      }
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
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
              <button onClick={toggleAutoFeed} disabled={autoFeedBusy}
                title={autoFeedOn ? "Auto-Feed is ON \u2014 the best 10 stories publish automatically every 4 hours. Click to turn off." : "Auto-Feed is OFF. Click to let the best 10 stories publish automatically every 4 hours (heroes untouched)."}
                style={{
                  padding: "8px 14px",
                  background: autoFeedOn ? "rgba(74,222,128,0.16)" : "rgba(255,255,255,0.04)",
                  color: autoFeedOn ? "#4ade80" : "#9ca3af",
                  border: autoFeedOn ? "1px solid rgba(74,222,128,0.5)" : "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: autoFeedBusy ? "default" : "pointer",
                  display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap",
                }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: autoFeedOn ? "#4ade80" : "#6b7280",
                  boxShadow: autoFeedOn ? "0 0 6px #4ade80" : "none",
                }} />
                {"Auto-Feed " + (autoFeedOn ? "ON" : "OFF")}
              </button>
              {confirmOff && (
                <div style={{ marginTop: 4, padding: "8px 10px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.35)", borderRadius: 8, width: 210 }}>
                  <div style={{ fontSize: 10, color: "#f87171", fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>
                    {"Type \u201CDeactivate\u201D to turn Auto-Feed off"}
                  </div>
                  <input value={confirmText} autoFocus
                    onChange={function (e) { setConfirmText(e.target.value); }}
                    onKeyDown={function (e) { if (e.key === "Enter") confirmDeactivate(); if (e.key === "Escape") { setConfirmOff(false); setConfirmText(""); } }}
                    placeholder="Deactivate"
                    style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#e5e7eb", fontSize: 11, padding: "5px 8px", boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={confirmDeactivate}
                      disabled={confirmText.trim().toLowerCase() !== "deactivate"}
                      style={{ flex: 1, background: confirmText.trim().toLowerCase() === "deactivate" ? "#dc2626" : "#374151", border: "none", color: confirmText.trim().toLowerCase() === "deactivate" ? "#fff" : "#6b7280", borderRadius: 6, padding: "6px 10px", fontSize: 10, fontWeight: 700, cursor: confirmText.trim().toLowerCase() === "deactivate" ? "pointer" : "default" }}>
                      Turn Off
                    </button>
                    <button onClick={function () { setConfirmOff(false); setConfirmText(""); }}
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#9ca3af", borderRadius: 6, padding: "6px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <div style={{ fontSize: 10, color: autoFeedLastRun ? "#6b7280" : "#4b5563", paddingLeft: 2, whiteSpace: "nowrap" }}>
                {autoFeedLastRun
                  ? ("\u2713 Last Auto-Feed: " + autoFeedLastRun.count + " " + (autoFeedLastRun.count === 1 ? "story" : "stories") + " \u00B7 "
                      + new Date(autoFeedLastRun.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))
                  : "No auto-runs yet"}
              </div>
              {typeof totalPosted === "number" && (
                <div style={{ fontSize: 10, color: "#b8860b", paddingLeft: 2, whiteSpace: "nowrap", fontWeight: 600 }}>
                  {"\uD83D\uDCCA " + totalPosted.toLocaleString() + " curated articles since 2026"}
                </div>
              )}
            </div>
            <a href="https://mulligan-report-clubhouse.vercel.app/caddie-manager.html" target="_blank" rel="noopener noreferrer" style={{ padding: "8px 16px", background: "rgba(56,189,248,0.12)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
              {"\uD83C\uDFA5 Caddies Pick"}
            </a>
            <a href="/tickers" target="_blank" rel="noopener noreferrer" style={{ padding: "8px 16px", background: "rgba(184,134,11,0.12)", color: "#b8860b", border: "1px solid rgba(184,134,11,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
              {"\uD83D\uDCC8 Tickers"}
            </a>
            <button onClick={openLive} title="See exactly what's live on themulliganreport.com right now"
              style={{ padding: "8px 16px", background: "rgba(168,85,247,0.12)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              {"\uD83D\uDC41 On Site Now"}
            </button>
            <button onClick={loadFeeds} disabled={loading} style={{ padding: "8px 16px", background: loading ? "#374151" : "rgba(21,128,61,0.15)", color: loading ? "#6b7280" : "#4ade80", border: "1px solid rgba(21,128,61,0.25)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              {loading && <div style={{ width: 14, height: 14, border: "2px solid #4ade80", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
              {loading ? "Fetching\u2026" : "\u21BB Refresh"}
            </button>
          </div>
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
                          // Freshness dashboard: the badge shows how many
                          // articles in this category are FRESH (last 24h) —
                          // not the total. A tab reading "0" tells you to
                          // skip it; a high number says dig in. Total is
                          // shown dimmed alongside for context.
                          var catArticles = cat === "All" ? articles : articles.filter(function (a) { return a.feedCategory === cat; });
                          var total = catArticles.length;
                          var freshCount = catArticles.filter(isFreshArticle).length;
                          var hasFresh = freshCount > 0;
                          return <button key={cat} onClick={function () { setFilterCategory(cat); }} style={{
                            padding: "8px 14px", borderRadius: 7,
                            border: act ? "1px solid " + g.text : "1px solid " + g.border,
                            background: act ? g.activeBg : g.bg,
                            color: act ? "#fff" : g.text,
                            fontSize: 12, fontWeight: 700, cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 6,
                            // A category with no fresh content visually recedes.
                            opacity: act ? 1 : (hasFresh ? 1 : 0.5),
                          }}>
                            {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
                            {cat}
                            {cat !== "All" && <span style={{
                              background: act ? "rgba(0,0,0,0.25)" : (hasFresh ? "rgba(220,38,38,0.85)" : "rgba(0,0,0,0.3)"),
                              color: act ? "#fff" : (hasFresh ? "#fff" : g.text),
                              padding: "1px 7px", borderRadius: 9, fontSize: 11, fontWeight: 700,
                            }}>{freshCount}</span>}
                            {cat !== "All" && <span style={{
                              color: act ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.30)",
                              fontSize: 10, fontWeight: 600,
                            }}>/{total}</span>}
                          </button>;
                        });
                      })()}
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={applyAutoLineup} disabled={!autoLineup || autoLineup.length === 0}
                        title="Load the ranker's freshness-gated top 10 — review and tweak before publishing"
                        style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #15803d",
                          background: (!autoLineup || autoLineup.length === 0) ? "rgba(21,128,61,0.15)" : "linear-gradient(135deg, #15803d, #22c55e)",
                          color: (!autoLineup || autoLineup.length === 0) ? "#4b5563" : "#fff",
                          fontSize: 11, fontWeight: 700,
                          cursor: (!autoLineup || autoLineup.length === 0) ? "default" : "pointer" }}>
                        {"\u2728 Auto-pick 10" + (autoLineup && autoLineup.length ? "" : " \u2014 \u2026")}
                      </button>
                      <button onClick={function () { selectTop(10); }} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(21,128,61,0.3)", background: "transparent", color: "#4ade80", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Top 10</button>
                      <button onClick={function () { selectTop(filteredArticles.length); }} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(21,128,61,0.3)", background: "transparent", color: "#4ade80", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>All</button>
                      <button onClick={function () { clearSelection(); }} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#6b7280", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Clear</button>
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
                    var aid = articleId(article);
                    var orderNum = sel ? orderedSelection.findIndex(function (a) { return articleId(a) === aid; }) + 1 : null;
                    return <ArticleCard key={aid} article={article} selected={sel} isSent={!!sentLinks[article.link]} trendScore={trendScores[aid] || null} orderNum={orderNum} newestAgeH={newestAgeH} onToggle={function () { toggleArticle(article); }} />;
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
              heroes={heroes}
              blocks={blocks}
              activeSlots={activeSlots}
              onToggleActive={function (i) { toggleSlotActive(i); }}
              onSetHero={function (i, article) { var nh = heroes.slice(); nh[i] = article; setHeroes(nh); }}
              onReorderBlocks={function (newBlocks) { setBlocks(newBlocks); }}
              onRemove={function (article) { removeFromSelection(article); }}
              onClear={function () { clearSelection(); }}
            />
            {orderedSelection.length > 0 && (
              <div style={{ padding: "14px 14px 18px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <button onClick={handlePublish} disabled={publishing || cooldown > 0} title={cooldown > 0 ? "Storage is settling after your last publish \u2014 publishing again too soon is what made heroes revert." : ""} style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10, border: "none",
                  background: (publishing || cooldown > 0) ? "#374151" : (pubResult && !pubResult.error && pubResult.website ? "#15803d" : "linear-gradient(135deg, #15803d, #059669)"),
                  color: (publishing || cooldown > 0) ? "#9ca3af" : "#fff", fontWeight: 800, fontSize: 14, cursor: (publishing || cooldown > 0) ? "default" : "pointer",
                  boxShadow: (publishing || cooldown > 0) ? "none" : "0 4px 14px rgba(21,128,61,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  {publishing && <div style={{ width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
                  {publishing
                    ? "Publishing\u2026"
                    : cooldown > 0
                    ? ("\u23F3 Ready in " + cooldown + "s\u2026")
                    : (filledHeroCount() > 0
                        ? "\uD83D\uDE80 Publish \u2014 " + filledHeroCount()
                            + (filledHeroCount() === 1 ? " hero + " : " heroes + ")
                            + blocks.length + " " + (blocks.length === 1 ? "story" : "stories")
                        : "\uD83D\uDE80 Publish " + blocks.length + " " + (blocks.length === 1 ? "story" : "stories"))}
                </button>
                {cooldown > 0 && (
                  <div style={{ marginTop: 6, fontSize: 10, color: "#d4a017", textAlign: "center", lineHeight: 1.4 }}>
                    {"Letting the site finish saving. Publishing again too soon can revert the heroes."}
                  </div>
                )}
                <button onClick={function () { downloadAweberHTML(); }} style={{
                  width: "100%", marginTop: 8, padding: "10px 14px", borderRadius: 10,
                  border: "1px solid rgba(184,134,11,0.4)",
                  background: "rgba(184,134,11,0.08)",
                  color: "#b8860b", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  {"\u2B07 Download AWeber HTML"}
                </button>
                <div style={{ marginTop: 8, fontSize: 10, color: "#6b7280", textAlign: "center", lineHeight: 1.5 }}>
                  {filledHeroCount() > 0
                    ? (filledHeroCount() === 1 ? "Your hero is" : "Your heroes are") + " pinned to the top \u00B7 stories fill in below"
                    : "Heroes on the site stay as-is \u00B7 new stories slot in below them"}
                </div>
              </div>
            )}
            {/* Post-publish confirmation — stays visible AFTER the lineup is
                cleared, so the AWeber download is still reachable. */}
            {pubResult && (
              <div style={{ padding: "14px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ padding: 12, borderRadius: 8, background: pubResult.error ? "rgba(239,68,68,0.1)" : "rgba(74,222,128,0.08)", border: pubResult.error ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(74,222,128,0.25)" }}>
                  {pubResult.error ? (
                    <div style={{ color: "#f87171", fontSize: 11 }}>{"\u274C"} {pubResult.error}</div>
                  ) : (
                    <div>
                      <div style={{ color: "#4ade80", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{"\u2705"} Published</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 10, color: "#9ca3af", marginBottom: 10 }}>
                        {pubResult.clipboard && <span>{"\u2713"} Newsletter copied to clipboard</span>}
                        {pubResult.website && <span>{"\u2713"} Live on The Mulligan Report</span>}
                      </div>
                      {/* The important one: download the AWeber-formatted HTML.
                          Uses the published snapshot, so it works even though
                          the lineup has been cleared. */}
                      {lastPublished && (
                        <button onClick={function () { downloadAweberHTML(lastPublished.articles, lastPublished.title); }} style={{
                          width: "100%", padding: "10px 14px", borderRadius: 10,
                          border: "1px solid rgba(184,134,11,0.5)",
                          background: "rgba(184,134,11,0.14)",
                          color: "#d4a017", fontWeight: 700, fontSize: 13, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        }}>
                          {"\u2B07 Download AWeber HTML"}
                        </button>
                      )}
                      <a href="https://mulligan-report-drudge.vercel.app" target="_blank" rel="noopener noreferrer" style={{
                        width: "100%", marginTop: 8, padding: "10px 14px", borderRadius: 10,
                        border: "1px solid rgba(74,222,128,0.4)",
                        background: "rgba(74,222,128,0.08)",
                        color: "#4ade80", fontWeight: 700, fontSize: 13, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        textDecoration: "none", boxSizing: "border-box",
                      }}>
                        {"\u2192 Visit The Mulligan Report"}
                      </a>
                      {pubResult.clipboard && (
                        <a href="https://www.aweber.com/users/broadcasts/new" target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 8, fontSize: 11, color: "#9ca3af", fontWeight: 600, textDecoration: "none", textAlign: "center" }}>
                          {"\u2192"} Open AWeber to paste
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {liveShow && (
        <div onClick={function () { setLiveShow(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
          <div onClick={function (e) { e.stopPropagation(); }}
            style={{ background: "#0b1410", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, width: "100%", maxWidth: 620, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>{"\uD83D\uDC41"} On Site Now</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Exactly what's live on themulliganreport.com</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={openLive} title="Reload" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#9ca3af", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\u21BB"}</button>
                <button onClick={function () { setLiveShow(false); }} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>{"\u00D7"}</button>
              </div>
            </div>
            <div style={{ overflowY: "auto", padding: "8px 0 16px" }}>
              {liveLoading && <div style={{ padding: 30, textAlign: "center", color: "#6b7280", fontSize: 13 }}>Loading what's live\u2026</div>}
              {!liveLoading && liveErr && <div style={{ padding: 30, textAlign: "center", color: "#f87171", fontSize: 13 }}>{liveErr}</div>}
              {!liveLoading && !liveErr && liveData && (function () {
                var arts = liveData.articles || [];
                var heroes = arts.slice(0, FEATURE_COUNT);
                var blocks = arts.slice(FEATURE_COUNT);
                return (
                  <div>
                    <div style={{ padding: "10px 20px 6px", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#d4a017" }}>{"\u2605"} Features (heroes)</div>
                    {heroes.length === 0 && <div style={{ padding: "4px 20px 8px", fontSize: 12, color: "#6b7280" }}>None.</div>}
                    {heroes.map(function (a, i) {
                      return (
                        <div key={"lh" + i} style={{ display: "flex", gap: 10, padding: "8px 20px", alignItems: "baseline" }}>
                          <span style={{ color: "#d4a017", fontSize: 12, flexShrink: 0 }}>{"\u2605"}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#f5deb3" }}>{a.title}</div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{(a.source || "") + (a.pubDate ? " \u00B7 " + formatDate(a.pubDate) : "")}</div>
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ padding: "12px 20px 6px", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 6 }}>Block stories ({blocks.length})</div>
                    {blocks.map(function (a, i) {
                      return (
                        <div key={"lb" + i} style={{ display: "flex", gap: 10, padding: "7px 20px", alignItems: "baseline" }}>
                          <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 700, width: 20, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{a.title}</div>
                            <div style={{ fontSize: 10, color: "#6b7280" }}>{(a.source || "") + (a.pubDate ? " \u00B7 " + formatDate(a.pubDate) : "")}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
