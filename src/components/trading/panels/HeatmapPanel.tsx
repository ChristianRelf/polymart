import { useMemo } from "react"
import { useSimulation } from "@/lib/SimulationContext"

const SECTORS = ["Tech", "Finance", "Healthcare", "Energy", "Consumer", "Industrials", "Materials", "Utilities", "Real Estate", "Comm Svcs"]

export function HeatmapPanel() {
  const { stocks } = useSimulation()

  const cells = useMemo(() => {
    const entries = Object.entries(stocks)
    return SECTORS.map(sector => {
      const sectorStocks = entries.filter(() => Math.random() > 0.7).slice(0, 6).map(([sym, s]) => ({
        symbol: sym, change: s.change, name: s.name, price: s.price,
      }))
      const avgChange = sectorStocks.length
        ? sectorStocks.reduce((a, s) => a + s.change, 0) / sectorStocks.length
        : (Math.random() - 0.5) * 4
      return { sector, avgChange, stocks: sectorStocks }
    })
  }, [Object.keys(stocks).length])

  const toColor = (change: number) => {
    const intensity = Math.min(Math.abs(change) / 5, 1)
    if (change > 0) return `rgba(74,222,128,${0.15 + intensity * 0.5})`
    return `rgba(248,113,113,${0.15 + intensity * 0.5})`
  }

  return (
    <div className="h-full p-2 overflow-auto">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))" }}>
        {cells.map(cell => (
          <div
            key={cell.sector}
            className="rounded-lg p-2 border border-white/5 transition-all hover:border-white/15 cursor-default"
            style={{ background: toColor(cell.avgChange) }}
          >
            <p className="text-[10px] font-semibold text-foreground/80 mb-1 truncate">{cell.sector}</p>
            <p className={`text-sm font-bold tabular-nums ${cell.avgChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {cell.avgChange >= 0 ? "+" : ""}{cell.avgChange.toFixed(2)}%
            </p>
            <div className="mt-1 flex flex-wrap gap-0.5">
              {cell.stocks.slice(0, 4).map(s => (
                <span
                  key={s.symbol}
                  className="text-[8px] font-mono text-foreground/60 bg-black/20 px-1 py-0.5 rounded"
                  title={s.name}
                >{s.symbol}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
