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
    version: "1.5.0",
    date: "2026-05-06",
    tags: [{ label: "Latest", variant: "default" }],
    changes: [
      { type: "added", text: "QUAK (DuckPond Holdings) stock added to the Meme sector" },
      { type: "added", text: "Changelog page accessible from the footer" },
      { type: "added", text: "Column visibility toggle on the Market page — show only the stats you care about" },
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
      { type: "changed", text: "GARCH-lite volatility clustering — recent vol breeds vol" },
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
