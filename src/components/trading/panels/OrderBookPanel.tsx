import { useMemo } from "react"
import { useSimulation } from "@/lib/SimulationContext"

interface OrderBookPanelProps {
  symbol: string
  assetType: string
}

function generateDepth(midPrice: number, side: "bid" | "ask", levels = 12): { price: number; size: number; total: number }[] {
  const out: { price: number; size: number; total: number }[] = []
  let cum = 0
  for (let i = 0; i < levels; i++) {
    const offset = (i + 1) * (midPrice * 0.00015)
    const price = side === "bid" ? midPrice - offset : midPrice + offset
    const size = Math.round((50 + Math.random() * 950) * 10) / 10
    cum += size
    out.push({ price: Math.round(price * 10000) / 10000, size, total: Math.round(cum * 10) / 10 })
  }
  return side === "bid" ? out : out.reverse()
}

export function OrderBookPanel({ symbol, assetType }: OrderBookPanelProps) {
  const { stocks, forexPairs, cryptoCoins } = useSimulation()
  const midPrice =
    assetType === "stock"  ? (stocks[symbol]?.price ?? 0) :
    assetType === "forex"  ? (forexPairs[symbol]?.price ?? 0) :
    (cryptoCoins[symbol]?.price ?? 0)

  const asks = useMemo(() => generateDepth(midPrice, "ask"), [midPrice])
  const bids = useMemo(() => generateDepth(midPrice, "bid"), [midPrice])

  const maxTotal = Math.max(...asks.map(a => a.total), ...bids.map(b => b.total))

  if (!symbol) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Select a symbol</div>

  const fmt = (p: number) => assetType === "forex" ? p.toFixed(4) : p.toFixed(2)

  return (
    <div className="flex flex-col h-full text-[10px] font-mono">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 text-muted-foreground shrink-0">
        <span className="flex-1">Price</span>
        <span className="w-16 text-right">Size</span>
        <span className="w-16 text-right">Total</span>
      </div>

      {/* Asks */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col-reverse">
        {asks.map((row, i) => (
          <div key={i} className="relative flex items-center gap-2 px-3 py-0.5 hover:bg-white/3">
            <div className="absolute inset-y-0 right-0 bg-red-500/8" style={{ width: `${(row.total / maxTotal) * 100}%` }} />
            <span className="flex-1 text-red-400 relative">{fmt(row.price)}</span>
            <span className="w-16 text-right text-foreground/70 relative">{row.size.toLocaleString()}</span>
            <span className="w-16 text-right text-muted-foreground relative">{row.total.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div className="flex items-center gap-2 px-3 py-1 bg-[oklch(0.18_0.004_264)] border-y border-white/8 shrink-0">
        <span className="text-muted-foreground">Mid</span>
        <span className="font-semibold text-foreground">{fmt(midPrice)}</span>
        <span className="ml-auto text-muted-foreground">Spread</span>
        <span className="text-amber-400">{fmt(midPrice * 0.0003)}</span>
      </div>

      {/* Bids */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {bids.map((row, i) => (
          <div key={i} className="relative flex items-center gap-2 px-3 py-0.5 hover:bg-white/3">
            <div className="absolute inset-y-0 right-0 bg-emerald-500/8" style={{ width: `${(row.total / maxTotal) * 100}%` }} />
            <span className="flex-1 text-emerald-400 relative">{fmt(row.price)}</span>
            <span className="w-16 text-right text-foreground/70 relative">{row.size.toLocaleString()}</span>
            <span className="w-16 text-right text-muted-foreground relative">{row.total.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
