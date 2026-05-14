/**
 * Polymart Forex Widgets v1.0
 * Drop-in HTML widgets for forex currency pair data.
 * Embed live Polymart forex data on any website with a single script tag.
 *
 * Usage:
 *   <script src="https://polymart.co/widgets/polymart-forex-widgets.js"></script>
 *
 * Then use any of these custom elements:
 *   <polymart-forex-ticker pair="EURUSD"></polymart-forex-ticker>
 *   <polymart-forex-table category="major"></polymart-forex-table>
 *   <polymart-forex-chart pair="GBPUSD"></polymart-forex-chart>
 *   <polymart-forex-heatmap></polymart-forex-heatmap>
 *
 * All widgets auto-refresh every 10 seconds to match the simulation tick.
 * No API key required. No dependencies.
 */

(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────────────────────────────
  const API = "https://polymart.co/api/v1";
  const TICK = 10000;
  const FONT_URL =
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap";

  if (!document.getElementById("polymart-forex-widget-styles")) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_URL;
    document.head.appendChild(link);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function fmt(n, dp = 4) {
    if (n == null) return "-";
    return Number(n).toFixed(dp);
  }
  function fmtPct(n) {
    if (n == null) return "-";
    const s = Number(n) >= 0 ? "+" : "";
    return s + Number(n).toFixed(3) + "%";
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
  function fmtRate(n, decimals) {
    if (n == null) return "-";
    return Number(n).toFixed(decimals ?? 4);
  }

  async function apiFetch(endpoint, params = {}) {
    const url = new URL(`${API}/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v != null) url.searchParams.set(k, v);
    });
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Polymart Forex API error: ${res.status}`);
    return res.json();
  }

  // ── Shared base class ────────────────────────────────────────────────────────
  class ForexWidget extends HTMLElement {
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
          --pm-cyan: #06b6d4;
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
        .pm-loading {
          display: flex; align-items: center; justify-content: center;
          padding: 24px; color: var(--pm-text-dim); font-size: 13px;
        }
        .pm-loading::after {
          content: ''; width: 14px; height: 14px; margin-left: 8px;
          border: 2px solid var(--pm-border); border-top-color: var(--pm-cyan);
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
        .pm-branding a:hover img { opacity: 1; }
        .flag {
          display: inline-flex; align-items: center; justify-content: center;
          width: 20px; height: 20px; border-radius: 50%;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          font-size: 13px; line-height: 1; overflow: hidden;
          flex-shrink: 0;
        }
        .flag-sm {
          width: 16px; height: 16px; font-size: 10px;
        }
        .pair-flags {
          position: relative; display: inline-flex;
          width: 28px; height: 20px; flex-shrink: 0;
        }
        .pair-flags .flag:last-child {
          position: absolute; left: 12px; top: 0;
        }
        .cat-major { color: var(--pm-blue); }
        .cat-minor { color: var(--pm-cyan); }
        .cat-exotic { color: var(--pm-amber); }
      `;
      this.shadowRoot.appendChild(s);
    }

    _branding() {
      const logoUrl = this.getAttribute("logo") || "https://polymart.co/polymartlogo.png";
      return `<div class="pm-branding"><a href="https://polymart.co" target="_blank" rel="noopener"><img src="${logoUrl}" alt="Polymart" /></a></div>`;
    }

    _loading() {
      return `<div class="pm-loading">Loading</div>`;
    }

    _flags(baseFlag, quoteFlag) {
      return `
        <div class="pair-flags">
          <span class="flag">${baseFlag}</span>
          <span class="flag">${quoteFlag}</span>
        </div>`;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. FOREX TICKER - single currency pair price card
  //    <polymart-forex-ticker pair="EURUSD"></polymart-forex-ticker>
  // ─────────────────────────────────────────────────────────────────────────────
  class ForexTicker extends ForexWidget {
    static get observedAttributes() {
      return ["pair", "theme"];
    }
    attributeChangedCallback() {
      this.render();
    }

    async render() {
      const pair = (this.getAttribute("pair") || "EURUSD").toUpperCase();
      const root = this.shadowRoot;

      if (!root.querySelector(".pm-fx-ticker-wrap")) {
        const s = document.createElement("style");
        s.textContent = `
          .pm-fx-ticker-wrap {
            background: var(--pm-surface);
            border: 1px solid var(--pm-border);
            border-radius: var(--pm-radius);
            overflow: hidden; min-width: 240px; max-width: 380px;
          }
          .pm-fx-ticker-body { padding: 16px; }
          .pm-fx-ticker-header {
            display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
          }
          .pm-fx-pair-info { display: flex; align-items: center; gap: 8px; }
          .pm-fx-pair-sym {
            font-family: var(--pm-mono); font-size: 15px; font-weight: 700; letter-spacing: 0.05em;
          }
          .pm-fx-cat-badge {
            font-size: 9px; padding: 2px 7px; border-radius: 100px;
            font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
            border: 1px solid currentColor; opacity: 0.8;
          }
          .pm-fx-names {
            font-size: 11px; color: var(--pm-text-dim); margin-bottom: 12px;
          }
          .pm-fx-price {
            font-family: var(--pm-mono); font-size: 26px; font-weight: 700; margin-bottom: 4px;
          }
          .pm-fx-change {
            font-family: var(--pm-mono); font-size: 13px; font-weight: 600; margin-bottom: 14px;
          }
          .pm-fx-meta {
            display: grid; grid-template-columns: 1fr 1fr 1fr;
            gap: 8px; padding-top: 12px; border-top: 1px solid var(--pm-border);
          }
          .pm-fx-meta-item { font-size: 10px; color: var(--pm-text-dim); }
          .pm-fx-meta-val {
            font-family: var(--pm-mono); font-size: 12px; font-weight: 500; color: var(--pm-text); display: block; margin-top: 2px;
          }
        `;
        root.appendChild(s);
        const wrap = document.createElement("div");
        wrap.className = "pm-fx-ticker-wrap";
        wrap.innerHTML = this._loading();
        root.appendChild(wrap);
      }

      try {
        const data = await apiFetch("forex/getPair", { pair });
        const wrap = root.querySelector(".pm-fx-ticker-wrap");
        const chg = data.changePct;
        const color = changeColor(chg);
        const catCls = data.category === "major" ? "cat-major" : data.category === "minor" ? "cat-minor" : "cat-exotic";

        wrap.innerHTML = `
          <div class="pm-fx-ticker-body">
            <div class="pm-fx-ticker-header">
              <div class="pm-fx-pair-info">
                ${this._flags(data.baseFlag, data.quoteFlag)}
                <span class="pm-fx-pair-sym">${data.pair}</span>
                <span class="pm-fx-cat-badge ${catCls}">${data.category}</span>
              </div>
            </div>
            <div class="pm-fx-names">${data.baseName} / ${data.quoteName}</div>
            <div class="pm-fx-price" style="color:${color}">${fmtRate(data.price, data.decimals)}</div>
            <div class="pm-fx-change" style="color:${color}">
              ${changeArrow(chg)} ${fmtPct(chg)}
            </div>
            <div class="pm-fx-meta">
              <div class="pm-fx-meta-item">Bid<span class="pm-fx-meta-val">${fmtRate(data.bid, data.decimals)}</span></div>
              <div class="pm-fx-meta-item">Ask<span class="pm-fx-meta-val">${fmtRate(data.ask, data.decimals)}</span></div>
              <div class="pm-fx-meta-item">Spread<span class="pm-fx-meta-val">${data.spreadPips} pips</span></div>
              <div class="pm-fx-meta-item">RSI<span class="pm-fx-meta-val">${fmt(data.rsi, 1)}</span></div>
              <div class="pm-fx-meta-item">52w H<span class="pm-fx-meta-val">${fmtRate(data.hi52w, data.decimals)}</span></div>
              <div class="pm-fx-meta-item">52w L<span class="pm-fx-meta-val">${fmtRate(data.lo52w, data.decimals)}</span></div>
            </div>
          </div>
          ${this._branding()}
        `;
      } catch (e) {
        console.error("polymart-forex-ticker error:", e);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. FOREX TABLE - filterable table of currency pairs
  //    <polymart-forex-table category="major"></polymart-forex-table>
  // ─────────────────────────────────────────────────────────────────────────────
  class ForexTable extends ForexWidget {
    async render() {
      const root = this.shadowRoot;
      const category = this.getAttribute("category") || "all";
      const limit = parseInt(this.getAttribute("limit") || "28");

      if (!root.querySelector(".pm-fx-table-wrap")) {
        const s = document.createElement("style");
        s.textContent = `
          .pm-fx-table-wrap {
            background: var(--pm-surface);
            border: 1px solid var(--pm-border);
            border-radius: var(--pm-radius);
            overflow: hidden; max-width: 640px;
          }
          .pm-fx-table-header {
            padding: 14px 16px; border-bottom: 1px solid var(--pm-border);
            display: flex; align-items: center; justify-content: space-between; gap: 8px;
          }
          .pm-fx-table-title { font-size: 14px; font-weight: 700; }
          .pm-fx-filters { display: flex; gap: 4px; }
          .pm-fx-filter-btn {
            padding: 3px 10px; border-radius: 100px; font-size: 10px; font-weight: 600;
            border: 1px solid var(--pm-border); cursor: pointer;
            background: transparent; color: var(--pm-text-dim); transition: all 0.15s;
          }
          .pm-fx-filter-btn.active {
            background: rgba(6,182,212,0.1); border-color: rgba(6,182,212,0.3);
            color: var(--pm-cyan);
          }
          table { width: 100%; border-collapse: collapse; font-family: var(--pm-sans); }
          th {
            padding: 8px 12px; font-size: 10px; text-transform: uppercase;
            letter-spacing: 0.08em; color: var(--pm-text-dim); text-align: left; font-weight: 600;
            border-bottom: 1px solid var(--pm-border);
          }
          th.r { text-align: right; }
          td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid var(--pm-border); }
          tr:last-child td { border-bottom: none; }
          .pair-cell { display: flex; align-items: center; gap: 8px; }
          .pair-sym { font-family: var(--pm-mono); font-weight: 700; font-size: 13px; }
          .pair-names { font-size: 10px; color: var(--pm-text-dim); margin-top: 1px; }
          .price-cell { font-family: var(--pm-mono); text-align: right; }
          .chg-cell { font-family: var(--pm-mono); font-weight: 600; text-align: right; white-space: nowrap; }
          .spread-cell { font-family: var(--pm-mono); text-align: right; color: var(--pm-text-dim); font-size: 11px; }
        `;
        root.appendChild(s);
        const wrap = document.createElement("div");
        wrap.className = "pm-fx-table-wrap";
        wrap.innerHTML = this._loading();
        root.appendChild(wrap);
      }

      try {
        const allPairs = await apiFetch("forex/getPairs");
        const wrap = root.querySelector(".pm-fx-table-wrap");
        const pairs = Object.values(allPairs)
          .filter(p => category === "all" || p.category === category)
          .slice(0, limit);

        const rows = pairs.map(p => `
          <tr>
            <td>
              <div class="pair-cell">
                ${this._flags(p.baseFlag, p.quoteFlag)}
                <div>
                  <div class="pair-sym">${p.pair}</div>
                  <div class="pair-names">${p.baseName} / ${p.quoteName}</div>
                </div>
              </div>
            </td>
            <td class="price-cell">${fmtRate(p.price, p.decimals)}</td>
            <td class="chg-cell" style="color:${changeColor(p.changePct)}">
              ${changeArrow(p.changePct)} ${fmtPct(p.changePct)}
            </td>
            <td class="spread-cell">${p.spreadPips}</td>
          </tr>
        `).join("");

        const activeClass = (cat) => (category === cat || (cat === "all" && category === "all")) ? "active" : "";

        wrap.innerHTML = `
          <div class="pm-fx-table-header">
            <div class="pm-fx-table-title">💱 Forex Pairs</div>
            <div class="pm-fx-filters">
              <button class="pm-fx-filter-btn ${activeClass("all")}" data-cat="all">All</button>
              <button class="pm-fx-filter-btn ${activeClass("major")}" data-cat="major">Major</button>
              <button class="pm-fx-filter-btn ${activeClass("minor")}" data-cat="minor">Minor</button>
              <button class="pm-fx-filter-btn ${activeClass("exotic")}" data-cat="exotic">Exotic</button>
            </div>
          </div>
          <div style="overflow-x:auto">
            <table>
              <thead><tr>
                <th>Pair</th>
                <th class="r">Rate</th>
                <th class="r">Change</th>
                <th class="r">Spread</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          ${this._branding()}
        `;

        wrap.querySelectorAll(".pm-fx-filter-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            this.setAttribute("category", btn.dataset.cat);
          });
        });
      } catch (e) {
        console.error("polymart-forex-table error:", e);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. FOREX CHART - rate history line chart for a currency pair
  //    <polymart-forex-chart pair="GBPUSD" height="200"></polymart-forex-chart>
  // ─────────────────────────────────────────────────────────────────────────────
  class ForexChart extends ForexWidget {
    static get observedAttributes() {
      return ["pair", "theme"];
    }
    attributeChangedCallback() {
      this.render();
    }

    async render() {
      const pair = (this.getAttribute("pair") || "EURUSD").toUpperCase();
      const chartH = parseInt(this.getAttribute("height") || "160");
      const root = this.shadowRoot;

      if (!root.querySelector(".pm-fx-chart-wrap")) {
        const s = document.createElement("style");
        s.textContent = `
          .pm-fx-chart-wrap {
            background: var(--pm-surface);
            border: 1px solid var(--pm-border);
            border-radius: var(--pm-radius);
            overflow: hidden; min-width: 280px; max-width: 600px;
          }
          .pm-fx-chart-header {
            padding: 12px 16px; border-bottom: 1px solid var(--pm-border);
            display: flex; align-items: center; justify-content: space-between;
          }
          .pm-fx-chart-info { display: flex; align-items: center; gap: 8px; }
          .pm-fx-chart-pair { font-family: var(--pm-mono); font-size: 14px; font-weight: 700; }
          .pm-fx-chart-price { font-family: var(--pm-mono); font-size: 14px; font-weight: 600; }
          .pm-fx-chart-body { padding: 12px 16px 8px; }
          canvas { display: block; width: 100%; }
        `;
        root.appendChild(s);
        const wrap = document.createElement("div");
        wrap.className = "pm-fx-chart-wrap";
        wrap.innerHTML = this._loading();
        root.appendChild(wrap);
      }

      try {
        const data = await apiFetch("forex/getPair", { pair });
        const wrap = root.querySelector(".pm-fx-chart-wrap");
        const pts = (data.history || []).slice(-120);
        const chg = data.changePct;
        const color = Number(chg) >= 0 ? "#22c55e" : "#ef4444";

        const canvasId = `fxc-${pair}-${Math.random().toString(36).slice(2,6)}`;

        wrap.innerHTML = `
          <div class="pm-fx-chart-header">
            <div class="pm-fx-chart-info">
              ${this._flags(data.baseFlag, data.quoteFlag)}
              <span class="pm-fx-chart-pair">${data.pair}</span>
            </div>
            <div>
              <span class="pm-fx-chart-price" style="color:${color}">
                ${fmtRate(data.price, data.decimals)}
                &nbsp;${changeArrow(chg)} ${fmtPct(chg)}
              </span>
            </div>
          </div>
          <div class="pm-fx-chart-body">
            <canvas id="${canvasId}" height="${chartH}"></canvas>
          </div>
          ${this._branding()}
        `;

        const canvas = wrap.querySelector(`#${canvasId}`);
        if (!canvas || pts.length < 2) return;

        const dpr = window.devicePixelRatio || 1;
        const displayW = canvas.offsetWidth || 400;
        canvas.width = displayW * dpr;
        canvas.height = chartH * dpr;
        canvas.style.width = displayW + "px";
        canvas.style.height = chartH + "px";

        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);

        const W = displayW;
        const H = chartH;
        const pad = { top: 8, right: 8, bottom: 8, left: 8 };
        const iW = W - pad.left - pad.right;
        const iH = H - pad.top - pad.bottom;

        const min = Math.min(...pts);
        const max = Math.max(...pts);
        const range = max - min || 1;

        const xOf = (i) => pad.left + (i / (pts.length - 1)) * iW;
        const yOf = (v) => pad.top + iH - ((v - min) / range) * iH;

        const grad = ctx.createLinearGradient(0, pad.top, 0, H);
        grad.addColorStop(0, color.replace(")", ",0.18)").replace("rgb", "rgba").replace("#22c55e", "rgba(34,197,94,0.18)").replace("#ef4444", "rgba(239,68,68,0.18)"));
        grad.addColorStop(1, "rgba(0,0,0,0)");

        ctx.beginPath();
        ctx.moveTo(xOf(0), yOf(pts[0]));
        for (let i = 1; i < pts.length; i++) ctx.lineTo(xOf(i), yOf(pts[i]));
        ctx.lineTo(xOf(pts.length - 1), H);
        ctx.lineTo(xOf(0), H);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(xOf(0), yOf(pts[0]));
        for (let i = 1; i < pts.length; i++) ctx.lineTo(xOf(i), yOf(pts[i]));
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = "round";
        ctx.stroke();
      } catch (e) {
        console.error("polymart-forex-chart error:", e);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. FOREX HEATMAP - color-coded grid of all pairs by % change
  //    <polymart-forex-heatmap></polymart-forex-heatmap>
  // ─────────────────────────────────────────────────────────────────────────────
  class ForexHeatmap extends ForexWidget {
    async render() {
      const root = this.shadowRoot;
      const showLabels = this.getAttribute("labels") !== "false";

      if (!root.querySelector(".pm-fx-hm-wrap")) {
        const s = document.createElement("style");
        s.textContent = `
          .pm-fx-hm-wrap {
            background: var(--pm-surface);
            border: 1px solid var(--pm-border);
            border-radius: var(--pm-radius);
            overflow: hidden; max-width: 640px;
          }
          .pm-fx-hm-header {
            padding: 12px 16px; border-bottom: 1px solid var(--pm-border);
            display: flex; align-items: center; justify-content: space-between;
          }
          .pm-fx-hm-title { font-size: 13px; font-weight: 700; }
          .pm-fx-hm-legend {
            display: flex; align-items: center; gap: 8px; font-size: 10px; color: var(--pm-text-dim);
          }
          .pm-fx-hm-grid {
            display: grid; gap: 3px; padding: 12px;
          }
          .pm-fx-hm-cell {
            border-radius: 5px; padding: 7px 6px;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            gap: 2px; cursor: default; transition: opacity 0.15s;
            min-height: 52px;
          }
          .pm-fx-hm-cell:hover { opacity: 0.8; }
          .pm-fx-hm-sym { font-family: var(--pm-mono); font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.9); }
          .pm-fx-hm-pct { font-family: var(--pm-mono); font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.95); }
        `;
        root.appendChild(s);
        const wrap = document.createElement("div");
        wrap.className = "pm-fx-hm-wrap";
        wrap.innerHTML = this._loading();
        root.appendChild(wrap);
      }

      try {
        const allPairs = await apiFetch("forex/getPairs");
        const wrap = root.querySelector(".pm-fx-hm-wrap");
        const pairs = Object.values(allPairs);

        function heatColor(pct) {
          const v = Math.max(-0.5, Math.min(0.5, Number(pct)));
          if (v >= 0) {
            const i = Math.round(v / 0.5 * 100);
            return `rgba(34,197,94,${0.15 + i * 0.007})`;
          } else {
            const i = Math.round(Math.abs(v) / 0.5 * 100);
            return `rgba(239,68,68,${0.15 + i * 0.007})`;
          }
        }

        const cols = pairs.length <= 14 ? 4 : 6;
        const cells = pairs.map(p => `
          <div class="pm-fx-hm-cell" style="background:${heatColor(p.changePct)}" title="${p.baseName}/${p.quoteName}: ${fmtPct(p.changePct)}">
            <span class="pm-fx-hm-sym">${p.pair}</span>
            <span class="pm-fx-hm-pct">${fmtPct(p.changePct)}</span>
          </div>
        `).join("");

        wrap.innerHTML = `
          <div class="pm-fx-hm-header">
            <div class="pm-fx-hm-title">💱 Forex Heatmap</div>
            <div class="pm-fx-hm-legend">
              <span style="color:var(--pm-red)">◼ Bearish</span>
              <span style="color:var(--pm-green)">◼ Bullish</span>
            </div>
          </div>
          <div class="pm-fx-hm-grid" style="grid-template-columns:repeat(${cols},1fr)">
            ${cells}
          </div>
          ${this._branding()}
        `;
      } catch (e) {
        console.error("polymart-forex-heatmap error:", e);
      }
    }
  }

  // ── Register all custom elements ─────────────────────────────────────────────
  customElements.define("polymart-forex-ticker", ForexTicker);
  customElements.define("polymart-forex-table", ForexTable);
  customElements.define("polymart-forex-chart", ForexChart);
  customElements.define("polymart-forex-heatmap", ForexHeatmap);

  window.PolymartForexWidgets = { version: "1.0.0" };
})();
