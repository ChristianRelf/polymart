import express from "express";
import { dbMarket as pool } from "./db.js";
import { STOCK_DEFS, SECTORS } from "./simulation.js";
import { COMPANY_PROFILES, generateNews } from "./company-data.js";
import { FOREX_PAIRS, COUNTRY_FLAGS } from "./forex-simulation.js";

const router = express.Router();

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function setCors(res) {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
}

// ── Rate limiter (in-memory sliding window) ───────────────────────────────────
// 60 requests per 60-second window per IP.
// Expensive endpoints (getStocks, getHistory, getLeaderboard) count as 3 tokens.
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT     = 400;
const HEAVY_COST     = 3;
const HEAVY_ROUTES   = new Set(["/getStocks", "/getHistory", "/getLeaderboard", "/forex/getCorrelations"]);

// Map<ip, { tokens: number, windowStart: number }>
const rateBuckets = new Map();

// Prune stale buckets every 5 minutes to prevent unbounded memory growth
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  for (const [ip, bucket] of rateBuckets) {
    if (bucket.windowStart < cutoff) rateBuckets.delete(ip);
  }
}, 5 * 60_000);

function rateLimit(req, res, next) {
  const ip   = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress || "unknown";
  const now  = Date.now();
  const cost = HEAVY_ROUTES.has(req.path) ? HEAVY_COST : 1;

  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
    bucket = { tokens: 0, windowStart: now };
    rateBuckets.set(ip, bucket);
  }

  bucket.tokens += cost;

  const remaining = Math.max(0, RATE_LIMIT - bucket.tokens);
  const resetSecs = Math.ceil((bucket.windowStart + RATE_WINDOW_MS - now) / 1000);

  res.setHeader("X-RateLimit-Limit",     RATE_LIMIT);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset",     resetSecs);

  if (bucket.tokens > RATE_LIMIT) {
    setCors(res);
    return res.status(429).json({
      error: "Too many requests. Please slow down.",
      retryAfter: resetSecs,
    });
  }

  next();
}

router.use(rateLimit);

// Rewrite /stocks/* to /* so both namespaced and bare paths share the same handlers.
router.use((req, _res, next) => {
  if (req.path.startsWith("/stocks/")) {
    req.url = req.url.replace("/stocks/", "/");
  }
  next();
});

function fgLabel(v) {
  if (v <= 12) return "Extreme Fear";
  if (v <= 25) return "Fear";
  if (v <= 40) return "Cautious";
  if (v <= 60) return "Neutral";
  if (v <= 75) return "Greed";
  if (v <= 88) return "High Greed";
  return "Extreme Greed";
}

// Preflight
router.options("*", (req, res) => { setCors(res); res.sendStatus(200); });

