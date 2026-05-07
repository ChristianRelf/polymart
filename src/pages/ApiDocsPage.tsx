import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const BASE = "https://polymart.co"

type Param = { name: string; type: string; required: boolean; desc: string; example?: string }
type Field = { name: string; type: string; desc: string }

type Endpoint = {
  id: string
  method: "GET"
  path: string
  summary: string
  desc: string
  params?: Param[]
  response: Field[]
  example: string
}

const ENDPOINTS: Endpoint[] = [
  {
    id: "getMarket",
    method: "GET",
    path: "/api/v1/getMarket",
    summary: "Global market snapshot",
    desc: "Returns the current state of the entire market index value, fear & greed score, macro variables, gainer/loser counts, and top movers.",
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
    summary: "All stocks — summary",
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
    summary: "Single stock — full detail",
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
    summary: "All sectors — summary",
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
    summary: "Single sector — full detail",
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
    desc: "Returns the most recent market events — flash crashes, FDA approvals, meme frenzies, sector booms, and more. Events fire randomly during each tick.",
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
]

const SECTOR_KEYS = ["tech", "food", "space", "meme", "green", "finance", "gaming", "health", "crypto", "defence", "retail", "media", "auto", "realty", "travel", "ai", "bio", "energy", "logistics", "agri"]

// ── Components ────────────────────────────────────────────────────────────────

function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <code
      className="text-xs px-1.5 py-0.5 rounded font-mono"
      style={{ background: color ? `${color}18` : "oklch(0.2 0.004 264)", color: color ?? "var(--muted-foreground)" }}
    >
      {children}
    </code>
  )
}

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
        <span className="shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
                      <th className="px-4 py-2.5 text-left text-[10px] text-muted-foreground uppercase tracking-widest w-20">Required</th>
                      <th className="px-4 py-2.5 text-left text-[10px] text-muted-foreground uppercase tracking-widest">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ep.params.map((p, i) => (
                      <tr key={i} className={cn("border-b border-border/50", i === ep.params!.length - 1 && "border-b-0")}>
                        <td className="px-4 py-2.5"><Tag>{p.name}</Tag></td>
                        <td className="px-4 py-2.5"><Tag color="#7c8af4">{p.type}</Tag></td>
                        <td className="px-4 py-2.5">
                          <span className={cn("text-xs font-medium", p.required ? "text-rose-400" : "text-muted-foreground")}>
                            {p.required ? "required" : "optional"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {p.desc}{p.example && <> · Example: <Tag>{p.example}</Tag></>}
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
                      <td className="px-4 py-2"><Tag>{f.name}</Tag></td>
                      <td className="px-4 py-2"><Tag color="#7c8af4">{f.type}</Tag></td>
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
              <span className="text-xs font-bold text-emerald-400 shrink-0">GET</span>
              <code className="text-xs font-mono text-foreground whitespace-nowrap flex-1">{ep.example}</code>
              <a
                href={ep.example}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Open ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ApiDocsPage() {
  const [active, setActive] = useState<string | null>("getMarket")

  const toggle = (id: string) => setActive(prev => prev === id ? null : id)

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-14">

      <div className="mb-12">
        <Badge variant="outline" className="mb-4 text-xs tracking-widest uppercase border-border text-muted-foreground">
          REST API
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">API Reference</h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          The PolyAPI is open, no authentication required. All endpoints are GET requests returning JSON.
          Prices update every ~10 seconds via a persistent server-side simulation engine.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 mb-10">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Base URL</p>
        <div className="flex items-center gap-3 bg-background border border-border rounded-lg px-4 py-3 overflow-x-auto">
          <code className="text-sm font-mono text-foreground whitespace-nowrap">{BASE}</code>
        </div>
        <p className="text-xs text-muted-foreground mt-3">No API key or auth header required. All endpoints are publicly accessible.</p>
      </div>

      <div className="mb-8">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Endpoints</p>
        <div className="flex flex-wrap gap-2">
          {ENDPOINTS.map(ep => (
            <button
              key={ep.id}
              onClick={() => {
                setActive(ep.id)
                document.getElementById(ep.id)?.scrollIntoView({ behavior: "smooth", block: "start" })
              }}
              className={cn(
                "text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors cursor-pointer",
                active === ep.id
                  ? "bg-card border-ring/40 text-foreground"
                  : "bg-card/40 border-border text-muted-foreground hover:text-foreground hover:bg-card"
              )}
            >
              {ep.path.replace("/api/v1/", "")}
            </button>
          ))}
        </div>
      </div>

      <Separator className="bg-border mb-10" />

      <div className="space-y-4">
        {ENDPOINTS.map(ep => (
          <EndpointCard key={ep.id} ep={ep} active={active === ep.id} onClick={() => toggle(ep.id)} />
        ))}
      </div>

      <Separator className="bg-border my-12" />

      <div className="mb-10">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4">Valid Sector Keys</p>
        <div className="flex flex-wrap gap-2">
          {SECTOR_KEYS.map(k => <Tag key={k}>{k}</Tag>)}
        </div>
      </div>

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
