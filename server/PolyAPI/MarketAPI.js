/**
 * PolyAPI · MarketAPI
 *
 * Public read-only market data API. Queries the dbMarket pool (polymart_market
 * database) which is written exclusively by PolyEngine.
 *
 * All routes are public — no authentication required.
 *
 * Mount point: /api/v1/market
 *
 * Tables:
 *   market_state  — singleton row (id=1), overall market indicators
 *   stocks_state  — one row per ticker (~132 rows)
 *   sector_state  — one row per sector (~20 rows)
 *   forex_state   — one row per pair (28 rows)
 *   events_log    — rolling event log (culled every 24h)
 */

import { dbMarket as pool } from '../db.js';
import { createRouter } from './Router.js';
import { success, fail, guard, ERRORS } from './Protocol.js';

const router = createRouter({ label: '[market-api]' });

// ── Shared column lists ───────────────────────────────────────────────────────

// Full stock row minus the heavy JSON blobs — used for list endpoints.
const STOCK_LIST_COLS = `
  ticker, name, sector, mcap, price, prev_price, open_price,
  hi52w, lo52w, ath, volume, rsi, momentum, beta, atr,
  macd, macd_signal, macd_hist, bb_upper, bb_middle, bb_lower, bb_bw,
  sma20, sma50, bid, ask, spread_pct, vwap,
  session, halted, updated_at
`.trim();

// Full stock row including history + candles — used for single-ticker endpoint.
const STOCK_FULL_COLS = `${STOCK_LIST_COLS}, candle_open, candle_high, candle_low, candle_ticks, history, candles`;

// Forex list columns (excludes heavy JSON blobs).
const FOREX_LIST_COLS = `
  pair, base, quote, category, price, prev_price, open_price,
  hi_session, lo_session, hi52w, lo52w, spread, bid, ask, volume,
  rsi, momentum, atr, macd, macd_signal, macd_hist,
  stoch_k, stoch_d, cci, bb_upper, bb_middle, bb_lower, bb_bw,
  sma20, sma50, updated_at
`.trim();

const FOREX_FULL_COLS = `${FOREX_LIST_COLS}, candle_open, candle_high, candle_low, candle_ticks, history, candles`;

// ── Ticker / pair validation ──────────────────────────────────────────────────

const RE_TICKER = /^[A-Z]{1,10}$/;
const RE_PAIR   = /^[A-Z]{6}$/;

// ── GET /market ───────────────────────────────────────────────────────────────
// Returns the singleton market_state row plus the 5 most recent events.

router.get('/', guard(async (_req, res) => {
  const [[state], [events]] = await Promise.all([
    pool.query('SELECT * FROM market_state WHERE id = 1'),
    pool.query(
      `SELECT id, event_text, effect, sector, category, weight, fired_at
       FROM events_log ORDER BY fired_at DESC LIMIT 5`
    ),
  ]);

  if (!state) return fail(res, ERRORS.NOT_FOUND, 'Market state not initialised');

  return success(res, { market: state, recentEvents: events });
}));

// ── GET /market/stocks ────────────────────────────────────────────────────────
// Returns all stocks. Optional ?sector= filter. History/candles excluded.

router.get('/stocks', guard(async (req, res) => {
  const sector = (req.query.sector || '').trim();

  const params  = [];
  let   where   = '';
  if (sector) {
    where = 'WHERE sector = ?';
    params.push(sector);
  }

  const [rows] = await pool.query(
    `SELECT ${STOCK_LIST_COLS} FROM stocks_state ${where} ORDER BY ticker ASC`,
    params
  );

  return success(res, { stocks: rows, count: rows.length });
}));

// ── GET /market/stocks/:ticker ────────────────────────────────────────────────
// Returns a single stock with full history and candle data.

router.get('/stocks/:ticker', guard(async (req, res) => {
  const ticker = (req.params.ticker || '').toUpperCase().trim();
  if (!RE_TICKER.test(ticker))
    return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid ticker format');

  const [[row]] = await pool.query(
    `SELECT ${STOCK_FULL_COLS} FROM stocks_state WHERE ticker = ?`,
    [ticker]
  );
  if (!row) return fail(res, ERRORS.NOT_FOUND, `Ticker '${ticker}' not found`);

  return success(res, row);
}));

// ── GET /market/sectors ───────────────────────────────────────────────────────
// Returns all sector states.

router.get('/sectors', guard(async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT sector_key, label, icon, momentum, trend, news_stack, updated_at FROM sector_state ORDER BY label ASC'
  );
  return success(res, { sectors: rows });
}));

// ── GET /market/forex ─────────────────────────────────────────────────────────
// Returns all forex pairs. Optional ?category= filter (major, minor, exotic, cross).

router.get('/forex', guard(async (req, res) => {
  const category = (req.query.category || '').trim().toLowerCase();
  const VALID_CATEGORIES = new Set(['major', 'minor', 'exotic', 'cross']);

  const params = [];
  let   where  = '';
  if (category && VALID_CATEGORIES.has(category)) {
    where = 'WHERE category = ?';
    params.push(category);
  }

  const [rows] = await pool.query(
    `SELECT ${FOREX_LIST_COLS} FROM forex_state ${where} ORDER BY pair ASC`,
    params
  );

  return success(res, { pairs: rows, count: rows.length });
}));

// ── GET /market/forex/:pair ───────────────────────────────────────────────────
// Returns a single forex pair with full history and candle data.

router.get('/forex/:pair', guard(async (req, res) => {
  const pair = (req.params.pair || '').toUpperCase().trim();
  if (!RE_PAIR.test(pair))
    return fail(res, ERRORS.VALIDATION_ERROR, 'Pair must be a 6-character currency code (e.g. EURUSD)');

  const [[row]] = await pool.query(
    `SELECT ${FOREX_FULL_COLS} FROM forex_state WHERE pair = ?`,
    [pair]
  );
  if (!row) return fail(res, ERRORS.NOT_FOUND, `Pair '${pair}' not found`);

  return success(res, row);
}));

// ── GET /market/events ────────────────────────────────────────────────────────
// Returns recent market events. Optional ?limit= (max 100, default 20).

router.get('/events', guard(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const [rows] = await pool.query(
    `SELECT id, event_text, effect, sector, category, weight, fired_at
     FROM events_log ORDER BY fired_at DESC LIMIT ?`,
    [limit]
  );

  return success(res, { events: rows, count: rows.length });
}));

// ── GET /market/snapshot ──────────────────────────────────────────────────────
// Full market snapshot: market state + all stocks (no history) + all forex pairs (no history).
// Useful for initial page load — one round trip instead of three.

router.get('/snapshot', guard(async (_req, res) => {
  const [[state], [stocks], [pairs], [sectors]] = await Promise.all([
    pool.query('SELECT * FROM market_state WHERE id = 1'),
    pool.query(`SELECT ${STOCK_LIST_COLS} FROM stocks_state ORDER BY ticker ASC`),
    pool.query(`SELECT ${FOREX_LIST_COLS} FROM forex_state ORDER BY pair ASC`),
    pool.query('SELECT sector_key, label, icon, momentum, trend, news_stack FROM sector_state ORDER BY label ASC'),
  ]);

  if (!state) return fail(res, ERRORS.NOT_FOUND, 'Market state not initialised');

  return success(res, { market: state, stocks, pairs, sectors });
}));

export default router;
