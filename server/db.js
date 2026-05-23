import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

function makePool(host, port, database) {
  return mysql.createPool({
    host,
    port,
    user:     process.env.DB_USER     || "polymart",
    password: process.env.DB_PASSWORD || "",
    database,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 100,
    connectTimeout: 10000,
    typeCast(field, next) {
      if (field.type === "JSON") { const s = field.string("utf8"); return s == null ? null : JSON.parse(s); }
      if (field.type === "BIT" && field.length === 1) {
        const bits = field.buffer();
        return bits === null ? null : bits[0] === 1;
      }
      return next();
    },
  });
}

// Volume 1: market/stock/forex simulation state (high-churn)
export const dbMarket = makePool(
  process.env.DB_MARKET_HOST || process.env.DB_HOST || "127.0.0.1",
  parseInt(process.env.DB_MARKET_PORT || process.env.DB_PORT || "3306", 10),
  process.env.DB_MARKET_NAME || "polymart_market"
);

// Volume 2: user profiles, portfolios, community (persistent)
export const dbUser = makePool(
  process.env.DB_USER_HOST || process.env.DB_HOST || "127.0.0.1",
  parseInt(process.env.DB_USER_PORT || process.env.DB_PORT || "3306", 10),
  process.env.DB_USER_NAME || "polymart_user"
);
