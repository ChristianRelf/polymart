import { useState, useEffect, useRef, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ArrowLeft, TrendingUp, TrendingDown, Search, ChevronUp, ChevronDown, Activity, ChartBar as BarChart2, BookOpen, Zap, TriangleAlert as AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSimulation } from "@/lib/SimulationContext"
import type { StockDetail, Candle } from "@/lib/SimulationContext"

// ── Colour palette ────────────────────────────────────────────────────────────
const GAIN  = "#5bce8a"
const LOSS  = "#e8696a"
const NEUT  = "#eab34d"
const BLUE  = "#7c8af4"
const DIM   = "rgba(255,255,255,0.18)"
const BG    = "oklch(0.138 0.004 264)"
const CARD  = "oklch(0.165 0.004 264)"

// ── Candlestick chart ─────────────────────────────────────────────────────────
function CandleChart({ candles, price, sma20, sma50, bbUpper, bbMiddle, bbLower, vwap }: {
  candles: Candle[]; price: number
  sma20: number; sma50: number
  bbUpper: number; bbMiddle: number; bbLower: number
  vwap: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || candles.length < 2) return
    const dpr = window.devicePixelRatio || 1
    const cssW = cv.clientWidth
    const cssH = cv.clientHeight
    cv.width = Math.round(cssW * dpr)
    cv.height = Math.round(cssH * dpr)
    const ctx = cv.getContext("2d")!
    ctx.scale(dpr, dpr)
    const W = cssW, H = cssH
    const fontSize = 11
    const priceTagW = 70
    const pad = { t: 20, r: priceTagW + 4, b: 36, l: 8 }
    const cW = W - pad.l - pad.r
    const cH = H - pad.t - pad.b

    const vals = candles.flatMap(c => [c.h, c.l])
    vals.push(bbUpper, bbLower)
    const mn = Math.min(...vals) * 0.998
    const mx = Math.max(...vals) * 1.002
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
      ctx.fillText((mx - (i / 4) * rng).toFixed(2), W - pad.r + 6, y + fontSize * 0.4)
    }

    const n = candles.length
    const candleW = Math.max(2, (cW / n) * 0.7)
    const gap = cW / n

    // Bollinger Band fill
    ctx.beginPath()
    ctx.moveTo(pad.l + 0 * gap, toY(candles[0].h))
    candles.forEach((_c, i) => ctx.lineTo(pad.l + i * gap + gap / 2, toY(bbUpper)))
    candles.slice().reverse().forEach((_c, i) => ctx.lineTo(pad.l + (n - 1 - i) * gap + gap / 2, toY(bbLower)))
    ctx.closePath()
    ctx.fillStyle = "rgba(124,138,244,0.06)"
    ctx.fill()

    // BB lines
    const drawLine = (vals: number[], color: string, dash: number[] = []) => {
      ctx.beginPath()
      ctx.setLineDash(dash)
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      vals.forEach((v, i) => {
        const x = pad.l + i * gap + gap / 2
        i === 0 ? ctx.moveTo(x, toY(v)) : ctx.lineTo(x, toY(v))
      })
      ctx.stroke()
      ctx.setLineDash([])
    }

    drawLine(candles.map(() => bbUpper), "rgba(124,138,244,0.5)", [3, 3])
    drawLine(candles.map(() => bbMiddle), "rgba(124,138,244,0.3)", [2, 4])
    drawLine(candles.map(() => bbLower), "rgba(124,138,244,0.5)", [3, 3])
    drawLine(candles.map(() => vwap), "rgba(234,179,77,0.6)", [4, 3])
    drawLine(candles.map(() => sma20), "rgba(91,206,138,0.5)")
    drawLine(candles.map(() => sma50), "rgba(232,105,106,0.5)")

    // Candles
    candles.forEach((c, i) => {
      const x = pad.l + i * gap + gap / 2
      const up = c.c >= c.o
      const col = up ? GAIN : LOSS
      ctx.strokeStyle = col
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, toY(c.h))
      ctx.lineTo(x, toY(c.l))
      ctx.stroke()

      const bodyTop = toY(Math.max(c.o, c.c))
      const bodyBot = toY(Math.min(c.o, c.c))
      const bodyH = Math.max(1, bodyBot - bodyTop)
      ctx.fillStyle = up ? `${GAIN}cc` : `${LOSS}cc`
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH)
    })

    // Current price line
    const py = toY(price)
    ctx.setLineDash([4, 3])
    ctx.strokeStyle = "rgba(255,255,255,0.3)"
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad.l, py); ctx.lineTo(W - pad.r - 2, py); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = CARD
    ctx.fillRect(W - pad.r, py - 9, pad.r - 2, 18)
    ctx.fillStyle = "rgba(255,255,255,0.9)"
    ctx.font = `bold ${fontSize}px 'DM Mono',monospace`
    ctx.textAlign = "left"
    ctx.fillText(price.toFixed(2), W - pad.r + 5, py + fontSize * 0.38)

    // Legend
    const legend = [
      { label: "BB", color: "rgba(124,138,244,0.7)" },
      { label: "VWAP", color: "rgba(234,179,77,0.8)" },
      { label: "SMA20", color: GAIN },
      { label: "SMA50", color: LOSS },
    ]
    ctx.font = `${fontSize}px 'DM Mono',monospace`
    let lx = pad.l + 4
    const legendY = pad.t - 6
    legend.forEach(l => {
      ctx.fillStyle = l.color
      ctx.fillRect(lx, legendY, 12, 2)
      lx += 14
      ctx.fillStyle = "rgba(255,255,255,0.5)"
      ctx.fillText(l.label, lx, legendY + fontSize * 0.5)
      lx += ctx.measureText(l.label).width + 12
    })
  }, [candles, price, sma20, sma50, bbUpper, bbMiddle, bbLower, vwap])

  return (
    <canvas
      ref={ref}
      className="w-full rounded-t-lg block"
      style={{ background: BG, height: 300 }}
    />
  )
}

