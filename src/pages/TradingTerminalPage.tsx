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
  Search, TrendingUp, Bell,
  Loader2, ShoppingCart,
  BookOpen, Calculator, Target, X, Check,
  BarChart2, ChevronRight, Layers, Plus,
} from "lucide-react"
import { useAccount } from "@/hooks/useAccount"
import { useSimulation } from "@/lib/SimulationContext"
import type { StockDetail, ForexPairDetail, CryptoDetail, Candle } from "@/lib/SimulationContext"
import type { Route } from "@/App"
// ── New layout & panel system ─────────────────────────────────────────────────
import { PanelGrid, getPanelTypes } from "@/components/trading/PanelGrid"
import { PanelLibrary } from "@/components/trading/PanelLibrary"
import { LayoutsDropdown } from "@/components/trading/LayoutsDropdown"
import { DrawingToolbar as NewDrawingToolbar } from "@/components/trading/DrawingToolbar"
import { IndicatorsPanel } from "@/components/trading/IndicatorsPanel"
import { OrderBookPanel } from "@/components/trading/panels/OrderBookPanel"
import { TimeSalesPanel } from "@/components/trading/panels/TimeSalesPanel"
import { HeatmapPanel } from "@/components/trading/panels/HeatmapPanel"
import { ScannerPanel } from "@/components/trading/panels/ScannerPanel"
import { DomLadderPanel } from "@/components/trading/panels/DomLadderPanel"
import { NewsPanel } from "@/components/trading/panels/NewsPanel"
import { CalendarPanel } from "@/components/trading/panels/CalendarPanel"
import type { PanelType, SavedLayout, LayoutNode, IndicatorConfig } from "@/components/trading/types"
import { DEFAULT_INDICATORS } from "@/components/trading/types"
import { DEFAULT_LAYOUT } from "@/lib/trading/layoutPresets"
import { loadActiveLayout, saveActiveLayout, loadSavedLayouts, saveUserLayout, deleteUserLayout, renameUserLayout } from "@/lib/trading/layoutStorage"
import {
  calcEMA, calcWMA, calcBB, calcRSI, calcStochastic, calcCCI,
  calcATR, calcOBV, calcParabolicSAR, calcIchimoku, calcKeltner, calcDonchian,
  calcLinReg, calcPivots, calcSMA,
} from "@/lib/trading/indicators"

// ── Timeframe aggregation ─────────────────────────────────────────────────────
const TF_GROUP: Record<string, number> = {
  "1m": 1, "5m": 3, "15m": 6, "1h": 12, "4h": 24, "D": 48, "W": 48,
}
function aggregateCandles(candles: Candle[], n: number): Candle[] {
  if (n <= 1) return candles
  const out: Candle[] = []
  for (let i = 0; i < candles.length; i += n) {
    const g = candles.slice(i, i + n)
    out.push({
      o: g[0].o, h: Math.max(...g.map(c => c.h)), l: Math.min(...g.map(c => c.l)), c: g[g.length - 1].c,
      v: g.reduce((s, c) => s + c.v, 0),
      bv: g.reduce((s, c) => s + (c.bv ?? 0), 0),
      sv: g.reduce((s, c) => s + (c.sv ?? 0), 0),
      t: g[g.length - 1].t,
    })
  }
  return out
}

// ── Chart palette (matches MarketPage) ───────────────────────────────────────
const BG   = "oklch(0.13 0.004 264)"
const GAIN = "#4ade80"
const LOSS = "#f87171"
const DIM  = "rgba(255,255,255,0.3)"
const CARD_BG = "oklch(0.165 0.004 264)"

// ── Types ────────────────────────────────────────────────────────────────────
type ToolMode =
  | "cursor" | "hline" | "vline" | "trendline" | "ray" | "channel"
  | "rect" | "ellipse" | "arrow" | "text" | "fib" | "measure" | "alert" | "erase"
  | "extline" | "trendangle" | "pitchfork"
  | "triangle" | "brush"
  | "fibext" | "fibfan" | "fibtime"
  | "callout" | "pricenote"

interface Drawing {
  id: string
  type: "hline" | "vline" | "trendline" | "ray" | "channel" | "rect" | "ellipse" | "arrow" | "text" | "fib"
    | "extline" | "trendangle" | "pitchfork"
    | "triangle" | "brush"
    | "fibext" | "fibfan" | "fibtime"
    | "callout" | "pricenote"
  color: string
  price?: number
  idxFromRight?: number
  label?: string
  p1?: { price: number; idxFromRight: number }
  p2?: { price: number; idxFromRight: number }
  p3?: { price: number; idxFromRight: number }
  p4?: { price: number; idxFromRight: number }
  points?: { price: number; idxFromRight: number }[]
  text?: string
  fontSize?: "sm" | "md" | "lg"
  showBg?: boolean
  lineStyle?: "solid" | "dashed" | "dotted"
  lineWidth?: 1 | 2 | 3
}

interface PendingOrder {
  id: number
  portfolio_id: number
  asset_type: string
  symbol: string
  side: "buy" | "sell"
  quantity: number
  order_type: "limit" | "stop"
  trigger_price: number
  created_at: string
}

interface PortfolioSnapshot {
  total_value: number
  snapped_at: string
}

interface PortfolioStats {
  total_value: number
  total_cash: number
  position_value: number
  unrealised_pnl: number
  total_orders: number
  total_closed: number
  winning_trades: number
  win_rate: number | null
  avg_pnl: number | null
  best_trade: number | null
  worst_trade: number | null
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

interface Position {
  id: number; portfolio_id: number; asset_type: string
  symbol: string; quantity: number; avg_cost: number; opened_at: string
}

interface RecentOrder {
  id: number; asset_type: string; symbol: string
  side: "buy" | "sell"; quantity: number; price: number; total: number
  executed_at: string; portfolio_id: number; portfolio_name: string
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

// ── Toast ────────────────────────────────────────────────────────────────────
interface Toast { id: number; text: string; type: "success" | "error" | "info" }
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const add = useCallback((text: string, type: Toast["type"] = "success") => {
    const id = Date.now()
    setToasts(ts => [...ts.slice(-3), { id, text, type }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3500)
  }, [])
  return { toasts, add }
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`px-3 py-2 rounded-lg text-xs font-medium shadow-lg border transition-all duration-300
          ${t.type === "success" ? "bg-emerald-900/90 border-emerald-500/40 text-emerald-200" :
            t.type === "error" ? "bg-red-900/90 border-red-500/40 text-red-200" :
            "bg-amber-900/90 border-amber-500/40 text-amber-200"}`}>
          {t.text}
        </div>
      ))}
    </div>
  )
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
  const fsPx = d.fontSize === "lg" ? 16 : d.fontSize === "sm" ? 10 : 12
  ctx.save(); ctx.globalAlpha = alpha
  ctx.font = `bold ${fsPx}px 'DM Mono',monospace`
  const tw = ctx.measureText(d.text).width
  if (d.showBg !== false) {
    ctx.fillStyle = d.color + "22"; ctx.strokeStyle = d.color + "88"; ctx.lineWidth = 1
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(x - 4, y - fsPx - 5, tw + 16, fsPx + 10, 4)
    else ctx.rect(x - 4, y - fsPx - 5, tw + 16, fsPx + 10)
    ctx.fill(); ctx.stroke()
  }
  ctx.fillStyle = d.color; ctx.textAlign = "left"; ctx.fillText(d.text, x + 4, y - 1)
  ctx.restore()
}

function renderAlert(ctx: CanvasRenderingContext2D, g: ChartGeom, a: PriceAlert, currentPrice: number, alpha = 1) {
  const y = toY(g, a.price)
  if (y < g.pad.t - 10 || y > g.cssH - g.pad.b + 10) return
  const pct = currentPrice > 0 ? Math.abs((a.price - currentPrice) / currentPrice) * 100 : 100
  const color = a.triggered ? "rgba(251,191,36,0.35)" : pct < 1 ? "rgba(239,68,68,0.85)" : pct < 2 ? "rgba(251,191,36,0.85)" : "rgba(251,191,36,0.75)"
  ctx.save(); ctx.globalAlpha = alpha
  ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
  ctx.beginPath(); ctx.moveTo(g.pad.l, y); ctx.lineTo(g.cssW - g.pad.r, y); ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = color; ctx.font = "10px monospace"; ctx.textAlign = "left"
  ctx.fillText(`▲ ${a.price.toFixed(2)} ${a.direction}`, g.pad.l + 4, y - 3)
  ctx.restore()
}

function renderVLine(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (d.idxFromRight === undefined) return
  const x = idxToX(g, d.idxFromRight)
  ctx.save(); ctx.globalAlpha = alpha
  ctx.strokeStyle = d.color; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4])
  ctx.beginPath(); ctx.moveTo(x, g.pad.t); ctx.lineTo(x, g.cssH - g.pad.b); ctx.stroke()
  ctx.setLineDash([])
  if (d.label) {
    ctx.fillStyle = d.color; ctx.font = "10px 'DM Mono',monospace"; ctx.textAlign = "center"
    ctx.fillText(d.label, x, g.pad.t + 12)
  }
  ctx.restore()
}

function renderRay(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (!d.p1 || !d.p2) return
  const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
  const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
  // Extend to right chart edge
  const dx = x2 - x1, dy = y2 - y1
  const xEnd = g.cssW - g.pad.r
  const t = dx !== 0 ? (xEnd - x1) / dx : 1
  const yEnd = y1 + t * dy
  ctx.save(); ctx.globalAlpha = alpha
  ctx.strokeStyle = d.color; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(xEnd, yEnd); ctx.stroke()
  ctx.beginPath(); ctx.arc(x1, y1, 3, 0, Math.PI * 2); ctx.fillStyle = d.color; ctx.fill()
  ctx.restore()
}

function renderChannel(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (!d.p1 || !d.p2 || !d.p3) return
  const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
  const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
  // Parallel line offset from p3
  const y3 = toY(g, d.p3.price)
  const dy = y3 - y1
  ctx.save(); ctx.globalAlpha = alpha
  ctx.strokeStyle = d.color; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x1, y1 + dy); ctx.lineTo(x2, y2 + dy); ctx.stroke()
  // Fill
  ctx.fillStyle = d.color + "10"
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 + dy); ctx.lineTo(x1, y1 + dy); ctx.closePath(); ctx.fill()
  ctx.restore()
}

function renderEllipse(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (!d.p1 || !d.p2) return
  const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
  const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2
  ctx.save(); ctx.globalAlpha = alpha
  ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2)
  ctx.fillStyle = d.color + "15"; ctx.fill()
  ctx.strokeStyle = d.color + "80"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([])
  ctx.restore()
}

function renderArrow(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (!d.p1 || !d.p2) return
  const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
  const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 12
  ctx.save(); ctx.globalAlpha = alpha
  ctx.strokeStyle = d.color; ctx.fillStyle = d.color; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6))
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6))
  ctx.closePath(); ctx.fill()
  if (d.label) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
    ctx.font = "11px 'DM Mono',monospace"; ctx.textAlign = "center"
    ctx.fillText(d.label, mx, my - 6)
  }
  ctx.restore()
}

function renderFib(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (!d.p1 || !d.p2) return
  const priceHigh = Math.max(d.p1.price, d.p2.price)
  const priceLow  = Math.min(d.p1.price, d.p2.price)
  const range = priceHigh - priceLow
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0]
  const colors  = ["#4ade80","#60a5fa","#c084fc","#f97316","#c084fc","#60a5fa","#f87171"]
  ctx.save(); ctx.globalAlpha = alpha
  ctx.font = "10px 'DM Mono',monospace"; ctx.textAlign = "left"
  const x1 = g.pad.l, x2 = g.cssW - g.pad.r
  levels.forEach((lvl, i) => {
    const price = priceHigh - lvl * range
    const y = toY(g, price)
    ctx.strokeStyle = colors[i]; ctx.lineWidth = 1; ctx.setLineDash([4, 3])
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); ctx.setLineDash([])
    ctx.fillStyle = colors[i]
    ctx.fillText(`${(lvl * 100).toFixed(1)}%  ${price.toFixed(2)}`, x2 + 4, y + 4)
  })
  // Colored bands
  for (let i = 0; i < levels.length - 1; i++) {
    const p1 = priceHigh - levels[i] * range
    const p2 = priceHigh - levels[i + 1] * range
    const yT = toY(g, p1), yB = toY(g, p2)
    ctx.fillStyle = colors[i] + "08"
    ctx.fillRect(x1, yT, x2 - x1, yB - yT)
  }
  ctx.restore()
}

