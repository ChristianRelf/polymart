import { useState } from "react"
import type { ElementType } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Users, ArrowRight, FileText, Code2, Share2, FlaskConical, GraduationCap, Bot } from "lucide-react"

type Route = "home" | "market" | "api" | "terms" | "privacy" | "education" | "changelog" | "products" | "help" | "widgets" | "edu-tools" | "community" | "community-blog"

interface Props {
  onNavigate: (r: Route) => void
}

type FeedType = "analysis" | "tool" | "resource" | "strategy" | "guide"

type FeedItem = {
  type: FeedType
  title: string
  author: string
  meta: string
  excerpt: string
}

const TYPE_CFG: Record<FeedType, { label: string; color: string; icon: ElementType }> = {
  analysis: { label: "Analysis",  color: "#6366f1", icon: FileText    },
  tool:     { label: "Tool",      color: "#22c55e", icon: Code2       },
  resource: { label: "Resource",  color: "#f59e0b", icon: Share2      },
  strategy: { label: "Strategy",  color: "#a78bfa", icon: FlaskConical },
  guide:    { label: "Guide",     color: "#f59e0b", icon: GraduationCap },
}

const FEED: FeedItem[] = [
  { type: "analysis",  title: "Why the Tech sector leads every bull run",            author: "@trader_k",    meta: "6 min read",           excerpt: "RSI divergence patterns across tech stocks during low fear & greed conditions and what they signal." },
  { type: "tool",      title: "Polymart RSI Alert Bot for Discord",                  author: "@devhive",     meta: "Python · 240 stars",   excerpt: "Sends alerts when any ticker crosses RSI thresholds. Configurable per-ticker, per-channel." },
  { type: "strategy",  title: "Mean-reversion on oversold streaks",                  author: "@quant_r",     meta: "Backtested · +18.4%",  excerpt: "Going long when streak ≤ −5 and RSI < 32 with a 3-tick hold shows a consistent edge in the sim." },
  { type: "resource",  title: "30-day historical feature matrix (CSV)",              author: "@ml_labs",     meta: "132 tickers · 4.2 MB", excerpt: "Complete OHLCV + indicator snapshot for all tickers — good starting point for ML training sets." },
  { type: "analysis",  title: "VIX above 30: how sectors respond",                  author: "@risk_watch",  meta: "4 min read",           excerpt: "Mapping sector beta divergence during elevated VIX periods reveals clear defensive rotation patterns." },
  { type: "tool",      title: "Portfolio Tracker via Telegram",                      author: "@botbuilder",  meta: "JS · 88 stars",        excerpt: "Track a virtual portfolio through Telegram slash commands. Supports multiple portfolios per user." },
  { type: "guide",     title: "Using Polymart for your Algo Trading class",          author: "@prof_chen",   meta: "Lesson plan · PDF",    excerpt: "An 8-week curriculum using Polymart as the live data source for intro algorithmic trading." },
  { type: "resource",  title: "Sector rotation cheat sheet",                         author: "@alpha_notes", meta: "PDF · 1 page",         excerpt: "One-page visual showing which sectors historically outperform at each macro regime in the sim." },
  { type: "strategy",  title: "Bollinger Band squeeze scanner",                      author: "@squeeze_x",   meta: "Python script",        excerpt: "Scans all 132 tickers for BB bandwidth < 5% and flags them as breakout candidates." },
  { type: "analysis",  title: "Insider bias: what the hidden field tells you",       author: "@data_dig",    meta: "3 min read",           excerpt: "A look at the insider_bias field returned by /getStock and what statistically follows extreme values." },
]

const FILTERS: { key: FeedType | "all"; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "analysis", label: "Analysis" },
  { key: "strategy", label: "Strategies" },
  { key: "tool",     label: "Tools" },
  { key: "resource", label: "Resources" },
  { key: "guide",    label: "Guides" },
]

export default function CommunityPage({ onNavigate }: Props) {
  const [filter, setFilter] = useState<FeedType | "all">("all")

  const items = filter === "all" ? FEED : FEED.filter(i => i.type === filter)

  return (
    <div className="max-w-[740px] mx-auto px-4 sm:px-8 py-12 sm:py-16">

      {/* ── Hero ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="text-xs border-border gap-1.5">
            <Users className="w-3 h-3" /> Community
          </Badge>
          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400 bg-amber-500/5">
            In development
          </Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
          Community Feed
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-md">
          Analyses, tools, strategies, and resources shared by the Polymart community.
          Submissions open when the platform launches.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href="https://discord.com/oauth2/authorize?client_id=1503197938027860102"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
            style={{ background: "#5865f2" }}
          >
            <Bot className="w-3.5 h-3.5" />
            Join on Discord
          </a>
          <button
            onClick={() => onNavigate("community-blog")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
          >
            Browse the blog <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer",
              filter === f.key
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="text-[10px] text-muted-foreground/50 ml-1">Preview only — content is illustrative</span>
      </div>

      {/* ── Feed ── */}
      <div className="space-y-2 mb-10">
        {items.map((item, i) => {
          const cfg = TYPE_CFG[item.type]
          return (
            <div
              key={i}
              className="bg-card border border-border rounded-xl px-5 py-4 opacity-60 select-none"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${cfg.color}18` }}
                >
                  <cfg.icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                      style={{ color: cfg.color, background: `${cfg.color}15` }}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 font-mono">{item.meta}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-snug mb-0.5">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{item.excerpt}</p>
                  <p className="text-[10px] text-muted-foreground/40 mt-1.5">{item.author}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Bottom CTA ── */}
      <div className="border border-border rounded-xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground mb-0.5">Want to contribute?</p>
          <p className="text-xs text-muted-foreground">Share your work in Discord while submissions are in development.</p>
        </div>
        <a
          href="https://discord.com/oauth2/authorize?client_id=1503197938027860102"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90 shrink-0"
          style={{ background: "#5865f2" }}
        >
          <Bot className="w-3.5 h-3.5" />
          Add to Discord
          <ArrowRight className="w-3 h-3" />
        </a>
      </div>

    </div>
  )
}
