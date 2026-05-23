/**
 * PolyEngine · DataAdapter
 *
 * Database persistence layer for PolyEngineTick.
 *
 *   createDbAdapter(dbMarket, dbUser)
 *     → adapter passed to new PolyEngineTick({ db: adapter })
 *     → engine calls loadStockState / loadForexState on startup
 *
 *   registerDbSubscribers(dataWrapper, dbMarket, dbUser)
 *     → wires DataWrapper channels to DB upserts after each tick
 *     → also runs throttled portfolio snapshots every 5 minutes
 *
 * Replaces the write/read functions in the old server/tick.js.
 */

import { SECTORS }           from './StockData.js';
import { CRYPTO_CATEGORIES } from './CryptoData.js';

// ── Stock + market_state write ────────────────────────────────────────────────

async function writeMarketAndStocks(db, marketState, stocks, sectors) {
  const conn = await db.getConnection();
  try {
    await conn.query(
      `INSERT INTO market_state
         (id,index_value,index_prev,fear_greed,interest_rate,inflation,gdp_growth,
          crash_cooldown,boom_cooldown,up_streak,down_streak,tick_count,vix,market_session,
          advance_decline,new_highs,new_lows,macro_regime,regime_ticks_remaining,updated_at)
       VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(3))
       ON DUPLICATE KEY UPDATE
         index_value=VALUES(index_value), index_prev=VALUES(index_prev),
         fear_greed=VALUES(fear_greed), interest_rate=VALUES(interest_rate),
         inflation=VALUES(inflation), gdp_growth=VALUES(gdp_growth),
         crash_cooldown=VALUES(crash_cooldown), boom_cooldown=VALUES(boom_cooldown),
         up_streak=VALUES(up_streak), down_streak=VALUES(down_streak),
         tick_count=VALUES(tick_count), vix=VALUES(vix),
         market_session=VALUES(market_session),
         advance_decline=VALUES(advance_decline), new_highs=VALUES(new_highs),
         new_lows=VALUES(new_lows), macro_regime=VALUES(macro_regime),
         regime_ticks_remaining=VALUES(regime_ticks_remaining), updated_at=NOW(3)`,
      [
        marketState.index_value, marketState.index_prev, marketState.fear_greed,
        marketState.interest_rate, marketState.inflation, marketState.gdp_growth,
        marketState.crash_cooldown, marketState.boom_cooldown,
        marketState.up_streak, marketState.down_streak,
        marketState.tick_count, marketState.vix, marketState.market_session,
        marketState.advance_decline, marketState.new_highs, marketState.new_lows,
        marketState.macro_regime, marketState.regime_ticks_remaining,
      ]
    );

    const CHUNK = 20;
    const COLS  = 'ticker,name,sector,mcap,price,prev_price,open_price,hi52w,lo52w,ath,volume,buy_volume,sell_volume,rsi,momentum,insider_bias,earnings_cycle,streak,beta,atr,ema12,ema26,macd,macd_signal,macd_hist,bb_upper,bb_middle,bb_lower,bb_bw,sma20,sma50,bid,ask,spread_pct,vwap,session,halted,candle_open,candle_high,candle_low,candle_ticks,history,candles';
    const UPD   = 'name=VALUES(name),sector=VALUES(sector),mcap=VALUES(mcap),price=VALUES(price),prev_price=VALUES(prev_price),open_price=VALUES(open_price),hi52w=VALUES(hi52w),lo52w=VALUES(lo52w),ath=VALUES(ath),volume=VALUES(volume),buy_volume=VALUES(buy_volume),sell_volume=VALUES(sell_volume),rsi=VALUES(rsi),momentum=VALUES(momentum),insider_bias=VALUES(insider_bias),earnings_cycle=VALUES(earnings_cycle),streak=VALUES(streak),beta=VALUES(beta),atr=VALUES(atr),ema12=VALUES(ema12),ema26=VALUES(ema26),macd=VALUES(macd),macd_signal=VALUES(macd_signal),macd_hist=VALUES(macd_hist),bb_upper=VALUES(bb_upper),bb_middle=VALUES(bb_middle),bb_lower=VALUES(bb_lower),bb_bw=VALUES(bb_bw),sma20=VALUES(sma20),sma50=VALUES(sma50),bid=VALUES(bid),ask=VALUES(ask),spread_pct=VALUES(spread_pct),vwap=VALUES(vwap),session=VALUES(session),halted=VALUES(halted),candle_open=VALUES(candle_open),candle_high=VALUES(candle_high),candle_low=VALUES(candle_low),candle_ticks=VALUES(candle_ticks),history=VALUES(history),candles=VALUES(candles),updated_at=NOW(3)';

    for (let i = 0; i < stocks.length; i += CHUNK) {
      const chunk = stocks.slice(i, i + CHUNK);
      const vals  = chunk.map(s => [
        s.ticker, s.name, s.sector, s.mcap,
        s.price, s.prev_price, s.open_price,
        s.hi52w, s.lo52w, s.ath,
        s.volume, s.buy_volume, s.sell_volume,
        s.rsi, s.momentum, s.insider_bias,
        s.earnings_cycle, s.streak,
        s.beta, s.atr,
        s.ema12, s.ema26,
        s.macd, s.macd_signal, s.macd_hist,
        s.bb_upper, s.bb_middle, s.bb_lower, s.bb_bw,
        s.sma20, s.sma50,
        s.bid, s.ask, s.spread_pct,
        s.vwap, s.session, s.halted ? 1 : 0,
        s.candle_open, s.candle_high, s.candle_low, s.candle_ticks,
        JSON.stringify(s.history),
        JSON.stringify(s.candles),
      ]);
      const ph  = vals.map(() => `(${Array(43).fill('?').join(',')})`).join(',');
      await conn.query(
        `INSERT INTO stocks_state (${COLS}) VALUES ${ph} ON DUPLICATE KEY UPDATE ${UPD}`,
        vals.flat()
      );
    }

    for (const s of sectors) {
      await conn.query(
        `INSERT INTO sector_state (sector_key,label,icon,momentum,trend,news_stack,updated_at)
         VALUES (?,?,?,?,?,?,NOW(3))
         ON DUPLICATE KEY UPDATE
           momentum=VALUES(momentum), trend=VALUES(trend),
           news_stack=VALUES(news_stack), updated_at=NOW(3)`,
        [
          s.sector_key,
          SECTORS[s.sector_key]?.label || s.sector_key,
          SECTORS[s.sector_key]?.icon  || '',
          s.momentum, s.trend, s.news_stack,
        ]
      );
    }
  } finally {
    conn.release();
  }
}