function renderExtLine(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (!d.p1 || !d.p2) return
  const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
  const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
  const dx = x2 - x1, dy = y2 - y1
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return
  const tLeft = dx !== 0 ? (g.pad.l - x1) / dx : -Infinity
  const tRight = dx !== 0 ? (g.cssW - g.pad.r - x1) / dx : Infinity
  const tMin = Math.min(tLeft, tRight), tMax = Math.max(tLeft, tRight)
  const xA = x1 + tMin * dx, yA = y1 + tMin * dy
  const xB = x1 + tMax * dx, yB = y1 + tMax * dy
  ctx.save(); ctx.globalAlpha = alpha
  ctx.strokeStyle = d.color; ctx.lineWidth = d.lineWidth ?? 1.5
  applyLineDash(ctx, d.lineStyle)
  ctx.beginPath(); ctx.moveTo(xA, yA); ctx.lineTo(xB, yB); ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = d.color
  ;[[x1, y1], [x2, y2]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill() })
  ctx.restore()
}

function renderTrendAngle(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (!d.p1 || !d.p2) return
  const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
  const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
  const angle = Math.atan2(-(y2 - y1), x2 - x1) * 180 / Math.PI
  ctx.save(); ctx.globalAlpha = alpha
  ctx.strokeStyle = d.color; ctx.lineWidth = d.lineWidth ?? 1.5
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  ctx.fillStyle = d.color
  ;[[x1, y1], [x2, y2]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill() })
  ctx.font = "10px 'DM Mono',monospace"; ctx.textAlign = "left"
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  ctx.fillText(`${angle.toFixed(1)}°`, mx + 6, my - 4)
  ctx.restore()
}

function renderPitchfork(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (!d.p1 || !d.p2 || !d.p3) return
  const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
  const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
  const x3 = idxToX(g, d.p3.idxFromRight), y3 = toY(g, d.p3.price)
  const midX = (x2 + x3) / 2, midY = (y2 + y3) / 2
  const xEnd = g.cssW - g.pad.r
  const dx = midX - x1
  const t = dx !== 0 ? (xEnd - x1) / dx : 1
  ctx.save(); ctx.globalAlpha = alpha
  ctx.strokeStyle = d.color; ctx.lineWidth = d.lineWidth ?? 1.5
  ;[[x1, y1, midX, midY], [x1, y1, x2, y2], [x1, y1, x3, y3]].forEach(([ax, ay, bx, by]) => {
    const T = (bx - ax) !== 0 ? (xEnd - ax) / (bx - ax) : t
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + T * (bx - ax), ay + T * (by - ay)); ctx.stroke()
  })
  ctx.fillStyle = d.color
  ;[[x1, y1], [x2, y2], [x3, y3]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill() })
  // Connection bar between p2 and p3
  ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke(); ctx.setLineDash([])
  ctx.restore()
}

function renderTriangle(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (!d.p1 || !d.p2 || !d.p3) return
  const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
  const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
  const x3 = idxToX(g, d.p3.idxFromRight), y3 = toY(g, d.p3.price)
  ctx.save(); ctx.globalAlpha = alpha
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath()
  ctx.fillStyle = d.color + "15"; ctx.fill()
  ctx.strokeStyle = d.color; ctx.lineWidth = d.lineWidth ?? 1.5; ctx.stroke()
  ctx.fillStyle = d.color
  ;[[x1, y1], [x2, y2], [x3, y3]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill() })
  ctx.restore()
}

function renderBrush(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (!d.points || d.points.length < 2) return
  ctx.save(); ctx.globalAlpha = alpha
  ctx.strokeStyle = d.color; ctx.lineWidth = d.lineWidth ?? 1.5; ctx.lineJoin = "round"; ctx.lineCap = "round"
  ctx.beginPath()
  d.points.forEach((pt, i) => {
    const x = idxToX(g, pt.idxFromRight), y = toY(g, pt.price)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.stroke()
  ctx.restore()
}

function renderFibExt(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (!d.p1 || !d.p2) return
  const priceLow = Math.min(d.p1.price, d.p2.price)
  const priceHigh = Math.max(d.p1.price, d.p2.price)
  const range = priceHigh - priceLow
  const levels = [0, 0.382, 0.618, 1.0, 1.272, 1.618, 2.0, 2.618]
  const colors  = ["#94a3b8","#60a5fa","#a78bfa","#4ade80","#f97316","#f87171","#fbbf24","#fb7185"]
  ctx.save(); ctx.globalAlpha = alpha
  ctx.font = "10px 'DM Mono',monospace"; ctx.textAlign = "left"
  const x1 = g.pad.l, x2 = g.cssW - g.pad.r
  levels.forEach((lvl, i) => {
    const price = priceHigh + lvl * range
    const y = toY(g, price)
    if (y < g.pad.t - 20 || y > g.cssH) return
    ctx.strokeStyle = colors[i]; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); ctx.setLineDash([])
    ctx.fillStyle = colors[i]
    ctx.fillText(`${(lvl * 100).toFixed(1)}%  ${price.toFixed(2)}`, x2 + 4, y + 4)
  })
  ctx.restore()
}

function renderFibFan(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (!d.p1 || !d.p2) return
  const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
  const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
  const ratios = [0.236, 0.382, 0.5, 0.618, 0.786]
  const colors  = ["#60a5fa","#a78bfa","#4ade80","#f97316","#f87171"]
  const xEnd = g.cssW - g.pad.r
  ctx.save(); ctx.globalAlpha = alpha
  ratios.forEach((r, i) => {
    const fanY = y1 + (y2 - y1) * r
    ctx.strokeStyle = colors[i]; ctx.lineWidth = 1; ctx.setLineDash([4, 3])
    const dx = x2 - x1, dy = fanY - y1
    const T = dx !== 0 ? (xEnd - x1) / dx : 1
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + T * dx, y1 + T * dy); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = colors[i]; ctx.font = "9px 'DM Mono',monospace"; ctx.textAlign = "left"
    ctx.fillText(`${(r * 100).toFixed(1)}%`, xEnd + 4, y1 + T * dy + 3)
  })
  ctx.restore()
}

function renderFibTime(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (!d.p1 || !d.p2) return
  const x1 = idxToX(g, d.p1.idxFromRight), x2 = idxToX(g, d.p2.idxFromRight)
  const dx = x2 - x1
  const fibNums = [1, 1, 2, 3, 5, 8, 13, 21]
  ctx.save(); ctx.globalAlpha = alpha
  ctx.font = "9px 'DM Mono',monospace"; ctx.textAlign = "center"
  fibNums.forEach((f, i) => {
    const x = x1 + dx * f
    if (x < g.pad.l || x > g.cssW - g.pad.r) return
    ctx.strokeStyle = `rgba(167,139,250,${0.3 + i * 0.04})`; ctx.lineWidth = 1; ctx.setLineDash([3, 4])
    ctx.beginPath(); ctx.moveTo(x, g.pad.t); ctx.lineTo(x, g.cssH - g.pad.b); ctx.stroke(); ctx.setLineDash([])
    ctx.fillStyle = `rgba(167,139,250,0.7)`
    ctx.fillText(String(f), x, g.pad.t + 10)
  })
  ctx.restore()
}

function renderCallout(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (!d.p1 || !d.text) return
  const x = idxToX(g, d.p1.idxFromRight), y = toY(g, d.p1.price)
  const fsPx = 11, pad = 6, bw = Math.max(80, ctx.measureText(d.text).width + pad * 2 + 8), bh = fsPx + pad * 2
  const bx = x + 10, by = y - bh / 2
  ctx.save(); ctx.globalAlpha = alpha
  ctx.font = `${fsPx}px 'DM Mono',monospace`
  ctx.fillStyle = d.color + "22"; ctx.strokeStyle = d.color + "88"; ctx.lineWidth = 1
  if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 4); else ctx.rect(bx, by, bw, bh)
  ctx.fill(); ctx.stroke()
  // Tail
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(bx, by + bh / 2); ctx.strokeStyle = d.color + "88"; ctx.stroke()
  ctx.fillStyle = d.color; ctx.textAlign = "left"
  ctx.fillText(d.text, bx + pad, by + bh / 2 + fsPx * 0.35)
  ctx.restore()
}

function renderPriceNote(ctx: CanvasRenderingContext2D, g: ChartGeom, d: Drawing, alpha = 1) {
  if (d.price === undefined || !d.text) return
  const y = toY(g, d.price)
  ctx.save(); ctx.globalAlpha = alpha
  ctx.font = "10px 'DM Mono',monospace"; ctx.textAlign = "left"
  const tw = ctx.measureText(d.text).width
  ctx.fillStyle = d.color + "22"; ctx.strokeStyle = d.color; ctx.lineWidth = 1
  ctx.fillRect(g.pad.l, y - 10, tw + 16, 14); ctx.strokeRect(g.pad.l, y - 10, tw + 16, 14)
  ctx.fillStyle = d.color
  ctx.fillText(d.text, g.pad.l + 6, y + 1)
  ctx.setLineDash([4, 3])
  ctx.beginPath(); ctx.moveTo(g.pad.l + tw + 20, y); ctx.lineTo(g.cssW - g.pad.r, y); ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

function applyLineDash(ctx: CanvasRenderingContext2D, style?: string) {
  if (style === "dashed") ctx.setLineDash([6, 4])
  else if (style === "dotted") ctx.setLineDash([2, 3])
  else ctx.setLineDash([])
}

function hitTestLine(x1: number, y1: number, x2: number, y2: number, x: number, y: number, tol = 8) {
  const len2 = (x2 - x1) ** 2 + (y2 - y1) ** 2
  if (len2 === 0) return Math.hypot(x - x1, y - y1) < tol
  const t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / len2))
  return Math.hypot(x - (x1 + t * (x2 - x1)), y - (y1 + t * (y2 - y1))) < tol
}

function hitTest(g: ChartGeom, d: Drawing, x: number, y: number): boolean {
  if (d.type === "hline" && d.price !== undefined) {
    const py = toY(g, d.price)
    return Math.abs(y - py) < 8 && x >= g.pad.l && x <= g.cssW - g.pad.r
  }
  if (d.type === "vline" && d.idxFromRight !== undefined) {
    const px = idxToX(g, d.idxFromRight)
    return Math.abs(x - px) < 8 && y >= g.pad.t && y <= g.cssH - g.pad.b
  }
  if ((d.type === "trendline" || d.type === "ray" || d.type === "arrow") && d.p1 && d.p2) {
    const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
    const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
    return hitTestLine(x1, y1, x2, y2, x, y)
  }
  if (d.type === "channel" && d.p1 && d.p2 && d.p3) {
    const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
    const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
    const dy = toY(g, d.p3.price) - y1
    return hitTestLine(x1, y1, x2, y2, x, y) || hitTestLine(x1, y1 + dy, x2, y2 + dy, x, y)
  }
  if ((d.type === "rect" || d.type === "ellipse" || d.type === "fib") && d.p1 && d.p2) {
    const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
    const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
    return x >= Math.min(x1,x2)-8 && x <= Math.max(x1,x2)+8 && y >= Math.min(y1,y2)-8 && y <= Math.max(y1,y2)+8
  }
  if (d.type === "text" && d.p1) {
    const ax = idxToX(g, d.p1.idxFromRight), ay = toY(g, d.p1.price)
    return Math.abs(x - ax) < 60 && Math.abs(y - ay) < 14
  }
  if ((d.type === "extline" || d.type === "trendangle") && d.p1 && d.p2) {
    const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
    const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
    return hitTestLine(x1, y1, x2, y2, x, y)
  }
  if (d.type === "pitchfork" && d.p1 && d.p2 && d.p3) {
    const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
    const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
    const x3 = idxToX(g, d.p3.idxFromRight), y3 = toY(g, d.p3.price)
    return hitTestLine(x1, y1, (x2+x3)/2, (y2+y3)/2, x, y)
  }
  if (d.type === "triangle" && d.p1 && d.p2 && d.p3) {
    const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
    const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
    const x3 = idxToX(g, d.p3.idxFromRight), y3 = toY(g, d.p3.price)
    return hitTestLine(x1,y1,x2,y2,x,y) || hitTestLine(x2,y2,x3,y3,x,y) || hitTestLine(x3,y3,x1,y1,x,y)
  }
  if ((d.type === "fibext" || d.type === "fibfan" || d.type === "fibtime") && d.p1 && d.p2) {
    const x1 = idxToX(g, d.p1.idxFromRight), y1 = toY(g, d.p1.price)
    const x2 = idxToX(g, d.p2.idxFromRight), y2 = toY(g, d.p2.price)
    return hitTestLine(x1, y1, x2, y2, x, y)
  }
  if (d.type === "callout" && d.p1) {
    const ax = idxToX(g, d.p1.idxFromRight), ay = toY(g, d.p1.price)
    return Math.abs(x - ax) < 80 && Math.abs(y - ay) < 20
  }
  if (d.type === "pricenote" && d.price !== undefined) {
    return Math.abs(y - toY(g, d.price)) < 10
  }
  if (d.type === "brush" && d.points && d.points.length > 1) {
    return d.points.some((pt, i) => {
      if (i === 0) return false
      const prev = d.points![i - 1]
      return hitTestLine(idxToX(g, prev.idxFromRight), toY(g, prev.price), idxToX(g, pt.idxFromRight), toY(g, pt.price), x, y, 6)
    })
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

// ── Volume sub-chart ─────────────────────────────────────────────────────────
function VolumeChart({ candles }: { candles: Candle[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || candles.length < 2) return
    const dpr = window.devicePixelRatio || 1
    const cssW = cv.clientWidth, cssH = cv.clientHeight
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr)
    const ctx = cv.getContext("2d")!; ctx.scale(dpr, dpr)
    const W = cssW, H = cssH, pad = { t: 8, r: 74, b: 4, l: 8 }
    const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b, n = candles.length
    const gap = cW / n, bw = Math.max(1, gap * 0.65)
    const maxVol = Math.max(...candles.map(c => (c.bv ?? 0) + (c.sv ?? 0)), 1)
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.font = "10px 'DM Mono',monospace"; ctx.textAlign = "left"
    ctx.fillText("VOL", pad.l + 4, pad.t + 10)
    candles.forEach((c, i) => {
      const x = pad.l + i * gap + gap / 2
      const bv = c.bv ?? Math.floor((c.v ?? 0) * 0.5), sv = c.sv ?? ((c.v ?? 0) - bv)
      const totalH = ((bv + sv) / maxVol) * cH
      const bvH = totalH * (bv / (bv + sv || 1))
      ctx.fillStyle = `${GAIN}99`; ctx.fillRect(x - bw/2, pad.t + cH - totalH, bw, bvH)
      ctx.fillStyle = `${LOSS}99`; ctx.fillRect(x - bw/2, pad.t + cH - totalH + bvH, bw, totalH - bvH)
    })
  }, [candles])
  return <canvas ref={ref} className="w-full block border-t border-white/5" style={{ background: BG, height: 40 }} />
}

