-- Polymart market database schema
-- Volume 1: high-churn market/stock/forex simulation state
-- Culled aggressively; data here is fully regeneratable.

CREATE DATABASE IF NOT EXISTS polymart_market CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE polymart_market;

-- ── market_state (singleton row, id=1) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_state (
  id              TINYINT      NOT NULL DEFAULT 1,
  index_value     DOUBLE       NOT NULL DEFAULT 1000,
  index_prev      DOUBLE       NOT NULL DEFAULT 1000,
  fear_greed      DOUBLE       NOT NULL DEFAULT 50,
  interest_rate   DOUBLE       NOT NULL DEFAULT 5.0,
  inflation       DOUBLE       NOT NULL DEFAULT 2.5,
  gdp_growth      DOUBLE       NOT NULL DEFAULT 2.8,
  crash_cooldown  INT          NOT NULL DEFAULT 0,
  boom_cooldown   INT          NOT NULL DEFAULT 0,
  up_streak       INT          NOT NULL DEFAULT 0,
  down_streak     INT          NOT NULL DEFAULT 0,
  tick_count      BIGINT       NOT NULL DEFAULT 0,
  vix             DOUBLE       NOT NULL DEFAULT 18,
  market_session  VARCHAR(10)  NOT NULL DEFAULT 'open',
  advance_decline INT          NOT NULL DEFAULT 0,
  new_highs       INT          NOT NULL DEFAULT 0,
  new_lows        INT          NOT NULL DEFAULT 0,
  macro_regime           VARCHAR(16)  NOT NULL DEFAULT 'expansion',
  regime_ticks_remaining INT          NOT NULL DEFAULT 1200,
  updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT singleton CHECK (id = 1)
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED;

-- ── stocks_state (one row per ticker, ~132 rows) ──────────────────────────────
-- history: last 60 prices; candles: last 48 candles
CREATE TABLE IF NOT EXISTS stocks_state (
  ticker          VARCHAR(10)  NOT NULL,
  name            VARCHAR(120) NOT NULL DEFAULT '',
  sector          VARCHAR(20)  NOT NULL DEFAULT '',
  mcap            VARCHAR(10)  NOT NULL DEFAULT 'mid',
  price           DOUBLE       NOT NULL DEFAULT 0,
  prev_price      DOUBLE       NOT NULL DEFAULT 0,
  open_price      DOUBLE       NOT NULL DEFAULT 0,
  hi52w           DOUBLE       NOT NULL DEFAULT 0,
  lo52w           DOUBLE       NOT NULL DEFAULT 0,
  ath             DOUBLE       NOT NULL DEFAULT 0,
  volume          BIGINT       NOT NULL DEFAULT 0,
  buy_volume      BIGINT       NOT NULL DEFAULT 0,
  sell_volume     BIGINT       NOT NULL DEFAULT 0,
  rsi             DOUBLE       NOT NULL DEFAULT 50,
  momentum        DOUBLE       NOT NULL DEFAULT 0,
  insider_bias    DOUBLE       NOT NULL DEFAULT 0,
  earnings_cycle  DOUBLE       NOT NULL DEFAULT 0,
  streak          INT          NOT NULL DEFAULT 0,
  beta            DOUBLE       NOT NULL DEFAULT 1,
  atr             DOUBLE       NOT NULL DEFAULT 0,
  ema12           DOUBLE       NOT NULL DEFAULT 0,
  ema26           DOUBLE       NOT NULL DEFAULT 0,
  macd            DOUBLE       NOT NULL DEFAULT 0,
  macd_signal     DOUBLE       NOT NULL DEFAULT 0,
  macd_hist       DOUBLE       NOT NULL DEFAULT 0,
  bb_upper        DOUBLE       NOT NULL DEFAULT 0,
  bb_middle       DOUBLE       NOT NULL DEFAULT 0,
  bb_lower        DOUBLE       NOT NULL DEFAULT 0,
  bb_bw           DOUBLE       NOT NULL DEFAULT 0,
  sma20           DOUBLE       NOT NULL DEFAULT 0,
  sma50           DOUBLE       NOT NULL DEFAULT 0,
  bid             DOUBLE       NOT NULL DEFAULT 0,
  ask             DOUBLE       NOT NULL DEFAULT 0,
  spread_pct      DOUBLE       NOT NULL DEFAULT 0.1,
  vwap            DOUBLE       NOT NULL DEFAULT 0,
  session         VARCHAR(10)  NOT NULL DEFAULT 'open',
  halted          TINYINT(1)   NOT NULL DEFAULT 0,
  candle_open     DOUBLE       NOT NULL DEFAULT 0,
  candle_high     DOUBLE       NOT NULL DEFAULT 0,
  candle_low      DOUBLE       NOT NULL DEFAULT 0,
  candle_ticks    INT          NOT NULL DEFAULT 0,
  history         JSON         NOT NULL DEFAULT (JSON_ARRAY()),
  candles         JSON         NOT NULL DEFAULT (JSON_ARRAY()),
  updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (ticker)
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED;

-- ── sector_state (one row per sector, ~20 rows) ───────────────────────────────
CREATE TABLE IF NOT EXISTS sector_state (
  sector_key      VARCHAR(20)  NOT NULL,
  label           VARCHAR(60)  NOT NULL DEFAULT '',
  icon            VARCHAR(10)  NOT NULL DEFAULT '',
  momentum        DOUBLE       NOT NULL DEFAULT 0,
  trend           DOUBLE       NOT NULL DEFAULT 0,
  news_stack      DOUBLE       NOT NULL DEFAULT 0,
  updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (sector_key)
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED;

-- ── events_log (rolling log, culled every 24 hours) ──────────────────────────
CREATE TABLE IF NOT EXISTS events_log (
  id              CHAR(36)     NOT NULL DEFAULT (UUID()),
  event_text      TEXT         NOT NULL,
  effect          DOUBLE       NOT NULL DEFAULT 0,
  sector          VARCHAR(20)  NULL,
  category        VARCHAR(20)  NULL,
  weight          INT          NOT NULL DEFAULT 1,
  fired_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_fired_at (fired_at)
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED;

-- ── forex_state (one row per pair, 28 rows) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS forex_state (
  pair          VARCHAR(10)  NOT NULL,
  base          VARCHAR(5)   NOT NULL DEFAULT '',
  quote         VARCHAR(5)   NOT NULL DEFAULT '',
  category      VARCHAR(10)  NOT NULL DEFAULT 'major',
  price         DOUBLE       NOT NULL DEFAULT 0,
  prev_price    DOUBLE       NOT NULL DEFAULT 0,
  open_price    DOUBLE       NOT NULL DEFAULT 0,
  hi_session    DOUBLE       NOT NULL DEFAULT 0,
  lo_session    DOUBLE       NOT NULL DEFAULT 0,
  hi52w         DOUBLE       NOT NULL DEFAULT 0,
  lo52w         DOUBLE       NOT NULL DEFAULT 0,
  spread        DOUBLE       NOT NULL DEFAULT 0,
  bid           DOUBLE       NOT NULL DEFAULT 0,
  ask           DOUBLE       NOT NULL DEFAULT 0,
  volume        BIGINT       NOT NULL DEFAULT 0,
  rsi           DOUBLE       NOT NULL DEFAULT 50,
  momentum      DOUBLE       NOT NULL DEFAULT 0,
  atr           DOUBLE       NOT NULL DEFAULT 0,
  ema12         DOUBLE       NOT NULL DEFAULT 0,
  ema26         DOUBLE       NOT NULL DEFAULT 0,
  macd          DOUBLE       NOT NULL DEFAULT 0,
  macd_signal   DOUBLE       NOT NULL DEFAULT 0,
  macd_hist     DOUBLE       NOT NULL DEFAULT 0,
  stoch_k       DOUBLE       NOT NULL DEFAULT 50,
  stoch_d       DOUBLE       NOT NULL DEFAULT 50,
  cci           DOUBLE       NOT NULL DEFAULT 0,
  bb_upper      DOUBLE       NOT NULL DEFAULT 0,
  bb_middle     DOUBLE       NOT NULL DEFAULT 0,
  bb_lower      DOUBLE       NOT NULL DEFAULT 0,
  bb_bw         DOUBLE       NOT NULL DEFAULT 0,
  sma20         DOUBLE       NOT NULL DEFAULT 0,
  sma50         DOUBLE       NOT NULL DEFAULT 0,
  candle_open   DOUBLE       NOT NULL DEFAULT 0,
  candle_high   DOUBLE       NOT NULL DEFAULT 0,
  candle_low    DOUBLE       NOT NULL DEFAULT 0,
  candle_ticks  INT          NOT NULL DEFAULT 0,
  history       JSON         NOT NULL DEFAULT (JSON_ARRAY()),
  candles       JSON         NOT NULL DEFAULT (JSON_ARRAY()),
  updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (pair)
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED;

-- ── 24-hour cull event ────────────────────────────────────────────────────────
DROP EVENT IF EXISTS purge_old_events;
CREATE EVENT purge_old_events
  ON SCHEDULE EVERY 1 DAY
  STARTS CURRENT_TIMESTAMP
  DO
    DELETE FROM events_log WHERE fired_at < DATE_SUB(NOW(), INTERVAL 1 DAY);

-- ── Weekly OPTIMIZE to reclaim space from high-churn tables ──────────────────
DROP EVENT IF EXISTS optimize_market_tables;
DROP EVENT IF EXISTS optimize_events_log;
CREATE EVENT optimize_events_log
  ON SCHEDULE EVERY 7 DAY
  STARTS CURRENT_TIMESTAMP
  DO OPTIMIZE TABLE events_log;

DROP EVENT IF EXISTS optimize_stocks_state;
CREATE EVENT optimize_stocks_state
  ON SCHEDULE EVERY 7 DAY
  STARTS CURRENT_TIMESTAMP
  DO OPTIMIZE TABLE stocks_state;

DROP EVENT IF EXISTS optimize_forex_state;
CREATE EVENT optimize_forex_state
  ON SCHEDULE EVERY 7 DAY
  STARTS CURRENT_TIMESTAMP
  DO OPTIMIZE TABLE forex_state;
