import { useEffect, useRef, useState } from "react"
import { useSimulation } from "@/lib/SimulationContext"

interface Trade { id: number; price: number; size: number; side: "buy" | "sell"; time: string }

export function TimeSalesPanel({ symbol, assetType }: { symbol: string; assetType: string }) {
  const { stocks, forexPairs, cryptoCoins, market } = useSimulation()
  const [tape, setTape] = useState<Trade[]>([])
  const idRef = useRef(0)

  const midPrice =
    assetType === "stock"  ? (stocks[symbol]?.price ?? 0) :
    assetType === "forex"  ? (forexPairs[symbol]?.price ?? 0) :
    (cryptoCoins[symbol]?.price ?? 0)

  useEffect(() => {
    if (!midPrice) return
    const count = Math.floor(1 + Math.random() * 4)
    const newTrades: Trade[] = Array.from({ length: count }, () => {
      const side: "buy" | "sell" = Math.random() > 0.5 ? "buy" : "sell"
      const noise = (Math.random() - 0.5) * midPrice * 0.0004
      const price = midPrice + noise
      const size = Math.round((10 + Math.random() * 490) * 10) / 10
      const now = new Date()
      const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`
      return { id: ++idRef.current, price, size, side, time }
    })
    setTape(t => [...newTrades, ...t].slice(0, 200))
  }, [market])

  const fmt = (p: number) => assetType === "forex" ? p.toFixed(4) : p.toFixed(2)

  if (!symbol) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Select a symbol</div>

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 text-[10px] text-muted-foreground font-mono shrink-0">
        <span className="w-16">Time</span>
        <span className="flex-1 text-right">Price</span>
        <span className="w-16 text-right">Size</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tape.map(t => (
          <div key={t.id} className="flex items-center gap-2 px-3 py-0.5 hover:bg-white/3 text-[10px] font-mono">
            <span className="w-16 text-muted-foreground">{t.time}</span>
            <span className={`flex-1 text-right font-semibold ${t.side === "buy" ? "text-emerald-400" : "text-red-400"}`}>{fmt(t.price)}</span>
            <span className="w-16 text-right text-foreground/60">{t.size.toLocaleString()}</span>
          </div>
        ))}
        {tape.length === 0 && (
          <div className="flex items-center justify-center h-20 text-[10px] text-muted-foreground">Waiting for trades...</div>
        )}
      </div>
    </div>
  )
}
