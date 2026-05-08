/*
  # Polymart Simulation Expansion - Advanced Market Mechanics

  ## Overview
  Adds real-life trading data fields to stocks_state and market_state to support
  broker training: OHLC candles, bid/ask spread, VWAP, MACD, Bollinger Bands,
  ATR, Beta, order flow (buy/sell volume), VIX, market session, and advance/decline.

  ## New columns - stocks_state
  - buy_volume / sell_volume: directional order flow
  - beta: stock beta relative to market index
  - atr: Average True Range (14-period)
  - ema12 / ema26: Exponential moving averages for MACD
  - macd / macd_signal / macd_hist: MACD indicator values
  - bb_upper / bb_middle / bb_lower: Bollinger Band levels
  - bb_bw: Bollinger Band width (normalised)
  - sma20 / sma50: Simple moving averages
  - bid / ask / spread_pct: Bid-ask spread simulation
  - vwap: Volume-weighted average price
  - session: Market session label (open/pre/post/closed/halted)
  - halted: Circuit-breaker halt flag
  - candle_open / candle_high / candle_low: Current building candle
  - candle_ticks: Ticks into current candle period
  - candles: JSONB array of closed OHLCV candles (last 120)

  ## New columns - market_state
  - vix: Simulated volatility index (8–80)
  - market_session: Current session label
  - advance_decline: Advancing minus declining stocks per tick
  - new_highs / new_lows: 52-week high/low counters per tick

  ## New column - events_log
  - category: Event category tag (macro/earnings/event)
*/

-- ── stocks_state new columns ──────────────────────────────────────────────────

ALTER TABLE stocks_state
  ADD COLUMN IF NOT EXISTS buy_volume  bigint  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sell_volume bigint  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS beta        numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS atr         numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ema12       numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ema26       numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS macd        numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS macd_signal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS macd_hist   numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bb_upper    numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bb_middle   numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bb_lower    numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bb_bw       numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sma20       numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sma50       numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bid         numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ask         numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spread_pct  numeric NOT NULL DEFAULT 0.1,
  ADD COLUMN IF NOT EXISTS vwap        numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session     text    NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS halted      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS candle_open  numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS candle_high  numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS candle_low   numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS candle_ticks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS candles      jsonb   NOT NULL DEFAULT '[]'::jsonb;

-- Backfill bid/ask/vwap/ema/sma/bb from current price for existing rows
UPDATE stocks_state SET
  ema12      = price,
  ema26      = price,
  bb_upper   = price,
  bb_middle  = price,
  bb_lower   = price,
  sma20      = price,
  sma50      = price,
  bid        = ROUND(price * 0.9995, 2),
  ask        = ROUND(price * 1.0005, 2),
  vwap       = price,
  candle_open = price,
  candle_high = price,
  candle_low  = price
WHERE ema12 = 0;

-- ── market_state new columns ──────────────────────────────────────────────────

ALTER TABLE market_state
  ADD COLUMN IF NOT EXISTS vix              numeric NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS market_session   text    NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS advance_decline  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_highs        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_lows         integer NOT NULL DEFAULT 0;

-- ── events_log new column ─────────────────────────────────────────────────────

ALTER TABLE events_log
  ADD COLUMN IF NOT EXISTS category text;
