import { useState, useEffect, useRef, useMemo } from "react";

var T = {
  bg: "#212127", panel: "#2a2a31", card: "#31313a", border: "#3a3a44",
  text: "#d1d1da", muted: "#8e8e9a", dim: "#5e5e6a", white: "#ededf2",
  green: "#5bce8a", red: "#e8696a", accent: "#7c8af4", yellow: "#eab34d",
};

export default function App() {
  var [stocks, setStocks] = useState({});
  var [market, setMarket] = useState(null);
  var [events, setEvents] = useState([]);
  var [sectors, setSectors] = useState({});
  var [selected, setSelected] = useState(null);
  var [detail, setDetail] = useState(null);
  var [search, setSearch] = useState("");
  var [filter, setFilter] = useState("all");
  var [sort, setSort] = useState("ticker");
  var [page, setPage] = useState("market");

  var fetchAll = function() {
    Promise.all([
      fetch("/api/market").then(function(r) { return r.json(); }),
      fetch("/api/stocks").then(function(r) { return r.json(); }),
      fetch("/api/events?limit=6").then(function(r) { return r.json(); }),
      fetch("/api/sectors").then(function(r) { return r.json(); }),
    ]).then(function(results) {
      setMarket(results[0]); setStocks(results[1]); setEvents(results[2]); setSectors(results[3]);
    }).catch(function(e) { console.error("Fetch error:", e); });
  };

  var fetchDetail = function(ticker) {
    fetch("/api/stocks/" + ticker)
      .then(function(r) { return r.json(); })
      .then(function(data) { setDetail(data); setSelected(ticker); setPage("stock"); })
      .catch(function(e) { console.error(e); });
  };

  useEffect(function() { fetchAll(); var id = setInterval(fetchAll, 3000); return function() { clearInterval(id); }; }, []);
  useEffect(function() { if (selected && page === "stock") { var id = setInterval(function() { fetchDetail(selected); }, 3000); return function() { clearInterval(id); }; } }, [selected, page]);

  var sorted = useMemo(function() {
    var entries = Object.entries(stocks);
    if (search) { var q = search.toLowerCase(); entries = entries.filter(function(e) { return e[0].toLowerCase().includes(q) || e[1].name.toLowerCase().includes(q) || e[1].sector.includes(q); }); }
    else if (filter !== "all") { entries = entries.filter(function(e) { return e[1].sector === filter; }); }
    if (sort === "price") entries.sort(function(a, b) { return b[1].price - a[1].price; });
    else if (sort === "change") entries.sort(function(a, b) { return b[1].change - a[1].change; });
    else if (sort === "volume") entries.sort(function(a, b) { return b[1].volume - a[1].volume; });
    else entries.sort(function(a, b) { return a[0].localeCompare(b[0]); });
    return entries;
  }, [stocks, search, filter, sort]);

  var sectorList = useMemo(function() { return Object.entries(sectors).sort(function(a, b) { return b[1].avgChange - a[1].avgChange; }); }, [sectors]);

  if (!market) return <div style={{ background: T.bg, color: T.muted, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>Loading POLYMART...</div>;

  var idxUp = (market.indexChange || 0) >= 0;
  var idxPct = market.index > 0 ? ((market.indexChange || 0) / market.index * 100).toFixed(2) : "0.00";

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: T.bg, color: T.text, minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{"* { box-sizing: border-box; margin: 0; padding: 0 } ::-webkit-scrollbar { width: 4px } ::-webkit-scrollbar-thumb { background: " + T.border + "; border-radius: 2px } .r:hover { background: " + T.card + " !important }"}</style>

      <div style={{ borderBottom: "1px solid " + T.border, padding: "0 22px", display: "flex", alignItems: "center", height: 50 }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: T.white, marginRight: 20 }}>POLYMART</span>
        <span style={{ fontSize: 10, color: T.green, background: "rgba(91,206,138,.08)", padding: "3px 8px", borderRadius: 8, marginRight: 20 }}>● Live</span>
        {["market", "api"].map(function(v) {
          var active = page === v || (page === "stock" && v === "market");
          return <button key={v} onClick={function() { setPage(v); setSelected(null); }} style={{ height: "100%", padding: "0 16px", background: "none", border: "none", color: active ? T.white : T.dim, fontSize: 13, cursor: "pointer", fontFamily: "inherit", borderBottom: active ? "2px solid " + T.accent : "2px solid transparent" }}>{v === "market" ? "Market" : "API Docs"}</button>;
        })}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 10, color: T.dim }}>INDEX</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: T.white, fontFamily: "'DM Mono', monospace" }}>{market.index.toFixed(0)}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: idxUp ? T.green : T.red, fontFamily: "'DM Mono', monospace" }}>{idxUp ? "+" : ""}{idxPct}%</span>
          <span style={{ margin: "0 6px", width: 1, height: 18, background: T.border, display: "inline-block" }} />
          <span style={{ fontSize: 12, color: market.fearGreed > 55 ? T.green : market.fearGreed < 45 ? T.red : T.yellow }}>F&G: {market.fearGreed}</span>
          <span style={{ fontSize: 10, color: T.dim }}>#{market.tickCount}</span>
        </div>
      </div>

      {events.length > 0 && page !== "api" && (
        <div style={{ borderBottom: "1px solid " + T.border, padding: "8px 22px", display: "flex", gap: 24, overflow: "hidden" }}>
          {events.slice(-4).reverse().map(function(e, i) {
            return <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, opacity: 1 - i * 0.2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: e.effect >= 0 ? T.green : T.red, background: e.effect >= 0 ? "rgba(91,206,138,.1)" : "rgba(232,105,106,.1)", padding: "2px 5px", borderRadius: 3 }}>{e.effect >= 0 ? "▲" : "▼"}</span>
              <span style={{ fontSize: 12, color: T.text }}>{e.text}</span>
              {e.weight >= 3 && <span style={{ fontSize: 9, color: T.yellow, fontWeight: 600 }}>HIGH IMPACT</span>}
            </div>;
          })}
        </div>
      )}

      <div style={{ padding: "18px 22px", maxWidth: 1140, margin: "0 auto" }}>
        {page === "market" && (
          <div style={{ display: "flex", gap: 18 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                <input value={search} onChange={function(e) { setSearch(e.target.value); if (e.target.value) setFilter("all"); }} placeholder="Search stocks..." style={{ flex: "1 1 200px", maxWidth: 300, background: T.card, color: T.text, border: "1px solid " + T.border, borderRadius: 7, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                <select value={filter} onChange={function(e) { setFilter(e.target.value); setSearch(""); }} style={{ background: T.card, color: T.text, border: "1px solid " + T.border, borderRadius: 7, padding: "7px 10px", fontSize: 12, fontFamily: "inherit", outline: "none" }}>
                  <option value="all">All Sectors</option>
                  {sectorList.map(function(entry) { return <option key={entry[0]} value={entry[0]}>{entry[1].icon} {entry[1].label}</option>; })}
                </select>
                <select value={sort} onChange={function(e) { setSort(e.target.value); }} style={{ background: T.card, color: T.text, border: "1px solid " + T.border, borderRadius: 7, padding: "7px 10px", fontSize: 12, fontFamily: "inherit", outline: "none" }}>
                  <option value="ticker">Sort: Ticker</option><option value="price">Sort: Price</option><option value="change">Sort: Change</option><option value="volume">Sort: Volume</option>
                </select>
                <span style={{ fontSize: 11, color: T.dim, marginLeft: "auto" }}>{sorted.length} stocks</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr>{["Ticker", "Name", "Price", "Change", "Volume", "52w Range", ""].map(function(h, i) {
                  return <th key={i} style={{ padding: "7px 10px", textAlign: i >= 2 && i <= 4 ? "right" : i === 5 ? "center" : "left", color: T.dim, fontSize: 10, fontWeight: 500, letterSpacing: 0.8, textTransform: "uppercase", borderBottom: "1px solid " + T.border, width: i === 5 ? 130 : undefined }}>{h}</th>;
                })}</tr></thead>
                <tbody>{sorted.map(function(entry) {
                  var t = entry[0], s = entry[1], up = s.change >= 0;
                  var rng = (s.hi52w || 0) - (s.lo52w || 0), pos = rng > 0 ? (s.price - s.lo52w) / rng * 100 : 50;
                  return <tr key={t} className="r" onClick={function() { fetchDetail(t); }} style={{ cursor: "pointer", transition: "background .1s" }}>
                    <td style={{ padding: "9px 10px", borderBottom: "1px solid " + T.bg, fontWeight: 600, color: T.white, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{t}</td>
                    <td style={{ padding: "9px 10px", borderBottom: "1px solid " + T.bg, color: T.muted, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</td>
                    <td style={{ padding: "9px 10px", borderBottom: "1px solid " + T.bg, textAlign: "right", fontWeight: 600, color: T.white, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{s.price.toFixed(2)}</td>
                    <td style={{ padding: "9px 10px", borderBottom: "1px solid " + T.bg, textAlign: "right", fontWeight: 600, color: up ? T.green : T.red, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{up ? "+" : ""}{s.change.toFixed(2)}%</td>
                    <td style={{ padding: "9px 10px", borderBottom: "1px solid " + T.bg, textAlign: "right", color: T.dim, fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{s.volume > 1e6 ? (s.volume / 1e6).toFixed(1) + "M" : s.volume > 1e3 ? (s.volume / 1e3).toFixed(0) + "K" : s.volume}</td>
                    <td style={{ padding: "9px 10px", borderBottom: "1px solid " + T.bg, width: 130 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 9, color: T.dim, fontFamily: "'DM Mono', monospace", minWidth: 30, textAlign: "right" }}>{(s.lo52w || 0).toFixed(0)}</span>
                        <div style={{ flex: 1, height: 4, background: T.bg, borderRadius: 2, position: "relative" }}>
                          <div style={{ position: "absolute", left: Math.max(0, Math.min(100, pos)) + "%", top: -2, width: 8, height: 8, borderRadius: "50%", background: pos > 80 ? T.green : pos < 20 ? T.red : T.accent, transform: "translateX(-50%)", border: "1.5px solid " + T.card }} />
                        </div>
                        <span style={{ fontSize: 9, color: T.dim, fontFamily: "'DM Mono', monospace", minWidth: 30 }}>{(s.hi52w || 0).toFixed(0)}</span>
                      </div>
                    </td>
                    <td style={{ padding: "9px 10px", borderBottom: "1px solid " + T.bg, width: 50, textAlign: "center" }}><span style={{ fontSize: 11, color: T.accent }}>→</span></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            <div style={{ width: 210, flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: T.dim, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Sectors</div>
              {sectorList.map(function(entry) {
                var k = entry[0], v = entry[1], up = v.avgChange >= 0;
                var mx = Math.max(0.1, ...sectorList.map(function(e) { return Math.abs(e[1].avgChange); }));
                var bw = Math.min(100, (Math.abs(v.avgChange) / mx) * 100);
                return <div key={k} onClick={function() { setFilter(k === filter ? "all" : k); setSearch(""); }} style={{ padding: "8px 10px", marginBottom: 4, background: filter === k ? T.card : T.panel, borderRadius: 6, border: "1px solid " + (filter === k ? T.accent + "44" : T.border), cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12 }}>{v.icon} {v.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: up ? T.green : T.red, fontFamily: "'DM Mono', monospace" }}>{up ? "+" : ""}{v.avgChange.toFixed(2)}%</span>
                  </div>
                  <div style={{ height: 3, background: T.bg, borderRadius: 2, overflow: "hidden" }}><div style={{ width: bw + "%", height: "100%", background: up ? T.green : T.red, borderRadius: 2 }} /></div>
                </div>;
              })}
              <div style={{ marginTop: 12, fontSize: 10, color: T.dim, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Macro</div>
              {[["Interest Rate", market.interestRate + "%"], ["Inflation", market.inflation + "%"], ["GDP Growth", market.gdpGrowth + "%"]].map(function(pair, i) {
                return <div key={i} style={{ padding: "6px 10px", background: T.panel, borderRadius: 5, display: "flex", justifyContent: "space-between", border: "1px solid " + T.border, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: T.muted }}>{pair[0]}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.white, fontFamily: "'DM Mono', monospace" }}>{pair[1]}</span>
                </div>;
              })}
            </div>
          </div>
        )}

        {page === "stock" && detail && (
          <div>
            <button onClick={function() { setPage("market"); }} style={{ background: "none", border: "none", color: T.accent, cursor: "pointer", fontFamily: "inherit", fontSize: 13, marginBottom: 14, padding: 0 }}>← Back to market</button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: T.white, fontFamily: "'DM Mono', monospace" }}>{detail.ticker}</span>
                  <span style={{ fontSize: 16, color: T.muted }}>{detail.name}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  {[detail.sector, "Cap: " + detail.mcap, "Vol: " + (detail.volatility * 100).toFixed(0) + "%"].map(function(l, i) {
                    return <span key={i} style={{ fontSize: 11, color: T.dim, background: T.card, padding: "3px 10px", borderRadius: 5 }}>{l}</span>;
                  })}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: T.white, fontFamily: "'DM Mono', monospace" }}>{detail.price.toFixed(2)}</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: detail.change >= 0 ? T.green : T.red, fontFamily: "'DM Mono', monospace" }}>{detail.change >= 0 ? "+" : ""}{detail.change.toFixed(2)}%</div>
              </div>
            </div>
            {detail.history && <ChartCanvas data={detail.history} />}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 8, marginTop: 20 }}>
              {[["Current Price", detail.price.toFixed(2), null], ["Previous", detail.previousPrice.toFixed(2), null], ["Tick Change", (detail.change >= 0 ? "+" : "") + detail.change.toFixed(2) + "%", detail.change >= 0 ? T.green : T.red], ["Open", detail.openPrice.toFixed(2), null], ["Since Open", (detail.changeSinceOpen >= 0 ? "+" : "") + detail.changeSinceOpen.toFixed(2) + "%", detail.changeSinceOpen >= 0 ? T.green : T.red], ["52w High", detail.high52w.toFixed(2), null], ["52w Low", detail.low52w.toFixed(2), null], ["ATH", detail.allTimeHigh.toFixed(2), null], ["Volume", detail.volume > 1e6 ? (detail.volume / 1e6).toFixed(1) + "M" : detail.volume > 1e3 ? (detail.volume / 1e3).toFixed(0) + "K" : String(detail.volume), null], ["RSI", detail.rsi.toFixed(1), detail.rsi > 70 ? T.red : detail.rsi < 30 ? T.green : T.yellow], ["Momentum", detail.momentum.toFixed(4), detail.momentum > 0 ? T.green : detail.momentum < 0 ? T.red : T.muted], ["Streak", (detail.streak > 0 ? "▲ " : detail.streak < 0 ? "▼ " : "- ") + Math.abs(detail.streak), detail.streak > 0 ? T.green : detail.streak < 0 ? T.red : T.muted]].map(function(row, i) {
                return <div key={i} style={{ padding: "10px 14px", background: T.card, borderRadius: 7 }}>
                  <div style={{ fontSize: 10, color: T.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{row[0]}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: row[2] || T.white, fontFamily: "'DM Mono', monospace" }}>{row[1]}</div>
                </div>;
              })}
            </div>
            {detail.high52w != null && (
              <div style={{ marginTop: 16, padding: 14, background: T.card, borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: T.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>52-Week Range</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: T.muted, fontFamily: "'DM Mono', monospace" }}>{detail.low52w.toFixed(2)}</span>
                  <div style={{ flex: 1, height: 6, background: T.bg, borderRadius: 3, position: "relative" }}>
                    {(function() { var rng = detail.high52w - detail.low52w; var pos = rng > 0 ? (detail.price - detail.low52w) / rng * 100 : 50; return <div style={{ position: "absolute", left: pos + "%", top: -3, width: 12, height: 12, borderRadius: "50%", background: T.accent, transform: "translateX(-50%)", border: "2px solid " + T.card }} />; })()}
                  </div>
                  <span style={{ fontSize: 12, color: T.muted, fontFamily: "'DM Mono', monospace" }}>{detail.high52w.toFixed(2)}</span>
                </div>
              </div>
            )}
            {detail.sectorPeers && detail.sectorPeers.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, color: T.dim, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Sector Peers</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {detail.sectorPeers.map(function(pt) { var s = stocks[pt]; return <div key={pt} onClick={function() { fetchDetail(pt); }} className="r" style={{ padding: "8px 12px", background: T.panel, borderRadius: 6, border: "1px solid " + T.border, cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.white, fontFamily: "'DM Mono', monospace" }}>{pt}</span>
                      {s && <span style={{ fontSize: 11, fontWeight: 600, color: s.change >= 0 ? T.green : T.red, fontFamily: "'DM Mono', monospace" }}>{s.change >= 0 ? "+" : ""}{s.change.toFixed(2)}%</span>}
                    </div>
                    {s && <div style={{ fontSize: 13, color: T.white, fontFamily: "'DM Mono', monospace" }}>{s.price.toFixed(2)}</div>}
                  </div>; })}
                </div>
              </div>
            )}
          </div>
        )}

        {page === "api" && (
          <div style={{ maxWidth: 700 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.white, marginBottom: 6 }}>API Documentation</div>
            <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.7, marginBottom: 20 }}>All endpoints return JSON. Simulation ticks every 3 seconds server-side.</p>
            {[{m:"GET",p:"/api/market",d:"Market overview - index, fear/greed, macro indicators, top movers"},{m:"GET",p:"/api/stocks",d:"All 60 stocks - price, change, volume, RSI, 52w range, sector"},{m:"GET",p:"/api/stocks/:ticker",d:"Full stock detail - history array, momentum, insider bias, peers"},{m:"GET",p:"/api/events?limit=N",d:"Recent market events with effect magnitude and sector tags"},{m:"GET",p:"/api/sectors",d:"Sector performance - avg change, news stack, momentum, tickers"},{m:"GET",p:"/api/health",d:"Server health check - uptime, tick count, stock count"}].map(function(e, i) {
              return <div key={i} style={{ padding: "12px 16px", background: T.panel, borderRadius: 8, border: "1px solid " + T.border, marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: T.green, background: "rgba(91,206,138,.1)", padding: "2px 6px", borderRadius: 3 }}>{e.m}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.white, fontFamily: "'DM Mono', monospace" }}>{e.p}</span>
                </div>
                <p style={{ fontSize: 12, color: T.muted, margin: "4px 0 0" }}>{e.d}</p>
              </div>;
            })}
            <div style={{ marginTop: 16, padding: 16, background: T.panel, borderRadius: 10, border: "1px solid " + T.border }}>
              <div style={{ fontSize: 10, color: T.dim, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Discord Bot Example</div>
              <pre style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Mono', monospace", whiteSpace: "pre-wrap", lineHeight: 1.7, background: T.bg, padding: 12, borderRadius: 6 }}>
{"const res = await fetch(\"https://polymart.co/api/market\");\nconst data = await res.json();\n\nconst embed = new EmbedBuilder()\n  .setTitle(\"POLYMART Summary\")\n  .setColor(data.fearGreed > 50 ? 0x5bce8a : 0xe8696a)\n  .addFields(\n    { name: \"Index\", value: data.index.toFixed(0), inline: true },\n    { name: \"Sentiment\", value: data.fearGreedLabel, inline: true },\n    { name: \"Top Gainer\", value: data.topGainer.ticker, inline: true },\n  )\n  .setTimestamp();\n\nawait interaction.reply({ embeds: [embed] });"}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChartCanvas(props) {
  var data = props.data;
  var ref = useRef(null);
  useEffect(function() {
    var cv = ref.current; if (!cv || !data || data.length < 2) return;
    var ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
    var p = { t: 10, r: 56, b: 18, l: 6 }, cW = W - p.l - p.r, cH = H - p.t - p.b;
    var mn = Math.min.apply(null, data) * 0.996, mx = Math.max.apply(null, data) * 1.004, rng = mx - mn || 1;
    var up = data[data.length - 1] >= data[0];
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#2a2a31"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#3a3a44"; ctx.lineWidth = 0.5;
    for (var i = 0; i <= 5; i++) { var y = p.t + (cH / 5) * i; ctx.beginPath(); ctx.moveTo(p.l, y); ctx.lineTo(W - p.r, y); ctx.stroke(); ctx.fillStyle = "#5e5e6a"; ctx.font = "10px monospace"; ctx.textAlign = "left"; ctx.fillText((mx - (i / 5) * rng).toFixed(2), W - p.r + 5, y + 4); }
    var pts = data.map(function(v, i) { return { x: p.l + (i / (data.length - 1)) * cW, y: p.t + ((mx - v) / rng) * cH }; });
    var g = ctx.createLinearGradient(0, p.t, 0, p.t + cH); g.addColorStop(0, up ? "rgba(91,206,138,.12)" : "rgba(232,105,106,.12)"); g.addColorStop(1, "transparent");
    ctx.beginPath(); ctx.moveTo(pts[0].x, p.t + cH); pts.forEach(function(pt) { ctx.lineTo(pt.x, pt.y); }); ctx.lineTo(pts[pts.length - 1].x, p.t + cH); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (var j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y); ctx.strokeStyle = up ? "#5bce8a" : "#e8696a"; ctx.lineWidth = 2; ctx.stroke();
    var last = pts[pts.length - 1]; ctx.beginPath(); ctx.arc(last.x, last.y, 4, 0, Math.PI * 2); ctx.fillStyle = up ? "#5bce8a" : "#e8696a"; ctx.fill();
  }, [data]);
  return <canvas ref={ref} width={820} height={340} style={{ width: "100%", borderRadius: 8, display: "block" }} />;
}