// ── Forex write ───────────────────────────────────────────────────────────────

async function writeForex(db, pairs) {
  if (!pairs || pairs.length === 0) return;
  const conn = await db.getConnection();
  try {
    const CHUNK = 14;
    const COLS  = 'pair,base,quote,category,price,prev_price,open_price,hi_session,lo_session,hi52w,lo52w,spread,bid,ask,volume,rsi,momentum,atr,ema12,ema26,macd,macd_signal,macd_hist,stoch_k,stoch_d,cci,bb_upper,bb_middle,bb_lower,bb_bw,sma20,sma50,candle_open,candle_high,candle_low,candle_ticks,history,candles';
    const UPD   = 'base=VALUES(base),quote=VALUES(quote),category=VALUES(category),price=VALUES(price),prev_price=VALUES(prev_price),open_price=VALUES(open_price),hi_session=VALUES(hi_session),lo_session=VALUES(lo_session),hi52w=VALUES(hi52w),lo52w=VALUES(lo52w),spread=VALUES(spread),bid=VALUES(bid),ask=VALUES(ask),volume=VALUES(volume),rsi=VALUES(rsi),momentum=VALUES(momentum),atr=VALUES(atr),ema12=VALUES(ema12),ema26=VALUES(ema26),macd=VALUES(macd),macd_signal=VALUES(macd_signal),macd_hist=VALUES(macd_hist),stoch_k=VALUES(stoch_k),stoch_d=VALUES(stoch_d),cci=VALUES(cci),bb_upper=VALUES(bb_upper),bb_middle=VALUES(bb_middle),bb_lower=VALUES(bb_lower),bb_bw=VALUES(bb_bw),sma20=VALUES(sma20),sma50=VALUES(sma50),candle_open=VALUES(candle_open),candle_high=VALUES(candle_high),candle_low=VALUES(candle_low),candle_ticks=VALUES(candle_ticks),history=VALUES(history),candles=VALUES(candles),updated_at=NOW(3)';

    for (let i = 0; i < pairs.length; i += CHUNK) {
      const chunk = pairs.slice(i, i + CHUNK);
      const vals  = chunk.map(p => [
        p.pair, p.base, p.quote, p.category,
        p.price, p.prev_price, p.open_price,
        p.hi_session, p.lo_session, p.hi52w, p.lo52w,
        p.spread, p.bid, p.ask, p.volume,
        p.rsi, p.momentum, p.atr,
        p.ema12, p.ema26, p.macd, p.macd_signal, p.macd_hist,
        p.stoch_k ?? 50, p.stoch_d ?? 50, p.cci ?? 0,
        p.bb_upper, p.bb_middle, p.bb_lower, p.bb_bw,
        p.sma20, p.sma50,
        p.candle_open, p.candle_high, p.candle_low, p.candle_ticks,
        JSON.stringify(p.history),
        JSON.stringify(p.candles),
      ]);
      const ph = vals.map(() => `(${Array(38).fill('?').join(',')})`).join(',');
      await conn.query(
        `INSERT INTO forex_state (${COLS}) VALUES ${ph} ON DUPLICATE KEY UPDATE ${UPD}`,
        vals.flat()
      );
    }
  } finally {
    conn.release();
  }
}

