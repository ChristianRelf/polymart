// Polymart tick worker — runs the simulation every 10 seconds, writes to MySQL

import pool from "./db.js";
import { runTick, buildInitialStocks, buildInitialSectors, STOCK_DEFS, SECTORS } from "./simulation.js";

let ticking = false;

async function writeMysqlBatch(ms, stocks, sectors, newEvent) {
  const conn = await pool.getConnection();
  try {
    // market_state upsert
    await conn.query(
      `INSERT INTO market_state (id,index_value,index_prev,fear_greed,interest_rate,inflation,gdp_growth,
        crash_cooldown,boom_cooldown,up_streak,down_streak,tick_count,vix,market_session,
        advance_decline,new_highs,new_lows,updated_at)
       VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(3))
       ON DUPLICATE KEY UPDATE
        index_value=VALUES(index_value),index_prev=VALUES(index_prev),
        fear_greed=VALUES(fear_greed),interest_rate=VALUES(interest_rate),
        inflation=VALUES(inflation),gdp_growth=VALUES(gdp_growth),
        crash_cooldown=VALUES(crash_cooldown),boom_cooldown=VALUES(boom_cooldown),
        up_streak=VALUES(up_streak),down_streak=VALUES(down_streak),
        tick_count=VALUES(tick_count),vix=VALUES(vix),market_session=VALUES(market_session),
        advance_decline=VALUES(advance_decline),new_highs=VALUES(new_highs),
        new_lows=VALUES(new_lows),updated_at=NOW(3)`,
      [ms.index_value,ms.index_prev,ms.fear_greed,ms.interest_rate,ms.inflation,ms.gdp_growth,
       ms.crash_cooldown,ms.boom_cooldown,ms.up_streak,ms.down_streak,ms.tick_count,ms.vix,ms.market_session,
       ms.advance_decline,ms.new_highs,ms.new_lows]
    );

    // stocks_state batch upsert — chunk by 20 to avoid huge queries
    const chunkSize = 20;
    for (let i = 0; i < stocks.length; i += chunkSize) {
      const chunk = stocks.slice(i, i + chunkSize);
      const values = chunk.map(s => [
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
      const cols = "ticker,name,sector,mcap,price,prev_price,open_price,hi52w,lo52w,ath,volume,buy_volume,sell_volume,rsi,momentum,insider_bias,earnings_cycle,streak,beta,atr,ema12,ema26,macd,macd_signal,macd_hist,bb_upper,bb_middle,bb_lower,bb_bw,sma20,sma50,bid,ask,spread_pct,vwap,session,halted,candle_open,candle_high,candle_low,candle_ticks,history,candles";
      const placeholders = values.map(() => `(${Array(44).fill("?").join(",")})`).join(",");
      const flat = values.flat();
      // Build ON DUPLICATE KEY UPDATE for all mutable columns
      const updateCols = "name=VALUES(name),sector=VALUES(sector),mcap=VALUES(mcap),price=VALUES(price),prev_price=VALUES(prev_price),open_price=VALUES(open_price),hi52w=VALUES(hi52w),lo52w=VALUES(lo52w),ath=VALUES(ath),volume=VALUES(volume),buy_volume=VALUES(buy_volume),sell_volume=VALUES(sell_volume),rsi=VALUES(rsi),momentum=VALUES(momentum),insider_bias=VALUES(insider_bias),earnings_cycle=VALUES(earnings_cycle),streak=VALUES(streak),beta=VALUES(beta),atr=VALUES(atr),ema12=VALUES(ema12),ema26=VALUES(ema26),macd=VALUES(macd),macd_signal=VALUES(macd_signal),macd_hist=VALUES(macd_hist),bb_upper=VALUES(bb_upper),bb_middle=VALUES(bb_middle),bb_lower=VALUES(bb_lower),bb_bw=VALUES(bb_bw),sma20=VALUES(sma20),sma50=VALUES(sma50),bid=VALUES(bid),ask=VALUES(ask),spread_pct=VALUES(spread_pct),vwap=VALUES(vwap),session=VALUES(session),halted=VALUES(halted),candle_open=VALUES(candle_open),candle_high=VALUES(candle_high),candle_low=VALUES(candle_low),candle_ticks=VALUES(candle_ticks),history=VALUES(history),candles=VALUES(candles),updated_at=NOW(3)";
      await conn.query(`INSERT INTO stocks_state (${cols}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${updateCols}`, flat);
    }

    // sector_state upsert
    for (const s of sectors) {
      await conn.query(
        `INSERT INTO sector_state (sector_key,label,icon,momentum,trend,news_stack,updated_at)
         VALUES (?,?,?,?,?,?,NOW(3))
         ON DUPLICATE KEY UPDATE momentum=VALUES(momentum),trend=VALUES(trend),news_stack=VALUES(news_stack),updated_at=NOW(3)`,
        [s.sector_key, SECTORS[s.sector_key]?.label || s.sector_key, SECTORS[s.sector_key]?.icon || "", s.momentum, s.trend, s.news_stack]
      );
    }

    // events_log insert + prune
    if (newEvent) {
      await conn.query(
        "INSERT INTO events_log (id,event_text,effect,sector,category,weight,fired_at) VALUES (UUID(),?,?,?,?,?,NOW(3))",
        [newEvent.text, newEvent.effect, newEvent.sector ?? null, newEvent.category ?? null, newEvent.weight ?? 1]
      );
      // Keep only the most recent 40 events
      await conn.query(
        "DELETE FROM events_log WHERE id NOT IN (SELECT id FROM (SELECT id FROM events_log ORDER BY fired_at DESC LIMIT 40) t)"
      );
    }
  } finally {
    conn.release();
  }
}

async function readState() {
  const [[msRows], [stockRows], [sectorRows]] = await Promise.all([
    pool.query("SELECT * FROM market_state WHERE id = 1 LIMIT 1"),
    pool.query("SELECT * FROM stocks_state"),
    pool.query("SELECT * FROM sector_state"),
  ]);

  const rawMs = msRows[0] ?? null;
  const ms = rawMs ? {
    ...rawMs,
    vix: rawMs.vix ?? 18,
    market_session: rawMs.market_session ?? "open",
    advance_decline: rawMs.advance_decline ?? 0,
    new_highs: rawMs.new_highs ?? 0,
    new_lows: rawMs.new_lows ?? 0,
  } : null;

  const stocks = stockRows.map(s => ({
    ...s,
    history: Array.isArray(s.history) ? s.history : [],
    candles: Array.isArray(s.candles) ? s.candles : [],
    buy_volume: s.buy_volume ?? 0,
    sell_volume: s.sell_volume ?? 0,
    beta: s.beta ?? 1.0,
    atr: s.atr ?? 0,
    ema12: s.ema12 ?? s.price,
    ema26: s.ema26 ?? s.price,
    macd: s.macd ?? 0,
    macd_signal: s.macd_signal ?? 0,
    macd_hist: s.macd_hist ?? 0,
    bb_upper: s.bb_upper ?? s.price,
    bb_middle: s.bb_middle ?? s.price,
    bb_lower: s.bb_lower ?? s.price,
    bb_bw: s.bb_bw ?? 0,
    sma20: s.sma20 ?? s.price,
    sma50: s.sma50 ?? s.price,
    bid: s.bid ?? s.price * 0.9995,
    ask: s.ask ?? s.price * 1.0005,
    spread_pct: s.spread_pct ?? 0.10,
    vwap: s.vwap ?? s.price,
    session: s.session ?? "open",
    halted: !!s.halted,
    candle_open: s.candle_open ?? s.price,
    candle_high: s.candle_high ?? s.price,
    candle_low: s.candle_low ?? s.price,
    candle_ticks: s.candle_ticks ?? 0,
  }));

  return { ms, stocks, sectors: sectorRows };
}

async function ensureInitialised(ms, stocks, sectors) {
  const isFirstRun = !ms;
  const knownTickers = new Set(stocks.map(s => s.ticker));
  const missingTickers = Object.keys(STOCK_DEFS).filter(t => !knownTickers.has(t));
  const knownSectors = new Set(sectors.map(s => s.sector_key));
  const missingSectors = Object.keys(SECTORS).filter(k => !knownSectors.has(k));

  let curMs = ms ?? {
    index_value: 1000, index_prev: 1000, fear_greed: 50,
    interest_rate: 5.0, inflation: 2.5, gdp_growth: 2.8,
    crash_cooldown: 0, boom_cooldown: 0, up_streak: 0, down_streak: 0, tick_count: 0,
    vix: 18, market_session: "open",
    advance_decline: 0, new_highs: 0, new_lows: 0,
  };

  let curStocks = [...stocks];
  let curSectors = [...sectors];

  if (isFirstRun) {
    curStocks = buildInitialStocks();
    curSectors = buildInitialSectors();
    // Warm up with 60 ticks
    for (let i = 0; i < 60; i++) {
      const r = runTick(curMs, curStocks, curSectors);
      curMs = r.ms; curStocks = r.stocks; curSectors = r.sectors;
    }
    await writeMysqlBatch(curMs, curStocks, curSectors, null);
    console.log("[tick] First-run initialisation complete, 60 warm-up ticks applied.");
  } else {
    // Insert any missing tickers / sectors added to STOCK_DEFS / SECTORS after deploy
    if (missingTickers.length > 0) {
      const extra = buildInitialStocks().filter(s => missingTickers.includes(s.ticker));
      curStocks.push(...extra);
    }
    if (missingSectors.length > 0) {
      const extra = buildInitialSectors().filter(s => missingSectors.includes(s.sector_key));
      curSectors.push(...extra);
    }
  }

  return { ms: curMs, stocks: curStocks, sectors: curSectors };
}

export async function tick() {
  if (ticking) return;
  ticking = true;
  const t0 = Date.now();
  try {
    let { ms, stocks, sectors } = await readState();
    ({ ms, stocks, sectors } = await ensureInitialised(ms, stocks, sectors));
    const { ms: newMs, stocks: newStocks, sectors: newSectors, newEvent } = runTick(ms, stocks, sectors);
    await writeMysqlBatch(newMs, newStocks, newSectors, newEvent);
    const elapsed = Date.now() - t0;
    console.log(`[tick] #${newMs.tick_count} session=${newMs.market_session} vix=${newMs.vix.toFixed(1)} fg=${Math.round(newMs.fear_greed)} (${elapsed}ms)`);
  } catch (err) {
    console.error("[tick] error:", err);
  } finally {
    ticking = false;
  }
}

export function startTickLoop(intervalMs = 10000) {
  console.log(`[tick] Starting simulation loop every ${intervalMs / 1000}s`);
  tick(); // immediate first tick
  return setInterval(tick, intervalMs);
}
