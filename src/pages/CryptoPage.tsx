import { useState, useEffect, useRef, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ArrowLeft, Search, TrendingUp, TrendingDown, ChevronUp, ChevronDown, Loader as Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSimulation } from "@/lib/SimulationContext"
import type { CryptoSummary, CryptoDetail, CryptoCategoryInfo } from "@/lib/SimulationContext"
import type { Route } from "@/lib/routes"

interface Props {
  onNavigate: (route: Route) => void
}

// ── Colour palette ────────────────────────────────────────────────────────────
const GAIN = "#5bce8a"
const LOSS = "#e8696a"
const NEUT = "#eab34d"
const BLUE = "#7c8af4"
const DIM  = "rgba(255,255,255,0.18)"
const BG   = "oklch(0.138 0.004 264)"
const CARD = "oklch(0.165 0.004 264)"

// ── Category colours ──────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  l1:         "bg-blue-500/15 text-blue-400 border-blue-500/30",
  l2:         "bg-violet-500/15 text-violet-400 border-violet-500/30",
  defi:       "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  meme:       "bg-pink-500/15 text-pink-400 border-pink-500/30",
  gamefi:     "bg-orange-500/15 text-orange-400 border-orange-500/30",
  ai:         "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  privacy:    "bg-gray-500/15 text-gray-400 border-gray-500/30",
  infra:      "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  oracle:     "bg-purple-500/15 text-purple-400 border-purple-500/30",
  exchange:   "bg-teal-500/15 text-teal-400 border-teal-500/30",
  metaverse:  "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  stablecoin: "bg-green-500/15 text-green-400 border-green-500/30",
}

// ── Price formatting ──────────────────────────────────────────────────────────
function fmtPrice(price: number): string {
  if (price >= 1)      return price.toFixed(2)
  if (price >= 0.01)   return price.toFixed(4)
  if (price >= 0.0001) return price.toFixed(6)
  return price.toFixed(8)
}