// ── Crypto write ──────────────────────────────────────────────────────────────

async function writeCrypto(db, coins, categories) {
  if (!coins || coins.length === 0) return;
  const conn = await db.getConnection();
  try {
    const CHUNK = 22;
    const COLS  = 'symbol,name,category,mcap_tier,blockchain,consensus,circulating_supply,total_supply,price,prev_price,open_price,hi24h,lo24h,hi52w,lo52w,ath,market_cap,dominance,volume,buy_volume,sell_volume,bid,ask,spread_pct,rsi,momentum,atr,ema12,ema26,macd,macd_signal,macd_hist,stoch_k,stoch_d,cci,bb_upper,bb_middle,bb_lower,bb_bw,sma20,sma50,streak,candle_open,candle_high,candle_low,candle_ticks,history,candles';
    const UPD   = 'name=VALUES(name),category=VALUES(category),mcap_tier=VALUES(mcap_tier),blockchain=VALUES(blockchain),consensus=VALUES(consensus),circulating_supply=VALUES(circulating_supply),total_supply=VALUES(total_supply),price=VALUES(price),prev_price=VALUES(prev_price),open_price=VALUES(open_price),hi24h=VALUES(hi24h),lo24h=VALUES(lo24h),hi52w=VALUES(hi52w),lo52w=VALUES(lo52w),ath=VALUES(ath),market_cap=VALUES(market_cap),dominance=VALUES(dominance),volume=VALUES(volume),buy_volume=VALUES(buy_volume),sell_volume=VALUES(sell_volume),bid=VALUES(bid),ask=VALUES(ask),spread_pct=VALUES(spread_pct),rsi=VALUES(rsi),momentum=VALUES(momentum),atr=VALUES(atr),ema12=VALUES(ema12),ema26=VALUES(ema26),macd=VALUES(macd),macd_signal=VALUES(macd_signal),macd_hist=VALUES(macd_hist),stoch_k=VALUES(stoch_k),stoch_d=VALUES(stoch_d),cci=VALUES(cci),bb_upper=VALUES(bb_upper),bb_middle=VALUES(bb_middle),bb_lower=VALUES(bb_lower),bb_bw=VALUES(bb_bw),sma20=VALUES(sma20),sma50=VALUES(sma50),streak=VALUES(streak),candle_open=VALUES(candle_open),candle_high=VALUES(candle_high),candle_low=VALUES(candle_low),candle_ticks=VALUES(candle_ticks),history=VALUES(history),candles=VALUES(candles),updated_at=NOW(3)';

    for (let i = 0; i < coins.length; i += CHUNK) {
      const chunk = coins.slice(i, i + CHUNK);
      const vals  = chunk.map(c => [
        c.symbol, c.name, c.category, c.mcap_tier, c.blockchain, c.consensus,
        c.circulating_supply, c.total_supply,
        c.price, c.prev_price, c.open_price,
        c.hi24h, c.lo24h, c.hi52w, c.lo52w, c.ath,
        c.market_cap, c.dominance,
        c.volume, c.buy_volume ?? 0, c.sell_volume ?? 0,
        c.bid, c.ask, c.spread_pct,
        c.rsi, c.momentum, c.atr,
        c.ema12, c.ema26, c.macd, c.macd_signal, c.macd_hist,
        c.stoch_k ?? 50, c.stoch_d ?? 50, c.cci ?? 0,
        c.bb_upper, c.bb_middle, c.bb_lower, c.bb_bw,
        c.sma20, c.sma50, c.streak ?? 0,
        c.candle_open, c.candle_high, c.candle_low, c.candle_ticks ?? 0,
        JSON.stringify(c.history),
        JSON.stringify(c.candles),
      ]);
      const ph = vals.map(() => `(${Array(48).fill('?').join(',')})`).join(',');
      await conn.query(
        `INSERT INTO crypto_state (${COLS}) VALUES ${ph} ON DUPLICATE KEY UPDATE ${UPD}`,
        vals.flat()
      );
    }

    if (Array.isArray(categories)) {
      for (const cat of categories) {
        await conn.query(
          `INSERT INTO crypto_category_state (category_key,label,icon,momentum,trend,news_stack,updated_at)
           VALUES (?,?,?,?,?,?,NOW(3))
           ON DUPLICATE KEY UPDATE
             label=VALUES(label), icon=VALUES(icon),
             momentum=VALUES(momentum), trend=VALUES(trend),
             news_stack=VALUES(news_stack), updated_at=NOW(3)`,
          [
            cat.category_key,
            CRYPTO_CATEGORIES[cat.category_key]?.label || cat.label || cat.category_key,
            CRYPTO_CATEGORIES[cat.category_key]?.icon  || cat.icon  || '',
            cat.momentum, cat.trend, cat.news_stack,
          ]
        );
      }
    }
  } finally {
    conn.release();
  }
}

