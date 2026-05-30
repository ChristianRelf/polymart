/**
 * PolyEngine · CryptoSimulation
 *
 * Tick-based simulation for 132 fictional crypto coins across 12 categories.
 * 24/7 trading, BTC-dominance correlation, category momentum, whale events,
 * and the full suite of technical indicators matching the forex engine.
 *
 * Usage:
 *   const sim = new CryptoSimulation();
 *   sim.warmUp(60);
 *   const result = sim.tick();   // returns { coins, categories, newEvent }
 */

import { CRYPTO_DEFS, CRYPTO_SYMBOLS, CRYPTO_CATEGORIES, CRYPTO_CATEGORY_KEYS, sampleCryptoEvent } from './CryptoData.js';

// ── Math helpers (identical to ForexSimulation) ───────────────────────────────

function gaussian() {
  const u1 = Math.random(), u2 = Math.random();
  const z  = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
  return Math.random() < 0.05 ? z * (2 + Math.random() * 1.5) : z;
}

function ema(prev, cur, k) { return cur * k + prev * (1 - k); }

function sma(history, period) {
  const slice = history.slice(-Math.min(period, history.length));
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

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

function computeBB(history, period = 20, stdMult = 2) {
  const slice = history.slice(-Math.min(period, history.length));
  if (slice.length < 2) { const p = slice[0] || 0; return { upper: p, middle: p, lower: p, bw: 0 }; }
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

function computeStochastic(history, kPeriod = 14, dPeriod = 3) {
  const slice = history.slice(-Math.min(kPeriod, history.length));
  if (slice.length < 2) return { k: 50, d: 50 };
  const lo  = Math.min(...slice);
  const hi  = Math.max(...slice);
  const cur = slice[slice.length - 1];
  const k   = hi === lo ? 50 : ((cur - lo) / (hi - lo)) * 100;
  const dSlice = history.slice(-Math.min(kPeriod + dPeriod, history.length));
  const d   = dSlice.length < 2 ? k : dSlice.slice(-dPeriod).reduce((a, b) => a + b, 0) / Math.min(dPeriod, dSlice.length);
  return { k, d };
}

function computeCCI(history, period = 20) {
  const slice = history.slice(-Math.min(period, history.length));
  if (slice.length < 2) return 0;
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const mad  = slice.reduce((a, b) => a + Math.abs(b - mean), 0) / slice.length;
  return mad === 0 ? 0 : (slice[slice.length - 1] - mean) / (0.015 * mad);
}

// ── Precision helper (replaces def.decimals for crypto) ──────────────────────

function priceDecimals(price) {
  if (price >= 1000) return 2;
  if (price >= 1)    return 2;
  if (price >= 0.01) return 4;
  if (price >= 0.0001) return 6;
  return 8;
}

function fixPrice(price) {
  const d = priceDecimals(price);
  return +price.toFixed(d);
}

// ── BTC correlation by category ───────────────────────────────────────────────

const BTC_CORRELATION = {
  l1: 0.85, l2: 0.80, exchange: 0.75, defi: 0.70,
  infra: 0.65, oracle: 0.60, meme: 0.60, ai: 0.55,
  gamefi: 0.55, privacy: 0.50, metaverse: 0.50, stablecoin: 0.02,
};

// ── Candle period ─────────────────────────────────────────────────────────────

const CANDLE_PERIOD = 18;

// ── State builder ─────────────────────────────────────────────────────────────

function buildInitialCoinState(symbol) {
  const def = CRYPTO_DEFS[symbol];
  if (!def) throw new RangeError(`CryptoSimulation: unknown symbol "${symbol}"`);
  const p = def.basePrice;
  const spreadPct = def.category === 'stablecoin' ? 0.05 :
    def.mcap_tier === 'large' ? 0.20 :
    def.mcap_tier === 'mid'   ? 0.40 : 0.80;
  const halfSpread = p * spreadPct / 100;
  return {
    symbol,
    name:               def.name,
    category:           def.category,
    mcap_tier:          def.mcap_tier,
    blockchain:         def.blockchain,
    consensus:          def.consensus,
    circulating_supply: def.circulating_supply,
    total_supply:       def.total_supply,
    price:              p,
    prev_price:         p,
    open_price:         p,
    hi24h:              p,
    lo24h:              p,
    hi52w:              p,
    lo52w:              p,
    ath:                p,
    market_cap:         p * def.circulating_supply,
    dominance:          0,
    volume:             0,
    buy_volume:         0,
    sell_volume:        0,
    bid:                fixPrice(p - halfSpread),
    ask:                fixPrice(p + halfSpread),
    spread_pct:         spreadPct,
    rsi:                50,
    momentum:           0,
    atr:                0,
    ema12:              p,
    ema26:              p,
    macd:               0,
    macd_signal:        0,
    macd_hist:          0,
    stoch_k:            50,
    stoch_d:            50,
    cci:                0,
    bb_upper:           p,
    bb_middle:          p,
    bb_lower:           p,
    bb_bw:              0,
    sma20:              p,
    sma50:              p,
    streak:             0,
    vol_cooldown:       0,
    candle_open:        p,
    candle_high:        p,
    candle_low:         p,
    candle_ticks:       0,
    candle_buy_vol:     0,
    candle_sell_vol:    0,
    history:            [p],
    candles:            [],
  };
}

function buildInitialCategoryState(key) {
  const cat = CRYPTO_CATEGORIES[key];
  return {
    category_key: key,
    label:        cat.label,
    icon:         cat.icon,
    momentum:     0,
    trend:        0,
    news_stack:   0,
  };
}

// ── CryptoSimulation ──────────────────────────────────────────────────────────

export class CryptoSimulation {
  constructor() {
    this._coins      = CRYPTO_SYMBOLS.map(buildInitialCoinState);
    this._categories = CRYPTO_CATEGORY_KEYS.map(buildInitialCategoryState);
    this._tickCount  = 0;
  }

  get coins()      { return this._coins; }
  get categories() { return this._categories; }

  /**
   * Replace state from DB.
   * @param {object[]} coins
   * @param {object[]} [categories]
   */
  loadState(coins, categories) {
    if (!Array.isArray(coins)) throw new TypeError('loadState: coins must be an array');
    this._coins = coins.map(c => {
      if (!c || typeof c.symbol !== 'string' || !CRYPTO_DEFS[c.symbol]) return null;
      const price = Number(c.price);
      const merged = {
        ...buildInitialCoinState(c.symbol),
        ...c,
        history: Array.isArray(c.history) ? c.history : [],
        candles: Array.isArray(c.candles) ? c.candles : [],
      };
      if (!isFinite(price) || price <= 0) {
        const fallback = CRYPTO_DEFS[c.symbol].basePrice;
        console.warn(`[CryptoSimulation] loadState: bad price for ${c.symbol} (${c.price}) - resetting all price fields to ${fallback}`);
        // Reset ALL price-derived fields so the tick starts from a clean baseline.
        merged.price        = fallback;
        merged.prev_price   = fallback;
        merged.open_price   = fallback;
        merged.candle_open  = fallback;
        merged.candle_high  = fallback;
        merged.candle_low   = fallback;
        merged.hi24h        = fallback;
        merged.lo24h        = fallback;
        merged.hi52w        = fallback;
        merged.lo52w        = fallback;
        merged.ath          = fallback;
        merged.ema12        = fallback;
        merged.ema26        = fallback;
        merged.bb_upper     = fallback;
        merged.bb_middle    = fallback;
        merged.bb_lower     = fallback;
        merged.sma20        = fallback;
        merged.sma50        = fallback;
        merged.market_cap   = fallback * (CRYPTO_DEFS[c.symbol].circulating_supply || 0);
        merged.bid          = fallback;
        merged.ask          = fallback;
        merged.macd         = 0;
        merged.macd_signal  = 0;
        merged.macd_hist    = 0;
        merged.history      = [fallback];
        merged.candles      = [];
        merged.candle_ticks = 0;
      }
      return merged;
    }).filter(Boolean);
    this._ensureMissingCoins();

    if (Array.isArray(categories) && categories.length > 0) {
      this._categories = categories.map(c => {
        if (!c || !CRYPTO_CATEGORIES[c.category_key]) return null;
        return { ...buildInitialCategoryState(c.category_key), ...c };
      }).filter(Boolean);
      this._ensureMissingCategories();
    }
  }

  _ensureMissingCoins() {
    const known = new Set(this._coins.map(c => c.symbol));
    for (const sym of CRYPTO_SYMBOLS) {
      if (!known.has(sym)) this._coins.push(buildInitialCoinState(sym));
    }
  }

  _ensureMissingCategories() {
    const known = new Set(this._categories.map(c => c.category_key));
    for (const key of CRYPTO_CATEGORY_KEYS) {
      if (!known.has(key)) this._categories.push(buildInitialCategoryState(key));
    }
  }

  /** @param {number} n */
  warmUp(n = 60) {
    if (typeof n !== 'number' || n < 1) throw new RangeError('warmUp: n must be a positive integer');
    for (let i = 0; i < n; i++) this.tick();
  }

  /** @returns {{ coins: object[], categories: object[], newEvent: object|null }} */
  tick() {
    this._tickCount++;

    // ── 1. Sample event (4% chance) ──────────────────────────────────────────
    let newEvent = null;
    if (Math.random() < 0.04) {
      newEvent = sampleCryptoEvent();
    }

    // ── 2. Update category news stacks ───────────────────────────────────────
    const newCategories = this._categories.map(cat => {
      const updated = { ...cat };
      updated.news_stack *= 0.92;
      if (newEvent) {
        const eventEffect = newEvent.sector === cat.category_key ? newEvent.effect * 0.60
          : newEvent.sector === undefined ? newEvent.effect * 0.25
          : 0;
        updated.news_stack += eventEffect;
      }
      updated.trend    = updated.news_stack * 0.015 + cat.momentum * 0.005;
      updated.momentum = updated.news_stack * 0.5 + Math.random() * 0.01 - 0.005;
      return updated;
    });
    this._categories = newCategories;

    const catMap = Object.fromEntries(newCategories.map(c => [c.category_key, c]));

    // ── 3. Find BTCX return first (market leader) ────────────────────────────
    const btcState = this._coins.find(c => c.symbol === 'BTCX');
    let btcReturn = 0;
    if (btcState) {
      const btcDef = CRYPTO_DEFS['BTCX'];
      const shock = btcDef.volatility * gaussian();
      btcReturn = shock + btcDef.trend + catMap['l1'].trend;
    }

    // ── 4. Compute total market cap for dominance ────────────────────────────
    const totalMarketCap = this._coins.reduce((sum, c) => {
      const sup = Number(c.circulating_supply) || 0;
      return sum + (Number(c.price) || 0) * sup;
    }, 0);

    // ── 5. Reset hi24h/lo24h every 1440 ticks ───────────────────────────────
    const resetDailyOHLC = this._tickCount % 1440 === 0;

    // ── 6. Tick each coin ────────────────────────────────────────────────────
    const newCoins = this._coins.map(c => {
      try {
        const def  = CRYPTO_DEFS[c.symbol];
        if (!def) return c;

        // Self-heal: if price somehow reached 0 (bad DB seed, truncation rounding, etc.)
        if (!c.price || c.price <= 0) {
          console.warn(`[CryptoSimulation] tick: zero price on ${c.symbol} - resetting to basePrice ${def.basePrice}`);
          c = { ...c, price: def.basePrice, prev_price: def.basePrice };
        }

        const updated = { ...c };
        const h = Array.isArray(c.history) ? c.history : [];

        // Determine stablecoin mean-reversion pull
        const isStable = def.category === 'stablecoin';

        // Vol cooldown dampener
        const volMult = (c.vol_cooldown || 0) > 0 ? 0.3 : 1;
        if ((c.vol_cooldown || 0) > 0) updated.vol_cooldown = c.vol_cooldown - 1;

        // Base gaussian shock
        let shock = def.volatility * gaussian() * volMult;

        // BTC dominance correlation (all except BTCX itself)
        if (c.symbol !== 'BTCX') {
          const corr = BTC_CORRELATION[def.category] ?? 0.5;
          shock += corr * btcReturn;
        }

        // Category trend
        const catTrend = catMap[def.category]?.trend ?? 0;
        shock += catTrend;

        // Long-run drift
        shock += def.trend;

        // Stablecoin mean-reversion to basePrice
        if (isStable) {
          shock += (def.basePrice - c.price) * 0.10;
        }

        // Whale event (2% probability, ±3-8% price shock)
        let whaleVolume = 0;
        if (Math.random() < 0.02) {
          const whaleMagnitude = 0.03 + Math.random() * 0.05;
          shock += (Math.random() < 0.5 ? whaleMagnitude : -whaleMagnitude);
          whaleVolume = c.price * def.circulating_supply * 0.002;
        }

        // Compute new price
        const rawNew = c.price * (1 + shock);
        const minPrice = c.price * 0.40;
        const maxPrice = isStable ? def.basePrice * 1.05 : c.price * 2.0;
        const np = fixPrice(Math.max(minPrice, Math.min(maxPrice, rawNew)));

        // Detect runaway volatility - activate cooldown
        const tickReturn = Math.abs((np - c.price) / (c.price || 1));
        if (tickReturn > 0.40) updated.vol_cooldown = 5;

        updated.prev_price = c.price;
        updated.price      = np;

        // 52-week and ATH
        if (resetDailyOHLC) {
          updated.hi24h = np;
          updated.lo24h = np;
        } else {
          updated.hi24h = Math.max(c.hi24h || np, np);
          updated.lo24h = Math.min(c.lo24h || np, np);
        }
        updated.hi52w = Math.max(c.hi52w || np, np);
        updated.lo52w = Math.min(c.lo52w || np, np);
        updated.ath   = Math.max(c.ath   || np, np);

        // Market cap and dominance
        const supply = Number(def.circulating_supply) || 0;
        updated.market_cap = np * supply;
        updated.dominance  = totalMarketCap > 0 ? (np * supply / totalMarketCap) * 100 : 0;

        // Spread (basis of price, larger for smaller caps and more volatile coins)
        const spreadPct = isStable ? 0.05 :
          def.mcap_tier === 'large' ? 0.20 :
          def.mcap_tier === 'mid'   ? 0.40 : 0.80;
        const halfSpread = np * spreadPct / 100;
        updated.bid       = fixPrice(np - halfSpread);
        updated.ask       = fixPrice(np + halfSpread);
        updated.spread_pct = spreadPct;

        // Volume
        const priceMovePct = Math.abs(np - c.price) / (c.price || 1);
        const baseVol = 500 + priceMovePct * 80_000 + Math.random() * 1500 + whaleVolume;
        const volMcapMult = def.mcap_tier === 'large' ? 1.0 : def.mcap_tier === 'mid' ? 1.2 : 1.5;
        const volTick = Math.floor(baseVol * volMcapMult);
        const buyBias = 0.50 + (shock > 0 ? 0.10 : -0.10) + (Math.random() * 0.10 - 0.05);
        updated.volume     = (c.volume || 0) + volTick;
        updated.buy_volume  = (c.buy_volume || 0) + Math.floor(volTick * buyBias);
        updated.sell_volume = (c.sell_volume || 0) + Math.floor(volTick * (1 - buyBias));

        // Streak
        updated.streak = np > c.price
          ? (c.streak >= 0 ? c.streak + 1 : 1)
          : (c.streak <= 0 ? c.streak - 1 : -1);

        // History & indicators
        const newHistory = [...h, np].slice(-60);
        updated.history = newHistory;
        updated.sma20   = +sma(newHistory, 20).toFixed(8);
        updated.sma50   = +sma(newHistory, 50).toFixed(8);
        updated.atr     = +computeATR(newHistory, 14).toFixed(8);

        // RSI
        let gains = 0, losses = 0;
        const lb = Math.min(14, newHistory.length - 1);
        for (let i = newHistory.length - lb; i < newHistory.length; i++) {
          const diff = newHistory[i] - newHistory[i - 1];
          if (diff > 0) gains += diff; else losses -= diff;
        }
        const rs = losses === 0 ? 100 : gains / losses;
        updated.rsi = +(100 - 100 / (1 + rs)).toFixed(2);

        // Momentum
        const mom = newHistory.length >= 5
          ? (newHistory[newHistory.length - 1] - newHistory[newHistory.length - 5]) / (np || 1)
          : 0;
        updated.momentum = +(updated.momentum * 0.9 + mom * 0.1).toFixed(6);

        if (newHistory.length >= 10) {
          const r             = computeMACD(newHistory);
          updated.ema12       = +r.ema12.toFixed(8);
          updated.ema26       = +r.ema26.toFixed(8);
          updated.macd        = +r.macd.toFixed(8);
          updated.macd_signal = +r.signal.toFixed(8);
          updated.macd_hist   = +r.hist.toFixed(8);
        }
        if (newHistory.length >= 5) {
          const bb           = computeBB(newHistory, 20, 2);
          updated.bb_upper   = +bb.upper.toFixed(8);
          updated.bb_middle  = +bb.middle.toFixed(8);
          updated.bb_lower   = +bb.lower.toFixed(8);
          updated.bb_bw      = +bb.bw.toFixed(6);
        }

        const stoch        = computeStochastic(newHistory);
        updated.stoch_k    = +stoch.k.toFixed(2);
        updated.stoch_d    = +stoch.d.toFixed(2);
        updated.cci        = +computeCCI(newHistory).toFixed(2);

        // Candles
        updated.candle_ticks    = (c.candle_ticks || 0) + 1;
        updated.candle_high     = Math.max(c.candle_high || np, np);
        updated.candle_low      = Math.min(c.candle_low  || np, np);
        updated.candle_buy_vol  = (c.candle_buy_vol  || 0) + Math.floor(volTick * buyBias);
        updated.candle_sell_vol = (c.candle_sell_vol || 0) + Math.floor(volTick * (1 - buyBias));
        if (updated.candle_ticks >= CANDLE_PERIOD) {
          const candles = Array.isArray(c.candles) ? [...c.candles] : [];
          candles.push({
            o:  c.candle_open || c.price,
            h:  updated.candle_high,
            l:  updated.candle_low,
            c:  np,
            v:  updated.candle_buy_vol + updated.candle_sell_vol,
            bv: updated.candle_buy_vol,
            sv: updated.candle_sell_vol,
            t:  Date.now(),
          });
          updated.candles        = candles.slice(-48);
          updated.candle_open    = np;
          updated.candle_high    = np;
          updated.candle_low     = np;
          updated.candle_ticks   = 0;
          updated.candle_buy_vol  = 0;
          updated.candle_sell_vol = 0;
        }

        return updated;
      } catch (err) {
        console.error(`[CryptoSimulation] Error on coin ${c.symbol}:`, err.message);
        return c;
      }
    });

    this._coins = newCoins;
    return { coins: newCoins, categories: newCategories, newEvent };
  }

  /** Basic sanity check - throws on invariant violations. */
  validate() {
    for (const c of this._coins) {
      if (!isFinite(c.price) || c.price <= 0)
        throw new RangeError(`Crypto ${c.symbol} has invalid price: ${c.price}`);
    }
    return true;
  }
}
