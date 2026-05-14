import { useState, useEffect, useRef, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ArrowLeft, Search, TrendingUp, TrendingDown, Info, ChevronUp, ChevronDown, Loader as Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSimulation } from "@/lib/SimulationContext"
import type { ForexPairSummary, ForexPairDetail } from "@/lib/SimulationContext"
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

// ── Currency flag component ───────────────────────────────────────────────────
function CurrencyFlag({ flag, size = "sm" }: { flag: string; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "w-8 h-8 text-xl" : size === "md" ? "w-6 h-6 text-base" : "w-5 h-5 text-sm"
  return (
    <span className={cn(
      "inline-flex items-center justify-center rounded-full bg-white/5 border border-white/10 select-none leading-none overflow-hidden flex-shrink-0",
      dim
    )}>
      {flag || "🏳"}
    </span>
  )
}

function PairFlags({ baseFlag, quoteFlag, size = "sm" }: { baseFlag: string; quoteFlag: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span className="relative inline-flex items-center flex-shrink-0" style={{ width: size === "lg" ? 44 : size === "md" ? 36 : 30 }}>
      <CurrencyFlag flag={baseFlag} size={size} />
      <span className={cn("absolute", size === "lg" ? "-right-1 -bottom-1" : "-right-1 -bottom-0.5")}>
        <CurrencyFlag flag={quoteFlag} size={size === "lg" ? "md" : "sm"} />
      </span>
    </span>
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
function ForexChart({ history, price, sma20, sma50, bbUpper, bbMiddle, bbLower }: {
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
    const priceTagW = 72
    const pad = { t: 20, r: priceTagW + 4, b: 28, l: 8 }
    const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b

    const vals = [...history, bbUpper, bbLower]
    const mn = Math.min(...vals) * 0.9998
    const mx = Math.max(...vals) * 1.0002
    const rng = mx - mn || 1
    const toY = (v: number) => pad.t + ((mx - v) / rng) * cH

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, H)

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)"
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH / 4) * i
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke()
      ctx.fillStyle = DIM
      ctx.font = `${fontSize}px 'DM Mono',monospace`
      ctx.textAlign = "left"
      ctx.fillText((mx - (i / 4) * rng).toFixed(4), W - pad.r + 6, y + fontSize * 0.4)
    }

    // BB fill
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

    // BB lines
    const drawLine = (vals: number[], color: string, dash: number[] = []) => {
      ctx.beginPath(); ctx.setLineDash(dash)
      ctx.strokeStyle = color; ctx.lineWidth = 1
      vals.forEach((v, i) => {
        const x = pad.l + (i / (vals.length - 1)) * cW
        i === 0 ? ctx.moveTo(x, toY(v)) : ctx.lineTo(x, toY(v))
      })
      ctx.stroke(); ctx.setLineDash([])
    }
    const bbULine = history.map(() => bbUpper)
    const bbMLine = history.map(() => bbMiddle)
    const bbLLine = history.map(() => bbLower)
    const sma20Line = history.map(() => sma20)
    const sma50Line = history.map(() => sma50)

    drawLine(bbULine, "rgba(124,138,244,0.5)", [3, 3])
    drawLine(bbMLine, "rgba(124,138,244,0.3)", [2, 4])
    drawLine(bbLLine, "rgba(124,138,244,0.5)", [3, 3])
    drawLine(sma20Line, "rgba(91,206,138,0.5)")
    drawLine(sma50Line, "rgba(232,105,106,0.5)")

    // Price line
    const isUp = history.length > 1 && history[history.length - 1] >= history[0]
    ctx.beginPath()
    history.forEach((v, i) => {
      const x = pad.l + (i / (history.length - 1)) * cW
      i === 0 ? ctx.moveTo(x, toY(v)) : ctx.lineTo(x, toY(v))
    })
    ctx.strokeStyle = isUp ? GAIN : LOSS
    ctx.lineWidth = 2
    ctx.stroke()

    // Current price tag
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
    ctx.fillText(price.toFixed(4), W - pad.r + 5, py + fontSize * 0.38)

    // Legend
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

// ── Stat row helper ───────────────────────────────────────────────────────────
function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-mono tabular-nums font-semibold" style={{ color: color ?? "var(--foreground)" }}>{value}</span>
    </div>
  )
}

