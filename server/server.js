import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pool from "./db.js";
import apiRouter from "./api.js";
import { startTickLoop } from "./tick.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use("/api/v1", apiRouter);

// Serve built frontend
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Apply only the CREATE TABLE statements idempotently.
// Skips DDL that requires elevated privileges (CREATE DATABASE, USE, CREATE EVENT).
async function applySchema() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  const statements = sql
    .split(";")
    .map(s => s.trim())
    .filter(s => {
      if (!s || s.startsWith("--")) return false;
      const upper = s.toUpperCase();
      // Skip anything that needs root/elevated privileges or switches DB context
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
    console.log("[polymart] Schema applied.");
  } catch (err) {
    console.error("[polymart] Schema error:", err.message);
    throw err;
  } finally {
    conn.release();
  }
}

// Wait for MySQL to accept connections before starting the server
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