function fmtCap(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`
  return `$${v.toFixed(0)}`
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className="text-lg font-bold font-mono tabular-nums leading-none" style={{ color: color ?? "var(--foreground)" }}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground font-mono tabular-nums">{sub}</p>}
    </div>
  )
}

// ── Sort icon ─────────────────────────────────────────────────────────────────
function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronUp className="w-3 h-3 opacity-20" />
  return dir === "asc" ? <ChevronUp className="w-3 h-3 opacity-70" /> : <ChevronDown className="w-3 h-3 opacity-70" />
}

// ── Category badge ────────────────────────────────────────────────────────────
function CatBadge({ cat, icon }: { cat: string; icon?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0 h-4 border font-bold uppercase tracking-wider rounded-full",
      CAT_COLORS[cat] ?? "bg-muted text-muted-foreground border-border"
    )}>
      {icon && <span className="text-[9px]">{icon}</span>}
      {cat}
    </span>
  )
}

// ── Signal badge ──────────────────────────────────────────────────────────────
function Signal({ bull }: { bull: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
      style={{ color: bull ? GAIN : LOSS, background: bull ? "rgba(91,206,138,.1)" : "rgba(232,105,106,.1)" }}
    >
      {bull ? "▲ BULL" : "▼ BEAR"}
    </span>
  )
}

// ── StatRow ───────────────────────────────────────────────────────────────────
function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-mono tabular-nums font-semibold" style={{ color: color ?? "var(--foreground)" }}>{value}</span>
    </div>
  )
}

// ── Mini sparkline ────────────────────────────────────────────────────────────
function Sparkline({ history, up }: { history: number[]; up: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || history.length < 2) return
    const dpr = window.devicePixelRatio || 1
    cv.width = Math.round(cv.clientWidth * dpr)
    cv.height = Math.round(cv.clientHeight * dpr)
    const ctx = cv.getContext("2d")!
    ctx.scale(dpr, dpr)
    const W = cv.clientWidth, H = cv.clientHeight
    const mn = Math.min(...history), mx = Math.max(...history)
    const rng = mx - mn || 1
    const toY = (v: number) => H - ((v - mn) / rng) * H * 0.8 - H * 0.1
    ctx.clearRect(0, 0, W, H)
    ctx.beginPath()
    history.forEach((v, i) => {
      const x = (i / (history.length - 1)) * W
      i === 0 ? ctx.moveTo(x, toY(v)) : ctx.lineTo(x, toY(v))
    })
    ctx.strokeStyle = up ? GAIN : LOSS
    ctx.lineWidth = 1.5
    ctx.stroke()
  }, [history, up])
  return <canvas ref={ref} className="w-16 h-8" />
}

// ── Price chart ───────────────────────────────────────────────────────────────
function CryptoChart({ history, price, sma20, sma50, bbUpper, bbMiddle, bbLower }: {
  history: number[]; price: number; sma20: number; sma50: number
  bbUpper: number; bbMiddle: number; bbLower: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || history.length < 3) return
    const dpr = window.devicePixelRatio || 1
    const W = cv.clientWidth, H = cv.clientHeight
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr)
    const ctx = cv.getContext("2d")!
    ctx.scale(dpr, dpr)
    const fontSize = 11
    const priceTagW = 80
    const pad = { t: 20, r: priceTagW + 4, b: 28, l: 8 }
    const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b

    const vals = [...history, bbUpper, bbLower]
    const mn = Math.min(...vals) * 0.998
    const mx = Math.max(...vals) * 1.002
    const rng = mx - mn || 1
    const toY = (v: number) => pad.t + ((mx - v) / rng) * cH

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = "rgba(255,255,255,0.04)"
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH / 4) * i
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke()
      ctx.fillStyle = DIM
      ctx.font = `${fontSize}px 'DM Mono',monospace`
      ctx.textAlign = "left"
      ctx.fillText(fmtPrice(mx - (i / 4) * rng), W - pad.r + 6, y + fontSize * 0.4)
    }

    ctx.beginPath()
    history.forEach((_, i) => {
      const x = pad.l + (i / (history.length - 1)) * cW
      i === 0 ? ctx.moveTo(x, toY(bbUpper)) : ctx.lineTo(x, toY(bbUpper))
    })
    history.slice().reverse().forEach((_, i) => {
      const x = pad.l + ((history.length - 1 - i) / (history.length - 1)) * cW
      ctx.lineTo(x, toY(bbLower))
    })
    ctx.closePath()
    ctx.fillStyle = "rgba(124,138,244,0.06)"
    ctx.fill()

    const drawLine = (vals: number[], color: string, dash: number[] = []) => {
      ctx.beginPath(); ctx.setLineDash(dash)
      ctx.strokeStyle = color; ctx.lineWidth = 1
      vals.forEach((v, i) => {
        const x = pad.l + (i / (vals.length - 1)) * cW
        i === 0 ? ctx.moveTo(x, toY(v)) : ctx.lineTo(x, toY(v))
      })
      ctx.stroke(); ctx.setLineDash([])
    }
    drawLine(history.map(() => bbUpper),  "rgba(124,138,244,0.5)", [3, 3])
    drawLine(history.map(() => bbMiddle), "rgba(124,138,244,0.3)", [2, 4])
    drawLine(history.map(() => bbLower),  "rgba(124,138,244,0.5)", [3, 3])
    drawLine(history.map(() => sma20),    "rgba(91,206,138,0.5)")
    drawLine(history.map(() => sma50),    "rgba(232,105,106,0.5)")

    const isUp = history.length > 1 && history[history.length - 1] >= history[0]
    ctx.beginPath()
    history.forEach((v, i) => {
      const x = pad.l + (i / (history.length - 1)) * cW
      i === 0 ? ctx.moveTo(x, toY(v)) : ctx.lineTo(x, toY(v))
    })
    ctx.strokeStyle = isUp ? GAIN : LOSS
    ctx.lineWidth = 2
    ctx.stroke()

    const py = toY(price)
    ctx.setLineDash([4, 3])
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad.l, py); ctx.lineTo(W - pad.r - 2, py); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = CARD
    ctx.fillRect(W - pad.r, py - 9, pad.r - 2, 18)
    ctx.fillStyle = "rgba(255,255,255,0.9)"
    ctx.font = `bold ${fontSize}px 'DM Mono',monospace`
    ctx.textAlign = "left"
    ctx.fillText(fmtPrice(price), W - pad.r + 5, py + fontSize * 0.38)

    const legend = [
      { label: "BB", color: "rgba(124,138,244,0.7)" },
      { label: "SMA20", color: GAIN },
      { label: "SMA50", color: LOSS },
    ]
    ctx.font = `${fontSize}px 'DM Mono',monospace`
    let lx = pad.l + 4
    legend.forEach(l => {
      ctx.fillStyle = l.color
      ctx.fillRect(lx, pad.t - 6, 12, 2); lx += 14
      ctx.fillStyle = "rgba(255,255,255,0.5)"
      ctx.fillText(l.label, lx, pad.t - 2); lx += ctx.measureText(l.label).width + 12
    })
  }, [history, price, sma20, sma50, bbUpper, bbMiddle, bbLower])
  return <canvas ref={ref} className="w-full rounded-t-lg block" style={{ background: BG, height: 260 }} />
}

// ── Coin row ──────────────────────────────────────────────────────────────────
function CoinRow({ coin, catIcon, onClick, active }: {
  coin: CryptoSummary; catIcon: string; onClick: () => void; active: boolean
}) {
  const up = coin.changePct >= 0
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b border-border/50 cursor-pointer hover:bg-card/60 transition-colors",
        active && "bg-card/80"
      )}
    >
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold font-mono shrink-0">
            {catIcon}
          </div>
          <div className="min-w-0">
            <div className="font-bold font-mono text-sm text-foreground">{coin.symbol}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[110px]">{coin.name}</div>
          </div>
          <CatBadge cat={coin.category} />
        </div>
      </td>
      <td className="px-3 py-3 text-right">
        <div className="font-semibold font-mono text-sm tabular-nums text-foreground">{fmtPrice(coin.price)}</div>
        <div className="text-xs font-mono text-muted-foreground tabular-nums">{fmtCap(coin.marketCap)}</div>
      </td>
      <td className="px-3 py-3 text-right">
        <span className="inline-flex items-center gap-1 font-semibold font-mono text-sm tabular-nums" style={{ color: up ? GAIN : LOSS }}>
          {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {up ? "+" : ""}{coin.changePct.toFixed(2)}%
        </span>
      </td>
      <td className="px-3 py-3 text-right hidden md:table-cell">
        <span className="text-sm font-mono tabular-nums" style={{ color: coin.rsi > 70 ? LOSS : coin.rsi < 30 ? GAIN : NEUT }}>
          {coin.rsi.toFixed(1)}
        </span>
      </td>
      <td className="px-3 py-3 hidden lg:table-cell">
        <Sparkline history={[]} up={up} />
      </td>
      <td className="px-2 py-3 text-right">
        <span className="text-muted-foreground text-sm">›</span>
      </td>
    </tr>
  )
}

// ── Coin detail panel ─────────────────────────────────────────────────────────
function CoinDetail({ coin: summary, catIcon, onClose }: {
  coin: CryptoSummary; catIcon: string; onClose: () => void
}) {
  const { getCryptoDetail } = useSimulation()
  const [detail, setDetail] = useState<CryptoDetail | null>(null)
  const [tab, setTab] = useState("overview")

  useEffect(() => {
    setDetail(null)
    getCryptoDetail(summary.symbol).then(setDetail)
  }, [summary.symbol, getCryptoDetail])

  const up = summary.changePct >= 0
  const def = detail ?? summary

  const bbPos = def.bbUpper > def.bbLower
    ? Math.round(((summary.price - def.bbLower) / (def.bbUpper - def.bbLower)) * 100)
    : 50

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
      {/* Back */}
      <div className="px-5 pt-4 pb-2 border-b border-border flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to coins
        </button>
      </div>

      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl shrink-0">
              {catIcon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-2xl font-extrabold font-mono text-foreground">{summary.symbol}</span>
                <CatBadge cat={summary.category} />
              </div>
              <p className="text-sm text-muted-foreground">{summary.name}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-extrabold font-mono tabular-nums text-foreground">
              {fmtPrice(summary.price)}
            </div>
            <div className={cn("text-sm font-mono font-semibold", up ? "text-green-400" : "text-red-400")}>
              {up ? "+" : ""}{summary.changePct.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-border border-b border-border">
        {[
          { label: "Bid",       value: fmtPrice(summary.bid),          color: GAIN },
          { label: "Ask",       value: fmtPrice(summary.ask),          color: LOSS },
          { label: "24h Hi",    value: fmtPrice(summary.hi24h)                     },
          { label: "24h Lo",    value: fmtPrice(summary.lo24h)                     },
          { label: "Mkt Cap",   value: fmtCap(summary.marketCap),      color: BLUE },
          { label: "RSI",       value: summary.rsi.toFixed(1),          color: summary.rsi > 70 ? LOSS : summary.rsi < 30 ? GAIN : undefined },
        ].map(s => (
          <div key={s.label} className="bg-card/60 px-3 py-2.5 text-center">
            <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">{s.label}</div>
            <div className="text-xs font-bold font-mono tabular-nums" style={{ color: s.color ?? "var(--foreground)" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="overview"  className="flex-1 text-xs">Overview</TabsTrigger>
            <TabsTrigger value="chart"     className="flex-1 text-xs">Chart</TabsTrigger>
            <TabsTrigger value="technical" className="flex-1 text-xs">Technical</TabsTrigger>
            <TabsTrigger value="meta"      className="flex-1 text-xs">Info</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <div className="rounded-xl bg-background border border-border p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Price Range</p>
              <StatRow label="24h High"      value={fmtPrice(summary.hi24h)}     color={GAIN} />
              <StatRow label="24h Low"       value={fmtPrice(summary.lo24h)}     color={LOSS} />
              <StatRow label="52-Week High"  value={fmtPrice(summary.hi52w)} />
              <StatRow label="% from 52w Hi" value={(summary.pctFrom52wHigh >= 0 ? "+" : "") + summary.pctFrom52wHigh.toFixed(2) + "%"} color={summary.pctFrom52wHigh >= 0 ? GAIN : LOSS} />
              <StatRow label="All-Time High" value={fmtPrice(summary.ath)} />
              <StatRow label="% from ATH"    value={(summary.pctFromAth >= 0 ? "+" : "") + summary.pctFromAth.toFixed(2) + "%"}         color={summary.pctFromAth >= 0 ? GAIN : LOSS} />
              <StatRow label="ATR"           value={fmtPrice(summary.atr)} />
            </div>

            <div className="rounded-xl bg-background border border-border p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Market</p>
              <StatRow label="Market Cap"          value={fmtCap(summary.marketCap)}          color={BLUE} />
              <StatRow label="Dominance"           value={summary.dominance.toFixed(4) + "%"} />
              <StatRow label="Circulating Supply"  value={summary.circulatingSupply.toLocaleString()} />
              <StatRow label="Total Supply"        value={summary.totalSupply.toLocaleString()} />
              <StatRow label="Volume (24h)"        value={summary.volume.toLocaleString()} />
            </div>

            <div className="rounded-xl bg-background border border-border p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Order Flow</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-xl p-3 text-center" style={{ background: "rgba(91,206,138,.07)", border: `1px solid ${GAIN}30` }}>
                  <p className="text-[10px] font-bold uppercase mb-1" style={{ color: GAIN }}>BID</p>
                  <p className="text-lg font-extrabold font-mono tabular-nums" style={{ color: GAIN }}>{fmtPrice(summary.bid)}</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: "rgba(232,105,106,.07)", border: `1px solid ${LOSS}30` }}>
                  <p className="text-[10px] font-bold uppercase mb-1" style={{ color: LOSS }}>ASK</p>
                  <p className="text-lg font-extrabold font-mono tabular-nums" style={{ color: LOSS }}>{fmtPrice(summary.ask)}</p>
                </div>
              </div>
              <StatRow label="Spread %" value={summary.spreadPct.toFixed(4) + "%"} color={NEUT} />
            </div>
          </TabsContent>

          {/* Chart */}
          <TabsContent value="chart">
            {detail && detail.history.length > 3 ? (
              <div className="rounded-xl overflow-hidden border border-border">
                <CryptoChart
                  history={detail.history}
                  price={summary.price}
                  sma20={summary.sma20}
                  sma50={summary.sma50}
                  bbUpper={summary.bbUpper}
                  bbMiddle={summary.bbMiddle}
                  bbLower={summary.bbLower}
                />
                <div className="p-4 border-t border-border bg-card/40 space-y-1">
                  <StatRow label="SMA 20"   value={fmtPrice(summary.sma20)} />
                  <StatRow label="SMA 50"   value={fmtPrice(summary.sma50)} />
                  <StatRow label="BB Upper" value={fmtPrice(summary.bbUpper)} color={BLUE} />
                  <StatRow label="BB Lower" value={fmtPrice(summary.bbLower)} color={BLUE} />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading chart data...
              </div>
            )}
          </TabsContent>

          {/* Technical */}
          <TabsContent value="technical" className="space-y-4">
            <div className="rounded-xl bg-background border border-border p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">RSI (14)</p>
                <Signal bull={summary.rsi < 50} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Oversold (30)</span>
                <span className="font-mono font-bold" style={{ color: summary.rsi > 70 ? LOSS : summary.rsi < 30 ? GAIN : NEUT }}>{summary.rsi.toFixed(1)}</span>
                <span>Overbought (70)</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${summary.rsi}%`, background: summary.rsi > 70 ? LOSS : summary.rsi < 30 ? GAIN : BLUE }} />
              </div>
            </div>

            <div className="rounded-xl bg-background border border-border p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Stochastic (14, 3)</p>
                <Signal bull={summary.stochK < 50} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Oversold (20)</span>
                <span className="font-mono font-bold" style={{ color: summary.stochK > 80 ? LOSS : summary.stochK < 20 ? GAIN : NEUT }}>%K {summary.stochK.toFixed(1)}</span>
                <span>Overbought (80)</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, Math.min(98, summary.stochK))}%`, background: summary.stochK > 80 ? LOSS : summary.stochK < 20 ? GAIN : BLUE }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Signal (%D)</span>
                <span className="font-mono font-bold" style={{ color: summary.stochD > 80 ? LOSS : summary.stochD < 20 ? GAIN : NEUT }}>%D {summary.stochD.toFixed(1)}</span>
                <span />
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, Math.min(98, summary.stochD))}%`, background: "rgba(255,255,255,0.2)" }} />
              </div>
            </div>

            <div className="rounded-xl bg-background border border-border p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">MACD (12,26,9)</p>
                <Signal bull={summary.macdHist >= 0} />
              </div>
              <StatRow label="MACD Line"   value={(summary.macd >= 0 ? "+" : "") + summary.macd.toFixed(6)}           color={BLUE} />
              <StatRow label="Signal Line" value={(summary.macdSignal >= 0 ? "+" : "") + summary.macdSignal.toFixed(6)} color={NEUT} />
              <StatRow label="Histogram"   value={(summary.macdHist >= 0 ? "+" : "") + summary.macdHist.toFixed(6)}    color={summary.macdHist >= 0 ? GAIN : LOSS} />
            </div>

            <div className="rounded-xl bg-background border border-border p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">CCI (20)</p>
                <Signal bull={summary.cci > 0} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Oversold (-100)</span>
                <span className="font-mono font-bold" style={{ color: summary.cci > 100 ? LOSS : summary.cci < -100 ? GAIN : NEUT }}>
                  {summary.cci >= 0 ? "+" : ""}{summary.cci.toFixed(1)}
                </span>
                <span>Overbought (+100)</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${Math.max(2, Math.min(98, (summary.cci + 200) / 4))}%`,
                  background: summary.cci > 100 ? LOSS : summary.cci < -100 ? GAIN : BLUE,
                }} />
              </div>
            </div>

            <div className="rounded-xl bg-background border border-border p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Bollinger Bands (20, 2σ)</p>
                <span className="text-xs font-mono text-muted-foreground">BW {(summary.bbBw * 100).toFixed(2)}%</span>
              </div>
              <StatRow label="Upper Band"     value={fmtPrice(summary.bbUpper)}  color={BLUE} />
              <StatRow label="Middle (SMA20)" value={fmtPrice(summary.bbMiddle)} color="var(--muted-foreground)" />
              <StatRow label="Lower Band"     value={fmtPrice(summary.bbLower)}  color={BLUE} />
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Price within bands</span><span className="font-mono">{bbPos}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(bbPos, 98))}%`, background: BLUE }} />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-background border border-border p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Moving Averages</p>
              {([["SMA 20", summary.sma20], ["SMA 50", summary.sma50]] as [string, number][]).map(([label, val]) => {
                const abv = summary.price > val
                return (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono tabular-nums">{fmtPrice(val)}</span>
                      <span className="text-xs font-mono" style={{ color: abv ? GAIN : LOSS }}>{abv ? "▲" : "▼"}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* Info / Meta */}
          <TabsContent value="meta" className="space-y-4">
            <div className="rounded-xl bg-background border border-border p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">About {summary.symbol}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{summary.description || "No description available."}</p>
            </div>

            <div className="rounded-xl bg-background border border-border p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Chain Details</p>
              <StatRow label="Blockchain"  value={summary.blockchain} color={BLUE} />
              <StatRow label="Consensus"   value={summary.consensus} />
              <StatRow label="Category"    value={summary.category.toUpperCase()} />
              <StatRow label="Market Tier" value={summary.mcapTier} />
            </div>

            {detail && detail.categoryPeers.length > 0 && (
              <div className="rounded-xl bg-background border border-border p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Category Peers</p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.categoryPeers.slice(0, 20).map(sym => (
                    <span key={sym} className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {sym}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ── Category icons map (passed down from parent) ───────────────────────────────
const CAT_ICONS: Record<string, string> = {
  l1: "⛓️", l2: "🔗", defi: "🏦", meme: "🐸", gamefi: "🎮",
  ai: "🤖", privacy: "🔒", infra: "🏗️", oracle: "🔮",
  exchange: "💱", metaverse: "🌐", stablecoin: "🪙",
}

// ── Main Crypto Page ──────────────────────────────────────────────────────────
export default function CryptoPage({ onNavigate }: Props) {
  const { cryptoCoins, cryptoCategories, loading, lastRefresh } = useSimulation()
  const [search, setSearch]         = useState("")
  const [category, setCategory]     = useState("all")
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [sortKey, setSortKey]       = useState<"symbol" | "price" | "changePct" | "marketCap" | "rsi">("marketCap")
  const [sortDir, setSortDir]       = useState<"asc" | "desc">("desc")

  const coins = Object.values(cryptoCoins)

  const filtered = useMemo(() => {
    let list = [...coins]
    if (category !== "all") list = list.filter(c => c.category === category)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(c =>
        c.symbol.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q)   ||
        c.category.toLowerCase().includes(q) ||
        c.blockchain.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      const va = a[sortKey as keyof CryptoSummary] as number | string
      const vb = b[sortKey as keyof CryptoSummary] as number | string
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb as string) : (vb as string).localeCompare(va)
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number)
    })
    return list
  }, [coins, category, search, sortKey, sortDir])

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  const selected = selectedSymbol ? cryptoCoins[selectedSymbol] : null
  const gainers  = coins.filter(c => c.changePct > 0).length
  const losers   = coins.filter(c => c.changePct < 0).length
  const totalMktCap = coins.reduce((s, c) => s + c.marketCap, 0)
  const btcDom = cryptoCoins["BTCX"]?.dominance ?? 0
  const catKeys = Object.keys(cryptoCategories)

  if (loading && coins.length === 0) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Connecting to crypto simulation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-6 sm:py-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("market")}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">Crypto Market</h1>
            <p className="text-base text-muted-foreground">132 coins · 12 categories · 24/7 simulation</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-muted-foreground">
            {lastRefresh > 0 ? `Updated ${new Date(lastRefresh).toLocaleTimeString()}` : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
        <StatCard label="Total Market Cap" value={fmtCap(totalMktCap)}        sub={`${coins.length} coins`}         color={BLUE} />
        <StatCard label="BTC Dominance"    value={btcDom.toFixed(2) + "%"}    sub="BTCX share of total cap" />
        <StatCard label="Gainers"          value={gainers.toString()}          sub={`${coins.length > 0 ? ((gainers / coins.length) * 100).toFixed(0) : 0}% bullish`} color={GAIN} />
        <StatCard label="Losers"           value={losers.toString()}           sub={`${coins.length > 0 ? ((losers  / coins.length) * 100).toFixed(0) : 0}% bearish`} color={LOSS} />
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          <button
            key="all"
            onClick={() => setCategory("all")}
            className={cn(
              "text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wide transition-colors cursor-pointer border",
              category === "all"
                ? "bg-foreground text-background border-foreground"
                : "text-muted-foreground hover:text-foreground bg-card border-border"
            )}
          >
            All
          </button>
          {catKeys.map(key => {
            const info = cryptoCategories[key] as CryptoCategoryInfo
            return (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={cn(
                  "text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wide transition-colors cursor-pointer border",
                  category === key
                    ? "bg-foreground text-background border-foreground"
                    : "text-muted-foreground hover:text-foreground bg-card border-border"
                )}
              >
                {CAT_ICONS[key]} {info?.label ?? key}
              </button>
            )
          })}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search coins..."
            className="pl-8 h-8 text-xs w-52 bg-card"
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-6 items-start">

        {/* Coin list */}
        <div className={cn(
          "bg-card border border-border rounded-xl overflow-hidden flex flex-col shrink-0",
          selected ? "hidden xl:flex" : "flex-1",
          selected && "xl:w-[520px]"
        )}>
          {/* Column headers */}
          <div className="border-b border-border bg-card/50">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-3 py-2.5 text-left">
                    <button onClick={() => toggleSort("symbol")} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground cursor-pointer">
                      Coin <SortIcon active={sortKey === "symbol"} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <button onClick={() => toggleSort("price")} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground cursor-pointer ml-auto">
                      Price / Cap <SortIcon active={sortKey === "price"} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <button onClick={() => toggleSort("changePct")} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground cursor-pointer ml-auto">
                      Change <SortIcon active={sortKey === "changePct"} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-right hidden md:table-cell">
                    <button onClick={() => toggleSort("rsi")} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground cursor-pointer ml-auto">
                      RSI <SortIcon active={sortKey === "rsi"} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 hidden lg:table-cell" />
                  <th className="px-2 py-2.5 w-4" />
                </tr>
              </thead>
            </table>
          </div>

          {/* Rows */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 420px)" }}>
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">No coins found</div>
            ) : (
              <table className="w-full">
                <tbody>
                  {filtered.map(c => (
                    <CoinRow
                      key={c.symbol}
                      coin={c}
                      catIcon={CAT_ICONS[c.category] ?? "₿"}
                      onClick={() => setSelectedSymbol(c.symbol === selectedSymbol ? null : c.symbol)}
                      active={c.symbol === selectedSymbol}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-border/50 bg-card/20">
            <p className="text-[10px] text-muted-foreground">
              {filtered.length} of {coins.length} coins
              {lastRefresh > 0 && <> · updated {new Date(lastRefresh).toLocaleTimeString()}</>}
            </p>
          </div>
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="flex-1 min-w-0">
            <CoinDetail coin={selected} catIcon={CAT_ICONS[selected.category] ?? "₿"} onClose={() => setSelectedSymbol(null)} />
          </div>
        ) : (
          <div className="hidden xl:flex flex-1 items-center justify-center flex-col gap-3 text-center p-12 bg-card border border-border rounded-xl min-h-[300px]">
            <div className="text-4xl mb-2 select-none">₿</div>
            <h3 className="text-lg font-bold text-foreground">Select a cryptocurrency</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Click any coin to view live prices, technical analysis, charts, and chain details.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {Object.entries(CAT_ICONS).slice(0, 6).map(([cat, icon]) => (
                <span key={cat} className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border", CAT_COLORS[cat])}>
                  {icon} {cat}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
