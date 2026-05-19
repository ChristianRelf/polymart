-- Polymart user database schema
-- Volume 2: persistent user data, portfolios, and community content.
-- Full ACID; never aggressively culled.

CREATE DATABASE IF NOT EXISTS polymart_user CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE polymart_user;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ACCOUNT / PAPER TRADING TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── user_profiles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  clerk_id              VARCHAR(64)   NOT NULL,
  display_name          VARCHAR(128)  DEFAULT NULL,
  email                 VARCHAR(256)  DEFAULT NULL,
  tier                  ENUM('basic','premium') NOT NULL DEFAULT 'basic',
  avatar_url            TEXT          DEFAULT NULL,
  bio                   TEXT          DEFAULT NULL,
  is_verified           TINYINT(1)    NOT NULL DEFAULT 0,
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

-- ── community_posts ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_posts (
  id            INT           NOT NULL AUTO_INCREMENT,
  community_id  INT           NULL,
  share_id      VARCHAR(18)   NULL,
  clerk_id      VARCHAR(64)   NOT NULL,
  display_name  VARCHAR(128)  DEFAULT NULL,
  avatar_url    TEXT          DEFAULT NULL,
  title         VARCHAR(280)  NOT NULL,
  body          TEXT          NOT NULL,
  post_type     ENUM('general','trade','analysis','question') NOT NULL DEFAULT 'general',
  is_pinned     TINYINT       NOT NULL DEFAULT 0,
  is_removed    TINYINT       NOT NULL DEFAULT 0,
  likes         INT           NOT NULL DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_posts_share     (share_id),
  KEY idx_posts_clerk    (clerk_id),
  KEY idx_posts_created  (created_at),
  KEY idx_posts_type     (post_type),
  KEY idx_posts_community (community_id)
) ENGINE=InnoDB;

-- ── community_comments ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_comments (
  id            INT           NOT NULL AUTO_INCREMENT,
  post_id       INT           NOT NULL,
  parent_id     INT           NULL,
  clerk_id      VARCHAR(64)   NOT NULL,
  display_name  VARCHAR(128)  DEFAULT NULL,
  avatar_url    TEXT          DEFAULT NULL,
  body          TEXT          NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comments_post   (post_id),
  KEY idx_comments_parent (parent_id),
  KEY idx_comments_clerk  (clerk_id),
  CONSTRAINT fk_comment_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── community_likes ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_likes (
  id         INT          NOT NULL AUTO_INCREMENT,
  post_id    INT          NOT NULL,
  clerk_id   VARCHAR(64)  NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_like (post_id, clerk_id),
  KEY idx_likes_post (post_id),
  CONSTRAINT fk_like_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── community_reports ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_reports (
  id                  INT           NOT NULL AUTO_INCREMENT,
  post_id             INT           NOT NULL,
  reporter_clerk_id   VARCHAR(64)   NOT NULL,
  reason              VARCHAR(280)  NOT NULL,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_report (post_id, reporter_clerk_id),
  KEY idx_reports_post (post_id),
  CONSTRAINT fk_report_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── communities ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communities (
  id                INT           NOT NULL AUTO_INCREMENT,
  slug              VARCHAR(64)   NOT NULL,
  display_name      VARCHAR(128)  NOT NULL,
  description       TEXT,
  icon_url          TEXT,
  banner_url        TEXT,
  owner_clerk_id    VARCHAR(64)   NOT NULL,
  member_count      INT           NOT NULL DEFAULT 0,
  post_count        INT           NOT NULL DEFAULT 0,
  verification_type ENUM('none','verified','official') NOT NULL DEFAULT 'none',
  post_permission   ENUM('everyone','members','chosen') NOT NULL DEFAULT 'members',
  post_tags         JSON          DEFAULT NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_communities_slug (slug),
  KEY idx_communities_owner   (owner_clerk_id),
  KEY idx_communities_created (created_at)
) ENGINE=InnoDB;

-- ── community_post_allowlist (for post_permission='chosen') ───────────────────
CREATE TABLE IF NOT EXISTS community_post_allowlist (
  id           INT          NOT NULL AUTO_INCREMENT,
  community_id INT          NOT NULL,
  clerk_id     VARCHAR(64)  NOT NULL,
  added_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_allowlist (community_id, clerk_id),
  KEY idx_allowlist_community (community_id)
) ENGINE=InnoDB;

-- ── community_memberships ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_memberships (
  id            INT           NOT NULL AUTO_INCREMENT,
  community_id  INT           NOT NULL,
  clerk_id      VARCHAR(64)   NOT NULL,
  role          ENUM('member','moderator','owner') NOT NULL DEFAULT 'member',
  joined_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_membership (community_id, clerk_id),
  KEY idx_memberships_clerk (clerk_id)
) ENGINE=InnoDB;

-- ── community_bans ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_bans (
  id            INT           NOT NULL AUTO_INCREMENT,
  community_id  INT           NOT NULL,
  clerk_id      VARCHAR(64)   NOT NULL,
  banned_by     VARCHAR(64)   NOT NULL,
  reason        VARCHAR(500),
  banned_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ban (community_id, clerk_id)
) ENGINE=InnoDB;

-- ── community_mod_log ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_mod_log (
  id                INT           NOT NULL AUTO_INCREMENT,
  community_id      INT           NOT NULL,
  mod_clerk_id      VARCHAR(64)   NOT NULL,
  action_type       VARCHAR(32)   NOT NULL,
  target_clerk_id   VARCHAR(64)   DEFAULT NULL,
  target_post_id    INT           DEFAULT NULL,
  details           VARCHAR(500)  DEFAULT NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mod_log_community (community_id, created_at)
) ENGINE=InnoDB;

-- ── community_rules ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_rules (
  id            INT           NOT NULL AUTO_INCREMENT,
  community_id  INT           NOT NULL,
  title         VARCHAR(128)  NOT NULL,
  description   TEXT,
  display_order INT           NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_rules_community (community_id)
) ENGINE=InnoDB;

-- ── community_community_reports ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_community_reports (
  id                  INT           NOT NULL AUTO_INCREMENT,
  community_id        INT           NOT NULL,
  reporter_clerk_id   VARCHAR(64)   NOT NULL,
  reason              VARCHAR(280)  NOT NULL,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_community_report (community_id, reporter_clerk_id)
) ENGINE=InnoDB;

-- ── admin_audit_log ───────────────────────────────────────────────────────────
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
