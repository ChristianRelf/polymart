import { useMemo } from "react"
import { useSimulation } from "@/lib/SimulationContext"

export function DomLadderPanel({ symbol, assetType }: { symbol: string; assetType: string }) {
  const { stocks, forexPairs, cryptoCoins } = useSimulation()
  const midPrice =
    assetType === "stock"  ? (stocks[symbol]?.price ?? 0) :
    assetType === "forex"  ? (forexPairs[symbol]?.price ?? 0) :
    (cryptoCoins[symbol]?.price ?? 0)

  const levels = 16
  const tick = midPrice * 0.0002

  const rows = useMemo(() => {
    return Array.from({ length: levels }, (_, i) => {
      const offset = (levels / 2 - i) * tick
      const price = midPrice + offset
      const isBid = offset < 0
      const isAsk = offset > 0
      const isMid = offset === 0
      const bidSize = isBid ? Math.round(10 + Math.random() * 500) : 0
      const askSize = isAsk ? Math.round(10 + Math.random() * 500) : 0
      return { price, bidSize, askSize, isBid, isAsk, isMid }
    })
  }, [midPrice])

  const maxSize = Math.max(...rows.map(r => Math.max(r.bidSize, r.askSize)), 1)
  const fmt = (p: number) => assetType === "forex" ? p.toFixed(4) : p.toFixed(2)

  if (!symbol) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Select a symbol</div>

  return (
    <div className="flex flex-col h-full font-mono">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-white/5 text-[9px] text-muted-foreground shrink-0">
        <span className="w-16 text-right">Bid</span>
        <span className="flex-1 text-center">Price</span>
        <span className="w-16 text-left">Ask</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`relative flex items-center gap-1 px-2 py-0.5 text-[10px] ${row.isMid ? "bg-white/8 border-y border-white/10" : "hover:bg-white/3"}`}
          >
            {/* Bid bar */}
            <div className="w-16 relative flex items-center justify-end">
              {row.bidSize > 0 && (
                <>
                  <div className="absolute inset-y-0 right-0 bg-emerald-500/20 rounded-l" style={{ width: `${(row.bidSize / maxSize) * 100}%` }} />
                  <span className="relative text-emerald-400 z-10">{row.bidSize}</span>
                </>
              )}
            </div>
            {/* Price */}
            <span className={`flex-1 text-center font-semibold ${row.isMid ? "text-foreground" : row.isAsk ? "text-red-300" : "text-emerald-300"}`}>
              {fmt(row.price)}
            </span>
            {/* Ask bar */}
            <div className="w-16 relative flex items-center justify-start">
              {row.askSize > 0 && (
                <>
                  <div className="absolute inset-y-0 left-0 bg-red-500/20 rounded-r" style={{ width: `${(row.askSize / maxSize) * 100}%` }} />
                  <span className="relative text-red-400 z-10">{row.askSize}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
