import { SignUp } from "@clerk/clerk-react"
import { TrendingUp, BarChart2, Globe, Target, Activity } from "lucide-react"
import { useSimulation } from "@/lib/SimulationContext"

const FEATURES = [
  { icon: Activity,  text: "Live market simulation, updated every 10 seconds" },
  { icon: BarChart2, text: "132 stocks across 20 sectors plus 40 forex pairs" },
  { icon: TrendingUp, text: "Portfolio analytics with P&L tracking" },
  { icon: Target,    text: "Risk-free paper trading with real market data" },
  { icon: Globe,     text: "Full REST API for bots, screeners and custom tools" },
]

function fearGreedColor(score: number) {
  if (score <= 25) return "text-red-400"
  if (score <= 45) return "text-orange-400"
  if (score <= 55) return "text-yellow-400"
  if (score <= 75) return "text-lime-400"
  return "text-emerald-400"
}

export default function SignUpPage() {
  const { market } = useSimulation()

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Left panel - marketing */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] bg-foreground text-background px-12 py-14">
        <div>
          <img
            src="/polymartlogoblack.png"
            alt="Polymart"
            className="h-9 mb-12 brightness-0 invert select-none"
            draggable={false}
          />

          <h1 className="text-4xl font-bold leading-tight mb-4">
            Start trading.<br />No risk. No cost.
          </h1>
          <p className="text-background/60 text-base mb-10 max-w-sm">
            Create a free account and get $10,000 in virtual cash to start paper
            trading with live market data in seconds.
          </p>

          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <div className="shrink-0 w-7 h-7 rounded-lg bg-background/10 flex items-center justify-center mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-background/80" />
                </div>
                <span className="text-sm text-background/80 leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Live stats strip */}
        {market && (
          <div className="border-t border-background/10 pt-6 grid grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] text-background/40 uppercase tracking-wide mb-1">Index</p>
              <p className="text-sm font-semibold">
                {market.index.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                <span className={`ml-1.5 text-xs ${market.indexChangePct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {market.indexChangePct >= 0 ? "+" : ""}{market.indexChangePct.toFixed(2)}%
                </span>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-background/40 uppercase tracking-wide mb-1">Fear &amp; Greed</p>
              <p className={`text-sm font-semibold ${fearGreedColor(market.fearGreed)}`}>
                {market.fearGreed} <span className="text-xs font-normal">{market.fearGreedLabel}</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-background/40 uppercase tracking-wide mb-1">VIX</p>
              <p className="text-sm font-semibold">{market.vix.toFixed(1)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Right panel - auth widget */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 bg-background">
        {/* Mobile-only logo */}
        <img
          src="/polymartlogoblack.png"
          alt="Polymart"
          className="h-8 mb-8 lg:hidden select-none dark:invert"
          draggable={false}
        />

        <SignUp
          routing="virtual"
          signInUrl="/#/sign-in"
          afterSignUpUrl="/#/dashboard"
          appearance={{
            elements: {
              card: "shadow-xl rounded-2xl",
              rootBox: "w-full max-w-sm",
            },
          }}
        />
      </div>
    </div>
  )
}
