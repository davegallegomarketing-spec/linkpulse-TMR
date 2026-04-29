"use client";
import { useState, useEffect } from "react";

export default function TickerStation() {
  // Tournament data (weekly)
  var _t = useState({
    name: "", course: "", city: "", dates: "", purse: "", par: "", yardage: "",
    round: "", field: "", defending: ""
  }), tournament = _t[0], setTournament = _t[1];

  // Course/weather data (daily)
  var _c = useState({
    temp: "", wind: "", rainChance: "", stimp: "", conditions: "", sunrise: "", sunset: ""
  }), course = _c[0], setCourse = _c[1];

  // TV schedule (weekly)
  var _tv = useState({
    thu: "", fri: "", sat: "", sun: "", streaming: ""
  }), tv = _tv[0], setTv = _tv[1];

  // Leaderboard (multiple times daily)
  var _lb = useState({
    leader1: "", score1: "", leader2: "", score2: "", leader3: "", score3: "",
    leader4: "", score4: "", leader5: "", score5: "", cutLine: "", status: ""
  }), leaderboard = _lb[0], setLeaderboard = _lb[1];

  // Breaking news (as needed)
  var _br = useState({ text: "", urgent: false }), breaking = _br[0], setBreaking = _br[1];

  // UI state
  var _status = useState({}), status = _status[0], setStatus = _status[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];

  // Load existing data on mount
  useEffect(function () {
    fetch("/api/tickers").then(function (r) { return r.json(); }).then(function (data) {
      if (data.tournament) setTournament(function (p) { return Object.assign({}, p, data.tournament); });
      if (data.course) setCourse(function (p) { return Object.assign({}, p, data.course); });
      if (data.tv) setTv(function (p) { return Object.assign({}, p, data.tv); });
      if (data.leaderboard) setLeaderboard(function (p) { return Object.assign({}, p, data.leaderboard); });
      if (data.breaking) setBreaking(function (p) { return Object.assign({}, p, data.breaking); });
      setLoading(false);
    }).catch(function () { setLoading(false); });
  }, []);

  function broadcast(section, data) {
    setStatus(function (p) { var n = {}; n[section] = "sending"; return Object.assign({}, p, n); });
    fetch("/api/tickers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: section, data: data }),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success) {
          setStatus(function (p) { var n = {}; n[section] = "live"; return Object.assign({}, p, n); });
          setTimeout(function () { setStatus(function (p) { var n = {}; n[section] = null; return Object.assign({}, p, n); }); }, 3000);
        } else {
          setStatus(function (p) { var n = {}; n[section] = "error"; return Object.assign({}, p, n); });
        }
      })
      .catch(function () {
        setStatus(function (p) { var n = {}; n[section] = "error"; return Object.assign({}, p, n); });
      });
  }

  function statusBadge(section) {
    var s = status[section];
    if (s === "sending") return "\uD83D\uDCE1 Broadcasting...";
    if (s === "live") return "\u2705 LIVE on TMR";
    if (s === "error") return "\u274C Failed";
    return null;
  }

  var inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
    color: "#e5e7eb", fontSize: 14, fontFamily: "'DM Sans', sans-serif",
    outline: "none", marginBottom: 8,
  };
  var labelStyle = { color: "#9ca3af", fontSize: 11, fontWeight: 600, marginBottom: 2, display: "block", letterSpacing: "0.05em" };
  var sectionStyle = {
    background: "rgba(0,0,0,0.3)", borderRadius: 16, padding: 24,
    marginBottom: 20, border: "1px solid rgba(255,255,255,0.06)",
  };
  var btnBase = {
    padding: "12px 28px", borderRadius: 10, border: "none", fontWeight: 800,
    fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
    color: "#fff",
  };

  function Field(props) {
    return (
      <div style={{ flex: props.flex || 1, minWidth: props.min || 120 }}>
        <label style={labelStyle}>{props.label}</label>
        <input style={inputStyle} value={props.value} placeholder={props.ph || ""}
          onChange={function (e) { props.onChange(e.target.value); }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0f0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#4ade80", fontSize: 18, fontWeight: 700 }}>Loading Broadcast Station...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0f0a 0%, #0d1117 100%)", padding: "20px 24px", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ fontSize: 13, color: "#b8860b", fontWeight: 800, letterSpacing: "0.2em", marginBottom: 6 }}>MULLIGAN REPORT</div>
        <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
          {"\uD83D\uDCE1"} Ticker Broadcast Station
        </h1>
        <p style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>
          Update tickers on The Mulligan Report. Each section broadcasts independently.
        </p>
        <a href="/" style={{ color: "#4ade80", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>&larr; Back to LinkPulse</a>
      </div>

      {/* ═══ SECTION 1: TOURNAMENT INFO (Weekly) ═══ */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 16 }}>{"\uD83C\uDFCC\uFE0F"}</span>
            <span style={{ color: "#4ade80", fontSize: 15, fontWeight: 800, marginLeft: 8 }}>TODAY'S CARD</span>
            <span style={{ color: "#6b7280", fontSize: 11, marginLeft: 8 }}>Update weekly</span>
          </div>
          {statusBadge("tournament") && <span style={{ fontSize: 12, color: status.tournament === "live" ? "#4ade80" : "#f87171" }}>{statusBadge("tournament")}</span>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Field label="TOURNAMENT" value={tournament.name} ph="Cadillac Championship" onChange={function (v) { setTournament(function (p) { return Object.assign({}, p, { name: v }); }); }} flex={2} min={200} />
          <Field label="COURSE" value={tournament.course} ph="Trump National Doral — Blue Monster" onChange={function (v) { setTournament(function (p) { return Object.assign({}, p, { course: v }); }); }} flex={2} min={200} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Field label="CITY" value={tournament.city} ph="Miami, FL" onChange={function (v) { setTournament(function (p) { return Object.assign({}, p, { city: v }); }); }} />
          <Field label="DATES" value={tournament.dates} ph="Apr 30 – May 4" onChange={function (v) { setTournament(function (p) { return Object.assign({}, p, { dates: v }); }); }} />
          <Field label="PURSE" value={tournament.purse} ph="$20M" onChange={function (v) { setTournament(function (p) { return Object.assign({}, p, { purse: v }); }); }} />
          <Field label="PAR" value={tournament.par} ph="72" onChange={function (v) { setTournament(function (p) { return Object.assign({}, p, { par: v }); }); }} />
          <Field label="YARDAGE" value={tournament.yardage} ph="7,608" onChange={function (v) { setTournament(function (p) { return Object.assign({}, p, { yardage: v }); }); }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Field label="ROUND" value={tournament.round} ph="Round 1 of 4" onChange={function (v) { setTournament(function (p) { return Object.assign({}, p, { round: v }); }); }} />
          <Field label="FIELD" value={tournament.field} ph="Top 70 FedExCup" onChange={function (v) { setTournament(function (p) { return Object.assign({}, p, { field: v }); }); }} />
          <Field label="DEFENDING" value={tournament.defending} ph="NEW EVENT" onChange={function (v) { setTournament(function (p) { return Object.assign({}, p, { defending: v }); }); }} />
        </div>
        <button onClick={function () { broadcast("tournament", tournament); }}
          style={Object.assign({}, btnBase, { background: "linear-gradient(135deg, #15803d, #059669)", marginTop: 12, boxShadow: "0 4px 16px rgba(21,128,61,0.3)" })}>
          {"\uD83D\uDCE1"} Broadcast Tournament
        </button>
      </div>

      {/* ═══ SECTION 2: COURSE INTEL (Daily) ═══ */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 16 }}>{"\u26F3"}</span>
            <span style={{ color: "#b8860b", fontSize: 15, fontWeight: 800, marginLeft: 8 }}>COURSE INTEL</span>
            <span style={{ color: "#6b7280", fontSize: 11, marginLeft: 8 }}>Update daily morning</span>
          </div>
          {statusBadge("course") && <span style={{ fontSize: 12, color: status.course === "live" ? "#4ade80" : "#f87171" }}>{statusBadge("course")}</span>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Field label="TEMP" value={course.temp} ph="82°F" onChange={function (v) { setCourse(function (p) { return Object.assign({}, p, { temp: v }); }); }} />
          <Field label="WIND" value={course.wind} ph="12 mph SE" onChange={function (v) { setCourse(function (p) { return Object.assign({}, p, { wind: v }); }); }} />
          <Field label="RAIN %" value={course.rainChance} ph="15%" onChange={function (v) { setCourse(function (p) { return Object.assign({}, p, { rainChance: v }); }); }} />
          <Field label="STIMP" value={course.stimp} ph="13.5" onChange={function (v) { setCourse(function (p) { return Object.assign({}, p, { stimp: v }); }); }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Field label="CONDITIONS" value={course.conditions} ph="Firm and fast — expect roll" onChange={function (v) { setCourse(function (p) { return Object.assign({}, p, { conditions: v }); }); }} flex={2} min={200} />
          <Field label="SUNRISE" value={course.sunrise} ph="6:47 AM" onChange={function (v) { setCourse(function (p) { return Object.assign({}, p, { sunrise: v }); }); }} />
          <Field label="SUNSET" value={course.sunset} ph="7:52 PM" onChange={function (v) { setCourse(function (p) { return Object.assign({}, p, { sunset: v }); }); }} />
        </div>
        <button onClick={function () { broadcast("course", course); }}
          style={Object.assign({}, btnBase, { background: "linear-gradient(135deg, #92400e, #b8860b)", marginTop: 12, boxShadow: "0 4px 16px rgba(184,134,11,0.3)" })}>
          {"\uD83D\uDCE1"} Broadcast Course Intel
        </button>
      </div>

      {/* ═══ SECTION 3: LIVE TV (Weekly) ═══ */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 16 }}>{"\uD83D\uDCFA"}</span>
            <span style={{ color: "#ef4444", fontSize: 15, fontWeight: 800, marginLeft: 8 }}>LIVE TV</span>
            <span style={{ color: "#6b7280", fontSize: 11, marginLeft: 8 }}>Update weekly</span>
          </div>
          {statusBadge("tv") && <span style={{ fontSize: 12, color: status.tv === "live" ? "#4ade80" : "#f87171" }}>{statusBadge("tv")}</span>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Field label="THURSDAY" value={tv.thu} ph="Golf Ch. 2-6pm · ESPN+ 8am-6pm" onChange={function (v) { setTv(function (p) { return Object.assign({}, p, { thu: v }); }); }} flex={2} min={250} />
          <Field label="FRIDAY" value={tv.fri} ph="Golf Ch. 2-6pm · ESPN+ 8am-6pm" onChange={function (v) { setTv(function (p) { return Object.assign({}, p, { fri: v }); }); }} flex={2} min={250} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Field label="SATURDAY" value={tv.sat} ph="Golf Ch. 1-3pm · CBS 3-6pm" onChange={function (v) { setTv(function (p) { return Object.assign({}, p, { sat: v }); }); }} flex={2} min={250} />
          <Field label="SUNDAY" value={tv.sun} ph="Golf Ch. 1-3pm · CBS 3-6pm" onChange={function (v) { setTv(function (p) { return Object.assign({}, p, { sun: v }); }); }} flex={2} min={250} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Field label="STREAMING" value={tv.streaming} ph="PGA Tour Live on ESPN+" onChange={function (v) { setTv(function (p) { return Object.assign({}, p, { streaming: v }); }); }} flex={2} min={250} />
        </div>
        <button onClick={function () { broadcast("tv", tv); }}
          style={Object.assign({}, btnBase, { background: "linear-gradient(135deg, #991b1b, #dc2626)", marginTop: 12, boxShadow: "0 4px 16px rgba(239,68,68,0.3)" })}>
          {"\uD83D\uDCE1"} Broadcast TV Schedule
        </button>
      </div>

      {/* ═══ SECTION 4: LEADERBOARD (Multiple times daily) ═══ */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 16 }}>{"\uD83C\uDFC6"}</span>
            <span style={{ color: "#facc15", fontSize: 15, fontWeight: 800, marginLeft: 8 }}>LEADERBOARD</span>
            <span style={{ color: "#6b7280", fontSize: 11, marginLeft: 8 }}>Update during rounds</span>
          </div>
          {statusBadge("leaderboard") && <span style={{ fontSize: 12, color: status.leaderboard === "live" ? "#4ade80" : "#f87171" }}>{statusBadge("leaderboard")}</span>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Field label="STATUS" value={leaderboard.status} ph="Round 1 — In Progress" onChange={function (v) { setLeaderboard(function (p) { return Object.assign({}, p, { status: v }); }); }} flex={2} min={200} />
          <Field label="CUT LINE" value={leaderboard.cutLine} ph="+2 (projected)" onChange={function (v) { setLeaderboard(function (p) { return Object.assign({}, p, { cutLine: v }); }); }} />
        </div>
        {[1, 2, 3, 4, 5].map(function (n) {
          return (
            <div key={n} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ color: n <= 3 ? "#facc15" : "#6b7280", fontWeight: 800, fontSize: 14, width: 24, textAlign: "center" }}>{n}</span>
              <Field label={"PLAYER " + n} value={leaderboard["leader" + n]} ph="Scheffler" onChange={function (v) { setLeaderboard(function (p) { var u = {}; u["leader" + n] = v; return Object.assign({}, p, u); }); }} flex={2} min={150} />
              <Field label="SCORE" value={leaderboard["score" + n]} ph="-8 (65)" onChange={function (v) { setLeaderboard(function (p) { var u = {}; u["score" + n] = v; return Object.assign({}, p, u); }); }} />
            </div>
          );
        })}
        <button onClick={function () { broadcast("leaderboard", leaderboard); }}
          style={Object.assign({}, btnBase, { background: "linear-gradient(135deg, #854d0e, #ca8a04)", marginTop: 12, boxShadow: "0 4px 16px rgba(202,138,4,0.3)" })}>
          {"\uD83D\uDCE1"} Broadcast Leaderboard
        </button>
      </div>

      {/* ═══ SECTION 5: BREAKING NEWS (As needed) ═══ */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 16 }}>{"\uD83D\uDEA8"}</span>
            <span style={{ color: "#ef4444", fontSize: 15, fontWeight: 800, marginLeft: 8 }}>BREAKING NEWS</span>
            <span style={{ color: "#6b7280", fontSize: 11, marginLeft: 8 }}>As it happens</span>
          </div>
          {statusBadge("breaking") && <span style={{ fontSize: 12, color: status.breaking === "live" ? "#4ade80" : "#f87171" }}>{statusBadge("breaking")}</span>}
        </div>
        <Field label="BREAKING TICKER TEXT" value={breaking.text} ph="McILROY WITHDRAWS — BACK INJURY..." onChange={function (v) { setBreaking(function (p) { return Object.assign({}, p, { text: v }); }); }} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={breaking.urgent} onChange={function (e) { setBreaking(function (p) { return Object.assign({}, p, { urgent: e.target.checked }); }); }} />
          <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 700 }}>URGENT (red flash on ticker)</span>
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={function () { broadcast("breaking", breaking); }}
            style={Object.assign({}, btnBase, { background: "linear-gradient(135deg, #991b1b, #dc2626)", boxShadow: "0 4px 16px rgba(239,68,68,0.3)" })}>
            {"\uD83D\uDEA8"} Broadcast Breaking
          </button>
          <button onClick={function () { broadcast("breaking", { text: "", urgent: false }); setBreaking({ text: "", urgent: false }); }}
            style={Object.assign({}, btnBase, { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#6b7280" })}>
            Clear Breaking
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "20px 0", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 20 }}>
        <p style={{ color: "#4b5563", fontSize: 11 }}>Ticker Broadcast Station — The Mulligan Report</p>
        <p style={{ color: "#374151", fontSize: 10 }}>Each broadcast updates live on mulligan-report-drudge.vercel.app</p>
      </div>
    </div>
  );
}
