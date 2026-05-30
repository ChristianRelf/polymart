import express from "express";
import compression from "compression";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";
import { dbMarket, dbUser } from "./db.js";
import marketRouter from "./PolyAPI/MarketAPI.js";
import accountRouter, { clerkWebhookHandler } from "./PolyAPI/AccountsAPI.js";
import billingRouter, { stripeWebhookHandler } from "./PolyAPI/BillingAPI.js";
import supportRouter from "./PolyAPI/SupportAPI.js";
import adminRouter from "./PolyAPI/AdminAPI.js";
import communityRouter from "./PolyAPI/CommunityAPI.js";
import communitiesRouter from "./PolyAPI/CommunitiesAPI.js";
import usersRouter from "./PolyAPI/UsersAPI.js";
import leaderboardRouter from "./PolyAPI/LeaderboardAPI.js";
import botFeedbackRouter from "./PolyAPI/BotFeedbackAPI.js";
import toolsRouter from "./PolyAPI/ToolsAPI.js";
import discordBotRouter from "./PolyAPI/DiscordBotAPI.js";
import { PolyEngineTick } from "./PolyEngine/tick.js";
import { createDbAdapter, registerDbSubscribers } from "./PolyEngine/DataAdapter.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ── CORS ───────────────────────────────────────────────────────────────────────
// Public API: wide open (market data is intentionally public)
// Account / billing / admin: restricted to allowed origins only
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",").map(s => s.trim());

function restrictedCors(req, res, next) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, svix-id, svix-timestamp, svix-signature, stripe-signature");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
}

// ── HTTP compression (gzip/brotli for API responses and static assets) ────────
app.use(compression());

// ── Clerk middleware (processes JWT on every request) ─────────────────────────
app.use(clerkMiddleware());

