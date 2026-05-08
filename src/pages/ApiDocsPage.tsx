import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  TrendingUp, Puzzle, Webhook, Bot, BookOpen, ChevronRight,
  Circle, ArrowUpRight, Package, Zap, Brain,
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
    label: "Polymart API",
    icon: TrendingUp,
    status: "stable",
    version: "v1",
    desc: "Open REST API for the Polymart simulated stock market. No authentication required. Prices update every ~5 seconds via the persistent simulation engine.",
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
        desc: "Full data for one stock including price history (up to 400 data points) and sector peers.",
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
        desc: "Returns raw price history for a stock. Up to 400 data points, each representing one simulation tick (5 seconds).",
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
    ],
  },

  // ── Future products - add new entries here ────────────────────────────────
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
    status: "coming-soon",
    desc: "Drop-in HTML widgets for price tickers, market summaries, and leaderboards. Embed live Polymart data on any website with a single script tag.",
    comingSoonNote: "Widgets are iframe-based and theme-aware. Configure via data attributes - no JavaScript required.",
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

      {/* Sector reference */}
      <div className="mb-10">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4">Valid Sector Keys</p>
        <div className="flex flex-wrap gap-2">
          {SECTOR_KEYS.map(k => <MonoTag key={k}>{k}</MonoTag>)}
        </div>
      </div>

      {/* Quick start snippet */}
      <div className="bg-card border border-border rounded-xl p-6">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4">Discord Bot Quick Start</p>
        <pre className="text-xs font-mono text-foreground bg-background border border-border rounded-lg p-4 overflow-x-auto whitespace-pre">{`// Get current price of a stock
const res = await fetch('${BASE}/api/v1/getStock?ticker=APEX');
const { ticker, name, price, change } = await res.json();
interaction.reply(\`\${ticker} (\${name}): $\${price} (\${change > 0 ? '+' : ''}\${change}%)\`);

// Get market overview
const mkt = await fetch('${BASE}/api/v1/getMarket').then(r => r.json());
interaction.reply(\`Index: \${mkt.index} | F&G: \${mkt.fearGreedLabel} (\${mkt.fearGreed})\`);

// Top gainers leaderboard
const lb = await fetch('${BASE}/api/v1/getLeaderboard?by=change&limit=5').then(r => r.json());
const lines = lb.stocks.map(s => \`\${s.ticker}: +\${s.change}%\`).join('\\n');
interaction.reply(\`Top Gainers:\\n\${lines}\`);

// Search for a stock
const sr = await fetch('${BASE}/api/v1/search?q=moon').then(r => r.json());
interaction.reply(sr.results.map(s => \`\${s.ticker}: \${s.name}\`).join('\\n'));`}</pre>
      </div>
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
