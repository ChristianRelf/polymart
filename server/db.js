import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || "127.0.0.1",
  port:     parseInt(process.env.DB_PORT || "3306"),
  user:     process.env.DB_USER     || "polymart",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME     || "polymart",
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 100,
  connectTimeout: 10000,
  // Return JSON columns as parsed JS objects/arrays
  typeCast(field, next) {
    if (field.type === "JSON") return JSON.parse(field.string());
    if (field.type === "BIT" && field.length === 1) {
      const bits = field.buffer();
      return bits === null ? null : bits[0] === 1;
    }
    return next();
  },
});

export default pool;