// ── Webhook routes (raw body - must come BEFORE express.json()) ───────────────
app.post("/api/v1/account/webhook", express.raw({ type: "application/json" }), clerkWebhookHandler);
app.post("/api/v1/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhookHandler);

// ── JSON body parser (applied after webhook routes) ───────────────────────────
app.use(express.json({ limit: "10kb" }));

// ── Public market API ─────────────────────────────────────────────────────────
app.use("/api/v1", marketRouter);

// ── Account API (protected by Clerk auth inside the router) ───────────────────
app.use("/api/v1/account", restrictedCors, accountRouter);

// ── Billing API ───────────────────────────────────────────────────────────────
app.use("/api/v1/billing", restrictedCors, billingRouter);

// ── Support API ───────────────────────────────────────────────────────────────
app.use("/api/v1/support", restrictedCors, supportRouter);

// ── Admin API (admin-only guard inside the router) ────────────────────────────
app.use("/api/v1/admin", restrictedCors, adminRouter);

// ── Community API (GET posts is public; write ops check auth internally) ──────
app.use("/api/v1/community", restrictedCors, communityRouter);

// ── Communities API (sub-communities, memberships, mod tools) ─────────────────
app.use("/api/v1/communities", restrictedCors, communitiesRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/leaderboard", leaderboardRouter);

// ── Bot feedback (bug reports & suggestions) ──────────────────────────────────
app.use("/api/v1/bot-feedback", botFeedbackRouter);

// ── Community tools & plugins ─────────────────────────────────────────────────
app.use("/api/v1/tools", restrictedCors, toolsRouter);

// ── Discord bot API (pre-shared BOT_API_KEY, not Clerk JWT) ───────────────────
app.use("/api/v1/bot", discordBotRouter);

// ── Share embed route ─────────────────────────────────────────────────────────
// Serves an OG-tagged HTML page for /s/:shareId so Discord/Slack/etc can unfurl
// the link. Real users are JS-redirected to the SPA immediately.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

app.get("/s/:shareId", async (req, res) => {
  const { shareId } = req.params;
  const origin    = process.env.ORIGIN || "https://polymart.co";
  const fallback  = "/#/community";
  const postSpaUrl = `/#/community/post/${shareId}`;

  try {
    const [[post]] = await dbUser.query(
      `SELECT title, body, display_name, post_type, likes
       FROM community_posts WHERE share_id = ?`,
      [shareId]
    );

    if (!post) return res.redirect(fallback);

    const title   = post.title;
    const author  = post.display_name || "Anonymous";
    const type    = post.post_type.charAt(0).toUpperCase() + post.post_type.slice(1);
    const preview = post.body.length > 200 ? post.body.slice(0, 197) + "…" : post.body;
    const desc    = `${type} post by ${author} · ${post.likes} likes\n\n${preview}`;
    const postUrl = `${origin}/s/${shareId}`;
    const ogImage = `${origin}/polymartlogo.png`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)} - Polymart Community</title>
<meta name="description" content="${escapeHtml(preview)}">
<meta property="og:type"        content="article">
<meta property="og:site_name"   content="Polymart Community">
<meta property="og:title"       content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:url"         content="${escapeHtml(postUrl)}">
<meta property="og:image"       content="${escapeHtml(ogImage)}">
<meta name="twitter:card"        content="summary">
<meta name="twitter:title"       content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="twitter:image"       content="${escapeHtml(ogImage)}">
<meta http-equiv="refresh" content="0;url=${escapeHtml(postSpaUrl)}">
</head>
<body>
<p>Redirecting to Polymart&hellip;</p>
<script>window.location.replace(${JSON.stringify(postSpaUrl)});</script>
</body>
</html>`);
  } catch (err) {
    console.error("[share] Error:", err.message);
    res.redirect(fallback);
  }
});

// ── Global JSON error handler (must be before static/catch-all) ──────────────
// Catches next(err) from any middleware (e.g. requireAuth, clerkMiddleware)
// and returns JSON instead of Express's default HTML error page.
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  console.error(`[polymart] Unhandled error ${status} on ${req.method} ${req.path}:`, err.message);
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// ── Community image uploads ───────────────────────────────────────────────────
// Persistent storage outside dist/ so rebuilds don't wipe uploads.
// Filenames are random hex - content never changes, so cache aggressively.
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: "1y",
  immutable: true,
}));

// ── Serve built frontend ──────────────────────────────────────────────────────
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ── Schema migration ──────────────────────────────────────────────────────────
async function applySchemaFile(pool, schemaFile, label) {
  const schemaPath = path.join(__dirname, schemaFile);
  const raw = fs.readFileSync(schemaPath, "utf8");
  let sql = raw.replace(/--[^\n]*/g, "");
  // Strip CREATE EVENT and DROP EVENT (events are managed by MySQL scheduler, not applySchemaFile)
  sql = sql.replace(/\bDROP\s+EVENT\b[^;]*;/gi, "");
  sql = sql.replace(/\bCREATE\s+EVENT\b[^;]*;/gi, "");
  const statements = sql
    .split(";")
    .map(s => s.trim())
    .filter(s => {
      if (!s) return false;
      const upper = s.toUpperCase();
      if (upper.startsWith("CREATE DATABASE")) return false;
      if (upper.startsWith("USE ")) return false;
      if (upper.startsWith("SET GLOBAL")) return false;
      return true;
    });

  const conn = await pool.getConnection();
  try {
    for (const stmt of statements) {
      await conn.query(stmt);
    }
    const [tables] = await conn.query("SHOW TABLES");
    console.log(`[polymart] ${label} schema applied. Tables:`, tables.map(r => Object.values(r)[0]).join(", "));
  } catch (err) {
    console.error(`[polymart] ${label} schema error:`, err.message);
    throw err;
  } finally {
    conn.release();
  }
}

async function applySchema() {
  await Promise.all([
    applySchemaFile(dbMarket, "schema-market.sql", "market"),
    applySchemaFile(dbUser,   "schema-user.sql",   "user"),
  ]);
}

async function applyMigrations() {
  // Add share_id column to community_posts if not present.
  const [[{ cnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'community_posts'
       AND COLUMN_NAME  = 'share_id'`
  );
  if (!cnt) {
    await dbUser.query(
      `ALTER TABLE community_posts ADD COLUMN share_id VARCHAR(18) NULL AFTER id`
    );
    await dbUser.query(
      `ALTER TABLE community_posts ADD UNIQUE INDEX idx_posts_share_id (share_id)`
    );
    console.log("[polymart] Migration: added share_id to community_posts");
  }

  // Backfill share_id for any existing posts that don't have one yet.
  // Uses MySQL's UUID() (hex, URL-safe) truncated to 18 chars.
  const [result] = await dbUser.query(
    `UPDATE community_posts
     SET share_id = SUBSTR(REPLACE(UUID(), '-', ''), 1, 18)
     WHERE share_id IS NULL`
  );
  if (result.affectedRows > 0) {
    console.log(`[polymart] Migration: backfilled share_id for ${result.affectedRows} post(s)`);
  }

  // Add parent_id column to community_comments if not present (thread support).
  const [[{ parentCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS parentCnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'community_comments'
       AND COLUMN_NAME  = 'parent_id'`
  );
  if (!parentCnt) {
    await dbUser.query(
      `ALTER TABLE community_comments ADD COLUMN parent_id INT NULL AFTER post_id`
    );
    await dbUser.query(
      `ALTER TABLE community_comments ADD KEY idx_comments_parent (parent_id)`
    );
    console.log("[polymart] Migration: added parent_id to community_comments");
  }

  // Add community_id to community_posts for sub-community scoping.
  const [[{ commIdCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS commIdCnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'community_posts'
       AND COLUMN_NAME  = 'community_id'`
  );
  if (!commIdCnt) {
    await dbUser.query(`ALTER TABLE community_posts ADD COLUMN community_id INT NULL AFTER id`);
    await dbUser.query(`ALTER TABLE community_posts ADD KEY idx_posts_community (community_id)`);
    console.log("[polymart] Migration: added community_id to community_posts");
  }

  // Add is_pinned to community_posts.
  const [[{ pinnedCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS pinnedCnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'community_posts'
       AND COLUMN_NAME  = 'is_pinned'`
  );
  if (!pinnedCnt) {
    await dbUser.query(`ALTER TABLE community_posts ADD COLUMN is_pinned TINYINT NOT NULL DEFAULT 0 AFTER post_type`);
    console.log("[polymart] Migration: added is_pinned to community_posts");
  }

  // Add is_removed to community_posts.
  const [[{ removedCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS removedCnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'community_posts'
       AND COLUMN_NAME  = 'is_removed'`
  );
  if (!removedCnt) {
    await dbUser.query(`ALTER TABLE community_posts ADD COLUMN is_removed TINYINT NOT NULL DEFAULT 0 AFTER is_pinned`);
    console.log("[polymart] Migration: added is_removed to community_posts");
  }

  // Create community_likes table for deduplicating post likes.
  const [[{ likesTableCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS likesTableCnt FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'community_likes'`
  );
  if (!likesTableCnt) {
    await dbUser.query(`
      CREATE TABLE community_likes (
        id         INT          NOT NULL AUTO_INCREMENT,
        post_id    INT          NOT NULL,
        clerk_id   VARCHAR(64)  NOT NULL,
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_like (post_id, clerk_id),
        KEY idx_likes_post (post_id),
        CONSTRAINT fk_like_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);
    console.log("[polymart] Migration: created community_likes table");
  }

  // Add index on community_posts(post_type) for filtered feed queries.
  const [[{ postTypeIdxCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS postTypeIdxCnt FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'community_posts'
       AND INDEX_NAME   = 'idx_posts_type'`
  );
  if (!postTypeIdxCnt) {
    await dbUser.query(`ALTER TABLE community_posts ADD KEY idx_posts_type (post_type)`);
    console.log("[polymart] Migration: added idx_posts_type to community_posts");
  }

  // Add verification_type to communities if missing
  const [[{ verifCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS verifCnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'communities'
       AND COLUMN_NAME  = 'verification_type'`
  );
  if (!verifCnt) {
    await dbUser.query(`ALTER TABLE communities ADD COLUMN verification_type ENUM('none','verified','official') NOT NULL DEFAULT 'none'`);
    console.log("[polymart] Migration: added verification_type to communities");
  }

  // Create communities table if not present (schema.sql handles fresh installs;
  // this guard covers existing deployments before the table was in schema.sql).
  const [[{ commTableCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS commTableCnt FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'communities'`
  );
  if (!commTableCnt) {
    await dbUser.query(`
      CREATE TABLE communities (
        id              INT           NOT NULL AUTO_INCREMENT,
        slug            VARCHAR(64)   NOT NULL,
        display_name    VARCHAR(128)  NOT NULL,
        description     TEXT,
        icon_url        TEXT,
        banner_url      TEXT,
        owner_clerk_id  VARCHAR(64)   NOT NULL,
        member_count    INT           NOT NULL DEFAULT 0,
        post_count      INT           NOT NULL DEFAULT 0,
        created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_communities_slug (slug),
        KEY idx_communities_owner   (owner_clerk_id),
        KEY idx_communities_created (created_at)
      ) ENGINE=InnoDB`);
    await dbUser.query(`
      CREATE TABLE community_memberships (
        id            INT           NOT NULL AUTO_INCREMENT,
        community_id  INT           NOT NULL,
        clerk_id      VARCHAR(64)   NOT NULL,
        role          ENUM('member','moderator','owner') NOT NULL DEFAULT 'member',
        joined_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_membership (community_id, clerk_id),
        KEY idx_memberships_clerk (clerk_id)
      ) ENGINE=InnoDB`);
    await dbUser.query(`
      CREATE TABLE community_bans (
        id            INT           NOT NULL AUTO_INCREMENT,
        community_id  INT           NOT NULL,
        clerk_id      VARCHAR(64)   NOT NULL,
        banned_by     VARCHAR(64)   NOT NULL,
        reason        VARCHAR(500),
        banned_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_ban (community_id, clerk_id)
      ) ENGINE=InnoDB`);
    await dbUser.query(`
      CREATE TABLE community_mod_log (
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
      ) ENGINE=InnoDB`);
    await dbUser.query(`
      CREATE TABLE community_rules (
        id            INT           NOT NULL AUTO_INCREMENT,
        community_id  INT           NOT NULL,
        title         VARCHAR(128)  NOT NULL,
        description   TEXT,
        display_order INT           NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        KEY idx_rules_community (community_id)
      ) ENGINE=InnoDB`);
    await dbUser.query(`
      CREATE TABLE community_community_reports (
        id                  INT           NOT NULL AUTO_INCREMENT,
        community_id        INT           NOT NULL,
        reporter_clerk_id   VARCHAR(64)   NOT NULL,
        reason              VARCHAR(280)  NOT NULL,
        created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_community_report (community_id, reporter_clerk_id)
      ) ENGINE=InnoDB`);
    console.log("[polymart] Migration: created communities + related tables");
  }

  // Add is_verified to user_profiles.
  const [[{ verifUserCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS verifUserCnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_profiles' AND COLUMN_NAME = 'is_verified'`
  );
  if (!verifUserCnt) {
    await dbUser.query(`ALTER TABLE user_profiles ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0`);
    console.log("[polymart] Migration: added is_verified to user_profiles");
  }

  // Add post_permission to communities.
  const [[{ permCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS permCnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'communities' AND COLUMN_NAME = 'post_permission'`
  );
  if (!permCnt) {
    await dbUser.query(`ALTER TABLE communities ADD COLUMN post_permission ENUM('everyone','members','chosen') NOT NULL DEFAULT 'members'`);
    console.log("[polymart] Migration: added post_permission to communities");
  }

  // Add post_tags to communities.
  const [[{ tagsCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS tagsCnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'communities' AND COLUMN_NAME = 'post_tags'`
  );
  if (!tagsCnt) {
    await dbUser.query(`ALTER TABLE communities ADD COLUMN post_tags JSON DEFAULT NULL`);
    console.log("[polymart] Migration: added post_tags to communities");
  }

  // Widen community_posts.post_type from ENUM to VARCHAR to support custom tags.
  const [[{ postTypeKind }]] = await dbUser.query(
    `SELECT DATA_TYPE AS postTypeKind FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'community_posts' AND COLUMN_NAME = 'post_type'`
  );
  if (postTypeKind && postTypeKind.toLowerCase() === 'enum') {
    await dbUser.query(`ALTER TABLE community_posts MODIFY COLUMN post_type VARCHAR(32) NOT NULL DEFAULT 'general'`);
    console.log("[polymart] Migration: widened community_posts.post_type to VARCHAR(32)");
  }

  // Create community_post_allowlist table.
  const [[{ allowlistCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS allowlistCnt FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'community_post_allowlist'`
  );
  if (!allowlistCnt) {
    await dbUser.query(`
      CREATE TABLE community_post_allowlist (
        id           INT          NOT NULL AUTO_INCREMENT,
        community_id INT          NOT NULL,
        clerk_id     VARCHAR(64)  NOT NULL,
        added_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_allowlist (community_id, clerk_id),
        KEY idx_allowlist_community (community_id)
      ) ENGINE=InnoDB`);
    console.log("[polymart] Migration: created community_post_allowlist table");
  }

  // Add profile_id to user_profiles for public profile URLs.
  const [[{ profileIdCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS profileIdCnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_profiles' AND COLUMN_NAME = 'profile_id'`
  );
  if (!profileIdCnt) {
    await dbUser.query(`ALTER TABLE user_profiles ADD COLUMN profile_id VARCHAR(16) NULL AFTER clerk_id`);
    await dbUser.query(`ALTER TABLE user_profiles ADD UNIQUE INDEX idx_profiles_profile_id (profile_id)`);
    console.log("[polymart] Migration: added profile_id to user_profiles");
  }

  // Backfill profile_id for existing users who don't have one.
  const [[{ nullProfileCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS nullProfileCnt FROM user_profiles WHERE profile_id IS NULL`
  );
  if (nullProfileCnt > 0) {
    // Seed RAND with CRC32(clerk_id) so each user gets a unique, stable seed
    // regardless of when they registered. UNIX_TIMESTAMP(created_at) caused
    // UNIQUE violations when multiple users registered within the same second.
    await dbUser.query(
      `UPDATE user_profiles
       SET profile_id = LPAD(
         MOD(CONV(SUBSTRING(MD5(clerk_id), 1, 15), 16, 10), 9000000000000000) + 1000000000000000,
         16, '0')
       WHERE profile_id IS NULL`
    );
    console.log(`[polymart] Migration: backfilled profile_id for ${nullProfileCnt} user(s)`);
  }

  // Fix any profile_ids that are not pure 9–16 digit strings (e.g. decimal representations
  // like "7.30254727630181" that could result from floating-point serialization bugs).
  const [[{ badProfileCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS badProfileCnt FROM user_profiles
     WHERE profile_id IS NOT NULL AND profile_id NOT REGEXP '^[0-9]{9,16}$'`
  );
  if (badProfileCnt > 0) {
    await dbUser.query(
      `UPDATE user_profiles
       SET profile_id = LPAD(
         MOD(CONV(SUBSTRING(MD5(CONCAT(clerk_id, 'fix')), 1, 15), 16, 10), 9000000000000000) + 1000000000000000,
         16, '0')
       WHERE profile_id IS NOT NULL AND profile_id NOT REGEXP '^[0-9]{9,16}$'`
    );
    console.log(`[polymart] Migration: fixed ${badProfileCnt} malformed profile_id(s)`);
  }

  // Create server_price_alerts table for cross-platform alert management.
  const [[{ spaCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS spaCnt FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'server_price_alerts'`
  );
  if (!spaCnt) {
    await dbUser.query(`
      CREATE TABLE server_price_alerts (
        id           INT           NOT NULL AUTO_INCREMENT,
        clerk_id     VARCHAR(64)   NOT NULL,
        asset_type   VARCHAR(32)   NOT NULL DEFAULT 'stock',
        symbol       VARCHAR(32)   NOT NULL,
        direction    ENUM('above','below') NOT NULL,
        threshold    DECIMAL(18,6) NOT NULL,
        note         VARCHAR(200)  DEFAULT NULL,
        triggered    TINYINT(1)    NOT NULL DEFAULT 0,
        created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        triggered_at DATETIME      DEFAULT NULL,
        PRIMARY KEY (id),
        KEY idx_spa_clerk     (clerk_id),
        KEY idx_spa_symbol    (asset_type, symbol),
        KEY idx_spa_triggered (triggered),
        CONSTRAINT fk_spa_user FOREIGN KEY (clerk_id)
          REFERENCES user_profiles(clerk_id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);
    console.log("[polymart] Migration: created server_price_alerts table");
  }

  // Add discord_id, discord_username, discord_linked_at to user_profiles.
  const [[{ discordIdCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS discordIdCnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_profiles' AND COLUMN_NAME = 'discord_id'`
  );
  if (!discordIdCnt) {
    await dbUser.query(`ALTER TABLE user_profiles
      ADD COLUMN discord_id        VARCHAR(30)  DEFAULT NULL,
      ADD COLUMN discord_username  VARCHAR(100) DEFAULT NULL,
      ADD COLUMN discord_linked_at DATETIME     DEFAULT NULL`);
    await dbUser.query(`ALTER TABLE user_profiles ADD UNIQUE INDEX uq_discord_id (discord_id)`);
    console.log("[polymart] Migration: added discord link columns to user_profiles");
  }

  // Create discord_link_codes table for pairing codes.
  const [[{ dlcCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS dlcCnt FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'discord_link_codes'`
  );
  if (!dlcCnt) {
    await dbUser.query(`
      CREATE TABLE discord_link_codes (
        id            INT          NOT NULL AUTO_INCREMENT,
        clerk_user_id VARCHAR(64)  NOT NULL,
        code          CHAR(6)      NOT NULL,
        expires_at    DATETIME     NOT NULL,
        used          TINYINT(1)   NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        UNIQUE KEY uq_dlc_code (code),
        KEY idx_dlc_clerk   (clerk_user_id),
        KEY idx_dlc_expires (expires_at),
        CONSTRAINT fk_dlc_user FOREIGN KEY (clerk_user_id)
          REFERENCES user_profiles(clerk_id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);
    console.log("[polymart] Migration: created discord_link_codes table");
  }

  // Add show_on_leaderboard to user_profiles.
  const [[{ leaderCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS leaderCnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_profiles' AND COLUMN_NAME = 'show_on_leaderboard'`
  );
  if (!leaderCnt) {
    await dbUser.query(`ALTER TABLE user_profiles ADD COLUMN show_on_leaderboard TINYINT(1) NOT NULL DEFAULT 1`);
    console.log("[polymart] Migration: added show_on_leaderboard to user_profiles");
  }

  // Add order_type, trigger_price, status, realized_pnl, created_at to orders table
  // (added when limit/stop order support was introduced; existing DBs need this migration).
  const [[{ orderTypeCnt }]] = await dbUser.query(
    `SELECT COUNT(*) AS orderTypeCnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'order_type'`
  );
  if (!orderTypeCnt) {
    await dbUser.query(`ALTER TABLE orders
      ADD COLUMN order_type    ENUM('market','limit','stop') NOT NULL DEFAULT 'market' AFTER notes,
      ADD COLUMN trigger_price DECIMAL(18,4) DEFAULT NULL AFTER order_type,
      ADD COLUMN status        ENUM('pending','filled','cancelled') NOT NULL DEFAULT 'filled' AFTER trigger_price,
      ADD COLUMN realized_pnl  DECIMAL(18,4) DEFAULT NULL AFTER status,
      ADD COLUMN created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER realized_pnl`);
    await dbUser.query(`ALTER TABLE orders MODIFY COLUMN price DECIMAL(18,4) DEFAULT NULL`);
    await dbUser.query(`ALTER TABLE orders MODIFY COLUMN total DECIMAL(18,4) DEFAULT NULL`);
    await dbUser.query(`ALTER TABLE orders MODIFY COLUMN executed_at DATETIME DEFAULT NULL`);
    await dbUser.query(`ALTER TABLE orders ADD INDEX idx_orders_status (status)`);
    console.log("[polymart] Migration: added order_type/status/trigger_price columns to orders");
  }
}

async function waitForDb(retries = 30, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const [mc, uc] = await Promise.all([dbMarket.getConnection(), dbUser.getConnection()]);
      mc.release();
      uc.release();
      console.log("[polymart] Both database connections established.");
      return;
    } catch (err) {
      console.log(`[polymart] Waiting for databases... (attempt ${i}/${retries}): ${err.code} ${err.message}`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error("Could not connect to MySQL after multiple retries. Exiting.");
}

const PORT = parseInt(process.env.PORT || "4000");

waitForDb().then(() => applySchema()).then(() => applyMigrations()).then(async () => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[polymart] API + frontend running on port ${PORT}`);
  });
  const dbAdapter = createDbAdapter(dbMarket);
  const engine    = new PolyEngineTick({ db: dbAdapter, dbUser, dbMarket, intervalMs: 10000 });
  registerDbSubscribers(engine.data, dbMarket, dbUser);
  await engine.init();
  engine.start();
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});
