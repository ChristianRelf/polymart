import { useState, useEffect } from "react"
import { ArrowLeft, Calendar, MapPin, Users, Building2, TrendingUp, TrendingDown, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Route } from "@/App"

const GAIN = "#5bce8a"
const LOSS = "#e8696a"
const NEUT = "#eab34d"
const BLUE = "#7c8af4"

type NewsItem = {
  headline: string
  sentiment: "positive" | "negative" | "neutral"
  source: string
  publishedAt: string
}

type MarketSnapshot = {
  price: number
  change: number
  changeSinceOpen: number
  hi52w: number
  lo52w: number
  allTimeHigh: number
  volume: number
  session: string
  beta: number
  atr: number
  rsi: number
  streak: number
  sma20: number
  sma50: number
  macd: number
  macdHist: number
  bbUpper: number
  bbLower: number
}

type CompanyInfo = {
  ticker: string
  companyName: string
  description: string
  founded: number
  hq: string
  ceo: string
  employees: number
  exchange: string
  industry: string
  sectorKey: string
  sectorLabel: string
  sectorIcon: string
  peers: string[]
  market: MarketSnapshot
  macro: { fearGreed: number; interestRate: number; inflation: number; vix: number }
  analystRating: { rating: string; score: number; analystCount: number }
  news: NewsItem[]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const fmtVol = (v: number) =>
  v > 1e9 ? `${(v / 1e9).toFixed(1)}B` :
  v > 1e6 ? `${(v / 1e6).toFixed(1)}M` :
  v > 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v)

interface Props {
  ticker: string
  onNavigate: (r: Route) => void
  onNavigateToInfo: (ticker: string) => void
}

