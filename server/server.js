import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";
import pool from "./db.js";
import apiRouter from "./api.js";
import accountRouter, { clerkWebhookHandler } from "./account-api.js";
import billingRouter, { stripeWebhookHandler } from "./billing-api.js";
import supportRouter from "./support-api.js";
import adminRouter from "./admin-api.js";
import communityRouter from "./community-api.js";
import communitiesRouter from "./communities-api.js";
import { startTickLoop } from "./tick.js";

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

// ── Clerk middleware (processes JWT on every request) ─────────────────────────
app.use(clerkMiddleware());

// ── Webhook routes (raw body - must come BEFORE express.json()) ───────────────
app.post("/api/v1/account/webhook", express.raw({ type: "application/json" }), clerkWebhookHandler);
app.post("/api/v1/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhookHandler);

// ── JSON body parser (applied after webhook routes) ───────────────────────────
app.use(express.json({ limit: "10kb" }));

// ── Public market API ─────────────────────────────────────────────────────────
app.use("/api/v1", apiRouter);

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
    const [[post]] = await pool.query(
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
<title>${escapeHtml(title)} — Polymart Community</title>
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
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Serve built frontend ──────────────────────────────────────────────────────
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ── Schema migration ──────────────────────────────────────────────────────────
async function applySchema() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const raw = fs.readFileSync(schemaPath, "utf8");

  const stripped = raw.replace(/--[^\n]*/g, "");

  const statements = stripped
    .split(";")
    .map(s => s.trim())
    .filter(s => {
      if (!s) return false;
      const upper = s.toUpperCase();
      if (upper.startsWith("CREATE DATABASE")) return false;
      if (upper.startsWith("USE ")) return false;
      if (upper.startsWith("DROP EVENT")) return false;
      if (upper.startsWith("CREATE EVENT")) return false;
      if (upper.startsWith("SET GLOBAL")) return false;
      return true;
    });

  const conn = await pool.getConnection();
  try {
    for (const stmt of statements) {
      await conn.query(stmt);
    }
    const [tables] = await conn.query("SHOW TABLES");
    console.log("[polymart] Schema applied. Tables:", tables.map(r => Object.values(r)[0]).join(", "));
  } catch (err) {
    console.error("[polymart] Schema error:", err.message);
    throw err;
  } finally {
    conn.release();
  }
}

async function applyMigrations() {
  // Add share_id column to community_posts if not present.
  const [[{ cnt }]] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'community_posts'
       AND COLUMN_NAME  = 'share_id'`
  );
  if (!cnt) {
    await pool.query(
      `ALTER TABLE community_posts ADD COLUMN share_id VARCHAR(18) NULL AFTER id`
    );
    await pool.query(
      `ALTER TABLE community_posts ADD UNIQUE INDEX idx_posts_share_id (share_id)`
    );
    console.log("[polymart] Migration: added share_id to community_posts");
  }

  // Backfill share_id for any existing posts that don't have one yet.
  // Uses MySQL's UUID() (hex, URL-safe) truncated to 18 chars.
  const [result] = await pool.query(
    `UPDATE community_posts
     SET share_id = SUBSTR(REPLACE(UUID(), '-', ''), 1, 18)
     WHERE share_id IS NULL`
  );
  if (result.affectedRows > 0) {
    console.log(`[polymart] Migration: backfilled share_id for ${result.affectedRows} post(s)`);
  }

  // Add parent_id column to community_comments if not present (thread support).
  const [[{ parentCnt }]] = await pool.query(
    `SELECT COUNT(*) AS parentCnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'community_comments'
       AND COLUMN_NAME  = 'parent_id'`
  );
  if (!parentCnt) {
    await pool.query(
      `ALTER TABLE community_comments ADD COLUMN parent_id INT NULL AFTER post_id`
    );
    await pool.query(
      `ALTER TABLE community_comments ADD KEY idx_comments_parent (parent_id)`
    );
    console.log("[polymart] Migration: added parent_id to community_comments");
  }

  // Add community_id to community_posts for sub-community scoping.
  const [[{ commIdCnt }]] = await pool.query(
    `SELECT COUNT(*) AS commIdCnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'community_posts'
       AND COLUMN_NAME  = 'community_id'`
  );
  if (!commIdCnt) {
    await pool.query(`ALTER TABLE community_posts ADD COLUMN community_id INT NULL AFTER id`);
    await pool.query(`ALTER TABLE community_posts ADD KEY idx_posts_community (community_id)`);
    console.log("[polymart] Migration: added community_id to community_posts");
  }

  // Add is_pinned to community_posts.
  const [[{ pinnedCnt }]] = await pool.query(
    `SELECT COUNT(*) AS pinnedCnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'community_posts'
       AND COLUMN_NAME  = 'is_pinned'`
  );
  if (!pinnedCnt) {
    await pool.query(`ALTER TABLE community_posts ADD COLUMN is_pinned TINYINT NOT NULL DEFAULT 0 AFTER post_type`);
    console.log("[polymart] Migration: added is_pinned to community_posts");
  }

  // Add is_removed to community_posts.
  const [[{ removedCnt }]] = await pool.query(
    `SELECT COUNT(*) AS removedCnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'community_posts'
       AND COLUMN_NAME  = 'is_removed'`
  );
  if (!removedCnt) {
    await pool.query(`ALTER TABLE community_posts ADD COLUMN is_removed TINYINT NOT NULL DEFAULT 0 AFTER is_pinned`);
    console.log("[polymart] Migration: added is_removed to community_posts");
  }

  // Add verification_type to communities if missing
  const [[{ verifCnt }]] = await pool.query(
    `SELECT COUNT(*) AS verifCnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'communities'
       AND COLUMN_NAME  = 'verification_type'`
  );
  if (!verifCnt) {
    await pool.query(`ALTER TABLE communities ADD COLUMN verification_type ENUM('none','verified','official') NOT NULL DEFAULT 'none'`);
    console.log("[polymart] Migration: added verification_type to communities");
  }

  // Create communities table if not present (schema.sql handles fresh installs;
  // this guard covers existing deployments before the table was in schema.sql).
  const [[{ commTableCnt }]] = await pool.query(
    `SELECT COUNT(*) AS commTableCnt FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'communities'`
  );
  if (!commTableCnt) {
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
      CREATE TABLE community_rules (
        id            INT           NOT NULL AUTO_INCREMENT,
        community_id  INT           NOT NULL,
        title         VARCHAR(128)  NOT NULL,
        description   TEXT,
        display_order INT           NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        KEY idx_rules_community (community_id)
      ) ENGINE=InnoDB`);
    await pool.query(`
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
}

async function waitForDb(retries = 30, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await pool.getConnection();
      conn.release();
      console.log("[polymart] Database connection established.");
      return;
    } catch (err) {
      console.log(`[polymart] Waiting for database... (attempt ${i}/${retries}): ${err.code} ${err.message}`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error("Could not connect to MySQL after multiple retries. Exiting.");
}

const PORT = parseInt(process.env.PORT || "4000");

waitForDb().then(() => applySchema()).then(() => applyMigrations()).then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[polymart] API + frontend running on port ${PORT}`);
  });
  startTickLoop(10000);
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});