// ── MACD sub-chart ────────────────────────────────────────────────────────────
function MACDChart({ candles, macd, macdSignal, macdHist }: {
  candles: Candle[]; macd: number; macdSignal: number; macdHist: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || candles.length < 2) return
    const dpr = window.devicePixelRatio || 1
    const cssW = cv.clientWidth
    const cssH = cv.clientHeight
    cv.width = Math.round(cssW * dpr)
    cv.height = Math.round(cssH * dpr)
    const ctx = cv.getContext("2d")!
    ctx.scale(dpr, dpr)
    const W = cssW, H = cssH
    const fontSize = 11
    const pad = { t: 20, r: 74, b: 8, l: 8 }
    const cW = W - pad.l - pad.r
    const cH = H - pad.t - pad.b

    const n = candles.length
    const hists: number[] = []
    let prev = 0
    for (let i = 0; i < n; i++) {
      const noise = (Math.random() - 0.5) * Math.abs(macdHist) * 0.4
      prev = prev * 0.85 + macdHist * 0.15 + noise
      hists.push(prev)
    }
    hists[hists.length - 1] = macdHist

    const mx = Math.max(Math.abs(macdHist) * 2, ...hists.map(Math.abs)) || 0.01
    const toY = (v: number) => pad.t + cH / 2 - (v / mx) * (cH / 2)
    const midY = pad.t + cH / 2

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = "rgba(255,255,255,0.06)"
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad.l, midY); ctx.lineTo(W - pad.r, midY); ctx.stroke()

    const gap = cW / n
    const bw = Math.max(1, gap * 0.65)
    hists.forEach((h, i) => {
      const x = pad.l + i * gap + gap / 2
      const y = toY(h)
      ctx.fillStyle = h >= 0 ? `${GAIN}99` : `${LOSS}99`
      ctx.fillRect(x - bw / 2, Math.min(y, midY), bw, Math.abs(y - midY))
    })

    const macdLine = hists.map((_, i) => macd * (i / n))
    const sigLine = hists.map((_, i) => macdSignal * (i / n))
    macdLine[macdLine.length - 1] = macd
    sigLine[sigLine.length - 1] = macdSignal

    const drawLine2 = (arr: number[], col: string) => {
      ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 1
      arr.forEach((v, i) => {
        const x = pad.l + i * gap + gap / 2
        i === 0 ? ctx.moveTo(x, toY(v)) : ctx.lineTo(x, toY(v))
      })
      ctx.stroke()
    }
    drawLine2(macdLine, "rgba(124,138,244,0.8)")
    drawLine2(sigLine, "rgba(234,179,77,0.7)")

    ctx.fillStyle = "rgba(255,255,255,0.45)"
    ctx.font = `${fontSize}px 'DM Mono',monospace`
    ctx.textAlign = "left"
    ctx.fillText(`MACD ${macd.toFixed(3)}  SIG ${macdSignal.toFixed(3)}  HIST ${macdHist.toFixed(3)}`, pad.l + 4, pad.t - 6)
  }, [candles, macd, macdSignal, macdHist])

  return (
    <canvas
      ref={ref}
      className="w-full rounded-b-lg block border-t border-white/5"
      style={{ background: BG, height: 90 }}
    />
  )
}

