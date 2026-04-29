"use client";
import { useState, useEffect } from "react";

export default function TickerStation() {
  var _t1 = useState(""), t1 = _t1[0], setT1 = _t1[1];
  var _t2 = useState(""), t2 = _t2[0], setT2 = _t2[1];
  var _t3 = useState(""), t3 = _t3[0], setT3 = _t3[1];
  var _sending = useState(null), sending = _sending[0], setSending = _sending[1];
  var _copied = useState(false), copied = _copied[0], setCopied = _copied[1];
  var _showPrompt = useState(false), showPrompt = _showPrompt[0], setShowPrompt = _showPrompt[1];

  var prompt = "Search the web for this week's current PGA Tour tournament. I need 3 short ticker lines for a golf news website. Each line scrolls horizontally like a stock ticker on TV.\n\nRULES:\n- Use \u00B7 (middle dot) to separate each item\n- Keep each item SHORT \u2014 2-5 words max per item. Think ESPN bottom-line ticker, not sentences.\n- No labels like \"Line 1\" \u2014 just the raw ticker text\n- Only verified facts from this week. If a round hasn't started, say \"Rd 1 Thursday\" not scores.\n- Search multiple sources to verify accuracy before answering.\n\nLINE 1 \u2014 TODAY'S CARD (tournament info + top names):\nFormat: TOURNAMENT NAME \u00B7 Course \u00B7 City \u00B7 $Purse \u00B7 Round status \u00B7 Top 5 player last names only\nExample: CADILLAC CHAMPIONSHIP \u00B7 Trump Doral \u00B7 Miami \u00B7 $20M Purse \u00B7 Rd 1 Thursday \u00B7 Scheffler \u00B7 Young \u00B7 Rose \u00B7 Morikawa \u00B7 Fleetwood\n\nLINE 2 \u2014 COURSE INTEL (course facts + who's missing):\nFormat: Par/yardage \u00B7 Course nickname \u00B7 Key fact \u00B7 Notable OUT names\nExample: Par 72 \u00B7 7,739 yds \u00B7 Blue Monster \u00B7 No Cut \u00B7 $3.6M to winner \u00B7 McIlroy OUT \u00B7 Schauffele OUT \u00B7 \u00C5berg OUT\n\nLINE 3 \u2014 LIVE TV (broadcast schedule):\nFormat: Day: Channel Time \u00B7 Day: Channel Time \u00B7 Streaming info\nExample: Thu-Fri: Golf Ch. 3-7pm ET \u00B7 Sat-Sun: Golf Ch. 12-3pm + CBS 3-6pm \u00B7 ESPN+ all day from 8:30am\n\nReturn ONLY 3 lines. Nothing else. No intro, no explanation.";

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

  function copyPrompt() {
    navigator.clipboard.writeText(prompt).then(function () {
      setCopied(true);
      setTimeout(function () { setCopied(false); }, 3000);
    });
  }

  var tickers = [
    { label: "TODAY'S CARD", emoji: "\uD83C\uDFCC\uFE0F", color: "#4ade80", border: "#4ade8030", bg: "rgba(74,222,128,0.04)", value: t1, set: setT1, placeholder: "CADILLAC CHAMPIONSHIP \u00B7 Trump Doral \u00B7 Miami \u00B7 $20M Purse \u00B7 Scheffler \u00B7 Young \u00B7 Rose", hint: "Paste Claude's Line 1" },
    { label: "COURSE INTEL", emoji: "\u26F3", color: "#b8860b", border: "#b8860b30", bg: "rgba(184,134,11,0.04)", value: t2, set: setT2, placeholder: "Par 72 \u00B7 7,739 yds \u00B7 Blue Monster \u00B7 No Cut \u00B7 $3.6M to winner \u00B7 McIlroy OUT", hint: "Paste Claude's Line 2" },
    { label: "LIVE TV", emoji: "\uD83D\uDCFA", color: "#ef4444", border: "#ef444430", bg: "rgba(239,68,68,0.04)", value: t3, set: setT3, placeholder: "Thu-Fri: Golf Ch. 3-7pm ET \u00B7 Sat-Sun: CBS 3-6pm \u00B7 ESPN+ all day", hint: "Paste Claude's Line 3" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0f0a 0%, #0d1117 100%)", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 20px" }}>

      {/* Header */}
      <div style={{ textAlign: "center", padding: "30px 0 20px", maxWidth: 700, width: "100%" }}>
        <div style={{ fontSize: 11, color: "#b8860b", fontWeight: 800, letterSpacing: "0.2em" }}>MULLIGAN REPORT</div>
        <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 900, margin: "6px 0 0" }}>{"\uD83D\uDCE1"} Ticker Broadcast Station</h1>
        <p style={{ color: "#6b7280", fontSize: 13, margin: "8px 0 0" }}>Get ticker data from Claude, paste below, broadcast.</p>
      </div>

      <div style={{ maxWidth: 700, width: "100%" }}>

        {/* STEP 1 */}
        <div style={{ background: "rgba(74,222,128,0.04)", borderRadius: 14, padding: 20, marginBottom: 20, border: "1px solid rgba(74,222,128,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <span style={{ color: "#4ade80", fontSize: 15, fontWeight: 800 }}>STEP 1</span>
              <span style={{ color: "#9ca3af", fontSize: 13, marginLeft: 8 }}>Get current ticker data</span>
            </div>
            <button onClick={function () { setShowPrompt(!showPrompt); }} style={{
              padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(74,222,128,0.2)",
              background: "rgba(74,222,128,0.08)", color: "#4ade80", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>{showPrompt ? "Hide Prompt" : "Show Prompt"}</button>
          </div>

          {!showPrompt && (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={copyPrompt} style={{
                flex: 1, padding: "12px 20px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer",
                background: copied ? "#4ade80" : "linear-gradient(135deg, #15803d, #059669)", color: "#fff",
              }}>
                {copied ? "\u2705 Prompt Copied!" : "\uD83D\uDCCB Copy Prompt for Claude"}
              </button>
              <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" style={{
                padding: "12px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)", color: "#e5e7eb", fontSize: 14, fontWeight: 700,
                textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
              }}>Open Claude {"\u2197"}</a>
            </div>
          )}

          {showPrompt && (
            <div>
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: 14, marginBottom: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                <pre style={{ color: "#d1d5db", fontSize: 12, fontFamily: "'DM Sans', sans-serif", whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.6 }}>{prompt}</pre>
              </div>
              <button onClick={copyPrompt} style={{
                width: "100%", padding: "10px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
                background: copied ? "#4ade80" : "#15803d", color: "#fff",
              }}>
                {copied ? "\u2705 Copied!" : "\uD83D\uDCCB Copy This Prompt"}
              </button>
            </div>
          )}

          <div style={{ color: "#6b7280", fontSize: 11, marginTop: 10, lineHeight: 1.6 }}>
            {"\u2460"} Copy prompt {"\u2192"} {"\u2461"} Paste in Claude {"\u2192"} {"\u2462"} Claude gives 3 short lines {"\u2192"} {"\u2463"} Paste each line below
          </div>
        </div>

        {/* STEP 2 */}
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: "#b8860b", fontSize: 15, fontWeight: 800 }}>STEP 2</span>
          <span style={{ color: "#9ca3af", fontSize: 13, marginLeft: 8 }}>Paste the 3 lines from Claude</span>
        </div>

        {tickers.map(function (t, i) {
          return (
            <div key={i} style={{ background: t.bg, borderRadius: 14, padding: 20, marginBottom: 12, border: "1px solid " + t.border }}>
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

        {/* STEP 3 */}
        <div style={{ marginBottom: 8, marginTop: 16 }}>
          <span style={{ color: "#ef4444", fontSize: 15, fontWeight: 800 }}>STEP 3</span>
          <span style={{ color: "#9ca3af", fontSize: 13, marginLeft: 8 }}>Push live to The Mulligan Report</span>
        </div>
        <button onClick={broadcast} style={{
          width: "100%", padding: 18, borderRadius: 12, border: "none", fontWeight: 900, fontSize: 18, cursor: "pointer", marginBottom: 30,
          background: sending === "done" ? "#4ade80" : sending === "error" ? "#ef4444" : "linear-gradient(135deg, #15803d, #059669)",
          color: "#fff", boxShadow: "0 6px 24px rgba(21,128,61,0.4)", letterSpacing: "0.02em",
        }}>
          {sending === "all" ? "\uD83D\uDCE1 Broadcasting..." : sending === "done" ? "\u2705 ALL TICKERS LIVE ON TMR!" : sending === "error" ? "\u274C Failed \u2014 try again" : "\uD83D\uDCE1 Broadcast to Mulligan Report"}
        </button>

        <div style={{ textAlign: "center", paddingBottom: 40 }}>
          <a href="/" style={{ color: "#4ade80", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>{"\u2190"} Back to LinkPulse</a>
        </div>
      </div>
    </div>
  );
}
