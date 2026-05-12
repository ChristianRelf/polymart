import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { GraduationCap, BookOpen, ChartBar as BarChart2, Brain, Code as Code2, Users, Building2, ChevronRight, Database, Layers, Zap, ShieldCheck, FlaskConical, TrendingUp, Activity, Globe, Bot, ArrowRight, TriangleAlert as AlertTriangle, Wrench, Clock, Search, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Route = "home" | "market" | "api" | "terms" | "privacy" | "education" | "changelog" | "products" | "help" | "widgets" | "edu-tools"

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
function Step({ n, title, body, last }: { n: number; title: string; body: string; last?: boolean }) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold shrink-0">
          {n}
        </div>
        {!last && n < 5 && <div className="flex-1 w-px bg-border mt-2" />}
      </div>
      <div className={cn("pb-8", (n === 5 || last) && "pb-0")}>
        <p className="text-sm font-semibold text-foreground mb-1.5">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

// ── Curriculum tab content ────────────────────────────────────────────────────
function CurriculumTab({
  description,
  objectives,
  endpoints,
}: {
  description: string
  objectives: string[]
  endpoints: string[]
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{description}</p>
        <p className="text-xs font-bold text-foreground mb-3">Learning objectives</p>
        <div className="space-y-3">
          {objectives.map((obj, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed">{obj}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-foreground mb-3">Suggested API endpoints</p>
        <div className="space-y-2">
          {endpoints.map((ep, i) => (
            <div key={i} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2.5">
              <Badge variant="outline" className="text-[10px] font-mono border-border shrink-0">GET</Badge>
              <code className="text-xs font-mono text-foreground">/api/v1{ep}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Assignment card ────────────────────────────────────────────────────────────
function AssignmentCard({
  title,
  difficulty,
  timeEst,
  objectives,
  endpoints,
}: {
  title: string
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  timeEst: string
  objectives: string[]
  endpoints: string[]
}) {
  const diffColors = {
    Beginner: "border-emerald-500/40 text-emerald-400 bg-emerald-500/5",
    Intermediate: "border-amber-500/40 text-amber-400 bg-amber-500/5",
    Advanced: "border-red-500/40 text-red-400 bg-red-500/5",
  }
  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className={cn("text-[10px]", diffColors[difficulty])}>{difficulty}</Badge>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          {timeEst}
        </div>
      </div>
      <p className="text-sm font-bold text-foreground">{title}</p>
      <div className="space-y-1.5 flex-1">
        {objectives.map((obj, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-border mt-2 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">{obj}</p>
          </div>
        ))}
      </div>
      <Separator />
      <div className="flex flex-wrap gap-1.5">
        {endpoints.map((ep, i) => (
          <code key={i} className="text-[10px] font-mono bg-muted text-foreground px-2 py-0.5 rounded">{ep}</code>
        ))}
      </div>
    </div>
  )
}

// ── Glossary data ─────────────────────────────────────────────────────────────
const GLOSSARY = [
  {
    term: "RSI (Relative Strength Index)",
    def: "A momentum oscillator measuring the speed of price changes on a scale of 0–100. Readings above 70 suggest the asset is overbought and may be due for a pullback; readings below 30 suggest it is oversold and may bounce.",
    polymart: "Recalculated every tick from the last 14 price movements. Returned as rsi in every stock response.",
  },
  {
    term: "MACD (Moving Average Convergence Divergence)",
    def: "A trend-following indicator showing the relationship between two exponential moving averages (EMA 12 and EMA 26). When the MACD line crosses above the signal line it is a bullish signal; crossing below is bearish.",
    polymart: "All three values — MACD line, signal, and histogram — are returned as macd, macdSignal, and macdHist in every stock response.",
  },
  {
    term: "MACD Histogram",
    def: "The difference between the MACD line and the signal line, plotted as bars. A growing positive histogram indicates strengthening bullish momentum; a shrinking or negative histogram suggests weakening momentum or a bearish shift.",
    polymart: "Returned as macdHist. Positive when MACD is above the signal line, negative when below.",
  },
  {
    term: "Bollinger Bands",
    def: "Three lines plotted around a 20-period moving average: an upper band, the middle band (SMA 20), and a lower band — each set 2 standard deviations apart. Price touching the upper band can indicate overbought conditions; touching the lower can indicate oversold.",
    polymart: "Upper, middle, and lower values are in every response as bbUpper, bbMiddle, bbLower.",
  },
  {
    term: "Bandwidth (BB Bandwidth)",
    def: "The width of the Bollinger Bands as a percentage of the middle band. Low bandwidth — known as a Bollinger squeeze — often precedes a large move in either direction as volatility expands from a compressed state.",
    polymart: "Returned as bbBw. A value below 0.05 typically signals a squeeze in progress.",
  },
  {
    term: "ATR (Average True Range)",
    def: "A volatility indicator showing the average price range over the last 14 periods. A higher ATR means larger expected daily swings; a lower ATR means calmer, tighter price action. Dividing ATR by the current price gives a normalised volatility percentage.",
    polymart: "Returned as atr on every ticker.",
  },
  {
    term: "VWAP (Volume Weighted Average Price)",
    def: "The average price of an asset weighted by its trading volume, used as an execution quality benchmark. Price trading above VWAP during a session is generally considered bullish; below VWAP is bearish.",
    polymart: "Recalculated each tick and returned as vwap.",
  },
  {
    term: "EMA (Exponential Moving Average)",
    def: "A moving average that gives more weight to recent prices, making it more responsive to new information than a simple moving average. The EMA 12/EMA 26 crossover is one of the most watched signals in technical analysis.",
    polymart: "Available as ema12 and ema26. When EMA 12 crosses above EMA 26, the MACD histogram turns positive.",
  },
  {
    term: "SMA (Simple Moving Average)",
    def: "The arithmetic mean of prices over a fixed number of periods, giving equal weight to each. The SMA 20 crossing above SMA 50 is traditionally called a golden cross (bullish); the reverse is a death cross (bearish).",
    polymart: "Available as sma20 and sma50 on every ticker.",
  },
  {
    term: "Beta",
    def: "A measure of a stock's sensitivity to market-wide movements. A beta of 1.5 means the stock typically moves 50% more than the index. Below 1 is considered defensive; above 1.5 is considered high-beta and higher risk.",
    polymart: "Each ticker has a fixed beta that scales how macro variable changes (interest rate, VIX) affect its price simulation.",
  },
  {
    term: "Momentum",
    def: "The rate of change in price — a measure of how quickly a stock is moving in a given direction. Positive momentum suggests continued upward movement; negative suggests continued downward movement. Momentum tends to persist in the short term.",
    polymart: "Returned as momentum in the stock detail endpoint (/getStock). One of the inputs to the simulation's price engine.",
  },
  {
    term: "Fear & Greed Index",
    def: "A composite sentiment indicator ranging from 0 (extreme fear) to 100 (extreme greed). Historically, markets tend to be oversold during extreme fear and overbought during extreme greed, making it useful as a contrarian indicator.",
    polymart: "Driven by overall market conditions. Returned as fearGreed (number) and fearGreedLabel (string) in the market overview.",
  },
  {
    term: "VIX (Volatility Index)",
    def: "A forward-looking measure of expected market volatility, sometimes called the fear gauge. High VIX (above 30) signals market stress or uncertainty; low VIX (below 15) signals complacency and low expected volatility.",
    polymart: "A macro variable in the simulation. Returned as vix in the market overview. Spikes during market stress events.",
  },
  {
    term: "Overbought / Oversold",
    def: "Descriptive conditions where a stock has risen (overbought) or fallen (oversold) too far and too fast relative to its recent range, suggesting the move may be due for a reversal. They are conditions to watch, not precise trade signals on their own.",
    polymart: "Defined by RSI thresholds: RSI above 70 is overbought; below 30 is oversold.",
  },
  {
    term: "Bid / Ask Spread",
    def: "The difference between the highest price a buyer will pay (bid) and the lowest price a seller will accept (ask). A wider spread indicates lower liquidity; a narrower spread indicates a more liquid and efficiently priced market.",
    polymart: "Available per tick as bid, ask, and spreadPct (spread as a percentage of the current price).",
  },
  {
    term: "OHLCV",
    def: "Open, High, Low, Close, Volume — the five standard data points for a price candle. Each candle represents one period of trading activity and forms the basis for most candlestick charting and technical analysis.",
    polymart: "Historical candles are returned by /getStock as an array with keys o, h, l, c, v, and t (Unix timestamp in milliseconds).",
  },
  {
    term: "Order Flow Imbalance",
    def: "The net difference between buying and selling pressure. Positive imbalance (more buyers than sellers) tends to push prices up; negative imbalance (more sellers) drives them down. It is a useful measure of short-term directional pressure.",
    polymart: "Returned as orderFlow. Buy and sell volumes are also available separately as buyVolume and sellVolume.",
  },
  {
    term: "Sector Rotation",
    def: "The cyclical movement of capital between market sectors as the economic cycle progresses. Different sectors outperform at different stages — for example, technology in expansion phases and utilities in contraction phases.",
    polymart: "Sector-level averages (avg change, avg RSI, momentum) are accessible via /getSectors, making it practical to observe and model rotation patterns.",
  },
  {
    term: "Streak",
    def: "The number of consecutive periods a stock's price has moved in the same direction. A long positive streak can indicate a trend but also signals rising mean-reversion risk; a long negative streak may indicate overselling.",
    polymart: "Returned as streak — positive for up streaks, negative for down streaks.",
  },
  {
    term: "Insider Bias",
    def: "A synthetic variable representing aggregate directional pressure from simulated informed participants. A strong positive insider bias creates asymmetric upward pressure on price over time; negative bias does the reverse.",
    polymart: "Returned as insiderBias in the stock detail response (/getStock). Not included in the summary endpoint.",
  },
]

// ── Main page ──────────────────────────────────────────────────────────────────
export default function EducationPage({ onNavigate }: Props) {
  const [glossarySearch, setGlossarySearch] = useState("")

  const filteredGlossary = glossarySearch
    ? GLOSSARY.filter(t => t.term.toLowerCase().includes(glossarySearch.toLowerCase()))
    : GLOSSARY

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
        <div className="flex items-start gap-3 bg-card border border-border rounded-xl p-4 max-w-2xl">
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
              { icon: Activity,    label: "Continuous simulation",  sub: "Ticks every 5 seconds"     },
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
            body="Polymart's API provides an interesting data source for building trading dashboards, Discord bots, alert systems, or market visualisations as coursework projects. The simulation produces structured data that can be displayed in many different ways — making it suitable for front-end, back-end, data science, or full-stack project briefs."
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

      {/* ── Classroom Quick-Start ── */}
      <div className="mb-16">
        <SectionLabel>Getting Started</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-2">Using Polymart in a classroom</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          No sign-ups, no API keys, no infrastructure setup. Students can start querying live market data in minutes.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          {[
            { icon: CheckCircle2, label: "No accounts needed", sub: "The API has no authentication requirement. Any HTTP client works immediately from day one." },
            { icon: CheckCircle2, label: "No rate limit setup", sub: "60 requests per minute per IP. Individual students polling at 5-second intervals are well within limits." },
            { icon: CheckCircle2, label: "One URL for everyone", sub: 'Direct students to polymart.co or your self-hosted instance. One base URL covers all endpoints.' },
          ].map((item, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <item.icon className="w-4 h-4 text-emerald-400 mb-2" />
              <p className="text-xs font-semibold text-foreground mb-1">{item.label}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{item.sub}</p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <p className="text-sm font-bold text-foreground mb-6">Getting students started in 4 steps</p>
          <Step n={1} title="Share the URL" body="Direct students to polymart.co (or your self-hosted instance). No accounts or credentials needed — the market is immediately accessible to any browser or HTTP client." />
          <Step n={2} title="Explore live data" body="Students can browse all 132 tickers, view sector performance, and watch prices update every 5 seconds from the Market page — no code required to start building intuition." />
          <Step n={3} title="Query the API" body='Show students the one-liner: fetch("https://polymart.co/api/v1/getStocks"). Every ticker, price, and indicator returned as structured JSON. Works in Python, JavaScript, R, or any other language.' />
          <Step n={4} last title="Build something" body="Assign a signal scanner, alert bot, sector dashboard, or ML feature pipeline as coursework. Every exercise builds on the same base URL with no authentication overhead." />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground">Fetch all 132 stocks — JavaScript</p>
            </div>
            <Badge variant="outline" className="text-[10px] border-border">GET /api/v1/getStocks</Badge>
          </div>
          <pre className="p-5 text-xs font-mono text-muted-foreground leading-relaxed overflow-x-auto">
{`const stocks = await (await fetch("https://polymart.co/api/v1/getStocks")).json()

// Each entry: price, change, rsi, macd, ema12, ema26, sma20, sma50,
// bbUpper, bbLower, atr, beta, vwap, buyVolume, sellVolume, and more.

const overbought = Object.entries(stocks).filter(([, s]) => s.rsi > 70)
console.log("Overbought stocks:", overbought.map(([ticker]) => ticker))`}
          </pre>
        </div>
      </div>

      <Separator className="mb-16" />

      {/* ── Curriculum Tracks ── */}
      <div className="mb-16">
        <SectionLabel>Curriculum</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-2">Suggested learning tracks</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          Pre-structured curriculum ideas for four common use cases, with learning objectives and suggested API endpoints for each.
        </p>

        <Tabs defaultValue="finance">
          <TabsList className="mb-8 flex-wrap h-auto gap-1">
            <TabsTrigger value="finance">Intro Finance</TabsTrigger>
            <TabsTrigger value="algo">Algo Trading</TabsTrigger>
            <TabsTrigger value="ml">Data Science / ML</TabsTrigger>
            <TabsTrigger value="econ">Economics</TabsTrigger>
          </TabsList>
          <TabsContent value="finance">
            <CurriculumTab
              description="Learn to read and interpret live market data, understand price movement, and analyse common technical signals — all in a risk-free simulated environment where nothing is at stake."
              objectives={[
                "Read and interpret bid/ask spreads, RSI levels, and volume data from the live market",
                "Identify overbought and oversold conditions across all 132 tickers using RSI and Bollinger Band position",
                "Compare sector performance and describe the basics of sector rotation using /getSectors data",
              ]}
              endpoints={["/getStocks", "/getSectors", "/getMarket"]}
            />
          </TabsContent>
          <TabsContent value="algo">
            <CurriculumTab
              description="Build automated systems that query live market data, generate trading signals based on technical rules, and simulate trade execution — without real capital or brokerage complexity."
              objectives={[
                "Write a signal scanner that identifies RSI crossovers or EMA 12/26 crossovers across all tickers",
                "Implement a simple mean-reversion or momentum strategy with defined entry, exit, and stop-loss rules",
                "Poll /getStock at regular intervals to track real-time signal changes and simulated portfolio P&L",
              ]}
              endpoints={["/getStock?ticker=", "/getStocks", "/getTopMovers"]}
            />
          </TabsContent>
          <TabsContent value="ml">
            <CurriculumTab
              description="Use Polymart as a structured, continuously-updating data source for machine learning experiments — from feature engineering and supervised learning to reinforcement learning trading agents."
              objectives={[
                "Build a feature matrix from /getStocks with 20+ predictive features per ticker across all 132 stocks",
                "Use OHLCV candle arrays from /getStock to train sequence-based models (LSTM, Transformer, TCN)",
                "Evaluate model predictions against future simulation ticks collected over an extended session",
              ]}
              endpoints={["/getStock?ticker=", "/getStocks"]}
            />
          </TabsContent>
          <TabsContent value="econ">
            <CurriculumTab
              description="Analyse how macro variables — interest rates, inflation, GDP growth, and VIX — drive sector performance and individual stock prices, and model the transmission mechanisms between them."
              objectives={[
                "Correlate macro variable changes from /getMacro with sector and stock price movements over time",
                "Model the impact of the Fear & Greed Index on market breadth (gainers vs losers ratio)",
                "Identify which sectors and tickers show the highest beta to interest rate and inflation changes",
              ]}
              endpoints={["/getMacro", "/getSectors", "/getMarket"]}
            />
          </TabsContent>
        </Tabs>
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
            desc="Real market data from exchanges often requires expensive licences or carries redistribution restrictions. Polymart data is entirely synthetic and free to use, share, and publish in research papers or course materials."
            accent="#5bce8a"
          />
          <FeatureCard
            icon={Zap}
            title="Available Features"
            desc="Each data point includes: open, high, low, close, volume, RSI, EMA 12/26, SMA 20/50, MACD, signal line, histogram, Bollinger Bands, ATR, VWAP, bid/ask spread, buy/sell volume split, beta, and more."
            accent="#eab34d"
          />
        </div>

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

      {/* ── Educator Resources ── */}
      <div className="mb-16">
        <SectionLabel>Educator Resources</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-2">Pre-built assignment ideas</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          Ready-to-use assignment briefs spanning beginner to advanced difficulty. Each is designed to be achievable
          using only the Polymart API with no additional data sources or accounts.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AssignmentCard
            title="RSI Signal Scanner"
            difficulty="Beginner"
            timeEst="2–3 hours"
            objectives={[
              "Fetch all 132 stocks from /getStocks and identify those with RSI above 70 or below 30",
              "Filter and rank results by sector and by the extremity of the RSI reading",
              "Discuss what overbought and oversold signals mean and whether the simulation tends to reverse after crossing these thresholds",
            ]}
            endpoints={["/getStocks"]}
          />
          <AssignmentCard
            title="Sector Rotation Analysis"
            difficulty="Intermediate"
            timeEst="4–6 hours"
            objectives={[
              "Fetch all sectors via /getSectors and compare average RSI, average change %, and momentum scores",
              "Identify which sectors appear to be in a bullish vs bearish phase and explain what might be driving each",
              "Build a ranked sector heatmap or table and write a brief analysis of what it suggests about the current market cycle",
            ]}
            endpoints={["/getSectors", "/getStocks"]}
          />
          <AssignmentCard
            title="Moving Average Crossover Bot"
            difficulty="Intermediate"
            timeEst="6–8 hours"
            objectives={[
              "Poll /getStock for a chosen ticker at regular intervals and record EMA 12 vs EMA 26 values",
              "Generate a buy signal when EMA 12 crosses above EMA 26 and a sell signal when it crosses below",
              "Track a simulated portfolio value over 30+ minutes of polling and report the strategy's P&L and win rate",
            ]}
            endpoints={["/getStock?ticker="]}
          />
          <AssignmentCard
            title="Macro Sensitivity Model"
            difficulty="Advanced"
            timeEst="1–2 days"
            objectives={[
              "Collect /getMacro and /getStocks data across multiple ticks over an extended session and build a time-series dataset",
              "Fit a regression model predicting individual stock returns from macro variables: interest rate, inflation, GDP growth, VIX",
              "Identify which tickers have the highest macro sensitivity and whether beta correlates with the model's coefficients",
            ]}
            endpoints={["/getMacro", "/getStocks"]}
          />
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

        <div className="mt-8 bg-card border border-border rounded-xl p-6">
          <p className="text-sm font-bold text-foreground mb-6">Self-hosted setup overview</p>
          <div>
            <Step n={1} title="Clone the repository" body="The full source is available on GitHub. Clone it onto any server running Node.js 18+ and MySQL 8 (or Supabase for the hosted database path)." />
            <Step n={2} title="Configure environment variables" body="Copy .env.example to .env and supply your database credentials. The tick interval, base prices, and volatility values are all editable in server/simulation.js before starting." />
            <Step n={3} title="Initialise the database" body="Run the provided schema migration to create the stocks_state and market_state tables. The tick worker will populate them on first run using STOCK_DEFS." />
            <Step n={4} title="Start the simulation server" body="npm run server starts the Express API and tick worker. The simulation begins immediately and persists state to the database between restarts." />
            <Step n={5} title="Serve the frontend (optional)" body="npm run build produces a static frontend that can be served from any web host. Students can access the full market UI and charts at whatever URL you deploy to." />
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

      {/* ── Glossary ── */}
      <div className="mb-16">
        <SectionLabel>Glossary</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-2">Financial terms explained</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xl">
          Plain-English explanations of every term Polymart uses, and how each appears in the API.
        </p>

        <div className="relative max-w-sm mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={glossarySearch}
            onChange={e => setGlossarySearch(e.target.value)}
            placeholder="Search terms…"
            className="pl-9 text-sm"
          />
        </div>

        <div className="max-w-3xl">
          <Accordion type="multiple" className="space-y-2">
            {filteredGlossary.map((item, i) => (
              <AccordionItem
                key={item.term}
                value={String(i)}
                className="bg-card border border-border rounded-xl px-5 data-[state=open]:border-ring transition-colors"
              >
                <AccordionTrigger className="text-sm font-semibold text-foreground py-4 hover:no-underline text-left">
                  {item.term}
                </AccordionTrigger>
                <AccordionContent className="pb-4 space-y-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.def}</p>
                  <p className="text-[11px] text-muted-foreground/70 bg-muted/40 rounded-lg px-3 py-2 leading-relaxed">
                    <span className="font-semibold text-muted-foreground">In Polymart: </span>{item.polymart}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
            {filteredGlossary.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No terms matching &ldquo;{glossarySearch}&rdquo;</p>
            )}
          </Accordion>
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
                a: "The hosted API applies a sliding window rate limit of 60 requests per minute per IP address. The getStocks endpoint (which returns all tickers) counts as 3 tokens toward this limit due to its payload size. For classroom use, individual polling intervals of 5 seconds per student are well within limits.",
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
            Open the live market view, try the interactive student tools, or read the API reference to start building.
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
            onClick={() => onNavigate("edu-tools")}
            className="flex items-center gap-2 px-4 py-2 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium cursor-pointer hover:bg-accent transition-colors"
          >
            Student Tools
            <Wrench className="w-3.5 h-3.5" />
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