// ── Line chart fallback (when candles not yet available) ──────────────────────
function PriceChart({ data, sma20, sma50, vwap, bbUpper, bbLower }: {
  data: number[]; sma20: number; sma50: number; vwap: number; bbUpper: number; bbLower: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || data.length < 2) return
    const dpr = window.devicePixelRatio || 1
    const cssW = cv.clientWidth
    const cssH = cv.clientHeight
    cv.width = Math.round(cssW * dpr)
    cv.height = Math.round(cssH * dpr)
    const ctx = cv.getContext("2d")!
    ctx.scale(dpr, dpr)
    const W = cssW, H = cssH
    const fontSize = 11
    const pad = { t: 14, r: 74, b: 24, l: 8 }
    const cW = W - pad.l - pad.r
    const cH = H - pad.t - pad.b
    const allVals = [...data, bbUpper, bbLower, sma20, sma50, vwap].filter(Boolean)
    const mn = Math.min(...allVals) * 0.997
    const mx = Math.max(...allVals) * 1.003
    const rng = mx - mn || 1
    const up = data[data.length - 1] >= data[0]
    const accent = up ? GAIN : LOSS
    const toY = (v: number) => pad.t + ((mx - v) / rng) * cH

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH / 4) * i
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke()
      ctx.fillStyle = DIM; ctx.font = `${fontSize}px 'DM Mono',monospace`; ctx.textAlign = "left"
      ctx.fillText((mx - (i / 4) * rng).toFixed(2), W - pad.r + 6, y + fontSize * 0.4)
    }

    const pts = data.map((v, i) => ({ x: pad.l + (i / (data.length - 1)) * cW, y: toY(v) }))

    // BB fill
    if (bbUpper && bbLower) {
      ctx.fillStyle = "rgba(124,138,244,0.05)"
      ctx.fillRect(pad.l, toY(bbUpper), cW, toY(bbLower) - toY(bbUpper))
    }

    // Reference lines
    const refLines = [
      { val: sma20, col: "rgba(91,206,138,0.5)" },
      { val: sma50, col: "rgba(232,105,106,0.5)" },
      { val: vwap, col: "rgba(234,179,77,0.6)" },
      { val: bbUpper, col: "rgba(124,138,244,0.4)" },
      { val: bbLower, col: "rgba(124,138,244,0.4)" },
    ]
    refLines.forEach(({ val, col }) => {
      if (!val) return
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
      ctx.beginPath(); ctx.moveTo(pad.l, toY(val)); ctx.lineTo(W - pad.r, toY(val)); ctx.stroke()
      ctx.setLineDash([])
    })

    // Area fill
    const g = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH)
    g.addColorStop(0, up ? "rgba(91,206,138,.10)" : "rgba(232,105,106,.08)")
    g.addColorStop(1, "transparent")
    ctx.beginPath(); ctx.moveTo(pts[0].x, pad.t + cH)
    pts.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.lineTo(pts[pts.length - 1].x, pad.t + cH); ctx.closePath()
    ctx.fillStyle = g; ctx.fill()

    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
    for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y)
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.stroke()

    const last = pts[pts.length - 1]
    ctx.beginPath(); ctx.arc(last.x, last.y, 3, 0, Math.PI * 2)
    ctx.fillStyle = accent; ctx.fill()
  }, [data, sma20, sma50, vwap, bbUpper, bbLower])
  return <canvas ref={ref} className="w-full rounded-lg block" style={{ background: BG, height: 300 }} />
}

// ── Gauge bar (RSI / order flow) ──────────────────────────────────────────────
function GaugeBar({ value, min = 0, max = 100, lowColor = LOSS, highColor = GAIN, midColor = NEUT, label }: {
  value: number; min?: number; max?: number
  lowColor?: string; highColor?: string; midColor?: string; label?: string
}) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  const col = pct < 30 ? lowColor : pct > 70 ? highColor : midColor
  return (
    <div className="w-full">
      {label && <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{label}</p>}
      <div className="relative h-1.5 bg-background rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: col }} />
      </div>
    </div>
  )
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
function StatTile({ label, value, sub, subColor }: {
  label: string; value: string; sub?: string; subColor?: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">{label}</p>
      <p className="text-3xl font-bold font-mono text-foreground tabular-nums">{value}</p>
      {sub && <p className="text-sm font-semibold font-mono mt-1" style={{ color: subColor }}>{sub}</p>}
    </div>
  )
}

// ── Session badge ─────────────────────────────────────────────────────────────
function SessionBadge({ session }: { session: string }) {
  const cfg: Record<string, { label: string; color: string; bg: string }> = {
    open:   { label: "OPEN",    color: GAIN, bg: "rgba(91,206,138,.12)" },
    pre:    { label: "PRE",     color: NEUT, bg: "rgba(234,179,77,.12)" },
    post:   { label: "AFTER",   color: BLUE, bg: "rgba(124,138,244,.12)" },
    closed: { label: "CLOSED",  color: DIM,  bg: "rgba(255,255,255,.06)" },
    halted: { label: "HALTED",  color: LOSS, bg: "rgba(232,105,106,.12)" },
  }
  const c = cfg[session] ?? cfg.open
  return (
    <span className="text-xs font-bold tracking-widest px-2.5 py-1 rounded" style={{ color: c.color, background: c.bg }}>
      {c.label}
    </span>
  )
}

// ── Order flow bar ────────────────────────────────────────────────────────────
function OrderFlowBar({ orderFlow, buyVol, sellVol }: { orderFlow: number; buyVol: number; sellVol: number }) {
  const buyPct = buyVol + sellVol > 0 ? (buyVol / (buyVol + sellVol)) * 100 : 50
  return (
    <div>
      <div className="flex justify-between text-xs font-mono mb-1">
        <span style={{ color: GAIN }}>BUY {buyPct.toFixed(0)}%</span>
        <span className="text-muted-foreground">{orderFlow > 0 ? "+" : ""}{orderFlow.toFixed(1)} net</span>
        <span style={{ color: LOSS }}>SELL {(100 - buyPct).toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex">
        <div className="h-full transition-all duration-500" style={{ width: `${buyPct}%`, background: GAIN }} />
        <div className="h-full flex-1" style={{ background: LOSS }} />
      </div>
    </div>
  )
}

// ── fmtVol ────────────────────────────────────────────────────────────────────
const fmtVol = (v: number) =>
  v > 1e9 ? `${(v / 1e9).toFixed(1)}B` :
  v > 1e6 ? `${(v / 1e6).toFixed(1)}M` :
  v > 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v)