// ── Generic sub-chart canvas helper ──────────────────────────────────────────
function SubChartCanvas({ draw, height = 70, deps }: { draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void; height?: number; deps: unknown[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const dpr = window.devicePixelRatio || 1
    const W = cv.clientWidth, H = cv.clientHeight
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr)
    const ctx = cv.getContext("2d")!; ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
    draw(ctx, W, H)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return <canvas ref={ref} className="w-full block border-t border-white/5" style={{ background: BG, height }} />
}

function RsiChart({ candles, period, color }: { candles: Candle[]; period: number; color: string }) {
  const vals = candles.map(c => c.c)
  const rsi = calcRSI(vals, period)
  return (
    <SubChartCanvas height={70} deps={[candles, period, color]} draw={(ctx, W, H) => {
      const pad = { t: 12, r: 74, b: 4, l: 8 }, cW = W - pad.l - pad.r, cH = H - pad.t - pad.b, n = candles.length
      const gap = cW / n
      const tY = (v: number) => pad.t + cH - (v / 100) * cH
      ;[70, 50, 30].forEach(lvl => {
        ctx.strokeStyle = lvl === 50 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)"; ctx.lineWidth = 1
        ctx.setLineDash(lvl === 50 ? [] : [3,3])
        ctx.beginPath(); ctx.moveTo(pad.l, tY(lvl)); ctx.lineTo(W - pad.r, tY(lvl)); ctx.stroke(); ctx.setLineDash([])
        ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.font = "9px 'DM Mono',monospace"; ctx.textAlign = "left"
        ctx.fillText(String(lvl), W - pad.r + 4, tY(lvl) + 3)
      })
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1
      let started = false
      rsi.forEach((v, i) => { if (v === null) { started = false; return }; const x = pad.l + i*gap+gap/2; started ? ctx.lineTo(x, tY(v)) : (ctx.moveTo(x, tY(v)), (started = true)) })
      ctx.stroke()
      const last = rsi.filter(v => v !== null).at(-1)
      ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "10px 'DM Mono',monospace"; ctx.textAlign = "left"
      ctx.fillText(`RSI(${period}) ${last?.toFixed(1) ?? "-"}`, pad.l + 4, pad.t - 1)
    }} />
  )
}

function StochChart({ candles, k, d, color }: { candles: Candle[]; k: number; d: number; color: string }) {
  const { kLine, dLine } = calcStochastic(candles, k, d)
  return (
    <SubChartCanvas height={70} deps={[candles, k, d, color]} draw={(ctx, W, H) => {
      const pad = { t: 12, r: 74, b: 4, l: 8 }, cW = W - pad.l - pad.r, cH = H - pad.t - pad.b, n = candles.length
      const gap = cW / n, tY = (v: number) => pad.t + cH - (v / 100) * cH
      ;[80, 20].forEach(lvl => {
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1; ctx.setLineDash([3,3])
        ctx.beginPath(); ctx.moveTo(pad.l, tY(lvl)); ctx.lineTo(W - pad.r, tY(lvl)); ctx.stroke(); ctx.setLineDash([])
        ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.font = "9px 'DM Mono',monospace"; ctx.textAlign = "left"
        ctx.fillText(String(lvl), W - pad.r + 4, tY(lvl) + 3)
      })
      ;[{line: kLine, col: color}, {line: dLine, col: "#f87171"}].forEach(({line, col}) => {
        ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 1; let s = false
        line.forEach((v, i) => { if (v === null) { s = false; return }; const x = pad.l + i*gap+gap/2; s ? ctx.lineTo(x, tY(v)) : (ctx.moveTo(x, tY(v)), (s = true)) })
        ctx.stroke()
      })
      ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "10px 'DM Mono',monospace"; ctx.textAlign = "left"
      ctx.fillText(`Stoch(${k},${d})`, pad.l + 4, pad.t - 1)
    }} />
  )
}

function CciChart({ candles, period, color }: { candles: Candle[]; period: number; color: string }) {
  const cci = calcCCI(candles, period)
  const mx = Math.max(200, ...cci.filter(v => v !== null).map(v => Math.abs(v!)))
  return (
    <SubChartCanvas height={70} deps={[candles, period, color]} draw={(ctx, W, H) => {
      const pad = { t: 12, r: 74, b: 4, l: 8 }, cW = W - pad.l - pad.r, cH = H - pad.t - pad.b, n = candles.length
      const gap = cW / n, tY = (v: number) => pad.t + cH/2 - (v / mx) * (cH/2)
      ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(pad.l, tY(0)); ctx.lineTo(W - pad.r, tY(0)); ctx.stroke()
      ;[100, -100].forEach(lvl => {
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1; ctx.setLineDash([3,3])
        ctx.beginPath(); ctx.moveTo(pad.l, tY(lvl)); ctx.lineTo(W - pad.r, tY(lvl)); ctx.stroke(); ctx.setLineDash([])
      })
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1; let s = false
      cci.forEach((v, i) => { if (v === null) { s = false; return }; const x = pad.l + i*gap+gap/2; s ? ctx.lineTo(x, tY(v)) : (ctx.moveTo(x, tY(v)), (s = true)) })
      ctx.stroke()
      ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "10px 'DM Mono',monospace"; ctx.textAlign = "left"
      ctx.fillText(`CCI(${period})`, pad.l + 4, pad.t - 1)
    }} />
  )
}

function AtrChart({ candles, period, color }: { candles: Candle[]; period: number; color: string }) {
  const atr = calcATR(candles, period)
  const mx = Math.max(...atr.filter(v => v !== null).map(v => v!), 0.01)
  return (
    <SubChartCanvas height={70} deps={[candles, period, color]} draw={(ctx, W, H) => {
      const pad = { t: 12, r: 74, b: 4, l: 8 }, cW = W - pad.l - pad.r, cH = H - pad.t - pad.b, n = candles.length
      const gap = cW / n, tY = (v: number) => pad.t + cH - (v / mx) * cH
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1; let s = false
      atr.forEach((v, i) => { if (v === null) { s = false; return }; const x = pad.l + i*gap+gap/2; s ? ctx.lineTo(x, tY(v)) : (ctx.moveTo(x, tY(v)), (s = true)) })
      ctx.stroke()
      ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "10px 'DM Mono',monospace"; ctx.textAlign = "left"
      ctx.fillText(`ATR(${period})`, pad.l + 4, pad.t - 1)
    }} />
  )
}

function ObvChart({ candles, color }: { candles: Candle[]; color: string }) {
  const obv = calcOBV(candles)
  const mn = Math.min(...obv), mx = Math.max(...obv)
  const rng = mx - mn || 1
  return (
    <SubChartCanvas height={70} deps={[candles, color]} draw={(ctx, W, H) => {
      const pad = { t: 12, r: 74, b: 4, l: 8 }, cW = W - pad.l - pad.r, cH = H - pad.t - pad.b, n = candles.length
      const gap = cW / n, tY = (v: number) => pad.t + cH - ((v - mn) / rng) * cH
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1
      obv.forEach((v, i) => { const x = pad.l + i*gap+gap/2; i === 0 ? ctx.moveTo(x, tY(v)) : ctx.lineTo(x, tY(v)) })
      ctx.stroke()
      ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "10px 'DM Mono',monospace"; ctx.textAlign = "left"
      ctx.fillText("OBV", pad.l + 4, pad.t - 1)
    }} />
  )
}

// ── Trading Chart (with drawing tool support) ─────────────────────────────────
interface TradingChartProps {
  candles: Candle[]; history: number[]; price: number
  sma20: number; sma50: number; bbUpper: number; bbMiddle: number; bbLower: number; vwap: number
  macd: number; macdSignal: number; macdHist: number
  chartMode: "candle" | "line"
  activeTool: ToolMode; drawColor: string
  lineStyle?: "solid" | "dashed" | "dotted"
  lineWidth?: 1 | 2 | 3
  drawings: Drawing[]; alerts: PriceAlert[]
  onAddDrawing: (d: Drawing) => void
  onRemoveDrawing: (id: string) => void
  onUpdateDrawing: (d: Drawing) => void
  onAddAlert: (a: PriceAlert) => void
  currentPrice: number
  avgCostLine?: number | null
  showVolume?: boolean
  indicators?: IndicatorConfig[]
  selectedDrawingId: string | null
  setSelectedDrawingId: (id: string | null) => void
}

