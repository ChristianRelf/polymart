-- Polymart simulation database schema
-- MySQL 8.0+
-- Run once: mysql -u root -p < server/schema.sql

CREATE DATABASE IF NOT EXISTS polymart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE polymart;

-- ── market_state (singleton row, id=1) ───────────────────────────────────────
-- tick_count is the only permanent metric; it is never culled or reset.
-- No concurrent-users column - tick_count serves as the all-time peak indicator.
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
) ENGINE=InnoDB;

-- ── stocks_state (one row per ticker, ~132 rows) ──────────────────────────────
-- history: last 60 prices (sufficient for all indicators: SMA50, MACD-60, ATR-14)
-- candles: last 48 candles (CANDLE_PERIOD=18 ticks × 10s = 3 min/candle → ~2.4 hrs)
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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

-- ── 24-hour cull event ────────────────────────────────────────────────────────
-- Purges events_log rows older than 24 hours every day.
-- market_state (including tick_count), stocks_state, and sector_state are NOT
-- touched - only events_log data rows are cleared.
-- MySQL Event Scheduler must be enabled: SET GLOBAL event_scheduler = ON;
DROP EVENT IF EXISTS purge_old_events;
CREATE EVENT purge_old_events
  ON SCHEDULE EVERY 1 DAY
  STARTS CURRENT_TIMESTAMP
  DO
    DELETE FROM events_log WHERE fired_at < DATE_SUB(NOW(), INTERVAL 1 DAY);

-- ── Migration for macro regime columns (existing installs) ───────────────────
-- Run manually if upgrading a live DB:
--   ALTER TABLE market_state
--     ADD COLUMN macro_regime VARCHAR(16) NOT NULL DEFAULT 'expansion' AFTER new_lows,
--     ADD COLUMN regime_ticks_remaining INT NOT NULL DEFAULT 1200 AFTER macro_regime;

-- ── Migration for forex stoch/cci columns (existing installs) ───────────────
-- ALTER TABLE forex_state
--   ADD COLUMN stoch_k DOUBLE NOT NULL DEFAULT 50 AFTER macd_hist,
--   ADD COLUMN stoch_d DOUBLE NOT NULL DEFAULT 50 AFTER stoch_k,
--   ADD COLUMN cci     DOUBLE NOT NULL DEFAULT 0  AFTER stoch_d;

-- ── Migration for existing installs ──────────────────────────────────────────
-- Run manually if upgrading a live DB to shrink oversized JSON blobs:
--   UPDATE stocks_state SET
--     history = JSON_EXTRACT(history, CONCAT('$[', JSON_LENGTH(history)-60, ' to last]')),
--     candles = JSON_EXTRACT(candles, CONCAT('$[', JSON_LENGTH(candles)-48, ' to last]'))
--   WHERE JSON_LENGTH(history) > 60 OR JSON_LENGTH(candles) > 48;
-- Or simply: the next tick after deploying simulation.js will auto-truncate via slice(-60)/slice(-48).

-- ═══════════════════════════════════════════════════════════════════════════════
-- ACCOUNT / PAPER TRADING TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── user_profiles ─────────────────────────────────────────────────────────────
-- Synced from Clerk via webhook. clerk_id = Clerk's user_XXXX id.
-- tier drives all feature limits; stripe_* fields track billing state.
CREATE TABLE IF NOT EXISTS user_profiles (
  clerk_id              VARCHAR(64)   NOT NULL,
  display_name          VARCHAR(128)  DEFAULT NULL,
  email                 VARCHAR(256)  DEFAULT NULL,
  tier                  ENUM('basic','premium') NOT NULL DEFAULT 'basic',
  avatar_url            TEXT          DEFAULT NULL,
  bio                   TEXT          DEFAULT NULL,
  stripe_customer_id    VARCHAR(64)   DEFAULT NULL,
  stripe_subscription_id VARCHAR(64)  DEFAULT NULL,
  tier_expires_at       DATETIME      DEFAULT NULL,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (clerk_id),
  UNIQUE KEY uq_stripe_customer   (stripe_customer_id),
  UNIQUE KEY uq_stripe_sub        (stripe_subscription_id)
) ENGINE=InnoDB;

