import { useState, useRef, useCallback } from "react"
import {
  MousePointer2, Eraser, Minus, AlignCenter, TrendingUp, ArrowUpRight, Layers,
  Square, Circle, ChevronRight, Type, Percent, Ruler, Bell, BarChart2, BarChart,
  Trash2, Triangle, GitFork, Maximize2, Spline, Hash, MessageSquare, BookmarkCheck,
  SlidersHorizontal, Activity,
} from "lucide-react"
import type { ToolMode, IndicatorConfig } from "./types"

const DRAW_COLORS = ["#ffffff","#4ade80","#f87171","#60a5fa","#fbbf24","#c084fc","#f97316","#34d399","#fb7185","#38bdf8"]

interface ToolDef {
  id: ToolMode
  icon: React.ReactNode
  label: string
  description: string
  key?: string
}

interface ToolGroup {
  label: string
  tools: ToolDef[]
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    label: "Navigate",
    tools: [
      { id: "cursor",    icon: <MousePointer2 className="w-3.5 h-3.5" />,  label: "Select",        description: "Select & move drawings",          key: "Esc" },
      { id: "erase",     icon: <Eraser className="w-3.5 h-3.5" />,          label: "Erase",         description: "Click a drawing to remove it",    key: "X" },
    ],
  },
  {
    label: "Lines",
    tools: [
      { id: "hline",     icon: <Minus className="w-3.5 h-3.5" />,           label: "H-Line",        description: "Horizontal price level",          key: "1" },
      { id: "vline",     icon: <AlignCenter className="w-3.5 h-3.5" />,     label: "V-Line",        description: "Vertical time marker",            key: "2" },
      { id: "trendline", icon: <TrendingUp className="w-3.5 h-3.5" />,      label: "Trendline",     description: "2-point trend line",              key: "3" },
      { id: "extline",   icon: <Maximize2 className="w-3.5 h-3.5" />,       label: "Extended",      description: "Line extended in both directions", key: "4" },
      { id: "ray",       icon: <ArrowUpRight className="w-3.5 h-3.5" />,    label: "Ray",           description: "Half-line from a point rightward", key: "5" },
      { id: "trendangle",icon: <Hash className="w-3.5 h-3.5" />,            label: "Trend Angle",   description: "Trendline with angle display" },
      { id: "channel",   icon: <Layers className="w-3.5 h-3.5" />,          label: "Channel",       description: "Parallel price channel",          key: "6" },
      { id: "pitchfork", icon: <GitFork className="w-3.5 h-3.5" />,         label: "Pitchfork",     description: "Andrews' Pitchfork (3 points)",   key: "P" },
    ],
  },
  {
    label: "Shapes",
    tools: [
      { id: "rect",      icon: <Square className="w-3.5 h-3.5" />,          label: "Zone / Rect",   description: "Price zone rectangle",            key: "7" },
      { id: "ellipse",   icon: <Circle className="w-3.5 h-3.5" />,          label: "Ellipse",       description: "Oval shape",                      key: "8" },
      { id: "triangle",  icon: <Triangle className="w-3.5 h-3.5" />,        label: "Triangle",      description: "3-point triangle",                key: "9" },
      { id: "arrow",     icon: <ChevronRight className="w-3.5 h-3.5" />,    label: "Arrow",         description: "Directional arrow",               key: "0" },
      { id: "brush",     icon: <Spline className="w-3.5 h-3.5" />,          label: "Brush",         description: "Freehand drawing" },
    ],
  },
  {
    label: "Projections",
    tools: [
      { id: "fib",       icon: <Percent className="w-3.5 h-3.5" />,         label: "Fib Retracement", description: "Fibonacci retracement levels",  key: "F" },
      { id: "fibext",    icon: <Percent className="w-3.5 h-3.5" />,         label: "Fib Extension",   description: "Fibonacci extension levels" },
      { id: "fibfan",    icon: <Activity className="w-3.5 h-3.5" />,        label: "Fib Fan",         description: "Fibonacci fan lines" },
      { id: "fibtime",   icon: <AlignCenter className="w-3.5 h-3.5" />,     label: "Fib Time Zones",  description: "Vertical Fibonacci time intervals" },
    ],
  },
  {
    label: "Annotate",
    tools: [
      { id: "text",      icon: <Type className="w-3.5 h-3.5" />,            label: "Label",         description: "Text annotation",                 key: "T" },
      { id: "callout",   icon: <MessageSquare className="w-3.5 h-3.5" />,   label: "Callout",       description: "Speech bubble text box" },
      { id: "pricenote", icon: <BookmarkCheck className="w-3.5 h-3.5" />,   label: "Price Note",    description: "Note pinned to a price level" },
      { id: "measure",   icon: <Ruler className="w-3.5 h-3.5" />,           label: "Measure",       description: "Measure price & time range",      key: "M" },
      { id: "alert",     icon: <Bell className="w-3.5 h-3.5" />,            label: "Alert",         description: "Set a price alert",               key: "A" },
    ],
  },
]

