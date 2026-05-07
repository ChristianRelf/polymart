import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowRight, Zap, ChartBar as BarChart2, Globe, Bot, TrendingUp, Activity, Monitor, Brain, FlaskConical, Rocket, Laugh, Pill, Landmark, Gamepad2, Leaf, Bitcoin, Shield, Utensils, ShoppingCart, Tv as Tv2, Car, Building2, Plane, Bolt as BoltIcon, Package, Wheat } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

type Route = "home" | "market" | "api" | "terms" | "privacy"

interface Props {
  onNavigate: (r: Route) => void
}

const FEATURES = [
  {
    icon: Activity,
    title: "Live Simulation Engine",
    desc: "Prices tick every 3 seconds driven by volatility, momentum, RSI, insider bias, earnings cycles, and macro sensitivity.",
  },
  {
    icon: Zap,
    title: "Dynamic Market Events",
    desc: "Weighted random events fire continuously — flash crashes, FDA approvals, meme frenzies, and geopolitical shocks move entire sectors.",
  },
  {
    icon: BarChart2,
    title: "132 Stocks, 20 Sectors",
    desc: "Tech, AI, Biotech, Crypto, Space, Meme, Energy, Auto, Real Estate, Travel, Logistics, Agriculture, and more. Each with unique character.",
  },
  {
    icon: Globe,
    title: "Macro Variables",
    desc: "Interest rates, inflation, and GDP growth drift over time. Green energy hates rate hikes. Defence loves geopolitical tension.",
  },
  {
    icon: Bot,
    title: "Discord Bot Ready",
    desc: "Pull live market data directly into your server. Query prices, check the index, monitor events — all via slash commands.",
  },
  {
    icon: TrendingUp,
    title: "Open REST API",
    desc: "Every data point accessible via simple GET endpoints. No auth required. Perfect for bots, games, and dashboards.",
  },
]

const SECTORS: { icon: LucideIcon; label: string }[] = [
  { icon: Monitor,      label: "Tech" },
  { icon: Brain,        label: "AI & ML" },
  { icon: FlaskConical, label: "Biotech" },
  { icon: Rocket,       label: "Space" },
  { icon: Laugh,        label: "Meme" },
  { icon: Pill,         label: "Health" },
  { icon: Landmark,     label: "Finance" },
  { icon: Gamepad2,     label: "Gaming" },
  { icon: Leaf,         label: "Green Energy" },
  { icon: Bitcoin,      label: "Crypto" },
  { icon: Shield,       label: "Defence" },
  { icon: Utensils,     label: "Food & Bev" },
  { icon: ShoppingCart, label: "Retail" },
  { icon: Tv2,          label: "Media" },
  { icon: Car,          label: "Auto" },
  { icon: Building2,    label: "Real Estate" },
  { icon: Plane,        label: "Travel" },
  { icon: BoltIcon,     label: "Energy" },
  { icon: Package,      label: "Logistics" },
  { icon: Wheat,        label: "Agriculture" },
]

const STATS = [
  { value: "132", label: "Simulated Stocks" },
  { value: "20", label: "Market Sectors" },
  { value: "10s", label: "Tick Interval" },
  { value: "240+", label: "Event Types" },
]