// ── Events write ──────────────────────────────────────────────────────────────

async function writeEvent(db, event) {
  if (!event) return;
  await db.query(
    'INSERT INTO events_log (id,event_text,effect,sector,category,weight,fired_at) VALUES (UUID(),?,?,?,?,?,NOW(3))',
    [event.text, event.effect, event.sector ?? null, event.category ?? null, event.weight ?? 1]
  );
  // Keep only the 40 most recent events
  await db.query(
    'DELETE FROM events_log WHERE id NOT IN (SELECT id FROM (SELECT id FROM events_log ORDER BY fired_at DESC LIMIT 40) t)'
  );
}

// ── Portfolio snapshots ───────────────────────────────────────────────────────

async function snapshotPortfolios(stockPrices, forexPrices, cryptoPrices, dbUser) {
  try {
    const [portfolios] = await dbUser.query('SELECT id FROM portfolios');
    if (!portfolios.length) return;

    for (const port of portfolios) {
      const [positions] = await dbUser.query(
        'SELECT quantity, asset_type, symbol, avg_cost FROM positions WHERE portfolio_id = ?',
        [port.id]
      );
      const [[{ cash }]] = await dbUser.query(
        'SELECT cash_balance AS cash FROM portfolios WHERE id = ?',
        [port.id]
      );
      const posValue = positions.reduce((sum, p) => {
        const price = p.asset_type === 'stock'  ? (stockPrices.get(p.symbol)  ?? Number(p.avg_cost))
          : p.asset_type === 'crypto' ? (cryptoPrices.get(p.symbol) ?? Number(p.avg_cost))
          : (forexPrices.get(p.symbol) ?? Number(p.avg_cost));
        return sum + Number(p.quantity) * price;
      }, 0);

      await dbUser.query(
        `INSERT INTO portfolio_snapshots (portfolio_id, total_value, snapped_at)
         VALUES (?, ?, CURDATE())
         ON DUPLICATE KEY UPDATE total_value = VALUES(total_value)`,
        [port.id, Number(cash) + posValue]
      );
    }
  } catch (err) {
    console.error('[DataAdapter] snapshotPortfolios error:', err.message);
  }
}

// ── Load helpers ──────────────────────────────────────────────────────────────