export default function StockInfoPage({ ticker, onNavigate, onNavigateToInfo }: Props) {
  const [info, setInfo] = useState<CompanyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ticker) return
    setLoading(true)
    setError(null)
    fetch(`/api/v1/info?ticker=${ticker}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setInfo(data)
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [ticker])

  // Refresh market data every 10s
  useEffect(() => {
    if (!ticker) return
    const id = setInterval(() => {
      fetch(`/api/v1/info?ticker=${ticker}`)
        .then(r => r.json())
        .then(data => { if (!data.error) setInfo(data) })
        .catch(() => {})
    }, 10_000)
    return () => clearInterval(id)
  }, [ticker])

  const Breadcrumb = () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 sm:mb-8">
      <button
        onClick={() => onNavigate("market")}
        className="hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0 flex items-center gap-1.5"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Market
      </button>
      <span className="opacity-40">/</span>
      <span className="font-mono font-semibold text-foreground/70">{ticker}</span>
      <span className="opacity-40">/</span>
      <span className="text-foreground/50">Company Info</span>
    </div>
  )

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumb />
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading company info...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !info) {
    return (
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumb />
        <p className="text-muted-foreground">{error ?? `No company data found for ${ticker}.`}</p>
      </div>
    )
  }

  const { market: mkt, analystRating: ar, news } = info
  const up = mkt.change >= 0

  const ratingColor =
    ar.rating === "Strong Buy"   ? GAIN :
    ar.rating === "Buy"          ? "#7effc8" :
    ar.rating === "Underperform" ? LOSS : NEUT

  const sessionCfg: Record<string, { label: string; color: string }> = {
    open:   { label: "OPEN",   color: GAIN },
    pre:    { label: "PRE",    color: NEUT },
    post:   { label: "AFTER",  color: BLUE },
    closed: { label: "CLOSED", color: "rgba(255,255,255,0.3)" },
    halted: { label: "HALTED", color: LOSS },
  }
  const sess = sessionCfg[mkt.session] ?? sessionCfg.open

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Breadcrumb />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded font-mono border border-border text-muted-foreground">
              {info.exchange}
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded"
              style={{ color: sess.color, background: `${sess.color}18` }}
            >
              {sess.label}
            </span>
            <Badge variant="outline" className="text-xs border-border">
              {info.sectorIcon} {info.sectorLabel}
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-1 leading-tight">
            {info.companyName}
          </h1>
          <p className="text-base font-mono text-muted-foreground mb-4">{ticker} · {info.industry}</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {info.description}
          </p>
        </div>

        {/* Live price card */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:w-52 shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Live Price</p>
          <p className="text-4xl font-extrabold font-mono tabular-nums mb-1" style={{ color: up ? GAIN : LOSS }}>
            {mkt.price.toFixed(2)}
          </p>
          <p className="text-lg font-bold font-mono tabular-nums" style={{ color: up ? GAIN : LOSS }}>
            {up ? "+" : ""}{mkt.change.toFixed(2)}%
          </p>
          <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">52w H</p>
              <p className="text-xs font-mono font-semibold text-foreground">{mkt.hi52w.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">52w L</p>
              <p className="text-xs font-mono font-semibold text-foreground">{mkt.lo52w.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Company vitals grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
        {[
          { icon: <Calendar  className="w-3.5 h-3.5" />, label: "Founded",   val: String(info.founded) },
          { icon: <MapPin    className="w-3.5 h-3.5" />, label: "HQ",        val: info.hq },
          { icon: <Users     className="w-3.5 h-3.5" />, label: "Employees", val: info.employees.toLocaleString() },
          { icon: <Building2 className="w-3.5 h-3.5" />, label: "CEO",       val: info.ceo },
          { icon: <Info      className="w-3.5 h-3.5" />, label: "Exchange",  val: info.exchange },
        ].map((item, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              {item.icon}
              <p className="text-[10px] font-semibold uppercase tracking-widest">{item.label}</p>
            </div>
            <p className="text-sm font-semibold text-foreground leading-snug">{item.val}</p>
          </div>
        ))}
      </div>

      {/* ── Main two-column layout ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: news + peers */}
        <div className="lg:col-span-2 space-y-8">

          {/* News feed */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4">Latest News</p>
            <div className="space-y-2">
              {news.length === 0 && (
                <p className="text-sm text-muted-foreground">No news available.</p>
              )}
              {news.map((item, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded shrink-0"
                          style={{
                            color: item.sentiment === "positive" ? GAIN : item.sentiment === "negative" ? LOSS : NEUT,
                            background: item.sentiment === "positive" ? "rgba(91,206,138,.1)" : item.sentiment === "negative" ? "rgba(232,105,106,.1)" : "rgba(234,179,77,.1)",
                          }}
                        >
                          {item.sentiment}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">{item.source}</span>
                      </div>
                      <p className="text-sm text-foreground leading-snug">{item.headline}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/50 font-mono shrink-0 mt-0.5 tabular-nums whitespace-nowrap">
                      {timeAgo(item.publishedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sector peers */}
          {info.peers.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4">
                {info.sectorIcon} Sector Peers
              </p>
              <div className="flex flex-wrap gap-2">
                {info.peers.map(pt => (
                  <button
                    key={pt}
                    onClick={() => onNavigateToInfo(pt)}
                    className="bg-card border border-border rounded-lg px-3 py-2 text-sm font-bold font-mono text-foreground hover:bg-accent hover:border-ring transition-all cursor-pointer"
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: analyst rating + market snapshot + CTA */}
        <div className="space-y-4">

          {/* Analyst consensus */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4">Analyst Consensus</p>
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-2xl font-extrabold" style={{ color: ratingColor }}>{ar.rating}</span>
              <span className="text-sm text-muted-foreground font-mono">{ar.score.toFixed(1)} / 5.0</span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden mb-1">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(ar.score / 5) * 100}%`, background: ratingColor }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Underperform</span>
              <span>Strong Buy</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{ar.analystCount} analysts covering {ticker}</p>
          </div>

          {/* Market snapshot */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4">Market Snapshot</p>
            <div className="space-y-0">
              {[
                { label: "RSI (14)",  val: mkt.rsi.toFixed(0),                color: mkt.rsi > 70 ? LOSS : mkt.rsi < 30 ? GAIN : NEUT },
                { label: "Beta",      val: mkt.beta.toFixed(2),               color: undefined },
                { label: "Volume",    val: fmtVol(mkt.volume),                color: undefined },
                { label: "ATR (14)",  val: mkt.atr.toFixed(2),                color: undefined },
                { label: "SMA 20",    val: mkt.sma20.toFixed(2),              color: mkt.price > mkt.sma20 ? GAIN : LOSS },
                { label: "SMA 50",    val: mkt.sma50.toFixed(2),              color: mkt.price > mkt.sma50 ? GAIN : LOSS },
                { label: "Streak",    val: `${mkt.streak > 0 ? "▲" : mkt.streak < 0 ? "▼" : "-"} ${Math.abs(mkt.streak)}`, color: mkt.streak > 0 ? GAIN : mkt.streak < 0 ? LOSS : undefined },
                { label: "ATH",       val: mkt.allTimeHigh.toFixed(2),        color: undefined },
              ].map((r, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className="text-xs font-bold font-mono tabular-nums" style={{ color: r.color ?? "var(--foreground)" }}>
                    {r.val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* View chart CTA */}
          <button
            onClick={() => onNavigate("market")}
            className="w-full bg-foreground text-background font-semibold text-sm py-3 rounded-xl hover:opacity-90 transition-opacity cursor-pointer border-0 flex items-center justify-center gap-2"
          >
            {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            View Chart in Market
          </button>
        </div>
      </div>
    </div>
  )
}