function TradingChart({
  candles, history, price, sma20, sma50, bbUpper, bbMiddle, bbLower, vwap,
  macd, macdSignal, macdHist, chartMode,
  activeTool, drawColor, lineStyle, lineWidth, drawings, alerts,
  onAddDrawing, onRemoveDrawing, onUpdateDrawing, onAddAlert, currentPrice,
  avgCostLine, showVolume, indicators = [],
  selectedDrawingId, setSelectedDrawingId,
}: TradingChartProps) {
  const mainRef = useRef<HTMLCanvasElement>(null)
  const geomRef = useRef<ChartGeom | null>(null)
  const renderRef = useRef<() => void>(() => {})
  const dragStartRef = useRef<{ price: number; idxFromRight: number } | null>(null)
  const dragCurrentRef = useRef<{ price: number; idxFromRight: number } | null>(null)
  const isDraggingRef = useRef(false)
  const hoverRef = useRef<{ x: number; y: number; price: number } | null>(null)
  const channelP1Ref = useRef<{ price: number; idxFromRight: number } | null>(null)
  const channelP2Ref = useRef<{ price: number; idxFromRight: number } | null>(null)
  const channelPhaseRef = useRef<0 | 1 | 2>(0)

  const dragSelectRef = useRef<{ drawingId: string; startPrice: number; startIdx: number } | null>(null)
  // Keep refs for use inside renderRef closure
  const drawingsRef = useRef(drawings)
  const alertsRef = useRef(alerts)
  const activeToolRef = useRef(activeTool)
  const drawColorRef = useRef(drawColor)
  const selectedIdRef = useRef(selectedDrawingId)
  const currentPriceRef = useRef(currentPrice)
  const avgCostRef = useRef(avgCostLine)
  useEffect(() => { drawingsRef.current = drawings }, [drawings])
  useEffect(() => { alertsRef.current = alerts }, [alerts])
  useEffect(() => { activeToolRef.current = activeTool }, [activeTool])
  useEffect(() => { drawColorRef.current = drawColor }, [drawColor])
  useEffect(() => { selectedIdRef.current = selectedDrawingId }, [selectedDrawingId])
  useEffect(() => { currentPriceRef.current = currentPrice }, [currentPrice])
  useEffect(() => { avgCostRef.current = avgCostLine ?? null }, [avgCostLine])

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
        const cs = candles.map(c => c.c)

        // ── Indicator-aware rendering ─────────────────────────────────────────
        const dl = (vals: (number | null)[], color: string, dash: number[] = [], lw = 1) => {
          ctx.beginPath(); ctx.setLineDash(dash); ctx.strokeStyle = color; ctx.lineWidth = lw
          let started = false
          vals.forEach((v, i) => {
            if (v === null) { started = false; return }
            const x = pad.l + i*gap + gap/2
            if (!started) { ctx.moveTo(x, tYLocal(v)); started = true } else ctx.lineTo(x, tYLocal(v))
          })
          ctx.stroke(); ctx.setLineDash([])
        }

        // Resolve active main indicators (fall back to server values when no candle data available)
        const activeMain = indicators.filter(ind => ind.pane === "main" && ind.enabled)
        if (activeMain.length === 0 && candles.length >= 2) {
          // Default fallback: render server-provided values as flat lines
          const defDl = (v: number, color: string, dash: number[] = []) => {
            if (!v) return
            ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash(dash)
            ctx.beginPath(); ctx.moveTo(pad.l, tYLocal(v)); ctx.lineTo(W - pad.r, tYLocal(v)); ctx.stroke(); ctx.setLineDash([])
          }
          const bbCfg = { upper: bbUpper, middle: bbMiddle, lower: bbLower }
          if (bbCfg.upper && bbCfg.lower) {
            ctx.beginPath()
            candles.forEach((_c, i) => { const x = pad.l + i * gap + gap/2; i === 0 ? ctx.moveTo(x, tYLocal(bbCfg.upper)) : ctx.lineTo(x, tYLocal(bbCfg.upper)) })
            candles.slice().reverse().forEach((_c, i) => ctx.lineTo(pad.l + (n-1-i)*gap + gap/2, tYLocal(bbCfg.lower)))
            ctx.closePath(); ctx.fillStyle = "rgba(124,138,244,0.06)"; ctx.fill()
            defDl(bbCfg.upper, "rgba(124,138,244,0.5)", [3,3])
            defDl(bbCfg.middle, "rgba(124,138,244,0.3)", [2,4])
            defDl(bbCfg.lower, "rgba(124,138,244,0.5)", [3,3])
          }
          defDl(vwap, "rgba(234,179,77,0.6)", [4,3])
          defDl(sma20, "rgba(91,206,138,0.5)")
          defDl(sma50, "rgba(232,105,106,0.5)")
        } else {
          for (const ind of activeMain) {
            const col = ind.color ?? "#ffffff"
            const period = Number(ind.params.period ?? 20)
            if (ind.type === "sma") dl(calcSMA(cs, period), col + "99")
            else if (ind.type === "ema") dl(calcEMA(cs, period), col + "99")
            else if (ind.type === "wma") dl(calcWMA(cs, period), col + "99")
            else if (ind.type === "bb") {
              const { upper, middle, lower } = calcBB(cs, period, Number(ind.params.stddev ?? 2))
              // Fill
              ctx.beginPath()
              upper.forEach((v, i) => { if (v === null) return; const x = pad.l + i*gap+gap/2; i === 0 ? ctx.moveTo(x, tYLocal(v)) : ctx.lineTo(x, tYLocal(v)) })
              lower.slice().reverse().forEach((v, i) => { if (v === null) return; ctx.lineTo(pad.l + (n-1-i)*gap+gap/2, tYLocal(v)) })
              ctx.closePath(); ctx.fillStyle = col + "0d"; ctx.fill()
              dl(upper, col + "88", [3,3]); dl(middle, col + "55", [2,4]); dl(lower, col + "88", [3,3])
            }
            else if (ind.type === "vwap") { ctx.strokeStyle = col + "99"; ctx.lineWidth = 1; ctx.setLineDash([4,3]); ctx.beginPath(); ctx.moveTo(pad.l, tYLocal(vwap)); ctx.lineTo(W - pad.r, tYLocal(vwap)); ctx.stroke(); ctx.setLineDash([]) }
            else if (ind.type === "keltner") {
              const { upper, middle, lower } = calcKeltner(candles, period, Number(ind.params.mult ?? 2))
              dl(upper, col + "88", [3,3]); dl(middle, col + "99"); dl(lower, col + "88", [3,3])
            }
            else if (ind.type === "donchian") {
              const { upper, lower } = calcDonchian(candles, period)
              dl(upper, col + "88", [3,3]); dl(lower, col + "88", [3,3])
            }
            else if (ind.type === "sar") {
              const { sar, trend } = calcParabolicSAR(candles, Number(ind.params.step ?? 0.02), Number(ind.params.max ?? 0.2))
              sar.forEach((s, i) => {
                const x = pad.l + i*gap + gap/2, y = tYLocal(s)
                ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2)
                ctx.fillStyle = trend[i] === "up" ? col : col + "88"; ctx.fill()
              })
            }
            else if (ind.type === "ichimoku") {
              const { tenkanLine, kijunLine, senkouA, senkouB } = calcIchimoku(candles, Number(ind.params.tenkan ?? 9), Number(ind.params.kijun ?? 26), Number(ind.params.senkou ?? 52))
              // Cloud fill
              ctx.beginPath()
              senkouA.forEach((v, i) => { if (v === null) return; const x = pad.l + i*gap+gap/2; i === 0 ? ctx.moveTo(x, tYLocal(v)) : ctx.lineTo(x, tYLocal(v)) })
              senkouB.slice().reverse().forEach((v, i) => { if (v === null) return; ctx.lineTo(pad.l + (n-1-i)*gap+gap/2, tYLocal(v)) })
              ctx.closePath(); ctx.fillStyle = col + "18"; ctx.fill()
              dl(tenkanLine, col + "dd"); dl(kijunLine, "#f87171" + "dd"); dl(senkouA, col + "66"); dl(senkouB, "#f87171" + "44")
            }
            else if (ind.type === "linreg") {
              const { line, upper: upR, lower: loR } = calcLinReg(cs)
              dl(line.map(v => v), col + "cc"); dl(upR.map(v => v), col + "55", [3,3]); dl(loR.map(v => v), col + "55", [3,3])
            }
            else if (ind.type === "pivots" && candles.length >= 2) {
              const pivs = calcPivots(candles)
              if (pivs) {
                const pvLines: { v: number; color: string; label: string }[] = [
                  { v: pivs.p,  color: "#94a3b8", label: "P" },
                  { v: pivs.r1, color: "#4ade80", label: "R1" }, { v: pivs.r2, color: "#4ade80", label: "R2" }, { v: pivs.r3, color: "#4ade80", label: "R3" },
                  { v: pivs.s1, color: "#f87171", label: "S1" }, { v: pivs.s2, color: "#f87171", label: "S2" }, { v: pivs.s3, color: "#f87171", label: "S3" },
                ]
                pvLines.forEach(({ v, color, label }) => {
                  const y = tYLocal(v); ctx.strokeStyle = color + "77"; ctx.lineWidth = 1; ctx.setLineDash([4,3])
                  ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke(); ctx.setLineDash([])
                  ctx.fillStyle = color; ctx.font = "9px 'DM Mono',monospace"; ctx.textAlign = "left"
                  ctx.fillText(label, W - pad.r + 4, y + 3)
                })
              }
            }
          }
        }

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

      // ── Avg cost line ───────────────────────────────────────────────────────
      const avgC = avgCostRef.current
      if (avgC && avgC > 0) {
        const ay = tYLocal(avgC)
        if (ay >= pad.t && ay <= H - pad.b) {
          ctx.save(); ctx.strokeStyle = "rgba(251,191,36,0.7)"; ctx.lineWidth = 1; ctx.setLineDash([5, 4])
          ctx.beginPath(); ctx.moveTo(pad.l, ay); ctx.lineTo(W - pad.r - 2, ay); ctx.stroke(); ctx.setLineDash([])
          ctx.fillStyle = "rgba(251,191,36,0.8)"; ctx.font = "10px 'DM Mono',monospace"; ctx.textAlign = "left"
          ctx.fillText(`Avg $${avgC.toFixed(2)}`, W - pad.r + 4, ay + 4)
          ctx.restore()
        }
      }

      // ── Drawings ────────────────────────────────────────────────────────────
      for (const d of drawingsRef.current) {
        const isSelected = d.id === selectedIdRef.current
        const alpha = isSelected ? 1 : 0.85
        if (d.type === "hline") renderHLine(ctx, geom, d, alpha)
        else if (d.type === "vline") renderVLine(ctx, geom, d, alpha)
        else if (d.type === "trendline") renderTrendLine(ctx, geom, d, alpha)
        else if (d.type === "ray") renderRay(ctx, geom, d, alpha)
        else if (d.type === "channel") renderChannel(ctx, geom, d, alpha)
        else if (d.type === "rect") renderRect(ctx, geom, d, alpha)
        else if (d.type === "ellipse") renderEllipse(ctx, geom, d, alpha)
        else if (d.type === "arrow") renderArrow(ctx, geom, d, alpha)
        else if (d.type === "text") renderText(ctx, geom, d, alpha)
        else if (d.type === "fib") renderFib(ctx, geom, d, alpha)
        else if (d.type === "extline") renderExtLine(ctx, geom, d, alpha)
        else if (d.type === "trendangle") renderTrendAngle(ctx, geom, d, alpha)
        else if (d.type === "pitchfork") renderPitchfork(ctx, geom, d, alpha)
        else if (d.type === "triangle") renderTriangle(ctx, geom, d, alpha)
        else if (d.type === "brush") renderBrush(ctx, geom, d, alpha)
        else if (d.type === "fibext") renderFibExt(ctx, geom, d, alpha)
        else if (d.type === "fibfan") renderFibFan(ctx, geom, d, alpha)
        else if (d.type === "fibtime") renderFibTime(ctx, geom, d, alpha)
        else if (d.type === "callout") renderCallout(ctx, geom, d, alpha)
        else if (d.type === "pricenote") renderPriceNote(ctx, geom, d, alpha)
        // Highlight selected drawing
        if (isSelected && d.p1) {
          ctx.save()
          const pts: [number, number][] = []
          if (d.p1) pts.push([idxToX(geom, d.p1.idxFromRight), toY(geom, d.p1.price)])
          if (d.p2) pts.push([idxToX(geom, d.p2.idxFromRight), toY(geom, d.p2.price)])
          if (d.p3) pts.push([idxToX(geom, d.p3.idxFromRight), toY(geom, d.p3.price)])
          if (d.type === "hline" && d.price !== undefined) pts.push([pad.l + (W - pad.r - pad.l) / 2, toY(geom, d.price)])
          if (d.type === "vline" && d.idxFromRight !== undefined) pts.push([idxToX(geom, d.idxFromRight), pad.t + (H - pad.b - pad.t) / 2])
          pts.forEach(([px, py]) => {
            ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2)
            ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill()
            ctx.strokeStyle = d.color; ctx.lineWidth = 2; ctx.stroke()
          })
          ctx.restore()
        }
      }
      for (const a of alertsRef.current) renderAlert(ctx, geom, a, currentPriceRef.current)

      // In-progress drawing
      if (isDraggingRef.current && dragStartRef.current && dragCurrentRef.current) {
        const col = drawColorRef.current
        const tool = activeToolRef.current
        const p1 = { price: dragStartRef.current.price, idxFromRight: dragStartRef.current.idxFromRight }
        const p2 = { price: dragCurrentRef.current.price, idxFromRight: dragCurrentRef.current.idxFromRight }
        if (tool === "trendline")
          renderTrendLine(ctx, geom, { id: "_", type: "trendline", color: col, p1, p2 }, 0.55)
        else if (tool === "ray")
          renderRay(ctx, geom, { id: "_", type: "ray", color: col, p1, p2 }, 0.55)
        else if (tool === "rect")
          renderRect(ctx, geom, { id: "_", type: "rect", color: col, p1, p2 }, 0.55)
        else if (tool === "ellipse")
          renderEllipse(ctx, geom, { id: "_", type: "ellipse", color: col, p1, p2 }, 0.55)
        else if (tool === "arrow")
          renderArrow(ctx, geom, { id: "_", type: "arrow", color: col, p1, p2 }, 0.55)
        else if (tool === "fib")
          renderFib(ctx, geom, { id: "_", type: "fib", color: col, p1, p2 }, 0.55)
        else if (tool === "extline")
          renderExtLine(ctx, geom, { id: "_", type: "extline", color: col, p1, p2 }, 0.55)
        else if (tool === "trendangle")
          renderTrendAngle(ctx, geom, { id: "_", type: "trendangle", color: col, p1, p2 }, 0.55)
        else if (tool === "fibext")
          renderFibExt(ctx, geom, { id: "_", type: "fibext", color: col, p1, p2 }, 0.55)
        else if (tool === "fibfan")
          renderFibFan(ctx, geom, { id: "_", type: "fibfan", color: col, p1, p2 }, 0.55)
        else if (tool === "fibtime")
          renderFibTime(ctx, geom, { id: "_", type: "fibtime", color: col, p1, p2 }, 0.55)
        else if (tool === "measure") {
          // Ephemeral measure overlay
          const x1 = idxToX(geom, p1.idxFromRight), x2 = idxToX(geom, p2.idxFromRight)
          const y1 = tYLocal(p1.price), y2 = tYLocal(p2.price)
          ctx.save(); ctx.globalAlpha = 0.8
          ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([])
          const dp = p2.price - p1.price, pct = p1.price > 0 ? (dp / p1.price) * 100 : 0
          const bars = Math.abs(p2.idxFromRight - p1.idxFromRight)
          const label = `${dp >= 0 ? "+" : ""}${dp.toFixed(2)} (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)  ${bars} bars`
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
          ctx.font = "11px 'DM Mono',monospace"; ctx.textAlign = "center"
          const tw = ctx.measureText(label).width
          ctx.fillStyle = "rgba(30,30,50,0.88)"; ctx.fillRect(mx - tw/2 - 6, my - 16, tw + 12, 20)
          ctx.fillStyle = "#fbbf24"; ctx.fillText(label, mx, my - 2)
          ctx.restore()
        }
      }
      // Channel in-progress (phase 1: showing first line)
      if (channelPhaseRef.current === 1 && channelP1Ref.current && channelP2Ref.current) {
        renderTrendLine(ctx, geom, {
          id: "_", type: "trendline", color: drawColorRef.current,
          p1: channelP1Ref.current, p2: channelP2Ref.current,
        }, 0.55)
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
  }, [candles, history, price, sma20, sma50, bbUpper, bbMiddle, bbLower, vwap, chartMode, drawings, alerts, selectedDrawingId, avgCostLine])

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
    if (isDraggingRef.current) {
      dragCurrentRef.current = { price: c.price, idxFromRight: c.idxFromRight }
      // Drag-to-move selected drawing
      if (activeToolRef.current === "cursor" && dragSelectRef.current) {
        const { drawingId, startPrice, startIdx } = dragSelectRef.current
        const dp = c.price - startPrice
        const di = c.idxFromRight - startIdx
        const d = drawingsRef.current.find(d => d.id === drawingId)
        if (d) {
          const updated: Drawing = { ...d }
          if (d.type === "hline" && d.price !== undefined) updated.price = d.price + dp
          else if (d.type === "vline" && d.idxFromRight !== undefined) updated.idxFromRight = d.idxFromRight + di
          else {
            if (d.p1) updated.p1 = { price: d.p1.price + dp, idxFromRight: d.p1.idxFromRight + di }
            if (d.p2) updated.p2 = { price: d.p2.price + dp, idxFromRight: d.p2.idxFromRight + di }
            if (d.p3) updated.p3 = { price: d.p3.price + dp, idxFromRight: d.p3.idxFromRight + di }
          }
          onUpdateDrawing(updated)
          dragSelectRef.current = { drawingId, startPrice: c.price, startIdx: c.idxFromRight }
        }
      }
    }
    renderRef.current()
  }

  function handleMouseDown(e: React.MouseEvent) {
    const c = getCoords(e); if (!c) return
    const { x, y, price: clickPrice, idxFromRight } = c
    const g = geomRef.current

    switch (activeTool) {
      case "cursor": {
        if (!g) break
        const hit = drawings.find(d => hitTest(g, d, x, y))
        if (hit) {
          setSelectedDrawingId(hit.id)
          isDraggingRef.current = true
          dragSelectRef.current = { drawingId: hit.id, startPrice: clickPrice, startIdx: idxFromRight }
        } else {
          setSelectedDrawingId(null)
          dragSelectRef.current = null
        }
        break
      }
      case "hline":
        onAddDrawing({ id: Date.now().toString(), type: "hline", color: drawColor, price: clickPrice })
        break
      case "vline":
        onAddDrawing({ id: Date.now().toString(), type: "vline", color: drawColor, idxFromRight })
        break
      case "trendline": case "ray": case "rect": case "ellipse": case "arrow": case "fib": case "measure":
        isDraggingRef.current = true
        dragStartRef.current = { price: clickPrice, idxFromRight }
        dragCurrentRef.current = { price: clickPrice, idxFromRight }
        break
      case "channel": {
        if (channelPhaseRef.current === 0) {
          channelP1Ref.current = { price: clickPrice, idxFromRight }
          channelPhaseRef.current = 1
        } else if (channelPhaseRef.current === 1) {
          channelP2Ref.current = { price: clickPrice, idxFromRight }
          channelPhaseRef.current = 2
        } else {
          if (channelP1Ref.current && channelP2Ref.current) {
            onAddDrawing({ id: Date.now().toString(), type: "channel", color: drawColor,
              p1: channelP1Ref.current, p2: channelP2Ref.current, p3: { price: clickPrice, idxFromRight } })
          }
          channelP1Ref.current = null; channelP2Ref.current = null; channelPhaseRef.current = 0
        }
        break
      }
      case "alert": {
        const dir: "above" | "below" = clickPrice >= currentPrice ? "above" : "below"
        onAddAlert({ id: Date.now().toString(), price: clickPrice, direction: dir, label: "", triggered: false, createdAt: new Date().toISOString() })
        break
      }
      case "erase": {
        if (!g) break
        const hit = drawings.find(d => hitTest(g, d, x, y))
        if (hit) { onRemoveDrawing(hit.id); if (selectedDrawingId === hit.id) setSelectedDrawingId(null) }
        break
      }
    }
    renderRef.current()
  }

  const [pendingText, setPendingText] = useState<{ price: number; idxFromRight: number } | null>(null)
  const [textInput, setTextInput] = useState("")
  const [textFontSize, setTextFontSize] = useState<"sm" | "md" | "lg">("md")
  const [textShowBg, setTextShowBg] = useState(true)

  function handleMouseUp(e: React.MouseEvent) {
    const c = getCoords(e)
    if (activeTool === "text" && c) {
      setPendingText({ price: c.price, idxFromRight: c.idxFromRight })
      isDraggingRef.current = false; dragStartRef.current = null; dragCurrentRef.current = null
      dragSelectRef.current = null
      return
    }
    if (isDraggingRef.current && c && dragStartRef.current && activeTool !== "cursor") {
      const { price: clickPrice, idxFromRight } = c
      const p1 = dragStartRef.current, p2 = { price: clickPrice, idxFromRight }
      const baseDrawing = { id: Date.now().toString(), color: drawColor, lineStyle, lineWidth }
      if (activeTool === "trendline")
        onAddDrawing({ ...baseDrawing, type: "trendline", p1, p2 })
      else if (activeTool === "ray")
        onAddDrawing({ ...baseDrawing, type: "ray", p1, p2 })
      else if (activeTool === "rect")
        onAddDrawing({ ...baseDrawing, type: "rect", p1, p2 })
      else if (activeTool === "ellipse")
        onAddDrawing({ ...baseDrawing, type: "ellipse", p1, p2 })
      else if (activeTool === "arrow")
        onAddDrawing({ ...baseDrawing, type: "arrow", p1, p2 })
      else if (activeTool === "fib")
        onAddDrawing({ ...baseDrawing, type: "fib", p1, p2 })
      else if (activeTool === "extline")
        onAddDrawing({ ...baseDrawing, type: "extline", p1, p2 })
      else if (activeTool === "trendangle")
        onAddDrawing({ ...baseDrawing, type: "trendangle", p1, p2 })
      else if (activeTool === "fibext")
        onAddDrawing({ ...baseDrawing, type: "fibext", p1, p2 })
      else if (activeTool === "fibfan")
        onAddDrawing({ ...baseDrawing, type: "fibfan", p1, p2 })
      else if (activeTool === "fibtime")
        onAddDrawing({ ...baseDrawing, type: "fibtime", p1, p2 })
    }
    isDraggingRef.current = false; dragStartRef.current = null; dragCurrentRef.current = null
    dragSelectRef.current = null
    renderRef.current()
  }

  function handleMouseLeave() {
    hoverRef.current = null; isDraggingRef.current = false
    dragStartRef.current = null; dragCurrentRef.current = null; dragSelectRef.current = null
    renderRef.current()
  }

  function handleDoubleClick(e: React.MouseEvent) {
    if (activeTool !== "cursor") return
    const c = getCoords(e); if (!c) return
    const g = geomRef.current; if (!g) return
    const hit = drawings.find(d => d.type === "text" && hitTest(g, d, c.x, c.y))
    if (hit && hit.type === "text") {
      setTextInput(hit.text ?? "")
      setTextFontSize(hit.fontSize ?? "md")
      setTextShowBg(hit.showBg ?? true)
      setPendingText({ ...hit.p1!, _editId: hit.id } as { price: number; idxFromRight: number; _editId?: string })
    }
  }

  function confirmText() {
    const pt = pendingText as (typeof pendingText & { _editId?: string }) | null
    if (pt && textInput.trim()) {
      if (pt._editId) {
        const d = drawings.find(d => d.id === pt._editId)
        if (d) onUpdateDrawing({ ...d, text: textInput.trim(), fontSize: textFontSize, showBg: textShowBg })
      } else {
        onAddDrawing({ id: Date.now().toString(), type: "text", color: drawColor,
          p1: { price: pt.price, idxFromRight: pt.idxFromRight },
          text: textInput.trim(), fontSize: textFontSize, showBg: textShowBg })
      }
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
        onDoubleClick={handleDoubleClick}
        className="w-full block select-none"
        style={{ background: BG, height: 380, cursor }}
      />
      {/* Dynamic sub-charts based on active indicator configs */}
      {indicators.filter(ind => ind.pane === "sub" && ind.enabled).map(ind => {
        if (ind.type === "macd") return <MACDChart key={ind.id} candles={candles} macd={macd} macdSignal={macdSignal} macdHist={macdHist} />
        if (ind.type === "volume") return <VolumeChart key={ind.id} candles={candles} />
        if (ind.type === "rsi") return <RsiChart key={ind.id} candles={candles} period={Number(ind.params.period ?? 14)} color={ind.color ?? "#a78bfa"} />
        if (ind.type === "stoch") return <StochChart key={ind.id} candles={candles} k={Number(ind.params.k ?? 14)} d={Number(ind.params.d ?? 3)} color={ind.color ?? "#34d399"} />
        if (ind.type === "cci") return <CciChart key={ind.id} candles={candles} period={Number(ind.params.period ?? 20)} color={ind.color ?? "#fb923c"} />
        if (ind.type === "atr") return <AtrChart key={ind.id} candles={candles} period={Number(ind.params.period ?? 14)} color={ind.color ?? "#facc15"} />
        if (ind.type === "obv") return <ObvChart key={ind.id} candles={candles} color={ind.color ?? "#6ee7b7"} />
        return null
      })}
      {/* Fallback: show MACD+Volume if no indicator config provided */}
      {indicators.length === 0 && (
        <>
          <MACDChart candles={candles} macd={macd} macdSignal={macdSignal} macdHist={macdHist} />
          {showVolume && <VolumeChart candles={candles} />}
        </>
      )}

      {/* Label / text dialog */}
      <Dialog open={!!pendingText} onOpenChange={() => { setPendingText(null); setTextInput("") }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Label</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus placeholder="Label text..."
              value={textInput} onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && confirmText()}
              maxLength={80}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Size</span>
              <div className="flex gap-1">
                {(["sm","md","lg"] as const).map(s => (
                  <button key={s} onClick={() => setTextFontSize(s)}
                    className={`px-2 py-0.5 rounded text-xs border-0 cursor-pointer transition-colors ${textFontSize === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
              <button onClick={() => setTextShowBg(b => !b)}
                className={`ml-auto px-2 py-0.5 rounded text-xs border-0 cursor-pointer transition-colors ${textShowBg ? "bg-foreground/20 text-foreground" : "bg-transparent text-muted-foreground"}`}>
                Box
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPendingText(null); setTextInput("") }}>Cancel</Button>
            <Button onClick={confirmText} disabled={!textInput.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Symbol list (left panel) ─────────────────────────────────────────────────
interface SymbolEntry { symbol: string; name: string; price: number; change: number; assetType: "stock" | "forex" | "crypto" }

function fmtSymbolPrice(price: number, assetType: string): string {
  if (assetType === "forex") return price.toFixed(4)
  if (assetType === "crypto") return price >= 1 ? price.toFixed(2) : price >= 0.01 ? price.toFixed(4) : price.toFixed(6)
  return price.toFixed(2)
}

function SymbolListPanel({
  selected, onSelect,
}: { selected: { symbol: string; assetType: string } | null; onSelect: (s: SymbolEntry) => void }) {
  const { stocks, forexPairs, cryptoCoins } = useSimulation()
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<"stock" | "forex" | "crypto">("stock")

  const list = useMemo<SymbolEntry[]>(() => {
    const q = query.trim().toUpperCase()
    if (tab === "stock") {
      return Object.entries(stocks)
        .filter(([t, s]) => !q || t.includes(q) || s.name.toUpperCase().includes(q))
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([t, s]) => ({ symbol: t, name: s.name, price: s.price, change: s.change, assetType: "stock" as const }))
    }
    if (tab === "forex") {
      return Object.entries(forexPairs)
        .filter(([p]) => !q || p.includes(q))
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([p, d]) => ({ symbol: p, name: `${d.baseName}/${d.quoteName}`, price: d.price, change: d.changePct, assetType: "forex" as const }))
    }
    return Object.entries(cryptoCoins)
      .filter(([s, c]) => !q || s.includes(q) || c.name.toUpperCase().includes(q))
      .sort((a, b) => b[1].marketCap - a[1].marketCap)
      .map(([s, c]) => ({ symbol: s, name: c.name, price: c.price, change: c.changePct, assetType: "crypto" as const }))
  }, [query, tab, stocks, forexPairs, cryptoCoins])

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
        {(["stock","forex","crypto"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider cursor-pointer border-0 transition-colors ${tab === t ? "bg-foreground/8 text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground bg-transparent"}`}>
            {t === "stock" ? "Stocks" : t === "forex" ? "Forex" : "Crypto"}
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
                  <p className="text-[11px] font-mono tabular-nums">{fmtSymbolPrice(s.price, s.assetType)}</p>
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
  positions, onTradeComplete, onToast,
  alerts, setAlerts, notes, setNotes, defaultTab,
}: {
  symbol: string; assetType: string; currentPrice: number
  portfolios: PortfolioSummary[]; selectedPortfolio: number | null; setSelectedPortfolio: (id: number) => void
  positions: Position[]; onTradeComplete: () => void
  onToast: (text: string, type: "success" | "error" | "info") => void
  alerts: PriceAlert[]; setAlerts: (a: PriceAlert[]) => void
  notes: string; setNotes: (n: string) => void
  defaultTab?: string
}) {
  const { isSignedIn } = useAuth()
  const { placeOrder } = useAccount()
  const { stocks, forexPairs, cryptoCoins } = useSimulation()

  const [side, setSide] = useState<"buy" | "sell">("buy")
  const [qty, setQty] = useState("")
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop">("market")
  const [triggerPrice, setTriggerPrice] = useState("")
  const [orderNotes, setOrderNotes] = useState("")
  const [placing, setPlacing] = useState(false)

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

  const livePriceData = assetType === "stock" ? stocks[symbol] : assetType === "forex" ? forexPairs[symbol] : cryptoCoins[symbol]
  const livePrice = livePriceData?.price ?? currentPrice
  const previewCost = qty && parseFloat(qty) > 0 ? livePrice * parseFloat(qty) : null

  const portfolio = portfolios.find(p => p.id === selectedPortfolio)
  const symbolPositions = positions.filter(p => p.symbol === symbol)

  async function handleTrade() {
    if (!selectedPortfolio || !symbol || !qty || parseFloat(qty) <= 0) return
    if (orderType !== "market" && (!triggerPrice || parseFloat(triggerPrice) <= 0)) {
      onToast("Enter a trigger price for limit/stop orders", "error"); return
    }
    setPlacing(true)
    try {
      const r = await placeOrder(selectedPortfolio, {
        asset_type: assetType, symbol, side, quantity: parseFloat(qty),
        notes: orderNotes || undefined,
        order_type: orderType,
        trigger_price: orderType !== "market" ? parseFloat(triggerPrice) : undefined,
      })
      if (orderType === "market") {
        onToast(`${side === "buy" ? "Bought" : "Sold"} ${qty} ${symbol} @ $${r.executedPrice?.toFixed(2) ?? "?"}`, "success")
      } else {
        onToast(`${orderType.charAt(0).toUpperCase() + orderType.slice(1)} ${side} placed - ${qty} ${symbol} @ $${triggerPrice}`, "info")
      }
      setQty(""); setOrderNotes(""); setTriggerPrice("")
      onTradeComplete()
    } catch (e: unknown) {
      onToast(e instanceof Error ? e.message : "Order failed", "error")
    } finally { setPlacing(false) }
  }

  // Live technical data
  const liveData = assetType === "stock" ? stocks[symbol] : assetType === "forex" ? forexPairs[symbol] : cryptoCoins[symbol]
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
      <Tabs defaultValue={defaultTab ?? "trade"} className="flex flex-col h-full">
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

                  {/* Order type */}
                  <div className="flex items-center gap-0.5 bg-black/30 rounded p-0.5">
                    {(["market","limit","stop"] as const).map(t => (
                      <button key={t} type="button" onClick={() => {
                        setOrderType(t)
                        if (t !== "market" && !triggerPrice && currentPrice > 0) {
                          setTriggerPrice(currentPrice.toFixed(currentPrice < 10 ? 4 : 2))
                        }
                      }}
                        className={`flex-1 py-1 rounded text-[10px] font-semibold uppercase transition-colors cursor-pointer border-0 ${orderType === t ? "bg-foreground/90 text-background" : "text-muted-foreground hover:text-foreground bg-transparent"}`}>
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Trigger price (limit / stop only) */}
                  {orderType !== "market" && (
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">
                        Trigger Price {orderType === "limit" ? "(limit)" : "(stop)"}
                      </label>
                      <Input type="number" placeholder="0.00" min={0} step="any" value={triggerPrice}
                        onChange={e => setTriggerPrice(e.target.value)} className="h-8 text-sm font-mono" />
                    </div>
                  )}

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

                  <Button className={`w-full text-sm font-bold h-9 ${side === "buy" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"}`}
                    disabled={placing || !symbol || !qty || parseFloat(qty) <= 0 || !selectedPortfolio}
                    onClick={handleTrade}>
                    {placing ? <Loader2 className="w-4 h-4 animate-spin" /> : `${side === "buy" ? "Buy" : "Sell"} ${symbol || "-"}`}
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
                  <Bell className="w-3 h-3" /> Price Alerts - {symbol || "no symbol"}
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
              <BookOpen className="w-3 h-3" /> Trade journal - {symbol || "no symbol"}
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

// ── Bottom blotter panel ──────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function EquityCurveChart({ snapshots }: { snapshots: PortfolioSnapshot[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || snapshots.length < 2) return
    const dpr = window.devicePixelRatio || 1
    const cssW = cv.clientWidth, cssH = cv.clientHeight
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr)
    const ctx = cv.getContext("2d")!; ctx.scale(dpr, dpr)
    const W = cssW, H = cssH, pad = { t: 4, r: 4, b: 4, l: 4 }
    const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b
    const values = snapshots.map(s => Number(s.total_value))
    const mn = Math.min(...values), mx = Math.max(...values)
    const rng = mx - mn || 1
    const pts = values.map((v, i) => ({
      x: pad.l + (i / Math.max(values.length - 1, 1)) * cW,
      y: pad.t + ((mx - v) / rng) * cH,
    }))
    const up = values[values.length - 1] >= values[0]
    const accent = up ? GAIN : LOSS
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
    const g = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH)
    g.addColorStop(0, up ? "rgba(74,222,128,.15)" : "rgba(248,113,113,.10)"); g.addColorStop(1, "transparent")
    ctx.beginPath(); ctx.moveTo(pts[0].x, pad.t + cH)
    pts.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.lineTo(pts[pts.length - 1].x, pad.t + cH); ctx.closePath(); ctx.fillStyle = g; ctx.fill()
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
    for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y)
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.stroke()
  }, [snapshots])
  return <canvas ref={ref} className="w-full block rounded" style={{ background: BG, height: 56 }} />
}

