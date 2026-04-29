"use client";
import { useState, useEffect } from "react";

export default function TickerStation() {
  var _articles = useState([]), articles = _articles[0], setArticles = _articles[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var _filter = useState(""), filter = _filter[0], setFilter = _filter[1];
  var _sending = useState(null), sending = _sending[0], setSending = _sending[1];

  // T1: headlines from articles
  var _t1 = useState([]), ticker1 = _t1[0], setTicker1 = _t1[1];
  // T2: one text line — course/weather
  var _t2 = useState(""), ticker2 = _t2[0], setTicker2 = _t2[1];
  // T3: one text line — TV schedule
  var _t3 = useState(""), ticker3 = _t3[0], setTicker3 = _t3[1];

  // Load RSS
  useEffect(function () {
    fetch("/api/feeds?t=" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (data) { setArticles(data.articles || []); setLoading(false); })
      .catch(function () { setLoading(false); });
  }, []);

  // Load existing ticker data
  useEffect(function () {
    fetch("/api/tickers")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && !data.error) {
          if (data.ticker1 && data.ticker1.items) setTicker1(data.ticker1.items);
          if (data.ticker2 && data.ticker2.text) setTicker2(data.ticker2.text);
          if (data.ticker3 && data.ticker3.text) setTicker3(data.ticker3.text);
        }
      })
      .catch(function () {});
  }, []);

  function addToTicker1(article) {
    var title = article.title || "";
    var source = article.feedName || "";
    if (!ticker1.some(function (t) { return t.text === title; })) {
      setTicker1(function (p) { return [{ text: title, source: source }].concat(p); });
    }
  }

  function removeFromTicker1(index) {
    setTicker1(function (p) { return p.filter(function (_, i) { return i !== index; }); });
  }

  function broadcast() {
    setSending("all");
    fetch("/api/tickers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "all",
        data: {
          ticker1: { items: ticker1 },
          ticker2: { text: ticker2 },
          ticker3: { text: ticker3 },
        },
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        setSending(res.success ? "done" : "error");
        setTimeout(function () { setSending(null); }, 3000);
      })
      .catch(function () { setSending("error"); setTimeout(function () { setSending(null); }, 3000); });
  }

  function timeAgo(d) {
    if (!d) return "";
    var diff = Date.now() - new Date(d).getTime();
    if (diff < 3600000) return Math.max(1, Math.floor(diff / 60000)) + "m";
    if (diff < 86400000) return Math.floor(diff / 3600000) + "h";
    return Math.floor(diff / 86400000) + "d";
  }

  var filtered = articles.filter(function (a) {
    if (!filter) return true;
    var s = filter.toLowerCase();
    return (a.title || "").toLowerCase().indexOf(s) > -1 ||
           (a.feedName || "").toLowerCase().indexOf(s) > -1 ||
           (a.feedCategory || "").toLowerCase().indexOf(s) > -1;
  });

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0f0a 0%, #0d1117 100%)", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "rgba(0,0,0,0.5)", borderBottom: "2px solid #b8860b", padding: "16px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#b8860b", fontWeight: 800, letterSpacing: "0.2em" }}>MULLIGAN REPORT</div>
        <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 900, margin: "4px 0 0" }}>{"\uD83D\uDCE1"} Ticker Broadcast Station</h1>
        <p style={{ color: "#6b7280", fontSize: 12, margin: "4px 0 0" }}>T1: tap headlines below. T2 & T3: type one line each. Broadcast.</p>
      </div>

      <div style={{ display: "flex", maxWidth: 1400, margin: "0 auto" }}>
        {/* LEFT: Ticker Controls */}
        <div style={{ width: 380, minWidth: 380, padding: 16, borderRight: "1px solid rgba(255,255,255,0.06)", height: "calc(100vh - 100px)", overflowY: "auto", position: "sticky", top: 0 }}>

          {/* Broadcast button */}
          <button onClick={broadcast} style={{
            width: "100%", padding: 14, borderRadius: 10, border: "none", fontWeight: 800, fontSize: 15, cursor: "pointer", marginBottom: 20,
            background: sending === "done" ? "#4ade80" : sending === "error" ? "#ef4444" : "linear-gradient(135deg, #15803d, #059669)",
            color: "#fff", boxShadow: "0 4px 16px rgba(21,128,61,0.3)",
          }}>
            {sending === "all" ? "\uD83D\uDCE1 Broadcasting..." : sending === "done" ? "\u2705 ALL TICKERS LIVE!" : sending === "error" ? "\u274C Failed" : "\uD83D\uDCE1 Broadcast All Tickers"}
          </button>

          {/* T1: TODAY'S CARD — headlines from articles */}
          <div style={{ marginBottom: 16, background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 14, border: "1px solid #4ade8030" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <span>{"\uD83C\uDFCC\uFE0F"}</span>
                <span style={{ color: "#4ade80", fontSize: 14, fontWeight: 800, marginLeft: 6 }}>TODAY'S CARD</span>
                <span style={{ color: "#6b7280", fontSize: 11, marginLeft: 6 }}>({ticker1.length})</span>
              </div>
              <button onClick={function () { setTicker1([]); }} style={{
                padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent", color: "#6b7280", fontSize: 10, fontWeight: 600, cursor: "pointer",
              }}>Clear</button>
            </div>
            <div style={{ color: "#4b5563", fontSize: 11, marginBottom: 6 }}>{"\u2190"} Tap article headlines to add here</div>
            {ticker1.length === 0 ? (
              <div style={{ color: "#374151", fontSize: 11, fontStyle: "italic", padding: "6px 0" }}>Empty — tap headlines on the right</div>
            ) : (
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {ticker1.map(function (item, idx) {
                  return (
                    <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ flex: 1, fontSize: 12, color: "#d1d5db", lineHeight: 1.4 }}>
                        {item.text}
                        <span style={{ color: "#6b7280", fontSize: 9, marginLeft: 4 }}>{item.source}</span>
                      </div>
                      <button onClick={function () { removeFromTicker1(idx); }} style={{
                        padding: "2px 6px", border: "none", background: "transparent", color: "#6b7280", cursor: "pointer", fontSize: 14,
                      }}>{"\u00D7"}</button>
                    </div>
                  );
                })}
              </div>
            )}
            {ticker1.length > 0 && (
              <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(74,222,128,0.05)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ fontSize: 9, color: "#6b7280" }}>PREVIEW:</div>
                <div style={{ fontSize: 11, color: "#4ade80", fontFamily: "Courier, monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {ticker1.map(function (t) { return t.text; }).join("  \u00B7  ")}
                </div>
              </div>
            )}
          </div>

          {/* T2: COURSE INTEL — one text input */}
          <div style={{ marginBottom: 16, background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 14, border: "1px solid #b8860b30" }}>
            <div style={{ marginBottom: 8 }}>
              <span>{"\u26F3"}</span>
              <span style={{ color: "#b8860b", fontSize: 14, fontWeight: 800, marginLeft: 6 }}>COURSE INTEL</span>
            </div>
            <div style={{ color: "#4b5563", fontSize: 11, marginBottom: 6 }}>Type weather, course conditions, one line</div>
            <input value={ticker2} onChange={function (e) { setTicker2(e.target.value); }}
              placeholder="82\u00B0F \u00B7 Wind 12mph SE \u00B7 15% rain \u00B7 Stimp 13.5 \u00B7 Firm and fast"
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "1px solid rgba(184,134,11,0.2)", background: "rgba(184,134,11,0.05)",
                color: "#e5e7eb", fontSize: 13, fontFamily: "Courier, monospace", outline: "none",
              }} />
            {ticker2 && (
              <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(184,134,11,0.05)", borderRadius: 6 }}>
                <div style={{ fontSize: 9, color: "#6b7280" }}>PREVIEW:</div>
                <div style={{ fontSize: 11, color: "#b8860b", fontFamily: "Courier, monospace" }}>{ticker2}</div>
              </div>
            )}
          </div>

          {/* T3: LIVE TV — one text input */}
          <div style={{ marginBottom: 16, background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 14, border: "1px solid #ef444430" }}>
            <div style={{ marginBottom: 8 }}>
              <span>{"\uD83D\uDCFA"}</span>
              <span style={{ color: "#ef4444", fontSize: 14, fontWeight: 800, marginLeft: 6 }}>LIVE TV</span>
            </div>
            <div style={{ color: "#4b5563", fontSize: 11, marginBottom: 6 }}>Type TV schedule, one line (update weekly)</div>
            <input value={ticker3} onChange={function (e) { setTicker3(e.target.value); }}
              placeholder="Thu-Fri: Golf Ch. 2-6pm \u00B7 Sat-Sun: CBS 3-6pm \u00B7 ESPN+ all day"
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)",
                color: "#e5e7eb", fontSize: 13, fontFamily: "Courier, monospace", outline: "none",
              }} />
            {ticker3 && (
              <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(239,68,68,0.05)", borderRadius: 6 }}>
                <div style={{ fontSize: 9, color: "#6b7280" }}>PREVIEW:</div>
                <div style={{ fontSize: 11, color: "#ef4444", fontFamily: "Courier, monospace" }}>{ticker3}</div>
              </div>
            )}
          </div>

          <div style={{ textAlign: "center", paddingTop: 10 }}>
            <a href="/" style={{ color: "#4ade80", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>{"\u2190"} Back to LinkPulse</a>
          </div>
        </div>

        {/* RIGHT: Article Feed (for T1 only) */}
        <div style={{ flex: 1, padding: 16 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
            <input value={filter} onChange={function (e) { setFilter(e.target.value); }} placeholder="Search articles for Today's Card ticker..." style={{
              flex: 1, padding: "10px 14px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
              color: "#e5e7eb", fontSize: 14, outline: "none",
            }} />
            <span style={{ color: "#6b7280", fontSize: 11, whiteSpace: "nowrap" }}>{loading ? "Loading..." : filtered.length + " articles"}</span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#4ade80" }}>Pulling live golf feeds...</div>
          ) : (
            filtered.slice(0, 100).map(function (a, i) {
              var hasImg = a.image && a.image.length > 10 && a.image.startsWith("http");
              var alreadyAdded = ticker1.some(function (t) { return t.text === a.title; });
              return (
                <div key={i} style={{
                  display: "flex", gap: 10, alignItems: "center",
                  background: alreadyAdded ? "rgba(74,222,128,0.05)" : "rgba(0,0,0,0.3)",
                  borderRadius: 10, padding: "10px 14px", marginBottom: 6,
                  border: alreadyAdded ? "1px solid rgba(74,222,128,0.2)" : "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer", transition: "all 0.15s",
                }} onClick={function () { if (!alreadyAdded) addToTicker1(a); }}>
                  {hasImg && (
                    <img src={a.image} style={{ width: 50, height: 38, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                      onError={function (e) { e.target.style.display = "none"; }} alt="" />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: alreadyAdded ? "#4ade80" : "#e5e7eb", fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
                      {alreadyAdded ? "\u2713 " : ""}{a.title}
                    </div>
                    <span style={{ color: "#6b7280", fontSize: 10 }}>{a.feedName} · {timeAgo(a.pubDate)}</span>
                  </div>
                  {!alreadyAdded && (
                    <div style={{
                      padding: "6px 12px", borderRadius: 8, background: "#4ade8015",
                      border: "1px solid #4ade8030", color: "#4ade80", fontSize: 12, fontWeight: 700,
                      flexShrink: 0, whiteSpace: "nowrap",
                    }}>+ Add</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
