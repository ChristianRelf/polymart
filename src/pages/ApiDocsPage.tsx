import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  TrendingUp, Puzzle, Webhook, Bot, BookOpen, ChevronRight,
  Circle, ArrowUpRight, Package, Zap, Brain, Rss, Coins,
} from "lucide-react"

const BASE = "https://polymart.co"

// ── Types ─────────────────────────────────────────────────────────────────────

type Param = { name: string; type: string; required: boolean; desc: string; example?: string }
type Field = { name: string; type: string; desc: string }

type Endpoint = {
  id: string
  method: "GET" | "POST" | "DELETE" | "PATCH"
  path: string
  summary: string
  desc: string
  params?: Param[]
  response: Field[]
  example: string
}

// ── Products / integrations registry ─────────────────────────────────────────
// Each product here shows up in the left nav. Add a new entry here when a
// new product or integration is launched - the page layout handles the rest.

type ProductStatus = "stable" | "beta" | "coming-soon"

type Product = {
  id: string
  label: string
  icon: React.ElementType
  status: ProductStatus
  version?: string
  desc: string
  baseUrl?: string
  endpoints?: Endpoint[]
  comingSoonNote?: string
}

const PRODUCTS: Product[] = [
  {
    id: "polymart-api",
    label: "Stocks API",
    icon: TrendingUp,
    status: "stable",
    version: "v1",
    desc: "Open REST API for the Polymart simulated stock market. No authentication required. Prices update every ~10 seconds via the persistent simulation engine. All endpoints are also available under /api/v1/stocks/ for namespace clarity.",
    baseUrl: BASE,
    endpoints: [
      {
        id: "getMarket",
        method: "GET",
        path: "/api/v1/getMarket",
        summary: "Global market snapshot",
        desc: "Returns the current state of the entire market - index value, fear & greed score, macro variables, gainer/loser counts, and top movers.",
        response: [
          { name: "index", type: "number", desc: "Current market index value" },
          { name: "indexChange", type: "number", desc: "Absolute change from previous tick" },
          { name: "indexChangePct", type: "number", desc: "Percentage change from previous tick" },
          { name: "fearGreed", type: "number", desc: "Fear & Greed score (0–100)" },
          { name: "fearGreedLabel", type: "string", desc: "Extreme Fear / Fear / Cautious / Neutral / Greed / High Greed / Extreme Greed" },
          { name: "interestRate", type: "number", desc: "Simulated interest rate (%)" },
          { name: "inflation", type: "number", desc: "Simulated inflation rate (%)" },
          { name: "gdpGrowth", type: "number", desc: "Simulated GDP growth (%)" },
          { name: "gainers", type: "number", desc: "Stocks with positive tick change" },
          { name: "losers", type: "number", desc: "Stocks with negative tick change" },
          { name: "unchanged", type: "number", desc: "Flat stocks this tick" },
          { name: "totalStocks", type: "number", desc: "Total stocks in the simulation" },
          { name: "topGainer", type: "{ ticker, pct }", desc: "Biggest gainer this tick" },
          { name: "topLoser", type: "{ ticker, pct }", desc: "Biggest loser this tick" },
          { name: "upStreak", type: "number", desc: "Consecutive index up-ticks" },
          { name: "downStreak", type: "number", desc: "Consecutive index down-ticks" },
          { name: "tickCount", type: "number", desc: "Total ticks since simulation started" },
          { name: "updatedAt", type: "ISO 8601", desc: "Timestamp of last tick" },
        ],
        example: `${BASE}/api/v1/getMarket`,
      },
      {
        id: "getStocks",
        method: "GET",
        path: "/api/v1/getStocks",
        summary: "All stocks - summary",
        desc: "Returns a map of all 132 stocks keyed by ticker symbol. Optionally filter by sector.",
        params: [
          { name: "sector", type: "string", required: false, desc: "Filter by sector key", example: "tech" },
        ],
        response: [
          { name: "<TICKER>", type: "object", desc: "Keyed by ticker symbol (e.g. APEX)" },
          { name: "  name", type: "string", desc: "Company name" },
          { name: "  sector", type: "string", desc: "Sector key" },
          { name: "  mcap", type: "string", desc: "large | mid | small" },
          { name: "  price", type: "number", desc: "Current price" },
          { name: "  change", type: "number", desc: "% change from previous tick" },
          { name: "  volume", type: "number", desc: "Cumulative simulated volume" },
          { name: "  rsi", type: "number", desc: "Relative Strength Index (0–100)" },
          { name: "  streak", type: "number", desc: "Consecutive up(+) or down(−) ticks" },
          { name: "  hi52w", type: "number", desc: "52-week simulated high" },
          { name: "  lo52w", type: "number", desc: "52-week simulated low" },
          { name: "  volatility", type: "number", desc: "Base volatility coefficient" },
          { name: "  trend", type: "number", desc: "Directional trend bias" },
        ],
        example: `${BASE}/api/v1/getStocks`,
      },
      {
        id: "getStock",
        method: "GET",
        path: "/api/v1/getStock",
        summary: "Single stock - full detail",
        desc: "Full data for one stock including price history (up to 400 data points) and sector peers. Also available at /api/v1/stocks/getStock.",
        params: [
          { name: "ticker", type: "string", required: true, desc: "Ticker symbol (case-insensitive)", example: "APEX" },
        ],
        response: [
          { name: "ticker", type: "string", desc: "Ticker symbol" },
          { name: "name", type: "string", desc: "Company name" },
          { name: "sector", type: "string", desc: "Sector key" },
          { name: "mcap", type: "string", desc: "Market cap tier" },
          { name: "price", type: "number", desc: "Current price" },
          { name: "previousPrice", type: "number", desc: "Price at previous tick" },
          { name: "openPrice", type: "number", desc: "Price at simulation open" },
          { name: "change", type: "number", desc: "% change tick-over-tick" },
          { name: "changeSinceOpen", type: "number", desc: "% change from open price" },
          { name: "high52w", type: "number", desc: "52-week high" },
          { name: "low52w", type: "number", desc: "52-week low" },
          { name: "allTimeHigh", type: "number", desc: "All-time simulated high" },
          { name: "volume", type: "number", desc: "Cumulative volume" },
          { name: "rsi", type: "number", desc: "RSI (0–100)" },
          { name: "momentum", type: "number", desc: "Price momentum factor" },
          { name: "streak", type: "number", desc: "Consecutive tick direction" },
          { name: "insiderBias", type: "number", desc: "Hidden insider pressure (−0.01 to 0.01)" },
          { name: "volatility", type: "number", desc: "Volatility coefficient" },
          { name: "trend", type: "number", desc: "Directional trend bias" },
          { name: "history", type: "number[]", desc: "Price history array (up to 400 entries, oldest first)" },
          { name: "sectorPeers", type: "string[]", desc: "Tickers of other stocks in the same sector" },
          { name: "updatedAt", type: "ISO 8601", desc: "Timestamp of last update" },
        ],
        example: `${BASE}/api/v1/getStock?ticker=APEX`,
      },
      {
        id: "getSectors",
        method: "GET",
        path: "/api/v1/getSectors",
        summary: "All sectors - summary",
        desc: "Returns all 20 sectors with average price change, momentum, and news impact score.",
        response: [
          { name: "<sector_key>", type: "object", desc: "Keyed by sector key (e.g. tech, crypto)" },
          { name: "  label", type: "string", desc: "Human-readable name" },
          { name: "  icon", type: "string", desc: "Emoji icon" },
          { name: "  avgChange", type: "number", desc: "Average % change across sector stocks" },
          { name: "  newsStack", type: "number", desc: "Accumulated news impact (decays over time)" },
          { name: "  momentum", type: "number", desc: "Sector price momentum" },
          { name: "  tickers", type: "string[]", desc: "All ticker symbols in this sector" },
          { name: "  tickerCount", type: "number", desc: "Number of stocks in sector" },
        ],
        example: `${BASE}/api/v1/getSectors`,
      },
      {
        id: "getSector",
        method: "GET",
        path: "/api/v1/getSector",
        summary: "Single sector - full detail",
        desc: "Full data for one sector including constituent stocks with current prices.",
        params: [
          { name: "sector", type: "string", required: true, desc: "Sector key", example: "crypto" },
        ],
        response: [
          { name: "key", type: "string", desc: "Sector key" },
          { name: "label", type: "string", desc: "Sector name" },
          { name: "icon", type: "string", desc: "Emoji icon" },
          { name: "avgChange", type: "number", desc: "Average % change" },
          { name: "newsStack", type: "number", desc: "News impact score" },
          { name: "momentum", type: "number", desc: "Sector momentum" },
          { name: "stocks", type: "object[]", desc: "{ ticker, name, price, change, volume, rsi }" },
          { name: "updatedAt", type: "ISO 8601", desc: "Timestamp of last update" },
        ],
        example: `${BASE}/api/v1/getSector?sector=crypto`,
      },
      {
        id: "getEvents",
        method: "GET",
        path: "/api/v1/getEvents",
        summary: "Recent market events",
        desc: "Returns the most recent market events - flash crashes, FDA approvals, meme frenzies, sector booms, and more.",
        params: [
          { name: "limit", type: "number", required: false, desc: "Max events (1–30, default 10)", example: "10" },
          { name: "sector", type: "string", required: false, desc: "Filter to events for a specific sector", example: "meme" },
        ],
        response: [
          { name: "[].id", type: "uuid", desc: "Unique event ID" },
          { name: "[].text", type: "string", desc: "Event description" },
          { name: "[].effect", type: "number", desc: "Price effect magnitude (negative = bearish)" },
          { name: "[].sector", type: "string | null", desc: "Affected sector, or null for market-wide" },
          { name: "[].weight", type: "number", desc: "Impact weight (1–3)" },
          { name: "[].firedAt", type: "ISO 8601", desc: "When the event fired" },
        ],
        example: `${BASE}/api/v1/getEvents?limit=5`,
      },
      {
        id: "getTopMovers",
        method: "GET",
        path: "/api/v1/getTopMovers",
        summary: "Top gainers & losers",
        desc: "Returns the top N gainers and top N losers by tick-over-tick % change.",
        params: [
          { name: "limit", type: "number", required: false, desc: "Stocks per list (1–20, default 5)", example: "5" },
        ],
        response: [
          { name: "gainers", type: "object[]", desc: "{ ticker, name, sector, price, change, volume, rsi }" },
          { name: "losers", type: "object[]", desc: "Same shape, ordered worst-to-best" },
        ],
        example: `${BASE}/api/v1/getTopMovers?limit=5`,
      },
      {
        id: "getLeaderboard",
        method: "GET",
        path: "/api/v1/getLeaderboard",
        summary: "Ranked stock leaderboard",
        desc: "Returns all stocks ranked by any numeric field. Ideal for Discord bot leaderboard commands.",
        params: [
          { name: "by", type: "string", required: false, desc: "Sort field: change | price | volume | rsi | ath | streak (default: change)", example: "volume" },
          { name: "dir", type: "string", required: false, desc: "asc | desc (default: desc)", example: "desc" },
          { name: "limit", type: "number", required: false, desc: "Max results (1–132, default 10)", example: "10" },
        ],
        response: [
          { name: "sortedBy", type: "string", desc: "Field used for sorting" },
          { name: "direction", type: "string", desc: "asc or desc" },
          { name: "count", type: "number", desc: "Number of results" },
          { name: "stocks", type: "object[]", desc: "{ ticker, name, sector, mcap, price, change, volume, rsi, ath, streak }" },
        ],
        example: `${BASE}/api/v1/getLeaderboard?by=change&limit=10`,
      },
      {
        id: "getMacro",
        method: "GET",
        path: "/api/v1/getMacro",
        summary: "Macroeconomic variables",
        desc: "Returns the current macro environment. These variables drift each tick and influence all stock prices and sectors.",
        response: [
          { name: "interestRate", type: "number", desc: "Interest rate (%)" },
          { name: "inflation", type: "number", desc: "Inflation rate (%)" },
          { name: "gdpGrowth", type: "number", desc: "GDP growth rate (%)" },
          { name: "fearGreed", type: "number", desc: "Fear & Greed score (0–100)" },
          { name: "fearGreedLabel", type: "string", desc: "Sentiment label" },
          { name: "crashCooldown", type: "number", desc: "Ticks until next crash is possible (0 = ready)" },
          { name: "boomCooldown", type: "number", desc: "Ticks until next boom is possible (0 = ready)" },
          { name: "updatedAt", type: "ISO 8601", desc: "Timestamp of last update" },
        ],
        example: `${BASE}/api/v1/getMacro`,
      },
      {
        id: "getHistory",
        method: "GET",
        path: "/api/v1/getHistory",
        summary: "Price history for a stock",
        desc: "Returns raw price history for a stock. Up to 400 data points, each representing one simulation tick (10 seconds).",
        params: [
          { name: "ticker", type: "string", required: true, desc: "Ticker symbol", example: "VOID" },
          { name: "limit", type: "number", required: false, desc: "Data points to return (1–400, default 100)", example: "100" },
        ],
        response: [
          { name: "ticker", type: "string", desc: "Ticker symbol" },
          { name: "name", type: "string", desc: "Company name" },
          { name: "count", type: "number", desc: "Number of data points returned" },
          { name: "history", type: "number[]", desc: "Ordered price array, oldest first" },
          { name: "updatedAt", type: "ISO 8601", desc: "Timestamp of last update" },
        ],
        example: `${BASE}/api/v1/getHistory?ticker=VOID&limit=50`,
      },
      {
        id: "search",
        method: "GET",
        path: "/api/v1/search",
        summary: "Search stocks",
        desc: "Full-text search across ticker symbols, company names, and sector keys.",
        params: [
          { name: "q", type: "string", required: true, desc: "Search query (matches ticker, name, or sector)", example: "moon" },
        ],
        response: [
          { name: "query", type: "string", desc: "The search query" },
          { name: "count", type: "number", desc: "Number of results" },
          { name: "results", type: "object[]", desc: "{ ticker, name, sector, price, change }" },
        ],
        example: `${BASE}/api/v1/search?q=moon`,
      },
      {
        id: "getHealth",
        method: "GET",
        path: "/api/v1/getHealth",
        summary: "API health check",
        desc: "Check if the simulation is running and how stale the data is. Use this to monitor your bot's data freshness.",
        response: [
          { name: "status", type: "string", desc: "ok | uninitialised" },
          { name: "tickCount", type: "number", desc: "Total ticks completed" },
          { name: "secondsSinceLastTick", type: "number | null", desc: "Seconds since last tick wrote to DB" },
          { name: "stale", type: "boolean", desc: "True if last tick was more than 30 seconds ago" },
          { name: "totalStocks", type: "number", desc: "Total stocks defined" },
          { name: "totalSectors", type: "number", desc: "Total sectors defined" },
          { name: "updatedAt", type: "ISO 8601 | null", desc: "Timestamp of last successful tick" },
        ],
        example: `${BASE}/api/v1/getHealth`,
      },
      {
        id: "sims",
        method: "GET",
        path: "/api/v1/sims",
        summary: "Available simulations",
        desc: "Returns all simulation types (stocks, crypto, forex…) with their live status and metadata. Use this as a discovery endpoint before building integrations.",
        response: [
          { name: "[].id",          type: "string",  desc: "Simulation ID: stocks | crypto | forex" },
          { name: "[].label",       type: "string",  desc: "Human-readable name" },
          { name: "[].icon",        type: "string",  desc: "Emoji icon" },
          { name: "[].status",      type: "string",  desc: "live | coming_soon" },
          { name: "[].description", type: "string",  desc: "Short description" },
          { name: "[].assets",      type: "number?", desc: "Number of tradeable assets (live sims only)" },
          { name: "[].sectors",     type: "number?", desc: "Number of sectors (live sims only)" },
          { name: "[].tickInterval",type: "number?", desc: "Seconds between price updates (live sims only)" },
        ],
        example: `${BASE}/api/v1/sims`,
      },
      {
        id: "info",
        method: "GET",
        path: "/api/v1/info",
        summary: "Company info page data",
        desc: "Full company profile, live market snapshot, analyst consensus rating, and dynamically generated news for any ticker. Powers the /market/{ticker}/info pages.",
        params: [
          { name: "ticker", type: "string", required: true, desc: "Ticker symbol (case-insensitive)", example: "APEX" },
        ],
        response: [
          { name: "ticker",        type: "string",   desc: "Ticker symbol" },
          { name: "companyName",   type: "string",   desc: "Company name" },
          { name: "description",   type: "string",   desc: "Company description" },
          { name: "founded",       type: "number",   desc: "Year founded" },
          { name: "hq",            type: "string",   desc: "Headquarters location" },
          { name: "ceo",           type: "string",   desc: "CEO name" },
          { name: "employees",     type: "number",   desc: "Approximate employee count" },
          { name: "exchange",      type: "string",   desc: "NYSE or NASDAQ" },
          { name: "industry",      type: "string",   desc: "Industry label" },
          { name: "sectorKey",     type: "string",   desc: "Sector key" },
          { name: "sectorLabel",   type: "string",   desc: "Sector display name" },
          { name: "sectorIcon",    type: "string",   desc: "Sector emoji" },
          { name: "peers",         type: "string[]", desc: "Tickers of sector peers" },
          { name: "market",        type: "object",   desc: "Live snapshot: price, change, rsi, sma20, sma50, bbUpper, bbLower, atr, beta, streak, etc." },
          { name: "macro",         type: "object",   desc: "Current macro: fearGreed, interestRate, inflation, vix" },
          { name: "analystRating", type: "object",   desc: "{ rating, score, analystCount } - derived from RSI and price trend" },
          { name: "news",          type: "object[]", desc: "3–5 contextual news items: { headline, sentiment, source, publishedAt }" },
        ],
        example: `${BASE}/api/v1/info?ticker=APEX`,
      },
    ],
  },

  {
    id: "forex-api",
    label: "Forex API",
    icon: ArrowUpRight,
    status: "stable" as ProductStatus,
    version: "v1",
    desc: "Open REST API for the Polymart simulated forex market. 40 currency pairs (major, minor, exotic) with live rates, spreads, and technical indicators. Prices update every ~10 seconds.",
    baseUrl: BASE,
    endpoints: [
      {
        id: "forex-getPairs",
        method: "GET",
        path: "/api/v1/forex/getPairs",
        summary: "All currency pairs",
        desc: "Returns all 28 simulated currency pairs keyed by pair symbol (e.g. EURUSD). Includes price, change, bid/ask spread in pips, and all technical indicators.",
        response: [
          { name: "<PAIR>", type: "object", desc: "Keyed by pair symbol (e.g. EURUSD)" },
          { name: "  pair", type: "string", desc: "Pair symbol" },
          { name: "  base / quote", type: "string", desc: "Base and quote currency codes" },
          { name: "  category", type: "string", desc: "major | minor | exotic" },
          { name: "  baseName / quoteName", type: "string", desc: "Full currency names" },
          { name: "  baseFlag / quoteFlag", type: "string", desc: "Country/region emoji flags" },
          { name: "  price", type: "number", desc: "Current exchange rate" },
          { name: "  prevPrice", type: "number", desc: "Rate at previous tick" },
          { name: "  change", type: "number", desc: "Absolute change" },
          { name: "  changePct", type: "number", desc: "Percentage change" },
          { name: "  bid / ask", type: "number", desc: "Bid and ask rates" },
          { name: "  spread", type: "number", desc: "Spread in rate units" },
          { name: "  spreadPips", type: "string", desc: "Spread in pips (formatted)" },
          { name: "  hi52w / lo52w", type: "number", desc: "52-week simulated high/low" },
          { name: "  rsi", type: "number", desc: "RSI (0–100)" },
          { name: "  macd / macdSignal / macdHist", type: "number", desc: "MACD components" },
          { name: "  bbUpper / bbMiddle / bbLower / bbBw", type: "number", desc: "Bollinger Band values" },
          { name: "  sma20 / sma50", type: "number", desc: "Simple moving averages" },
          { name: "  atr", type: "number", desc: "Average True Range" },
          { name: "  pipSize", type: "number", desc: "Size of one pip (0.0001 or 0.01 for JPY pairs)" },
          { name: "  decimals", type: "number", desc: "Display decimal places (4 or 2)" },
          { name: "  updatedAt", type: "ISO 8601", desc: "Timestamp of last tick" },
        ],
        example: `${BASE}/api/v1/forex/getPairs`,
      },
      {
        id: "forex-getPair",
        method: "GET",
        path: "/api/v1/forex/getPair",
        summary: "Single pair - full detail",
        desc: "Full data for one currency pair including description, economic drivers, fact sheet, price history, and OHLCV candles.",
        params: [
          { name: "pair", type: "string", required: true, desc: "Pair symbol (case-insensitive)", example: "EURUSD" },
        ],
        response: [
          { name: "...all getPairs fields", type: "object", desc: "All fields from getPairs plus:" },
          { name: "description", type: "string", desc: "Educational description of the currency pair" },
          { name: "economicDrivers", type: "string[]", desc: "Key drivers affecting this pair" },
          { name: "factSheet", type: "object", desc: "{ dailyVolume, avgSpread, tradingHours, ... }" },
          { name: "history", type: "number[]", desc: "Price history array (up to 400 entries, oldest first)" },
          { name: "candles", type: "object[]", desc: "OHLCV candle array: { o, h, l, c, v, t }" },
        ],
        example: `${BASE}/api/v1/forex/getPair?pair=EURUSD`,
      },
      {
        id: "forex-getTopMovers",
        method: "GET",
        path: "/api/v1/forex/getTopMovers",
        summary: "Top gaining and losing pairs",
        desc: "Returns the top N gainers and top N losers by tick-over-tick % change across all 28 pairs.",
        params: [
          { name: "limit", type: "number", required: false, desc: "Pairs per list (1–14, default 5)", example: "5" },
        ],
        response: [
          { name: "gainers", type: "object[]", desc: "Top gaining pairs: { pair, price, changePct, category, baseFlag, quoteFlag }" },
          { name: "losers", type: "object[]", desc: "Top losing pairs, same shape ordered worst-to-best" },
        ],
        example: `${BASE}/api/v1/forex/getTopMovers?limit=5`,
      },
      {
        id: "forex-getHistory",
        method: "GET",
        path: "/api/v1/forex/getHistory",
        summary: "Rate history for a pair",
        desc: "Returns raw rate history for a currency pair. Up to 400 data points, each representing one simulation tick (10 seconds).",
        params: [
          { name: "pair", type: "string", required: true, desc: "Pair symbol", example: "GBPUSD" },
          { name: "limit", type: "number", required: false, desc: "Data points to return (1–400, default 100)", example: "100" },
        ],
        response: [
          { name: "pair", type: "string", desc: "Pair symbol" },
          { name: "count", type: "number", desc: "Number of data points returned" },
          { name: "history", type: "number[]", desc: "Ordered rate array, oldest first" },
          { name: "updatedAt", type: "ISO 8601", desc: "Timestamp of last update" },
        ],
        example: `${BASE}/api/v1/forex/getHistory?pair=GBPUSD&limit=100`,
      },
      {
        id: "forex-search",
        method: "GET",
        path: "/api/v1/forex/search",
        summary: "Search currency pairs",
        desc: "Search across pair symbols, currency names, and country names.",
        params: [
          { name: "q", type: "string", required: true, desc: "Search query (matches pair symbol, currency name, or country)", example: "euro" },
        ],
        response: [
          { name: "query", type: "string", desc: "The search query" },
          { name: "count", type: "number", desc: "Number of results" },
          { name: "results", type: "object[]", desc: "Matching pairs: { pair, baseName, quoteName, price, changePct, category }" },
        ],
        example: `${BASE}/api/v1/forex/search?q=euro`,
      },
      {
        id: "forex-getMarketOverview",
        method: "GET",
        path: "/api/v1/forex/getMarketOverview",
        summary: "Forex market overview",
        desc: "Returns a synthetic USD strength index, strongest/weakest currencies, active trading sessions, and bullish/bearish pair counts across the entire forex market.",
        response: [
          { name: "dollarIndex", type: "number", desc: "Synthetic USD strength (avg of USD pairs; positive = USD rising)" },
          { name: "dollarIndexLabel", type: "string", desc: "USD Strengthening | USD Weakening | USD Neutral" },
          { name: "totalPairs", type: "number", desc: "Total pairs in simulation" },
          { name: "bullishPairs", type: "number", desc: "Pairs with positive tick change" },
          { name: "bearishPairs", type: "number", desc: "Pairs with negative tick change" },
          { name: "topGainer", type: "{ pair, changePct }", desc: "Biggest gaining pair this tick" },
          { name: "topLoser", type: "{ pair, changePct }", desc: "Biggest losing pair this tick" },
          { name: "avgVolatility", type: "number", desc: "Average ATR across all pairs" },
          { name: "currencyStrength", type: "object[]", desc: "{ code, flag, strength } sorted strongest-to-weakest" },
          { name: "sessions", type: "object", desc: "Sydney/Tokyo/London/NewYork session status with active pairs" },
          { name: "updatedAt", type: "ISO 8601", desc: "Timestamp of last tick" },
        ],
        example: `${BASE}/api/v1/forex/getMarketOverview`,
      },
      {
        id: "forex-getLeaderboard",
        method: "GET",
        path: "/api/v1/forex/getLeaderboard",
        summary: "Ranked pairs leaderboard",
        desc: "Returns all pairs ranked by a chosen metric - change, volume, RSI, ATR, or Bollinger Bandwidth. Optionally filter by category.",
        params: [
          { name: "by", type: "string", required: false, desc: "Sort field: changePct | volume | rsi | atr | spread | bbBw (default: changePct)", example: "atr" },
          { name: "dir", type: "string", required: false, desc: "asc | desc (default: desc)", example: "desc" },
          { name: "limit", type: "number", required: false, desc: "Max pairs to return (1–40, default 10)", example: "10" },
          { name: "category", type: "string", required: false, desc: "Filter: major | minor | exotic", example: "major" },
        ],
        response: [
          { name: "sortedBy", type: "string", desc: "Sort field used" },
          { name: "direction", type: "string", desc: "asc or desc" },
          { name: "category", type: "string", desc: "Category filter applied (or 'all')" },
          { name: "count", type: "number", desc: "Total pairs before limit" },
          { name: "pairs", type: "object[]", desc: "All getPairs fields for each ranked pair" },
        ],
        example: `${BASE}/api/v1/forex/getLeaderboard?by=changePct&limit=10`,
      },
      {
        id: "forex-getCandles",
        method: "GET",
        path: "/api/v1/forex/getCandles",
        summary: "OHLCV candles for a pair",
        desc: "Returns pre-computed OHLCV candlestick data for a currency pair. Each candle spans 18 simulation ticks (~3 minutes). Up to 200 candles returned.",
        params: [
          { name: "pair", type: "string", required: true, desc: "Pair symbol", example: "EURUSD" },
          { name: "limit", type: "number", required: false, desc: "Number of candles (1–200, default 48)", example: "48" },
        ],
        response: [
          { name: "pair", type: "string", desc: "Pair symbol" },
          { name: "decimals", type: "number", desc: "Display decimal places for this pair" },
          { name: "pipSize", type: "number", desc: "Size of one pip" },
          { name: "count", type: "number", desc: "Number of candles returned" },
          { name: "candles", type: "object[]", desc: "{ o, h, l, c, v, t } - open/high/low/close/volume/timestamp" },
        ],
        example: `${BASE}/api/v1/forex/getCandles?pair=EURUSD&limit=48`,
      },
      {
        id: "forex-getCorrelations",
        method: "GET",
        path: "/api/v1/forex/getCorrelations",
        summary: "Pair correlation matrix",
        desc: "Computes Pearson correlations between return series for up to 20 pairs. Defaults to all major pairs. Useful for building diversified portfolios or identifying hedges.",
        params: [
          { name: "pairs", type: "string", required: false, desc: "Comma-separated pair symbols (default: all majors, max 20)", example: "EURUSD,GBPUSD,USDJPY" },
          { name: "window", type: "number", required: false, desc: "Number of ticks used for correlation (1–200, default 60)", example: "60" },
        ],
        response: [
          { name: "pairs", type: "string[]", desc: "Ordered list of pair symbols in the matrix" },
          { name: "window", type: "number", desc: "Tick window used for computation" },
          { name: "matrix", type: "object", desc: "Nested object: matrix[A][B] = Pearson r (-1 to 1). matrix[A][A] = 1.0" },
        ],
        example: `${BASE}/api/v1/forex/getCorrelations?pairs=EURUSD,GBPUSD,USDJPY,AUDUSD`,
      },
      {
        id: "forex-getSessions",
        method: "GET",
        path: "/api/v1/forex/getSessions",
        summary: "Live forex session status",
        desc: "Returns current status of all four major forex trading sessions (Sydney, Tokyo, London, New York) based on current UTC time, with the most active pairs for each session.",
        response: [
          { name: "utcTime", type: "string", desc: "Current server UTC time (HH:MM)" },
          { name: "openSessions", type: "string[]", desc: "Names of currently open sessions" },
          { name: "overlap", type: "boolean", desc: "True when two or more sessions are simultaneously open" },
          { name: "mostActiveSession", type: "string", desc: "Session with highest activity right now" },
          { name: "sessions", type: "object[]", desc: "{ id, label, timezone, utcOpen, utcClose, open: boolean, pairs: string[] }" },
        ],
        example: `${BASE}/api/v1/forex/getSessions`,
      },
      {
        id: "forex-getCurrencies",
        method: "GET",
        path: "/api/v1/forex/getCurrencies",
        summary: "Per-currency strength index",
        desc: "Ranks individual currencies by net strength, computed as the average movement across all pairs involving that currency. Positive strength = currency is appreciating overall.",
        response: [
          { name: "count", type: "number", desc: "Number of unique currencies" },
          { name: "currencies", type: "object[]", desc: "{ code, country, flag, strength, pairsCount } - sorted strongest-to-weakest" },
        ],
        example: `${BASE}/api/v1/forex/getCurrencies`,
      },
    ],
  },

  {
    id: "crypto-api",
    label: "Crypto API",
    icon: Coins,
    status: "stable" as ProductStatus,
    version: "v1",
    desc: "Open REST API for the Polymart simulated cryptocurrency market. 132 fictional coins across 12 categories (Layer 1, DeFi, Meme, GameFi, AI, and more) with 24/7 simulated trading, BTC dominance correlation, whale events, and stablecoin mean-reversion. Prices update every ~10 seconds.",
    baseUrl: BASE,
    endpoints: [
      {
        id: "crypto-getCoins",
        method: "GET",
        path: "/api/v1/crypto/getCoins",
        summary: "All coins - summary",
        desc: "Returns all 132 simulated coins keyed by symbol. Includes price, 24h change, market cap, dominance, volume, and all technical indicators. Optionally filter by category.",
        params: [
          { name: "category", type: "string", required: false, desc: "Filter by category key", example: "defi" },
        ],
        response: [
          { name: "<SYMBOL>", type: "object", desc: "Keyed by symbol (e.g. SOLX)" },
          { name: "  symbol", type: "string", desc: "Coin symbol" },
          { name: "  name", type: "string", desc: "Coin name" },
          { name: "  category", type: "string", desc: "Category key (l1 | l2 | defi | meme | gamefi | ai | privacy | infra | oracle | exchange | metaverse | stablecoin)" },
          { name: "  mcapTier", type: "string", desc: "large | mid | small" },
          { name: "  blockchain / consensus", type: "string", desc: "Underlying chain and consensus mechanism" },
          { name: "  price", type: "number", desc: "Current price (USD)" },
          { name: "  prevPrice", type: "number", desc: "Price at previous tick" },
          { name: "  changePct", type: "number", desc: "% change from previous tick" },
          { name: "  bid / ask / spreadPct", type: "number", desc: "Simulated order book spread" },
          { name: "  hi24h / lo24h", type: "number", desc: "24-hour simulated high/low (resets every 1440 ticks)" },
          { name: "  hi52w / lo52w / ath", type: "number", desc: "52-week high/low and all-time high" },
          { name: "  marketCap", type: "number", desc: "Market capitalisation: price × circulating supply" },
          { name: "  dominance", type: "number", desc: "% of total simulated crypto market cap" },
          { name: "  volume / buyVolume / sellVolume", type: "number", desc: "Cumulative volume split by direction" },
          { name: "  rsi", type: "number", desc: "RSI (0–100)" },
          { name: "  macd / macdSignal / macdHist", type: "number", desc: "MACD components" },
          { name: "  stochK / stochD", type: "number", desc: "Stochastic oscillator %K and %D" },
          { name: "  cci", type: "number", desc: "Commodity Channel Index" },
          { name: "  bbUpper / bbMiddle / bbLower / bbBw", type: "number", desc: "Bollinger Band values and bandwidth" },
          { name: "  sma20 / sma50 / ema12 / ema26", type: "number", desc: "Moving averages" },
          { name: "  atr", type: "number", desc: "Average True Range" },
          { name: "  streak", type: "number", desc: "Consecutive up(+) or down(−) ticks" },
          { name: "  pctFrom52wHigh / pctFromAth", type: "number", desc: "Distance from key price levels (%)" },
          { name: "  updatedAt", type: "ISO 8601", desc: "Timestamp of last tick" },
        ],
        example: `${BASE}/api/v1/crypto/getCoins`,
      },
      {
        id: "crypto-getCoin",
        method: "GET",
        path: "/api/v1/crypto/getCoin",
        summary: "Single coin - full detail",
        desc: "Full data for one coin including price history (up to 400 data points), OHLCV candles, description, supply figures, and category peers.",
        params: [
          { name: "symbol", type: "string", required: true, desc: "Coin symbol (case-insensitive)", example: "SOLX" },
        ],
        response: [
          { name: "...all getCoins fields", type: "object", desc: "All fields from getCoins plus:" },
          { name: "description", type: "string", desc: "Short description of the coin's purpose" },
          { name: "circulatingSupply / totalSupply", type: "number", desc: "Token supply figures" },
          { name: "history", type: "number[]", desc: "Price history (up to 400 entries, oldest first)" },
          { name: "candles", type: "object[]", desc: "OHLCV candles: { o, h, l, c, v, t } - each candle spans 18 ticks (~3 min)" },
          { name: "categoryPeers", type: "string[]", desc: "Symbols of other coins in the same category" },
        ],
        example: `${BASE}/api/v1/crypto/getCoin?symbol=SOLX`,
      },
      {
        id: "crypto-getCategories",
        method: "GET",
        path: "/api/v1/crypto/getCategories",
        summary: "All categories - summary",
        desc: "Returns all 12 coin categories with aggregate stats: average change, RSI, dominance, and news impact score.",
        response: [
          { name: "<category_key>", type: "object", desc: "Keyed by category key (e.g. defi)" },
          { name: "  label", type: "string", desc: "Human-readable category name" },
          { name: "  icon", type: "string", desc: "Emoji icon" },
          { name: "  avgChange", type: "number", desc: "Average % change across category coins" },
          { name: "  avgRsi", type: "number", desc: "Average RSI across category coins" },
          { name: "  avgDominance", type: "number", desc: "Average dominance % across category coins" },
          { name: "  newsStack", type: "number", desc: "Accumulated news/event impact (decays over time)" },
          { name: "  momentum", type: "number", desc: "Category price momentum" },
          { name: "  symbols", type: "string[]", desc: "All coin symbols in this category" },
          { name: "  coinCount", type: "number", desc: "Number of coins in category" },
        ],
        example: `${BASE}/api/v1/crypto/getCategories`,
      },
      {
        id: "crypto-getCategory",
        method: "GET",
        path: "/api/v1/crypto/getCategory",
        summary: "Single category - full detail",
        desc: "Full data for one category including all constituent coins with current prices and indicators.",
        params: [
          { name: "category", type: "string", required: true, desc: "Category key", example: "defi" },
        ],
        response: [
          { name: "...all getCategories fields", type: "object", desc: "All fields from getCategories plus:" },
          { name: "coins", type: "object[]", desc: "All coins in category with full summary data" },
        ],
        example: `${BASE}/api/v1/crypto/getCategory?category=defi`,
      },
      {
        id: "crypto-getMarketOverview",
        method: "GET",
        path: "/api/v1/crypto/getMarketOverview",
        summary: "Crypto market overview",
        desc: "Returns total crypto market cap, Bitcoin dominance (BTCX), 24h volume, top gainer/loser, and bullish/bearish coin counts.",
        response: [
          { name: "totalMarketCap", type: "number", desc: "Sum of all coin market caps (USD)" },
          { name: "btcDominance", type: "number", desc: "BTCX market cap as % of total" },
          { name: "totalVolume24h", type: "number", desc: "24-hour total volume across all coins" },
          { name: "bullishCoins", type: "number", desc: "Coins with positive tick change" },
          { name: "bearishCoins", type: "number", desc: "Coins with negative tick change" },
          { name: "topGainer", type: "{ symbol, changePct }", desc: "Biggest gaining coin this tick" },
          { name: "topLoser", type: "{ symbol, changePct }", desc: "Biggest losing coin this tick" },
          { name: "updatedAt", type: "ISO 8601", desc: "Timestamp of last tick" },
        ],
        example: `${BASE}/api/v1/crypto/getMarketOverview`,
      },
      {
        id: "crypto-getTopMovers",
        method: "GET",
        path: "/api/v1/crypto/getTopMovers",
        summary: "Top gaining and losing coins",
        desc: "Returns the top N gainers and top N losers by tick-over-tick % change across all 132 coins.",
        params: [
          { name: "limit", type: "number", required: false, desc: "Coins per list (1–20, default 5)", example: "5" },
        ],
        response: [
          { name: "gainers", type: "object[]", desc: "{ symbol, name, category, price, changePct, marketCap }" },
          { name: "losers", type: "object[]", desc: "Same shape, ordered worst-to-best" },
        ],
        example: `${BASE}/api/v1/crypto/getTopMovers?limit=5`,
      },
      {
        id: "crypto-getHistory",
        method: "GET",
        path: "/api/v1/crypto/getHistory",
        summary: "Price history for a coin",
        desc: "Returns raw price history and OHLCV candles for one coin. Up to 400 data points, each representing one simulation tick (10 seconds).",
        params: [
          { name: "symbol", type: "string", required: true, desc: "Coin symbol", example: "DOGO" },
          { name: "limit", type: "number", required: false, desc: "Data points to return (1–400, default 100)", example: "100" },
        ],
        response: [
          { name: "symbol", type: "string", desc: "Coin symbol" },
          { name: "name", type: "string", desc: "Coin name" },
          { name: "count", type: "number", desc: "Number of data points returned" },
          { name: "history", type: "number[]", desc: "Ordered price array, oldest first" },
          { name: "candles", type: "object[]", desc: "OHLCV candles: { o, h, l, c, v, t }" },
          { name: "updatedAt", type: "ISO 8601", desc: "Timestamp of last update" },
        ],
        example: `${BASE}/api/v1/crypto/getHistory?symbol=DOGO&limit=100`,
      },
      {
        id: "crypto-search",
        method: "GET",
        path: "/api/v1/crypto/search",
        summary: "Search coins",
        desc: "Full-text search across coin symbols, names, blockchain, and category keys.",
        params: [
          { name: "q", type: "string", required: true, desc: "Search query (matches symbol, name, blockchain, or category)", example: "layer" },
        ],
        response: [
          { name: "query", type: "string", desc: "The search query" },
          { name: "count", type: "number", desc: "Number of results" },
          { name: "results", type: "object[]", desc: "{ symbol, name, category, price, changePct, marketCap }" },
        ],
        example: `${BASE}/api/v1/crypto/search?q=layer`,
      },
      {
        id: "crypto-getLeaderboard",
        method: "GET",
        path: "/api/v1/crypto/getLeaderboard",
        summary: "Ranked coin leaderboard",
        desc: "Returns coins ranked by any numeric field. Optionally filter by category. Ideal for Discord bot leaderboard commands.",
        params: [
          { name: "by", type: "string", required: false, desc: "Sort field: changePct | marketCap | dominance | volume | rsi | atr | bbBw (default: changePct)", example: "marketCap" },
          { name: "dir", type: "string", required: false, desc: "asc | desc (default: desc)", example: "desc" },
          { name: "limit", type: "number", required: false, desc: "Max results (1–132, default 10)", example: "10" },
          { name: "category", type: "string", required: false, desc: "Filter to a specific category", example: "meme" },
        ],
        response: [
          { name: "sortedBy", type: "string", desc: "Sort field used" },
          { name: "direction", type: "string", desc: "asc or desc" },
          { name: "category", type: "string", desc: "Category filter applied (or 'all')" },
          { name: "count", type: "number", desc: "Total coins before limit" },
          { name: "coins", type: "object[]", desc: "All getCoins fields for each ranked coin" },
        ],
        example: `${BASE}/api/v1/crypto/getLeaderboard?by=marketCap&limit=10`,
      },
    ],
  },

  // ── Future integrations - add new entries here ────────────────────────────
  {
    id: "webhooks",
    label: "Webhooks",
    icon: Webhook,
    status: "coming-soon",
    desc: "Subscribe to real-time market events via HTTP webhooks. Receive push notifications for price alerts, crash events, sector movements, and tick completions without polling.",
    comingSoonNote: "Webhooks will allow you to register URLs that receive POST payloads whenever market events fire. Supports event filtering by type, sector, and ticker.",
  },
  {
    id: "discord-bot",
    label: "Discord Bot",
    icon: Bot,
    status: "coming-soon",
    desc: "A pre-built Discord bot with slash commands wired directly to the Polymart API. Install it to your server and run /price, /market, /leaderboard, and more instantly.",
    comingSoonNote: "The official Polymart Discord bot is being built on top of the public REST API. All commands will mirror the API endpoints with rich embeds.",
  },
  {
    id: "sdk",
    label: "SDK",
    icon: Package,
    status: "coming-soon",
    desc: "Official JavaScript / TypeScript SDK wrapping the Polymart REST API. Typed responses, auto-retry, built-in polling helpers, and WebSocket support.",
    comingSoonNote: "The SDK will be published on npm and provide first-class TypeScript types auto-generated from the API schema.",
  },
  {
    id: "widgets",
    label: "Embeddable Widgets",
    icon: Zap,
    status: "stable",
    version: "v2",
    desc: "Drop-in Shadow DOM web components for embedding live Polymart data on any website. One script tag, zero dependencies, no API key required. Includes both stock and forex widget sets.",
    baseUrl: BASE,
    endpoints: [
      {
        id: "widgets-stock-script",
        method: "GET",
        path: "/widgets/polymart-widgets.js",
        summary: "Stock widgets bundle",
        desc: "Loads all 7 stock market web components: polymart-ticker, polymart-market, polymart-leaderboard, polymart-tape, polymart-sparkline, polymart-sector, polymart-events. Calls /api/v1/stocks/* endpoints.",
        response: [
          { name: "polymart-ticker", type: "element", desc: "Single stock price card with mini chart. Attr: ticker (required), chart (true/false), theme" },
          { name: "polymart-market", type: "element", desc: "Market overview: index, fear/greed, macro stats, top movers" },
          { name: "polymart-leaderboard", type: "element", desc: "Ranked stock table. Attr: by (change|price|volume|rsi), dir (asc|desc), limit, title" },
          { name: "polymart-tape", type: "element", desc: "Scrolling ticker tape. Attr: speed, limit" },
          { name: "polymart-sparkline", type: "element", desc: "Inline mini chart. Attr: ticker, width, height" },
          { name: "polymart-sector", type: "element", desc: "Sector overview with constituent stocks. Attr: sector" },
          { name: "polymart-events", type: "element", desc: "Recent market event feed. Attr: limit, sector" },
        ],
        example: `${BASE}/widgets/polymart-widgets.js`,
      },
      {
        id: "widgets-forex-script",
        method: "GET",
        path: "/widgets/polymart-forex-widgets.js",
        summary: "Forex widgets bundle",
        desc: "Loads all 4 forex web components: polymart-forex-ticker, polymart-forex-table, polymart-forex-chart, polymart-forex-heatmap. Calls /api/v1/forex/* endpoints.",
        response: [
          { name: "polymart-forex-ticker", type: "element", desc: "Single currency pair card with emoji flags, bid/ask, spread, RSI. Attr: pair (required), theme" },
          { name: "polymart-forex-table", type: "element", desc: "Filterable table of all 28 pairs. Attr: category (all|major|minor|exotic), limit" },
          { name: "polymart-forex-chart", type: "element", desc: "Rate history line chart with gradient fill. Attr: pair, height, theme" },
          { name: "polymart-forex-heatmap", type: "element", desc: "Color-coded grid of all pairs by % change. Attr: labels (true/false)" },
        ],
        example: `${BASE}/widgets/polymart-forex-widgets.js`,
      },
    ],
  },
  {
    id: "rss",
    label: "RSS Feed",
    icon: Rss,
    status: "stable",
    version: "v1",
    desc: "Subscribe to live Polymart market events via standard RSS 2.0. Works with any feed reader, automation platform (Zapier, Make, n8n, IFTTT), or HTTP client. No authentication required - just subscribe to the URL.",
    baseUrl: BASE,
    endpoints: [
      {
        id: "rss-feed",
        method: "GET",
        path: "/api/v1/rss",
        summary: "Market events RSS 2.0 feed",
        desc: "Returns a valid RSS 2.0 XML document containing the most recent market events - flash crashes, sector booms, FDA approvals, meme frenzies, regulatory shocks, and more. Updates every 10 seconds. Also accessible at /api/v1/rss.xml and /api/v1/stocks/rss.",
        params: [
          { name: "limit",  type: "number", required: false, desc: "Max events to include (1–100, default 40)", example: "40" },
          { name: "sector", type: "string", required: false, desc: "Filter to a specific sector key", example: "tech" },
        ],
        response: [
          { name: "Content-Type", type: "header",  desc: "application/rss+xml; charset=utf-8" },
          { name: "<title>",      type: "string",  desc: "Event description text" },
          { name: "<description>",type: "string",  desc: "Sentiment, effect magnitude (%), sector label, and weight" },
          { name: "<pubDate>",    type: "RFC 822", desc: "UTC timestamp of when the event fired" },
          { name: "<guid>",       type: "uuid",    desc: "Unique event ID (isPermaLink=false)" },
          { name: "<category>",   type: "string",  desc: "Sector key - omitted for market-wide events" },
          { name: "<ttl>",        type: "number",  desc: "Suggested client refresh interval: 10 seconds" },
          { name: "Cache-Control",type: "header",  desc: "public, max-age=10" },
        ],
        example: `${BASE}/api/v1/rss`,
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Puzzle,
    status: "coming-soon",
    desc: "First-party integrations with platforms like Zapier, Make, Notion, and Google Sheets. Connect Polymart data to your workflow tools without writing code.",
    comingSoonNote: "Integration connectors are planned for Zapier, Make (Integromat), Notion databases, and Google Sheets via the Apps Script API.",
  },
]

const SECTOR_KEYS = [
  "tech", "food", "space", "meme", "green", "finance", "gaming",
  "health", "crypto", "defence", "retail", "media", "auto",
  "realty", "travel", "ai", "bio", "energy", "logistics", "agri",
]

const CRYPTO_CATEGORY_KEYS = [
  "l1", "l2", "defi", "meme", "gamefi", "ai",
  "privacy", "infra", "oracle", "exchange", "metaverse", "stablecoin",
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  GET: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  POST: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  DELETE: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  PATCH: "text-amber-400 bg-amber-500/10 border-amber-500/20",
}

const STATUS_CONFIG: Record<ProductStatus, { label: string; className: string }> = {
  stable: { label: "Stable", className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  beta: { label: "Beta", className: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  "coming-soon": { label: "Coming Soon", className: "text-muted-foreground bg-muted/40 border-border" },
}

function MonoTag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <code className={cn(
      "text-xs px-1.5 py-0.5 rounded font-mono",
      accent
        ? "bg-muted/60 text-foreground"
        : "bg-muted/40 text-muted-foreground"
    )}>
      {children}
    </code>
  )
}

// ── Endpoint card ─────────────────────────────────────────────────────────────

function EndpointCard({ ep, active, onClick }: { ep: Endpoint; active: boolean; onClick: () => void }) {
  return (
    <div
      id={ep.id}
      className={cn(
        "rounded-xl border transition-colors",
        active ? "border-ring/40 bg-card" : "border-border bg-card/30"
      )}
    >
      <button
        onClick={onClick}
        className="w-full flex items-start gap-4 px-6 py-5 text-left cursor-pointer bg-transparent"
      >
        <span className={cn(
          "shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest border",
          METHOD_COLORS[ep.method]
        )}>
          {ep.method}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <code className="text-sm font-mono text-foreground">{ep.path}</code>
            <span className="text-xs text-muted-foreground">{ep.summary}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{ep.desc}</p>
        </div>
        <span className="text-muted-foreground text-xs shrink-0 mt-0.5">{active ? "▲" : "▼"}</span>
      </button>

      {active && (
        <div className="px-6 pb-6 border-t border-border/60 pt-5 space-y-6">
          {ep.params && ep.params.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Parameters</p>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-card/60">
                      <th className="px-4 py-2.5 text-left text-[10px] text-muted-foreground uppercase tracking-widest w-32">Name</th>
                      <th className="px-4 py-2.5 text-left text-[10px] text-muted-foreground uppercase tracking-widest w-24">Type</th>
                      <th className="px-4 py-2.5 text-left text-[10px] text-muted-foreground uppercase tracking-widest w-24">Required</th>
                      <th className="px-4 py-2.5 text-left text-[10px] text-muted-foreground uppercase tracking-widest">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ep.params.map((p, i) => (
                      <tr key={i} className={cn("border-b border-border/50", i === ep.params!.length - 1 && "border-b-0")}>
                        <td className="px-4 py-2.5"><MonoTag accent>{p.name}</MonoTag></td>
                        <td className="px-4 py-2.5"><MonoTag>{p.type}</MonoTag></td>
                        <td className="px-4 py-2.5">
                          <span className={cn("text-xs font-medium", p.required ? "text-rose-400" : "text-muted-foreground")}>
                            {p.required ? "required" : "optional"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {p.desc}{p.example && <> · Example: <MonoTag>{p.example}</MonoTag></>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Response Fields</p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card/60">
                    <th className="px-4 py-2.5 text-left text-[10px] text-muted-foreground uppercase tracking-widest w-48">Field</th>
                    <th className="px-4 py-2.5 text-left text-[10px] text-muted-foreground uppercase tracking-widest w-36">Type</th>
                    <th className="px-4 py-2.5 text-left text-[10px] text-muted-foreground uppercase tracking-widest">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ep.response.map((f, i) => (
                    <tr key={i} className={cn("border-b border-border/50", i === ep.response.length - 1 && "border-b-0")}>
                      <td className="px-4 py-2"><MonoTag accent>{f.name}</MonoTag></td>
                      <td className="px-4 py-2"><MonoTag>{f.type}</MonoTag></td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{f.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Example Request</p>
            <div className="flex items-center gap-3 bg-background border border-border rounded-lg px-4 py-3 overflow-x-auto">
              <span className={cn("text-xs font-bold shrink-0", METHOD_COLORS[ep.method].split(" ")[0])}>{ep.method}</span>
              <code className="text-xs font-mono text-foreground whitespace-nowrap flex-1">{ep.example}</code>
              <a
                href={ep.example}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Open <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Product panel ─────────────────────────────────────────────────────────────

function ProductPanel({ product }: { product: Product }) {
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(
    product.endpoints?.[0]?.id ?? null
  )

  const toggle = (id: string) =>
    setActiveEndpoint(prev => (prev === id ? null : id))

  if (product.status === "coming-soon") {
    return (
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="outline" className={cn(
              "text-[10px] tracking-widest uppercase border px-2 py-0.5",
              STATUS_CONFIG[product.status].className
            )}>
              {STATUS_CONFIG[product.status].label}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">{product.label}</h1>
          <p className="text-muted-foreground leading-relaxed max-w-2xl">{product.desc}</p>
        </div>

        {/* Coming soon card */}
        <div className="rounded-xl border border-border bg-card/40 p-8 flex flex-col items-center text-center gap-4 max-w-lg">
          <div className="w-12 h-12 rounded-full bg-muted/60 border border-border flex items-center justify-center">
            <product.icon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">In Development</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{product.comingSoonNote}</p>
          </div>
          <div className="w-full border-t border-border/60 pt-4">
            <p className="text-xs text-muted-foreground">
              Documentation will be published here when this product launches.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Badge variant="outline" className={cn(
            "text-[10px] tracking-widest uppercase border px-2 py-0.5",
            STATUS_CONFIG[product.status].className
          )}>
            {STATUS_CONFIG[product.status].label}
          </Badge>
          {product.version && (
            <Badge variant="outline" className="text-[10px] tracking-widest uppercase border-border text-muted-foreground px-2 py-0.5">
              {product.version}
            </Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">{product.label}</h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">{product.desc}</p>
      </div>

      {/* Base URL */}
      {product.baseUrl && (
        <div className="bg-card border border-border rounded-xl p-5 mb-8">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Base URL</p>
          <div className="flex items-center gap-3 bg-background border border-border rounded-lg px-4 py-3 overflow-x-auto">
            <code className="text-sm font-mono text-foreground whitespace-nowrap">{product.baseUrl}</code>
          </div>
          <p className="text-xs text-muted-foreground mt-3">No API key or auth header required. All endpoints are publicly accessible.</p>
        </div>
      )}

      {/* Endpoint index pills */}
      {product.endpoints && (
        <div className="mb-8">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Endpoints</p>
          <div className="flex flex-wrap gap-2">
            {product.endpoints.map(ep => (
              <button
                key={ep.id}
                onClick={() => {
                  setActiveEndpoint(ep.id)
                  document.getElementById(ep.id)?.scrollIntoView({ behavior: "smooth", block: "start" })
                }}
                className={cn(
                  "text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors cursor-pointer",
                  activeEndpoint === ep.id
                    ? "bg-card border-ring/40 text-foreground"
                    : "bg-card/40 border-border text-muted-foreground hover:text-foreground hover:bg-card"
                )}
              >
                {ep.path.replace("/api/v1/", "")}
              </button>
            ))}
          </div>
        </div>
      )}

      <Separator className="bg-border mb-8" />

      {/* Endpoint cards */}
      {product.endpoints && (
        <div className="space-y-4">
          {product.endpoints.map(ep => (
            <EndpointCard
              key={ep.id}
              ep={ep}
              active={activeEndpoint === ep.id}
              onClick={() => toggle(ep.id)}
            />
          ))}
        </div>
      )}

      <Separator className="bg-border my-10" />

      {/* Sector reference - stocks API only */}
      {product.id === "polymart-api" && (
        <div className="mb-10">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4">Valid Sector Keys</p>
          <div className="flex flex-wrap gap-2">
            {SECTOR_KEYS.map(k => <MonoTag key={k}>{k}</MonoTag>)}
          </div>
        </div>
      )}

      {/* Category reference - crypto API only */}
      {product.id === "crypto-api" && (
        <div className="mb-10">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4">Valid Category Keys</p>
          <div className="flex flex-wrap gap-2">
            {CRYPTO_CATEGORY_KEYS.map(k => <MonoTag key={k}>{k}</MonoTag>)}
          </div>
        </div>
      )}

      {/* Quick start snippet - stocks, forex, and crypto APIs */}
      {(product.id === "polymart-api" || product.id === "forex-api" || product.id === "crypto-api") && (
      <div className="bg-card border border-border rounded-xl p-6">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4">Quick Start</p>
        <pre className="text-xs font-mono text-foreground bg-background border border-border rounded-lg p-4 overflow-x-auto whitespace-pre">{`// Get current price of a stock (both paths work)
const res = await fetch('${BASE}/api/v1/stocks/getStock?ticker=APEX');
const { ticker, name, price, change } = await res.json();
console.log(\`\${ticker} (\${name}): $\${price} (\${change > 0 ? '+' : ''}\${change}%)\`);

// Get market overview
const mkt = await fetch('${BASE}/api/v1/stocks/getMarket').then(r => r.json());
console.log(\`Index: \${mkt.index} | F&G: \${mkt.fearGreedLabel} (\${mkt.fearGreed})\`);

// Top gainers leaderboard
const lb = await fetch('${BASE}/api/v1/stocks/getLeaderboard?by=change&limit=5').then(r => r.json());
lb.stocks.forEach(s => console.log(\`\${s.ticker}: +\${s.change}%\`));

// Get all forex pairs
const fx = await fetch('${BASE}/api/v1/forex/getPairs').then(r => r.json());
const eur = fx['EURUSD'];
console.log(\`EUR/USD: \${eur.price} (\${eur.changePct > 0 ? '+' : ''}\${eur.changePct.toFixed(3)}%)\`);

// Get forex top movers
const movers = await fetch('${BASE}/api/v1/forex/getTopMovers?limit=3').then(r => r.json());
movers.gainers.forEach(p => console.log(\`\${p.pair}: +\${p.changePct.toFixed(3)}%\`));

// Currency strength index
const cs = await fetch('${BASE}/api/v1/forex/getCurrencies').then(r => r.json());
console.log(\`Strongest: \${cs.currencies[0].flag} \${cs.currencies[0].code} (+\${cs.currencies[0].strength}%)\`);

// Correlation between EUR/USD and GBP/USD
const corr = await fetch('${BASE}/api/v1/forex/getCorrelations?pairs=EURUSD,GBPUSD').then(r => r.json());
console.log(\`EUR/USD ~ GBP/USD correlation: \${corr.matrix.EURUSD.GBPUSD}\`);

// Active trading sessions
const sess = await fetch('${BASE}/api/v1/forex/getSessions').then(r => r.json());
console.log(\`Open sessions: \${sess.openSessions.join(', ')}\`);

// Get all crypto coins
const coins = await fetch('${BASE}/api/v1/crypto/getCoins').then(r => r.json());
const solx = coins['SOLX'];
console.log(\`SOLX: $\${solx.price.toFixed(2)} (\${solx.changePct > 0 ? '+' : ''}\${solx.changePct.toFixed(2)}%) MCap: $\${(solx.marketCap/1e9).toFixed(1)}B\`);

// Crypto market overview
const cMkt = await fetch('${BASE}/api/v1/crypto/getMarketOverview').then(r => r.json());
console.log(\`Total MCap: $\${(cMkt.totalMarketCap/1e12).toFixed(2)}T | BTC Dominance: \${cMkt.btcDominance.toFixed(1)}%\`);

// Top meme coin movers
const meme = await fetch('${BASE}/api/v1/crypto/getLeaderboard?by=changePct&category=meme&limit=3').then(r => r.json());
meme.coins.forEach(c => console.log(\`\${c.symbol}: \${c.changePct > 0 ? '+' : ''}\${c.changePct.toFixed(2)}%\`));

// Search for DeFi coins
const srch = await fetch('${BASE}/api/v1/crypto/search?q=defi').then(r => r.json());
console.log(\`Found \${srch.count} coins matching 'defi'\`);`}</pre>
      </div>
      )}
    </div>
  )
}

// ── Left sidebar nav ──────────────────────────────────────────────────────────

function NavSidebar({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (id: string) => void
}) {
  const stable = PRODUCTS.filter(p => p.status !== "coming-soon")
  const upcoming = PRODUCTS.filter(p => p.status === "coming-soon")

  return (
    <aside className="w-56 shrink-0">
      <div className="sticky top-6 space-y-6">
        {/* Overview link */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 px-2">Docs</p>
          <NavItem
            label="Overview"
            icon={BookOpen}
            active={selected === "__overview"}
            onClick={() => onSelect("__overview")}
          />
        </div>

        {/* Products */}
        {stable.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 px-2">Products</p>
            <div className="space-y-0.5">
              {stable.map(p => (
                <NavItem
                  key={p.id}
                  label={p.label}
                  icon={p.icon}
                  active={selected === p.id}
                  status={p.status}
                  onClick={() => onSelect(p.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Integrations / upcoming */}
        {upcoming.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 px-2">Coming Soon</p>
            <div className="space-y-0.5">
              {upcoming.map(p => (
                <NavItem
                  key={p.id}
                  label={p.label}
                  icon={p.icon}
                  active={selected === p.id}
                  status={p.status}
                  onClick={() => onSelect(p.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

function NavItem({
  label,
  icon: Icon,
  active,
  status,
  onClick,
}: {
  label: string
  icon: React.ElementType
  active: boolean
  status?: ProductStatus
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer",
        active
          ? "bg-card border border-border text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-card/50 border border-transparent"
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="flex-1 leading-none">{label}</span>
      {active && <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />}
      {!active && status === "coming-soon" && (
        <Circle className="w-1.5 h-1.5 shrink-0 fill-muted-foreground text-muted-foreground opacity-50" />
      )}
    </button>
  )
}

// ── Overview panel ────────────────────────────────────────────────────────────

function OverviewPanel({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="mb-10">
        <Badge variant="outline" className="mb-4 text-[10px] tracking-widest uppercase border-border text-muted-foreground px-2 py-0.5">
          Developer Docs
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">API &amp; Integrations</h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          Everything you need to build on top of Polymart - from the open REST API to upcoming integrations,
          SDK, webhooks, and embeddable widgets.
        </p>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {PRODUCTS.map(p => {
          const cfg = STATUS_CONFIG[p.status]
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="group text-left rounded-xl border border-border bg-card/40 hover:bg-card hover:border-ring/40 transition-colors p-5 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-muted/60 border border-border flex items-center justify-center">
                  <p.icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <span className={cn(
                  "text-[10px] tracking-widest uppercase border px-2 py-0.5 rounded font-medium",
                  cfg.className
                )}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{p.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{p.desc}</p>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Open by default</p>
          <p className="text-sm font-semibold text-foreground mb-2">No API key required</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The Polymart REST API is completely open. All endpoints are GET requests returning JSON -
            no authentication headers, no rate limit tiers, no signup required.
            Point any HTTP client at <code className="text-foreground font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">https://polymart.co/api/v1</code> and go.
          </p>
        </div>

        <a
          href="/llms.txt"
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-card border border-border hover:border-ring/40 rounded-xl p-6 transition-colors no-underline flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-muted/60 border border-border flex items-center justify-center">
              <Brain className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">AI-Readable Docs</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Machine-readable <code className="text-foreground font-mono bg-muted/50 px-1 py-0.5 rounded">llms.txt</code> covering all endpoints, parameters, response fields, and usage examples - formatted for AI assistants and chatbots.
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono mt-auto">/llms.txt</p>
        </a>
      </div>
    </div>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function ApiDocsPage() {
  const [selected, setSelected] = useState<string>("polymart-api")

  const activeProduct = PRODUCTS.find(p => p.id === selected)

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-14 flex gap-10 items-start">
      <NavSidebar selected={selected} onSelect={setSelected} />

      {selected === "__overview" ? (
        <OverviewPanel onSelect={setSelected} />
      ) : activeProduct ? (
        <ProductPanel key={activeProduct.id} product={activeProduct} />
      ) : null}
    </div>
  )
}
