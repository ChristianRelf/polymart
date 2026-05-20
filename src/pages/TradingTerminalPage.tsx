import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useAuth } from "@clerk/clerk-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Search, TrendingUp, Minus, Bell, MousePointer2, Eraser,
  Trash2, Loader2, ShoppingCart,
  BookOpen, Calculator, Target, Type, Square, X, Check,
  BarChart2, ChevronRight, Layers,
} from "lucide-react"
import { useAccount } from "@/hooks/useAccount"
import { useSimulation } from "@/lib/SimulationContext"
import type { StockDetail, ForexPairDetail, Candle } from "@/lib/SimulationContext"
import type { Route } from "@/App"

// ── Chart palette (matches MarketPage) ───────────────────────────────────────
const BG   = "oklch(0.13 0.004 264)"
const GAIN = "#4ade80"
const LOSS = "#f87171"
const DIM  = "rgba(255,255,255,0.3)"
const CARD_BG = "oklch(0.165 0.004 264)"
const DRAW_COLORS = ["#ffffff","#4ade80","#f87171","#60a5fa","#fbbf24","#c084fc","#f97316"]

// ── Types ────────────────────────────────────────────────────────────────────
type ToolMode = "cursor" | "hline" | "trendline" | "rect" | "text" | "alert" | "erase"

interface Drawing {
  id: string
  type: "hline" | "trendline" | "rect" | "text"
  color: string
  price?: number
  label?: string
  p1?: { price: number; idxFromRight: number }
  p2?: { price: number; idxFromRight: number }
  text?: string
}

interface PriceAlert {
  id: string
  price: number
  direction: "above" | "below"
  label: string
  triggered: boolean
  createdAt: string
}

interface ChartGeom {
  mn: number; mx: number; rng: number
  pad: { t: number; r: number; b: number; l: number }
  gap: number; n: number
  cssW: number; cssH: number
}

interface PortfolioSummary {
  id: number; name: string; cash_balance: number
}

// ── LocalStorage hooks ───────────────────────────────────────────────────────
function useDrawings(symbol: string): [Drawing[], (ds: Drawing[]) => void] {
  const [drawings, set] = useState<Drawing[]>(() => {
    try { return JSON.parse(localStorage.getItem(`pm_drawings_${symbol}`) || "[]") } catch { return [] }
  })
  useEffect(() => {
    try { set(JSON.parse(localStorage.getItem(`pm_drawings_${symbol}`) || "[]")) } catch { set([]) }
  }, [symbol])
  const setDrawings = useCallback((ds: Drawing[]) => {
    set(ds)
    localStorage.setItem(`pm_drawings_${symbol}`, JSON.stringify(ds))
  }, [symbol])
  return [drawings, setDrawings]
}

function useAlerts(symbol: string): [PriceAlert[], (as: PriceAlert[]) => void] {
  const [alerts, set] = useState<PriceAlert[]>(() => {
    try { return JSON.parse(localStorage.getItem(`pm_alerts_${symbol}`) || "[]") } catch { return [] }
  })
  useEffect(() => {
    try { set(JSON.parse(localStorage.getItem(`pm_alerts_${symbol}`) || "[]")) } catch { set([]) }
  }, [symbol])
  const setAlerts = useCallback((as: PriceAlert[]) => {
    set(as)
    localStorage.setItem(`pm_alerts_${symbol}`, JSON.stringify(as))
  }, [symbol])
  return [alerts, setAlerts]
}

function useNotes(symbol: string): [string, (n: string) => void] {
  const [notes, set] = useState(() => localStorage.getItem(`pm_notes_${symbol}`) || "")
  useEffect(() => { set(localStorage.getItem(`pm_notes_${symbol}`) || "") }, [symbol])
  const setNotes = useCallback((n: string) => {
    set(n); localStorage.setItem(`pm_notes_${symbol}`, n)
  }, [symbol])
  return [notes, setNotes]
}

// ── Drawing helpers ──────────────────────────────────────────────────────────
function toY(geom: ChartGeom, price: number) {
  return geom.pad.t + ((geom.mx - price) / geom.rng) * (geom.cssH - geom.pad.t - geom.pad.b)
}
function idxToX(geom: ChartGeom, idxFromRight: number) {
  return geom.pad.l + (geom.n - 1 - idxFromRight) * geom.gap + geom.gap / 2
}
function xToIdx(geom: ChartGeom, x: number) {
  const left = Math.max(0, Math.min(geom.n - 1, Math.round((x - geom.pad.l - geom.gap / 2) / geom.gap)))
  return geom.n - 1 - left
}
function yToPrice(geom: ChartGeom, y: number) {
  return geom.mx - ((y - geom.pad.t) / (geom.cssH - geom.pad.t - geom.pad.b)) * geom.rng
}

function renderHLine(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (d.price === undefined) return
  const y = toY(g, d.price)
  if (y < g.pad.t - 10 || y > g.cssH - g.pad.b + 10) return
  ctx.save(); ctx.globalAlpha = alpha
  ctx.strokeStyle = d.color; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4])
  ctx.beginPath(); ctx.moveTo(g.pad.l, y); ctx.lineTo(g.cssW - g.pad.r, y); ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = d.color; ctx.font = "11px 'DM Mono',monospace"; ctx.textAlign = "left"
  ctx.fillText(d.price.toFixed(2), g.cssW - g.pad.r + 4, y + 4)
  if (d.label) { ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillText(d.label, g.pad.l + 4, y - 4) }
  ctx.restore()
}

function renderTrendLine(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (!d.p1 || !d.p2) return
  const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
  const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
  ctx.save(); ctx.globalAlpha = alpha
  ctx.strokeStyle = d.color; ctx.lineWidth = 1.5; ctx.lineJoin = "round"
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  ctx.fillStyle = d.color
  ;[[x1, y1], [x2, y2]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill()
  })
  ctx.restore()
}

function renderRect(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (!d.p1 || !d.p2) return
  const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
  const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
  const l = Math.min(x1, x2), t = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1)
  ctx.save(); ctx.globalAlpha = alpha
  ctx.fillStyle = d.color + "18"; ctx.fillRect(l, t, w, h)
  ctx.strokeStyle = d.color + "70"; ctx.lineWidth = 1; ctx.setLineDash([4, 3])
  ctx.strokeRect(l, t, w, h); ctx.setLineDash([])
  ctx.restore()
}

function renderText(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (!d.p1 || !d.text) return
  const x = idxToX(g, d.p1.idxFromRight), y = toY(g, d.p1.price)
  ctx.save(); ctx.globalAlpha = alpha
  ctx.font = "bold 12px 'DM Mono',monospace"
  const tw = ctx.measureText(d.text).width
  ctx.fillStyle = d.color + "22"; ctx.strokeStyle = d.color + "88"; ctx.lineWidth = 1
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x - 4, y - 17, tw + 16, 22, 4)
  else ctx.rect(x - 4, y - 17, tw + 16, 22)
  ctx.fill(); ctx.stroke()
  ctx.fillStyle = d.color; ctx.textAlign = "left"; ctx.fillText(d.text, x + 4, y - 1)
  ctx.restore()
}

