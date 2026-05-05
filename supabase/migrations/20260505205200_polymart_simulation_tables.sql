/*
  # POLYMART Simulation Tables

  1. New Tables
    - `market_state` — singleton row holding the global market snapshot
      - `id` (int, always 1) primary key
      - `index_value`, `index_prev`, `fear_greed`, `interest_rate`, `inflation`, `gdp_growth`
      - `crash_cooldown`, `boom_cooldown`, `up_streak`, `down_streak`
      - `tick_count`, `updated_at`
    - `stocks_state` — one row per ticker holding full stock state + price history
      - `ticker` (text) primary key
      - `name`, `sector`, `mcap`, `price`, `prev_price`, `open_price`
      - `hi52w`, `lo52w`, `ath`, `volume`, `rsi`, `momentum`, `insider_bias`, `earnings_cycle`, `streak`
      - `history` (jsonb array of last 400 prices)
      - `updated_at`
    - `sector_state` — one row per sector key
      - `sector_key` primary key, `label`, `icon`, `momentum`, `trend`, `news_stack`, `updated_at`
    - `events_log` — rolling log of market events (max 30)
      - `id` (uuid), `event_text`, `effect`, `sector`, `weight`, `fired_at`

  2. Security
    - RLS enabled on all tables
    - Public read-only policies (no auth required — this is a public API)
    - No write policies from the client side; only service_role (Edge Functions) can write

  3. Notes
    - All four tables are intentionally public-readable for open API access
    - Writes happen exclusively from Edge Functions using the service_role key
*/

-- ── market_state ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_state (
  id              int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  index_value     numeric(14,4) NOT NULL DEFAULT 1000,
  index_prev      numeric(14,4) NOT NULL DEFAULT 1000,
  fear_greed      numeric(6,2)  NOT NULL DEFAULT 50,
  interest_rate   numeric(6,3)  NOT NULL DEFAULT 5.0,
  inflation       numeric(6,3)  NOT NULL DEFAULT 2.5,
  gdp_growth      numeric(6,3)  NOT NULL DEFAULT 2.8,
  crash_cooldown  int           NOT NULL DEFAULT 0,
  boom_cooldown   int           NOT NULL DEFAULT 0,
  up_streak       int           NOT NULL DEFAULT 0,
  down_streak     int           NOT NULL DEFAULT 0,
  tick_count      int           NOT NULL DEFAULT 0,
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE market_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read market_state"
  ON market_state FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── stocks_state ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stocks_state (
  ticker          text PRIMARY KEY,
  name            text          NOT NULL DEFAULT '',
  sector          text          NOT NULL DEFAULT '',
  mcap            text          NOT NULL DEFAULT 'mid',
  price           numeric(14,4) NOT NULL DEFAULT 0,
  prev_price      numeric(14,4) NOT NULL DEFAULT 0,
  open_price      numeric(14,4) NOT NULL DEFAULT 0,
  hi52w           numeric(14,4) NOT NULL DEFAULT 0,
  lo52w           numeric(14,4) NOT NULL DEFAULT 0,
  ath             numeric(14,4) NOT NULL DEFAULT 0,
  volume          bigint        NOT NULL DEFAULT 0,
  rsi             numeric(6,2)  NOT NULL DEFAULT 50,
  momentum        numeric(12,6) NOT NULL DEFAULT 0,
  insider_bias    numeric(12,6) NOT NULL DEFAULT 0,
  earnings_cycle  numeric(10,4) NOT NULL DEFAULT 0,
  streak          int           NOT NULL DEFAULT 0,
  history         jsonb         NOT NULL DEFAULT '[]'::jsonb,
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE stocks_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read stocks_state"
  ON stocks_state FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── sector_state ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sector_state (
  sector_key  text PRIMARY KEY,
  label       text         NOT NULL DEFAULT '',
  icon        text         NOT NULL DEFAULT '',
  momentum    numeric(10,6) NOT NULL DEFAULT 0,
  trend       numeric(10,6) NOT NULL DEFAULT 0,
  news_stack  numeric(10,6) NOT NULL DEFAULT 0,
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE sector_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read sector_state"
  ON sector_state FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── events_log ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_text  text        NOT NULL DEFAULT '',
  effect      numeric(8,4) NOT NULL DEFAULT 0,
  sector      text,
  weight      int         NOT NULL DEFAULT 1,
  fired_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE events_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read events_log"
  ON events_log FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks_state(sector);
CREATE INDEX IF NOT EXISTS idx_events_fired  ON events_log(fired_at DESC);

-- ── pg_cron and pg_net extensions (needed for scheduled tick) ─────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