async function loadStockStateFromDb(db) {
  const [[msRows], [stockRows], [sectorRows]] = await Promise.all([
    db.query('SELECT * FROM market_state WHERE id = 1 LIMIT 1'),
    db.query('SELECT * FROM stocks_state'),
    db.query('SELECT * FROM sector_state'),
  ]);

  const raw = msRows[0] ?? null;
  if (!raw) return null;

  const market = {
    ...raw,
    vix:                    raw.vix                    ?? 18,
    market_session:         raw.market_session         ?? 'open',
    advance_decline:        raw.advance_decline        ?? 0,
    new_highs:              raw.new_highs              ?? 0,
    new_lows:               raw.new_lows               ?? 0,
    macro_regime:           raw.macro_regime           ?? 'expansion',
    regime_ticks_remaining: raw.regime_ticks_remaining ?? 1200,
  };

  const stocks = stockRows.map(s => ({
    ...s,
    history:     Array.isArray(s.history) ? s.history : [],
    candles:     Array.isArray(s.candles) ? s.candles : [],
    buy_volume:  s.buy_volume  ?? 0,
    sell_volume: s.sell_volume ?? 0,
    beta:        s.beta        ?? 1.0,
    atr:         s.atr         ?? 0,
    ema12:       s.ema12       ?? s.price,
    ema26:       s.ema26       ?? s.price,
    macd:        s.macd        ?? 0,
    macd_signal: s.macd_signal ?? 0,
    macd_hist:   s.macd_hist   ?? 0,
    bb_upper:    s.bb_upper    ?? s.price,
    bb_middle:   s.bb_middle   ?? s.price,
    bb_lower:    s.bb_lower    ?? s.price,
    bb_bw:       s.bb_bw       ?? 0,
    sma20:       s.sma20       ?? s.price,
    sma50:       s.sma50       ?? s.price,
    bid:         s.bid         ?? s.price * 0.9995,
    ask:         s.ask         ?? s.price * 1.0005,
    spread_pct:  s.spread_pct  ?? 0.10,
    vwap:        s.vwap        ?? s.price,
    session:     s.session     ?? 'open',
    halted:      !!s.halted,
    candle_open:  s.candle_open  ?? s.price,
    candle_high:  s.candle_high  ?? s.price,
    candle_low:   s.candle_low   ?? s.price,
    candle_ticks: s.candle_ticks ?? 0,
  }));

  return { market, stocks, sectors: sectorRows };
}

async function loadForexStateFromDb(db) {
  const [rows] = await db.query('SELECT * FROM forex_state');
  return rows.map(p => ({
    ...p,
    history: Array.isArray(p.history) ? p.history : [],
    candles: Array.isArray(p.candles) ? p.candles : [],
  }));
}

async function loadCryptoStateFromDb(db) {
  try {
    const [[coinRows], [catRows]] = await Promise.all([
      db.query('SELECT * FROM crypto_state'),
      db.query('SELECT * FROM crypto_category_state'),
    ]);
    if (!coinRows.length) return null;
    const coins = coinRows.map(c => ({
      ...c,
      history:    Array.isArray(c.history) ? c.history : [],
      candles:    Array.isArray(c.candles) ? c.candles : [],
      buy_volume:  c.buy_volume  ?? 0,
      sell_volume: c.sell_volume ?? 0,
      stoch_k:    c.stoch_k  ?? 50,
      stoch_d:    c.stoch_d  ?? 50,
      cci:        c.cci      ?? 0,
      streak:     c.streak   ?? 0,
      dominance:  c.dominance ?? 0,
    }));
    return { coins, categories: catRows };
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns a DB adapter object for PolyEngineTick's `db` option.
 * The engine calls loadStockState / loadForexState during init().
 */
export function createDbAdapter(dbMarket) {
  return {
    loadStockState:  () => loadStockStateFromDb(dbMarket),
    loadForexState:  () => loadForexStateFromDb(dbMarket),
    loadCryptoState: () => loadCryptoStateFromDb(dbMarket),
  };
}

/**
 * Register DataWrapper subscribers that persist tick data to the DB.
 * Call this BEFORE engine.start() so the first tick is captured.
 *
 * @param {import('./DataWrapper.js').DataWrapper} dataWrapper
 * @param {object} dbMarket  mysql2/promise pool for polymart_market
 * @param {object} dbUser    mysql2/promise pool for polymart_user
 */
export function registerDbSubscribers(dataWrapper, dbMarket, dbUser) {
  let lastSnapshotRun = 0;
  let latestForexPrices  = new Map();
  let latestCryptoPrices = new Map();

  dataWrapper.subscribe('stocks', async ({ stocks, marketState, sectors }) => {
    await writeMarketAndStocks(dbMarket, marketState, stocks, sectors);

    const now = Date.now();
    if (now - lastSnapshotRun >= 5 * 60 * 1000) {
      lastSnapshotRun = now;
      const stockPrices = new Map(stocks.map(s => [s.ticker, Number(s.price)]));
      snapshotPortfolios(stockPrices, latestForexPrices, latestCryptoPrices, dbUser);
    }
  });

  dataWrapper.subscribe('forex', async ({ pairs }) => {
    await writeForex(dbMarket, pairs);
    latestForexPrices = new Map(pairs.map(p => [p.pair, Number(p.price)]));
  });

  dataWrapper.subscribe('crypto', async ({ coins, categories }) => {
    await writeCrypto(dbMarket, coins, categories);
    latestCryptoPrices = new Map(coins.map(c => [c.symbol, Number(c.price)]));
  });

  dataWrapper.subscribe('events', async event => {
    if (event) await writeEvent(dbMarket, event);
  });
}
