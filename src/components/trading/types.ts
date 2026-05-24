// ── Panel layout types ────────────────────────────────────────────────────────

export type PanelType =
  | "chart"
  | "watchlist"
  | "orderbook"
  | "timesales"
  | "positions"
  | "orders"
  | "tradeform"
  | "news"
  | "calendar"
  | "heatmap"
  | "scanner"
  | "notes"
  | "alerts"
  | "performance"
  | "calculator"
  | "signals"
  | "domladder"

export interface PanelDef {
  id: string
  type: PanelType
  col: number
  row: number
  colSpan: number
  rowSpan: number
  config?: Record<string, unknown>
}

// ── Split-pane layout tree ─────────────────────────────────────────────────────

export interface PanelLeaf {
  kind: "panel"
  id: string
  type: PanelType
}

export interface SplitPane {
  kind: "split"
  dir: "row" | "col"     // row = side-by-side, col = stacked vertically
  children: SplitChild[]
}

export interface SplitChild {
  size: number             // fraction 0–1; all siblings must sum to 1
  node: PanelLeaf | SplitPane
}

export type LayoutNode = PanelLeaf | SplitPane

export interface SavedLayout {
  name: string
  root: LayoutNode
}

// ── Indicator types ───────────────────────────────────────────────────────────

export type IndicatorPane = "main" | "sub"

export interface IndicatorConfig {
  id: string
  type: string
  label: string
  enabled: boolean
  params: Record<string, number | string>
  pane: IndicatorPane
  color?: string
}

export const DEFAULT_INDICATORS: IndicatorConfig[] = [
  { id: "sma20",  type: "sma",    label: "SMA 20",          enabled: true,  params: { period: 20  }, pane: "main", color: "#4ade80" },
  { id: "sma50",  type: "sma",    label: "SMA 50",          enabled: true,  params: { period: 50  }, pane: "main", color: "#f87171" },
  { id: "bb",     type: "bb",     label: "Bollinger Bands", enabled: true,  params: { period: 20, stddev: 2 }, pane: "main", color: "#7c8af4" },
  { id: "vwap",   type: "vwap",   label: "VWAP",            enabled: true,  params: {}, pane: "main", color: "#fbbf24" },
  { id: "macd",   type: "macd",   label: "MACD",            enabled: true,  params: { fast: 12, slow: 26, signal: 9 }, pane: "sub", color: "#60a5fa" },
  { id: "volume", type: "volume", label: "Volume",          enabled: true,  params: {}, pane: "sub", color: "#6b7280" },
]

export const AVAILABLE_INDICATORS: { type: string; label: string; pane: IndicatorPane; defaultParams: Record<string, number | string>; defaultColor: string }[] = [
  // Main chart
  { type: "sma",      label: "SMA",               pane: "main", defaultParams: { period: 20 },             defaultColor: "#4ade80" },
  { type: "ema",      label: "EMA",               pane: "main", defaultParams: { period: 20 },             defaultColor: "#a78bfa" },
  { type: "wma",      label: "WMA",               pane: "main", defaultParams: { period: 20 },             defaultColor: "#f59e0b" },
  { type: "bb",       label: "Bollinger Bands",   pane: "main", defaultParams: { period: 20, stddev: 2 }, defaultColor: "#7c8af4" },
  { type: "vwap",     label: "VWAP",              pane: "main", defaultParams: {},                         defaultColor: "#fbbf24" },
  { type: "sar",      label: "Parabolic SAR",     pane: "main", defaultParams: { step: 0.02, max: 0.2 },  defaultColor: "#f97316" },
  { type: "ichimoku", label: "Ichimoku Cloud",    pane: "main", defaultParams: { tenkan: 9, kijun: 26, senkou: 52 }, defaultColor: "#34d399" },
  { type: "keltner",  label: "Keltner Channel",   pane: "main", defaultParams: { period: 20, mult: 2 },   defaultColor: "#818cf8" },
  { type: "donchian", label: "Donchian Channel",  pane: "main", defaultParams: { period: 20 },             defaultColor: "#38bdf8" },
  { type: "linreg",   label: "Linear Regression", pane: "main", defaultParams: {},                         defaultColor: "#e879f9" },
  { type: "pivots",   label: "Pivot Points",      pane: "main", defaultParams: {},                         defaultColor: "#94a3b8" },
  // Sub-chart
  { type: "macd",     label: "MACD",              pane: "sub",  defaultParams: { fast: 12, slow: 26, signal: 9 }, defaultColor: "#60a5fa" },
  { type: "rsi",      label: "RSI",               pane: "sub",  defaultParams: { period: 14 },             defaultColor: "#a78bfa" },
  { type: "stoch",    label: "Stochastic",        pane: "sub",  defaultParams: { k: 14, d: 3 },            defaultColor: "#34d399" },
  { type: "cci",      label: "CCI",               pane: "sub",  defaultParams: { period: 20 },             defaultColor: "#fb923c" },
  { type: "atr",      label: "ATR",               pane: "sub",  defaultParams: { period: 14 },             defaultColor: "#facc15" },
  { type: "obv",      label: "OBV",               pane: "sub",  defaultParams: {},                         defaultColor: "#6ee7b7" },
  { type: "volume",   label: "Volume",            pane: "sub",  defaultParams: {},                         defaultColor: "#6b7280" },
]

// ── Drawing types ─────────────────────────────────────────────────────────────

export type ToolMode =
  | "cursor" | "hline" | "vline" | "trendline" | "ray" | "channel"
  | "rect" | "ellipse" | "arrow" | "text" | "fib" | "measure" | "alert" | "erase"
  | "extline" | "trendangle" | "pitchfork"
  | "triangle" | "brush"
  | "fibext" | "fibfan" | "fibtime"
  | "callout" | "pricenote"

export interface Drawing {
  id: string
  type: "hline" | "vline" | "trendline" | "ray" | "channel" | "rect" | "ellipse"
    | "arrow" | "text" | "fib" | "extline" | "trendangle" | "pitchfork"
    | "triangle" | "brush" | "fibext" | "fibfan" | "fibtime" | "callout" | "pricenote"
  color: string
  price?: number
  idxFromRight?: number
  label?: string
  p1?: { price: number; idxFromRight: number }
  p2?: { price: number; idxFromRight: number }
  p3?: { price: number; idxFromRight: number }
  p4?: { price: number; idxFromRight: number }
  points?: { price: number; idxFromRight: number }[]  // brush freehand
  text?: string
  fontSize?: "sm" | "md" | "lg"
  showBg?: boolean
  lineStyle?: "solid" | "dashed" | "dotted"
  lineWidth?: 1 | 2 | 3
}

export interface PriceAlert {
  id: string
  price: number
  direction: "above" | "below"
  label: string
  triggered: boolean
  createdAt: string
}

export interface ChartGeom {
  mn: number; mx: number; rng: number
  pad: { t: number; r: number; b: number; l: number }
  gap: number; n: number
  cssW: number; cssH: number
}
