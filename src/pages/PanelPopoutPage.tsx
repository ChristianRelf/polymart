import { useEffect, useMemo } from "react"
import { OrderBookPanel } from "@/components/trading/panels/OrderBookPanel"
import { TimeSalesPanel } from "@/components/trading/panels/TimeSalesPanel"
import { HeatmapPanel } from "@/components/trading/panels/HeatmapPanel"
import { ScannerPanel } from "@/components/trading/panels/ScannerPanel"
import { DomLadderPanel } from "@/components/trading/panels/DomLadderPanel"
import { NewsPanel } from "@/components/trading/panels/NewsPanel"
import { CalendarPanel } from "@/components/trading/panels/CalendarPanel"
import type { PanelType } from "@/components/trading/types"

const TITLES: Partial<Record<PanelType, string>> = {
  orderbook: "Order Book",
  timesales: "Time & Sales",
  heatmap:   "Heatmap",
  scanner:   "Scanner",
  domladder: "DOM Ladder",
  news:      "News",
  calendar:  "Calendar",
}

function getPopoutParams(): { panelType: PanelType | null; symbol: string; assetType: "stock" | "forex" | "crypto" } {
  const hash = window.location.hash.slice(1)
  const match = hash.match(/^\/popout\/([a-z]+)(.*)?$/)
  if (!match) return { panelType: null, symbol: "", assetType: "stock" }
  const qs = (match[2] ?? "").replace(/^\?/, "")
  const p = new URLSearchParams(qs)
  return {
    panelType: match[1] as PanelType,
    symbol:    p.get("symbol") ?? "",
    assetType: (p.get("assetType") ?? "stock") as "stock" | "forex" | "crypto",
  }
}

export function PanelPopoutPage() {
  const { panelType, symbol, assetType } = useMemo(() => getPopoutParams(), [])

  useEffect(() => {
    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    return () => {
      document.documentElement.style.overflow = ""
      document.body.style.overflow = ""
    }
  }, [])

  function renderContent() {
    switch (panelType) {
      case "orderbook":  return <OrderBookPanel symbol={symbol} assetType={assetType} />
      case "timesales":  return <TimeSalesPanel symbol={symbol} assetType={assetType} />
      case "domladder":  return <DomLadderPanel symbol={symbol} assetType={assetType} />
      case "heatmap":    return <HeatmapPanel />
      case "scanner":    return <ScannerPanel onSymbolSelect={() => {}} />
      case "news":       return <NewsPanel />
      case "calendar":   return <CalendarPanel />
      default: return (
        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
          Panel not available as popout
        </div>
      )
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[oklch(0.13_0.004_264)] text-foreground">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-[oklch(0.16_0.004_264)] shrink-0">
        {symbol && (
          <span className="font-mono text-sm font-bold">{symbol}</span>
        )}
        <span className="text-xs text-muted-foreground">
          {TITLES[panelType ?? "orderbook"] ?? panelType}
        </span>
        <button
          type="button"
          onClick={() => window.close()}
          className="ml-auto text-xs px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors bg-transparent border-0 cursor-pointer"
        >
          Close ×
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  )
}