// ── Detail view ───────────────────────────────────────────────────────────────
function StockDetailView({ detail, stocks, onBack, openDetail }: {
  detail: StockDetail
  stocks: Record<string, import("@/lib/SimulationContext").StockSummary>
  onBack: () => void
  openDetail: (t: string) => void
}) {
  const up = detail.change >= 0
  const showCandles = detail.candles && detail.candles.length >= 2

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-10">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 cursor-pointer bg-transparent border-0 p-0"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to market
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-4xl font-extrabold font-mono text-foreground tracking-tight">{detail.ticker}</h1>
            <SessionBadge session={detail.halted ? "halted" : detail.session} />
          </div>
          <p className="text-base text-muted-foreground mb-3">{detail.name}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs border-border capitalize">{detail.sector}</Badge>
            <Badge variant="outline" className="text-xs border-border">{detail.mcap} cap</Badge>
            {detail.volatility != null && (
              <Badge variant="outline" className="text-xs border-border">σ {(detail.volatility * 100).toFixed(0)}%</Badge>
            )}
            <Badge variant="outline" className="text-xs border-border">β {detail.beta.toFixed(2)}</Badge>
            {detail.halted && (
              <Badge className="text-xs border-0 font-bold" style={{ background: "rgba(232,105,106,.15)", color: LOSS }}>
                <AlertTriangle className="w-3 h-3 mr-1" /> HALTED
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-5xl font-extrabold font-mono tabular-nums" style={{ color: up ? GAIN : LOSS }}>
            {detail.price.toFixed(2)}
          </p>
          <p className="text-xl font-bold font-mono mt-1" style={{ color: up ? GAIN : LOSS }}>
            {up ? "+" : ""}{detail.change.toFixed(2)}%
          </p>
          <div className="flex items-center gap-3 mt-2 justify-end">
            <span className="text-sm font-mono text-muted-foreground">
              Bid <span className="text-foreground">{detail.bid.toFixed(2)}</span>
            </span>
            <span className="text-muted-foreground/40">|</span>
            <span className="text-sm font-mono text-muted-foreground">
              Ask <span className="text-foreground">{detail.ask.toFixed(2)}</span>
            </span>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ color: NEUT, background: "rgba(234,179,77,.1)" }}>
              {detail.spreadPct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6 rounded-xl border border-border overflow-hidden">
        {showCandles ? (
          <>
            <CandleChart
              candles={detail.candles}
              price={detail.price}
              sma20={detail.sma20}
              sma50={detail.sma50}
              bbUpper={detail.bbUpper}
              bbMiddle={detail.bbMiddle}
              bbLower={detail.bbLower}
              vwap={detail.vwap}
            />
            <MACDChart
              candles={detail.candles}
              macd={detail.macd}
              macdSignal={detail.macdSignal}
              macdHist={detail.macdHist}
            />
          </>
        ) : detail.history.length > 1 ? (
          <PriceChart
            data={detail.history}
            sma20={detail.sma20}
            sma50={detail.sma50}
            vwap={detail.vwap}
            bbUpper={detail.bbUpper}
            bbLower={detail.bbLower}
          />
        ) : null}
      </div>

      {/* Tabs: Price / Technicals / Order Flow */}
      <Tabs defaultValue="price" className="mb-8">
        <TabsList className="bg-card border border-border mb-4">
          <TabsTrigger value="price" className="text-sm gap-1.5"><BarChart2 className="w-3.5 h-3.5" />Price</TabsTrigger>
          <TabsTrigger value="technicals" className="text-sm gap-1.5"><Activity className="w-3.5 h-3.5" />Technicals</TabsTrigger>
          <TabsTrigger value="orderflow" className="text-sm gap-1.5"><BookOpen className="w-3.5 h-3.5" />Order Flow</TabsTrigger>
        </TabsList>

        {/* ── Price tab ── */}
        <TabsContent value="price">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { label: "Price",       value: detail.price.toFixed(2),                                     color: undefined },
              { label: "Prev Close",  value: detail.previousPrice.toFixed(2),                              color: undefined },
              { label: "Open",        value: detail.openPrice.toFixed(2),                                  color: undefined },
              { label: "VWAP",        value: detail.vwap.toFixed(2),                                       color: NEUT },
              { label: "Change",      value: `${up ? "+" : ""}${detail.change.toFixed(2)}%`,               color: up ? GAIN : LOSS },
              { label: "Since Open",  value: `${detail.changeSinceOpen >= 0 ? "+" : ""}${detail.changeSinceOpen.toFixed(2)}%`, color: detail.changeSinceOpen >= 0 ? GAIN : LOSS },
              { label: "52w High",    value: detail.high52w.toFixed(2),                                    color: undefined },
              { label: "52w Low",     value: detail.low52w.toFixed(2),                                     color: undefined },
              { label: "All Time Hi", value: detail.allTimeHigh.toFixed(2),                                color: undefined },
              { label: "Volume",      value: fmtVol(detail.volume),                                        color: undefined },
              { label: "ATR (14)",    value: detail.atr.toFixed(2),                                        color: undefined },
              { label: "Streak",      value: `${detail.streak > 0 ? "▲" : detail.streak < 0 ? "▼" : "—"} ${Math.abs(detail.streak)}`, color: detail.streak > 0 ? GAIN : detail.streak < 0 ? LOSS : undefined },
            ].map((m, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">{m.label}</p>
                <p className="text-lg font-semibold font-mono tabular-nums" style={{ color: m.color ?? "var(--foreground)" }}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          {/* 52w range */}
          <div className="bg-card border border-border rounded-xl p-5 mt-3">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">52-Week Range</p>
            <div className="flex items-center gap-4">
              <span className="text-sm font-mono text-muted-foreground w-16 text-right tabular-nums">{detail.low52w.toFixed(2)}</span>
              <div className="flex-1 h-2 bg-background rounded-full relative">
                {(() => {
                  const rng = detail.high52w - detail.low52w
                  const pos = rng > 0 ? Math.max(0, Math.min(100, (detail.price - detail.low52w) / rng * 100)) : 50
                  return (
                    <div
                      className="absolute -top-1 w-4 h-4 rounded-full border-2 border-card shadow-md"
                      style={{ left: `${pos}%`, background: BLUE, transform: "translateX(-50%)" }}
                    />
                  )
                })()}
              </div>
              <span className="text-sm font-mono text-muted-foreground w-16 tabular-nums">{detail.high52w.toFixed(2)}</span>
            </div>
          </div>
        </TabsContent>

        {/* ── Technicals tab ── */}
        <TabsContent value="technicals">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* RSI */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">RSI (14)</p>
                <p className="text-xl font-bold font-mono tabular-nums" style={{ color: detail.rsi > 70 ? LOSS : detail.rsi < 30 ? GAIN : NEUT }}>
                  {detail.rsi.toFixed(1)}
                </p>
              </div>
              <GaugeBar value={detail.rsi} />
              <div className="flex justify-between mt-1.5">
                <span className="text-xs" style={{ color: GAIN }}>Oversold 30</span>
                <span className="text-xs" style={{ color: LOSS }}>Overbought 70</span>
              </div>
            </div>

            {/* Moving Averages */}
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Moving Averages</p>
              {[
                { label: "EMA 12", val: detail.ema12, above: detail.price > detail.ema12 },
                { label: "EMA 26", val: detail.ema26, above: detail.price > detail.ema26 },
                { label: "SMA 20", val: detail.sma20, above: detail.price > detail.sma20 },
                { label: "SMA 50", val: detail.sma50, above: detail.price > detail.sma50 },
              ].map((ma, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
                  <span className="text-sm text-muted-foreground">{ma.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono tabular-nums text-foreground">{ma.val.toFixed(2)}</span>
                    <span className="text-xs font-bold" style={{ color: ma.above ? GAIN : LOSS }}>
                      {ma.above ? "ABOVE ▲" : "BELOW ▼"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* MACD */}
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">MACD</p>
              {[
                { label: "MACD Line",    val: detail.macd,       color: BLUE },
                { label: "Signal Line",  val: detail.macdSignal, color: NEUT },
                { label: "Histogram",    val: detail.macdHist,   color: detail.macdHist >= 0 ? GAIN : LOSS },
              ].map((r, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
                  <span className="text-sm text-muted-foreground">{r.label}</span>
                  <span className="text-base font-bold font-mono tabular-nums" style={{ color: r.color }}>
                    {r.val >= 0 ? "+" : ""}{r.val.toFixed(4)}
                  </span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-3">
                Signal: <span className="font-semibold" style={{ color: detail.macdHist > 0 ? GAIN : LOSS }}>
                  {detail.macdHist > 0 ? "Bullish crossover" : "Bearish crossover"}
                </span>
              </p>
            </div>

            {/* Bollinger Bands */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Bollinger Bands (20,2)</p>
                <span className="text-xs font-mono text-muted-foreground">BW {(detail.bbBw * 100).toFixed(1)}%</span>
              </div>
              {[
                { label: "Upper Band",  val: detail.bbUpper,  color: BLUE },
                { label: "Middle (SMA)",val: detail.bbMiddle, color: DIM },
                { label: "Lower Band",  val: detail.bbLower,  color: BLUE },
              ].map((r, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
                  <span className="text-sm text-muted-foreground">{r.label}</span>
                  <span className="text-base font-mono tabular-nums" style={{ color: r.color }}>{r.val.toFixed(2)}</span>
                </div>
              ))}
              <div className="mt-3">
                <GaugeBar
                  value={detail.price}
                  min={detail.bbLower}
                  max={detail.bbUpper}
                  label="Price position within bands"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Order Flow tab ── */}
        <TabsContent value="orderflow">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bid / Ask */}
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Bid / Ask</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center p-3 rounded-lg" style={{ background: "rgba(91,206,138,.08)", border: `1px solid ${GAIN}33` }}>
                  <p className="text-xs text-muted-foreground mb-1">BID</p>
                  <p className="text-2xl font-extrabold font-mono tabular-nums" style={{ color: GAIN }}>{detail.bid.toFixed(2)}</p>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ background: "rgba(232,105,106,.08)", border: `1px solid ${LOSS}33` }}>
                  <p className="text-xs text-muted-foreground mb-1">ASK</p>
                  <p className="text-2xl font-extrabold font-mono tabular-nums" style={{ color: LOSS }}>{detail.ask.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Spread</span>
                <span className="font-mono font-semibold" style={{ color: NEUT }}>
                  {(detail.ask - detail.bid).toFixed(3)} ({detail.spreadPct.toFixed(2)}%)
                </span>
              </div>
            </div>

            {/* VWAP */}
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">VWAP</p>
              <p className="text-3xl font-extrabold font-mono tabular-nums mb-2" style={{ color: NEUT }}>
                {detail.vwap.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                Price vs VWAP:{" "}
                <span className="font-semibold font-mono" style={{ color: detail.price >= detail.vwap ? GAIN : LOSS }}>
                  {detail.price >= detail.vwap ? "+" : ""}{((detail.price - detail.vwap) / detail.vwap * 100).toFixed(2)}%
                  {detail.price >= detail.vwap ? " above" : " below"}
                </span>
              </p>
            </div>

            {/* Order flow */}
            <div className="bg-card border border-border rounded-xl p-5 sm:col-span-2">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Order Flow Imbalance</p>
              <OrderFlowBar orderFlow={detail.orderFlow} buyVol={detail.buyVolume} sellVol={detail.sellVolume} />
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Buy Vol</p>
                  <p className="text-base font-bold font-mono tabular-nums" style={{ color: GAIN }}>{fmtVol(detail.buyVolume)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Vol</p>
                  <p className="text-base font-bold font-mono tabular-nums text-foreground">{fmtVol(detail.volume)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Sell Vol</p>
                  <p className="text-base font-bold font-mono tabular-nums" style={{ color: LOSS }}>{fmtVol(detail.sellVolume)}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sector peers */}
      {detail.sectorPeers && detail.sectorPeers.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Sector Peers</p>
          <div className="flex flex-wrap gap-2">
            {detail.sectorPeers.map(pt => {
              const s = stocks[pt]
              return (
                <button
                  key={pt}
                  onClick={() => openDetail(pt)}
                  className="bg-card border border-border rounded-xl px-4 py-3 text-left hover:bg-accent hover:border-ring transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-6 mb-1">
                    <span className="text-base font-bold font-mono text-foreground">{pt}</span>
                    {s && (
                      <span className="text-sm font-semibold font-mono tabular-nums" style={{ color: s.change >= 0 ? GAIN : LOSS }}>
                        {s.change >= 0 ? "+" : ""}{s.change.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  {s && (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono text-muted-foreground tabular-nums">{s.price.toFixed(2)}</p>
                      {s.halted && <span className="text-xs font-bold" style={{ color: LOSS }}>HALTED</span>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Market list view ──────────────────────────────────────────────────────────
export default function MarketPage() {
  const { market, stocks, sectors, events, loading, getDetail } = useSimulation()

  const [detail, setDetail]   = useState<StockDetail | null>(null)
  const [view, setView]       = useState<"list" | "detail">("list")
  const [search, setSearch]   = useState("")
  const [filter, setFilter]   = useState("all")
  const [sort, setSort]       = useState("ticker")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  useEffect(() => {
    if (detail && view === "detail") {
      getDetail(detail.ticker).then(updated => { if (updated) setDetail(updated) })
    }
  }, [market])

  const openDetail = async (ticker: string) => {
    const d = await getDetail(ticker)
    if (d) { setDetail(d); setView("detail") }
  }

  const sectorList = useMemo(
    () => Object.entries(sectors).sort((a, b) => b[1].avgChange - a[1].avgChange),
    [sectors]
  )

  const sortedStocks = useMemo(() => {
    let entries = Object.entries(stocks)
    if (search) {
      const q = search.toLowerCase()
      entries = entries.filter(([t, s]) =>
        t.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.includes(q)
      )
    } else if (filter !== "all") {
      entries = entries.filter(([, s]) => s.sector === filter)
    }
    entries.sort((a, b) => {
      let cmp = 0
      if      (sort === "price")  cmp = a[1].price - b[1].price
      else if (sort === "change") cmp = a[1].change - b[1].change
      else if (sort === "volume") cmp = a[1].volume - b[1].volume
      else if (sort === "rsi")    cmp = a[1].rsi - b[1].rsi
      else                        cmp = a[0].localeCompare(b[0])
      return sortDir === "asc" ? cmp : -cmp
    })
    return entries
  }, [stocks, search, filter, sort, sortDir])

  const toggleSort = (col: string) => {
    if (sort === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSort(col); setSortDir("asc") }
  }

  if (loading || !market) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Connecting to simulation engine...</p>
        </div>
      </div>
    )
  }

  if (view === "detail" && detail) {
    return <StockDetailView detail={detail} stocks={stocks} onBack={() => setView("list")} openDetail={openDetail} />
  }

  const idxUp  = (market.indexChange || 0) >= 0
  const idxPct = market.index > 0 ? Math.abs((market.indexChange || 0) / market.index * 100).toFixed(2) : "0.00"
  const SortIcon = ({ col }: { col: string }) => {
    if (sort !== col) return <ChevronUp className="w-3 h-3 opacity-20" />
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 opacity-70" /> : <ChevronDown className="w-3 h-3 opacity-70" />
  }

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">Market</h1>
          <p className="text-base text-muted-foreground">
            {market.totalStocks} stocks · tick #{market.tickCount}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SessionBadge session={market.marketSession ?? "open"} />
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-muted-foreground">Session Connected</span>
        </div>
      </div>

      {/* Top stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatTile label="Index"        value={market.index.toFixed(0)}          sub={`${idxUp ? "+" : "-"}${idxPct}%`}             subColor={idxUp ? GAIN : LOSS} />
        <StatTile label="VIX"          value={(market.vix ?? 18).toFixed(1)}    sub={market.vix > 30 ? "Elevated" : market.vix > 20 ? "Normal" : "Low"} subColor={market.vix > 30 ? LOSS : market.vix > 20 ? NEUT : GAIN} />
        <StatTile label="Fear & Greed" value={market.fearGreed.toString()}       sub={market.fearGreedLabel}                          subColor={market.fearGreed > 60 ? GAIN : market.fearGreed < 40 ? LOSS : NEUT} />
        <StatTile label="A/D Line"     value={`${(market.advanceDecline ?? 0) > 0 ? "+" : ""}${market.advanceDecline ?? 0}`} sub={`↑${market.gainers} ↓${market.losers}`} subColor={(market.advanceDecline ?? 0) >= 0 ? GAIN : LOSS} />
      </div>

      {/* Secondary stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">52w Highs</span>
          <span className="text-base font-bold font-mono" style={{ color: GAIN }}>{market.newHighs ?? 0}</span>
        </div>
        <div className="bg-card border border-border rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">52w Lows</span>
          <span className="text-base font-bold font-mono" style={{ color: LOSS }}>{market.newLows ?? 0}</span>
        </div>
        <div className="bg-card border border-border rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Interest Rate</span>
          <span className="text-base font-bold font-mono text-foreground tabular-nums">{market.interestRate?.toFixed(2) ?? "—"}%</span>
        </div>
        <div className="bg-card border border-border rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Inflation / GDP</span>
          <span className="text-base font-bold font-mono text-foreground tabular-nums">
            {market.inflation?.toFixed(1) ?? "—"}% / {market.gdpGrowth?.toFixed(1) ?? "—"}%
          </span>
        </div>
      </div>

      {/* Events ticker */}
      {events.length > 0 && (
        <div className="bg-card border border-border rounded-xl px-6 py-3 mb-6 overflow-hidden">
          <div className="flex items-center gap-8 overflow-x-auto">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest shrink-0 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Events
            </span>
            {events.slice(-6).reverse().map((e, i) => (
              <div key={e.id ?? i} className="flex items-center gap-2 shrink-0" style={{ opacity: 1 - i * 0.15 }}>
                <span
                  className="text-sm font-bold px-2 py-0.5 rounded"
                  style={{ color: e.effect >= 0 ? GAIN : LOSS, background: e.effect >= 0 ? "rgba(91,206,138,.1)" : "rgba(232,105,106,.1)" }}
                >
                  {e.effect >= 0 ? "▲" : "▼"}
                </span>
                <span className="text-sm text-foreground whitespace-nowrap">{e.text}</span>
                {e.category && (
                  <span className="text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ color: BLUE, background: "rgba(124,138,244,.1)" }}>
                    {e.category}
                  </span>
                )}
                {e.weight >= 3 && <span className="text-xs font-bold tracking-wider" style={{ color: NEUT }}>HIGH IMPACT</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Stock table */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={e => { setSearch(e.target.value); if (e.target.value) setFilter("all") }}
                placeholder="Search stocks..."
                className="pl-9 h-9 bg-card border-border text-sm"
              />
            </div>
            <select
              value={filter}
              onChange={e => { setFilter(e.target.value); setSearch("") }}
              className="h-9 bg-card text-foreground border border-border rounded-lg px-3 text-xs outline-none cursor-pointer"
            >
              <option value="all">All Sectors</option>
              {sectorList.map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground ml-auto">{sortedStocks.length} stocks</span>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/60">
                  {[
                    { key: "ticker", label: "Ticker", align: "left" },
                    { key: "name",   label: "Name",   align: "left" },
                    { key: "price",  label: "Price",  align: "right" },
                    { key: "change", label: "Chg%",   align: "right" },
                    { key: "volume", label: "Volume", align: "right" },
                    { key: "rsi",    label: "RSI",    align: "right" },
                    { key: "spread", label: "Spread", align: "right" },
                  ].map(col => (
                    <th
                      key={col.key}
                      className={cn(
                        "px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-widest select-none",
                        col.align === "right" && "text-right",
                        col.align === "left"  && "text-left",
                        !["name","spread"].includes(col.key) && "cursor-pointer hover:text-foreground transition-colors"
                      )}
                      onClick={() => !["name","spread"].includes(col.key) && toggleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {!["name","spread"].includes(col.key) && <SortIcon col={col.key} />}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {sortedStocks.map(([t, s], idx) => {
                  const up   = s.change >= 0
                  const rng  = (s.hi52w || 0) - (s.lo52w || 0)
                  void rng
                  return (
                    <tr
                      key={t}
                      onClick={() => openDetail(t)}
                      className={cn(
                        "cursor-pointer hover:bg-card/60 transition-colors border-b border-border/50",
                        idx === sortedStocks.length - 1 && "border-b-0",
                        s.halted && "opacity-60"
                      )}
                    >
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold font-mono text-sm text-foreground">{t}</span>
                          {s.halted && <AlertTriangle className="w-3.5 h-3.5" style={{ color: LOSS }} />}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-muted-foreground text-sm max-w-[180px] truncate">{s.name}</td>
                      <td className="px-3 py-3.5 text-right">
                        <div className="font-semibold font-mono text-base tabular-nums text-foreground">{s.price.toFixed(2)}</div>
                        <div className="text-xs font-mono text-muted-foreground tabular-nums">
                          {s.bid.toFixed(2)}/{s.ask.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 font-semibold font-mono text-sm tabular-nums" style={{ color: up ? GAIN : LOSS }}>
                          {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {up ? "+" : ""}{s.change.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono text-sm text-muted-foreground tabular-nums">
                        {fmtVol(s.volume)}
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span className="text-sm font-mono tabular-nums" style={{ color: s.rsi > 70 ? LOSS : s.rsi < 30 ? GAIN : NEUT }}>
                          {s.rsi.toFixed(0)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span className="text-xs font-mono tabular-nums" style={{ color: s.spreadPct > 0.5 ? LOSS : DIM }}>
                          {(s.spreadPct || 0).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span className="text-muted-foreground text-sm">›</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-64 shrink-0 space-y-5">
          {/* Sectors */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Sectors</p>
            <div className="space-y-1.5">
              {sectorList.map(([k, v]) => {
                const up = v.avgChange >= 0
                const maxVal = Math.max(0.01, ...sectorList.map(([, e]) => Math.abs(e.avgChange)))
                const barW = Math.min(100, (Math.abs(v.avgChange) / maxVal) * 100)
                return (
                  <button
                    key={k}
                    onClick={() => { setFilter(k === filter ? "all" : k); setSearch("") }}
                    className={cn(
                      "w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer",
                      filter === k ? "bg-card border-ring/40" : "bg-card/40 border-border hover:bg-card"
                    )}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-foreground">{v.icon} {v.label}</span>
                      <span className="text-xs font-semibold font-mono tabular-nums" style={{ color: up ? GAIN : LOSS }}>
                        {up ? "+" : ""}{v.avgChange.toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-0.5 bg-background rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barW}%`, background: up ? GAIN : LOSS }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Top movers */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Top Movers</p>
            <div className="space-y-1.5">
              <button
                onClick={() => openDetail(market.topGainer.ticker)}
                className="w-full flex justify-between items-center px-3 py-2.5 bg-card/40 border border-border rounded-lg hover:bg-card transition-colors cursor-pointer"
              >
                <span className="text-sm text-muted-foreground">Gainer</span>
                <span className="text-sm font-semibold font-mono" style={{ color: GAIN }}>
                  {market.topGainer.ticker} +{market.topGainer.pct}%
                </span>
              </button>
              <button
                onClick={() => openDetail(market.topLoser.ticker)}
                className="w-full flex justify-between items-center px-3 py-2.5 bg-card/40 border border-border rounded-lg hover:bg-card transition-colors cursor-pointer"
              >
                <span className="text-sm text-muted-foreground">Loser</span>
                <span className="text-sm font-semibold font-mono" style={{ color: LOSS }}>
                  {market.topLoser.ticker} {market.topLoser.pct}%
                </span>
              </button>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Macro */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Macro</p>
            <div className="space-y-1.5">
              {[
                ["Rate",      `${market.interestRate?.toFixed(2) ?? "—"}%`],
                ["Inflation", `${market.inflation?.toFixed(2) ?? "—"}%`],
                ["GDP",       `${market.gdpGrowth?.toFixed(2) ?? "—"}%`],
                ["VIX",       (market.vix ?? 18).toFixed(1)],
              ].map(([label, val], i) => (
                <div key={i} className="flex justify-between items-center px-3 py-2.5 bg-card/40 border border-border rounded-lg">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-semibold font-mono text-foreground tabular-nums">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
