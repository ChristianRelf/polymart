import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TrendingUp, Bitcoin, ChartBar as BarChart2, DollarSign, LayoutGrid, Bot, Globe, ArrowRight, Clock, Layers, MonitorSmartphone, Code as Code2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Route = "home" | "market" | "forex" | "api" | "terms" | "privacy" | "education" | "changelog" | "products" | "help" | "widgets"

interface Props {
  onNavigate: (r: Route) => void
}

// ── Shared label ──────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3">
      {children}
    </p>
  )
}

// ── Product card (active) ─────────────────────────────────────────────────────
function ActiveProduct({
  icon: Icon,
  title,
  desc,
  badge,
  onNavigate,
  route,
}: {
  icon: React.ElementType
  title: string
  desc: string
  badge: string
  onNavigate: (r: Route) => void
  route: Route
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4 hover:border-ring transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-lg bg-foreground/5 border border-border flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-foreground" />
        </div>
        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/5 shrink-0">
          {badge}
        </Badge>
      </div>
      <div className="flex-1">
        <p className="text-base font-bold text-foreground mb-1.5">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
      <button
        onClick={() => onNavigate(route)}
        className="flex items-center gap-1.5 text-xs font-semibold text-foreground cursor-pointer bg-transparent border-0 p-0 w-fit hover:opacity-70 transition-opacity"
      >
        Open <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}

// ── Product card (coming soon) ────────────────────────────────────────────────
function ComingSoonProduct({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType
  title: string
  desc: string
}) {
  return (
    <div className="bg-card/50 border border-border/60 rounded-xl p-6 flex flex-col gap-4 opacity-70">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-medium">Coming Soon</span>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-base font-bold text-foreground/70 mb-1.5">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

// ── Integration card ──────────────────────────────────────────────────────────
function IntegrationCard({
  icon: Icon,
  title,
  sub,
  items,
  status,
}: {
  icon: React.ElementType
  title: string
  sub: string
  items: string[]
  status: "live" | "coming-soon"
}) {
  const isLive = status === "live"
  return (
    <div className={cn(
      "bg-card border border-border rounded-xl p-6 flex flex-col gap-4",
      !isLive && "opacity-60"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-foreground/5 border border-border flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        </div>
        {isLive ? (
          <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/5 shrink-0">
            Live
          </Badge>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">Coming Soon</span>
          </div>
        )}
      </div>
      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item} className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-border mt-1.5 shrink-0" />
            <span className="text-xs text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ProductsPage({ onNavigate }: Props) {
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-16">

      {/* ── Hero ── */}
      <div className="mb-16">
        <div className="flex items-center gap-2 mb-5">
          <Badge variant="outline" className="text-xs border-border gap-1.5">
            <Layers className="w-3 h-3" />
            Platform
          </Badge>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-5 text-balance">
          Products
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
          Polymart is a growing suite of financial market simulations.
          The stock exchange and forex market are live today - more markets are on the way.
        </p>
      </div>

      <Separator className="mb-16" />

      {/* ── Simulations ── */}
      <div className="mb-16">
        <SectionLabel>Simulations</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-2">Market Simulations</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          Each simulation is a persistent, independently-running market engine with its own
          instruments, pricing mechanics, and data API.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActiveProduct
            icon={TrendingUp}
            title="Stock Market Simulation"
            desc="132 fictional tickers across 20 sectors. Continuous price engine with RSI, MACD, Bollinger Bands, macro variables, and market events. Open REST API, no auth required."
            badge="Live"
            onNavigate={onNavigate}
            route="market"
          />
          <ComingSoonProduct
            icon={Bitcoin}
            title="Cryptocurrency Simulation"
            desc="A simulated crypto exchange with fictional tokens, 24/7 price feeds, order book depth, and on-chain style metrics. High volatility profiles and cross-asset correlations."
          />
          <ComingSoonProduct
            icon={BarChart2}
            title="Indices Simulation"
            desc="Simulated broad market indices tracking weighted baskets of Polymart stocks. Useful for macro strategy testing, ETF modelling, and portfolio benchmarking."
          />
          <ActiveProduct
            icon={DollarSign}
            title="Forex Market Simulation"
            desc="40 currency pairs across major, minor, and exotic categories. Pip-accurate pricing with RSI, MACD, Bollinger Bands, ATR, and live session indicators. Open REST API, no auth required."
            badge="Live"
            onNavigate={onNavigate}
            route="forex"
          />
          <ComingSoonProduct
            icon={LayoutGrid}
            title="ETFs Simulation"
            desc="Exchange-traded fund vehicles built on top of Polymart equities. Sector ETFs, thematic ETFs, and inverse products - all with real-time NAV calculations."
          />
        </div>
      </div>

      <Separator className="mb-16" />

      {/* ── Embeds & Widgets ── */}
      <div className="mb-16">
        <SectionLabel>Embeds & Widgets</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-2">Embeddable Market Data</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          Drop live Polymart market data directly into any webpage or application without writing backend code.
        </p>

        <div className="bg-card border border-border rounded-xl p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 hover:border-ring transition-colors group">
          <div className="w-12 h-12 rounded-xl bg-foreground/5 border border-border flex items-center justify-center shrink-0">
            <MonitorSmartphone className="w-6 h-6 text-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-base font-bold text-foreground">Embeds &amp; Widgets</p>
              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/5">
                Live
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              Seven drop-in web components - price cards, ticker tapes, leaderboards, sparklines,
              sector overviews, market summaries, and event feeds. One script tag, no API key, Shadow DOM isolated.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <a
              href="/demo/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
            >
              View Demo <ArrowRight className="w-3 h-3" />
            </a>
            <button
              onClick={() => onNavigate("widgets")}
              className="flex items-center gap-1.5 text-xs font-semibold text-foreground cursor-pointer bg-transparent border-0 p-0 w-fit hover:opacity-70 transition-opacity"
            >
              View Widgets <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <Separator className="mb-16" />

      {/* ── Integrations ── */}
      <div className="mb-16">
        <SectionLabel>Integrations</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-2">Integrations</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          Connect Polymart data to the platforms your community already uses.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <IntegrationCard
            icon={Bot}
            title="Discord"
            sub="Bots & slash commands"
            status="live"
            items={[
              "Add the Polymart bot to any Discord server",
              "/price [ticker] - live price, change, RSI",
              "/market - top movers and sector overview",
              "/stock [ticker] - full detail card",
              "/index - Polymart composite index",
              "No bot token required for slash commands",
            ]}
          />
          <IntegrationCard
            icon={Globe}
            title="Web"
            sub="Embeds & widgets"
            status="live"
            items={[
              "Single <script> tag, no dependencies",
              "Price cards, tapes, leaderboards, sparklines",
              "Sector overview and market summary widgets",
              "Live event feed with impact indicators",
              "Dark & light themes, Shadow DOM isolated",
              "Zero-auth, CORS-open endpoints",
            ]}
          />
        </div>
      </div>

      <Separator className="mb-16" />

      {/* ── API note ── */}
      <div className="bg-card border border-border rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="w-12 h-12 rounded-xl bg-foreground/5 border border-border flex items-center justify-center shrink-0">
          <Code2 className="w-6 h-6 text-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-base font-bold text-foreground mb-1.5">Build on the API</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            Every product exposes its data through the same REST API pattern. No keys,
            no subscriptions. Any HTTP client works - browser, server, Discord bot, or data pipeline.
          </p>
        </div>
        <button
          onClick={() => onNavigate("api")}
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-semibold cursor-pointer border-0 hover:opacity-90 transition-opacity shrink-0"
        >
          API Reference
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  )
}
