/**
 * Polymart Embeddable Widgets v1.0
 * Drop-in HTML widgets for price tickers, market summaries, and leaderboards.
 * Embed live Polymart data on any website with a single script tag.
 *
 * Usage:
 *   <script src="https://polymart.co/widgets/polymart-widgets.js"></script>
 *
 * Then use any of these custom elements:
 *   <polymart-ticker ticker="APEX"></polymart-ticker>
 *   <polymart-market></polymart-market>
 *   <polymart-leaderboard></polymart-leaderboard>
 *   <polymart-tape></polymart-tape>
 *   <polymart-sparkline ticker="VOID"></polymart-sparkline>
 *   <polymart-sector sector="crypto"></polymart-sector>
 *   <polymart-events></polymart-events>
 *
 * All widgets auto-refresh every 5 seconds to match the simulation tick.
 * No API key required. No dependencies.
 */

(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────────────────────────────
  const API = "https://polymart.co/api/v1";
  const TICK = 5000; // refresh interval ms
  const FONT_URL =
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap";

  // ── Shared styles injected once ──────────────────────────────────────────────
  if (!document.getElementById("polymart-widget-styles")) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_URL;
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.id = "polymart-widget-styles";
    style.textContent = `
      :root {
        --pm-bg: #0b0e14;
        --pm-surface: #131720;
        --pm-surface-2: #1a1f2e;
        --pm-border: #252b3b;
        --pm-text: #e2e8f0;
        --pm-text-dim: #8892a8;
        --pm-green: #22c55e;
        --pm-green-bg: rgba(34,197,94,0.1);
        --pm-red: #ef4444;
        --pm-red-bg: rgba(239,68,68,0.1);
        --pm-blue: #3b82f6;
        --pm-amber: #f59e0b;
        --pm-mono: 'JetBrains Mono', monospace;
        --pm-sans: 'Inter', -apple-system, sans-serif;
        --pm-radius: 8px;
      }

      [data-polymart-theme="light"] {
        --pm-bg: #f8fafc;
        --pm-surface: #ffffff;
        --pm-surface-2: #f1f5f9;
        --pm-border: #e2e8f0;
        --pm-text: #1e293b;
        --pm-text-dim: #64748b;
        --pm-green-bg: rgba(34,197,94,0.08);
        --pm-red-bg: rgba(239,68,68,0.08);
      }

      @keyframes pm-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      @keyframes pm-slide-up {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes pm-tape-scroll {
        from { transform: translateX(0); }
        to   { transform: translateX(-50%); }
      }
      @keyframes pm-flash-green {
        0%   { background-color: var(--pm-green-bg); }
        100% { background-color: transparent; }
      }
      @keyframes pm-flash-red {
        0%   { background-color: var(--pm-red-bg); }
        100% { background-color: transparent; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function fmt(n, decimals = 2) {
    if (n == null) return "-";
    return Number(n).toFixed(decimals);
  }
  function fmtPct(n) {
    if (n == null) return "-";
    const s = Number(n) >= 0 ? "+" : "";
    return s + Number(n).toFixed(2) + "%";
  }
  function fmtPrice(n) {
    if (n == null) return "-";
    return "$" + Number(n).toFixed(2);
  }
  function changeColor(n) {
    return Number(n) >= 0 ? "var(--pm-green)" : "var(--pm-red)";
  }
  function changeArrow(n) {
    return Number(n) >= 0 ? "▲" : "▼";
  }
  function changeBg(n) {
    return Number(n) >= 0 ? "var(--pm-green-bg)" : "var(--pm-red-bg)";
  }

  async function apiFetch(endpoint, params = {}) {
    const url = new URL(`${API}/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v != null) url.searchParams.set(k, v);
    });
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Polymart API error: ${res.status}`);
    return res.json();
  }

  // Shared base class
  class PolymartWidget extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._interval = null;
    }

    connectedCallback() {
      this._injectBaseStyles();
      this.render();
      this._interval = setInterval(
        () => this.render(),
        parseInt(this.getAttribute("interval") || TICK)
      );
    }

    disconnectedCallback() {
      clearInterval(this._interval);
    }

    _injectBaseStyles() {
      const s = document.createElement("style");
      s.textContent = `
        @import url('${FONT_URL}');
        :host {
          display: block;
          font-family: var(--pm-sans);
          color: var(--pm-text);
          --pm-bg: #0b0e14;
          --pm-surface: #131720;
          --pm-surface-2: #1a1f2e;
          --pm-border: #252b3b;
          --pm-text: #e2e8f0;
          --pm-text-dim: #8892a8;
          --pm-green: #22c55e;
          --pm-green-bg: rgba(34,197,94,0.1);
          --pm-red: #ef4444;
          --pm-red-bg: rgba(239,68,68,0.1);
          --pm-blue: #3b82f6;
          --pm-amber: #f59e0b;
          --pm-mono: 'JetBrains Mono', monospace;
          --pm-sans: 'Inter', -apple-system, sans-serif;
          --pm-radius: 8px;
        }
        :host([theme="light"]) {
          --pm-bg: #f8fafc;
          --pm-surface: #ffffff;
          --pm-surface-2: #f1f5f9;
          --pm-border: #e2e8f0;
          --pm-text: #1e293b;
          --pm-text-dim: #64748b;
          --pm-green-bg: rgba(34,197,94,0.08);
          --pm-red-bg: rgba(239,68,68,0.08);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        a { color: var(--pm-blue); text-decoration: none; }
        a:hover { text-decoration: underline; }
        .pm-loading {
          display: flex; align-items: center; justify-content: center;
          padding: 24px; color: var(--pm-text-dim); font-size: 13px;
        }
        .pm-loading::after {
          content: ''; width: 14px; height: 14px; margin-left: 8px;
          border: 2px solid var(--pm-border); border-top-color: var(--pm-blue);
          border-radius: 50%; animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pm-slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pm-flash-green {
          0%   { background-color: var(--pm-green-bg); }
          100% { background-color: transparent; }
        }
        @keyframes pm-flash-red {
          0%   { background-color: var(--pm-red-bg); }
          100% { background-color: transparent; }
        }
        .pm-branding {
          display: flex; align-items: center; justify-content: flex-end;
          padding: 7px 12px; font-size: 10px; color: var(--pm-text-dim);
          border-top: 1px solid var(--pm-border); gap: 6px;
          letter-spacing: 0.05em; text-transform: uppercase;
        }
        .pm-branding a {
          display: inline-flex; align-items: center; gap: 5px;
          color: var(--pm-text-dim); font-weight: 600; text-decoration: none;
        }
        .pm-branding a:hover { color: var(--pm-text); }
        .pm-branding img {
          height: 30px; width: auto; opacity: 0.85;
          filter: brightness(0) invert(0.7);
          transition: opacity 0.2s;
        }
        :host([theme="light"]) .pm-branding img {
          filter: brightness(0) invert(0.4);
        }
        .pm-branding a:hover img { opacity: 1; }
      `;
      this.shadowRoot.appendChild(s);
    }

    _branding() {
      const logoUrl = this.getAttribute('logo') || 'https://polymart.co/polymartlogo.png';
      return `<div class="pm-branding"><a href="https://polymart.co" target="_blank" rel="noopener"><img src="${logoUrl}" alt="Polymart" /></a></div>`;
    }

    _loading() {
      return `<div class="pm-loading">Loading</div>`;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. TICKER WIDGET - single stock price card
  //    <polymart-ticker ticker="APEX"></polymart-ticker>
  // ─────────────────────────────────────────────────────────────────────────────
  class PolymartTicker extends PolymartWidget {
    static get observedAttributes() {
      return ["ticker", "theme"];
    }
    attributeChangedCallback() {
      this.render();
    }

    async render() {
      const ticker = (this.getAttribute("ticker") || "APEX").toUpperCase();
      const showChart = this.getAttribute("chart") !== "false";
      const root = this.shadowRoot;

      if (!root.querySelector(".pm-ticker-wrap")) {
        const s = document.createElement("style");
        s.textContent = `
          .pm-ticker-wrap {
            background: var(--pm-surface);
            border: 1px solid var(--pm-border);
            border-radius: var(--pm-radius);
            overflow: hidden;
            min-width: 220px;
            max-width: 360px;
            font-family: var(--pm-sans);
          }
          .pm-ticker-body {
            padding: 16px;
            animation: pm-slide-up 0.3s ease-out;
          }
          .pm-ticker-header {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 8px;
          }
          .pm-ticker-symbol {
            font-family: var(--pm-mono);
            font-size: 16px; font-weight: 700;
            letter-spacing: 0.05em;
          }
          .pm-ticker-badge {
            font-size: 10px; padding: 2px 8px;
            border-radius: 100px; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.05em;
          }
          .pm-ticker-name {
            font-size: 12px; color: var(--pm-text-dim); margin-bottom: 12px;
          }
          .pm-ticker-price {
            font-family: var(--pm-mono);
            font-size: 28px; font-weight: 700; margin-bottom: 4px;
          }
          .pm-ticker-change {
            font-family: var(--pm-mono);
            font-size: 14px; font-weight: 600;
          }
          .pm-ticker-meta {
            display: grid; grid-template-columns: 1fr 1fr;
            gap: 8px; margin-top: 14px; padding-top: 12px;
            border-top: 1px solid var(--pm-border);
          }
          .pm-ticker-meta-item {
            font-size: 11px; color: var(--pm-text-dim);
          }
          .pm-ticker-meta-val {
            font-family: var(--pm-mono);
            font-size: 13px; font-weight: 500; color: var(--pm-text);
          }
          .pm-ticker-chart { padding: 0 16px 12px; }
          .pm-ticker-chart svg { width: 100%; height: 48px; display: block; }
        `;
        root.appendChild(s);
        const wrap = document.createElement("div");
        wrap.className = "pm-ticker-wrap";
        wrap.innerHTML = this._loading();
        root.appendChild(wrap);
      }

      try {
        const data = await apiFetch("getStock", { ticker });
        const wrap = root.querySelector(".pm-ticker-wrap");
        const chg = data.change;
        const color = changeColor(chg);

        let chartHtml = "";
        if (showChart && data.history && data.history.length > 1) {
          chartHtml = `<div class="pm-ticker-chart">${this._sparkSvg(data.history, chg)}</div>`;
        }

        wrap.innerHTML = `
          <div class="pm-ticker-body">
            <div class="pm-ticker-header">
              <span class="pm-ticker-symbol">${data.ticker}</span>
              <span class="pm-ticker-badge" style="background:${changeBg(chg)};color:${color}">
                ${data.sector}
              </span>
            </div>
            <div class="pm-ticker-name">${data.name}</div>
            <div class="pm-ticker-price" style="color:${color}">
              ${fmtPrice(data.price)}
            </div>
            <div class="pm-ticker-change" style="color:${color}">
              ${changeArrow(chg)} ${fmtPct(chg)}
            </div>
            <div class="pm-ticker-meta">
              <div class="pm-ticker-meta-item">RSI<br><span class="pm-ticker-meta-val">${fmt(data.rsi, 1)}</span></div>
              <div class="pm-ticker-meta-item">Vol<br><span class="pm-ticker-meta-val">${Number(data.volume).toLocaleString()}</span></div>
              <div class="pm-ticker-meta-item">52w H<br><span class="pm-ticker-meta-val">${fmtPrice(data.high52w)}</span></div>
              <div class="pm-ticker-meta-item">52w L<br><span class="pm-ticker-meta-val">${fmtPrice(data.low52w)}</span></div>
            </div>
          </div>
          ${chartHtml}
          ${this._branding()}
        `;
      } catch (e) {
        console.error("polymart-ticker error:", e);
      }
    }

    _sparkSvg(history, change) {
      const pts = history.slice(-80);
      const min = Math.min(...pts);
      const max = Math.max(...pts);
      const range = max - min || 1;
      const w = 320;
      const h = 48;
      const coords = pts.map(
        (v, i) => `${(i / (pts.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`
      );
      const color = Number(change) >= 0 ? "var(--pm-green)" : "var(--pm-red)";
      return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sg-${this.getAttribute("ticker")}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="M${coords.join("L")}L${w},${h}L0,${h}Z" fill="url(#sg-${this.getAttribute("ticker")})" />
        <polyline points="${coords.join(" ")}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>`;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. MARKET SUMMARY - index, fear/greed, macro stats, movers
  //    <polymart-market></polymart-market>
  // ─────────────────────────────────────────────────────────────────────────────
  class PolymartMarket extends PolymartWidget {
    async render() {
      const root = this.shadowRoot;

      if (!root.querySelector(".pm-market-wrap")) {
        const s = document.createElement("style");
        s.textContent = `
          .pm-market-wrap {
            background: var(--pm-surface);
            border: 1px solid var(--pm-border);
            border-radius: var(--pm-radius);
            overflow: hidden; max-width: 480px;
            font-family: var(--pm-sans);
          }
          .pm-market-body { padding: 20px; animation: pm-slide-up 0.3s ease-out; }
          .pm-market-title {
            font-size: 11px; font-weight: 600; text-transform: uppercase;
            letter-spacing: 0.1em; color: var(--pm-text-dim); margin-bottom: 12px;
          }
          .pm-market-index {
            font-family: var(--pm-mono);
            font-size: 32px; font-weight: 700; margin-bottom: 4px;
          }
          .pm-market-change {
            font-family: var(--pm-mono);
            font-size: 14px; font-weight: 600; margin-bottom: 18px;
          }
          .pm-market-grid {
            display: grid; grid-template-columns: repeat(3, 1fr);
            gap: 12px; margin-bottom: 18px;
          }
          .pm-stat-card {
            background: var(--pm-surface-2);
            border-radius: 6px; padding: 10px; text-align: center;
          }
          .pm-stat-label {
            font-size: 10px; color: var(--pm-text-dim);
            text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;
          }
          .pm-stat-value {
            font-family: var(--pm-mono);
            font-size: 16px; font-weight: 600;
          }
          .pm-fg-bar {
            height: 6px; border-radius: 3px; background: var(--pm-surface-2);
            overflow: hidden; margin: 8px 0 4px;
          }
          .pm-fg-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
          .pm-fg-labels {
            display: flex; justify-content: space-between;
            font-size: 10px; color: var(--pm-text-dim);
          }
          .pm-movers { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .pm-mover {
            display: flex; align-items: center; justify-content: space-between;
            padding: 8px 10px; border-radius: 6px; font-family: var(--pm-mono);
            font-size: 13px; font-weight: 600;
          }
          .pm-mover-ticker { font-weight: 700; }
        `;
        root.appendChild(s);
        const wrap = document.createElement("div");
        wrap.className = "pm-market-wrap";
        wrap.innerHTML = this._loading();
        root.appendChild(wrap);
      }

      try {
        const data = await apiFetch("getMarket");
        const wrap = root.querySelector(".pm-market-wrap");
        const color = changeColor(data.indexChangePct);
        const fgColor =
          data.fearGreed < 30
            ? "var(--pm-red)"
            : data.fearGreed > 70
              ? "var(--pm-green)"
              : "var(--pm-amber)";

        wrap.innerHTML = `
          <div class="pm-market-body">
            <div class="pm-market-title">Polymart Index</div>
            <div class="pm-market-index" style="color:${color}">
              ${fmt(data.index, 2)}
            </div>
            <div class="pm-market-change" style="color:${color}">
              ${changeArrow(data.indexChangePct)} ${fmtPct(data.indexChangePct)}
              <span style="color:var(--pm-text-dim);font-weight:400;margin-left:8px">
                ${data.gainers}▲ ${data.losers}▼ ${data.unchanged}-
              </span>
            </div>

            <div class="pm-market-grid">
              <div class="pm-stat-card">
                <div class="pm-stat-label">Interest</div>
                <div class="pm-stat-value">${fmt(data.interestRate, 1)}%</div>
              </div>
              <div class="pm-stat-card">
                <div class="pm-stat-label">Inflation</div>
                <div class="pm-stat-value">${fmt(data.inflation, 1)}%</div>
              </div>
              <div class="pm-stat-card">
                <div class="pm-stat-label">GDP</div>
                <div class="pm-stat-value">${fmt(data.gdpGrowth, 1)}%</div>
              </div>
            </div>

            <div class="pm-stat-label">Fear &amp; Greed · ${data.fearGreedLabel}</div>
            <div class="pm-fg-bar">
              <div class="pm-fg-fill" style="width:${data.fearGreed}%;background:${fgColor}"></div>
            </div>
            <div class="pm-fg-labels"><span>Extreme Fear</span><span>Extreme Greed</span></div>

            <div style="margin-top:16px">
              <div class="pm-stat-label" style="margin-bottom:8px">Top Movers</div>
              <div class="pm-movers">
                <div class="pm-mover" style="background:var(--pm-green-bg);color:var(--pm-green)">
                  <span class="pm-mover-ticker">${data.topGainer?.ticker || "-"}</span>
                  <span>${fmtPct(data.topGainer?.pct)}</span>
                </div>
                <div class="pm-mover" style="background:var(--pm-red-bg);color:var(--pm-red)">
                  <span class="pm-mover-ticker">${data.topLoser?.ticker || "-"}</span>
                  <span>${fmtPct(data.topLoser?.pct)}</span>
                </div>
              </div>
            </div>
          </div>
          ${this._branding()}
        `;
      } catch (e) {
        console.error("polymart-market error:", e);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. LEADERBOARD - ranked table of stocks
  //    <polymart-leaderboard by="change" limit="10" dir="desc"></polymart-leaderboard>
  // ─────────────────────────────────────────────────────────────────────────────
  class PolymartLeaderboard extends PolymartWidget {
    async render() {
      const root = this.shadowRoot;
      const by = this.getAttribute("by") || "change";
      const dir = this.getAttribute("dir") || "desc";
      const limit = this.getAttribute("limit") || "10";
      const title = this.getAttribute("title") || `Top by ${by}`;

      if (!root.querySelector(".pm-lb-wrap")) {
        const s = document.createElement("style");
        s.textContent = `
          .pm-lb-wrap {
            background: var(--pm-surface);
            border: 1px solid var(--pm-border);
            border-radius: var(--pm-radius);
            overflow: hidden; max-width: 520px;
            font-family: var(--pm-sans);
          }
          .pm-lb-header {
            padding: 16px 16px 12px;
            border-bottom: 1px solid var(--pm-border);
          }
          .pm-lb-title {
            font-size: 14px; font-weight: 700;
          }
          .pm-lb-sub {
            font-size: 11px; color: var(--pm-text-dim); margin-top: 2px;
            font-family: var(--pm-mono);
          }
          .pm-lb-table {
            width: 100%; border-collapse: collapse;
          }
          .pm-lb-table th {
            font-size: 10px; text-transform: uppercase;
            letter-spacing: 0.08em; color: var(--pm-text-dim);
            text-align: left; padding: 8px 12px; font-weight: 600;
            border-bottom: 1px solid var(--pm-border);
          }
          .pm-lb-table th:last-child { text-align: right; }
          .pm-lb-table td {
            padding: 8px 12px; font-size: 13px;
            border-bottom: 1px solid var(--pm-border);
          }
          .pm-lb-table tr:last-child td { border-bottom: none; }
          .pm-lb-table tr {
            animation: pm-slide-up 0.3s ease-out both;
          }
          .pm-lb-rank {
            font-family: var(--pm-mono); font-weight: 700;
            color: var(--pm-text-dim); font-size: 12px; width: 32px;
          }
          .pm-lb-ticker {
            font-family: var(--pm-mono); font-weight: 700; font-size: 13px;
          }
          .pm-lb-name {
            font-size: 11px; color: var(--pm-text-dim);
          }
          .pm-lb-price {
            font-family: var(--pm-mono); font-size: 13px; text-align: right;
          }
          .pm-lb-change {
            font-family: var(--pm-mono); font-size: 13px;
            font-weight: 600; text-align: right; white-space: nowrap;
          }
        `;
        root.appendChild(s);
        const wrap = document.createElement("div");
        wrap.className = "pm-lb-wrap";
        wrap.innerHTML = this._loading();
        root.appendChild(wrap);
      }

      try {
        const data = await apiFetch("getLeaderboard", { by, dir, limit });
        const wrap = root.querySelector(".pm-lb-wrap");

        const rows = data.stocks
          .map(
            (s, i) => `
          <tr style="animation-delay:${i * 30}ms">
            <td class="pm-lb-rank">${i + 1}</td>
            <td>
              <div class="pm-lb-ticker">${s.ticker}</div>
              <div class="pm-lb-name">${s.name}</div>
            </td>
            <td class="pm-lb-price">${fmtPrice(s.price)}</td>
            <td class="pm-lb-change" style="color:${changeColor(s.change)}">
              ${changeArrow(s.change)} ${fmtPct(s.change)}
            </td>
          </tr>`
          )
          .join("");

        wrap.innerHTML = `
          <div class="pm-lb-header">
            <div class="pm-lb-title">${title}</div>
            <div class="pm-lb-sub">sorted by ${data.sortedBy} · ${data.direction}</div>
          </div>
          <table class="pm-lb-table">
            <thead><tr>
              <th>#</th><th>Stock</th><th style="text-align:right">Price</th><th style="text-align:right">Change</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
          ${this._branding()}
        `;
      } catch (e) {
        console.error("polymart-leaderboard error:", e);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. TAPE - scrolling ticker tape
  //    <polymart-tape speed="40" limit="20"></polymart-tape>
  // ─────────────────────────────────────────────────────────────────────────────
  class PolymartTape extends PolymartWidget {
    async render() {
      const root = this.shadowRoot;
      const speed = parseInt(this.getAttribute("speed") || "40");
      const limit = this.getAttribute("limit") || "20";

      if (!root.querySelector(".pm-tape-wrap")) {
        const s = document.createElement("style");
        s.textContent = `
          .pm-tape-wrap {
            background: var(--pm-surface);
            border: 1px solid var(--pm-border);
            border-radius: var(--pm-radius);
            overflow: hidden; white-space: nowrap;
            font-family: var(--pm-mono);
          }
          .pm-tape-track {
            display: inline-flex; animation: pm-tape-scroll linear infinite;
          }
          @keyframes pm-tape-scroll {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
          .pm-tape-item {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 10px 18px; font-size: 13px; font-weight: 600;
            border-right: 1px solid var(--pm-border);
          }
          .pm-tape-item:last-child { border-right: none; }
          .pm-tape-sym { color: var(--pm-text); font-weight: 700; }
          .pm-tape-price { color: var(--pm-text-dim); }
        `;
        root.appendChild(s);
        const wrap = document.createElement("div");
        wrap.className = "pm-tape-wrap";
        wrap.innerHTML = this._loading();
        root.appendChild(wrap);
      }

      try {
        const data = await apiFetch("getLeaderboard", {
          by: "volume",
          dir: "desc",
          limit,
        });
        const wrap = root.querySelector(".pm-tape-wrap");

        const items = data.stocks
          .map(
            (s) => `
          <div class="pm-tape-item">
            <span class="pm-tape-sym">${s.ticker}</span>
            <span class="pm-tape-price">${fmtPrice(s.price)}</span>
            <span style="color:${changeColor(s.change)}">${changeArrow(s.change)} ${fmtPct(s.change)}</span>
          </div>`
          )
          .join("");

        const dur = data.stocks.length * (100 / speed);
        wrap.innerHTML = `<div class="pm-tape-track" style="animation-duration:${dur}s">${items}${items}</div>`;
      } catch (e) {
        console.error("polymart-tape error:", e);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. SPARKLINE - tiny inline price chart
  //    <polymart-sparkline ticker="VOID" width="120" height="32"></polymart-sparkline>
  // ─────────────────────────────────────────────────────────────────────────────
  class PolymartSparkline extends PolymartWidget {
    async render() {
      const root = this.shadowRoot;
      const ticker = (this.getAttribute("ticker") || "APEX").toUpperCase();
      const w = parseInt(this.getAttribute("width") || "120");
      const h = parseInt(this.getAttribute("height") || "32");

      if (!root.querySelector(".pm-spark")) {
        const wrap = document.createElement("span");
        wrap.className = "pm-spark";
        wrap.style.cssText = "display:inline-block;vertical-align:middle;";
        root.appendChild(wrap);
      }

      try {
        const data = await apiFetch("getHistory", { ticker, limit: 60 });
        const pts = data.history;
        const min = Math.min(...pts);
        const max = Math.max(...pts);
        const range = max - min || 1;
        const coords = pts.map(
          (v, i) => `${(i / (pts.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`
        );
        const chg = pts.length > 1 ? pts[pts.length - 1] - pts[0] : 0;
        const color = chg >= 0 ? "var(--pm-green)" : "var(--pm-red)";

        root.querySelector(".pm-spark").innerHTML = `
          <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
            <polyline points="${coords.join(" ")}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>`;
      } catch (e) {
        console.error("polymart-sparkline error:", e);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. SECTOR WIDGET - sector overview card
  //    <polymart-sector sector="crypto"></polymart-sector>
  // ─────────────────────────────────────────────────────────────────────────────
  class PolymartSector extends PolymartWidget {
    async render() {
      const root = this.shadowRoot;
      const sector = this.getAttribute("sector") || "tech";

      if (!root.querySelector(".pm-sec-wrap")) {
        const s = document.createElement("style");
        s.textContent = `
          .pm-sec-wrap {
            background: var(--pm-surface);
            border: 1px solid var(--pm-border);
            border-radius: var(--pm-radius);
            overflow: hidden; max-width: 400px;
            font-family: var(--pm-sans);
          }
          .pm-sec-header { padding: 16px; border-bottom: 1px solid var(--pm-border); }
          .pm-sec-title { font-size: 16px; font-weight: 700; }
          .pm-sec-meta {
            display: flex; gap: 16px; margin-top: 8px; font-size: 12px;
            color: var(--pm-text-dim); font-family: var(--pm-mono);
          }
          .pm-sec-stocks { padding: 8px 0; }
          .pm-sec-row {
            display: flex; align-items: center; justify-content: space-between;
            padding: 6px 16px; font-size: 13px;
          }
          .pm-sec-row:hover { background: var(--pm-surface-2); }
          .pm-sec-sym { font-family: var(--pm-mono); font-weight: 700; width: 70px; }
          .pm-sec-name { flex: 1; color: var(--pm-text-dim); font-size: 12px; }
          .pm-sec-price { font-family: var(--pm-mono); width: 80px; text-align: right; }
          .pm-sec-chg {
            font-family: var(--pm-mono); font-weight: 600; width: 80px;
            text-align: right;
          }
        `;
        root.appendChild(s);
        const wrap = document.createElement("div");
        wrap.className = "pm-sec-wrap";
        wrap.innerHTML = this._loading();
        root.appendChild(wrap);
      }

      try {
        const data = await apiFetch("getSector", { sector });
        const wrap = root.querySelector(".pm-sec-wrap");

        const rows = data.stocks
          .map(
            (s) => `
          <div class="pm-sec-row">
            <span class="pm-sec-sym">${s.ticker}</span>
            <span class="pm-sec-name">${s.name}</span>
            <span class="pm-sec-price">${fmtPrice(s.price)}</span>
            <span class="pm-sec-chg" style="color:${changeColor(s.change)}">
              ${fmtPct(s.change)}
            </span>
          </div>`
          )
          .join("");

        wrap.innerHTML = `
          <div class="pm-sec-header">
            <div class="pm-sec-title">${data.icon} ${data.label}</div>
            <div class="pm-sec-meta">
              <span>Avg: <span style="color:${changeColor(data.avgChange)}">${fmtPct(data.avgChange)}</span></span>
              <span>Momentum: ${fmt(data.momentum, 3)}</span>
              <span>${data.stocks.length} stocks</span>
            </div>
          </div>
          <div class="pm-sec-stocks">${rows}</div>
          ${this._branding()}
        `;
      } catch (e) {
        console.error("polymart-sector error:", e);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. EVENTS - recent market events feed
  //    <polymart-events limit="5"></polymart-events>
  // ─────────────────────────────────────────────────────────────────────────────
  class PolymartEvents extends PolymartWidget {
    async render() {
      const root = this.shadowRoot;
      const limit = this.getAttribute("limit") || "5";
      const sector = this.getAttribute("sector");

      if (!root.querySelector(".pm-ev-wrap")) {
        const s = document.createElement("style");
        s.textContent = `
          .pm-ev-wrap {
            background: var(--pm-surface);
            border: 1px solid var(--pm-border);
            border-radius: var(--pm-radius);
            overflow: hidden; max-width: 480px;
            font-family: var(--pm-sans);
          }
          .pm-ev-header {
            padding: 14px 16px; font-size: 14px; font-weight: 700;
            border-bottom: 1px solid var(--pm-border);
          }
          .pm-ev-list { padding: 4px 0; }
          .pm-ev-item {
            padding: 10px 16px; border-bottom: 1px solid var(--pm-border);
            animation: pm-slide-up 0.3s ease-out both;
          }
          .pm-ev-item:last-child { border-bottom: none; }
          .pm-ev-text { font-size: 13px; line-height: 1.5; }
          .pm-ev-meta {
            display: flex; gap: 12px; margin-top: 4px;
            font-size: 11px; color: var(--pm-text-dim);
            font-family: var(--pm-mono);
          }
          .pm-ev-badge {
            display: inline-block; padding: 1px 6px;
            border-radius: 4px; font-size: 10px; font-weight: 600;
          }
        `;
        root.appendChild(s);
        const wrap = document.createElement("div");
        wrap.className = "pm-ev-wrap";
        wrap.innerHTML = this._loading();
        root.appendChild(wrap);
      }

      try {
        const params = { limit };
        if (sector) params.sector = sector;
        const data = await apiFetch("getEvents", params);
        const wrap = root.querySelector(".pm-ev-wrap");

        const items = data
          .map(
            (ev, i) => `
          <div class="pm-ev-item" style="animation-delay:${i * 50}ms">
            <div class="pm-ev-text">${ev.text}</div>
            <div class="pm-ev-meta">
              <span class="pm-ev-badge" style="background:${ev.effect >= 0 ? "var(--pm-green-bg)" : "var(--pm-red-bg)"};color:${ev.effect >= 0 ? "var(--pm-green)" : "var(--pm-red)"}">
                ${ev.effect >= 0 ? "Bullish" : "Bearish"} · ${fmt(Math.abs(ev.effect), 1)}
              </span>
              ${ev.sector ? `<span>${ev.sector}</span>` : "<span>Market-wide</span>"}
              <span>Weight ${ev.weight}</span>
            </div>
          </div>`
          )
          .join("");

        wrap.innerHTML = `
          <div class="pm-ev-header">💡 Market Events</div>
          <div class="pm-ev-list">${items}</div>
          ${this._branding()}
        `;
      } catch (e) {
        console.error("polymart-events error:", e);
      }
    }
  }

  // ── Register all custom elements ─────────────────────────────────────────────
  customElements.define("polymart-ticker", PolymartTicker);
  customElements.define("polymart-market", PolymartMarket);
  customElements.define("polymart-leaderboard", PolymartLeaderboard);
  customElements.define("polymart-tape", PolymartTape);
  customElements.define("polymart-sparkline", PolymartSparkline);
  customElements.define("polymart-sector", PolymartSector);
  customElements.define("polymart-events", PolymartEvents);

  // Expose version
  window.PolymartWidgets = { version: "1.0.0" };
})();
