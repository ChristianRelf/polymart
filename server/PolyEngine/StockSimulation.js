/**
 * PolyEngine · StockSimulation
 *
 * Encapsulates the full stock market simulation: macro regime, per-stock
 * price evolution, technical indicators, and circuit breakers.
 *
 * Usage:
 *   const sim = new StockSimulation();
 *   sim.warmUp(60);                // run 60 warm-up ticks (no I/O)
 *   const result = sim.tick();     // advance one tick, returns TickResult
 *
 * The class owns all mutable state. DataWrapper handles I/O.
 */

import {
  STOCK_DEFS, SECTORS, TICKERS,
  sampleEvent, mcapVolatilityMultiplier,
} from './StockData.js';

// ── Stochastic helpers ────────────────────────────────────────────────────────

/**
 * Box-Muller normal distribution with 8% fat-tail risk.
 * Returns a random variate approximately N(0,1) with occasional large moves.
 */
function gaussian() {
  const u1 = Math.random(), u2 = Math.random();
  const z  = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
  return Math.random() < 0.08 ? z * (2.5 + Math.random() * 1.5) : z;
}

// ── Technical indicator helpers ───────────────────────────────────────────────

function ema(prev, cur, k) {
  return cur * k + prev * (1 - k);
}

function sma(history, period) {
  const slice = history.slice(-Math.min(period, history.length));
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/** @returns {{ macd: number; signal: number; hist: number; ema12: number; ema26: number }} */
function computeMACD(history) {
  if (history.length < 2) {
    const p = history[0] || 0;
    return { macd: 0, signal: 0, hist: 0, ema12: p, ema26: p };
  }
  const k12 = 2 / 13, k26 = 2 / 27, k9 = 2 / 10;
  let e12 = history[0], e26 = history[0], sig = 0;
  for (let i = 1; i < history.length; i++) {
    e12 = ema(e12, history[i], k12);
    e26 = ema(e26, history[i], k26);
    sig = ema(sig, e12 - e26, k9);
  }
  const macdLine = e12 - e26;
  return { macd: macdLine, signal: sig, hist: macdLine - sig, ema12: e12, ema26: e26 };
}

/** @returns {{ upper: number; middle: number; lower: number; bw: number }} */
function computeBollingerBands(history, period = 20, stdMult = 2) {
  const slice = history.slice(-Math.min(period, history.length));
  if (slice.length < 2) {
    const p = slice[0] || 0;
    return { upper: p, middle: p, lower: p, bw: 0 };
  }
  const mean     = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
  const sd       = Math.sqrt(variance);
  const upper    = mean + stdMult * sd;
  const lower    = mean - stdMult * sd;
  return { upper, middle: mean, lower, bw: mean > 0 ? (upper - lower) / mean : 0 };
}

function computeATR(history, period = 14) {
  if (history.length < 2) return 0;
  const trs = [];
  for (let i = Math.max(1, history.length - period); i < history.length; i++) {
    trs.push(Math.abs(history[i] - history[i - 1]));
  }
  return trs.length > 0 ? trs.reduce((a, b) => a + b, 0) / trs.length : 0;
}

function computeBeta(stockHistory, period = 30) {
  const n = Math.min(period, stockHistory.length - 1);
  if (n < 4) return 1;
  const sRets = [];
  for (let i = stockHistory.length - n; i < stockHistory.length; i++) {
    sRets.push((stockHistory[i] - stockHistory[i - 1]) / stockHistory[i - 1]);
  }
  const sMean = sRets.reduce((a, b) => a + b, 0) / n;
  let cov = 0, mVar = 0;
  for (let i = 0; i < n; i++) {
    cov  += (sRets[i] - sMean) * (sRets[i] - sMean);
    mVar += (sRets[i] - sMean) ** 2;
  }
  return mVar > 0 ? cov / mVar : 1;
}

// ── Session helpers ───────────────────────────────────────────────────────────

const TICKS_PER_DAY = 1440;

/**
 * @param {number} tickCount
 * @returns {"pre"|"open"|"post"|"closed"}
 */
export function sessionPhase(tickCount) {
  const dayTick = tickCount % TICKS_PER_DAY;
  if (dayTick < 54)  return 'pre';
  if (dayTick < 444) return 'open';
  if (dayTick < 498) return 'post';
  return 'closed';
}

function volumeSessionMultiplier(tickCount) {
  const dayTick = tickCount % TICKS_PER_DAY;
  const phase   = sessionPhase(tickCount);
  if (phase === 'closed') return 0.05;
  if (phase === 'pre')    return 0.20;
  if (phase === 'post')   return 0.30;
  const t = (dayTick - 54) / 390;
  return 0.4 + 1.2 * Math.pow(2 * t - 1, 4);
}

function volatilitySessionMultiplier(tickCount) {
  switch (sessionPhase(tickCount)) {
    case 'pre':    return 1.6;
    case 'open':   return 1.0;
    case 'post':   return 1.3;
    case 'closed': return 0.4;
  }
}

// ── Macro regime ──────────────────────────────────────────────────────────────

const REGIME_SEQUENCE  = ['expansion', 'peak', 'contraction', 'trough', 'recovery'];
const REGIME_DURATIONS = {
  expansion:   [900,  2400],
  peak:        [400,  800],
  contraction: [700,  1800],
  trough:      [300,  700],
  recovery:    [600,  1400],
};
const REGIME_BIAS = {
  expansion:   { gdp: +0.012, inf: +0.003, rate: +0.002, fg: +0.15 },
  peak:        { gdp: -0.005, inf: +0.010, rate: +0.008, fg: -0.05 },
  contraction: { gdp: -0.018, inf: +0.004, rate: +0.003, fg: -0.30 },
  trough:      { gdp: -0.005, inf: -0.005, rate: -0.010, fg: -0.10 },
  recovery:    { gdp: +0.008, inf: -0.003, rate: -0.005, fg: +0.20 },
};

// ── State builders ────────────────────────────────────────────────────────────

function buildInitialMarketState() {
  return {
    index_value:           1000,
    index_prev:            1000,
    fear_greed:            50,
    interest_rate:         5.0,
    inflation:             2.5,
    gdp_growth:            2.8,
    vix:                   18,
    market_session:        'open',
    crash_cooldown:        0,
    boom_cooldown:         0,
    up_streak:             0,
    down_streak:           0,
    advance_decline:       0,
    new_highs:             0,
    new_lows:              0,
    tick_count:            0,
    macro_regime:          'expansion',
    regime_ticks_remaining: 1200,
  };
}

function buildInitialStockState(ticker) {
  const d = STOCK_DEFS[ticker];
  return {
    ticker,
    name:          d.name,
    sector:        d.sector,
    mcap:          d.mcap,
    price:         d.basePrice,
    prev_price:    d.basePrice,
    open_price:    d.basePrice,
    hi52w:         d.basePrice,
    lo52w:         d.basePrice,
    ath:           d.basePrice,
    volume:        0,
    buy_volume:    0,
    sell_volume:   0,
    rsi:           50,
    momentum:      0,
    insider_bias:  0,
    earnings_cycle: Math.random() * 100,
    streak:        0,
    beta:          1.0,
    atr:           0,
    ema12:         d.basePrice,
    ema26:         d.basePrice,
    macd:          0,
    macd_signal:   0,
    macd_hist:     0,
    bb_upper:      d.basePrice,
    bb_middle:     d.basePrice,
    bb_lower:      d.basePrice,
    bb_bw:         0,
    sma20:         d.basePrice,
    sma50:         d.basePrice,
    bid:           +(d.basePrice * 0.9995).toFixed(2),
    ask:           +(d.basePrice * 1.0005).toFixed(2),
    spread_pct:    0.10,
    vwap:          d.basePrice,
    session:       'open',
    halted:        false,
    candle_open:    d.basePrice,
    candle_high:    d.basePrice,
    candle_low:     d.basePrice,
    candle_ticks:   0,
    candle_buy_vol: 0,
    candle_sell_vol:0,
    history:       [d.basePrice],
    candles:       [],
  };
}

function buildInitialSectorState(key) {
  return { sector_key: key, label: SECTORS[key].label, icon: SECTORS[key].icon, momentum: 0, trend: 0, news_stack: 0 };
}

// ── Sector cross-correlations ─────────────────────────────────────────────────
// Returns the additional return bias for a given sector, based on other sectors'
// trends and macro variables. Kept as a pure function for testability.

function sectorCorrelation(sector, sec, marketState) {
  const { interest_rate: ir, inflation: inf, gdp_growth: gdp, fear_greed: fg } = marketState;
  const rp = -(ir - 5) * 0.0005;
  switch (sector) {
    case 'crypto':    return (sec.meme?.trend || 0) * .04 + (sec.tech?.trend || 0) * .02;
    case 'meme':      return (sec.crypto?.trend || 0) * .04 + (sec.media?.trend || 0) * .02;
    case 'defence':   return (50 - fg) / 50 * .0015;
    case 'green':     return -(ir - 5) * .0003 + (sec.energy?.trend || 0) * -.02;
    case 'retail':    return (gdp - 2.8) * .0004 - (inf - 2.5) * .0003;
    case 'media':     return (sec.tech?.trend || 0) * .02 + (sec.gaming?.trend || 0) * .01;
    case 'finance':   return rp * .5 - (inf - 2.5) * .0002;
    case 'ai':        return (sec.tech?.trend || 0) * .05 + (sec.bio?.trend || 0) * .01;
    case 'bio':       return (sec.health?.trend || 0) * .04 + (sec.ai?.trend || 0) * .01;
    case 'auto':      return (gdp - 2.8) * .0005 - (inf - 2.5) * .0004 + (sec.energy?.trend || 0) * -.01;
    case 'realty':    return rp * .6 - (inf - 2.5) * .0003;
    case 'travel':    return (gdp - 2.8) * .0004 + (sec.retail?.trend || 0) * .02 + (sec.energy?.trend || 0) * -.01;
    case 'energy':    return (inf - 2.5) * .0005;
    case 'logistics': return (sec.retail?.trend || 0) * .03 + (gdp - 2.8) * .0003;
    case 'agri':      return (inf - 2.5) * .0004 - (gdp - 2.8) * .0002;
    case 'space':     return (sec.defence?.trend || 0) * .02 + (sec.ai?.trend || 0) * .01;
    case 'food':      return -(inf - 2.5) * .0002;
    case 'health':    return (50 - fg) / 50 * .0005;
    case 'gaming':    return (sec.media?.trend || 0) * .02 + (sec.tech?.trend || 0) * .01;
    default:          return 0;
  }
}

// ── TickResult typedef ────────────────────────────────────────────────────────

/**
 * @typedef {Object} TickResult
 * @property {object}      marketState   Updated market state snapshot
 * @property {object[]}    stocks        Updated stock state array
 * @property {object[]}    sectors       Updated sector state array
 * @property {object|null} newEvent      Event fired this tick, or null
 */

// ── StockSimulation ───────────────────────────────────────────────────────────

const CANDLE_PERIOD = 18; // ticks per OHLCV candle

export class StockSimulation {
  constructor() {
    this._market  = buildInitialMarketState();
    this._stocks  = TICKERS.map(buildInitialStockState);
    this._sectors = Object.keys(SECTORS).map(buildInitialSectorState);
  }

  // ── State accessors ─────────────────────────────────────────────────────────

  get marketState()  { return this._market; }
  get stocks()       { return this._stocks; }
  get sectors()      { return this._sectors; }

  /**
   * Replace state wholesale (used when loading from DB on server startup).
   * @param {object}   market
   * @param {object[]} stocks
   * @param {object[]} sectors
   */
  loadState(market, stocks, sectors) {
    if (!market || typeof market !== 'object') throw new TypeError('loadState: market must be an object');
    if (!Array.isArray(stocks))                throw new TypeError('loadState: stocks must be an array');
    if (!Array.isArray(sectors))               throw new TypeError('loadState: sectors must be an array');
    this._market  = { ...buildInitialMarketState(), ...market };
    // Validate each stock — coerce invalid prices to the definition's base price
    this._stocks  = stocks.map(s => {
      if (!s || typeof s.ticker !== 'string') return null;
      const price = Number(s.price);
      if (!isFinite(price) || price <= 0) {
        const def = STOCK_DEFS[s.ticker];
        const fallback = def?.basePrice ?? 1;
        console.warn(`[StockSimulation] loadState: bad price for ${s.ticker} (${s.price}) — reset to ${fallback}`);
        return { ...s, price: fallback, prev_price: fallback };
      }
      return s;
    }).filter(Boolean);
    this._sectors = sectors;
    this._ensureMissingStocks();
    this._ensureMissingSectors();
  }

  /** Merge in any stocks/sectors that exist in STOCK_DEFS but not in loaded state. */
  _ensureMissingStocks() {
    const known = new Set(this._stocks.map(s => s.ticker));
    for (const ticker of TICKERS) {
      if (!known.has(ticker)) this._stocks.push(buildInitialStockState(ticker));
    }
  }

  _ensureMissingSectors() {
    const known = new Set(this._sectors.map(s => s.sector_key));
    for (const key of Object.keys(SECTORS)) {
      if (!known.has(key)) this._sectors.push(buildInitialSectorState(key));
    }
  }

  // ── Warm-up ─────────────────────────────────────────────────────────────────

  /**
   * Run N ticks without returning or validating results (fast path for init).
   * @param {number} n
   */
  warmUp(n) {
    if (typeof n !== 'number' || n < 1) throw new RangeError('warmUp: n must be a positive integer');
    for (let i = 0; i < n; i++) this.tick();
  }

  // ── Core tick ────────────────────────────────────────────────────────────────

  /**
   * Advance the simulation by one tick.
   * @returns {TickResult}
   */
  tick() {
    const m   = { ...this._market };
    const sec = {};
    for (const s of this._sectors) sec[s.sector_key] = { ...s };

    // ── Macro regime ───────────────────────────────────────────────────────────
    if (!m.macro_regime) m.macro_regime = 'expansion';
    if (!m.regime_ticks_remaining || m.regime_ticks_remaining <= 0) {
      const ri    = REGIME_SEQUENCE.indexOf(m.macro_regime);
      m.macro_regime = REGIME_SEQUENCE[(ri + 1) % REGIME_SEQUENCE.length];
      const [lo, hi] = REGIME_DURATIONS[m.macro_regime];
      m.regime_ticks_remaining = Math.floor(lo + Math.random() * (hi - lo));
    } else {
      m.regime_ticks_remaining--;
    }
    const bias = REGIME_BIAS[m.macro_regime] || { gdp: 0, inf: 0, rate: 0, fg: 0 };

    // ── Macro drift (regime-biased) ────────────────────────────────────────────
    m.interest_rate = Math.max(0,   Math.min(12, m.interest_rate + (Math.random() - .5) * .02 + bias.rate));
    m.inflation     = Math.max(-.5, Math.min(8,  m.inflation     + (Math.random() - .5) * .01 + bias.inf));
    m.gdp_growth    = Math.max(-3,  Math.min(7,  m.gdp_growth    + (Math.random() - .5) * .02 + bias.gdp));
    m.fear_greed    = Math.max(0, Math.min(100,
      m.fear_greed
      + (Math.random() - 0.5) * 0.65
      + (50 - m.fear_greed) * 0.0008
      + (m.gdp_growth - 2) * 0.06
      - (m.inflation - 2.5) * 0.04
      + bias.fg
    ));

    const session      = sessionPhase(m.tick_count);
    m.market_session   = session;
    const volMult      = volumeSessionMultiplier(m.tick_count);
    const sesVolatMult = volatilitySessionMultiplier(m.tick_count);

    // Macro return pressures
    const gs = (m.fear_greed - 50) / 50 * .003;
    const rp = -(m.interest_rate - 5) * .0005;
    const ip = -(m.inflation - 2.5) * .0004;
    const gb = (m.gdp_growth - 2.8) * .0003;

    const macroStress = Math.max(0, (m.interest_rate - 5) * 0.5 + (m.inflation - 3) * 0.8);
    m.vix = Math.max(8, Math.min(80, 40 - (m.fear_greed - 50) * 0.4 + macroStress + Math.random() * 2 - 1));

    // ── Event ──────────────────────────────────────────────────────────────────
    let newEvent = null;
    const eventProb = session === 'closed' ? 0.02 : 0.03;
    if (Math.random() < eventProb) {
      newEvent = sampleEvent();
      m.fear_greed = Math.max(0, Math.min(100, m.fear_greed + newEvent.effect * 20));
      if (newEvent.sector && sec[newEvent.sector]) {
        sec[newEvent.sector].news_stack += newEvent.effect * .6;
      }
    }

    // ── Sector momentum ────────────────────────────────────────────────────────
    for (const k of Object.keys(sec)) {
      const s     = sec[k];
      s.news_stack *= .92;
      s.momentum   = s.momentum * .96 + (Math.random() - .5) * .002;
      s.trend      = Math.max(-.06, Math.min(.06,
        (s.trend + s.momentum + gs * .05 + s.news_stack * .02) * .99
      ));
    }

    // ── Circuit breakers ───────────────────────────────────────────────────────
    if (m.crash_cooldown > 0) m.crash_cooldown--;
    if (m.boom_cooldown  > 0) m.boom_cooldown--;
    let cm = 1;
    if (!m.crash_cooldown && m.fear_greed < 8 && Math.random() < .015) {
      cm = -2.5; m.crash_cooldown = 80; m.fear_greed = 3;
      newEvent = { text: 'MARKET CRASH - Circuit breakers triggered', effect: -.18, weight: 3, category: 'macro' };
    }
    if (!m.boom_cooldown && m.fear_greed > 92 && Math.random() < .015) {
      cm = 1.8; m.boom_cooldown = 80; m.fear_greed = 95;
      newEvent = { text: 'MARKET BOOM - Historic rally day', effect: .14, weight: 3, category: 'macro' };
    }

    // ── Per-stock evolution ────────────────────────────────────────────────────
    let indexSum  = 0;
    let newHighs  = 0, newLows = 0, advances = 0, declines = 0;

    const newStocks = this._stocks.map(st => {
      try {
      const def = STOCK_DEFS[st.ticker];
      if (!def) return st;

      const updated = { ...st };
      const p       = Number(st.price);
      const h       = Array.isArray(st.history) ? st.history : [];

      // Halt check (>20% single-tick move during open session)
      const lastPct = p > 0 && st.prev_price > 0 ? Math.abs((p - st.prev_price) / st.prev_price) : 0;
      if (lastPct > 0.20 && session === 'open') {
        updated.halted  = true;
        updated.session = 'halted';
        indexSum += p;
        return updated;
      }
      if (updated.halted) updated.halted = false;
      updated.session = session;

      const n   = gaussian();
      const mcm = mcapVolatilityMultiplier(def.mcap);
      const se  = sec[def.sector]?.trend || 0;

      // Event impact
      let ee = 0;
      if (newEvent) {
        if (newEvent.sector === def.sector) ee = newEvent.effect * .18 * mcm;
        else if (!newEvent.sector)          ee = newEvent.effect * .12;
        else                                ee = newEvent.effect * .02;
      }

      // News stack bleed-through
      const nc = (sec[def.sector]?.news_stack || 0) * .008 * mcm;

      // Momentum (12-bar)
      const mom12 = h.length >= 12 ? (h[h.length - 1] - h[h.length - 12]) / p * .006 : 0;
      updated.momentum = updated.momentum * .9 + mom12 * .1;

      // RSI (14-period)
      let gains = 0, losses = 0;
      const lb = Math.min(14, h.length - 1);
      for (let i = h.length - lb; i < h.length; i++) {
        const diff = h[i] - h[i - 1];
        if (diff > 0) gains += diff; else losses -= diff;
      }
      const rs  = losses === 0 ? 100 : gains / losses;
      updated.rsi = 100 - 100 / (1 + rs);
      const rsiPressure = updated.rsi > 75 ? -(updated.rsi - 75) * .0002
                        : updated.rsi < 25 ? (25 - updated.rsi) * .0002
                        : 0;

      // Insider drift + earnings cycle
      updated.insider_bias   = Math.max(-.01, Math.min(.01, (updated.insider_bias + (Math.random() - .5) * .003) * .95));
      updated.earnings_cycle += .3;
      const earningsEffect    = Math.sin(updated.earnings_cycle * Math.PI / 50) * .001;
      const streakBias        = Math.max(-6, Math.min(6, updated.streak || 0)) * .0003;

      // Cross-sector correlation
      let cor = sectorCorrelation(def.sector, sec, m);
      if (cm < 0) cor += 0.015;

      // Volatility clustering (recent realised vol)
      let recentVol = 0;
      if (h.length >= 3) {
        const lookback = Math.min(8, h.length - 1);
        let sumSq = 0;
        for (let i = h.length - lookback; i < h.length; i++) {
          const ret = (h[i] - h[i - 1]) / h[i - 1];
          sumSq += ret * ret;
        }
        recentVol = Math.sqrt(sumSq / lookback);
      }
      const clusterMult = def.sector === 'meme' ? 20 : 35;
      const volCluster  = 1 + recentVol * clusterMult;

      // Fair value / mean reversion
      const trendDrift = Math.min(1 + def.trend * (updated.earnings_cycle / 300), 10);
      const fairValue  = def.basePrice * Math.max(0.1, trendDrift);

      // New price
      const tv = def.volatility * .03 * mcm * sesVolatMult * volCluster;
      let np   = p + p * (
        def.trend * .02
        + tv * n * Math.abs(cm)
        + se * .04
        + ee + nc
        + updated.momentum * .3
        + streakBias
        + gs * .08
        + cor
        + rsiPressure
        + updated.insider_bias
        + earningsEffect
        + rp + ip + gb
      ) * (cm < 0 ? -1 : 1);

      np += -(np - fairValue) * 0.002;
      // NaN/Inf guard — any corrupted input in the expression above falls back to prev price
      if (!isFinite(np)) np = p;
      np  = Math.round(Math.max(0.10, Math.min(np, def.basePrice * 10)) * 100) / 100;

      // Opening gap shock
      if (session === 'open' && m.tick_count % TICKS_PER_DAY === 54) {
        const gapShock = gaussian() * def.volatility * 0.5 + (sec[def.sector]?.trend || 0) * 2;
        np = Math.round(Math.max(0.10, np * (1 + gapShock)) * 100) / 100;
        updated.open_price  = np;
        updated.candle_open = np; updated.candle_high = np; updated.candle_low = np; updated.candle_ticks = 0;
      }

      // Volume
      const priceMove = Math.abs(np - p) / p;
      const baseVol   = Math.floor((600 + priceMove * 120000 + Math.random() * 3000) * volMult * mcm);
      const buyBias   = (np >= p ? 0.55 : 0.45) + (Math.random() - 0.5) * 0.2;
      const buyVol    = Math.floor(baseVol * Math.max(0.1, Math.min(0.9, buyBias)));
      const sellVol   = baseVol - buyVol;
      updated.volume      += baseVol;
      updated.buy_volume    = (updated.buy_volume || 0) + buyVol;
      updated.sell_volume   = (updated.sell_volume || 0) + sellVol;
      updated.candle_buy_vol  = (updated.candle_buy_vol || 0) + buyVol;
      updated.candle_sell_vol = (updated.candle_sell_vol || 0) + sellVol;

      // VWAP
      const sessionStart = session === 'open' && m.tick_count % TICKS_PER_DAY === 54;
      if (sessionStart) {
        updated.vwap = np;
      } else {
        const totalVol = updated.volume;
        updated.vwap   = totalVol > 0 ? (updated.vwap * (totalVol - baseVol) + np * baseVol) / totalVol : np;
      }
      updated.vwap = Math.round(updated.vwap * 100) / 100;

      // Bid/ask spread
      const mcapSpreadBase = def.mcap === 'large' ? 0.05 : def.mcap === 'mid' ? 0.12 : 0.25;
      const spreadPct      = Math.max(0.02, Math.min(2.0,
        mcapSpreadBase + def.volatility * 80 + (m.vix - 15) * 0.01 + (session !== 'open' ? 0.3 : 0)
      ));
      const halfSpread     = np * spreadPct / 200;
      updated.bid          = Math.round(Math.max(0.01, np - halfSpread) * 100) / 100;
      updated.ask          = Math.round((np + halfSpread) * 100) / 100;
      updated.spread_pct   = +spreadPct.toFixed(3);

      // History + indicators
      const newHistory = [...h, np].slice(-60);
      updated.sma20 = +sma(newHistory, 20).toFixed(2);
      updated.sma50 = +sma(newHistory, 50).toFixed(2);

      if (newHistory.length >= 10) {
        const r = computeMACD(newHistory.slice(-60));
        updated.ema12 = +r.ema12.toFixed(2); updated.ema26 = +r.ema26.toFixed(2);
        updated.macd  = +r.macd.toFixed(4);  updated.macd_signal = +r.signal.toFixed(4); updated.macd_hist = +r.hist.toFixed(4);
      }
      if (newHistory.length >= 5) {
        const bb = computeBollingerBands(newHistory, 20, 2);
        updated.bb_upper  = +bb.upper.toFixed(2);  updated.bb_middle = +bb.middle.toFixed(2);
        updated.bb_lower  = +bb.lower.toFixed(2);  updated.bb_bw     = +bb.bw.toFixed(4);
      }
      updated.atr = +computeATR(newHistory, 14).toFixed(4);

      if (newHistory.length >= 20) {
        updated.beta = +computeBeta(newHistory, 30).toFixed(2);
        if (def.mcap === 'large') updated.beta = +(updated.beta * 0.7 + 0.3).toFixed(2);
        else if (def.mcap === 'small') updated.beta = +(updated.beta * 1.2).toFixed(2);
        updated.beta = Math.max(0.1, Math.min(4.0, updated.beta));
      }

      // Streak
      if      (np > p) updated.streak = Math.max(0, updated.streak) + 1;
      else if (np < p) updated.streak = Math.min(0, updated.streak) - 1;
      else             updated.streak = 0;

      updated.prev_price = p;
      updated.price      = np;
      updated.history    = newHistory;

      // 52w / ATH
      if (np > updated.hi52w) { updated.hi52w = np; newHighs++; }
      if (np < updated.lo52w) { updated.lo52w = np; newLows++; }
      if (np > updated.ath)     updated.ath = np;
      if (np > p) advances++; else if (np < p) declines++;

      // Candles
      updated.candle_ticks = (updated.candle_ticks || 0) + 1;
      updated.candle_high  = Math.max(updated.candle_high || np, np);
      updated.candle_low   = Math.min(updated.candle_low  || np, np);
      if (updated.candle_ticks >= CANDLE_PERIOD) {
        const candles = Array.isArray(st.candles) ? [...st.candles] : [];
        candles.push({ o: updated.candle_open || p, h: updated.candle_high, l: updated.candle_low, c: np, v: baseVol * CANDLE_PERIOD, bv: updated.candle_buy_vol || 0, sv: updated.candle_sell_vol || 0, t: m.tick_count });
        updated.candles      = candles.slice(-48);
        updated.candle_open  = np; updated.candle_high = np; updated.candle_low = np; updated.candle_ticks = 0;
        updated.candle_buy_vol = 0; updated.candle_sell_vol = 0;
      }

      indexSum += np;
      return updated;
      } catch (err) {
        console.error(`[StockSimulation] Error on ticker ${st.ticker}:`, err.message);
        indexSum += Number(st.price) || 0;
        return st; // keep last-known-good state
      }
    });

    // ── Market index + breadth ─────────────────────────────────────────────────
    m.index_prev     = m.index_value;
    m.index_value    = Math.round(indexSum * 100) / 100;
    if (m.index_value > m.index_prev) { m.up_streak++; m.down_streak = 0; }
    else                               { m.down_streak++; m.up_streak = 0; }
    m.advance_decline = advances - declines;
    m.new_highs       = newHighs;
    m.new_lows        = newLows;
    m.tick_count++;

    // Commit state
    this._market  = m;
    this._stocks  = newStocks;
    this._sectors = Object.values(sec);

    return {
      marketState: m,
      stocks:      newStocks,
      sectors:     Object.values(sec),
      newEvent,
    };
  }

  // ── Test helpers ─────────────────────────────────────────────────────────────

  /**
   * Assert basic invariants on the current simulation state.
   * Throws if any invariant is violated — useful in tests and on startup.
   */
  validate() {
    const m = this._market;
    if (m.fear_greed < 0 || m.fear_greed > 100)
      throw new RangeError(`Invalid fear_greed: ${m.fear_greed}`);
    if (m.interest_rate < 0 || m.interest_rate > 12)
      throw new RangeError(`Invalid interest_rate: ${m.interest_rate}`);
    if (m.vix < 0 || m.vix > 200)
      throw new RangeError(`Invalid vix: ${m.vix}`);
    for (const st of this._stocks) {
      if (!isFinite(st.price) || st.price <= 0)
        throw new RangeError(`Stock ${st.ticker} has invalid price: ${st.price}`);
      if (st.price > (STOCK_DEFS[st.ticker]?.basePrice || 1) * 15)
        throw new RangeError(`Stock ${st.ticker} price ${st.price} exceeds 15x base — possible runaway`);
    }
    return true;
  }
}
