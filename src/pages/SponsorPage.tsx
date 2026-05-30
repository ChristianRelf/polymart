import type { LucideIcon } from "lucide-react"
import { Heart, Coffee, Zap, Shield, ArrowUpRight, Star, BarChart2, Layers, BookOpen, Check } from "lucide-react"
import type { Route } from "@/lib/routes"

interface Props {
  onNavigate: (r: Route) => void
}

const KOFI_URL = "https://ko-fi.com/polymartco"

const PREMIUM_FEATURES: { Icon: LucideIcon; title: string; desc: string }[] = [
  {
    Icon: BarChart2,
    title: "5 portfolios",
    desc: "Run multiple strategies in parallel - growth, income, swing trading - each with a $100,000 starting balance.",
  },
  {
    Icon: Layers,
    title: "Forex trading",
    desc: "Trade 28 simulated currency pairs including majors, minors, and exotics. Unavailable on the free plan.",
  },
  {
    Icon: Zap,
    title: "100 open positions",
    desc: "Build larger, more diversified paper portfolios. Free accounts are limited to 10 positions per portfolio.",
  },
  {
    Icon: BookOpen,
    title: "Export order history",
    desc: "Download your full trade history as CSV to analyse your paper trading performance in your own tools.",
  },
  {
    Icon: Shield,
    title: "10 watchlists",
    desc: "Organise symbols across multiple watchlists with up to 200 items each. Free accounts get 1 watchlist.",
  },
  {
    Icon: Heart,
    title: "Support development",
    desc: "Premium subscriptions directly fund server costs, new features, and keeping the platform free for everyone.",
  },
]

const FREE_LIMITS = [
  "1 portfolio · $10,000 starting balance",
  "Stocks only (no forex)",
  "10 open positions",
  "1 watchlist · 20 items",
]

const PREMIUM_LIMITS = [
  "5 portfolios · $100,000 starting balance each",
  "Stocks + Forex (28 pairs)",
  "100 open positions per portfolio",
  "10 watchlists · 200 items each",
  "CSV export of order history",
]

export default function SponsorPage({ onNavigate: _onNavigate }: Props) {
  return (
    <div className="max-w-[900px] mx-auto px-6 sm:px-8 py-16">

      {/* Hero */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border rounded-full px-3 py-1">
            <Star className="w-3 h-3 text-amber-400" />
            Premium
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4 leading-[1.06]">
          Upgrade your paper trading
        </h1>

        <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-8">
          Polymart is free for everyone. Premium unlocks higher limits, forex markets,
          multiple portfolios, and more - and directly funds the platform staying live.
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            href="/#/account"
            className="inline-flex items-center gap-2.5 bg-foreground text-background font-semibold text-sm px-6 py-3 rounded-xl transition-opacity hover:opacity-90 no-underline"
          >
            <Star className="w-4 h-4" />
            Get Premium
            <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
          </a>
          <a
            href="/#/sign-up"
            className="inline-flex items-center gap-2 border border-border text-foreground font-semibold text-sm px-5 py-3 rounded-xl transition-colors hover:bg-muted/40 no-underline"
          >
            Create free account
          </a>
        </div>
      </div>

      {/* Plan comparison */}
      <div className="grid sm:grid-cols-2 gap-4 mb-14">
        {/* Free */}
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Free</p>
          <p className="text-2xl font-extrabold text-foreground mb-4">$0 / month</p>
          <ul className="space-y-2">
            {FREE_LIMITS.map(l => (
              <li key={l} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground/50" />
                {l}
              </li>
            ))}
          </ul>
        </div>

        {/* Premium */}
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-6 relative overflow-hidden">
          <div className="absolute top-3 right-3">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded-full">
              Recommended
            </span>
          </div>
          <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-2">Premium</p>
          <p className="text-2xl font-extrabold text-foreground mb-1">Monthly subscription</p>
          <p className="text-xs text-muted-foreground mb-4">Cancel anytime from your account settings</p>
          <ul className="space-y-2">
            {PREMIUM_LIMITS.map(l => (
              <li key={l} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                {l}
              </li>
            ))}
          </ul>
          <a
            href="/#/account"
            className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm px-4 py-2.5 rounded-lg transition-colors no-underline"
          >
            <Star className="w-4 h-4" />
            Upgrade to Premium
          </a>
        </div>
      </div>

      {/* Feature grid */}
      <div className="mb-14">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-4">
          What you unlock
        </p>
        <h2 className="text-xl font-bold text-foreground mb-6">Everything in Premium</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {PREMIUM_FEATURES.map((p) => (
            <div key={p.title} className="rounded-xl border border-border bg-card p-5">
              <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center mb-4">
                <p.Icon className="w-4 h-4" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1.5">{p.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-border mb-10" />

      {/* Ko-fi section */}
      <div className="mb-10">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-4">
          One-time support
        </p>
        <h2 className="text-xl font-bold text-foreground mb-3">Buy us a coffee</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mb-6">
          Not ready for a subscription? A one-time Ko-fi donation goes directly toward
          server costs and is always appreciated. Supporters are listed below.
        </p>

        <a
          href={KOFI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 bg-[#FF5E5B] hover:bg-[#e54e4b] text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors no-underline mb-8"
        >
          <Coffee className="w-4 h-4" />
          Sponsor on Ko-fi
          <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
        </a>

        <div className="rounded-2xl border border-border overflow-hidden">
          <iframe
            id="kofiframe"
            src={`${KOFI_URL}/?hidefeed=false&widget=true&embed=true&preview=true`}
            className="border-none w-full block"
            height="680"
            title="Polymart Ko-fi supporters"
          />
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="rounded-2xl border border-border bg-card p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex-1">
          <p className="text-base font-bold text-foreground mb-1.5">Ready to upgrade?</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sign in or create a free account, then upgrade to Premium from your account settings.
            Cancel anytime - no lock-in.
          </p>
        </div>
        <a
          href="/#/account"
          className="inline-flex items-center gap-2 bg-foreground text-background font-semibold text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90 shrink-0 no-underline"
        >
          <Star className="w-4 h-4" />
          Get Premium
        </a>
      </div>
    </div>
  )
}
