import { useState } from "react"
import { X, Search, BarChart2, BookOpen, Clock, ListOrdered, ShoppingCart, Newspaper, Calendar, Map, ScanSearch, FileText, Bell, TrendingUp, Calculator, Activity, Layers } from "lucide-react"
import type { PanelType } from "./types"

interface PanelMeta {
  type: PanelType
  label: string
  description: string
  icon: React.ReactNode
  category: string
}

const PANEL_CATALOG: PanelMeta[] = [
  // Charts & Data
  { type: "chart",       label: "Chart",          description: "Price chart with drawing tools", icon: <BarChart2 className="w-5 h-5" />,     category: "Charts & Data" },
  { type: "orderbook",   label: "Order Book",     description: "Level II bid/ask depth",         icon: <BookOpen className="w-5 h-5" />,      category: "Charts & Data" },
  { type: "timesales",   label: "Time & Sales",   description: "Live trade tape",                icon: <Clock className="w-5 h-5" />,         category: "Charts & Data" },
  { type: "heatmap",     label: "Heatmap",        description: "Market sector heatmap",          icon: <Map className="w-5 h-5" />,           category: "Charts & Data" },
  { type: "scanner",     label: "Scanner",        description: "Filter and rank symbols",        icon: <ScanSearch className="w-5 h-5" />,    category: "Charts & Data" },
  { type: "domladder",   label: "DOM Ladder",     description: "Depth of market ladder",         icon: <Layers className="w-5 h-5" />,        category: "Charts & Data" },
  // Trading
  { type: "tradeform",   label: "Order Entry",    description: "Buy/Sell order form",            icon: <ShoppingCart className="w-5 h-5" />,  category: "Trading" },
  { type: "positions",   label: "Positions",      description: "Open positions table",           icon: <ListOrdered className="w-5 h-5" />,   category: "Trading" },
  { type: "orders",      label: "Order History",  description: "Executed & pending orders",      icon: <ListOrdered className="w-5 h-5" />,   category: "Trading" },
  { type: "alerts",      label: "Alerts",         description: "Price alert manager",            icon: <Bell className="w-5 h-5" />,          category: "Trading" },
  { type: "calculator",  label: "Calculator",     description: "Position size & risk/reward",    icon: <Calculator className="w-5 h-5" />,    category: "Trading" },
  { type: "signals",     label: "Signals",        description: "Technical indicator signals",    icon: <Activity className="w-5 h-5" />,      category: "Trading" },
  // Market Info
  { type: "news",        label: "News Feed",      description: "Market headlines",               icon: <Newspaper className="w-5 h-5" />,     category: "Market Info" },
  { type: "calendar",    label: "Econ Calendar",  description: "Economic events & impact",       icon: <Calendar className="w-5 h-5" />,      category: "Market Info" },
  { type: "performance", label: "Performance",    description: "Equity curve & stats",           icon: <TrendingUp className="w-5 h-5" />,    category: "Market Info" },
  { type: "watchlist",   label: "Watchlist",      description: "Symbol list & search",           icon: <Search className="w-5 h-5" />,        category: "Market Info" },
  // Tools
  { type: "notes",       label: "Notes",          description: "Trade journal & notes",          icon: <FileText className="w-5 h-5" />,      category: "Tools" },
]

const CATEGORIES = ["Charts & Data", "Trading", "Market Info", "Tools"]

interface PanelLibraryProps {
  open: boolean
  onClose: () => void
  existingTypes: PanelType[]
  onAddPanel: (type: PanelType) => void
}

export function PanelLibrary({ open, onClose, existingTypes, onAddPanel }: PanelLibraryProps) {
  const [query, setQuery] = useState("")

  if (!open) return null

  const filtered = PANEL_CATALOG.filter(p =>
    !query || p.label.toLowerCase().includes(query.toLowerCase()) || p.description.toLowerCase().includes(query.toLowerCase())
  )

  const grouped = CATEGORIES.reduce<Record<string, PanelMeta[]>>((acc, cat) => {
    acc[cat] = filtered.filter(p => p.category === cat)
    return acc
  }, {})

  const hasPanel = (type: PanelType) => existingTypes.includes(type)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-[520px] max-h-[80vh] flex flex-col rounded-xl border border-white/10 bg-[oklch(0.15_0.004_264)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
          <h2 className="font-semibold text-sm">Add Panel</h2>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors border-0 bg-transparent cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Search */}
        <div className="px-4 py-2.5 border-b border-white/5 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search panels..."
              className="w-full bg-black/30 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-white/20 transition-colors"
            />
          </div>
        </div>
        {/* Panel grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {CATEGORIES.map(cat => {
            const items = grouped[cat]
            if (!items?.length) return null
            return (
              <div key={cat}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</p>
                <div className="grid grid-cols-3 gap-2">
                  {items.map(meta => {
                    const active = hasPanel(meta.type)
                    return (
                      <button
                        key={meta.type}
                        onClick={() => { onAddPanel(meta.type); onClose() }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all cursor-pointer text-center ${
                          active
                            ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                            : "border-white/10 bg-white/3 hover:bg-white/8 hover:border-white/20 text-foreground/80"
                        }`}
                      >
                        <div className={`${active ? "text-indigo-400" : "text-muted-foreground"}`}>{meta.icon}</div>
                        <div>
                          <p className="text-[11px] font-semibold leading-tight">{meta.label}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{meta.description}</p>
                        </div>
                        {active && <span className="text-[9px] text-indigo-400 font-medium">Active</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
