import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { GraduationCap, BookOpen, ChartBar as BarChart2, Brain, Code as Code2, Users, Building2, ChevronRight, Database, Layers, Zap, ShieldCheck, FlaskConical, TrendingUp, Activity, Globe, Bot, ArrowRight, TriangleAlert as AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

type Route = "home" | "market" | "api" | "terms" | "privacy" | "education" | "changelog"

interface Props {
  onNavigate: (r: Route) => void
}

// ── Section heading ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3">
      {children}
    </p>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  desc,
  accent,
}: {
  icon: React.ElementType
  title: string
  desc: string
  accent?: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 group hover:border-ring transition-colors">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: accent ? `${accent}18` : undefined }}
      >
        <Icon
          className="w-4.5 h-4.5"
          style={{ color: accent ?? "var(--muted-foreground)" }}
        />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

// ── Use-case card ─────────────────────────────────────────────────────────────
function UseCaseCard({
  number,
  title,
  body,
  tags,
}: {
  number: string
  title: string
  body: string
  tags: string[]
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start gap-4">
        <span className="text-3xl font-extrabold font-mono text-border leading-none shrink-0 select-none">
          {number}
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold text-foreground mb-2">{title}</p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{body}</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => (
              <Badge key={t} variant="outline" className="text-[10px] border-border text-muted-foreground">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Step card ─────────────────────────────────────────────────────────────────
function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold shrink-0">
          {n}
        </div>
        {n < 5 && <div className="flex-1 w-px bg-border mt-2" />}
      </div>
      <div className={cn("pb-8", n === 5 && "pb-0")}>
        <p className="text-sm font-semibold text-foreground mb-1.5">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function EducationPage({ onNavigate }: Props) {
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-16">

      {/* ── Hero ── */}
      <div className="mb-16">
        <div className="flex items-center gap-2 mb-5">
          <Badge variant="outline" className="text-xs border-border gap-1.5">
            <GraduationCap className="w-3 h-3" />
            For Educators & Researchers
          </Badge>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-5 text-balance">
          Polymart in Education
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
          A fully-simulated, risk-free financial market environment designed to support
          teaching, research, and the development of trading algorithms — with no real money,
          no sign-ups, and an open REST API.
        </p>
        <div
          className="flex items-start gap-3 bg-card border border-border rounded-xl p-4 max-w-2xl"
        >
          <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            All prices, companies, tickers, and market events in Polymart are entirely
            fictional. Nothing here constitutes financial advice or reflects real-world
            market conditions.
          </p>
        </div>
      </div>

      <Separator className="mb-16" />

      {/* ── What is Polymart ── */}
      <div className="mb-16">
        <SectionLabel>The Platform</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-4">What is Polymart?</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              Polymart is a persistent simulated stock exchange. It runs a continuous
              market engine that drives prices using a combination of volatility parameters,
              momentum indicators, RSI, order flow, macro variables (interest rates,
              inflation, GDP growth), and randomised market events.
            </p>
            <p>
              The simulation currently tracks <strong className="text-foreground">132 fictional tickers</strong> across{" "}
              <strong className="text-foreground">20 sectors</strong> — from Tech and AI to
              Meme stocks and Agriculture. Every ticker has its own character: unique
              volatility, trend bias, beta, and sector sensitivity.
            </p>
            <p>
              Because everything is simulated, there is no risk of loss, no real capital
              required, and no regulatory constraints. Students and researchers can
              observe, query, and build on a market that behaves realistically without
              any of the barriers that come with live market access.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Activity,    label: "Continuous simulation",  sub: "Ticks every 10 seconds"    },
              { icon: BarChart2,   label: "132 tickers",            sub: "Across 20 sectors"          },
              { icon: Globe,       label: "Macro variables",        sub: "Rates, inflation, GDP"      },
              { icon: Code2,       label: "Open REST API",          sub: "No auth required"           },
              { icon: Database,    label: "Full price history",     sub: "Candles, SMA, BB, MACD"     },
              { icon: Bot,         label: "Discord-ready",          sub: "Slash command integration"  },
            ].map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <item.icon className="w-4 h-4 text-muted-foreground mb-2" />
                <p className="text-xs font-semibold text-foreground mb-0.5">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Separator className="mb-16" />

      {/* ── Use cases ── */}
      <div className="mb-16">
        <SectionLabel>Use Cases</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-2">How it can be used</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          Polymart is flexible enough to support a wide range of educational and research contexts.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UseCaseCard
            number="01"
            title="Finance & Economics Classrooms"
            body="Instructors can use Polymart as a live backdrop for teaching technical analysis, portfolio theory, and market microstructure. Students can observe how RSI signals, Bollinger Band squeezes, and order flow imbalance play out in real time — concepts that are far more intuitive when seen in a moving market than described on a slide."
            tags={["Technical Analysis", "Portfolio Theory", "Macro Economics", "Market Microstructure"]}
          />
          <UseCaseCard
            number="02"
            title="Algorithmic Trading Courses"
            body="The open REST API lets students write code that queries live market data, make trading decisions, and back-test strategies against historical price data — all without the risk of real capital or the complexity of brokerage API access. Languages are irrelevant; any HTTP client works."
            tags={["Python", "JavaScript", "REST API", "Algorithmic Strategy", "Back-testing"]}
          />
          <UseCaseCard
            number="03"
            title="Machine Learning & AI Training Data"
            body="The simulation generates a continuous stream of structured market data: OHLCV candles, technical indicators (RSI, MACD, Bollinger Bands, EMA, SMA, ATR), order flow metrics, and macro variables. This makes it a practical source of labelled time-series data for training supervised and reinforcement learning models without licensing or privacy concerns."
            tags={["Time-Series", "Reinforcement Learning", "Labelled Data", "Feature Engineering", "OHLCV"]}
          />
          <UseCaseCard
            number="04"
            title="Hackathons & Project Courses"
            body="Polymart's API provides an interesting data source for building trading dashboards, Discord bots, alert systems, or market visualisations as coursework projects. The simulation produces interesting, structured data that can be displayed in many different ways — making it suitable for front-end, back-end, data science, or full-stack project briefs."
            tags={["Project Work", "Data Visualisation", "Discord Bots", "Full-Stack", "APIs"]}
          />
          <UseCaseCard
            number="05"
            title="Trading Simulations & Competitions"
            body="Institutions can build portfolio tracking applications on top of the Polymart API to run paper-trading competitions. Students are given a virtual starting balance and compete to grow it using market data from the simulation — a motivating and practical teaching format that requires no real financial infrastructure."
            tags={["Paper Trading", "Competitions", "Portfolio Tracking", "Leaderboards"]}
          />
          <UseCaseCard
            number="06"
            title="Research into Market Behaviour"
            body="Because Polymart's simulation parameters are known (volatility, trend bias, sector correlations, macro sensitivities), researchers can study how specific market behaviours emerge from simple rules. It provides a controlled environment for exploring price discovery, market efficiency, and the impact of events on asset prices."
            tags={["Controlled Environment", "Price Discovery", "Event Studies", "Market Efficiency"]}
          />
        </div>
      </div>

      <Separator className="mb-16" />

      {/* ── ML & Training data deep-dive ── */}
      <div className="mb-16">
        <SectionLabel>Machine Learning</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-4">Using Polymart as Training Data</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <FeatureCard
            icon={Database}
            title="Structured Time-Series"
            desc="Every stock produces a continuous stream of OHLCV candles alongside pre-computed indicators. The data is consistently formatted and available via a single GET request per ticker — no scraping or cleaning required."
            accent="#7c8af4"
          />
          <FeatureCard
            icon={Layers}
            title="Multi-Asset & Cross-Sector"
            desc="With 132 tickers across 20 sectors, models can learn cross-asset relationships, sector rotations, and correlation structures — the kind of multi-variate signals that real market models depend on."
            accent="#5bce8a"
          />
          <FeatureCard
            icon={FlaskConical}
            title="Known Ground Truth"
            desc="Because the simulation parameters are fixed and knowable, researchers can generate datasets where the generative process is understood — useful for evaluating whether a model is learning signal or overfitting to noise."
            accent="#eab34d"
          />
          <FeatureCard
            icon={Brain}
            title="Reinforcement Learning"
            desc="The continuous market environment with discrete actions (buy, hold, sell) maps naturally to a reinforcement learning setup. Reward functions can be defined around portfolio returns, Sharpe ratio, or drawdown constraints."
            accent="#7c8af4"
          />
          <FeatureCard
            icon={ShieldCheck}
            title="No Licensing Issues"
            desc="Real market data from exchanges often requires expensive data licences or carries redistribution restrictions. Polymart data is entirely synthetic and free to use, share, and publish in research papers or course materials."
            accent="#5bce8a"
          />
          <FeatureCard
            icon={Zap}
            title="Available Features"
            desc="Each data point includes: open, high, low, close, volume, RSI, EMA 12/26, SMA 20/50, MACD, signal line, histogram, Bollinger Bands, ATR, VWAP, bid/ask spread, buy/sell volume split, beta, and more."
            accent="#eab34d"
          />
        </div>

        {/* API snippet */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground">
                Fetching a full stock detail — Python example
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] border-border">GET /api/v1/getStock</Badge>
          </div>
          <pre className="p-5 text-xs font-mono text-muted-foreground leading-relaxed overflow-x-auto">
{`import requests

# Fetch full detail for a single ticker
response = requests.get("https://polymart.co/api/v1/getStock?ticker=APEX")
data = response.json()

# Available fields for model features
features = {
    "price":      data["price"],
    "rsi":        data["rsi"],
    "macd":       data["macd"],
    "macd_hist":  data["macdHist"],
    "ema12":      data["ema12"],
    "ema26":      data["ema26"],
    "sma20":      data["sma20"],
    "sma50":      data["sma50"],
    "bb_upper":   data["bbUpper"],
    "bb_lower":   data["bbLower"],
    "bb_bw":      data["bbBw"],
    "atr":        data["atr"],
    "vwap":       data["vwap"],
    "spread_pct": data["spreadPct"],
    "buy_vol":    data["buyVolume"],
    "sell_vol":   data["sellVolume"],
    "candles":    data["candles"],   # list of OHLCV dicts
}

# Fetch all 132 tickers for cross-asset analysis
all_stocks = requests.get("https://polymart.co/api/v1/getStocks").json()
`}
          </pre>
        </div>
      </div>

      <Separator className="mb-16" />

      {/* ── Deployment guide ── */}
      <div className="mb-16">
        <SectionLabel>Deployment</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-2">Setting up for your institution</h2>
        <p className="text-sm text-muted-foreground mb-10 max-w-xl">
          Polymart can be used as a shared hosted resource or self-hosted for complete control.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Option A: Hosted */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-bold text-foreground">Option A — Use the hosted version</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              The simplest path. Direct students to{" "}
              <code className="text-foreground bg-muted px-1 py-0.5 rounded text-[11px]">polymart.co</code>{" "}
              and the API at{" "}
              <code className="text-foreground bg-muted px-1 py-0.5 rounded text-[11px]">polymart.co/api/v1/</code>.
              No setup required. All students access the same persistent simulation.
            </p>
            <div className="space-y-2">
              {[
                "Zero infrastructure overhead",
                "Always-on persistent simulation",
                "Same shared market state for all students — useful for collaborative exercises",
                "Rate limiting applies per IP (60 requests/minute)",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Option B: Self-hosted */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-bold text-foreground">Option B — Self-host</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Polymart is open-source. Institutions can run their own instance on internal
              infrastructure, adjusting simulation parameters (tick rate, volatility
              profiles, number of tickers) to fit course requirements.
            </p>
            <div className="space-y-2">
              {[
                "Full control over simulation parameters",
                "Can be isolated from the public instance",
                "Tick rate configurable for faster or slower simulations",
                "Database accessible directly for research use",
                "Can be run offline or on a private network",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step-by-step for self-hosted */}
        <div className="mt-8 bg-card border border-border rounded-xl p-6">
          <p className="text-sm font-bold text-foreground mb-6">
            Self-hosted setup overview
          </p>
          <div>
            <Step
              n={1}
              title="Clone the repository"
              body="The full source is available on GitHub. Clone it onto any server running Node.js 18+ and MySQL 8 (or Supabase for the hosted database path)."
            />
            <Step
              n={2}
              title="Configure environment variables"
              body="Copy .env.example to .env and supply your database credentials. The tick interval, base prices, and volatility values are all editable in server/simulation.js before starting."
            />
            <Step
              n={3}
              title="Initialise the database"
              body="Run the provided schema migration to create the stocks_state and market_state tables. The tick worker will populate them on first run using STOCK_DEFS."
            />
            <Step
              n={4}
              title="Start the simulation server"
              body="npm run server starts the Express API and tick worker. The simulation begins immediately and persists state to the database between restarts."
            />
            <Step
              n={5}
              title="Serve the frontend (optional)"
              body="npm run build produces a static frontend that can be served from any web host. Students can access the full market UI and charts at whatever URL you deploy to."
            />
          </div>
        </div>
      </div>

      <Separator className="mb-16" />

      {/* ── Available data ── */}
      <div className="mb-16">
        <SectionLabel>Data Reference</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-2">What data is available</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          A summary of the data fields accessible via the API for each ticker.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              category: "Price",
              icon: TrendingUp,
              fields: ["Current price", "Previous close", "Open price", "52-week high / low", "All-time high", "Bid / Ask", "Spread %"],
            },
            {
              category: "Volume & Flow",
              icon: Activity,
              fields: ["Total volume", "Buy volume", "Sell volume", "Order flow imbalance", "VWAP"],
            },
            {
              category: "Momentum",
              icon: Zap,
              fields: ["RSI (14)", "Momentum", "Price streak", "Insider bias", "ATR (14)"],
            },
            {
              category: "Moving Averages",
              icon: BarChart2,
              fields: ["EMA 12", "EMA 26", "SMA 20", "SMA 50"],
            },
            {
              category: "MACD",
              icon: Brain,
              fields: ["MACD line", "Signal line", "Histogram"],
            },
            {
              category: "Bollinger Bands",
              icon: Layers,
              fields: ["Upper band", "Middle band (SMA20)", "Lower band", "Bandwidth"],
            },
            {
              category: "Market Context",
              icon: Globe,
              fields: ["Fear & Greed index", "VIX", "Interest rate", "Inflation", "GDP growth", "Market session"],
            },
            {
              category: "Candle History",
              icon: Database,
              fields: ["OHLCV candles", "Price history array", "Sector peer list"],
            },
            {
              category: "Sector Data",
              icon: Users,
              fields: ["Average sector change", "Average RSI", "Average beta", "News stack", "Momentum score", "Ticker list"],
            },
          ].map((group, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <group.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-bold text-foreground">{group.category}</p>
              </div>
              <ul className="space-y-1">
                {group.fields.map(f => (
                  <li key={f} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-border shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <Separator className="mb-16" />

      {/* ── FAQ ── */}
      <div className="mb-16">
        <SectionLabel>FAQ</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-8">Common questions</h2>
        <div className="max-w-2xl">
          <Accordion type="single" collapsible className="space-y-2">
            {[
              {
                q: "Is the data realistic enough for serious courses?",
                a: "Polymart uses a genuine multi-factor price model with momentum, RSI feedback, order flow, macro sensitivity, volatility clustering, and market events. The indicators and patterns it produces are structurally similar to real markets. For teaching concepts, pattern recognition, and algorithm prototyping it is highly suitable. For training production trading systems intended for live deployment, real market data should ultimately be used.",
              },
              {
                q: "Do students need accounts or credentials?",
                a: "No. The API has no authentication requirement. Any HTTP client — curl, Python requests, JavaScript fetch, Postman — can query it immediately without signing up or obtaining keys. This removes all friction from getting students started.",
              },
              {
                q: "Can the simulation be paused or reset for coursework?",
                a: "In the hosted version the simulation runs continuously and cannot be paused. In a self-hosted instance, the tick worker can be stopped, the database reset, and the simulation restarted from a known state — which is useful for exercises that require a deterministic starting point.",
              },
              {
                q: "What programming languages can be used to interact with the API?",
                a: "Any language with an HTTP client: Python, JavaScript, TypeScript, R, Java, Go, Rust, C#, etc. The API returns standard JSON. There is no proprietary SDK.",
              },
              {
                q: "How is market data structured in the API response?",
                a: "Each ticker's data is returned as a flat JSON object with clearly named fields. OHLCV candles are returned as an array of objects with o, h, l, c, v, and t (timestamp) keys. All numeric values are returned as numbers, not strings.",
              },
              {
                q: "Is there a rate limit on the API?",
                a: "The hosted API applies a sliding window rate limit of 60 requests per minute per IP address. The getStocks endpoint (which returns all tickers) counts as 3 tokens toward this limit due to its payload size. For classroom use, individual polling intervals of 5–10 seconds per student are well within limits.",
              },
              {
                q: "Can the list of tickers or sector definitions be customised?",
                a: "In a self-hosted deployment, yes. The STOCK_DEFS object in server/simulation.js defines every ticker, its base price, volatility, trend bias, sector, and market cap classification. These can be freely modified, extended, or reduced to match a specific course's requirements.",
              },
              {
                q: "Is Polymart suitable for research publication?",
                a: "Polymart provides a controlled, reproducible synthetic market environment. This can be appropriate for papers exploring algorithm design, model evaluation methodology, or market microstructure in simulation. Any publication should clearly describe that the data is synthetic and document the simulation parameters used.",
              },
            ].map((item, i) => (
              <AccordionItem
                key={i}
                value={String(i)}
                className="bg-card border border-border rounded-xl px-5 data-[state=open]:border-ring transition-colors"
              >
                <AccordionTrigger className="text-sm font-semibold text-foreground py-4 hover:no-underline text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      <Separator className="mb-16" />

      {/* ── CTA ── */}
      <div className="bg-card border border-border rounded-2xl p-10 flex flex-col sm:flex-row items-start sm:items-center gap-8">
        <div className="flex-1">
          <p className="text-xl font-bold text-foreground mb-2">Ready to explore the market?</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Open the live market view, browse all 132 tickers, or read the API reference
            to start building.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <button
            onClick={() => onNavigate("market")}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-semibold cursor-pointer border-0 hover:opacity-90 transition-opacity"
          >
            Open Market
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigate("api")}
            className="flex items-center gap-2 px-4 py-2 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium cursor-pointer hover:bg-accent transition-colors"
          >
            API Reference
            <BookOpen className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  )
}