const LINE_STYLES = ["solid", "dashed", "dotted"] as const
const LINE_WIDTHS = [1, 2, 3] as const
const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "D", "W"] as const

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipProps { label: string; shortcut?: string; description?: string; children: React.ReactNode }

export function Tooltip({ label, shortcut, description, children }: TooltipProps) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const onEnter = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 6 })
    timerRef.current = setTimeout(() => setShow(true), 400)
  }, [])

  const onLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setShow(false)
  }, [])

  return (
    <div ref={ref} className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {children}
      {show && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: pos.x, top: pos.y, transform: "translateX(-50%)" }}
        >
          <div className="bg-[oklch(0.18_0.006_264)] border border-white/15 rounded-lg px-2.5 py-1.5 shadow-xl min-w-[110px] text-center">
            <div className="flex items-center gap-1.5 justify-center">
              <span className="text-[11px] font-semibold text-foreground whitespace-nowrap">{label}</span>
              {shortcut && (
                <span className="text-[9px] font-mono bg-white/10 text-muted-foreground px-1 py-0.5 rounded border border-white/10 whitespace-nowrap">{shortcut}</span>
              )}
            </div>
            {description && <p className="text-[9px] text-muted-foreground mt-0.5 whitespace-nowrap">{description}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Flyout group ──────────────────────────────────────────────────────────────

function ToolGroupFlyout({ group, activeTool, onSelect, isOpen, onOpen, onClose }: {
  group: ToolGroup
  activeTool: ToolMode
  onSelect: (id: ToolMode) => void
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
}) {
  const activeInGroup = group.tools.find(t => t.id === activeTool)

  return (
    <div className="relative" onMouseEnter={onOpen} onMouseLeave={onClose}>
      <Tooltip label={activeInGroup?.label ?? group.label} shortcut={activeInGroup?.key} description={activeInGroup?.description}>
        <button
          type="button"
          onClick={() => activeInGroup ? onSelect(activeInGroup.id) : onSelect(group.tools[0].id)}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer border-0 ${
            activeInGroup ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground bg-transparent hover:bg-white/8"
          }`}
        >
          {activeInGroup?.icon ?? group.tools[0].icon}
          <span className="hidden xl:inline text-[10px]">{group.label}</span>
          <svg className="w-2 h-2 opacity-50" viewBox="0 0 6 6" fill="currentColor"><path d="M0 2l3 3 3-3H0z"/></svg>
        </button>
      </Tooltip>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] rounded-xl border border-white/10 bg-[oklch(0.15_0.004_264)] shadow-2xl overflow-hidden py-1">
          {group.tools.map(tool => (
            <button
              type="button"
              key={tool.id}
              onClick={() => { onSelect(tool.id); onClose() }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer border-0 hover:bg-white/8 ${
                activeTool === tool.id ? "bg-indigo-600/20 text-indigo-300" : "bg-transparent text-foreground/80"
              }`}
            >
              <span className={`shrink-0 ${activeTool === tool.id ? "text-indigo-400" : "text-muted-foreground"}`}>{tool.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium leading-tight">{tool.label}</p>
                <p className="text-[9px] text-muted-foreground leading-tight truncate">{tool.description}</p>
              </div>
              {tool.key && (
                <span className="text-[9px] font-mono bg-white/8 text-muted-foreground px-1 py-0.5 rounded border border-white/10 shrink-0">{tool.key}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main DrawingToolbar ───────────────────────────────────────────────────────

const LINE_TOOL_IDS: ToolMode[] = ["hline", "vline", "trendline", "ray", "channel", "extline", "trendangle", "pitchfork", "fib", "fibext", "fibfan", "fibtime", "arrow", "triangle", "rect", "ellipse", "brush"]

interface DrawingToolbarProps {
  tool: ToolMode
  setTool: (t: ToolMode) => void
  color: string
  setColor: (c: string) => void
  lineStyle: "solid" | "dashed" | "dotted"
  setLineStyle: (s: "solid" | "dashed" | "dotted") => void
  lineWidth: 1 | 2 | 3
  setLineWidth: (w: 1 | 2 | 3) => void
  onClear: () => void
  chartMode: "candle" | "line"
  setChartMode: (m: "candle" | "line") => void
  timeframe: string
  setTimeframe: (tf: string) => void
  onOpenIndicators: () => void
  indicators: IndicatorConfig[]
}

export function DrawingToolbar({
  tool, setTool, color, setColor,
  lineStyle, setLineStyle, lineWidth, setLineWidth,
  onClear, chartMode, setChartMode,
  timeframe, setTimeframe,
  onOpenIndicators, indicators,
}: DrawingToolbarProps) {
  const isLineTool = LINE_TOOL_IDS.includes(tool)
  const activeCount = indicators.filter(i => i.enabled).length
  const [openFlyout, setOpenFlyout] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleFlyoutOpen = useCallback((label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenFlyout(label)
  }, [])
  const handleFlyoutClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpenFlyout(null), 150)
  }, [])

  return (
    <div className="border-b border-white/5 bg-[oklch(0.15_0.004_264)] shrink-0">
      {/* Row 1: chart controls */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/5">
        {/* Chart type toggle */}
        <div className="flex items-center gap-0.5 bg-black/30 rounded-lg p-0.5">
          <Tooltip label="Candlestick" description="OHLC candles">
            <button onClick={() => setChartMode("candle")} className={`flex items-center px-2 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer border-0 ${chartMode === "candle" ? "bg-white/15 text-foreground" : "text-muted-foreground hover:text-foreground bg-transparent"}`}>
              <BarChart2 className="w-3 h-3" />
            </button>
          </Tooltip>
          <Tooltip label="Line" description="Area line chart">
            <button onClick={() => setChartMode("line")} className={`flex items-center px-2 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer border-0 ${chartMode === "line" ? "bg-white/15 text-foreground" : "text-muted-foreground hover:text-foreground bg-transparent"}`}>
              <BarChart className="w-3 h-3" />
            </button>
          </Tooltip>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-0.5 bg-black/20 rounded-lg p-0.5">
          {TIMEFRAMES.map(tf => (
            <Tooltip key={tf} label={tf} description={tfLabel(tf)}>
              <button
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded-md text-[10px] font-mono font-medium transition-colors cursor-pointer border-0 ${
                  timeframe === tf ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground bg-transparent hover:bg-white/8"
                }`}
              >
                {tf}
              </button>
            </Tooltip>
          ))}
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-white/10" />

        {/* Indicators button */}
        <Tooltip label="Indicators" description="Add & configure data layers">
          <button
            onClick={onOpenIndicators}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-white/10 bg-transparent"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span className="hidden sm:inline">Indicators</span>
            {activeCount > 0 && (
              <span className="bg-indigo-600 text-white text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">{activeCount}</span>
            )}
          </button>
        </Tooltip>
      </div>

      {/* Row 2: drawing tools */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 flex-wrap">
        {/* Tool groups with flyouts */}
        {TOOL_GROUPS.map((group, gi) => (
          <div key={group.label} className={`flex items-center ${gi > 0 ? "border-l border-white/10 pl-1 ml-0.5" : ""}`}>
            <ToolGroupFlyout
              group={group} activeTool={tool} onSelect={setTool}
              isOpen={openFlyout === group.label}
              onOpen={() => handleFlyoutOpen(group.label)}
              onClose={handleFlyoutClose}
            />
          </div>
        ))}

        {/* Line style + width (contextual when a line tool is selected) */}
        {isLineTool && (
          <>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <div className="flex items-center gap-0.5 bg-black/20 rounded-lg p-0.5">
              {LINE_STYLES.map(s => (
                <Tooltip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} description={`${s} line style`}>
                  <button
                    onClick={() => setLineStyle(s)}
                    className={`px-2 py-1 rounded-md transition-colors cursor-pointer border-0 ${lineStyle === s ? "bg-white/15 text-foreground" : "text-muted-foreground hover:text-foreground bg-transparent hover:bg-white/8"}`}
                  >
                    <LineStyleIcon style={s} />
                  </button>
                </Tooltip>
              ))}
            </div>
            <div className="flex items-center gap-0.5 bg-black/20 rounded-lg p-0.5 ml-0.5">
              {LINE_WIDTHS.map(w => (
                <Tooltip key={w} label={`${w}px`} description="Line thickness">
                  <button
                    onClick={() => setLineWidth(w)}
                    className={`px-2 py-1 rounded-md transition-colors cursor-pointer border-0 ${lineWidth === w ? "bg-white/15 text-foreground" : "text-muted-foreground hover:text-foreground bg-transparent hover:bg-white/8"}`}
                  >
                    <div className="w-4 flex items-center justify-center">
                      <div style={{ height: w, background: "currentColor", width: "100%", borderRadius: 1 }} />
                    </div>
                  </button>
                </Tooltip>
              ))}
            </div>
          </>
        )}

        {/* Color palette */}
        <div className="w-px h-4 bg-white/10 mx-1" />
        <div className="flex items-center gap-1">
          {DRAW_COLORS.map(c => (
            <Tooltip key={c} label={colorName(c)} description="Drawing color">
              <button
                onClick={() => setColor(c)}
                className={`w-4 h-4 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 ${color === c ? "border-white scale-110" : "border-transparent"}`}
                style={{ background: c }}
              />
            </Tooltip>
          ))}
        </div>

        {/* Clear all */}
        <Tooltip label="Clear All" description="Remove all drawings" shortcut="Del">
          <button
            onClick={onClear}
            className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] text-muted-foreground hover:text-red-400 transition-colors cursor-pointer bg-transparent border-0 hover:bg-red-500/10"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}

function LineStyleIcon({ style }: { style: string }) {
  return (
    <svg viewBox="0 0 16 4" width="16" height="4" stroke="currentColor" strokeWidth="1.5" fill="none">
      {style === "solid"  && <line x1="0" y1="2" x2="16" y2="2" />}
      {style === "dashed" && <line x1="0" y1="2" x2="16" y2="2" strokeDasharray="4 2" />}
      {style === "dotted" && <line x1="0" y1="2" x2="16" y2="2" strokeDasharray="1.5 2" />}
    </svg>
  )
}

function tfLabel(tf: string): string {
  const map: Record<string, string> = { "1m": "1 Minute", "5m": "5 Minutes", "15m": "15 Minutes", "1h": "1 Hour", "4h": "4 Hours", "D": "Daily", "W": "Weekly" }
  return map[tf] ?? tf
}

function colorName(hex: string): string {
  const map: Record<string, string> = {
    "#ffffff": "White", "#4ade80": "Green", "#f87171": "Red", "#60a5fa": "Blue",
    "#fbbf24": "Yellow", "#c084fc": "Purple", "#f97316": "Orange", "#34d399": "Teal",
    "#fb7185": "Pink", "#38bdf8": "Sky",
  }
  return map[hex] ?? hex
}

export { TOOL_GROUPS, DRAW_COLORS }