-- ── portfolios ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolios (
  id            INT           NOT NULL AUTO_INCREMENT,
  clerk_id      VARCHAR(64)   NOT NULL,
  name          VARCHAR(128)  NOT NULL,
  description   TEXT          DEFAULT NULL,
  cash_balance  DECIMAL(18,4) NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_portfolios_clerk (clerk_id),
  CONSTRAINT fk_portfolios_user FOREIGN KEY (clerk_id) REFERENCES user_profiles(clerk_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── positions ─────────────────────────────────────────────────────────────────
-- asset_type: 'stock' | 'forex' | any future product key
-- symbol: ticker for stocks, pair string (e.g. 'EUR/USD') for forex
CREATE TABLE IF NOT EXISTS positions (
  id            INT           NOT NULL AUTO_INCREMENT,
  portfolio_id  INT           NOT NULL,
  asset_type    VARCHAR(32)   NOT NULL DEFAULT 'stock',
  symbol        VARCHAR(32)   NOT NULL,
  quantity      DECIMAL(18,4) NOT NULL,
  avg_cost      DECIMAL(18,4) NOT NULL,
  opened_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_position (portfolio_id, asset_type, symbol),
  CONSTRAINT fk_positions_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── orders ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id            INT           NOT NULL AUTO_INCREMENT,
  portfolio_id  INT           NOT NULL,
  asset_type    VARCHAR(32)   NOT NULL DEFAULT 'stock',
  symbol        VARCHAR(32)   NOT NULL,
  side          ENUM('buy','sell') NOT NULL,
  quantity      DECIMAL(18,4) NOT NULL,
  price         DECIMAL(18,4) NOT NULL,
  total         DECIMAL(18,4) NOT NULL,
  notes         TEXT          DEFAULT NULL,
  executed_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_orders_portfolio (portfolio_id),
  KEY idx_orders_executed  (executed_at),
  CONSTRAINT fk_orders_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── portfolio_snapshots ───────────────────────────────────────────────────────
-- Daily total-value snapshots for sparkline charts on the dashboard
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id            INT           NOT NULL AUTO_INCREMENT,
  portfolio_id  INT           NOT NULL,
  total_value   DECIMAL(18,4) NOT NULL,
  snapped_at    DATE          NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_snapshot (portfolio_id, snapped_at),
  CONSTRAINT fk_snapshots_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── watchlists ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS watchlists (
  id          INT           NOT NULL AUTO_INCREMENT,
  clerk_id    VARCHAR(64)   NOT NULL,
  name        VARCHAR(128)  NOT NULL DEFAULT 'My Watchlist',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_watchlists_clerk (clerk_id),
  CONSTRAINT fk_watchlists_user FOREIGN KEY (clerk_id) REFERENCES user_profiles(clerk_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS watchlist_items (
  id            INT           NOT NULL AUTO_INCREMENT,
  watchlist_id  INT           NOT NULL,
  asset_type    VARCHAR(32)   NOT NULL DEFAULT 'stock',
  symbol        VARCHAR(32)   NOT NULL,
  added_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_watchlist_item (watchlist_id, asset_type, symbol),
  CONSTRAINT fk_wl_items_watchlist FOREIGN KEY (watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── support_tickets ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id          INT           NOT NULL AUTO_INCREMENT,
  clerk_id    VARCHAR(64)   DEFAULT NULL,
  email       VARCHAR(256)  NOT NULL,
  subject     VARCHAR(256)  NOT NULL,
  message     TEXT          NOT NULL,
  status      ENUM('open','in_progress','resolved') NOT NULL DEFAULT 'open',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tickets_clerk  (clerk_id),
  KEY idx_tickets_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ticket_notes (
  id             INT           NOT NULL AUTO_INCREMENT,
  ticket_id      INT           NOT NULL,
  admin_clerk_id VARCHAR(64)   NOT NULL,
  note           TEXT          NOT NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_ticket_notes FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── admin_audit_log ───────────────────────────────────────────────────────────
-- Append-only. Records every admin action for accountability.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id              INT           NOT NULL AUTO_INCREMENT,
  admin_clerk_id  VARCHAR(64)   NOT NULL,
  action          VARCHAR(64)   NOT NULL,
  target_clerk_id VARCHAR(64)   DEFAULT NULL,
  details         JSON          DEFAULT NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_admin  (admin_clerk_id),
  KEY idx_audit_action (action)
) ENGINE=InnoDB;