function renderAlert(ctx: CanvasRenderingContext2D, g: ChartGeom, a: PriceAlert, alpha = 1) {
  const y = toY(g, a.price)
  if (y < g.pad.t - 10 || y > g.cssH - g.pad.b + 10) return
  const color = a.triggered ? "rgba(251,191,36,0.35)" : "rgba(251,191,36,0.75)"
  ctx.save(); ctx.globalAlpha = alpha
  ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
  ctx.beginPath(); ctx.moveTo(g.pad.l, y); ctx.lineTo(g.cssW - g.pad.r, y); ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = color; ctx.font = "10px monospace"; ctx.textAlign = "left"
  ctx.fillText(`▲ ${a.price.toFixed(2)} ${a.direction}`, g.pad.l + 4, y - 3)
  ctx.restore()
}

function hitTest(g: ChartGeom, d: Drawing, x: number, y: number): boolean {
  if (d.type === "hline" && d.price !== undefined) {
    const py = toY(g, d.price)
    return Math.abs(y - py) < 8 && x >= g.pad.l && x <= g.cssW - g.pad.r
  }
  if (d.type === "trendline" && d.p1 && d.p2) {
    const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
    const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
    const len2 = (x2-x1)**2 + (y2-y1)**2
    if (len2 === 0) return Math.hypot(x-x1, y-y1) < 8
    const t = Math.max(0, Math.min(1, ((x-x1)*(x2-x1)+(y-y1)*(y2-y1))/len2))
    return Math.hypot(x-(x1+t*(x2-x1)), y-(y1+t*(y2-y1))) < 8
  }
  if ((d.type === "rect" || d.type === "text") && d.p1 && d.p2) {
    const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
    const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
    return x >= Math.min(x1,x2)-8 && x <= Math.max(x1,x2)+8 && y >= Math.min(y1,y2)-8 && y <= Math.max(y1,y2)+8
  }
  if (d.type === "text" && d.p1) {
    const ax = idxToX(g, d.p1.idxFromRight), ay = toY(g, d.p1.price)
    return Math.abs(x-ax) < 60 && Math.abs(y-ay) < 14
  }
  return false
}

// ── MACD sub-chart (same as MarketPage) ──────────────────────────────────────
function MACDChart({ candles, macd, macdSignal, macdHist }: {
  candles: Candle[]; macd: number; macdSignal: number; macdHist: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || candles.length < 2) return
    const dpr = window.devicePixelRatio || 1
    const cssW = cv.clientWidth, cssH = cv.clientHeight
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr)
    const ctx = cv.getContext("2d")!; ctx.scale(dpr, dpr)
    const W = cssW, H = cssH, pad = { t: 16, r: 74, b: 6, l: 8 }
    const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b, n = candles.length
    const hists: number[] = []
    let prev = 0
    for (let i = 0; i < n; i++) {
      const noise = (Math.random() - 0.5) * Math.abs(macdHist) * 0.4
      prev = prev * 0.85 + macdHist * 0.15 + noise; hists.push(prev)
    }
    hists[hists.length - 1] = macdHist
    const mx = Math.max(Math.abs(macdHist) * 2, ...hists.map(Math.abs)) || 0.01
    const tY = (v: number) => pad.t + cH / 2 - (v / mx) * (cH / 2)
    const midY = pad.t + cH / 2
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad.l, midY); ctx.lineTo(W - pad.r, midY); ctx.stroke()
    const gap = cW / n, bw = Math.max(1, gap * 0.65)
    hists.forEach((h, i) => {
      const x = pad.l + i * gap + gap / 2, y = tY(h)
      ctx.fillStyle = h >= 0 ? `${GAIN}99` : `${LOSS}99`
      ctx.fillRect(x - bw/2, Math.min(y, midY), bw, Math.abs(y - midY))
    })
    const ml = hists.map((_, i) => macd * (i/n)); ml[ml.length-1] = macd
    const sl = hists.map((_, i) => macdSignal * (i/n)); sl[sl.length-1] = macdSignal
    ;[{a: ml, c: "rgba(124,138,244,0.8)"}, {a: sl, c: "rgba(234,179,77,0.7)"}].forEach(({a, c}) => {
      ctx.beginPath(); ctx.strokeStyle = c; ctx.lineWidth = 1
      a.forEach((v, i) => { const x = pad.l + i * gap + gap/2; i === 0 ? ctx.moveTo(x, tY(v)) : ctx.lineTo(x, tY(v)) })
      ctx.stroke()
    })
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "10px 'DM Mono',monospace"; ctx.textAlign = "left"
    ctx.fillText(`MACD ${macd.toFixed(3)}  SIG ${macdSignal.toFixed(3)}  HIST ${macdHist.toFixed(3)}`, pad.l + 4, pad.t - 2)
  }, [candles, macd, macdSignal, macdHist])
  return <canvas ref={ref} className="w-full block border-t border-white/5" style={{ background: BG, height: 80 }} />
}

// ── Trading Chart (with drawing tool support) ─────────────────────────────────
interface TradingChartProps {
  candles: Candle[]; history: number[]; price: number
  sma20: number; sma50: number; bbUpper: number; bbMiddle: number; bbLower: number; vwap: number
  macd: number; macdSignal: number; macdHist: number
  chartMode: "candle" | "line"
  activeTool: ToolMode; drawColor: string
  drawings: Drawing[]; alerts: PriceAlert[]
  onAddDrawing: (d: Drawing) => void
  onRemoveDrawing: (id: string) => void
  onAddAlert: (a: PriceAlert) => void
  currentPrice: number
}

