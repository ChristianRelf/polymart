/**
 * Polymart Embeddable Widgets v2.0
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
 * All widgets auto-refresh every 10 seconds to match the simulation tick.
 * No API key required. No dependencies.
 */

(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────────────────────────────
  // Derive API origin from where this script was served so that local-dev
  // requests go through the Vite proxy instead of hitting the production host.
  const _scriptOrigin = (() => {
    const s = document.currentScript ||
      document.querySelector('script[src*="polymart-widgets"]');
    if (s && s.src) { try { return new URL(s.src).origin; } catch (_) {} }
    return "https://polymart.co";
  })();
  const API = `${_scriptOrigin}/api/v1`;
  const TICK = 10000;
  const FONT_URL =
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap";

  // ── Shared styles injected once into document ────────────────────────────────
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
      @keyframes pm-tape-scroll {
        from { transform: translateX(0); }
        to   { transform: translateX(-50%); }
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

  // ── Base class ───────────────────────────────────────────────────────────────
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

    // Helper: set text on a shadow DOM element by selector
    _setText(sel, val) {
      const el = this.shadowRoot.querySelector(sel);
      if (el) el.textContent = val;
    }

    // Helper: set style property on a shadow DOM element by selector
    _setStyle(sel, prop, val) {
      const el = this.shadowRoot.querySelector(sel);
      if (el) el.style[prop] = val;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. TICKER WIDGET
  //    <polymart-ticker ticker="APEX"></polymart-ticker>
  // ─────────────────────────────────────────────────────────────────────────────
  class PolymartTicker extends PolymartWidget {
    static get observedAttributes() { return ["ticker", "theme"]; }
    attributeChangedCallback() { this.render(); }

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
            overflow: hidden; min-width: 220px; max-width: 360px;
            font-family: var(--pm-sans);
          }
          .pm-ticker-body { padding: 16px; }
          .pm-ticker-header {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 8px;
          }
          .pm-ticker-symbol {
            font-family: var(--pm-mono); font-size: 16px; font-weight: 700;
            letter-spacing: 0.05em;
          }
          .pm-ticker-badge {
            font-size: 10px; padding: 2px 8px; border-radius: 100px;
            font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
          }
          .pm-ticker-name { font-size: 12px; color: var(--pm-text-dim); margin-bottom: 12px; }
          .pm-ticker-price {
            font-family: var(--pm-mono); font-size: 28px; font-weight: 700; margin-bottom: 4px;
          }
          .pm-ticker-change { font-family: var(--pm-mono); font-size: 14px; font-weight: 600; }
          .pm-ticker-meta {
            display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
            margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--pm-border);
          }
          .pm-ticker-meta-item { font-size: 11px; color: var(--pm-text-dim); }
          .pm-ticker-meta-val { font-family: var(--pm-mono); font-size: 13px; font-weight: 500; color: var(--pm-text); }
          .pm-ticker-chart { padding: 0 16px 12px; }
          .pm-ticker-chart svg { width: 100%; height: 48px; display: block; }
        `;
        root.appendChild(s);

        const wrap = document.createElement("div");
        wrap.className = "pm-ticker-wrap";
        wrap.innerHTML = `
          <div class="pm-ticker-body">
            <div class="pm-ticker-header">
              <span class="pm-ticker-symbol">-</span>
              <span class="pm-ticker-badge">-</span>
            </div>
            <div class="pm-ticker-name">-</div>
            <div class="pm-ticker-price">-</div>
            <div class="pm-ticker-change">-</div>
            <div class="pm-ticker-meta">
              <div class="pm-ticker-meta-item">RSI<br><span class="pm-ticker-meta-val _rsi">-</span></div>
              <div class="pm-ticker-meta-item">Vol<br><span class="pm-ticker-meta-val _vol">-</span></div>
              <div class="pm-ticker-meta-item">52w H<br><span class="pm-ticker-meta-val _hi">-</span></div>
              <div class="pm-ticker-meta-item">52w L<br><span class="pm-ticker-meta-val _lo">-</span></div>
            </div>
          </div>
          <div class="pm-ticker-chart"></div>
          ${this._branding()}
        `;
        root.appendChild(wrap);
      }

      try {
        const data = await apiFetch("stocks/getStock", { ticker });
        const chg = data.change;
        const color = changeColor(chg);

        this._setText(".pm-ticker-symbol", data.ticker);

        const badge = root.querySelector(".pm-ticker-badge");
        if (badge) { badge.textContent = data.sector; badge.style.background = changeBg(chg); badge.style.color = color; }

        this._setText(".pm-ticker-name", data.name);

        const price = root.querySelector(".pm-ticker-price");
        if (price) { price.textContent = fmtPrice(data.price); price.style.color = color; }

        const change = root.querySelector(".pm-ticker-change");
        if (change) { change.textContent = `${changeArrow(chg)} ${fmtPct(chg)}`; change.style.color = color; }

        this._setText("._rsi", fmt(data.rsi, 1));
        this._setText("._vol", Number(data.volume).toLocaleString());
        this._setText("._hi",  fmtPrice(data.high52w));
        this._setText("._lo",  fmtPrice(data.low52w));

        if (showChart && data.history && data.history.length > 1) {
          const chart = root.querySelector(".pm-ticker-chart");
          if (chart) chart.innerHTML = this._sparkSvg(data.history, chg);
        }
      } catch (e) {
        console.error("polymart-ticker error:", e);
      }
    }

    _sparkSvg(history, change) {
      const pts = history.slice(-80);
      const min = Math.min(...pts);
      const max = Math.max(...pts);
      const range = max - min || 1;
      const w = 320, h = 48;
      const coords = pts.map(
        (v, i) => `${(i / (pts.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`
      );
      const color = Number(change) >= 0 ? "var(--pm-green)" : "var(--pm-red)";
      const tid = this.getAttribute("ticker") || "t";
      return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sg-${tid}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="M${coords.join("L")}L${w},${h}L0,${h}Z" fill="url(#sg-${tid})" />
        <polyline points="${coords.join(" ")}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>`;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. MARKET SUMMARY
  //    <polymart-market></polymart-market>
  // ─────────────────────────────────────────────────────────────────────────────
  class PolymartMarket extends PolymartWidget {
    async render() {
      const root = this.shadowRoot;

      if (!root.querySelector(".pm-market-wrap")) {
        const s = document.createElement("style");
        s.textContent = `
          .pm-market-wrap {
            background: var(--pm-surface); border: 1px solid var(--pm-border);
            border-radius: var(--pm-radius); overflow: hidden; width: 100%; max-width: 480px;
            font-family: var(--pm-sans);
          }
          .pm-market-body { padding: 20px; }
          .pm-market-title {
            font-size: 11px; font-weight: 600; text-transform: uppercase;
            letter-spacing: 0.1em; color: var(--pm-text-dim); margin-bottom: 12px;
          }
          .pm-market-index { font-family: var(--pm-mono); font-size: 32px; font-weight: 700; margin-bottom: 4px; }
          .pm-market-change { font-family: var(--pm-mono); font-size: 14px; font-weight: 600; margin-bottom: 18px; }
          .pm-market-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }
          .pm-stat-card { background: var(--pm-surface-2); border-radius: 6px; padding: 10px; text-align: center; }
          .pm-stat-label { font-size: 10px; color: var(--pm-text-dim); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
          .pm-stat-value { font-family: var(--pm-mono); font-size: 16px; font-weight: 600; }
          .pm-fg-bar { height: 6px; border-radius: 3px; background: var(--pm-surface-2); overflow: hidden; margin: 8px 0 4px; }
          .pm-fg-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
          .pm-fg-labels { display: flex; justify-content: space-between; font-size: 10px; color: var(--pm-text-dim); }
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
        wrap.innerHTML = `
          <div class="pm-market-body">
            <div class="pm-market-title">Polymart Index</div>
            <div class="pm-market-index">-</div>
            <div class="pm-market-change">
              <span class="_chg-val">-</span>
              <span class="_chg-counts" style="color:var(--pm-text-dim);font-weight:400;margin-left:8px"></span>
            </div>
            <div class="pm-market-grid">
              <div class="pm-stat-card"><div class="pm-stat-label">Interest</div><div class="pm-stat-value _rate">-</div></div>
              <div class="pm-stat-card"><div class="pm-stat-label">Inflation</div><div class="pm-stat-value _inf">-</div></div>
              <div class="pm-stat-card"><div class="pm-stat-label">GDP</div><div class="pm-stat-value _gdp">-</div></div>
            </div>
            <div class="pm-stat-label _fg-label">Fear &amp; Greed</div>
            <div class="pm-fg-bar"><div class="pm-fg-fill"></div></div>
            <div class="pm-fg-labels"><span>Extreme Fear</span><span>Extreme Greed</span></div>
            <div style="margin-top:16px">
              <div class="pm-stat-label" style="margin-bottom:8px">Top Movers</div>
              <div class="pm-movers">
                <div class="pm-mover _gainer">
                  <span class="pm-mover-ticker _gainer-sym">-</span>
                  <span class="_gainer-pct">-</span>
                </div>
                <div class="pm-mover _loser">
                  <span class="pm-mover-ticker _loser-sym">-</span>
                  <span class="_loser-pct">-</span>
                </div>
              </div>
            </div>
          </div>
          ${this._branding()}
        `;
        root.appendChild(wrap);
      }

      try {
        const data = await apiFetch("stocks/getMarket");
        const color = changeColor(data.indexChangePct);
        const fgColor = data.fearGreed < 30 ? "var(--pm-red)" : data.fearGreed > 70 ? "var(--pm-green)" : "var(--pm-amber)";

        const idx = root.querySelector(".pm-market-index");
        if (idx) { idx.textContent = fmt(data.index, 2); idx.style.color = color; }

        const chgWrap = root.querySelector(".pm-market-change");
        if (chgWrap) chgWrap.style.color = color;
        this._setText("._chg-val", `${changeArrow(data.indexChangePct)} ${fmtPct(data.indexChangePct)}`);
        this._setText("._chg-counts", `${data.gainers}▲ ${data.losers}▼ ${data.unchanged}-`);

        this._setText("._rate", `${fmt(data.interestRate, 1)}%`);
        this._setText("._inf",  `${fmt(data.inflation, 1)}%`);
        this._setText("._gdp",  `${fmt(data.gdpGrowth, 1)}%`);

        this._setText("._fg-label", `Fear & Greed · ${data.fearGreedLabel}`);
        const fill = root.querySelector(".pm-fg-fill");
        if (fill) { fill.style.width = `${data.fearGreed}%`; fill.style.background = fgColor; }

        const gainer = root.querySelector("._gainer");
        if (gainer) { gainer.style.background = "var(--pm-green-bg)"; gainer.style.color = "var(--pm-green)"; }
        this._setText("._gainer-sym", data.topGainer?.ticker || "-");
        this._setText("._gainer-pct", fmtPct(data.topGainer?.pct));

        const loser = root.querySelector("._loser");
        if (loser) { loser.style.background = "var(--pm-red-bg)"; loser.style.color = "var(--pm-red)"; }
        this._setText("._loser-sym", data.topLoser?.ticker || "-");
        this._setText("._loser-pct", fmtPct(data.topLoser?.pct));
      } catch (e) {
        console.error("polymart-market error:", e);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. LEADERBOARD
  //    <polymart-leaderboard by="change" limit="10" dir="desc"></polymart-leaderboard>
  // ─────────────────────────────────────────────────────────────────────────────
  class PolymartLeaderboard extends PolymartWidget {
    async render() {
      const root = this.shadowRoot;
      const by    = this.getAttribute("by")    || "change";
      const dir   = this.getAttribute("dir")   || "desc";
      const limit = this.getAttribute("limit") || "10";
      const title = this.getAttribute("title") || `Top by ${by}`;

      if (!root.querySelector(".pm-lb-wrap")) {
        const s = document.createElement("style");
        s.textContent = `
          .pm-lb-wrap {
            background: var(--pm-surface); border: 1px solid var(--pm-border);
            border-radius: var(--pm-radius); overflow: hidden; width: 100%; max-width: 520px;
            font-family: var(--pm-sans);
          }
          .pm-lb-header { padding: 16px 16px 12px; border-bottom: 1px solid var(--pm-border); }
          .pm-lb-title { font-size: 14px; font-weight: 700; }
          .pm-lb-sub { font-size: 11px; color: var(--pm-text-dim); margin-top: 2px; font-family: var(--pm-mono); }
          .pm-lb-table { width: 100%; border-collapse: collapse; }
          .pm-lb-table th {
            font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
            color: var(--pm-text-dim); text-align: left; padding: 8px 12px;
            font-weight: 600; border-bottom: 1px solid var(--pm-border);
          }
          .pm-lb-table th:last-child { text-align: right; }
          .pm-lb-table td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid var(--pm-border); }
          .pm-lb-table tr:last-child td { border-bottom: none; }
          .pm-lb-rank { font-family: var(--pm-mono); font-weight: 700; color: var(--pm-text-dim); font-size: 12px; width: 32px; }
          .pm-lb-ticker { font-family: var(--pm-mono); font-weight: 700; font-size: 13px; }
          .pm-lb-name { font-size: 11px; color: var(--pm-text-dim); }
          .pm-lb-price { font-family: var(--pm-mono); font-size: 13px; text-align: right; }
          .pm-lb-change { font-family: var(--pm-mono); font-size: 13px; font-weight: 600; text-align: right; white-space: nowrap; }
        `;
        root.appendChild(s);

        const wrap = document.createElement("div");
        wrap.className = "pm-lb-wrap";
        wrap.innerHTML = `
          <div class="pm-lb-header">
            <div class="pm-lb-title">${title}</div>
            <div class="pm-lb-sub">sorted by ${by} · ${dir}</div>
          </div>
          <table class="pm-lb-table">
            <thead><tr>
              <th>#</th><th>Stock</th>
              <th style="text-align:right">Price</th>
              <th style="text-align:right">Change</th>
            </tr></thead>
            <tbody class="_lb-body"></tbody>
          </table>
          ${this._branding()}
        `;
        root.appendChild(wrap);
      }

      try {
        const data = await apiFetch("stocks/getLeaderboard", { by, dir, limit });
        const tbody = root.querySelector("._lb-body");
        if (!tbody) return;

        tbody.innerHTML = data.stocks.map((s, i) => `
          <tr>
            <td class="pm-lb-rank">${i + 1}</td>
            <td><div class="pm-lb-ticker">${s.ticker}</div><div class="pm-lb-name">${s.name}</div></td>
            <td class="pm-lb-price">${fmtPrice(s.price)}</td>
            <td class="pm-lb-change" style="color:${changeColor(s.change)}">
              ${changeArrow(s.change)} ${fmtPct(s.change)}
            </td>
          </tr>`).join("");
      } catch (e) {
        console.error("polymart-leaderboard error:", e);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. TAPE - scrolling ticker tape
  //    <polymart-tape speed="40" limit="20"></polymart-tape>
  //    Data updates are queued and applied only on animationiteration so the
  //    tape never resets mid-scroll and items don't change while visible.
  // ─────────────────────────────────────────────────────────────────────────────
  class PolymartTape extends PolymartWidget {
    constructor() {
      super();
      this._pendingItems = null;
    }

    async render() {
      const root  = this.shadowRoot;
      const speed = parseInt(this.getAttribute("speed") || "40");
      const limit = this.getAttribute("limit") || "20";

      if (!root.querySelector(".pm-tape-wrap")) {
        const s = document.createElement("style");
        s.textContent = `
          .pm-tape-wrap {
            background: var(--pm-surface); border: 1px solid var(--pm-border);
            border-radius: var(--pm-radius); overflow: hidden; white-space: nowrap;
            font-family: var(--pm-mono);
          }
          .pm-tape-track { display: inline-flex; animation: pm-tape-scroll linear infinite; }
          @keyframes pm-tape-scroll {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
          .pm-tape-item {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 10px 18px; font-size: 13px; font-weight: 600;
            border-right: 1px solid var(--pm-border);
          }
          .pm-tape-item:last-child { border-right: none; }
          .pm-tape-sym   { color: var(--pm-text); font-weight: 700; }
          .pm-tape-price { color: var(--pm-text-dim); }
        `;
        root.appendChild(s);

        const wrap = document.createElement("div");
        wrap.className = "pm-tape-wrap";
        wrap.innerHTML = `<div class="pm-loading">Loading</div>`;
        root.appendChild(wrap);
      }

      try {
        const data = await apiFetch("stocks/getLeaderboard", { by: "volume", dir: "desc", limit });

        const buildItems = (stocks) =>
          stocks.map(s => `
            <div class="pm-tape-item">
              <span class="pm-tape-sym">${s.ticker}</span>
              <span class="pm-tape-price">${fmtPrice(s.price)}</span>
              <span style="color:${changeColor(s.change)}">${changeArrow(s.change)} ${fmtPct(s.change)}</span>
            </div>`).join("");

        const wrap  = root.querySelector(".pm-tape-wrap");
        const track = wrap.querySelector(".pm-tape-track");

        if (!track) {
          // First render: build tape and attach the iteration listener
          const dur      = data.stocks.length * (100 / speed);
          const items    = buildItems(data.stocks);
          const newTrack = document.createElement("div");
          newTrack.className = "pm-tape-track";
          newTrack.style.animationDuration = `${dur}s`;
          newTrack.innerHTML = items + items;
          wrap.innerHTML = "";
          wrap.appendChild(newTrack);

          // Only swap data when the animation loops back to position 0.
          // At that moment the first item re-enters from the right - the swap is invisible.
          newTrack.addEventListener("animationiteration", () => {
            if (this._pendingItems) {
              newTrack.innerHTML = this._pendingItems + this._pendingItems;
              this._pendingItems = null;
            }
          });
        } else {
          // Subsequent renders: queue the new items for the next loop boundary
          this._pendingItems = buildItems(data.stocks);
        }
      } catch (e) {
        console.error("polymart-tape error:", e);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. SPARKLINE
  //    <polymart-sparkline ticker="VOID" width="120" height="32"></polymart-sparkline>
  // ─────────────────────────────────────────────────────────────────────────────
  class PolymartSparkline extends PolymartWidget {
    async render() {
      const root   = this.shadowRoot;
      const ticker = (this.getAttribute("ticker") || "APEX").toUpperCase();
      const w      = parseInt(this.getAttribute("width")  || "120");
      const h      = parseInt(this.getAttribute("height") || "32");

      if (!root.querySelector(".pm-spark")) {
        const wrap = document.createElement("span");
        wrap.className = "pm-spark";
        wrap.style.cssText = "display:inline-block;vertical-align:middle;";
        root.appendChild(wrap);
      }

      try {
        const data  = await apiFetch("stocks/getHistory", { ticker, limit: 60 });
        const pts   = data.history;
        const min   = Math.min(...pts);
        const max   = Math.max(...pts);
        const range = max - min || 1;
        const coords = pts.map(
          (v, i) => `${(i / (pts.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`
        );
        const chg   = pts.length > 1 ? pts[pts.length - 1] - pts[0] : 0;
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
  // 6. SECTOR WIDGET
  //    <polymart-sector sector="crypto"></polymart-sector>
  // ─────────────────────────────────────────────────────────────────────────────
  class PolymartSector extends PolymartWidget {
    async render() {
      const root   = this.shadowRoot;
      const sector = this.getAttribute("sector") || "tech";

      if (!root.querySelector(".pm-sec-wrap")) {
        const s = document.createElement("style");
        s.textContent = `
          .pm-sec-wrap {
            background: var(--pm-surface); border: 1px solid var(--pm-border);
            border-radius: var(--pm-radius); overflow: hidden; width: 100%; max-width: 400px;
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
          .pm-sec-sym   { font-family: var(--pm-mono); font-weight: 700; width: 70px; }
          .pm-sec-name  { flex: 1; color: var(--pm-text-dim); font-size: 12px; }
          .pm-sec-price { font-family: var(--pm-mono); width: 80px; text-align: right; }
          .pm-sec-chg   { font-family: var(--pm-mono); font-weight: 600; width: 80px; text-align: right; }
        `;
        root.appendChild(s);

        const wrap = document.createElement("div");
        wrap.className = "pm-sec-wrap";
        wrap.innerHTML = `
          <div class="pm-sec-header">
            <div class="pm-sec-title _sec-title">-</div>
            <div class="pm-sec-meta _sec-meta"></div>
          </div>
          <div class="pm-sec-stocks _sec-stocks"></div>
          ${this._branding()}
        `;
        root.appendChild(wrap);
      }

      try {
        const data = await apiFetch("stocks/getSector", { sector });

        this._setText("._sec-title", `${data.icon} ${data.label}`);

        const meta = root.querySelector("._sec-meta");
        if (meta) {
          meta.innerHTML = `
            <span>Avg: <span style="color:${changeColor(data.avgChange)}">${fmtPct(data.avgChange)}</span></span>
            <span>Momentum: ${fmt(data.momentum, 3)}</span>
            <span>${data.stocks.length} stocks</span>
          `;
        }

        const stocks = root.querySelector("._sec-stocks");
        if (stocks) {
          stocks.innerHTML = data.stocks.map(s => `
            <div class="pm-sec-row">
              <span class="pm-sec-sym">${s.ticker}</span>
              <span class="pm-sec-name">${s.name}</span>
              <span class="pm-sec-price">${fmtPrice(s.price)}</span>
              <span class="pm-sec-chg" style="color:${changeColor(s.change)}">${fmtPct(s.change)}</span>
            </div>`).join("");
        }
      } catch (e) {
        console.error("polymart-sector error:", e);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. EVENTS
  //    <polymart-events limit="5"></polymart-events>
  // ─────────────────────────────────────────────────────────────────────────────
  class PolymartEvents extends PolymartWidget {
    async render() {
      const root   = this.shadowRoot;
      const limit  = this.getAttribute("limit") || "5";
      const sector = this.getAttribute("sector");

      if (!root.querySelector(".pm-ev-wrap")) {
        const s = document.createElement("style");
        s.textContent = `
          .pm-ev-wrap {
            background: var(--pm-surface); border: 1px solid var(--pm-border);
            border-radius: var(--pm-radius); overflow: hidden; width: 100%; max-width: 480px;
            font-family: var(--pm-sans);
          }
          .pm-ev-header { padding: 14px 16px; font-size: 14px; font-weight: 700; border-bottom: 1px solid var(--pm-border); }
          .pm-ev-list { padding: 4px 0; }
          .pm-ev-item { padding: 10px 16px; border-bottom: 1px solid var(--pm-border); }
          .pm-ev-item:last-child { border-bottom: none; }
          .pm-ev-text { font-size: 13px; line-height: 1.5; }
          .pm-ev-meta { display: flex; gap: 12px; margin-top: 4px; font-size: 11px; color: var(--pm-text-dim); font-family: var(--pm-mono); }
          .pm-ev-badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }
        `;
        root.appendChild(s);

        const wrap = document.createElement("div");
        wrap.className = "pm-ev-wrap";
        wrap.innerHTML = `
          <div class="pm-ev-header">💡 Market Events</div>
          <div class="pm-ev-list _ev-list"></div>
          ${this._branding()}
        `;
        root.appendChild(wrap);
      }

      try {
        const params = { limit };
        if (sector) params.sector = sector;
        const data = await apiFetch("stocks/getEvents", params);

        const list = root.querySelector("._ev-list");
        if (list) {
          list.innerHTML = data.map(ev => `
            <div class="pm-ev-item">
              <div class="pm-ev-text">${ev.text}</div>
              <div class="pm-ev-meta">
                <span class="pm-ev-badge" style="background:${ev.effect >= 0 ? "var(--pm-green-bg)" : "var(--pm-red-bg)"};color:${ev.effect >= 0 ? "var(--pm-green)" : "var(--pm-red)"}">
                  ${ev.effect >= 0 ? "Bullish" : "Bearish"} · ${fmt(Math.abs(ev.effect), 1)}
                </span>
                ${ev.sector ? `<span>${ev.sector}</span>` : "<span>Market-wide</span>"}
                <span>Weight ${ev.weight}</span>
              </div>
            </div>`).join("");
        }
      } catch (e) {
        console.error("polymart-events error:", e);
      }
    }
  }

  // ── Register ─────────────────────────────────────────────────────────────────
  customElements.define("polymart-ticker",      PolymartTicker);
  customElements.define("polymart-market",      PolymartMarket);
  customElements.define("polymart-leaderboard", PolymartLeaderboard);
  customElements.define("polymart-tape",        PolymartTape);
  customElements.define("polymart-sparkline",   PolymartSparkline);
  customElements.define("polymart-sector",      PolymartSector);
  customElements.define("polymart-events",      PolymartEvents);

  window.PolymartWidgets = { version: "2.0.0" };
})();
