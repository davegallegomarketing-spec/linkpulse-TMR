"use client";
import { useState, useEffect } from "react";

export default function TickerStation() {
  var _t1 = useState(""), t1 = _t1[0], setT1 = _t1[1];
  var _t2 = useState(""), t2 = _t2[0], setT2 = _t2[1];
  var _t3 = useState(""), t3 = _t3[0], setT3 = _t3[1];
  var _sending = useState(null), sending = _sending[0], setSending = _sending[1];

  // Load existing
  useEffect(function () {
    fetch("/api/tickers")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && !data.error) {
          if (data.ticker1 && data.ticker1.text) setT1(data.ticker1.text);
          if (data.ticker2 && data.ticker2.text) setT2(data.ticker2.text);
          if (data.ticker3 && data.ticker3.text) setT3(data.ticker3.text);
        }
      })
      .catch(function () {});
  }, []);

  function broadcast() {
    setSending("all");
    fetch("/api/tickers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "all",
        data: {
          ticker1: { text: t1 },
          ticker2: { text: t2 },
          ticker3: { text: t3 },
        },
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        setSending(res.success ? "done" : "error");
        setTimeout(function () { setSending(null); }, 4000);
      })
      .catch(function () { setSending("error"); setTimeout(function () { setSending(null); }, 3000); });
  }

  var tickers = [
    { label: "TODAY'S CARD", emoji: "\uD83C\uDFCC\uFE0F", color: "#4ade80", border: "#4ade8030", bg: "rgba(74,222,128,0.04)", value: t1, set: setT1, placeholder: "Cadillac Championship \u00B7 Trump Doral \u00B7 $20M \u00B7 Round 1 \u00B7 Scheffler -8 leads", hint: "Tournament, course, scores, matchups" },
    { label: "COURSE INTEL", emoji: "\u26F3", color: "#b8860b", border: "#b8860b30", bg: "rgba(184,134,11,0.04)", value: t2, set: setT2, placeholder: "82\u00B0F \u00B7 Wind 12mph SE \u00B7 15% rain \u00B7 Stimp 13.5 \u00B7 Firm and fast", hint: "Weather, wind, greens, conditions" },
    { label: "LIVE TV", emoji: "\uD83D\uDCFA", color: "#ef4444", border: "#ef444430", bg: "rgba(239,68,68,0.04)", value: t3, set: setT3, placeholder: "Thu-Fri: Golf Ch. 2-6pm \u00B7 Sat-Sun: CBS 3-6pm \u00B7 ESPN+ all day", hint: "Channels, times, streaming" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0f0a 0%, #0d1117 100%)", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 20px" }}>

      {/* Header */}
      <div style={{ textAlign: "center", padding: "40px 0 30px", maxWidth: 700, width: "100%" }}>
        <div style={{ fontSize: 11, color: "#b8860b", fontWeight: 800, letterSpacing: "0.2em" }}>MULLIGAN REPORT</div>
        <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 900, margin: "6px 0 0" }}>{"\uD83D\uDCE1"} Ticker Broadcast Station</h1>
        <p style={{ color: "#6b7280", fontSize: 13, margin: "8px 0 0" }}>Three tickers. Type one line each. Hit broadcast.</p>
      </div>

      {/* Tickers */}
      <div style={{ maxWidth: 700, width: "100%" }}>
        {tickers.map(function (t, i) {
          return (
            <div key={i} style={{ background: t.bg, borderRadius: 14, padding: 20, marginBottom: 16, border: "1px solid " + t.border }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>{t.emoji}</span>
                <span style={{ color: t.color, fontSize: 16, fontWeight: 800 }}>{t.label}</span>
                <span style={{ color: "#4b5563", fontSize: 11, marginLeft: "auto" }}>{t.hint}</span>
              </div>
              <input value={t.value} onChange={function (e) { t.set(e.target.value); }}
                placeholder={t.placeholder}
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: 10,
                  border: "2px solid " + t.border, background: "rgba(0,0,0,0.3)",
                  color: "#fff", fontSize: 15, fontFamily: "'DM Sans', sans-serif",
                  outline: "none",
                }} />
              {t.value && (
                <div style={{ marginTop: 10, padding: "8px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 8, overflow: "hidden", whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 9, color: "#6b7280", marginRight: 8 }}>SCROLLS AS:</span>
                  <span style={{ color: t.color, fontSize: 13, fontFamily: "Courier, monospace" }}>{t.value}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Broadcast */}
        <button onClick={broadcast} style={{
          width: "100%", padding: 18, borderRadius: 12, border: "none", fontWeight: 900, fontSize: 18, cursor: "pointer", marginTop: 8, marginBottom: 30,
          background: sending === "done" ? "#4ade80" : sending === "error" ? "#ef4444" : "linear-gradient(135deg, #15803d, #059669)",
          color: "#fff", boxShadow: "0 6px 24px rgba(21,128,61,0.4)", letterSpacing: "0.02em",
        }}>
          {sending === "all" ? "\uD83D\uDCE1 Broadcasting..." : sending === "done" ? "\u2705 ALL TICKERS LIVE ON TMR!" : sending === "error" ? "\u274C Failed — try again" : "\uD83D\uDCE1 Broadcast to Mulligan Report"}
        </button>

        <div style={{ textAlign: "center", paddingBottom: 40 }}>
          <a href="/" style={{ color: "#4ade80", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>{"\u2190"} Back to LinkPulse</a>
        </div>
      </div>
    </div>
  );
}