export default function HomePage({ onNavigate }: Props) {
  return (
    <div className="flex flex-col">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center text-center pt-32 pb-28 px-8 overflow-hidden">
        {/* subtle grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-[0.06] blur-[140px] bg-foreground" />

        <Badge
          variant="outline"
          className="mb-6 px-4 py-1.5 text-xs tracking-[0.15em] uppercase font-medium border-border text-muted-foreground"
        >
          Simulated Stock Market Training Data
        </Badge>

        <h1 className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-extrabold tracking-tight text-balance leading-[1.02] mb-8 max-w-6xl">
          Real market mechanics.
          <br />
          <span className="text-muted-foreground">Fictional data.</span>
        </h1>

        <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mb-12">
          POLYMART runs a persistent simulated stock exchange with 132 companies, 20 sectors, live macro variables,
          and an open API. Built for Discord bots, browser games, and learning how markets behave.
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Button
            size="lg"
            onClick={() => onNavigate("market")}
            className="gap-2 font-semibold px-8"
          >
            View Live Market
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => onNavigate("api")}
            className="font-semibold px-8 border-border"
          >
            API Reference
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="font-semibold px-8 text-muted-foreground"
            asChild
          >
            <a
              href="https://discord.com/api/oauth2/authorize?client_id=POLYMART_BOT&permissions=2147483648&scope=bot+applications.commands"
              target="_blank"
              rel="noopener noreferrer"
            >
              Invite Bot
            </a>
          </Button>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-card/40">
        <div className="max-w-[1600px] mx-auto grid grid-cols-2 sm:grid-cols-4">
          {STATS.map((s, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center py-10 px-6",
                i < STATS.length - 1 && "border-r border-border"
              )}
            >
              <span className="text-5xl lg:text-6xl font-extrabold font-mono text-foreground mb-2 tabular-nums">
                {s.value}
              </span>
              <span className="text-sm text-muted-foreground uppercase tracking-widest">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="max-w-[1600px] mx-auto w-full px-8 py-28">
        <div className="mb-14 max-w-xl">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-4xl font-bold tracking-tight text-foreground">
            A complete market simulation in your pocket
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <div
                key={i}
                className="bg-background p-8 flex flex-col gap-4 hover:bg-card transition-colors duration-200"
              >
                <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <Separator className="bg-border" />

      {/* ── Sectors ──────────────────────────────────────────────────────── */}
      <section className="max-w-[1600px] mx-auto w-full px-8 py-28">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Coverage</p>
            <h2 className="text-4xl font-bold tracking-tight text-foreground">20 sectors simulated</h2>
          </div>
          <Button variant="outline" onClick={() => onNavigate("market")} className="border-border shrink-0">
            Browse all stocks
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-3">
          {SECTORS.map((s, i) => {
            const Icon = s.icon
            return (
              <button
                key={i}
                onClick={() => onNavigate("market")}
                className="flex flex-col items-center gap-2.5 py-6 px-4 bg-card border border-border rounded-xl hover:bg-accent hover:border-ring transition-all duration-150 cursor-pointer group"
              >
                <Icon className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {s.label}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <Separator className="bg-border" />

      {/* ── API preview ──────────────────────────────────────────────────── */}
      <section className="max-w-[1600px] mx-auto w-full px-8 py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Open API</p>
            <h2 className="text-4xl font-bold tracking-tight text-foreground mb-5">
              One GET request.<br />All market data.
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-8">
              No authentication. No rate limits for personal use. The entire simulated market is exposed
              over REST — index, stocks, sectors, events, and health. Designed for Discord bots, games,
              and dashboards.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => onNavigate("api")} className="font-semibold">
                Full API Reference
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>

          {/* Code block */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-card">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md font-mono bg-emerald-500/10 text-emerald-400 tracking-wider">
                GET
              </span>
              <code className="text-sm font-mono text-foreground">
                polymart.co/api/v1/getmarketinfo
              </code>
            </div>
            <pre className="p-6 text-[13px] font-mono text-muted-foreground leading-[1.8] overflow-x-auto bg-background/60">
{`{
  "index": 10842,
  "indexChange": 14.22,
  "fearGreed": 62,
  "fearGreedLabel": "Greed",
  "interestRate": 5.02,
  "inflation": 2.5,
  "gdpGrowth": 2.8,
  "gainers": 34,
  "losers": 26,
  "topGainer": { "ticker": "MEME", "pct": 4.12 },
  "topLoser":  { "ticker": "YOLO", "pct": -3.88 },
  "tickCount": 1204
}`}
            </pre>
          </div>
        </div>
      </section>

      <Separator className="bg-border" />

      {/* ── Discord CTA ──────────────────────────────────────────────────── */}
      <section className="max-w-[1600px] mx-auto w-full px-8 py-28">
        <div className="relative rounded-2xl border border-border bg-card overflow-hidden">
          {/* subtle dot pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(circle, var(--foreground) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-8 p-10 sm:p-14">
            <div className="text-center sm:text-left">
              <h2 className="text-3xl font-bold text-foreground mb-3 tracking-tight">
                Bring POLYMART to your Discord server
              </h2>
              <p className="text-base text-muted-foreground max-w-lg leading-relaxed">
                The POLYMART bot delivers live simulated market data via slash commands.
                Query stock prices, scan sector performance, and watch events fire in real time.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button size="lg" className="font-semibold" asChild>
                <a
                  href="https://discord.com/api/oauth2/authorize?client_id=POLYMART_BOT&permissions=2147483648&scope=bot+applications.commands"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Invite Bot
                </a>
              </Button>
              <Button size="lg" variant="outline" onClick={() => onNavigate("api")} className="font-semibold border-border">
                API Docs
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
