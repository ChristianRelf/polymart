import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import apiRouter from "./api.js";
import { startTickLoop } from "./tick.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

// API routes
app.use("/api/v1", apiRouter);

// Serve built frontend from dist/
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = parseInt(process.env.PORT || "3000");
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[polymart] API + frontend running on port ${PORT}`);
});

// Start simulation tick loop (every 10 seconds)
startTickLoop(10000);