function Signal({ bull }: { bull: boolean }) {
  return <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", bull ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400")}>{bull ? "▲ BULL" : "▼ BEAR"}</span>
}

// ── Category badge ────────────────────────────────────────────────────────────
const CAT_COLORS = {
  major:  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  minor:  "bg-violet-500/15 text-violet-400 border-violet-500/30",
  exotic: "bg-amber-500/15 text-amber-400 border-amber-500/30",
}

function CatBadge({ cat }: { cat: string }) {
  return (
    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider border", CAT_COLORS[cat as keyof typeof CAT_COLORS] ?? "bg-muted text-muted-foreground border-transparent")}>
      {cat}
    </span>
  )
}

// ── Pair row ──────────────────────────────────────────────────────────────────
function PairRow({ pair, onClick, active }: { pair: ForexPairSummary; onClick: () => void; active: boolean }) {
  const up = pair.change >= 0
  const decimals = pair.decimals ?? 4
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left cursor-pointer",
        active ? "bg-accent border border-border" : "hover:bg-accent/50 border border-transparent"
      )}
    >
      {/* Flags */}
      <PairFlags baseFlag={pair.baseFlag} quoteFlag={pair.quoteFlag} />

      {/* Symbol + category */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm font-bold text-foreground font-mono">{pair.base}/{pair.quote}</span>
          <CatBadge cat={pair.category} />
        </div>
        <span className="text-[11px] text-muted-foreground truncate block">{pair.baseName}</span>
      </div>

      {/* Price + change */}
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold font-mono tabular-nums text-foreground">{pair.price.toFixed(decimals)}</div>
        <div className={cn("text-xs font-mono tabular-nums font-semibold", up ? "text-green-400" : "text-red-400")}>
          {up ? "+" : ""}{pair.change.toFixed(decimals === 2 ? 2 : 4)}%
        </div>
      </div>

      {/* Sparkline */}
      <div className="hidden sm:block flex-shrink-0">
        <Sparkline history={[]} up={up} />
      </div>
    </button>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function PairDetail({ pair: summary, onClose }: { pair: ForexPairSummary; onClose: () => void }) {
  const { getForexPair } = useSimulation()
  const [detail, setDetail] = useState<ForexPairDetail | null>(null)
  const [tab, setTab] = useState("overview")

  useEffect(() => {
    setDetail(null)
    getForexPair(summary.pair).then(setDetail)
  }, [summary.pair, getForexPair])

  const decimals = summary.decimals ?? 4
  const up = summary.change >= 0
  const def = detail ?? summary

  const bbPos = def.bbUpper > def.bbLower
    ? Math.round(((summary.price - def.bbLower) / (def.bbUpper - def.bbLower)) * 100)
    : 50

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border flex-shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <PairFlags baseFlag={summary.baseFlag} quoteFlag={summary.quoteFlag} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold font-mono text-foreground">{summary.base}/{summary.quote}</span>
            <CatBadge cat={summary.category} />
          </div>
          <div className="text-xs text-muted-foreground">{summary.baseName} / {summary.quoteName}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold font-mono tabular-nums text-foreground">
            {summary.price.toFixed(decimals)}
          </div>
          <div className={cn("text-sm font-mono font-semibold", up ? "text-green-400" : "text-red-400")}>
            {up ? "+" : ""}{summary.change.toFixed(decimals === 2 ? 2 : 4)}%
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Bid",    value: summary.bid.toFixed(decimals), color: GAIN },
            { label: "Ask",    value: summary.ask.toFixed(decimals), color: LOSS },
            { label: "Spread", value: `${summary.spreadPips} pips`, color: NEUT },
            { label: "Hi Session", value: summary.hiSession.toFixed(decimals) },
            { label: "Lo Session", value: summary.loSession.toFixed(decimals) },
            { label: "RSI",    value: summary.rsi.toFixed(1), color: summary.rsi > 70 ? LOSS : summary.rsi < 30 ? GAIN : undefined },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-card border border-border p-2.5 text-center">
              <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">{s.label}</div>
              <div className="text-xs font-bold font-mono tabular-nums" style={{ color: s.color ?? "var(--foreground)" }}>{s.value}</div>
            </div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full mb-3">
            <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
            <TabsTrigger value="chart"    className="flex-1 text-xs">Chart</TabsTrigger>
            <TabsTrigger value="technical" className="flex-1 text-xs">Technical</TabsTrigger>
            <TabsTrigger value="education" className="flex-1 text-xs">Learn</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Price Range</p>
              <StatRow label="Session High" value={summary.hiSession.toFixed(decimals)} color={GAIN} />
              <StatRow label="Session Low"  value={summary.loSession.toFixed(decimals)} color={LOSS} />
              <StatRow label="52-Week High"  value={summary.hi52w.toFixed(decimals)} />
              <StatRow label="52-Week Low"   value={summary.lo52w.toFixed(decimals)} />
              <StatRow label="ATR"           value={summary.atr.toFixed(decimals)} />
            </div>

            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Market Depth</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-xl p-3 text-center" style={{ background: "rgba(91,206,138,.07)", border: `1px solid ${GAIN}30` }}>
                  <p className="text-[10px] font-bold uppercase mb-1" style={{ color: GAIN }}>BID</p>
                  <p className="text-lg font-extrabold font-mono" style={{ color: GAIN }}>{summary.bid.toFixed(decimals)}</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: "rgba(232,105,106,.07)", border: `1px solid ${LOSS}30` }}>
                  <p className="text-[10px] font-bold uppercase mb-1" style={{ color: LOSS }}>ASK</p>
                  <p className="text-lg font-extrabold font-mono" style={{ color: LOSS }}>{summary.ask.toFixed(decimals)}</p>
                </div>
              </div>
              <StatRow label="Spread (pips)" value={summary.spreadPips} color={NEUT} />
              <StatRow label="Pip Size" value={String(summary.pipSize)} />
            </div>

            {detail && detail.factSheet && (
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Fact Sheet</p>
                {Object.entries(detail.factSheet).map(([k, v]) => (
                  <StatRow key={k} label={k.replace(/([A-Z])/g, ' $1').trim()} value={String(v)} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Chart */}
          <TabsContent value="chart">
            {detail && detail.history.length > 3 ? (
              <div className="rounded-xl overflow-hidden border border-border">
                <ForexChart
                  history={detail.history}
                  price={summary.price}
                  sma20={summary.sma20}
                  sma50={summary.sma50}
                  bbUpper={summary.bbUpper}
                  bbMiddle={summary.bbMiddle}
                  bbLower={summary.bbLower}
                />
                <div className="p-4 border-t border-border bg-card/40 space-y-1">
                  <StatRow label="SMA 20" value={summary.sma20.toFixed(decimals)} />
                  <StatRow label="SMA 50" value={summary.sma50.toFixed(decimals)} />
                  <StatRow label="BB Upper" value={summary.bbUpper.toFixed(decimals)} color={BLUE} />
                  <StatRow label="BB Lower" value={summary.bbLower.toFixed(decimals)} color={BLUE} />
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
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">RSI (14)</p>
                <Signal bull={summary.rsi < 50} />
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Oversold (30)</span><span className="font-mono font-bold" style={{ color: summary.rsi > 70 ? LOSS : summary.rsi < 30 ? GAIN : NEUT }}>{summary.rsi.toFixed(1)}</span><span>Overbought (70)</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${summary.rsi}%`, background: summary.rsi > 70 ? LOSS : summary.rsi < 30 ? GAIN : BLUE }} />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">MACD (12,26,9)</p>
                <Signal bull={summary.macdHist >= 0} />
              </div>
              <StatRow label="MACD Line"   value={(summary.macd >= 0 ? "+" : "") + summary.macd.toFixed(5)}     color={BLUE} />
              <StatRow label="Signal Line" value={(summary.macdSignal >= 0 ? "+" : "") + summary.macdSignal.toFixed(5)} color={NEUT} />
              <StatRow label="Histogram"   value={(summary.macdHist >= 0 ? "+" : "") + summary.macdHist.toFixed(5)}  color={summary.macdHist >= 0 ? GAIN : LOSS} />
            </div>

            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Bollinger Bands (20, 2σ)</p>
                <span className="text-xs font-mono text-muted-foreground">BW {(summary.bbBw * 100).toFixed(2)}%</span>
              </div>
              <StatRow label="Upper Band"    value={summary.bbUpper.toFixed(decimals)}  color={BLUE} />
              <StatRow label="Middle (SMA20)" value={summary.bbMiddle.toFixed(decimals)} color="var(--muted-foreground)" />
              <StatRow label="Lower Band"    value={summary.bbLower.toFixed(decimals)}  color={BLUE} />
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Price within bands</span><span className="font-mono">{bbPos}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(bbPos, 98))}%`, background: BLUE }} />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Moving Averages</p>
              {([["SMA 20", summary.sma20], ["SMA 50", summary.sma50]] as [string, number][]).map(([label, val]) => {
                const abv = summary.price > val
                return (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono tabular-nums">{val.toFixed(decimals)}</span>
                      <span className="text-xs font-mono" style={{ color: abv ? GAIN : LOSS }}>{abv ? "▲" : "▼"}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* Education */}
          <TabsContent value="education" className="space-y-4">
            {detail ? (
              <>
                <div className="rounded-xl bg-card border border-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <PairFlags baseFlag={summary.baseFlag} quoteFlag={summary.quoteFlag} size="md" />
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">About {summary.base}/{summary.quote}</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{detail.description}</p>
                </div>

                <div className="rounded-xl bg-card border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Key Economic Drivers</p>
                  <ul className="space-y-2">
                    {detail.economicDrivers.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-card border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Currencies</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-background/40 border border-border/50 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <CurrencyFlag flag={summary.baseFlag} size="md" />
                        <div>
                          <div className="text-sm font-bold">{summary.base}</div>
                          <div className="text-[10px] text-muted-foreground">{summary.baseName}</div>
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground">Base currency</div>
                    </div>
                    <div className="rounded-xl bg-background/40 border border-border/50 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <CurrencyFlag flag={summary.quoteFlag} size="md" />
                        <div>
                          <div className="text-sm font-bold">{summary.quote}</div>
                          <div className="text-[10px] text-muted-foreground">{summary.quoteName}</div>
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground">Quote currency</div>
                    </div>
                  </div>
                </div>

                {detail.factSheet && Object.keys(detail.factSheet).length > 0 && (
                  <div className="rounded-xl bg-card border border-border p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Market Facts</p>
                    {Object.entries(detail.factSheet).map(([k, v]) => (
                      <StatRow key={k} label={k} value={String(v)} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ── Main Forex Page ───────────────────────────────────────────────────────────
export default function ForexPage({ onNavigate }: Props) {
  const { forexPairs, loading, lastRefresh } = useSimulation()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<"all" | "major" | "minor" | "exotic">("all")
  const [selectedPair, setSelectedPair] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<"pair" | "price" | "change" | "rsi">("pair")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const pairs = Object.values(forexPairs)

  const filtered = useMemo(() => {
    let list = [...pairs]
    if (category !== "all") list = list.filter(p => p.category === category)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(p =>
        p.pair.toLowerCase().includes(q) ||
        p.base.toLowerCase().includes(q) ||
        p.quote.toLowerCase().includes(q) ||
        p.baseName.toLowerCase().includes(q) ||
        p.quoteName.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      const va = sortKey === "pair" ? a.pair : sortKey === "price" ? a.price : sortKey === "change" ? a.change : a.rsi
      const vb = sortKey === "pair" ? b.pair : sortKey === "price" ? b.price : sortKey === "change" ? b.change : b.rsi
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb as string) : (vb as string).localeCompare(va)
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number)
    })
    return list
  }, [pairs, category, search, sortKey, sortDir])

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  const selected = selectedPair ? forexPairs[selectedPair] : null

  const gainers = pairs.filter(p => p.change > 0).length
  const losers  = pairs.filter(p => p.change < 0).length

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-h-screen overflow-hidden">

      {/* Top bar */}
      <div className="border-b border-border bg-background/95 backdrop-blur px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => onNavigate("market")} className="p-1.5 rounded-lg hover:bg-accent transition-colors cursor-pointer flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">💱</span>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-none">Forex Market</h1>
              <p className="text-[10px] text-muted-foreground">28 currency pairs • live simulation</p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto flex-wrap">
            {/* Summary chips */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-green-400 font-mono"><TrendingUp className="w-3 h-3" />{gainers}</span>
              <span className="flex items-center gap-1 text-red-400 font-mono"><TrendingDown className="w-3 h-3" />{losers}</span>
            </div>

            {/* Category filter */}
            <div className="flex gap-1">
              {(["all", "major", "minor", "exotic"] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide transition-colors cursor-pointer",
                    category === c ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search pairs..."
                className="pl-8 h-7 text-xs w-32 bg-card"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Body: list + detail */}
      <div className="flex flex-1 min-h-0">

        {/* Pairs list */}
        <div className={cn("flex flex-col border-r border-border bg-background", selected ? "hidden lg:flex lg:w-80 xl:w-96 flex-shrink-0" : "flex-1")}>

          {/* Column headers */}
          <div className="flex items-center gap-3 px-3 py-2 border-b border-border/50 bg-card/30 flex-shrink-0">
            <span className="w-[30px] flex-shrink-0" />
            <button onClick={() => toggleSort("pair")} className="flex-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground cursor-pointer">
              Pair {sortKey === "pair" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
            </button>
            <button onClick={() => toggleSort("price")} className="w-24 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground cursor-pointer">
              Price {sortKey === "price" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)}
            </button>
            <button onClick={() => toggleSort("change")} className="w-16 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground cursor-pointer hidden sm:block">
              Chg {sortKey === "change" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loading && pairs.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">No pairs found</div>
            ) : (
              filtered.map(p => (
                <PairRow
                  key={p.pair}
                  pair={p}
                  onClick={() => setSelectedPair(p.pair === selectedPair ? null : p.pair)}
                  active={p.pair === selectedPair}
                />
              ))
            )}
          </div>

          <div className="px-3 py-2 border-t border-border/50 bg-card/20 flex-shrink-0">
            <p className="text-[10px] text-muted-foreground">
              {filtered.length} of {pairs.length} pairs
              {lastRefresh > 0 && <> · updated {new Date(lastRefresh).toLocaleTimeString()}</>}
            </p>
          </div>
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="flex-1 min-w-0 overflow-hidden">
            <PairDetail pair={selected} onClose={() => setSelectedPair(null)} />
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center flex-col gap-3 text-center p-8">
            <div className="text-4xl mb-2">💱</div>
            <h3 className="text-lg font-bold text-foreground">Select a currency pair</h3>
            <p className="text-sm text-muted-foreground max-w-xs">Click any pair to view live rates, technical analysis, and educational content.</p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {["major", "minor", "exotic"].map(c => (
                <span key={c} className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border", CAT_COLORS[c as keyof typeof CAT_COLORS])}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