function BottomPanel({
  positions, orders, pendingOrders, portfolioStats, portfolioSnapshots,
  onSymbolSelect, onCancelOrder, height, onHeightChange, defaultTab,
}: {
  positions: Position[]
  orders: RecentOrder[]
  pendingOrders: PendingOrder[]
  portfolioStats: PortfolioStats | null
  portfolioSnapshots: PortfolioSnapshot[]
  onSymbolSelect: (symbol: string, assetType: string) => void
  onCancelOrder: (orderId: number) => void
  height: number
  onHeightChange: (h: number) => void
  defaultTab?: "positions" | "orders" | "pending" | "performance"
}) {
  const { stocks, forexPairs } = useSimulation()
  const [tab, setTab] = useState<"positions" | "orders" | "pending" | "performance">(defaultTab ?? "positions")
  const dragRef = useRef(false)
  const dragStartYRef = useRef(0)
  const dragStartHRef = useRef(0)

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return
      const dy = dragStartYRef.current - e.clientY
      onHeightChange(Math.min(420, Math.max(120, dragStartHRef.current + dy)))
    }
    function onUp() { dragRef.current = false }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
  }, [onHeightChange])

  return (
    <div className="shrink-0 border-t border-border bg-card/20 flex flex-col" style={{ height }}>
      {/* Drag handle */}
      <div
        className="h-1.5 cursor-row-resize bg-transparent hover:bg-white/10 transition-colors shrink-0 flex items-center justify-center"
        onMouseDown={e => {
          dragRef.current = true
          dragStartYRef.current = e.clientY
          dragStartHRef.current = height
          e.preventDefault()
        }}
      >
        <div className="w-8 h-0.5 rounded-full bg-white/20" />
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        {([
          ["positions", `Positions (${positions.length})`],
          ["orders",    `Orders (${orders.length})`],
          ["pending",   `Pending (${pendingOrders.length})`],
          ["performance", "Performance"],
        ] as const).map(([t, label]) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider cursor-pointer border-0 transition-colors ${tab === t ? "text-foreground border-b-2 border-foreground bg-foreground/5" : "text-muted-foreground hover:text-foreground bg-transparent"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {tab === "positions" && (
          positions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[11px] text-muted-foreground/50">No open positions</div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-card/80">
                <tr className="text-muted-foreground/60 text-[10px]">
                  <th className="text-left px-3 py-1 font-medium">Symbol</th>
                  <th className="text-right px-2 py-1 font-medium">Qty</th>
                  <th className="text-right px-2 py-1 font-medium">Avg Cost</th>
                  <th className="text-right px-2 py-1 font-medium">Current</th>
                  <th className="text-right px-2 py-1 font-medium">P&amp;L $</th>
                  <th className="text-right px-3 py-1 font-medium">P&amp;L %</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(p => {
                  const live = p.asset_type === "stock" ? stocks[p.symbol]?.price : forexPairs[p.symbol]?.price
                  const current = live ?? p.avg_cost
                  const pnl = (current - p.avg_cost) * p.quantity
                  const pnlPct = p.avg_cost > 0 ? ((current - p.avg_cost) / p.avg_cost) * 100 : 0
                  const up = pnl >= 0
                  return (
                    <tr key={p.id} className="border-t border-border/30 hover:bg-muted/20 cursor-pointer"
                      onClick={() => onSymbolSelect(p.symbol, p.asset_type)}>
                      <td className="px-3 py-1.5">
                        <span className="font-mono font-semibold">{p.symbol}</span>
                        <span className="ml-1.5 text-[9px] text-muted-foreground/60 uppercase">{p.asset_type}</span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">{Number(p.quantity).toFixed(p.asset_type === "forex" ? 2 : 0)}</td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums text-muted-foreground">${Number(p.avg_cost).toFixed(p.asset_type === "forex" ? 4 : 2)}</td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">${current.toFixed(p.asset_type === "forex" ? 4 : 2)}</td>
                      <td className={`px-2 py-1.5 text-right font-mono tabular-nums ${up ? "text-emerald-500" : "text-red-400"}`}>
                        {up ? "+" : ""}{pnl.toFixed(2)}
                      </td>
                      <td className={`px-3 py-1.5 text-right font-mono tabular-nums ${up ? "text-emerald-500" : "text-red-400"}`}>
                        {up ? "+" : ""}{pnlPct.toFixed(2)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        )}

        {tab === "orders" && (
          orders.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[11px] text-muted-foreground/50">No recent orders</div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-card/80">
                <tr className="text-muted-foreground/60 text-[10px]">
                  <th className="text-left px-3 py-1 font-medium">Time</th>
                  <th className="text-left px-2 py-1 font-medium">Portfolio</th>
                  <th className="text-left px-2 py-1 font-medium">Symbol</th>
                  <th className="text-left px-2 py-1 font-medium">Side</th>
                  <th className="text-right px-2 py-1 font-medium">Qty</th>
                  <th className="text-right px-2 py-1 font-medium">Price</th>
                  <th className="text-right px-3 py-1 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-t border-border/30 hover:bg-muted/20">
                    <td className="px-3 py-1.5 text-muted-foreground/70">{timeAgo(o.executed_at)}</td>
                    <td className="px-2 py-1.5 text-muted-foreground/70 max-w-[80px] truncate">{o.portfolio_name}</td>
                    <td className="px-2 py-1.5 font-mono font-semibold">{o.symbol}</td>
                    <td className="px-2 py-1.5">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${o.side === "buy" ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-400"}`}>
                        {o.side}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{Number(o.quantity)}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">${Number(o.price).toFixed(o.asset_type === "forex" ? 4 : 2)}</td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums">${Number(o.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === "pending" && (
          pendingOrders.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[11px] text-muted-foreground/50">No pending orders</div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-card/80">
                <tr className="text-muted-foreground/60 text-[10px]">
                  <th className="text-left px-3 py-1 font-medium">Symbol</th>
                  <th className="text-left px-2 py-1 font-medium">Side</th>
                  <th className="text-left px-2 py-1 font-medium">Type</th>
                  <th className="text-right px-2 py-1 font-medium">Qty</th>
                  <th className="text-right px-2 py-1 font-medium">Trigger</th>
                  <th className="text-right px-2 py-1 font-medium">Age</th>
                  <th className="px-3 py-1 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map(o => (
                  <tr key={o.id} className="border-t border-border/30 hover:bg-muted/20">
                    <td className="px-3 py-1.5">
                      <span className="font-mono font-semibold">{o.symbol}</span>
                      <span className="ml-1.5 text-[9px] text-muted-foreground/60 uppercase">{o.asset_type}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${o.side === "buy" ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-400"}`}>
                        {o.side}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                        {o.order_type}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{Number(o.quantity)}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-amber-400">
                      ${Number(o.trigger_price).toFixed(o.asset_type === "forex" ? 4 : 2)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-muted-foreground/70">{timeAgo(o.created_at)}</td>
                    <td className="px-3 py-1.5">
                      <button type="button" onClick={() => onCancelOrder(o.id)}
                        className="text-[9px] text-muted-foreground hover:text-red-400 transition-colors cursor-pointer bg-transparent border-0 px-1.5 py-0.5 rounded hover:bg-red-500/10">
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === "performance" && (
          <div className="p-3 space-y-3">
            {portfolioSnapshots.length >= 2 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Equity Curve</p>
                <EquityCurveChart snapshots={portfolioSnapshots} />
              </div>
            )}
            {portfolioStats ? (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Statistics</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Total Value",
                      val: `$${Number(portfolioStats.total_value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
                      color: "text-foreground",
                    },
                    {
                      label: "Win Rate",
                      val: portfolioStats.win_rate != null ? `${portfolioStats.win_rate.toFixed(1)}%` : "-",
                      color: portfolioStats.win_rate != null && portfolioStats.win_rate >= 50 ? "text-emerald-500" : "text-red-400",
                    },
                    {
                      label: "Avg P&L",
                      val: portfolioStats.avg_pnl != null
                        ? `${portfolioStats.avg_pnl >= 0 ? "+" : ""}$${portfolioStats.avg_pnl.toFixed(2)}`
                        : "-",
                      color: portfolioStats.avg_pnl != null && portfolioStats.avg_pnl >= 0 ? "text-emerald-500" : "text-red-400",
                    },
                    {
                      label: "Best Trade",
                      val: portfolioStats.best_trade != null ? `+$${portfolioStats.best_trade.toFixed(2)}` : "-",
                      color: "text-emerald-500",
                    },
                    {
                      label: "Worst Trade",
                      val: portfolioStats.worst_trade != null ? `-$${Math.abs(portfolioStats.worst_trade).toFixed(2)}` : "-",
                      color: "text-red-400",
                    },
                    {
                      label: "Trades",
                      val: String(portfolioStats.total_closed ?? portfolioStats.total_orders ?? 0),
                      color: "text-foreground",
                    },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="bg-muted/30 rounded px-2 py-1.5 text-center">
                      <p className="text-[9px] text-muted-foreground mb-0.5">{label}</p>
                      <p className={`text-xs font-mono font-bold ${color}`}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-6 text-[11px] text-muted-foreground/50">No performance data yet</div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface Props { onNavigate: (r: Route) => void }

export default function TradingTerminalPage({ onNavigate }: Props) {
  const { isSignedIn } = useAuth()
  const { getPortfolios, getPortfolio, getRecentOrders, cancelOrder, getPendingOrders, getPortfolioSnapshots, getStats } = useAccount()
  const { market, stocks, forexPairs, cryptoCoins, getDetail, getForexPair, getCryptoDetail } = useSimulation()
  const { toasts, add: addToast } = useToast()

  const [selectedSymbol, setSelectedSymbol] = useState<{ symbol: string; assetType: "stock" | "forex" | "crypto" } | null>(null)
  const [detail, setDetail] = useState<StockDetail | ForexPairDetail | CryptoDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([])
  const [selectedPortfolio, setSelectedPortfolio] = useState<number | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null)
  const [portfolioSnapshots, setPortfolioSnapshots] = useState<PortfolioSnapshot[]>([])

  const [chartMode, setChartMode] = useState<"candle" | "line">("candle")
  const [activeTool, setActiveTool] = useState<ToolMode>("cursor")
  const [drawColor, setDrawColor] = useState("#ffffff")
  const [lineStyle, setLineStyle] = useState<"solid" | "dashed" | "dotted">("solid")
  const [lineWidth, setLineWidth] = useState<1 | 2 | 3>(1)
  const [timeframe, setTimeframe] = useState("D")
  const [showVolume, setShowVolume] = useState(false)
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null)
  const [, setUndoStack] = useState<Drawing[][]>([])
  const [, setRedoStack] = useState<Drawing[][]>([])
  const [panelHeight, setPanelHeight] = useState(180)

  // ── Layout & panel system ────────────────────────────────────────────────
  const [activeLayout, setActiveLayout] = useState<SavedLayout>(() => loadActiveLayout())
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>(() => loadSavedLayouts())
  const [showPanelLibrary, setShowPanelLibrary] = useState(false)

  // Lock scroll so the terminal is fully viewport-contained
  useEffect(() => {
    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    return () => {
      document.documentElement.style.overflow = ""
      document.body.style.overflow = ""
    }
  }, [])

  // ── Indicator system ─────────────────────────────────────────────────────
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(() => {
    try {
      const raw = localStorage.getItem("pm_indicators_global")
      if (raw) return JSON.parse(raw) as IndicatorConfig[]
    } catch {}
    return DEFAULT_INDICATORS
  })
  const [showIndicatorsPanel, setShowIndicatorsPanel] = useState(false)

  const updateIndicators = useCallback((inds: IndicatorConfig[]) => {
    setIndicators(inds)
    try { localStorage.setItem("pm_indicators_global", JSON.stringify(inds)) } catch {}
  }, [])

  const applyLayout = useCallback((layout: SavedLayout) => {
    setActiveLayout(layout)
    saveActiveLayout(layout)
  }, [])

  const handleSaveLayout = useCallback((name: string) => {
    const toSave: SavedLayout = { ...activeLayout, name }
    const updated = saveUserLayout(toSave)
    setSavedLayouts(updated)
  }, [activeLayout])

  const handleDeleteLayout = useCallback((name: string) => {
    const updated = deleteUserLayout(name)
    setSavedLayouts(updated)
  }, [])

  const handleRenameLayout = useCallback((oldName: string, newName: string) => {
    const updated = renameUserLayout(oldName, newName)
    setSavedLayouts(updated)
  }, [])

  const handleAddPanel = useCallback((type: PanelType) => {
    const id = `${type}_${Date.now()}`
    const newLeaf: LayoutNode = { kind: "panel", id, type }
    const root = activeLayout.root
    // Append to root row-split, or wrap everything in a new row split
    let newRoot: LayoutNode
    if (root.kind === "split" && root.dir === "row") {
      const n = root.children.length
      const newSize = 1 / (n + 1)
      const rescaled = root.children.map(c => ({ ...c, size: c.size * (n / (n + 1)) }))
      newRoot = { ...root, children: [...rescaled, { size: newSize, node: newLeaf }] }
    } else {
      newRoot = { kind: "split", dir: "row", children: [{ size: 0.75, node: root }, { size: 0.25, node: newLeaf }] }
    }
    applyLayout({ ...activeLayout, root: newRoot })
  }, [activeLayout, applyLayout])

  const handleUpdateLayout = useCallback((root: LayoutNode) => {
    applyLayout({ ...activeLayout, root })
  }, [activeLayout, applyLayout])

  const sym = selectedSymbol?.symbol ?? ""
  const [drawings, setDrawings] = useDrawings(sym)
  const [alerts, setAlerts] = useAlerts(sym)
  const [notes, setNotes] = useNotes(sym)

  // Refs for keyboard handler (avoids stale closures on high-frequency state)
  const drawingsKbRef = useRef<Drawing[]>([])
  const selectedKbRef = useRef<string | null>(null)
  useEffect(() => { drawingsKbRef.current = drawings }, [drawings])
  useEffect(() => { selectedKbRef.current = selectedDrawingId }, [selectedDrawingId])

  // Load portfolios
  useEffect(() => {
    if (!isSignedIn) return
    getPortfolios().then((ps: PortfolioSummary[]) => {
      setPortfolios(ps)
      if (ps.length > 0 && !selectedPortfolio) setSelectedPortfolio(ps[0].id)
    }).catch(() => {})
  }, [isSignedIn, getPortfolios])

  // Load positions for selected portfolio + recent orders (blotter)
  const refreshBlotter = useCallback(() => {
    if (selectedPortfolio) {
      getPortfolio(selectedPortfolio).then(p => setPositions(p.positions ?? [])).catch(() => {})
    }
    getRecentOrders().then((orders: RecentOrder[]) => setRecentOrders(orders)).catch(() => {})
  }, [selectedPortfolio, getPortfolio, getRecentOrders])

  useEffect(() => {
    if (!isSignedIn) return
    refreshBlotter()
  }, [isSignedIn, refreshBlotter])

  const fetchPendingOrders = useCallback(() => {
    if (!selectedPortfolio) return
    getPendingOrders(selectedPortfolio).then(data => setPendingOrders(Array.isArray(data) ? data : (data?.orders ?? []))).catch(() => {})
  }, [selectedPortfolio, getPendingOrders])

  const fetchPerformance = useCallback(() => {
    if (!selectedPortfolio) return
    getPortfolioSnapshots(selectedPortfolio).then(snaps => setPortfolioSnapshots(Array.isArray(snaps) ? snaps : [])).catch(() => {})
    getStats().then(stats => setPortfolioStats(stats ?? null)).catch(() => {})
  }, [selectedPortfolio, getPortfolioSnapshots, getStats])

  useEffect(() => {
    if (!isSignedIn || !selectedPortfolio) return
    fetchPendingOrders()
    fetchPerformance()
  }, [isSignedIn, selectedPortfolio, fetchPendingOrders, fetchPerformance])

  const handleCancelOrder = useCallback(async (orderId: number) => {
    if (!selectedPortfolio) return
    try {
      await cancelOrder(selectedPortfolio, orderId)
      addToast("Order cancelled", "info")
      fetchPendingOrders()
      refreshBlotter()
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Cancel failed", "error")
    }
  }, [selectedPortfolio, cancelOrder, addToast, fetchPendingOrders, refreshBlotter])

  // Drawing handlers with undo/redo support
  const handleAddDrawing = useCallback((d: Drawing) => {
    setUndoStack(s => [...s.slice(-19), drawingsKbRef.current])
    setRedoStack([])
    setDrawings([...drawingsKbRef.current, d])
  }, [setDrawings])

  const handleRemoveDrawing = useCallback((id: string) => {
    setUndoStack(s => [...s.slice(-19), drawingsKbRef.current])
    setRedoStack([])
    setDrawings(drawingsKbRef.current.filter(d => d.id !== id))
    if (selectedKbRef.current === id) setSelectedDrawingId(null)
  }, [setDrawings])

  const handleUpdateDrawing = useCallback((d: Drawing) => {
    setUndoStack(s => [...s.slice(-19), drawingsKbRef.current])
    setRedoStack([])
    setDrawings(drawingsKbRef.current.map(x => x.id === d.id ? d : x))
  }, [setDrawings])

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return

      if (!e.ctrlKey && !e.metaKey) {
        const toolKeys: Record<string, ToolMode> = {
          "Escape": "cursor", "1": "hline", "2": "vline", "3": "trendline",
          "4": "ray", "5": "channel", "6": "rect", "7": "ellipse",
          "8": "arrow", "9": "text", "0": "fib",
          "m": "measure", "M": "measure", "a": "alert", "A": "alert",
          "x": "erase", "X": "erase",
        }
        if (toolKeys[e.key]) { setActiveTool(toolKeys[e.key]); return }
        if (e.key === "t" || e.key === "T") { setChartMode(m => m === "candle" ? "line" : "candle"); return }
        if (e.key === "v" || e.key === "V") { setShowVolume(v => !v); return }
        if (e.key === "Delete" || e.key === "Backspace") {
          const id = selectedKbRef.current
          if (id) {
            setUndoStack(s => [...s.slice(-19), drawingsKbRef.current])
            setRedoStack([])
            setDrawings(drawingsKbRef.current.filter(d => d.id !== id))
            setSelectedDrawingId(null)
          }
          return
        }
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault()
        setUndoStack(stack => {
          if (stack.length === 0) return stack
          const prev = stack[stack.length - 1]
          setRedoStack(r => [...r.slice(-19), drawingsKbRef.current])
          setDrawings(prev)
          return stack.slice(0, -1)
        })
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault()
        setRedoStack(stack => {
          if (stack.length === 0) return stack
          const next = stack[stack.length - 1]
          setUndoStack(u => [...u.slice(-19), drawingsKbRef.current])
          setDrawings(next)
          return stack.slice(0, -1)
        })
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [setDrawings])

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
      const d = assetType === "stock" ? await getDetail(sym)
             : assetType === "forex"  ? await getForexPair(sym)
             : await getCryptoDetail(sym)
      setDetail(d)
    } finally {
      setDetailLoading(false)
    }
  }, [getDetail, getForexPair, getCryptoDetail])

  useEffect(() => {
    if (selectedSymbol) loadDetail(selectedSymbol.symbol, selectedSymbol.assetType)
  }, [selectedSymbol, loadDetail])

  // Refresh detail on market tick
  useEffect(() => {
    if (!selectedSymbol || !detail) return
    if (selectedSymbol.assetType === "stock") {
      getDetail(selectedSymbol.symbol).then(d => { if (d) setDetail(d) }).catch(() => {})
    } else if (selectedSymbol.assetType === "forex") {
      getForexPair(selectedSymbol.symbol).then(d => { if (d) setDetail(d) }).catch(() => {})
    } else {
      getCryptoDetail(selectedSymbol.symbol).then(d => { if (d) setDetail(d) }).catch(() => {})
    }
  }, [market])

  // Check alerts against live price
  useEffect(() => {
    if (!sym || alerts.length === 0) return
    const livePrice = selectedSymbol?.assetType === "stock" ? stocks[sym]?.price : selectedSymbol?.assetType === "forex" ? forexPairs[sym]?.price : cryptoCoins[sym]?.price
    if (!livePrice) return
    const updated = alerts.map(a => {
      if (a.triggered) return a
      const hit = (a.direction === "above" && livePrice >= a.price) || (a.direction === "below" && livePrice <= a.price)
      return hit ? { ...a, triggered: true } : a
    })
    if (updated.some((a, i) => a.triggered !== alerts[i].triggered)) setAlerts(updated)
  }, [market, sym, alerts])

  const liveStock  = selectedSymbol?.assetType === "stock"  ? stocks[sym]      : null
  const liveForex  = selectedSymbol?.assetType === "forex"  ? forexPairs[sym]  : null
  const liveCrypto = selectedSymbol?.assetType === "crypto" ? cryptoCoins[sym] : null
  const livePrice  = liveStock?.price ?? liveForex?.price ?? liveCrypto?.price ?? detail?.price ?? 0
  const liveChange = liveStock?.change ?? liveForex?.changePct ?? liveCrypto?.changePct ?? detail?.change ?? 0

  const avgCostLine = useMemo(() => {
    if (!sym || !selectedSymbol) return null
    const pos = positions.find(p => p.symbol === sym && p.asset_type === selectedSymbol.assetType)
    return pos ? Number(pos.avg_cost) : null
  }, [positions, sym, selectedSymbol])

  // Chart data: prefer detail candles, fallback to live summary history
  const stockDetail  = selectedSymbol?.assetType === "stock"  ? (detail as StockDetail    | null) : null
  const cryptoDetail = selectedSymbol?.assetType === "crypto" ? (detail as CryptoDetail    | null) : null
  const candles = detail?.candles ?? []
  const displayCandles = useMemo(() => aggregateCandles(candles, TF_GROUP[timeframe] ?? 1), [candles, timeframe])
  const history = detail?.history ?? []
  const sma20 = detail?.sma20 ?? liveStock?.sma20 ?? 0
  const sma50 = detail?.sma50 ?? liveStock?.sma50 ?? 0
  const bbUpper = detail?.bbUpper ?? liveStock?.bbUpper ?? 0
  const bbMiddle = detail?.bbMiddle ?? liveStock?.bbMiddle ?? 0
  const bbLower = detail?.bbLower ?? liveStock?.bbLower ?? 0
  const vwap = stockDetail?.vwap ?? liveStock?.vwap ?? cryptoDetail?.price ?? liveCrypto?.price ?? 0
  const macd = detail?.macd ?? liveStock?.macd ?? 0
  const macdSignal = detail?.macdSignal ?? liveStock?.macdSignal ?? 0
  const macdHist = detail?.macdHist ?? liveStock?.macdHist ?? 0

  // ── Panel titles ──────────────────────────────────────────────────────────
  const PANEL_TITLES: Record<PanelType, string> = {
    chart: "Chart", watchlist: "Watchlist", orderbook: "Order Book",
    timesales: "Time & Sales", positions: "Positions", orders: "Orders",
    tradeform: "Order Entry", news: "News", calendar: "Calendar",
    heatmap: "Heatmap", scanner: "Scanner", notes: "Notes",
    alerts: "Alerts", performance: "Performance", calculator: "Calculator",
    signals: "Signals", domladder: "DOM Ladder",
  }

  // ── Chart panel content ───────────────────────────────────────────────────
  const chartPanelContent = (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: BG }}>
      {!selectedSymbol ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">Select a symbol from the Watchlist panel</p>
        </div>
      ) : detailLoading && displayCandles.length === 0 && history.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <TradingChart
            candles={displayCandles} history={history} price={livePrice}
            sma20={sma20} sma50={sma50} bbUpper={bbUpper} bbMiddle={bbMiddle} bbLower={bbLower} vwap={vwap}
            macd={macd} macdSignal={macdSignal} macdHist={macdHist}
            chartMode={chartMode} activeTool={activeTool} drawColor={drawColor}
            lineStyle={lineStyle} lineWidth={lineWidth}
            drawings={drawings} alerts={alerts}
            onAddDrawing={handleAddDrawing}
            onRemoveDrawing={handleRemoveDrawing}
            onUpdateDrawing={handleUpdateDrawing}
            onAddAlert={a => setAlerts([...alerts, a])}
            currentPrice={livePrice}
            avgCostLine={avgCostLine}
            showVolume={showVolume}
            indicators={indicators}
            selectedDrawingId={selectedDrawingId}
            setSelectedDrawingId={setSelectedDrawingId}
          />
        </div>
      )}
    </div>
  )

  // ── Panel renderer ────────────────────────────────────────────────────────
  function renderPanel(type: PanelType, _id?: string): React.ReactNode {
    switch (type) {
      case "chart": return chartPanelContent
      case "watchlist": return (
        <SymbolListPanel
          selected={selectedSymbol}
          onSelect={s => setSelectedSymbol({ symbol: s.symbol, assetType: s.assetType })}
        />
      )
      case "tradeform": return (
        <RightPanel
          symbol={sym} assetType={selectedSymbol?.assetType ?? "stock"}
          currentPrice={livePrice}
          portfolios={portfolios} selectedPortfolio={selectedPortfolio} setSelectedPortfolio={setSelectedPortfolio}
          positions={positions}
          onTradeComplete={() => { refreshBlotter(); fetchPendingOrders(); fetchPerformance() }}
          onToast={addToast}
          alerts={alerts} setAlerts={setAlerts}
          notes={notes} setNotes={setNotes}
        />
      )
      case "positions":
      case "orders":
      case "performance": return isSignedIn ? (
        <BottomPanel
          positions={positions} orders={recentOrders} pendingOrders={pendingOrders}
          portfolioStats={portfolioStats} portfolioSnapshots={portfolioSnapshots}
          onSymbolSelect={(symbol, assetType) => setSelectedSymbol({ symbol, assetType: assetType as "stock" | "forex" | "crypto" })}
          onCancelOrder={handleCancelOrder}
          height={panelHeight} onHeightChange={setPanelHeight}
          defaultTab={type === "orders" ? "orders" : type === "performance" ? "performance" : "positions"}
        />
      ) : <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Sign in to view</div>
      case "signals":
      case "alerts":
      case "notes":
      case "calculator": return (
        <RightPanel
          symbol={sym} assetType={selectedSymbol?.assetType ?? "stock"}
          currentPrice={livePrice}
          portfolios={portfolios} selectedPortfolio={selectedPortfolio} setSelectedPortfolio={setSelectedPortfolio}
          positions={positions}
          onTradeComplete={() => { refreshBlotter(); fetchPendingOrders(); fetchPerformance() }}
          onToast={addToast}
          alerts={alerts} setAlerts={setAlerts}
          notes={notes} setNotes={setNotes}
          defaultTab="tools"
        />
      )
      case "orderbook": return <OrderBookPanel symbol={sym} assetType={selectedSymbol?.assetType ?? "stock"} />
      case "timesales": return <TimeSalesPanel symbol={sym} assetType={selectedSymbol?.assetType ?? "stock"} />
      case "heatmap": return <HeatmapPanel />
      case "scanner": return <ScannerPanel onSymbolSelect={(symbol, assetType) => setSelectedSymbol({ symbol, assetType: assetType as "stock" | "forex" | "crypto" })} />
      case "domladder": return <DomLadderPanel symbol={sym} assetType={selectedSymbol?.assetType ?? "stock"} />
      case "news": return <NewsPanel />
      case "calendar": return <CalendarPanel />
      default: return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">{type}</div>
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Global header bar ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border bg-card/30 shrink-0 flex-wrap">
        {/* Symbol display */}
        {selectedSymbol ? (
          <>
            <h2 className="text-base font-extrabold font-mono tracking-tight">{sym}</h2>
            {stockDetail?.name && <span className="text-xs text-muted-foreground truncate max-w-[140px] hidden md:block">{stockDetail.name}</span>}
            <span className="text-base font-mono font-bold tabular-nums">${fmtSymbolPrice(livePrice, selectedSymbol.assetType)}</span>
            <span className={`text-xs font-semibold ${liveChange >= 0 ? "text-emerald-500" : "text-red-400"}`}>
              {liveChange >= 0 ? "+" : ""}{liveChange.toFixed(2)}%
            </span>
            {stockDetail?.session && (
              <Badge variant="outline" className={`text-[10px] hidden md:flex ${stockDetail.session === "open" ? "text-emerald-500 border-emerald-500/30" : "text-muted-foreground"}`}>
                {stockDetail.session}
              </Badge>
            )}
            {detailLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Select a symbol</p>
        )}

        {/* Market bar compact */}
        {market && (
          <div className="hidden xl:flex items-center gap-3 text-[10px] text-muted-foreground ml-2 border-l border-white/10 pl-3">
            <span>Index <span className="text-foreground font-mono font-semibold">{market.index.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></span>
            <span className={market.indexChangePct >= 0 ? "text-emerald-500" : "text-red-400"}>
              {market.indexChangePct >= 0 ? "+" : ""}{market.indexChangePct.toFixed(2)}%
            </span>
            <span>F&G <span className="font-semibold text-foreground">{market.fearGreed}</span></span>
            <span>VIX <span className="font-mono">{market.vix.toFixed(1)}</span></span>
            <span className="text-emerald-500">{market.gainers}↑</span>
            <span className="text-red-400">{market.losers}↓</span>
          </div>
        )}

        {/* Layout controls */}
        <div className="ml-auto flex items-center gap-1.5">
          <LayoutsDropdown
            currentName={activeLayout.name}
            savedLayouts={savedLayouts}
            onApply={applyLayout}
            onSaveCurrent={handleSaveLayout}
            onDelete={handleDeleteLayout}
            onRename={handleRenameLayout}
            onReset={() => applyLayout(DEFAULT_LAYOUT)}
          />
          <button
            type="button"
            onClick={() => setShowPanelLibrary(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-foreground/80 hover:text-foreground transition-colors cursor-pointer"
            title="Add panel"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Panel</span>
          </button>
          <button type="button" onClick={() => onNavigate("market")}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0 transition-colors">
            Full view <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Drawing toolbar (new component) ─────────────────────────────── */}
      <NewDrawingToolbar
        tool={activeTool} setTool={setActiveTool}
        color={drawColor} setColor={setDrawColor}
        lineStyle={lineStyle} setLineStyle={setLineStyle}
        lineWidth={lineWidth} setLineWidth={setLineWidth}
        onClear={() => { setUndoStack(s => [...s.slice(-19), drawings]); setRedoStack([]); setDrawings([]) }}
        chartMode={chartMode} setChartMode={setChartMode}
        timeframe={timeframe} setTimeframe={setTimeframe}
        onOpenIndicators={() => setShowIndicatorsPanel(true)}
        indicators={indicators}
      />

      {/* ── Panel grid (fills remaining height) ─────────────────────────── */}
      <div className="flex-1 min-h-0">
        <PanelGrid
          layout={activeLayout.root}
          onUpdateLayout={handleUpdateLayout}
          renderPanel={(type, id) => renderPanel(type, id)}
          panelTitles={PANEL_TITLES}
          lockedTypes={["chart"]}
          onPopOut={(type) => {
            const sym = selectedSymbol?.symbol ?? ""
            const at  = selectedSymbol?.assetType ?? "stock"
            const url = `${window.location.origin}${window.location.pathname}#/popout/${type}?symbol=${encodeURIComponent(sym)}&assetType=${at}`
            window.open(url, `pm_popout_${type}`, "width=960,height=700,resizable=yes,menubar=no,toolbar=no,status=no")
          }}
        />
      </div>

      {/* ── Overlays ─────────────────────────────────────────────────────── */}
      <IndicatorsPanel
        open={showIndicatorsPanel}
        onClose={() => setShowIndicatorsPanel(false)}
        indicators={indicators}
        onUpdate={updateIndicators}
      />
      <PanelLibrary
        open={showPanelLibrary}
        onClose={() => setShowPanelLibrary(false)}
        existingTypes={getPanelTypes(activeLayout.root)}
        onAddPanel={handleAddPanel}
      />
      <ToastContainer toasts={toasts} />
    </div>
  )
}