function TradingChart({
  candles, history, price, sma20, sma50, bbUpper, bbMiddle, bbLower, vwap,
  macd, macdSignal, macdHist, chartMode,
  activeTool, drawColor, drawings, alerts,
  onAddDrawing, onRemoveDrawing, onAddAlert, currentPrice,
}: TradingChartProps) {
  const mainRef = useRef<HTMLCanvasElement>(null)
  const geomRef = useRef<ChartGeom | null>(null)
  const renderRef = useRef<() => void>(() => {})
  const dragStartRef = useRef<{ price: number; idxFromRight: number } | null>(null)
  const dragCurrentRef = useRef<{ price: number; idxFromRight: number } | null>(null)
  const isDraggingRef = useRef(false)
  const hoverRef = useRef<{ x: number; y: number; price: number } | null>(null)
  // Keep refs for use inside renderRef closure
  const drawingsRef = useRef(drawings)
  const alertsRef = useRef(alerts)
  const activeToolRef = useRef(activeTool)
  const drawColorRef = useRef(drawColor)
  useEffect(() => { drawingsRef.current = drawings }, [drawings])
  useEffect(() => { alertsRef.current = alerts }, [alerts])
  useEffect(() => { activeToolRef.current = activeTool }, [activeTool])
  useEffect(() => { drawColorRef.current = drawColor }, [drawColor])

  useEffect(() => {
    const cv = mainRef.current
    if (!cv) return
    const showCandles = chartMode === "candle" && candles.length >= 2
    const showLine = !showCandles && history.length >= 2
    if (!showCandles && !showLine) return

    function renderAll() {
      if (!cv) return
      const dpr = window.devicePixelRatio || 1
      const cssW = cv.clientWidth, cssH = cv.clientHeight
      cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr)
      const ctx = cv.getContext("2d")!; ctx.scale(dpr, dpr)
      const W = cssW, H = cssH, fontSize = 11, priceTagW = 70
      const pad = { t: 20, r: priceTagW + 4, b: 36, l: 8 }
      const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b

      let mn: number, mx: number, rng: number, n: number, gap: number

      if (showCandles) {
        n = candles.length
        const vals = candles.flatMap(c => [c.h, c.l])
        mn = Math.min(...vals) * 0.998; mx = Math.max(...vals) * 1.002
        rng = mx - mn || 1; gap = cW / n
      } else {
        n = history.length
        const pv = history.filter(Boolean)
        mn = Math.min(...pv) * 0.997; mx = Math.max(...pv) * 1.003
        rng = mx - mn || 1; gap = cW / Math.max(n - 1, 1)
      }

      const geom: ChartGeom = { mn, mx, rng, pad, gap, n, cssW: W, cssH: H }
      geomRef.current = geom
      const tYLocal = (v: number) => pad.t + ((mx - v) / rng) * cH

      ctx.clearRect(0, 0, W, H); ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        const y = pad.t + (cH / 4) * i
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke()
        ctx.fillStyle = DIM; ctx.font = `${fontSize}px 'DM Mono',monospace`; ctx.textAlign = "left"
        ctx.fillText((mx - (i / 4) * rng).toFixed(2), W - pad.r + 6, y + fontSize * 0.4)
      }

      if (showCandles) {
        const cw = Math.max(2, gap * 0.7)
        // BB fill
        ctx.beginPath()
        candles.forEach((_c, i) => { const x = pad.l + i * gap + gap/2; i === 0 ? ctx.moveTo(x, tYLocal(bbUpper)) : ctx.lineTo(x, tYLocal(bbUpper)) })
        candles.slice().reverse().forEach((_c, i) => ctx.lineTo(pad.l + (n-1-i)*gap + gap/2, tYLocal(bbLower)))
        ctx.closePath(); ctx.fillStyle = "rgba(124,138,244,0.06)"; ctx.fill()

        const dl = (vals: number[], color: string, dash: number[] = []) => {
          ctx.beginPath(); ctx.setLineDash(dash); ctx.strokeStyle = color; ctx.lineWidth = 1
          vals.forEach((v, i) => { const x = pad.l + i*gap + gap/2; i === 0 ? ctx.moveTo(x, tYLocal(v)) : ctx.lineTo(x, tYLocal(v)) })
          ctx.stroke(); ctx.setLineDash([])
        }
        dl(candles.map(() => bbUpper), "rgba(124,138,244,0.5)", [3,3])
        dl(candles.map(() => bbMiddle), "rgba(124,138,244,0.3)", [2,4])
        dl(candles.map(() => bbLower), "rgba(124,138,244,0.5)", [3,3])
        dl(candles.map(() => vwap), "rgba(234,179,77,0.6)", [4,3])
        dl(candles.map(() => sma20), "rgba(91,206,138,0.5)")
        dl(candles.map(() => sma50), "rgba(232,105,106,0.5)")

        candles.forEach((c, i) => {
          const x = pad.l + i * gap + gap/2, up = c.c >= c.o, col = up ? GAIN : LOSS
          ctx.strokeStyle = col; ctx.lineWidth = 1
          ctx.beginPath(); ctx.moveTo(x, tYLocal(c.h)); ctx.lineTo(x, tYLocal(c.l)); ctx.stroke()
          const bt = tYLocal(Math.max(c.o, c.c)), bb = tYLocal(Math.min(c.o, c.c))
          ctx.fillStyle = up ? `${GAIN}cc` : `${LOSS}cc`
          ctx.fillRect(x - cw/2, bt, cw, Math.max(1, bb - bt))
        })
      } else {
        const up = history[history.length-1] >= history[0], accent = up ? GAIN : LOSS
        ;[{v: sma20, c: "rgba(91,206,138,0.5)"},{v: sma50, c: "rgba(232,105,106,0.5)"},
          {v: vwap, c: "rgba(234,179,77,0.6)"},{v: bbUpper, c: "rgba(124,138,244,0.4)"},{v: bbLower, c: "rgba(124,138,244,0.4)"}
        ].forEach(({v, c}) => {
          if (!v) return
          ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.setLineDash([3,3])
          ctx.beginPath(); ctx.moveTo(pad.l, tYLocal(v)); ctx.lineTo(W - pad.r, tYLocal(v)); ctx.stroke(); ctx.setLineDash([])
        })
        const pts = history.map((v, i) => ({ x: pad.l + i * gap, y: tYLocal(v) }))
        const g = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH)
        g.addColorStop(0, up ? "rgba(74,222,128,.10)" : "rgba(248,113,113,.08)"); g.addColorStop(1, "transparent")
        ctx.beginPath(); ctx.moveTo(pts[0].x, pad.t + cH); pts.forEach(p => ctx.lineTo(p.x, p.y))
        ctx.lineTo(pts[pts.length-1].x, pad.t + cH); ctx.closePath(); ctx.fillStyle = g; ctx.fill()
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
        for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y)
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.stroke()
      }

      // Current price line
      const py = tYLocal(price)
      ctx.setLineDash([4,3]); ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(pad.l, py); ctx.lineTo(W - pad.r - 2, py); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = CARD_BG; ctx.fillRect(W - pad.r, py - 9, pad.r - 2, 18)
      ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = `bold ${fontSize}px 'DM Mono',monospace`; ctx.textAlign = "left"
      ctx.fillText(price.toFixed(2), W - pad.r + 5, py + fontSize * 0.38)

      // ── Drawings ────────────────────────────────────────────────────────────
      for (const d of drawingsRef.current) {
        if (d.type === "hline") renderHLine(ctx, geom, d)
        else if (d.type === "trendline") renderTrendLine(ctx, geom, d)
        else if (d.type === "rect") renderRect(ctx, geom, d)
        else if (d.type === "text") renderText(ctx, geom, d)
      }
      for (const a of alertsRef.current) renderAlert(ctx, geom, a)

      // In-progress drawing
      if (isDraggingRef.current && dragStartRef.current && dragCurrentRef.current) {
        const col = drawColorRef.current
        const tool = activeToolRef.current
        if (tool === "trendline") {
          renderTrendLine(ctx, geom, {
            id: "_", type: "trendline", color: col,
            p1: { price: dragStartRef.current.price, idxFromRight: dragStartRef.current.idxFromRight },
            p2: { price: dragCurrentRef.current.price, idxFromRight: dragCurrentRef.current.idxFromRight },
          }, 0.55)
        } else if (tool === "rect") {
          renderRect(ctx, geom, {
            id: "_", type: "rect", color: col,
            p1: { price: dragStartRef.current.price, idxFromRight: dragStartRef.current.idxFromRight },
            p2: { price: dragCurrentRef.current.price, idxFromRight: dragCurrentRef.current.idxFromRight },
          }, 0.55)
        }
      }

      // Crosshair
      if (hoverRef.current && activeToolRef.current !== "cursor") {
        const { x, y, price: hp } = hoverRef.current
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1; ctx.setLineDash([4,4])
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, H - pad.b); ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = "rgba(30,30,50,0.88)"; ctx.fillRect(W - pad.r + 1, y - 9, pad.r - 3, 18)
        ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.font = "11px 'DM Mono',monospace"; ctx.textAlign = "left"
        ctx.fillText(hp.toFixed(2), W - pad.r + 5, y + 4)
      }
    }

    renderRef.current = renderAll
    renderAll()
  }, [candles, history, price, sma20, sma50, bbUpper, bbMiddle, bbLower, vwap, chartMode, drawings, alerts])

  function getCoords(e: React.MouseEvent) {
    const cv = mainRef.current, g = geomRef.current
    if (!cv || !g) return null
    const rect = cv.getBoundingClientRect()
    const x = e.clientX - rect.left, y = e.clientY - rect.top
    return { x, y, price: yToPrice(g, y), idxFromRight: xToIdx(g, x) }
  }

  function handleMouseMove(e: React.MouseEvent) {
    const c = getCoords(e); if (!c) return
    hoverRef.current = { x: c.x, y: c.y, price: c.price }
    if (isDraggingRef.current) dragCurrentRef.current = { price: c.price, idxFromRight: c.idxFromRight }
    renderRef.current()
  }

  function handleMouseDown(e: React.MouseEvent) {
    const c = getCoords(e); if (!c) return
    const { x, y, price: clickPrice, idxFromRight } = c
    const g = geomRef.current
    switch (activeTool) {
      case "hline":
        onAddDrawing({ id: Date.now().toString(), type: "hline", color: drawColor, price: clickPrice })
        break
      case "trendline":
      case "rect":
        isDraggingRef.current = true
        dragStartRef.current = { price: clickPrice, idxFromRight }
        dragCurrentRef.current = { price: clickPrice, idxFromRight }
        break
      case "alert": {
        const dir: "above" | "below" = clickPrice >= currentPrice ? "above" : "below"
        onAddAlert({ id: Date.now().toString(), price: clickPrice, direction: dir, label: "", triggered: false, createdAt: new Date().toISOString() })
        break
      }
      case "erase": {
        if (!g) break
        const hit = drawings.find(d => hitTest(g, d, x, y))
        if (hit) onRemoveDrawing(hit.id)
        break
      }
    }
  }

  const [pendingText, setPendingText] = useState<{ price: number; idxFromRight: number } | null>(null)
  const [textInput, setTextInput] = useState("")

  function handleMouseUp(e: React.MouseEvent) {
    const c = getCoords(e)
    if (activeTool === "text" && c) {
      setPendingText({ price: c.price, idxFromRight: c.idxFromRight })
      return
    }
    if (isDraggingRef.current && c && dragStartRef.current) {
      const { price: clickPrice, idxFromRight } = c
      if (activeTool === "trendline") {
        onAddDrawing({ id: Date.now().toString(), type: "trendline", color: drawColor,
          p1: dragStartRef.current, p2: { price: clickPrice, idxFromRight } })
      } else if (activeTool === "rect") {
        onAddDrawing({ id: Date.now().toString(), type: "rect", color: drawColor,
          p1: dragStartRef.current, p2: { price: clickPrice, idxFromRight } })
      }
    }
    isDraggingRef.current = false; dragStartRef.current = null; dragCurrentRef.current = null
    renderRef.current()
  }

  function handleMouseLeave() {
    hoverRef.current = null; isDraggingRef.current = false
    dragStartRef.current = null; dragCurrentRef.current = null
    renderRef.current()
  }

  function confirmText() {
    if (pendingText && textInput.trim()) {
      onAddDrawing({ id: Date.now().toString(), type: "text", color: drawColor,
        p1: pendingText, text: textInput.trim() })
    }
    setPendingText(null); setTextInput("")
  }

  const cursor = activeTool === "cursor" ? "default" : activeTool === "text" ? "text" : "crosshair"

  return (
    <div className="flex flex-col">
      <canvas
        ref={mainRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="w-full block select-none"
        style={{ background: BG, height: 380, cursor }}
      />
      <MACDChart candles={candles} macd={macd} macdSignal={macdSignal} macdHist={macdHist} />

      {/* Text annotation dialog */}
      <Dialog open={!!pendingText} onOpenChange={() => { setPendingText(null); setTextInput("") }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Add Annotation</DialogTitle></DialogHeader>
          <Input
            autoFocus placeholder="Annotation text..."
            value={textInput} onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && confirmText()}
            maxLength={80}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPendingText(null); setTextInput("") }}>Cancel</Button>
            <Button onClick={confirmText} disabled={!textInput.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Drawing toolbar ──────────────────────────────────────────────────────────
const TOOLS: { id: ToolMode; icon: React.ReactNode; label: string }[] = [
  { id: "cursor",    icon: <MousePointer2 className="w-3.5 h-3.5" />, label: "Select" },
  { id: "hline",     icon: <Minus className="w-3.5 h-3.5" />,         label: "H-Line" },
  { id: "trendline", icon: <TrendingUp className="w-3.5 h-3.5" />,    label: "Trend" },
  { id: "rect",      icon: <Square className="w-3.5 h-3.5" />,        label: "Zone" },
  { id: "text",      icon: <Type className="w-3.5 h-3.5" />,          label: "Label" },
  { id: "alert",     icon: <Bell className="w-3.5 h-3.5" />,          label: "Alert" },
  { id: "erase",     icon: <Eraser className="w-3.5 h-3.5" />,        label: "Erase" },
]

function DrawingToolbar({
  tool, setTool, color, setColor, onClear, chartMode, setChartMode,
}: {
  tool: ToolMode; setTool: (t: ToolMode) => void
  color: string; setColor: (c: string) => void
  onClear: () => void
  chartMode: "candle" | "line"; setChartMode: (m: "candle" | "line") => void
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/5 bg-[oklch(0.15_0.004_264)] flex-wrap">
      {/* Chart type */}
      <div className="flex items-center gap-0.5 bg-black/30 rounded p-0.5 mr-1">
        {([["candle", <BarChart2 className="w-3 h-3" />], ["line", <Layers className="w-3 h-3" />]] as const).map(([m, icon]) => (
          <button key={m} onClick={() => setChartMode(m)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer border-0 ${chartMode === m ? "bg-foreground/90 text-background" : "text-muted-foreground hover:text-foreground bg-transparent"}`}>
            {icon}
          </button>
        ))}
      </div>

      {/* Drawing tools */}
      {TOOLS.map(t => (
        <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer border-0 ${tool === t.id ? "bg-foreground/90 text-background" : "text-muted-foreground hover:text-foreground bg-transparent hover:bg-white/5"}`}>
          {t.icon}
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}

      {/* Separator */}
      <div className="w-px h-4 bg-white/10 mx-0.5" />

      {/* Color palette */}
      {DRAW_COLORS.map(c => (
        <button key={c} onClick={() => setColor(c)} title={c}
          className={`w-4 h-4 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 ${color === c ? "border-white scale-110" : "border-transparent"}`}
          style={{ background: c }} />
      ))}

      {/* Clear all */}
      <button onClick={onClear} title="Clear all drawings"
        className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-red-400 transition-colors cursor-pointer bg-transparent border-0">
        <Trash2 className="w-3 h-3" />
        <span className="hidden sm:inline">Clear</span>
      </button>
    </div>
  )
}

// ── Symbol list (left panel) ─────────────────────────────────────────────────
interface SymbolEntry { symbol: string; name: string; price: number; change: number; assetType: "stock" | "forex" }

function SymbolListPanel({
  selected, onSelect,
}: { selected: { symbol: string; assetType: string } | null; onSelect: (s: SymbolEntry) => void }) {
  const { stocks, forexPairs } = useSimulation()
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<"stock" | "forex">("stock")

  const list = useMemo<SymbolEntry[]>(() => {
    const q = query.trim().toUpperCase()
    if (tab === "stock") {
      return Object.entries(stocks)
        .filter(([t, s]) => !q || t.includes(q) || s.name.toUpperCase().includes(q))
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([t, s]) => ({ symbol: t, name: s.name, price: s.price, change: s.change, assetType: "stock" as const }))
    }
    return Object.entries(forexPairs)
      .filter(([p]) => !q || p.includes(q))
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([p, d]) => ({ symbol: p, name: `${d.baseName}/${d.quoteName}`, price: d.price, change: d.changePct, assetType: "forex" as const }))
  }, [query, tab, stocks, forexPairs])

  return (
    <div className="flex flex-col h-full border-r border-border bg-card/40">
      {/* Search */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          <Input value={query} onChange={e => setQuery(e.target.value.toUpperCase())}
            placeholder="Search..." className="h-7 text-xs pl-6 pr-2 font-mono" maxLength={16} />
        </div>
      </div>
      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["stock","forex"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider cursor-pointer border-0 transition-colors ${tab === t ? "bg-foreground/8 text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground bg-transparent"}`}>
            {t === "stock" ? "Stocks" : "Forex"}
          </button>
        ))}
      </div>
      {/* List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="py-1">
          {list.map(s => {
            const isSelected = selected?.symbol === s.symbol && selected?.assetType === s.assetType
            const up = s.change >= 0
            return (
              <button key={s.symbol} onClick={() => onSelect(s)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition-colors cursor-pointer border-0 ${isSelected ? "bg-foreground/10 text-foreground" : "hover:bg-muted/40 text-foreground/90"}`}>
                <div className="min-w-0">
                  <p className="text-xs font-mono font-semibold truncate">{s.symbol}</p>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[90px]">{s.name}</p>
                </div>
                <div className="text-right shrink-0 ml-1">
                  <p className="text-[11px] font-mono tabular-nums">{s.price.toFixed(tab === "forex" ? 4 : 2)}</p>
                  <p className={`text-[10px] font-medium tabular-nums ${up ? "text-emerald-500" : "text-red-400"}`}>
                    {up ? "+" : ""}{s.change.toFixed(2)}%
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

// ── Right panel ───────────────────────────────────────────────────────────────

function RightPanel({
  symbol, assetType, currentPrice, portfolios, selectedPortfolio, setSelectedPortfolio,
  alerts, setAlerts, notes, setNotes,
}: {
  symbol: string; assetType: string; currentPrice: number
  portfolios: PortfolioSummary[]; selectedPortfolio: number | null; setSelectedPortfolio: (id: number) => void
  alerts: PriceAlert[]; setAlerts: (a: PriceAlert[]) => void
  notes: string; setNotes: (n: string) => void
}) {
  const { isSignedIn } = useAuth()
  const { placeOrder, getPortfolio } = useAccount()
  const { stocks, forexPairs } = useSimulation()

  const [side, setSide] = useState<"buy" | "sell">("buy")
  const [qty, setQty] = useState("")
  const [orderNotes, setOrderNotes] = useState("")
  const [placing, setPlacing] = useState(false)
  const [orderMsg, setOrderMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [positions, setPositions] = useState<{ symbol: string; quantity: number; avg_cost: number }[]>([])

  // Pip / Point value calculator
  const [lotSize, setLotSize] = useState("1000")

  // Calculators
  const [entry, setEntry] = useState(currentPrice > 0 ? currentPrice.toFixed(2) : "")
  const [stop, setStop] = useState("")
  const [target, setTarget] = useState("")
  const [riskPct, setRiskPct] = useState("1")
  const [accountSize, setAccountSize] = useState("10000")

  useEffect(() => {
    if (currentPrice > 0) setEntry(currentPrice.toFixed(2))
  }, [symbol, currentPrice])

  useEffect(() => {
    if (!selectedPortfolio) return
    getPortfolio(selectedPortfolio).then(p => {
      setPositions(p.positions ?? [])
    }).catch(() => {})
  }, [selectedPortfolio, getPortfolio, symbol])

  const livePriceData = assetType === "stock" ? stocks[symbol] : forexPairs[symbol]
  const livePrice = livePriceData?.price ?? currentPrice
  const previewCost = qty && parseFloat(qty) > 0 ? livePrice * parseFloat(qty) : null

  const portfolio = portfolios.find(p => p.id === selectedPortfolio)
  const symbolPositions = positions.filter(p => p.symbol === symbol)

  async function handleTrade() {
    if (!selectedPortfolio || !symbol || !qty || parseFloat(qty) <= 0) return
    setPlacing(true); setOrderMsg(null)
    try {
      const r = await placeOrder(selectedPortfolio, { asset_type: assetType, symbol, side, quantity: parseFloat(qty), notes: orderNotes || undefined })
      setOrderMsg({ ok: true, text: `${side === "buy" ? "Bought" : "Sold"} ${qty} ${symbol} @ $${r.executedPrice?.toFixed(2) ?? "?"}` })
      setQty(""); setOrderNotes("")
      getPortfolio(selectedPortfolio).then(p => setPositions(p.positions ?? [])).catch(() => {})
    } catch (e: unknown) {
      setOrderMsg({ ok: false, text: e instanceof Error ? e.message : "Order failed" })
    } finally { setPlacing(false) }
  }

  // Live technical data
  const liveData = assetType === "stock" ? stocks[symbol] : forexPairs[symbol]
  const rsi = liveData?.rsi ?? 0
  const macdHist = liveData?.macdHist ?? 0
  const sma20 = liveData?.sma20 ?? 0
  const sma50 = liveData?.sma50 ?? 0
  const bbUpper = liveData?.bbUpper ?? 0
  const bbLower = liveData?.bbLower ?? 0
  const atr = liveData?.atr ?? 0
  const liveDataPrice = liveData?.price ?? currentPrice

  const rsiSignal = rsi >= 70 ? "Overbought" : rsi <= 30 ? "Oversold" : "Neutral"
  const rsiColor  = rsi >= 70 ? "text-red-400" : rsi <= 30 ? "text-emerald-500" : "text-muted-foreground"
  const macdBull  = macdHist > 0
  const smaCross  = sma20 > 0 && sma50 > 0 ? (sma20 > sma50 ? "Bullish" : "Bearish") : null
  const bbRange   = bbUpper - bbLower
  const bbPct     = bbRange > 0 ? ((liveDataPrice - bbLower) / bbRange) * 100 : null

  // Pip/point value
  const lotSizeN = parseFloat(lotSize) || 0
  const forexData = assetType === "forex" ? forexPairs[symbol] : null
  const pipSize   = forexData?.pipSize ?? 0.0001
  const pipValue  = lotSizeN > 0 && liveDataPrice > 0 ? (pipSize / liveDataPrice) * lotSizeN : null

  // Key levels
  const hi52w = liveData?.hi52w ?? 0
  const lo52w = liveData?.lo52w ?? 0
  const pivotP  = forexData?.pivotP  ?? 0
  const pivotR1 = forexData?.pivotR1 ?? 0
  const pivotR2 = forexData?.pivotR2 ?? 0
  const pivotS1 = forexData?.pivotS1 ?? 0
  const pivotS2 = forexData?.pivotS2 ?? 0

  // R:R calculation
  const entryN = parseFloat(entry), stopN = parseFloat(stop), targetN = parseFloat(target)
  const accountN = parseFloat(accountSize), riskPctN = parseFloat(riskPct) / 100
  const riskPerShare = Math.abs(entryN - stopN)
  const rewardPerShare = Math.abs(targetN - entryN)
  const rr = riskPerShare > 0 ? (rewardPerShare / riskPerShare) : null
  const positionSize = (accountN * riskPctN) / (riskPerShare || 1)
  const maxLoss = accountN * riskPctN
  const maxGain = maxLoss * (rr ?? 0)

  return (
    <div className="flex flex-col h-full border-l border-border">
      <Tabs defaultValue="trade" className="flex flex-col h-full">
        <TabsList className="grid grid-cols-3 rounded-none border-b border-border bg-card/60 h-9 shrink-0">
          <TabsTrigger value="trade" className="text-[11px] gap-1 rounded-none data-[state=active]:bg-background">
            <ShoppingCart className="w-3 h-3" />Trade
          </TabsTrigger>
          <TabsTrigger value="tools" className="text-[11px] gap-1 rounded-none data-[state=active]:bg-background">
            <Calculator className="w-3 h-3" />Tools
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-[11px] gap-1 rounded-none data-[state=active]:bg-background">
            <BookOpen className="w-3 h-3" />Notes
          </TabsTrigger>
        </TabsList>

        {/* ── Trade ── */}
        <TabsContent value="trade" className="flex-1 overflow-y-auto mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {!isSignedIn ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-2">
                  <p className="text-sm font-medium">Sign in to trade</p>
                  <p className="text-xs text-muted-foreground">Create an account to paper trade with this chart.</p>
                </div>
              ) : portfolios.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-2">
                  <p className="text-sm font-medium">No portfolios yet</p>
                  <p className="text-xs text-muted-foreground">Create a portfolio in the dashboard to start trading.</p>
                </div>
              ) : (
                <>
                  {/* Portfolio selector */}
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Portfolio</label>
                    <Select value={selectedPortfolio?.toString() ?? ""} onValueChange={v => setSelectedPortfolio(Number(v))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select portfolio" /></SelectTrigger>
                      <SelectContent>
                        {portfolios.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            <span className="text-xs">{p.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">${Number(p.cash_balance).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cash */}
                  {portfolio && (
                    <div className="flex justify-between text-xs px-1">
                      <span className="text-muted-foreground">Available cash</span>
                      <span className="font-semibold tabular-nums">${Number(portfolio.cash_balance).toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  {/* Side */}
                  <div className="flex gap-1.5">
                    {(["buy","sell"] as const).map(s => (
                      <button key={s} onClick={() => setSide(s)}
                        className={`flex-1 py-2 rounded text-xs font-bold transition-colors cursor-pointer border-0 ${side === s ? (s === "buy" ? "bg-emerald-500 text-white" : "bg-red-500 text-white") : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                        {s === "buy" ? "BUY" : "SELL"}
                      </button>
                    ))}
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Quantity</label>
                    <Input type="number" placeholder="0" min={0} step="any" value={qty}
                      onChange={e => setQty(e.target.value)} className="h-8 text-sm font-mono" />
                  </div>

                  {/* Quick qty buttons */}
                  {livePrice > 0 && (
                    <div className="flex gap-1">
                      {[100, 500, 1000].map(amt => (
                        <button key={amt} onClick={() => setQty((amt / livePrice).toFixed(4).replace(/\.?0+$/, ""))}
                          className="flex-1 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted transition-colors cursor-pointer border-0">
                          ${amt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Preview cost */}
                  {previewCost !== null && (
                    <div className="flex justify-between text-xs bg-muted/40 rounded px-3 py-2 font-semibold">
                      <span className="text-muted-foreground">{side === "buy" ? "Cost" : "Proceeds"}</span>
                      <span>${previewCost.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  {/* Notes */}
                  <Input placeholder="Trade rationale (optional)" value={orderNotes}
                    onChange={e => setOrderNotes(e.target.value)} className="h-8 text-xs" maxLength={500} />

                  {orderMsg && (
                    <p className={`text-xs ${orderMsg.ok ? "text-emerald-500" : "text-destructive"}`}>{orderMsg.text}</p>
                  )}

                  <Button className={`w-full text-sm font-bold h-9 ${side === "buy" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"}`}
                    disabled={placing || !symbol || !qty || parseFloat(qty) <= 0 || !selectedPortfolio}
                    onClick={handleTrade}>
                    {placing ? <Loader2 className="w-4 h-4 animate-spin" /> : `${side === "buy" ? "Buy" : "Sell"} ${symbol || "—"}`}
                  </Button>

                  {/* Symbol positions */}
                  {symbolPositions.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Open Position</p>
                      {symbolPositions.map(pos => {
                        const avgCost = Number(pos.avg_cost)
                        const qty = Number(pos.quantity)
                        const pnl = (livePrice - avgCost) * qty
                        const pnlPct = avgCost > 0 ? ((livePrice - avgCost) / avgCost) * 100 : 0
                        return (
                          <div key={`${pos.symbol}`} className="bg-muted/30 rounded-lg px-3 py-2 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Shares</span>
                              <span className="font-mono font-semibold">{qty}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Avg cost</span>
                              <span className="font-mono">${avgCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Unrealised P&L</span>
                              <span className={`font-mono font-semibold ${pnl >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                                {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground/50 text-center">Simulated only. No real money.</p>
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Tools ── */}
        <TabsContent value="tools" className="flex-1 overflow-y-auto mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {/* Position size calculator */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Target className="w-3 h-3" /> Position Size Calculator
                </p>
                <div className="space-y-2">
                  {[
                    { label: "Account Size ($)", val: accountSize, set: setAccountSize },
                    { label: "Entry Price", val: entry, set: setEntry },
                    { label: "Stop Loss", val: stop, set: setStop },
                    { label: "Risk (%)", val: riskPct, set: setRiskPct },
                  ].map(({ label, val, set }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <label className="text-[10px] text-muted-foreground shrink-0 w-24">{label}</label>
                      <Input type="number" value={val} onChange={e => set(e.target.value)}
                        className="h-7 text-xs font-mono w-24 text-right" step="any" />
                    </div>
                  ))}
                </div>
                {riskPerShare > 0 && (
                  <div className="mt-2 bg-muted/30 rounded-lg p-2.5 space-y-1.5">
                    {[
                      { label: "Shares to buy", val: positionSize.toFixed(2), bold: true },
                      { label: "Max loss", val: `$${maxLoss.toFixed(2)}`, color: "text-red-400" },
                    ].map(({ label, val, bold, color }) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={`font-mono ${bold ? "font-bold" : ""} ${color ?? ""}`}>{val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border" />

              {/* R:R calculator */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Calculator className="w-3 h-3" /> Risk / Reward
                </p>
                <div className="space-y-2">
                  {[
                    { label: "Target Price", val: target, set: setTarget },
                  ].map(({ label, val, set }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <label className="text-[10px] text-muted-foreground shrink-0 w-24">{label}</label>
                      <Input type="number" value={val} onChange={e => set(e.target.value)}
                        className="h-7 text-xs font-mono w-24 text-right" step="any" />
                    </div>
                  ))}
                </div>
                {rr !== null && isFinite(rr) && (
                  <div className="mt-2 bg-muted/30 rounded-lg p-2.5 space-y-1.5">
                    {[
                      { label: "R:R ratio", val: `1 : ${rr.toFixed(2)}`, color: rr >= 2 ? "text-emerald-500" : rr >= 1 ? "text-yellow-500" : "text-red-400", bold: true },
                      { label: "Reward (est.)", val: `$${maxGain.toFixed(2)}`, color: "text-emerald-500" },
                      { label: "Risk (est.)", val: `-$${maxLoss.toFixed(2)}`, color: "text-red-400" },
                    ].map(({ label, val, color, bold }) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={`font-mono ${bold ? "font-bold" : ""} ${color}`}>{val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border" />

              {/* Alerts */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Bell className="w-3 h-3" /> Price Alerts — {symbol || "no symbol"}
                </p>
                {alerts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No alerts. Use the alert tool on the chart.</p>
                ) : (
                  <div className="space-y-1.5">
                    {alerts.map(a => (
                      <div key={a.id} className="flex items-center justify-between bg-muted/30 rounded px-2.5 py-1.5">
                        <div>
                          <span className="text-xs font-mono font-semibold">${a.price.toFixed(2)}</span>
                          <Badge variant="outline" className={`ml-1.5 text-[9px] ${a.direction === "above" ? "text-emerald-500 border-emerald-500/30" : "text-red-400 border-red-400/30"}`}>
                            {a.direction}
                          </Badge>
                          {a.triggered && <Badge className="ml-1 text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30">triggered</Badge>}
                        </div>
                        <button onClick={() => setAlerts(alerts.filter(x => x.id !== a.id))}
                          className="text-muted-foreground hover:text-red-400 cursor-pointer bg-transparent border-0 p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => setAlerts([])}
                      className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors cursor-pointer bg-transparent border-0 p-0">
                      Clear all alerts
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-border" />

              {/* Technical Signals */}
              {liveData && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Technical Signals
                  </p>
                  <div className="space-y-2">
                    {/* RSI */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">RSI ({rsi.toFixed(1)})</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${rsi >= 70 ? "bg-red-400" : rsi <= 30 ? "bg-emerald-400" : "bg-blue-400"}`}
                            style={{ width: `${Math.min(rsi, 100)}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-semibold w-16 text-right ${rsiColor}`}>{rsiSignal}</span>
                      </div>
                    </div>
                    {/* MACD */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">MACD hist</span>
                      <span className={`text-[10px] font-semibold font-mono ${macdBull ? "text-emerald-500" : "text-red-400"}`}>
                        {macdHist >= 0 ? "+" : ""}{macdHist.toFixed(4)} {macdBull ? "▲ Bull" : "▼ Bear"}
                      </span>
                    </div>
                    {/* BB %B */}
                    {bbPct !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">BB position</span>
                        <span className={`text-[10px] font-semibold ${bbPct > 80 ? "text-red-400" : bbPct < 20 ? "text-emerald-500" : "text-muted-foreground"}`}>
                          {bbPct.toFixed(0)}%
                          {bbPct > 80 ? " Near top" : bbPct < 20 ? " Near bottom" : " Mid-range"}
                        </span>
                      </div>
                    )}
                    {/* SMA cross */}
                    {smaCross && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">SMA20 vs SMA50</span>
                        <span className={`text-[10px] font-semibold ${smaCross === "Bullish" ? "text-emerald-500" : "text-red-400"}`}>
                          {smaCross === "Bullish" ? "▲" : "▼"} {smaCross}
                        </span>
                      </div>
                    )}
                    {/* ATR */}
                    {atr > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">ATR (volatility)</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{atr.toFixed(4)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t border-border" />

              {/* Key Levels */}
              {liveData && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Key Levels
                  </p>
                  {assetType === "forex" && pivotP > 0 ? (
                    <div className="space-y-1">
                      {[
                        { label: "R2", val: pivotR2, color: "text-red-300" },
                        { label: "R1", val: pivotR1, color: "text-red-400" },
                        { label: "Pivot", val: pivotP, color: "text-amber-400", bold: true },
                        { label: "S1", val: pivotS1, color: "text-emerald-500" },
                        { label: "S2", val: pivotS2, color: "text-emerald-300" },
                      ].map(({ label, val, color, bold }) => (
                        <div key={label} className={`flex justify-between text-[10px] px-2 py-0.5 rounded ${label === "Pivot" ? "bg-muted/20" : ""}`}>
                          <span className={`${color} ${bold ? "font-bold" : ""}`}>{label}</span>
                          <span className={`font-mono ${color} ${bold ? "font-bold" : ""}`}>{val.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {hi52w > 0 && (
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">52w High</span>
                          <span className="font-mono text-red-400">${hi52w.toFixed(2)}</span>
                        </div>
                      )}
                      {lo52w > 0 && (
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">52w Low</span>
                          <span className="font-mono text-emerald-500">${lo52w.toFixed(2)}</span>
                        </div>
                      )}
                      {atr > 0 && (
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">ATR range</span>
                          <span className="font-mono text-muted-foreground">±${atr.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-border" />

              {/* Pip / Point value calculator */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <BarChart2 className="w-3 h-3" /> {assetType === "forex" ? "Pip Value" : "Point Value"}
                </p>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="text-[10px] text-muted-foreground shrink-0 w-24">
                    {assetType === "forex" ? "Units" : "Shares"}
                  </label>
                  <Input type="number" value={lotSize} onChange={e => setLotSize(e.target.value)}
                    className="h-7 text-xs font-mono w-24 text-right" step="any" min={0} />
                </div>
                {pipValue !== null && pipValue > 0 && (
                  <div className="bg-muted/30 rounded-lg p-2.5 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Value per pip</span>
                      <span className="font-mono font-bold">${pipValue.toFixed(4)}</span>
                    </div>
                    {stop && parseFloat(stop) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Stop loss value</span>
                        <span className="font-mono text-red-400">
                          ${(Math.abs(parseFloat(entry || "0") - parseFloat(stop)) / pipSize * pipValue).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {assetType === "stock" && lotSizeN > 0 && liveDataPrice > 0 && (
                  <div className="bg-muted/30 rounded-lg p-2.5 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Position value</span>
                      <span className="font-mono font-bold">${(lotSizeN * liveDataPrice).toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">$1 move</span>
                      <span className="font-mono text-emerald-500">±${lotSizeN.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Notes ── */}
        <TabsContent value="notes" className="flex-1 overflow-y-auto mt-0">
          <div className="p-3 h-full flex flex-col gap-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Trade journal — {symbol || "no symbol"}
            </p>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={`Notes for ${symbol || "this symbol"}...\n\nIdeas, setups, observations.`}
              className="flex-1 resize-none text-xs font-mono bg-muted/20 border-border min-h-[300px]"
            />
            <p className="text-[10px] text-muted-foreground/50">Auto-saved to your browser. {notes.length > 0 && <Check className="inline w-3 h-3 text-emerald-500" />}</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface Props { onNavigate: (r: Route) => void }

export default function TradingTerminalPage({ onNavigate }: Props) {
  const { isSignedIn } = useAuth()
  const { getPortfolios } = useAccount()
  const { market, stocks, forexPairs, getDetail, getForexPair } = useSimulation()

  const [selectedSymbol, setSelectedSymbol] = useState<{ symbol: string; assetType: "stock" | "forex" } | null>(null)
  const [detail, setDetail] = useState<StockDetail | ForexPairDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([])
  const [selectedPortfolio, setSelectedPortfolio] = useState<number | null>(null)

  const [chartMode, setChartMode] = useState<"candle" | "line">("candle")
  const [activeTool, setActiveTool] = useState<ToolMode>("cursor")
  const [drawColor, setDrawColor] = useState("#ffffff")

  const sym = selectedSymbol?.symbol ?? ""
  const [drawings, setDrawings] = useDrawings(sym)
  const [alerts, setAlerts] = useAlerts(sym)
  const [notes, setNotes] = useNotes(sym)

  // Load portfolios
  useEffect(() => {
    if (!isSignedIn) return
    getPortfolios().then((ps: PortfolioSummary[]) => {
      setPortfolios(ps)
      if (ps.length > 0 && !selectedPortfolio) setSelectedPortfolio(ps[0].id)
    }).catch(() => {})
  }, [isSignedIn, getPortfolios])

  // Auto-select first stock
  useEffect(() => {
    if (!selectedSymbol && Object.keys(stocks).length > 0) {
      const ticker = Object.keys(stocks).sort()[0]
      setSelectedSymbol({ symbol: ticker, assetType: "stock" })
    }
  }, [stocks])

  // Load detail when symbol changes
  const loadDetail = useCallback(async (sym: string, assetType: string) => {
    setDetailLoading(true)
    try {
      const d = assetType === "stock" ? await getDetail(sym) : await getForexPair(sym)
      setDetail(d)
    } finally {
      setDetailLoading(false)
    }
  }, [getDetail, getForexPair])

  useEffect(() => {
    if (selectedSymbol) loadDetail(selectedSymbol.symbol, selectedSymbol.assetType)
  }, [selectedSymbol, loadDetail])

  // Refresh detail on market tick
  useEffect(() => {
    if (!selectedSymbol || !detail) return
    if (selectedSymbol.assetType === "stock") {
      getDetail(selectedSymbol.symbol).then(d => { if (d) setDetail(d) }).catch(() => {})
    } else {
      getForexPair(selectedSymbol.symbol).then(d => { if (d) setDetail(d) }).catch(() => {})
    }
  }, [market])

  // Check alerts against live price
  useEffect(() => {
    if (!sym || alerts.length === 0) return
    const livePrice = selectedSymbol?.assetType === "stock" ? stocks[sym]?.price : forexPairs[sym]?.price
    if (!livePrice) return
    const updated = alerts.map(a => {
      if (a.triggered) return a
      const hit = (a.direction === "above" && livePrice >= a.price) || (a.direction === "below" && livePrice <= a.price)
      return hit ? { ...a, triggered: true } : a
    })
    if (updated.some((a, i) => a.triggered !== alerts[i].triggered)) setAlerts(updated)
  }, [market, sym, alerts])

  const liveStock = selectedSymbol?.assetType === "stock" ? stocks[sym] : null
  const liveForex = selectedSymbol?.assetType === "forex" ? forexPairs[sym] : null
  const livePrice = liveStock?.price ?? liveForex?.price ?? detail?.price ?? 0
  const liveChange = liveStock?.change ?? liveForex?.changePct ?? detail?.change ?? 0

  // Chart data: prefer detail candles, fallback to live summary history
  const candles = detail?.candles ?? []
  const history = detail?.history ?? []
  const sma20 = detail?.sma20 ?? liveStock?.sma20 ?? 0
  const sma50 = detail?.sma50 ?? liveStock?.sma50 ?? 0
  const bbUpper = detail?.bbUpper ?? liveStock?.bbUpper ?? 0
  const bbMiddle = detail?.bbMiddle ?? liveStock?.bbMiddle ?? 0
  const bbLower = detail?.bbLower ?? liveStock?.bbLower ?? 0
  const vwap = detail?.vwap ?? liveStock?.vwap ?? 0
  const macd = detail?.macd ?? liveStock?.macd ?? 0
  const macdSignal = detail?.macdSignal ?? liveStock?.macdSignal ?? 0
  const macdHist = detail?.macdHist ?? liveStock?.macdHist ?? 0

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

      {/* Left: symbol list */}
      <div className="w-52 xl:w-60 shrink-0 flex flex-col hidden sm:flex">
        <SymbolListPanel
          selected={selectedSymbol}
          onSelect={s => setSelectedSymbol({ symbol: s.symbol, assetType: s.assetType })}
        />
      </div>

      {/* Center: chart */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Symbol header */}
        <div className="px-4 py-2 border-b border-border bg-card/30 flex items-center gap-3 flex-wrap shrink-0">
          {selectedSymbol ? (
            <>
              <h2 className="text-lg font-extrabold font-mono tracking-tight">{sym}</h2>
              {detail?.name && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{detail.name}</span>}
              <span className="text-lg font-mono font-bold tabular-nums">${livePrice.toFixed(selectedSymbol.assetType === "forex" ? 4 : 2)}</span>
              <span className={`text-sm font-semibold ${liveChange >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                {liveChange >= 0 ? "+" : ""}{liveChange.toFixed(2)}%
              </span>
              {detail?.sector && <Badge variant="secondary" className="text-[10px]">{detail.sector}</Badge>}
              {detail?.session && (
                <Badge variant="outline" className={`text-[10px] ${detail.session === "open" ? "text-emerald-500 border-emerald-500/30" : "text-muted-foreground"}`}>
                  {detail.session}
                </Badge>
              )}
              {detailLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-auto" />}
              <button onClick={() => onNavigate("market")}
                className="ml-auto text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0 transition-colors">
                Full view <ChevronRight className="w-3 h-3" />
              </button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a symbol to begin</p>
          )}
        </div>

        {/* Drawing toolbar */}
        <DrawingToolbar
          tool={activeTool} setTool={setActiveTool}
          color={drawColor} setColor={setDrawColor}
          onClear={() => setDrawings([])}
          chartMode={chartMode} setChartMode={setChartMode}
        />

        {/* Chart area */}
        <div className="flex-1 overflow-hidden" style={{ background: BG }}>
          {!selectedSymbol ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">← Select a symbol from the list</p>
            </div>
          ) : detailLoading && candles.length === 0 && history.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <TradingChart
              candles={candles} history={history} price={livePrice}
              sma20={sma20} sma50={sma50} bbUpper={bbUpper} bbMiddle={bbMiddle} bbLower={bbLower} vwap={vwap}
              macd={macd} macdSignal={macdSignal} macdHist={macdHist}
              chartMode={chartMode} activeTool={activeTool} drawColor={drawColor}
              drawings={drawings} alerts={alerts}
              onAddDrawing={d => setDrawings([...drawings, d])}
              onRemoveDrawing={id => setDrawings(drawings.filter(d => d.id !== id))}
              onAddAlert={a => setAlerts([...alerts, a])}
              currentPrice={livePrice}
            />
          )}
        </div>

        {/* Bottom market bar */}
        {market && (
          <div className="px-3 py-1.5 border-t border-border bg-card/20 flex items-center gap-4 text-[10px] text-muted-foreground shrink-0 flex-wrap">
            <span>Index <span className="text-foreground font-mono font-semibold">{market.index.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></span>
            <span className={market.indexChangePct >= 0 ? "text-emerald-500" : "text-red-400"}>
              {market.indexChangePct >= 0 ? "+" : ""}{market.indexChangePct.toFixed(2)}%
            </span>
            <span>F&amp;G <span className="font-semibold text-foreground">{market.fearGreed}</span> <span className="text-muted-foreground/60">{market.fearGreedLabel}</span></span>
            <span>VIX <span className="font-mono">{market.vix.toFixed(1)}</span></span>
            <span className="text-emerald-600">{market.gainers}↑</span>
            <span className="text-red-400">{market.losers}↓</span>
            <span className="ml-auto">Tick #{market.tickCount}</span>
          </div>
        )}
      </div>

      {/* Right: trading panel */}
      <div className="w-72 xl:w-80 shrink-0 flex flex-col">
        <RightPanel
          symbol={sym} assetType={selectedSymbol?.assetType ?? "stock"}
          currentPrice={livePrice}
          portfolios={portfolios} selectedPortfolio={selectedPortfolio} setSelectedPortfolio={setSelectedPortfolio}
          alerts={alerts} setAlerts={setAlerts}
          notes={notes} setNotes={setNotes}
        />
      </div>
    </div>
  )
}
