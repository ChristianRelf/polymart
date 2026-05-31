import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type Route = "home" | "market" | "api" | "terms" | "privacy" | "changelog"

interface Props {
  onNavigate: (r: Route) => void
}

type ChangelogEntry = {
  version: string
  date: string
  tags: Array<{ label: string; variant: "default" | "secondary" | "outline" | "destructive" }>
  changes: Array<{ type: "added" | "changed" | "fixed" | "removed"; text: string }>
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.2.0",
    date: "2026-05-31",
    tags: [{ label: "Latest", variant: "default" }, { label: "Account", variant: "secondary" }],
    changes: [
      { type: "changed", text: "Account page fully redesigned — sidebar navigation with Overview, Profile, Plan & Billing, Integrations, Support, and Community sections" },
      { type: "changed", text: "Profile icon in the navbar now navigates to the Account page instead of opening the Clerk popup" },
      { type: "added",   text: "Sign-out button in the account sidebar and profile header" },
      { type: "added",   text: "Email & Password management accessible from the Profile section via Clerk's secure modal" },
      { type: "added",   text: "Mobile-friendly horizontal scrollable section tabs on the account page" },
      { type: "changed", text: "Account page widened to max-w-5xl to accommodate the sidebar layout" },
    ],
  },
  {
    version: "2.1.0",
    date: "2026-05-25",
    tags: [{ label: "Discord", variant: "secondary" }],
    changes: [
      { type: "added", text: "Discord Bot integration — link your Polymart account to Discord via a 30-second pairing code" },
      { type: "added", text: "Trade directly in Discord with /buy and /sell commands synced to your paper portfolio" },
      { type: "added", text: "/portfolio command in Discord shows your current positions and balance" },
      { type: "added", text: "Order history unified across the web app and Discord bot" },
      { type: "added", text: "Account Link page at /account/link with live pairing code countdown and unlink option" },
      { type: "added", text: "Discord connection status card shown in the Account > Integrations section" },
    ],
  },
  {
    version: "2.0.0",
    date: "2026-05-18",
    tags: [{ label: "Terminal", variant: "default" }],
    changes: [
      { type: "added", text: "Trading Terminal — fully modular drag-and-drop panel workspace at /terminal" },
      { type: "added", text: "17 panel types: Chart, Watchlist, Order Book, Time & Sales, Positions, Orders, Trade Form, News, Calendar, Heatmap, Scanner, Notes, Alerts, Performance, Calculator, Signals, DOM Ladder" },
      { type: "added", text: "6 built-in layout presets: Default, Day Trader, Swing Trader, Scalper, Macro View, Options Focus" },
      { type: "added", text: "Save and restore custom layouts; layouts persist across sessions" },
      { type: "added", text: "Panel pop-out to a separate browser window for multi-monitor setups" },
      { type: "added", text: "Full indicator library: SMA, EMA, WMA, Bollinger Bands, VWAP, Parabolic SAR, Ichimoku Cloud, Keltner Channel, Donchian Channel, Linear Regression, Pivot Points, MACD, RSI, Stochastic, CCI, ATR, OBV, Volume" },
      { type: "added", text: "Drawing tools: horizontal/vertical lines, trend lines, ray, channel, rectangle, ellipse, arrow, text, Fibonacci retracement/extension/fan/time zones, pitchfork, triangle, freehand brush, callout, price note" },
      { type: "added", text: "Multiple timeframes on the chart panel: 1m, 5m, 15m, 1h, 4h, 1D, 1W with OHLC aggregation" },
      { type: "added", text: "Scanner panel with filter presets: gainers, losers, overbought, oversold" },
      { type: "added", text: "Resizable panel dividers — drag to split workspace exactly as you want" },
    ],
  },
  {
    version: "1.7.0",
    date: "2026-05-14",
    tags: [{ label: "Crypto", variant: "secondary" }],
    changes: [
      { type: "added", text: "Crypto market simulation with 40+ coins spanning 12 categories: L1, L2, DeFi, Meme, GameFi, AI, Privacy, Infrastructure, Oracle, Exchange, Metaverse, Stablecoin" },
      { type: "added", text: "Dedicated Crypto page at /crypto with category filter tabs and price table" },
      { type: "added", text: "Crypto trading available in paper portfolios on Premium plans" },
      { type: "added", text: "Market cap display with T/B/M suffix formatting for crypto assets" },
      { type: "added", text: "Category colour-coded badges for fast visual classification" },
      { type: "changed", text: "SimulationContext extended to carry live crypto, forex, and stock data in a single context" },
    ],
  },
  {
    version: "1.6.0",
    date: "2026-05-10",
    tags: [{ label: "Community", variant: "secondary" }],
    changes: [
      { type: "added", text: "Leaderboard page — top 50 paper traders ranked by total portfolio value" },
      { type: "added", text: "Leaderboard shows avatar, display name, portfolio name, total value, and open positions per trader" },
      { type: "added", text: "Click any leaderboard entry to view that trader's public profile" },
      { type: "added", text: "Privacy toggle in account settings to opt out of the public leaderboard" },
      { type: "added", text: "Sub-communities (PolyMart community boards) with posts, comments, moderation, and community rules" },
      { type: "added", text: "Moderator tools: ban/unban members, remove/restore posts, pin posts, assign moderators" },
      { type: "added", text: "Community Standards page at /docs/community-standards" },
      { type: "added", text: "Moderation history and submitted reports visible in the Account page" },
    ],
  },
  {
    version: "1.5.0",
    date: "2026-05-06",
    tags: [],
    changes: [
      { type: "added", text: "QUAK (DuckPond Holdings) stock added to the Meme sector" },
      { type: "added", text: "Changelog page accessible from the footer" },
      { type: "added", text: "Column visibility toggle on the Market page - show only the stats you care about" },
      { type: "added", text: "240+ market event lines across all sectors for greater simulation variety" },
      { type: "fixed", text: "Green progress circle in navbar now syncs precisely with data refresh timing" },
      { type: "fixed", text: "Scrollbar hidden on the Events ticker strip" },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-05-05",
    tags: [{ label: "Simulation", variant: "secondary" }],
    changes: [
      { type: "added", text: "Candlestick chart with OHLCV data (18-tick candle period)" },
      { type: "added", text: "MACD sub-chart below the main price chart" },
      { type: "added", text: "Bollinger Band fill and lines on all charts" },
      { type: "added", text: "VWAP indicator on price charts" },
      { type: "added", text: "Bid/Ask spread display in stock detail view" },
      { type: "added", text: "Order flow imbalance bar with buy/sell volume split" },
      { type: "added", text: "Market session phases: Pre, Open, Post, Closed with intraday volume U-shape" },
      { type: "added", text: "Circuit breaker: halts individual stocks that move >20% in a single tick" },
      { type: "added", text: "Gap-open logic: overnight news shocks applied at session open" },
      { type: "changed", text: "GARCH-lite volatility clustering - recent vol breeds vol" },
      { type: "changed", text: "Sector correlation matrix expanded (20 cross-sector relationships)" },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-05-04",
    tags: [{ label: "API", variant: "secondary" }],
    changes: [
      { type: "added", text: "REST API endpoints: getMarket, getStocks, getStock, getSectors, getEvents, health" },
      { type: "added", text: "Full API Reference page with curl examples" },
      { type: "added", text: "Stock detail page with tabbed interface: Price / Technicals / Order Flow" },
      { type: "added", text: "52-week high/low range slider on stock detail" },
      { type: "added", text: "RSI gauge bar with overbought/oversold zones" },
      { type: "added", text: "Moving averages table (EMA-12, EMA-26, SMA-20, SMA-50) with above/below signals" },
      { type: "added", text: "Sector peer group links from stock detail" },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-05-03",
    tags: [{ label: "Market", variant: "secondary" }],
    changes: [
      { type: "added", text: "132 stocks across 20 sectors" },
      { type: "added", text: "Fear & Greed index with label (Extreme Fear → Extreme Greed)" },
      { type: "added", text: "VIX volatility index calculated from macro conditions" },
      { type: "added", text: "Advance/Decline line and new highs/lows counters" },
      { type: "added", text: "Top gainer and top loser widgets in market overview" },
      { type: "added", text: "Market events ticker strip with fade-out on older events" },
      { type: "added", text: "Sector sidebar with performance bars and filter integration" },
      { type: "changed", text: "Stock table sortable by ticker, price, change %, volume, and RSI" },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-05-02",
    tags: [{ label: "Infrastructure", variant: "outline" }],
    changes: [
      { type: "added", text: "Supabase edge function for simulation tick (polymart-tick)" },
      { type: "added", text: "Supabase edge function for REST API (polymart-api)" },
      { type: "added", text: "pg_cron scheduled tick every 5 seconds via database cron job" },
      { type: "added", text: "Persistent simulation state stored in Supabase (market_state, stocks_state, sector_state, events_log)" },
      { type: "added", text: "Row Level Security enabled on all tables" },
      { type: "added", text: "Automatic warm-up: 60 ticks simulated on first run to seed price history" },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-05-01",
    tags: [{ label: "Launch", variant: "default" }],
    changes: [
      { type: "added", text: "Initial POLYMART simulation engine" },
      { type: "added", text: "Gaussian price movement with volatility, trend, momentum, and RSI mean-reversion" },
      { type: "added", text: "Macro variables: interest rate, inflation, GDP growth with continuous drift" },
      { type: "added", text: "Weighted random market event system (100+ event types)" },
      { type: "added", text: "React + Vite + Tailwind CSS v4 frontend with dark mode" },
      { type: "added", text: "Hash-based SPA routing (home, market, api docs, legal)" },
    ],
  },
]

const TYPE_CONFIG = {
  added:   { label: "Added",   color: "text-emerald-400", bg: "bg-emerald-400/10",  dot: "bg-emerald-400"  },
  changed: { label: "Changed", color: "text-sky-400",     bg: "bg-sky-400/10",      dot: "bg-sky-400"      },
  fixed:   { label: "Fixed",   color: "text-amber-400",   bg: "bg-amber-400/10",    dot: "bg-amber-400"    },
  removed: { label: "Removed", color: "text-red-400",     bg: "bg-red-400/10",      dot: "bg-red-400"      },
}

export default function ChangelogPage({ onNavigate: _onNavigate }: Props) {
  return (
    <div className="max-w-[1600px] mx-auto px-8 py-16">

      {/* Header */}
      <div className="mb-14">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">What's new</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">Changelog</h1>
        <p className="text-base text-muted-foreground max-w-xl leading-relaxed">
          A running history of every simulation update, feature addition, and bug fix shipped to POLYMART.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-2 bottom-0 w-px bg-border" aria-hidden="true" />

        <div className="space-y-14 pl-8">
          {CHANGELOG.map((entry, i) => (
            <div key={entry.version} className="relative">
              {/* Timeline dot */}
              <div
                className="absolute -left-8 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background ring-2 ring-border bg-foreground"
                aria-hidden="true"
              />

              {/* Version header */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <h2 className="text-xl font-bold font-mono text-foreground tracking-tight">
                  v{entry.version}
                </h2>
                {entry.tags.map(tag => (
                  <Badge key={tag.label} variant={tag.variant} className="text-xs">
                    {tag.label}
                  </Badge>
                ))}
                <span className="text-xs text-muted-foreground font-mono ml-auto">
                  {entry.date}
                </span>
              </div>

              {/* Changes grouped by type */}
              {(["added", "changed", "fixed", "removed"] as const).map(type => {
                const items = entry.changes.filter(c => c.type === type)
                if (items.length === 0) return null
                const cfg = TYPE_CONFIG[type]
                return (
                  <div key={type} className="mb-4 last:mb-0">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded mb-2 ${cfg.color} ${cfg.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                    <ul className="space-y-1.5">
                      {items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                          <span className="mt-2 shrink-0 w-1 h-1 rounded-full bg-border" />
                          {item.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}

              {i < CHANGELOG.length - 1 && (
                <Separator className="bg-border mt-10" />
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
