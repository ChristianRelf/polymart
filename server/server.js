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

// ── Global JSON error handler (must be before static/catch-all) ──────────────
// Catches next(err) from any middleware (e.g. requireAuth, clerkMiddleware)
// and returns JSON instead of Express's default HTML error page.
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  console.error(`[polymart] Unhandled error ${status} on ${req.method} ${req.path}:`, err.message);
  res.status(status).json({ error: err.message || 'Internal server error' });
});

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

waitForDb().then(() => applySchema()).then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[polymart] API + frontend running on port ${PORT}`);
  });
  startTickLoop(10000);
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});