// ── GET /api/v1/getMarket ─────────────────────────────────────────────────────
router.get("/getMarket", async (req, res) => {
  setCors(res);
  try {
    const [msRows] = await pool.query("SELECT * FROM market_state WHERE id = 1 LIMIT 1");
    const ms = msRows[0];
    if (!ms) return res.status(503).json({ error: "Simulation not yet initialised." });

    const [stocks] = await pool.query("SELECT ticker, price, prev_price FROM stocks_state");
    let gainers = 0, losers = 0;
    let tG = { ticker: "", pct: -Infinity };
    let tL = { ticker: "", pct:  Infinity };
    for (const s of stocks) {
      const pct = s.prev_price > 0 ? ((s.price - s.prev_price) / s.prev_price) * 100 : 0;
      if (pct > 0) gainers++; else if (pct < 0) losers++;
      if (pct > tG.pct) tG = { ticker: s.ticker, pct: +pct.toFixed(2) };
      if (pct < tL.pct) tL = { ticker: s.ticker, pct: +pct.toFixed(2) };
    }

    res.json({
      index: +ms.index_value,
      indexChange: +(ms.index_value - ms.index_prev).toFixed(2),
      indexChangePct: ms.index_prev > 0 ? +((ms.index_value - ms.index_prev) / ms.index_prev * 100).toFixed(3) : 0,
      fearGreed: Math.round(ms.fear_greed),
      fearGreedLabel: fgLabel(ms.fear_greed),
      vix: +ms.vix,
      marketSession: ms.market_session ?? "open",
      advanceDecline: ms.advance_decline ?? 0,
      newHighs: ms.new_highs ?? 0,
      newLows: ms.new_lows ?? 0,
      interestRate: +ms.interest_rate,
      inflation: +ms.inflation,
      gdpGrowth: +ms.gdp_growth,
      gainers, losers,
      unchanged: stocks.length - gainers - losers,
      totalStocks: stocks.length,
      topGainer: tG, topLoser: tL,
      upStreak: ms.up_streak, downStreak: ms.down_streak,
      tickCount: ms.tick_count,
      updatedAt: ms.updated_at,
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── GET /api/v1/getStocks[?sector=] ───────────────────────────────────────────
router.get("/getStocks", async (req, res) => {
  setCors(res);
  try {
    const sector = req.query.sector?.toLowerCase();
    let sql = "SELECT ticker,name,sector,mcap,price,prev_price,hi52w,lo52w,volume,buy_volume,sell_volume,rsi,streak,bid,ask,spread_pct,vwap,session,halted,atr,beta,macd,macd_signal,macd_hist,bb_upper,bb_middle,bb_lower,bb_bw,sma20,sma50 FROM stocks_state";
    const params = [];
    if (sector) { sql += " WHERE sector = ?"; params.push(sector); }
    sql += " ORDER BY ticker";
    const [rows] = await pool.query(sql, params);

    const result = {};
    for (const s of rows) {
      const def = STOCK_DEFS[s.ticker];
      const totalVol = (s.buy_volume || 0) + (s.sell_volume || 0);
      result[s.ticker] = {
        name: s.name, sector: s.sector, mcap: s.mcap,
        price: +s.price,
        change: s.prev_price > 0 ? +((s.price - s.prev_price) / s.prev_price * 100).toFixed(2) : 0,
        volume: s.volume,
        buyVolume: s.buy_volume || 0,
        sellVolume: s.sell_volume || 0,
        orderFlow: totalVol > 0 ? +(((s.buy_volume || 0) / totalVol - 0.5) * 100).toFixed(1) : 0,
        rsi: +s.rsi, streak: s.streak,
        hi52w: +s.hi52w, lo52w: +s.lo52w,
        bid: +s.bid, ask: +s.ask, spreadPct: +s.spread_pct,
        vwap: +s.vwap, session: s.session, halted: !!s.halted,
        atr: +s.atr, beta: +s.beta,
        macd: +s.macd, macdSignal: +s.macd_signal, macdHist: +s.macd_hist,
        bbUpper: +s.bb_upper, bbMiddle: +s.bb_middle, bbLower: +s.bb_lower, bbBw: +s.bb_bw,
        sma20: +s.sma20, sma50: +s.sma50,
        volatility: def?.volatility ?? null,
        trend: def?.trend ?? null,
      };
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── GET /api/v1/getStock?ticker= ──────────────────────────────────────────────
router.get("/getStock", async (req, res) => {
  setCors(res);
  try {
    const ticker = (req.query.ticker || "").toUpperCase();
    if (!ticker) return res.status(400).json({ error: "Missing ?ticker= parameter" });

    const [rows] = await pool.query("SELECT * FROM stocks_state WHERE ticker = ? LIMIT 1", [ticker]);
    const s = rows[0];
    if (!s) return res.status(404).json({ error: `Ticker not found: ${ticker}` });

    const def = STOCK_DEFS[ticker];
    const pct = s.prev_price > 0 ? ((s.price - s.prev_price) / s.prev_price) * 100 : 0;
    const openPct = s.open_price > 0 ? ((s.price - s.open_price) / s.open_price) * 100 : 0;
    const peers = def ? Object.keys(STOCK_DEFS).filter(k => STOCK_DEFS[k].sector === def.sector && k !== ticker) : [];
    const totalVol = (s.buy_volume || 0) + (s.sell_volume || 0);

    res.json({
      ticker, name: s.name, sector: s.sector, mcap: s.mcap,
      price: +s.price, previousPrice: +s.prev_price, openPrice: +s.open_price,
      change: +pct.toFixed(2), changeSinceOpen: +openPct.toFixed(2),
      high52w: +s.hi52w, low52w: +s.lo52w, allTimeHigh: +s.ath,
      volume: s.volume,
      buyVolume: s.buy_volume || 0,
      sellVolume: s.sell_volume || 0,
      orderFlow: totalVol > 0 ? +(((s.buy_volume || 0) / totalVol - 0.5) * 100).toFixed(1) : 0,
      bid: +s.bid, ask: +s.ask, spreadPct: +s.spread_pct,
      vwap: +s.vwap, session: s.session, halted: !!s.halted,
      rsi: +s.rsi, momentum: +s.momentum, streak: s.streak,
      insiderBias: +s.insider_bias, beta: +s.beta, atr: +s.atr,
      ema12: +s.ema12, ema26: +s.ema26,
      macd: +s.macd, macdSignal: +s.macd_signal, macdHist: +s.macd_hist,
      bbUpper: +s.bb_upper, bbMiddle: +s.bb_middle, bbLower: +s.bb_lower, bbBw: +s.bb_bw,
      sma20: +s.sma20, sma50: +s.sma50,
      volatility: def?.volatility ?? null,
      trend: def?.trend ?? null,
      history: Array.isArray(s.history) ? s.history : [],
      candles: Array.isArray(s.candles) ? s.candles : [],
      sectorPeers: peers,
      updatedAt: s.updated_at,
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── GET /api/v1/getSectors ────────────────────────────────────────────────────
router.get("/getSectors", async (req, res) => {
  setCors(res);
  try {
    const [secRows] = await pool.query("SELECT * FROM sector_state");
    const [stockRows] = await pool.query("SELECT ticker, sector, price, prev_price, rsi, beta FROM stocks_state");

    const result = {};
    for (const key of Object.keys(SECTORS)) {
      const meta = SECTORS[key];
      const secRow = secRows.find(r => r.sector_key === key);
      const tickers = Object.keys(STOCK_DEFS).filter(t => STOCK_DEFS[t].sector === key);
      let totalChange = 0, totalRsi = 0, totalBeta = 0, cnt = 0;
      for (const t of tickers) {
        const s = stockRows.find(r => r.ticker === t);
        if (s && s.prev_price > 0) {
          totalChange += (s.price - s.prev_price) / s.prev_price * 100;
          totalRsi += +(s.rsi || 50);
          totalBeta += +(s.beta || 1);
          cnt++;
        }
      }
      result[key] = {
        label: meta.label, icon: meta.icon,
        avgChange: cnt > 0 ? +(totalChange / cnt).toFixed(2) : 0,
        avgRsi: cnt > 0 ? +(totalRsi / cnt).toFixed(1) : 50,
        avgBeta: cnt > 0 ? +(totalBeta / cnt).toFixed(2) : 1,
        newsStack: secRow ? +secRow.news_stack : 0,
        momentum: secRow ? +secRow.trend : 0,
        tickers, tickerCount: tickers.length,
      };
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── GET /api/v1/getSector?sector= ─────────────────────────────────────────────
router.get("/getSector", async (req, res) => {
  setCors(res);
  try {
    const sectorKey = (req.query.sector || "").toLowerCase();
    if (!sectorKey) return res.status(400).json({ error: "Missing ?sector= parameter" });
    const meta = SECTORS[sectorKey];
    if (!meta) return res.status(404).json({ error: `Unknown sector: ${sectorKey}` });

    const tickers = Object.keys(STOCK_DEFS).filter(t => STOCK_DEFS[t].sector === sectorKey);
    const placeholders = tickers.map(() => "?").join(",");
    const [[secRow], stockRows] = await Promise.all([
      pool.query("SELECT * FROM sector_state WHERE sector_key = ? LIMIT 1", [sectorKey]).then(([r]) => r),
      pool.query(`SELECT ticker,name,price,prev_price,volume,rsi,bid,ask,spread_pct,vwap,macd,macd_hist,bb_bw,session,halted FROM stocks_state WHERE ticker IN (${placeholders})`, tickers).then(([r]) => r),
    ]);

    let totalChange = 0, cnt = 0;
    const stockList = stockRows.map(s => {
      const pct = s.prev_price > 0 ? (s.price - s.prev_price) / s.prev_price * 100 : 0;
      totalChange += pct; cnt++;
      return { ticker: s.ticker, name: s.name, price: +s.price, change: +pct.toFixed(2), volume: s.volume, rsi: +s.rsi, bid: +s.bid, ask: +s.ask, spreadPct: +s.spread_pct, vwap: +s.vwap, macd: +s.macd, macdHist: +s.macd_hist, bbBw: +s.bb_bw, session: s.session, halted: !!s.halted };
    });

    res.json({ key: sectorKey, label: meta.label, icon: meta.icon, avgChange: cnt > 0 ? +(totalChange / cnt).toFixed(2) : 0, newsStack: secRow ? +secRow.news_stack : 0, momentum: secRow ? +secRow.trend : 0, stocks: stockList, updatedAt: secRow?.updated_at ?? null });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── GET /api/v1/getEvents ─────────────────────────────────────────────────────
router.get("/getEvents", async (req, res) => {
  setCors(res);
  try {
    const limit = Math.min(parseInt(req.query.limit || "10"), 40);
    const sector = req.query.sector?.toLowerCase();
    const category = req.query.category?.toLowerCase();
    let sql = "SELECT * FROM events_log WHERE 1=1";
    const params = [];
    if (sector) { sql += " AND sector = ?"; params.push(sector); }
    if (category) { sql += " AND category = ?"; params.push(category); }
    sql += " ORDER BY fired_at DESC LIMIT ?";
    params.push(limit);
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(e => ({ id: e.id, text: e.event_text, effect: +e.effect, sector: e.sector ?? null, weight: e.weight, category: e.category ?? null, firedAt: e.fired_at })));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── GET /api/v1/getTopMovers ──────────────────────────────────────────────────
router.get("/getTopMovers", async (req, res) => {
  setCors(res);
  try {
    const limit = Math.min(parseInt(req.query.limit || "5"), 20);
    const [stocks] = await pool.query("SELECT ticker,name,sector,price,prev_price,volume,rsi,atr,beta,session,halted FROM stocks_state");
    const withChange = stocks.map(s => ({ ticker: s.ticker, name: s.name, sector: s.sector, price: +s.price, change: s.prev_price > 0 ? +((s.price - s.prev_price) / s.prev_price * 100).toFixed(2) : 0, volume: s.volume, rsi: +s.rsi, atr: +s.atr, beta: +s.beta, session: s.session, halted: !!s.halted })).sort((a, b) => b.change - a.change);
    res.json({ gainers: withChange.slice(0, limit), losers: withChange.slice(-limit).reverse() });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── GET /api/v1/getLeaderboard ────────────────────────────────────────────────
router.get("/getLeaderboard", async (req, res) => {
  setCors(res);
  try {
    const limit = Math.min(parseInt(req.query.limit || "10"), 132);
    const dir = req.query.dir === "asc";
    const validKeys = ["change", "price", "volume", "rsi", "ath", "streak", "atr", "beta", "spreadPct", "bbBw"];
    const sortKey = validKeys.includes(req.query.by) ? req.query.by : "change";
    const [stocks] = await pool.query("SELECT ticker,name,sector,mcap,price,prev_price,volume,rsi,ath,streak,atr,beta,spread_pct,bb_bw FROM stocks_state");
    const mapped = stocks.map(s => ({ ticker: s.ticker, name: s.name, sector: s.sector, mcap: s.mcap, price: +s.price, change: s.prev_price > 0 ? +((s.price - s.prev_price) / s.prev_price * 100).toFixed(2) : 0, volume: s.volume, rsi: +s.rsi, ath: +s.ath, streak: s.streak, atr: +s.atr, beta: +s.beta, spreadPct: +s.spread_pct, bbBw: +s.bb_bw }));
    mapped.sort((a, b) => dir ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]);
    res.json({ sortedBy: sortKey, direction: dir ? "asc" : "desc", count: limit, stocks: mapped.slice(0, limit) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── GET /api/v1/getMacro ──────────────────────────────────────────────────────
router.get("/getMacro", async (req, res) => {
  setCors(res);
  try {
    const [rows] = await pool.query("SELECT * FROM market_state WHERE id = 1 LIMIT 1");
    const ms = rows[0];
    if (!ms) return res.status(503).json({ error: "Simulation not yet initialised." });
    res.json({ interestRate: +ms.interest_rate, inflation: +ms.inflation, gdpGrowth: +ms.gdp_growth, fearGreed: Math.round(ms.fear_greed), fearGreedLabel: fgLabel(ms.fear_greed), vix: +ms.vix, marketSession: ms.market_session ?? "open", advanceDecline: ms.advance_decline ?? 0, newHighs: ms.new_highs ?? 0, newLows: ms.new_lows ?? 0, crashCooldown: ms.crash_cooldown, boomCooldown: ms.boom_cooldown, updatedAt: ms.updated_at });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── GET /api/v1/getHistory?ticker= ────────────────────────────────────────────
router.get("/getHistory", async (req, res) => {
  setCors(res);
  try {
    const ticker = (req.query.ticker || "").toUpperCase();
    if (!ticker) return res.status(400).json({ error: "Missing ?ticker= parameter" });
    const limit = Math.min(parseInt(req.query.limit || "100"), 400);
    const [rows] = await pool.query("SELECT ticker, name, history, candles, updated_at FROM stocks_state WHERE ticker = ? LIMIT 1", [ticker]);
    const s = rows[0];
    if (!s) return res.status(404).json({ error: `Ticker not found: ${ticker}` });
    const history = Array.isArray(s.history) ? s.history.slice(-limit) : [];
    const candles = Array.isArray(s.candles) ? s.candles : [];
    res.json({ ticker: s.ticker, name: s.name, count: history.length, history, candles, updatedAt: s.updated_at });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── GET /api/v1/getHealth ─────────────────────────────────────────────────────
router.get("/getHealth", async (req, res) => {
  setCors(res);
  try {
    const [rows] = await pool.query("SELECT tick_count, updated_at, vix, market_session, fear_greed FROM market_state WHERE id = 1 LIMIT 1");
    const ms = rows[0];
    const secsAgo = ms ? Math.floor((Date.now() - new Date(ms.updated_at).getTime()) / 1000) : null;
    res.json({ status: ms ? "ok" : "uninitialised", tickCount: ms?.tick_count ?? 0, secondsSinceLastTick: secsAgo, stale: secsAgo !== null ? secsAgo > 30 : true, vix: ms ? +ms.vix : null, marketSession: ms?.market_session ?? null, fearGreed: ms ? Math.round(ms.fear_greed) : null, totalStocks: Object.keys(STOCK_DEFS).length, totalSectors: Object.keys(SECTORS).length, updatedAt: ms?.updated_at ?? null });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── GET /api/v1/sims ─────────────────────────────────────────────────────────
router.get("/sims", (req, res) => {
  setCors(res);
  res.json([
    {
      id: "stocks",
      label: "Stock Market",
      icon: "📈",
      status: "live",
      description: "132 simulated equities across 20 sectors. Prices update every 10 seconds.",
      assets: Object.keys(STOCK_DEFS).length,
      sectors: Object.keys(SECTORS).length,
      tickInterval: 10,
    },
    {
      id: "forex",
      label: "Forex",
      icon: "💱",
      status: "live",
      description: "28 currency pairs (major, minor, exotic) with live technical indicators.",
      assets: Object.keys(FOREX_PAIRS).length,
      categories: ["major", "minor", "exotic"],
      tickInterval: 10,
    },
    {
      id: "crypto",
      label: "Crypto Market",
      icon: "₿",
      status: "coming_soon",
      description: "Simulated cryptocurrency market with volatile assets and 24/7 trading.",
    },
  ]);
});

// ════════════════════════════════════════════════════════════════════════════════
// FOREX ENDPOINTS  - /api/v1/forex/*  (also aliased at /api/v1/forex/*)
// ════════════════════════════════════════════════════════════════════════════════

function getActiveSession() {
  const h = new Date().getUTCHours();
  const sessions = [];
  if (h >= 21 || h < 6)  sessions.push("Sydney");
  if (h >= 0  && h < 9)  sessions.push("Tokyo");
  if (h >= 7  && h < 16) sessions.push("London");
  if (h >= 12 && h < 21) sessions.push("New York");
  return sessions.length > 0 ? sessions.join(" / ") : "Off-hours";
}

function formatPairRow(p, def) {
  const pct = p.prev_price > 0 ? ((p.price - p.prev_price) / p.prev_price) * 100 : 0;
  const pipSize = def?.pipSize ?? 0.0001;
  const spreadPips = p.spread > 0 ? (p.spread * 2 / pipSize).toFixed(1) : "0.0";
  return {
    pair: p.pair,
    base: p.base,
    quote: p.quote,
    category: p.category,
    baseName: def?.baseName ?? p.base,
    quoteName: def?.quoteName ?? p.quote,
    baseCountry: def?.baseCountry ?? "",
    quoteCountry: def?.quoteCountry ?? "",
    baseFlag: COUNTRY_FLAGS[def?.baseCountry] ?? "",
    quoteFlag: COUNTRY_FLAGS[def?.quoteCountry] ?? "",
    price: +p.price,
    prevPrice: +p.prev_price,
    change: +pct.toFixed(4),
    changePct: +pct.toFixed(4),
    bid: +p.bid,
    ask: +p.ask,
    spread: +p.spread,
    spreadPips,
    hiSession: +p.hi_session,
    loSession: +p.lo_session,
    hi52w: +p.hi52w,
    lo52w: +p.lo52w,
    volume: p.volume,
    rsi: +p.rsi,
    momentum: +p.momentum,
    atr: +p.atr,
    macd: +p.macd,
    macdSignal: +p.macd_signal,
    macdHist: +p.macd_hist,
    stochK: +(p.stoch_k ?? 50),
    stochD: +(p.stoch_d ?? 50),
    cci: +(p.cci ?? 0),
    bbUpper: +p.bb_upper,
    bbMiddle: +p.bb_middle,
    bbLower: +p.bb_lower,
    bbBw: +p.bb_bw,
    sma20: +p.sma20,
    sma50: +p.sma50,
    pipSize,
    decimals: def?.decimals ?? 4,
    updatedAt: p.updated_at,
    // Computed from existing fields - no extra DB columns needed
    pivotP:  +((+p.hi_session + +p.lo_session + +p.price) / 3).toFixed(6),
    pivotR1: +(2 * (+p.hi_session + +p.lo_session + +p.price) / 3 - +p.lo_session).toFixed(6),
    pivotR2: +((+p.hi_session + +p.lo_session + +p.price) / 3 + (+p.hi_session - +p.lo_session)).toFixed(6),
    pivotS1: +(2 * (+p.hi_session + +p.lo_session + +p.price) / 3 - +p.hi_session).toFixed(6),
    pivotS2: +((+p.hi_session + +p.lo_session + +p.price) / 3 - (+p.hi_session - +p.lo_session)).toFixed(6),
    pctFrom52wHigh: p.hi52w > 0 ? +((+p.price / +p.hi52w - 1) * 100).toFixed(2) : 0,
    pctFrom52wLow:  p.lo52w > 0 ? +((+p.price / +p.lo52w - 1) * 100).toFixed(2) : 0,
    activeSession: getActiveSession(),
  };
}

// GET /api/v1/forex/getPairs[?category=major|minor|exotic]
router.get("/forex/getPairs", async (req, res) => {
  setCors(res);
  try {
    const cat = req.query.category?.toLowerCase();
    let sql = "SELECT * FROM forex_state";
    const params = [];
    if (cat) { sql += " WHERE category = ?"; params.push(cat); }
    sql += " ORDER BY pair";
    const [rows] = await pool.query(sql, params);
    const result = {};
    for (const p of rows) {
      result[p.pair] = formatPairRow(p, FOREX_PAIRS[p.pair]);
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// GET /api/v1/forex/getPair?pair=EURUSD
router.get("/forex/getPair", async (req, res) => {
  setCors(res);
  try {
    const pair = (req.query.pair || "").toUpperCase();
    if (!pair) return res.status(400).json({ error: "Missing ?pair= parameter" });
    const [rows] = await pool.query("SELECT * FROM forex_state WHERE pair = ? LIMIT 1", [pair]);
    const p = rows[0];
    if (!p) return res.status(404).json({ error: `Pair not found: ${pair}` });
    const def = FOREX_PAIRS[pair];
    res.json({
      ...formatPairRow(p, def),
      description: def?.description ?? "",
      economicDrivers: def?.economicDrivers ?? [],
      factSheet: def?.factSheet ?? {},
      history: Array.isArray(p.history) ? p.history : [],
      candles: Array.isArray(p.candles) ? p.candles : [],
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// GET /api/v1/forex/getTopMovers
router.get("/forex/getTopMovers", async (req, res) => {
  setCors(res);
  try {
    const limit = Math.min(parseInt(req.query.limit || "5"), 14);
    const [rows] = await pool.query("SELECT * FROM forex_state");
    const withChange = rows.map(p => {
      const pct = p.prev_price > 0 ? ((p.price - p.prev_price) / p.prev_price) * 100 : 0;
      const def = FOREX_PAIRS[p.pair];
      return { pair: p.pair, base: p.base, quote: p.quote, category: p.category,
        baseFlag: COUNTRY_FLAGS[def?.baseCountry] ?? "", quoteFlag: COUNTRY_FLAGS[def?.quoteCountry] ?? "",
        price: +p.price, change: +pct.toFixed(4), rsi: +p.rsi };
    }).sort((a, b) => b.change - a.change);
    res.json({ gainers: withChange.slice(0, limit), losers: withChange.slice(-limit).reverse() });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// GET /api/v1/forex/getHistory?pair=EURUSD
router.get("/forex/getHistory", async (req, res) => {
  setCors(res);
  try {
    const pair = (req.query.pair || "").toUpperCase();
    if (!pair) return res.status(400).json({ error: "Missing ?pair= parameter" });
    const limit = Math.min(parseInt(req.query.limit || "60"), 400);
    const [rows] = await pool.query("SELECT pair, base, quote, history, candles, updated_at FROM forex_state WHERE pair = ? LIMIT 1", [pair]);
    const p = rows[0];
    if (!p) return res.status(404).json({ error: `Pair not found: ${pair}` });
    const history = Array.isArray(p.history) ? p.history.slice(-limit) : [];
    const candles = Array.isArray(p.candles) ? p.candles : [];
    res.json({ pair: p.pair, base: p.base, quote: p.quote, count: history.length, history, candles, updatedAt: p.updated_at });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// GET /api/v1/forex/search?q=
router.get("/forex/search", async (req, res) => {
  setCors(res);
  try {
    const q = (req.query.q || "").toLowerCase().trim();
    if (!q) return res.status(400).json({ error: "Missing ?q= parameter" });
    const [rows] = await pool.query("SELECT pair, base, quote, category, price, prev_price, rsi FROM forex_state ORDER BY pair");
    const results = rows.filter(p => {
      const def = FOREX_PAIRS[p.pair];
      return p.pair.toLowerCase().includes(q) ||
        p.base.toLowerCase().includes(q) || p.quote.toLowerCase().includes(q) ||
        def?.baseName?.toLowerCase().includes(q) || def?.quoteName?.toLowerCase().includes(q);
    }).map(p => {
      const def = FOREX_PAIRS[p.pair];
      const pct = p.prev_price > 0 ? ((p.price - p.prev_price) / p.prev_price) * 100 : 0;
      return { pair: p.pair, base: p.base, quote: p.quote, category: p.category,
        baseName: def?.baseName ?? p.base, quoteName: def?.quoteName ?? p.quote,
        baseFlag: COUNTRY_FLAGS[def?.baseCountry] ?? "", quoteFlag: COUNTRY_FLAGS[def?.quoteCountry] ?? "",
        price: +p.price, change: +pct.toFixed(4), rsi: +p.rsi };
    });
    res.json({ query: q, count: results.length, results });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// GET /api/v1/forex/getMarketOverview
// Synthetic USD strength index, session info, bullish/bearish counts
router.get("/forex/getMarketOverview", async (req, res) => {
  setCors(res);
  try {
    const [rows] = await pool.query("SELECT pair, base, quote, category, price, prev_price, rsi, atr, volume FROM forex_state");

    // Compute per-pair change
    const withChange = rows.map(p => {
      const def = FOREX_PAIRS[p.pair];
      const pct = p.prev_price > 0 ? ((p.price - p.prev_price) / p.prev_price) * 100 : 0;
      return { ...p, changePct: pct, def };
    });

    // USD strength index: average of USD pair movements where positive = USD up
    const usdPairs = withChange.filter(p => p.base === "USD" || p.quote === "USD");
    let usdSum = 0;
    for (const p of usdPairs) {
      usdSum += p.base === "USD" ? p.changePct : -p.changePct;
    }
    const dollarIndex = usdPairs.length > 0 ? +(usdSum / usdPairs.length).toFixed(4) : 0;

    // Per-currency strength: net change when appearing as base/quote
    const currencyMap = {};
    for (const p of withChange) {
      if (!currencyMap[p.base]) currencyMap[p.base] = { sum: 0, count: 0 };
      if (!currencyMap[p.quote]) currencyMap[p.quote] = { sum: 0, count: 0 };
      currencyMap[p.base].sum  += p.changePct;  currencyMap[p.base].count++;
      currencyMap[p.quote].sum -= p.changePct;  currencyMap[p.quote].count++;
    }
    const currencyStrength = Object.entries(currencyMap)
      .map(([code, d]) => ({ code, strength: +(d.sum / d.count).toFixed(4), flag: COUNTRY_FLAGS[Object.keys(FOREX_PAIRS).find(k => FOREX_PAIRS[k].base === code || FOREX_PAIRS[k].quote === code) ? (FOREX_PAIRS[Object.keys(FOREX_PAIRS).find(k => FOREX_PAIRS[k].base === code)] ? FOREX_PAIRS[Object.keys(FOREX_PAIRS).find(k => FOREX_PAIRS[k].base === code)].baseCountry : FOREX_PAIRS[Object.keys(FOREX_PAIRS).find(k => FOREX_PAIRS[k].quote === code)].quoteCountry) : ""] ?? "" }))
      .sort((a, b) => b.strength - a.strength);

    // Active forex sessions (UTC)
    const utcH = new Date().getUTCHours();
    function sessionOpen(open, close) {
      return open < close ? utcH >= open && utcH < close : utcH >= open || utcH < close;
    }
    const sessions = {
      sydney:  { label: "Sydney",   open: sessionOpen(21, 6),  timezone: "AEST/AEDT", majorPairs: ["AUDUSD","NZDUSD","AUDJPY","AUDNZD"] },
      tokyo:   { label: "Tokyo",    open: sessionOpen(23, 8),  timezone: "JST",       majorPairs: ["USDJPY","EURJPY","AUDJPY","NZDJPY","CADJPY"] },
      london:  { label: "London",   open: sessionOpen(7,  16), timezone: "GMT/BST",   majorPairs: ["EURUSD","GBPUSD","EURGBP","GBPJPY","EURCHF"] },
      newYork: { label: "New York", open: sessionOpen(12, 21), timezone: "EST/EDT",   majorPairs: ["EURUSD","GBPUSD","USDCAD","USDMXN","USDJPY"] },
    };

    const sorted = [...withChange].sort((a, b) => b.changePct - a.changePct);
    res.json({
      dollarIndex,
      dollarIndexLabel: dollarIndex > 0.05 ? "USD Strengthening" : dollarIndex < -0.05 ? "USD Weakening" : "USD Neutral",
      totalPairs: withChange.length,
      bullishPairs: withChange.filter(p => p.changePct > 0).length,
      bearishPairs: withChange.filter(p => p.changePct < 0).length,
      topGainer:  sorted[0]  ? { pair: sorted[0].pair,  changePct: +sorted[0].changePct.toFixed(4) }  : null,
      topLoser:   sorted.at(-1) ? { pair: sorted.at(-1).pair, changePct: +sorted.at(-1).changePct.toFixed(4) } : null,
      avgVolatility: +(withChange.reduce((s,p) => s + +p.atr, 0) / withChange.length).toFixed(6),
      currencyStrength,
      sessions,
      updatedAt: rows[0]?.updated_at ?? null,
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// GET /api/v1/forex/getLeaderboard?by=changePct|volume|rsi|atr|spread&dir=asc|desc&limit=10&category=major|minor|exotic
router.get("/forex/getLeaderboard", async (req, res) => {
  setCors(res);
  try {
    const by       = ["changePct","volume","rsi","atr","spread","bbBw"].includes(req.query.by) ? req.query.by : "changePct";
    const dir      = req.query.dir === "asc" ? "asc" : "desc";
    const limit    = Math.min(parseInt(req.query.limit || "10"), 40);
    const category = req.query.category?.toLowerCase();

    let sql = "SELECT * FROM forex_state";
    const params = [];
    if (category && ["major","minor","exotic"].includes(category)) { sql += " WHERE category = ?"; params.push(category); }
    const [rows] = await pool.query(sql, params);

    const withChange = rows.map(p => {
      const def = FOREX_PAIRS[p.pair];
      const pct = p.prev_price > 0 ? ((p.price - p.prev_price) / p.prev_price) * 100 : 0;
      return { ...formatPairRow(p, def), changePct: +pct.toFixed(4) };
    });

    const sortKey = { changePct: "changePct", volume: "volume", rsi: "rsi", atr: "atr", spread: "spread", bbBw: "bbBw" }[by];
    withChange.sort((a, b) => dir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]);

    res.json({ sortedBy: by, direction: dir, category: category ?? "all", count: withChange.length, pairs: withChange.slice(0, limit) });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// GET /api/v1/forex/getCandles?pair=EURUSD&limit=48
router.get("/forex/getCandles", async (req, res) => {
  setCors(res);
  try {
    const pair  = (req.query.pair || "").toUpperCase();
    if (!pair) return res.status(400).json({ error: "Missing ?pair= parameter" });
    const limit = Math.min(parseInt(req.query.limit || "48"), 200);
    const [rows] = await pool.query("SELECT pair, base, quote, candles, updated_at FROM forex_state WHERE pair = ? LIMIT 1", [pair]);
    const p = rows[0];
    if (!p) return res.status(404).json({ error: `Pair not found: ${pair}` });
    const def = FOREX_PAIRS[pair];
    const candles = Array.isArray(p.candles) ? p.candles.slice(-limit) : [];
    res.json({ pair: p.pair, base: p.base, quote: p.quote, decimals: def?.decimals ?? 4, pipSize: def?.pipSize ?? 0.0001, count: candles.length, candles, updatedAt: p.updated_at });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// GET /api/v1/forex/getCorrelations?pairs=EURUSD,GBPUSD,USDJPY&window=60
router.get("/forex/getCorrelations", async (req, res) => {
  setCors(res);
  try {
    const window = Math.min(parseInt(req.query.window || "60"), 200);
    let requestedPairs = req.query.pairs ? req.query.pairs.toUpperCase().split(",").map(s => s.trim()).filter(Boolean) : null;

    // Default to all major pairs if none specified
    if (!requestedPairs || requestedPairs.length === 0) {
      requestedPairs = Object.keys(FOREX_PAIRS).filter(k => FOREX_PAIRS[k].category === "major");
    }
    requestedPairs = requestedPairs.slice(0, 20); // cap at 20 pairs

    const [rows] = await pool.query("SELECT pair, history FROM forex_state WHERE pair IN (?)", [requestedPairs]);
    const historyMap = {};
    for (const r of rows) historyMap[r.pair] = Array.isArray(r.history) ? r.history : [];

    function toReturns(prices) {
      const r = [];
      for (let i = 1; i < prices.length; i++) {
        r.push(prices[i - 1] !== 0 ? (prices[i] - prices[i - 1]) / prices[i - 1] : 0);
      }
      return r;
    }

    function pearson(a, b) {
      const n = Math.min(a.length, b.length, window);
      if (n < 3) return null;
      const xa = a.slice(-n), xb = b.slice(-n);
      const ma = xa.reduce((s, v) => s + v, 0) / n;
      const mb = xb.reduce((s, v) => s + v, 0) / n;
      let cov = 0, va = 0, vb = 0;
      for (let i = 0; i < n; i++) {
        const da = xa[i] - ma, db = xb[i] - mb;
        cov += da * db; va += da * da; vb += db * db;
      }
      const denom = Math.sqrt(va * vb);
      return denom === 0 ? 0 : +(cov / denom).toFixed(4);
    }

    const returnsMap = {};
    for (const pair of requestedPairs) {
      returnsMap[pair] = historyMap[pair] ? toReturns(historyMap[pair]) : [];
    }

    const matrix = {};
    for (const a of requestedPairs) {
      matrix[a] = {};
      for (const b of requestedPairs) {
        matrix[a][b] = a === b ? 1.0 : pearson(returnsMap[a], returnsMap[b]);
      }
    }

    res.json({ pairs: requestedPairs, window, matrix });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// GET /api/v1/forex/getSessions
router.get("/forex/getSessions", async (req, res) => {
  setCors(res);
  try {
    const now  = new Date();
    const utcH = now.getUTCHours();
    const utcM = now.getUTCMinutes();
    const utcTime = `${String(utcH).padStart(2,"0")}:${String(utcM).padStart(2,"0")} UTC`;

    function sessionOpen(open, close) {
      return open < close ? utcH >= open && utcH < close : utcH >= open || utcH < close;
    }

    const SESSION_PAIRS = {
      sydney:  ["AUDUSD","NZDUSD","AUDJPY","AUDNZD","AUDCAD","NZDJPY"],
      tokyo:   ["USDJPY","EURJPY","GBPJPY","AUDJPY","CADJPY","NZDJPY","CHFJPY","USDHKD","USDSGD","USDCNY"],
      london:  ["EURUSD","GBPUSD","EURGBP","EURCHF","GBPCHF","EURJPY","GBPJPY","USDSEK","USDNOK","USDDKK","USDHUF","USDPLN","USDCZK"],
      newYork: ["EURUSD","GBPUSD","USDCAD","USDMXN","USDBRL","USDJPY","AUDUSD","NZDUSD","CADJPY"],
    };

    const sessions = [
      { id: "sydney",  label: "Sydney",   timezone: "AEST/AEDT", utcOpen: "21:00", utcClose: "06:00", open: sessionOpen(21, 6),  pairs: SESSION_PAIRS.sydney  },
      { id: "tokyo",   label: "Tokyo",    timezone: "JST",       utcOpen: "23:00", utcClose: "08:00", open: sessionOpen(23, 8),  pairs: SESSION_PAIRS.tokyo   },
      { id: "london",  label: "London",   timezone: "GMT/BST",   utcOpen: "07:00", utcClose: "16:00", open: sessionOpen(7,  16), pairs: SESSION_PAIRS.london  },
      { id: "newYork", label: "New York", timezone: "EST/EDT",   utcOpen: "12:00", utcClose: "21:00", open: sessionOpen(12, 21), pairs: SESSION_PAIRS.newYork },
    ];

    const openSessions = sessions.filter(s => s.open).map(s => s.label);
    const overlap = openSessions.length > 1;
    const mostActiveSession = sessions.filter(s => s.open).sort((a,b) => b.pairs.length - a.pairs.length)[0]?.label ?? "Interbank";

    res.json({ utcTime, openSessions, overlap, mostActiveSession, sessions });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// GET /api/v1/forex/getCurrencies
// Per-currency strength index derived from all pairs
router.get("/forex/getCurrencies", async (req, res) => {
  setCors(res);
  try {
    const [rows] = await pool.query("SELECT pair, base, quote, price, prev_price FROM forex_state");

    const currMap = {};
    for (const p of rows) {
      const def = FOREX_PAIRS[p.pair];
      if (!def) continue;
      const pct = p.prev_price > 0 ? ((p.price - p.prev_price) / p.prev_price) * 100 : 0;

      function add(code, country, val) {
        if (!currMap[code]) currMap[code] = { code, country, flag: COUNTRY_FLAGS[country] ?? "", sum: 0, count: 0 };
        currMap[code].sum += val;
        currMap[code].count++;
      }
      add(def.base,  def.baseCountry,   pct);
      add(def.quote, def.quoteCountry, -pct);
    }

    const currencies = Object.values(currMap).map(c => ({
      code:     c.code,
      country:  c.country,
      flag:     c.flag,
      strength: +(c.sum / c.count).toFixed(4),
      pairsCount: c.count,
    })).sort((a, b) => b.strength - a.strength);

    res.json({ count: currencies.length, currencies });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── GET /api/v1/rss[?limit=40&sector=] ───────────────────────────────────────
router.get(["/rss", "/rss.xml"], async (req, res) => {
  setCors(res);
  try {
    const limit  = Math.min(parseInt(req.query.limit || "40"), 100);
    const sector = req.query.sector?.toLowerCase();

    let sql = "SELECT * FROM events_log WHERE 1=1";
    const params = [];
    if (sector) { sql += " AND sector = ?"; params.push(sector); }
    sql += " ORDER BY fired_at DESC LIMIT ?";
    params.push(limit);
    const [events] = await pool.query(sql, params);

    const [msRows] = await pool.query(
      "SELECT fear_greed, index_value, market_session, updated_at FROM market_state WHERE id = 1 LIMIT 1"
    );
    const ms = msRows[0];

    const esc = (s) => String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const rfc822 = (d) => { try { return new Date(d).toUTCString(); } catch { return new Date().toUTCString(); } };

    const items = events.map(ev => {
      const sentiment  = ev.effect >= 0 ? "Bullish" : "Bearish";
      const effectStr  = (ev.effect >= 0 ? "+" : "") + (ev.effect * 100).toFixed(1) + "%";
      const sectorLine = ev.sector ? `${ev.sector} sector` : "Market-wide";
      return `    <item>
      <title>${esc(ev.text)}</title>
      <description>${esc(`${sentiment} · ${effectStr} impact · ${sectorLine} · Weight: ${ev.weight}`)}</description>
      <pubDate>${rfc822(ev.fired_at)}</pubDate>
      <guid isPermaLink="false">${esc(ev.id)}</guid>
      <link>https://polymart.co/#/market</link>${ev.sector ? `\n      <category>${esc(ev.sector)}</category>` : ""}
    </item>`;
    }).join("\n");

    const feedTitle   = sector ? `Polymart Market Events · ${sector}` : "Polymart Market Events";
    const lastBuild   = ms ? rfc822(ms.updated_at) : new Date().toUTCString();
    const selfHref    = `https://polymart.co/api/v1/rss${sector ? `?sector=${encodeURIComponent(sector)}` : ""}`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(feedTitle)}</title>
    <link>https://polymart.co/#/market</link>
    <description>Live simulated market events from the Polymart exchange. Subscribe to track flash crashes, sector booms, regulatory shocks, and macro events as they fire.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${selfHref}" rel="self" type="application/rss+xml"/>
    <ttl>10</ttl>
${items}
  </channel>
</rss>`;

    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=10");
    res.send(xml);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});


// ── GET /api/v1/info?ticker= ──────────────────────────────────────────────────
router.get("/info", async (req, res) => {
  setCors(res);
  try {
    const ticker = (req.query.ticker || "").toUpperCase();
    if (!ticker) return res.status(400).json({ error: "Missing ?ticker= parameter" });

    const profile = COMPANY_PROFILES[ticker];
    if (!profile) return res.status(404).json({ error: `No company info for ticker: ${ticker}` });

    const [[stockRow], [msRow]] = await Promise.all([
      pool.query("SELECT price, prev_price, open_price, rsi, streak, volume, hi52w, lo52w, ath, session, beta, atr, sma20, sma50, macd, macd_signal, macd_hist, bb_upper, bb_middle, bb_lower FROM stocks_state WHERE ticker = ? LIMIT 1", [ticker]).then(([r]) => r),
      pool.query("SELECT fear_greed, inflation, interest_rate, gdp_growth, vix, market_session FROM market_state WHERE id = 1 LIMIT 1").then(([r]) => r),
    ]);

    if (!stockRow) return res.status(404).json({ error: `Ticker not found: ${ticker}` });

    const def = STOCK_DEFS[ticker];
    const sector = def?.sector ?? null;
    const peers = def ? Object.keys(STOCK_DEFS).filter(k => STOCK_DEFS[k].sector === sector && k !== ticker) : [];

    const pct = stockRow.prev_price > 0 ? (stockRow.price - stockRow.prev_price) / stockRow.prev_price * 100 : 0;
    const openPct = stockRow.open_price > 0 ? (stockRow.price - stockRow.open_price) / stockRow.open_price * 100 : 0;

    const macro = {
      fearGreed:    msRow ? Math.round(msRow.fear_greed) : 50,
      interestRate: msRow ? +msRow.interest_rate : 5,
      inflation:    msRow ? +msRow.inflation : 2.5,
      gdpGrowth:    msRow ? +msRow.gdp_growth : 2.8,
      vix:          msRow ? +msRow.vix : 20,
    };

    // Analyst rating derived from RSI and trend vs base price
    const rsi = +stockRow.rsi;
    const priceVsBase = def ? (stockRow.price - def.basePrice) / def.basePrice : 0;
    let rating, ratingScore;
    if (rsi > 78 || priceVsBase > 1.5) { rating = "Underperform"; ratingScore = 1.8; }
    else if (rsi > 65)                  { rating = "Hold";          ratingScore = 3.0; }
    else if (rsi < 22 || priceVsBase < -0.4) { rating = "Strong Buy"; ratingScore = 4.8; }
    else if (rsi < 40)                  { rating = "Buy";           ratingScore = 4.1; }
    else                                { rating = "Hold";          ratingScore = 3.2; }

    const stockForNews = { change: +pct.toFixed(2), rsi, streak: stockRow.streak };
    const news = generateNews(ticker, stockForNews, macro, sector);

    res.json({
      ticker,
      companyName: STOCK_DEFS[ticker]?.name ?? ticker,
      ...profile,
      sectorKey:   sector,
      sectorLabel: sector ? (SECTORS[sector]?.label ?? null) : null,
      sectorIcon:  sector ? (SECTORS[sector]?.icon  ?? null) : null,
      peers,
      market: {
        price:          +stockRow.price,
        change:         +pct.toFixed(2),
        changeSinceOpen: +openPct.toFixed(2),
        hi52w:          +stockRow.hi52w,
        lo52w:          +stockRow.lo52w,
        allTimeHigh:    +stockRow.ath,
        volume:         stockRow.volume,
        session:        stockRow.session,
        beta:           +stockRow.beta,
        atr:            +stockRow.atr,
        rsi,
        streak:         stockRow.streak,
        sma20:          +stockRow.sma20,
        sma50:          +stockRow.sma50,
        macd:           +stockRow.macd,
        macdSignal:     +stockRow.macd_signal,
        macdHist:       +stockRow.macd_hist,
        bbUpper:        +stockRow.bb_upper,
        bbMiddle:       +stockRow.bb_middle,
        bbLower:        +stockRow.bb_lower,
      },
      macro,
      analystRating: { rating, score: ratingScore, analystCount: Math.floor(rsi % 8) + 4 },
      news,
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── GET /api/v1/search?q= ─────────────────────────────────────────────────────
router.get("/search", async (req, res) => {
  setCors(res);
  try {
    const q = (req.query.q || "").toLowerCase().trim();
    if (!q) return res.status(400).json({ error: "Missing ?q= parameter" });
    const [stocks] = await pool.query("SELECT ticker, name, sector, price, prev_price, rsi, session FROM stocks_state ORDER BY ticker");
    const results = stocks.filter(s => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q)).map(s => ({ ticker: s.ticker, name: s.name, sector: s.sector, price: +s.price, change: s.prev_price > 0 ? +((s.price - s.prev_price) / s.prev_price * 100).toFixed(2) : 0, rsi: +s.rsi, session: s.session }));
    res.json({ query: q, count: results.length, results });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

export default router;
