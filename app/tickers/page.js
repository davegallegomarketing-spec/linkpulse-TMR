"use client";
import { useState } from "react";

export default function TickerStation() {
  var _t1 = useState(""), t1 = _t1[0], setT1 = _t1[1];
  var _t2 = useState(""), t2 = _t2[0], setT2 = _t2[1];
  var _t3 = useState(""), t3 = _t3[0], setT3 = _t3[1];
  var _sending = useState(null), sending = _sending[0], setSending = _sending[1];
  var _copied = useState(false), copied = _copied[0], setCopied = _copied[1];
  var _showPrompt = useState(false), showPrompt = _showPrompt[0], setShowPrompt = _showPrompt[1];

  var prompt = "OUTPUT FORMAT — READ FIRST:\n- Reply with plain text only. Exactly 3 lines. Nothing else.\n- Do NOT create artifacts, code blocks, canvases, HTML, or files.\n- Do NOT write any intro, explanation, summary, or closing remark.\n- Do NOT use markdown, headers, bold, or bullet points.\n- Just 3 raw lines separated by blank lines, ready to copy-paste.\n- Web search is allowed and expected — but the final reply is plain text only.\n- Start your reply with the first ticker item directly. No preamble.\n\nEMOJI STYLING (REQUIRED):\n- Sprinkle relevant emojis throughout each line next to the items they describe.\n- Use them for visual rhythm so the ticker reads like a scoreboard, not a wall of text.\n- Examples by category:\n  • Tournament/trophy: 🏆 🏌️ ⛳\n  • Location: 📍 🌎\n  • Dates/time: 📅 🕐\n  • Money: 💰 💵\n  • Points/stats: 🎯 📊\n  • Round status: 🟢 🔴 ⏱️\n  • Field/players: 👥 👑 ⭐\n  • Betting/odds: 💸 📈\n  • Weather: ☀️ 🌤️ 🌧️ 💨 🌡️\n  • Course: 🌱 🏛️ 🛠️\n  • TV/streaming: 📺 📡 🎙️ 📻\n  • Absences/news: ❌ 🚨 🔥\n- Don't overdo it — roughly one emoji per item or every other item.\n\nTASK:\nSearch the web for this week's current PGA Tour tournament and give me 3 ticker lines for a golf news website. These scroll horizontally like ESPN's bottom line on TV. Each line must be LONG — at least 20 items per line so the ticker fills the full screen before repeating.\n\nRULES:\n- Use · (middle dot) to separate each item\n- Keep each individual item short (2-6 words) but include MANY items per line (20+ items minimum)\n- No labels like \"Line 1\" — just the raw ticker text\n- Search multiple sources to verify every fact. Only real, confirmed data.\n- If a round hasn't started yet, say \"Rd 1 Thursday\" not fake scores. If rounds are in progress or completed, include actual leaderboard scores.\n- ALL CAPS for tournament name and player last names\n\nLINE 1 — TODAY'S CARD (tournament + field + storylines):\nInclude ALL of these: Tournament name · Course name · City, State · Dates · Purse · Winner's share · FedExCup points · Round status · Signature Event or regular · Defending champion or NEW EVENT · Field size · Cut or No Cut · Betting favorite + odds · Top 8-10 players in the field (last names only, ALL CAPS) · Any major storylines (comeback, streak, rivalry) · Days until next major + major name · Current FedExCup leader\nExample: 🏆 CADILLAC CHAMPIONSHIP · ⛳ Trump National Doral · 📍 Miami, FL · 📅 Apr 30-May 3 · 💰 $20M Purse · 💵 $3.6M to Winner · 🎯 700 FedExCup Pts · 🟢 Rd 1 Thursday · ⭐ Signature Event · 🆕 NEW EVENT · 👥 72 Players · ✂️ No Cut · 💸 SCHEFFLER Fav +400 · 👑 SCHEFFLER · YOUNG · ROSE · MORIKAWA · FLEETWOOD · BURNS · MATSUYAMA · GOTTERUP · A. FITZPATRICK · 🔥 First PGA Tour Event at Doral Since 2016 · ⏳ PGA Championship 15 Days · 📈 FedExCup Leader: SCHEFFLER\n\nLINE 2 — COURSE INTEL (course + conditions + absences + history):\nInclude ALL of these: Par · Yardage · Course nickname · Course designer · Renovation info · Signature holes · Course record if known · Key stat (driving accuracy or GIR importance) · Weather forecast (temp, wind, rain chance) for round day · Greens type · ALL notable absences with \"OUT\" · Last winner at this course + year · Any course fun fact\nExample: ⛳ Par 72 · 📏 7,739 Yards · 🐉 Blue Monster · 🛠️ Gil Hanse Renovation · 🏛️ Dick Wilson Design · 🎯 Signature Hole: 18th · 🌱 TifEagle Bermuda Greens · 🎯 Driving Accuracy Key · 🌡️ 84°F · 💨 Wind 12mph SE · 🌧️ 20% Rain · ❌ McILROY OUT · ❌ SCHAUFFELE OUT · ❌ ÅBERG OUT · ❌ M. FITZPATRICK OUT · ❌ MacINTYRE OUT · 🏆 Last Winner: Adam Scott 2016 · 📊 Blue Monster Has Hosted 56 PGA Tour Events\n\nLINE 3 — LIVE TV (full broadcast schedule + streaming + radio):\nInclude ALL of these: Each day's TV schedule with channel + exact times ET · Streaming platform + times · PGA Tour Live details · Radio info (SiriusXM) · International coverage if available · Featured groups/marquee pairings info · Betcast info\nExample: 📺 Thu Apr 30: GOLF CH. 3-7pm ET · 📺 Fri May 1: GOLF CH. 3-7pm ET · 📺 Sat May 2: GOLF CH. 12-3pm + CBS 3-6pm ET · 📺 Sun May 3: GOLF CH. 12-3pm + CBS 3-6pm ET · 📡 ESPN+ from 8:30am Thu-Fri · 📡 ESPN+ from 7:30am Sat-Sun · 🎥 PGA TOUR LIVE: 4 Streams on ESPN+ · ⭐ Featured Group: SCHEFFLER + YOUNG · 📻 SiriusXM PGA Tour Radio: Thu-Fri 1-7pm · 💸 Betcast on ESPN+ All Week · 📺 Paramount+ Simulcast · 🇬🇧 Sky Sports Golf for UK\n\nFINAL OUTPUT: 3 plain-text lines with emojis. No code. No artifacts. No commentary. Start your reply with the first ticker item directly.";

  // Textareas start empty on every page load.
  // The previous version pre-filled them from /api/tickers — removed so it's
  // easy to paste fresh lines without clearing old text first.

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
    { label: "TODAY'S CARD", emoji: "\uD83C\uDFCC\uFE0F", color: "#4ade80", border: "#4ade8030", bg: "rgba(74,222,128,0.04)", value: t1, set: setT1, placeholder: "CADILLAC CHAMPIONSHIP \u00B7 Trump Doral \u00B7 Miami \u00B7 $20M Purse \u00B7 Rd 1 Thursday \u00B7 SCHEFFLER \u00B7 YOUNG...", hint: "Paste Claude's Line 1" },
    { label: "COURSE INTEL", emoji: "\u26F3", color: "#b8860b", border: "#b8860b30", bg: "rgba(184,134,11,0.04)", value: t2, set: setT2, placeholder: "Par 72 \u00B7 7,739 yds \u00B7 Blue Monster \u00B7 84\u00B0F \u00B7 Wind 12mph \u00B7 McILROY OUT \u00B7 Adam Scott 2016...", hint: "Paste Claude's Line 2" },
    { label: "LIVE TV", emoji: "\uD83D\uDCFA", color: "#ef4444", border: "#ef444430", bg: "rgba(239,68,68,0.04)", value: t3, set: setT3, placeholder: "Thu: GOLF CH. 3-7pm \u00B7 Sat: GOLF CH. 12-3pm + CBS 3-6pm \u00B7 ESPN+ 8:30am \u00B7 4 Streams...", hint: "Paste Claude's Line 3" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0f0a 0%, #0d1117 100%)", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 20px" }}>

      {/* Header */}
      <div style={{ textAlign: "center", padding: "30px 0 20px", maxWidth: 700, width: "100%" }}>
        <div style={{ fontSize: 11, color: "#b8860b", fontWeight: 800, letterSpacing: "0.2em" }}>MULLIGAN REPORT</div>
        <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 900, margin: "6px 0 0" }}>{"\uD83D\uDCE1"} Ticker Broadcast Station</h1>
        <p style={{ color: "#6b7280", fontSize: 13, margin: "8px 0 0" }}>Copy prompt \u2192 paste in Claude \u2192 get 3 lines \u2192 paste below \u2192 broadcast.</p>
      </div>

      <div style={{ maxWidth: 700, width: "100%" }}>

        {/* STEP 1 */}
        <div style={{ background: "rgba(74,222,128,0.04)", borderRadius: 14, padding: 20, marginBottom: 20, border: "1px solid rgba(74,222,128,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <span style={{ color: "#4ade80", fontSize: 15, fontWeight: 800 }}>STEP 1</span>
              <span style={{ color: "#9ca3af", fontSize: 13, marginLeft: 8 }}>Get current ticker data from Claude</span>
            </div>
            <button onClick={function () { setShowPrompt(!showPrompt); }} style={{
              padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(74,222,128,0.2)",
              background: "rgba(74,222,128,0.08)", color: "#4ade80", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>{showPrompt ? "Hide Prompt" : "View Prompt"}</button>
          </div>

          {!showPrompt && (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={copyPrompt} style={{
                flex: 1, padding: "12px 20px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer",
                background: copied ? "#4ade80" : "linear-gradient(135deg, #15803d, #059669)", color: "#fff",
              }}>
                {copied ? "\u2705 Prompt Copied! Now paste in Claude" : "\uD83D\uDCCB Copy Prompt for Claude"}
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
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: 14, marginBottom: 10, border: "1px solid rgba(255,255,255,0.06)", maxHeight: 300, overflowY: "auto" }}>
                <pre style={{ color: "#d1d5db", fontSize: 11, fontFamily: "'DM Sans', sans-serif", whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.5 }}>{prompt}</pre>
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
            {"\u2460"} Copy prompt {"\u2192"} {"\u2461"} Paste in Claude chat {"\u2192"} {"\u2462"} Claude returns 3 long lines {"\u2192"} {"\u2463"} Paste each line below
          </div>
        </div>

        {/* STEP 2 */}
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: "#b8860b", fontSize: 15, fontWeight: 800 }}>STEP 2</span>
          <span style={{ color: "#9ca3af", fontSize: 13, marginLeft: 8 }}>Paste the 3 lines from Claude</span>
        </div>

        {tickers.map(function (t, i) {
          var charCount = t.value ? t.value.length : 0;
          return (
            <div key={i} style={{ background: t.bg, borderRadius: 14, padding: 20, marginBottom: 12, border: "1px solid " + t.border }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>{t.emoji}</span>
                <span style={{ color: t.color, fontSize: 16, fontWeight: 800 }}>{t.label}</span>
                <span style={{ color: "#4b5563", fontSize: 11, marginLeft: "auto" }}>{t.hint}</span>
              </div>
              <textarea value={t.value} onChange={function (e) { t.set(e.target.value); }}
                placeholder={t.placeholder}
                rows={3}
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: 10,
                  border: "2px solid " + t.border, background: "rgba(0,0,0,0.3)",
                  color: "#fff", fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                  outline: "none", resize: "vertical", lineHeight: 1.5,
                }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 10, color: charCount > 150 ? "#4ade80" : "#ef4444" }}>{charCount} chars {charCount < 150 ? "\u2014 too short, need 150+" : "\u2714 good length"}</span>
                <span style={{ fontSize: 10, color: "#4b5563" }}>{t.value ? t.value.split("\u00B7").length : 0} items</span>
              </div>
              {t.value && (
                <div style={{ marginTop: 8, padding: "8px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 8, overflow: "hidden", whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 9, color: "#6b7280", marginRight: 8 }}>SCROLLS AS:</span>
                  <span style={{ color: t.color, fontSize: 12, fontFamily: "Courier, monospace" }}>{t.value}</span>
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
