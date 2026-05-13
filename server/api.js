import express from "express";
import pool from "./db.js";
import { STOCK_DEFS, SECTORS } from "./simulation.js";
import { COMPANY_PROFILES, generateNews } from "./company-data.js";

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
const HEAVY_ROUTES   = new Set(["/getStocks", "/getHistory", "/getLeaderboard"]);

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
      description: "132 simulated equities across 20 sectors. Prices update every 5 seconds.",
      assets: Object.keys(STOCK_DEFS).length,
      sectors: Object.keys(SECTORS).length,
      tickInterval: 5,
    },
    {
      id: "crypto",
      label: "Crypto Market",
      icon: "₿",
      status: "coming_soon",
      description: "Simulated cryptocurrency market with volatile assets and 24/7 trading.",
    },
    {
      id: "forex",
      label: "Forex",
      icon: "💱",
      status: "coming_soon",
      description: "Foreign exchange simulation with major, minor, and exotic currency pairs.",
    },
  ]);
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
