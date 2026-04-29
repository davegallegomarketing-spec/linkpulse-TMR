"use client";
import { useState, useEffect } from "react";

export default function TickerStation() {
  var _articles = useState([]), articles = _articles[0], setArticles = _articles[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var _filter = useState(""), filter = _filter[0], setFilter = _filter[1];
  var _sending = useState(null), sending = _sending[0], setSending = _sending[1];

  // Current ticker contents
  var _t1 = useState([]), ticker1 = _t1[0], setTicker1 = _t1[1];
  var _t2 = useState([]), ticker2 = _t2[0], setTicker2 = _t2[1];
  var _t3 = useState([]), ticker3 = _t3[0], setTicker3 = _t3[1];

  // Load RSS articles
  useEffect(function () {
    fetch("/api/feeds").then(function (r) { return r.json(); }).then(function (data) {
      setArticles(data || []);
      setLoading(false);
    }).catch(function () { setLoading(false); });
  }, []);

  // Load existing ticker data
  useEffect(function () {
    fetch("/api/tickers").then(function (r) { return r.json(); }).then(function (data) {
      if (data && !data.error) {
        if (data.ticker1 && data.ticker1.items) setTicker1(data.ticker1.items);
        if (data.ticker2 && data.ticker2.items) setTicker2(data.ticker2.items);
        if (data.ticker3 && data.ticker3.items) setTicker3(data.ticker3.items);
      }
    }).catch(function () {});
  }, []);

  function addToTicker(tickerNum, article) {
    var title = article.title || "";
    var source = article.feedName || "";
    var item = { text: title, source: source, addedAt: new Date().toISOString() };

    if (tickerNum === 1) {
      var exists = ticker1.some(function (t) { return t.text === title; });
      if (!exists) setTicker1(function (p) { return [item].concat(p); });
    } else if (tickerNum === 2) {
      var exists2 = ticker2.some(function (t) { return t.text === title; });
      if (!exists2) setTicker2(function (p) { return [item].concat(p); });
    } else {
      var exists3 = ticker3.some(function (t) { return t.text === title; });
      if (!exists3) setTicker3(function (p) { return [item].concat(p); });
    }
  }

  function removeFromTicker(tickerNum, index) {
    if (tickerNum === 1) setTicker1(function (p) { return p.filter(function (_, i) { return i !== index; }); });
    if (tickerNum === 2) setTicker2(function (p) { return p.filter(function (_, i) { return i !== index; }); });
    if (tickerNum === 3) setTicker3(function (p) { return p.filter(function (_, i) { return i !== index; }); });
  }

  function clearTicker(tickerNum) {
    if (tickerNum === 1) setTicker1([]);
    if (tickerNum === 2) setTicker2([]);
    if (tickerNum === 3) setTicker3([]);
  }

  function broadcastAll() {
    setSending("all");
    fetch("/api/tickers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "all",
        data: {
          ticker1: { items: ticker1 },
          ticker2: { items: ticker2 },
          ticker3: { items: ticker3 },
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

  function broadcastOne(tickerNum) {
    var sectionName = "ticker" + tickerNum;
    var items = tickerNum === 1 ? ticker1 : tickerNum === 2 ? ticker2 : ticker3;
    setSending(sectionName);
    fetch("/api/tickers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: sectionName,
        data: { items: items },
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        setSending(res.success ? sectionName + "_done" : sectionName + "_error");
        setTimeout(function () { setSending(null); }, 3000);
      })
      .catch(function () { setSending(sectionName + "_error"); setTimeout(function () { setSending(null); }, 3000); });
  }

  // Time ago helper
  function timeAgo(d) {
    if (!d) return "";
    var diff = Date.now() - new Date(d).getTime();
    if (diff < 3600000) return Math.max(1, Math.floor(diff / 60000)) + "m";
    if (diff < 86400000) return Math.floor(diff / 3600000) + "h";
    return Math.floor(diff / 86400000) + "d";
  }

  // Filter articles
  var filtered = articles.filter(function (a) {
    if (!filter) return true;
    var s = filter.toLowerCase();
    return (a.title || "").toLowerCase().indexOf(s) > -1 ||
           (a.feedName || "").toLowerCase().indexOf(s) > -1 ||
           (a.feedCategory || "").toLowerCase().indexOf(s) > -1;
  });

  var tickerNames = ["TODAY'S CARD", "COURSE INTEL", "LIVE TV"];
  var tickerColors = ["#4ade80", "#b8860b", "#ef4444"];
  var tickerEmojis = ["\uD83C\uDFCC\uFE0F", "\u26F3", "\uD83D\uDCFA"];
  var tickerArrays = [ticker1, ticker2, ticker3];
  var tickerSetters = [setTicker1, setTicker2, setTicker3];

  var cardStyle = {
    background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 14,
    marginBottom: 8, border: "1px solid rgba(255,255,255,0.06)",
  };
  var tickerBtnStyle = function (color) {
    return {
      padding: "4px 10px", borderRadius: 6, border: "1px solid " + color + "40",
      background: color + "15", color: color, fontSize: 11, fontWeight: 700,
      cursor: "pointer", whiteSpace: "nowrap",
    };
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0f0a 0%, #0d1117 100%)", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "rgba(0,0,0,0.5)", borderBottom: "2px solid #b8860b", padding: "16px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#b8860b", fontWeight: 800, letterSpacing: "0.2em" }}>MULLIGAN REPORT</div>
        <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 900, margin: "4px 0 0", letterSpacing: "-0.5px" }}>
          {"\uD83D\uDCE1"} Ticker Broadcast Station
        </h1>
        <p style={{ color: "#6b7280", fontSize: 12, margin: "4px 0 0" }}>
          Tap headlines to add them to tickers. Broadcast when ready.
        </p>
      </div>

      <div style={{ display: "flex", maxWidth: 1400, margin: "0 auto", gap: 0 }}>
        {/* LEFT: Ticker Preview & Controls */}
        <div style={{ width: 360, minWidth: 360, padding: "16px", borderRight: "1px solid rgba(255,255,255,0.06)", height: "calc(100vh - 100px)", overflowY: "auto", position: "sticky", top: 0 }}>
          {/* Broadcast All button */}
          <button onClick={broadcastAll} style={{
            width: "100%", padding: "14px", borderRadius: 10, border: "none", fontWeight: 800,
            fontSize: 15, cursor: "pointer", marginBottom: 16,
            background: sending === "done" ? "#4ade80" : sending === "error" ? "#ef4444" : "linear-gradient(135deg, #15803d, #059669)",
            color: "#fff", boxShadow: "0 4px 16px rgba(21,128,61,0.3)",
          }}>
            {sending === "all" ? "\uD83D\uDCE1 Broadcasting..." : sending === "done" ? "\u2705 ALL TICKERS LIVE!" : sending === "error" ? "\u274C Failed" : "\uD83D\uDCE1 Broadcast All Tickers"}
          </button>

          {/* Three ticker sections */}
          {[1, 2, 3].map(function (num) {
            var items = tickerArrays[num - 1];
            var color = tickerColors[num - 1];
            var sKey = "ticker" + num;
            return (
              <div key={num} style={{ marginBottom: 16, background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 12, border: "1px solid " + color + "30" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <span>{tickerEmojis[num - 1]}</span>
                    <span style={{ color: color, fontSize: 13, fontWeight: 800, marginLeft: 6 }}>{tickerNames[num - 1]}</span>
                    <span style={{ color: "#6b7280", fontSize: 11, marginLeft: 6 }}>({items.length})</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={function () { broadcastOne(num); }} style={{
                      padding: "3px 10px", borderRadius: 6, border: "none", fontSize: 10,
                      fontWeight: 700, cursor: "pointer",
                      background: sending === sKey + "_done" ? "#4ade80" : color, color: "#fff",
                    }}>
                      {sending === sKey ? "..." : sending === sKey + "_done" ? "\u2713" : "\uD83D\uDCE1"}
                    </button>
                    <button onClick={function () { clearTicker(num); }} style={{
                      padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
                      background: "transparent", color: "#6b7280", fontSize: 10, fontWeight: 600, cursor: "pointer",
                    }}>Clear</button>
                  </div>
                </div>
                {items.length === 0 ? (
                  <div style={{ color: "#4b5563", fontSize: 11, fontStyle: "italic", padding: "8px 0" }}>No items — tap headlines to add</div>
                ) : (
                  <div style={{ maxHeight: 200, overflowY: "auto" }}>
                    {items.map(function (item, i) {
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <div style={{ flex: 1, fontSize: 11, color: "#d1d5db", lineHeight: 1.4 }}>
                            {item.text}
                            <span style={{ color: "#6b7280", fontSize: 9, marginLeft: 4 }}>{item.source}</span>
                          </div>
                          <button onClick={function () { removeFromTicker(num, i); }} style={{
                            padding: "2px 6px", border: "none", background: "transparent",
                            color: "#6b7280", cursor: "pointer", fontSize: 12, flexShrink: 0,
                          }}>{"\u00D7"}</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Ticker preview */}
                {items.length > 0 && (
                  <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>PREVIEW:</div>
                    <div style={{ fontSize: 11, color: color, fontFamily: "Courier, monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {items.map(function (t) { return t.text; }).join("  ·  ")}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Link back */}
          <div style={{ textAlign: "center", paddingTop: 10 }}>
            <a href="/" style={{ color: "#4ade80", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>{"\u2190"} Back to LinkPulse</a>
          </div>
        </div>

        {/* RIGHT: Article Feed */}
        <div style={{ flex: 1, padding: "16px" }}>
          {/* Search */}
          <div style={{ marginBottom: 12 }}>
            <input value={filter} onChange={function (e) { setFilter(e.target.value); }} placeholder="Search articles..." style={{
              width: "100%", padding: "10px 14px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
              color: "#e5e7eb", fontSize: 14, outline: "none",
            }} />
          </div>

          {/* Article count */}
          <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 10 }}>
            {loading ? "Loading feeds..." : filtered.length + " articles from 32 sources"}
          </div>

          {/* Articles */}
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#4ade80" }}>Pulling live golf feeds...</div>
          ) : (
            filtered.slice(0, 100).map(function (a, i) {
              var hasImg = a.image && a.image.length > 10 && a.image.startsWith("http");
              return (
                <div key={i} style={cardStyle}>
                  <div style={{ display: "flex", gap: 10 }}>
                    {hasImg && (
                      <img src={a.image} style={{ width: 60, height: 45, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                        onError={function (e) { e.target.style.display = "none"; }} alt="" />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#e5e7eb", fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginBottom: 3 }}>{a.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ color: "#6b7280", fontSize: 10 }}>{a.feedName} · {timeAgo(a.pubDate)}</span>
                        <span style={{ background: "#15803d20", color: "#4ade80", fontSize: 9, padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>{a.feedCategory}</span>
                      </div>
                    </div>
                    {/* Ticker send buttons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                      <button onClick={function () { addToTicker(1, a); }} style={tickerBtnStyle("#4ade80")}>{"\u2192"} T1</button>
                      <button onClick={function () { addToTicker(2, a); }} style={tickerBtnStyle("#b8860b")}>{"\u2192"} T2</button>
                      <button onClick={function () { addToTicker(3, a); }} style={tickerBtnStyle("#ef4444")}>{"\u2192"} T3</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
