import { useState, useMemo } from "react"
import { Search, TrendingUp, TrendingDown, Filter } from "lucide-react"
import { useSimulation } from "@/lib/SimulationContext"

type SortKey = "change" | "volume" | "price" | "name"
type Filter = "all" | "gainers" | "losers" | "overbought" | "oversold"

export function ScannerPanel({ onSymbolSelect }: { onSymbolSelect?: (symbol: string, assetType: string) => void }) {
  const { stocks } = useSimulation()
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("change")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [filter, setFilter] = useState<Filter>("all")

  const entries = useMemo(() => {
    let list = Object.entries(stocks).map(([sym, s]) => ({
      symbol: sym, name: s.name, price: s.price, change: s.change,
      rsi: s.rsi ?? 50, volume: Math.round(Math.random() * 10_000_000),
    }))
    const q = query.toUpperCase()
    if (q) list = list.filter(s => s.symbol.includes(q) || s.name.toUpperCase().includes(q))
    if (filter === "gainers") list = list.filter(s => s.change > 0)
    if (filter === "losers") list = list.filter(s => s.change < 0)
    if (filter === "overbought") list = list.filter(s => s.rsi > 70)
    if (filter === "oversold") list = list.filter(s => s.rsi < 30)
    list.sort((a, b) => {
      const aVal = a[sortKey === "volume" ? "volume" : sortKey === "name" ? "symbol" : sortKey]
      const bVal = b[sortKey === "volume" ? "volume" : sortKey === "name" ? "symbol" : sortKey]
      if (typeof aVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal)
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })
    return list
  }, [stocks, query, sortKey, sortDir, filter])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search + filter */}
      <div className="p-2 border-b border-white/5 space-y-1.5 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          <input value={query} onChange={e => setQuery(e.target.value.toUpperCase())} placeholder="Search..." className="w-full bg-black/30 border border-white/10 rounded pl-6 pr-2 py-1 text-[10px] font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-white/20" />
        </div>
        <div className="flex gap-0.5 flex-wrap">
          {(["all","gainers","losers","overbought","oversold"] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-2 py-0.5 rounded text-[9px] capitalize cursor-pointer border-0 transition-colors ${filter === f ? "bg-indigo-600 text-white" : "bg-white/5 text-muted-foreground hover:text-foreground"}`}>{f}</button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-white/5 text-[9px] text-muted-foreground shrink-0">
        <button onClick={() => toggleSort("name")} className="flex-1 text-left flex items-center gap-0.5 cursor-pointer border-0 bg-transparent text-muted-foreground hover:text-foreground">
          Symbol {sortKey === "name" && (sortDir === "asc" ? "↑" : "↓")}
        </button>
        <button onClick={() => toggleSort("price")} className="w-14 text-right flex items-center justify-end gap-0.5 cursor-pointer border-0 bg-transparent text-muted-foreground hover:text-foreground">
          Price {sortKey === "price" && (sortDir === "asc" ? "↑" : "↓")}
        </button>
        <button onClick={() => toggleSort("change")} className="w-14 text-right flex items-center justify-end gap-0.5 cursor-pointer border-0 bg-transparent text-muted-foreground hover:text-foreground">
          Chg% {sortKey === "change" && (sortDir === "asc" ? "↑" : "↓")}
        </button>
        <span className="w-8 text-right">RSI</span>
      </div>

      {/* Rows */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {entries.map(s => (
          <button
            key={s.symbol}
            onClick={() => onSymbolSelect?.(s.symbol, "stock")}
            className="w-full flex items-center gap-1 px-2 py-1.5 hover:bg-white/5 text-left cursor-pointer border-0 bg-transparent transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono font-semibold">{s.symbol}</p>
              <p className="text-[9px] text-muted-foreground truncate">{s.name}</p>
            </div>
            <span className="w-14 text-right text-[10px] font-mono tabular-nums">${s.price.toFixed(2)}</span>
            <span className={`w-14 text-right text-[10px] font-mono tabular-nums font-medium ${s.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {s.change >= 0 ? "+" : ""}{s.change.toFixed(2)}%
            </span>
            <span className={`w-8 text-right text-[9px] font-mono ${s.rsi > 70 ? "text-red-400" : s.rsi < 30 ? "text-emerald-400" : "text-muted-foreground"}`}>
              {s.rsi.toFixed(0)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
