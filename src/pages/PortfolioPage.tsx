import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, TrendingUp, TrendingDown, Loader2, AlertCircle, RefreshCw, Search, X, BarChart2, ShoppingCart, ArrowDownLeft } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { useAccount } from "@/hooks/useAccount"
import { useSimulation } from "@/lib/SimulationContext"
import type { StockSummary, ForexPairSummary } from "@/lib/SimulationContext"
import type { Route } from "@/App"

interface Position { id: number; asset_type: string; symbol: string; quantity: number; avg_cost: number; opened_at: string }
interface Order { id: number; asset_type: string; symbol: string; side: "buy" | "sell"; quantity: number; price: number; total: number; notes: string | null; executed_at: string }
interface Portfolio { id: number; name: string; description: string | null; cash_balance: number; positions: Position[]; recentOrders: Order[] }
interface Snapshot { total_value: number; snapped_at: string }

interface Props { portfolioId: number; onNavigate: (r: Route) => void }

function fmt(n: number) { return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }) }
function fmtSmall(n: number) { return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) }
function pct(n: number) { const s = n >= 0 ? "+" : ""; return `${s}${n.toFixed(2)}%` }
function rsiColor(rsi: number) {
  if (rsi >= 70) return "text-red-500"
  if (rsi <= 30) return "text-emerald-500"
  return "text-yellow-500"
}

// ── RSI mini gauge ────────────────────────────────────────────────────────────
function RsiGauge({ rsi }: { rsi: number }) {
  const pctPos = Math.max(0, Math.min(100, rsi))
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 w-full rounded-full" />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/80 rounded-full"
          style={{ left: `${pctPos}%`, transform: "translateX(-50%)" }}
        />
      </div>
      <span className={`text-xs font-medium tabular-nums ${rsiColor(rsi)}`}>{rsi.toFixed(0)}</span>
    </div>
  )
}

// ── Symbol search autocomplete ─────────────────────────────────────────────────
interface SearchResult { symbol: string; name: string; price: number; change: number; changePct: number; asset_type: string; sector?: string; rsi: number; hi52w: number; lo52w: number }

function SymbolSearch({
  assetType, onSelect,
}: {
  assetType: string
  onSelect: (r: SearchResult) => void
}) {
  const { stocks, forexPairs } = useSimulation()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toUpperCase()
    if (!q) return []

    if (assetType === "stock") {
      return Object.entries(stocks)
        .filter(([ticker, s]) => ticker.includes(q) || s.name.toUpperCase().includes(q))
        .slice(0, 8)
        .map(([ticker, s]) => ({
          symbol: ticker, name: s.name, price: s.price,
          change: s.change, changePct: s.change, asset_type: "stock",
          sector: s.sector, rsi: s.rsi, hi52w: s.hi52w, lo52w: s.lo52w,
        }))
    }

    return Object.entries(forexPairs)
      .filter(([pair]) => pair.includes(q))
      .slice(0, 8)
      .map(([pair, p]) => ({
        symbol: pair, name: `${p.baseName} / ${p.quoteName}`, price: p.price,
        change: p.changePct, changePct: p.changePct, asset_type: "forex",
        rsi: p.rsi, hi52w: p.hi52w, lo52w: p.lo52w,
      }))
  }, [query, assetType, stocks, forexPairs])

  function pick(r: SearchResult) {
    onSelect(r)
    setQuery(r.symbol)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={assetType === "forex" ? "Search e.g. EUR/USD" : "Search e.g. AAPL"}
          value={query}
          onChange={e => { setQuery(e.target.value.toUpperCase()); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="h-8 text-sm pl-8 pr-7 font-mono"
          maxLength={16}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear symbol"
            onClick={() => { setQuery(""); setOpen(false); onSelect({ symbol: "", name: "", price: 0, change: 0, changePct: 0, asset_type: assetType, rsi: 50, hi52w: 0, lo52w: 0 }) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0 p-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {results.map(r => (
            <button
              key={r.symbol}
              type="button"
              onClick={() => pick(r)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/60 cursor-pointer bg-transparent border-0 text-left transition-colors"
            >
              <div className="min-w-0">
                <span className="font-mono text-sm font-semibold">{r.symbol}</span>
                <span className="ml-2 text-xs text-muted-foreground truncate">{r.name}</span>
              </div>
              <div className="text-right shrink-0 ml-2">
                <span className="text-sm tabular-nums">{fmt(r.price)}</span>
                <span className={`ml-2 text-xs ${r.changePct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {r.changePct >= 0 ? "+" : ""}{r.changePct.toFixed(2)}%
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Selected symbol context card ───────────────────────────────────────────────
function SymbolContextCard({ result }: { result: SearchResult }) {
  const rangePct = result.hi52w > result.lo52w
    ? ((result.price - result.lo52w) / (result.hi52w - result.lo52w)) * 100
    : 50

  return (
    <div className="rounded-md bg-muted/40 p-2.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-bold">{result.symbol}</p>
          <p className="text-xs text-muted-foreground">{result.name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums">{fmt(result.price)}</p>
          <p className={`text-xs font-medium ${result.changePct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {result.changePct >= 0 ? "+" : ""}{result.changePct.toFixed(2)}%
          </p>
        </div>
      </div>
      {result.sector && (
        <Badge variant="secondary" className="text-[10px]">{result.sector}</Badge>
      )}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">RSI</span>
        <RsiGauge rsi={result.rsi} />
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
          <span>52w Lo {fmt(result.lo52w)}</span>
          <span>52w Hi {fmt(result.hi52w)}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-foreground/30 rounded-full relative">
            <div
              className="absolute top-0 bottom-0 w-1.5 h-1.5 bg-foreground rounded-full -translate-y-0 shadow"
              style={{ left: `${Math.max(0, Math.min(100, rangePct))}%`, transform: "translateX(-50%)" }}
            />
          </div>
          <div className="h-full bg-foreground/40 rounded-full" style={{ width: `${Math.max(0, Math.min(100, rangePct))}%` }} />
        </div>
      </div>
    </div>
  )
}

// ── Trade stats panel ──────────────────────────────────────────────────────────
function TradeStats({ orders }: { orders: Order[] }) {
  const buys = orders.filter(o => o.side === "buy")
  const sells = orders.filter(o => o.side === "sell")
  const totalVolume = orders.reduce((s, o) => s + o.total, 0)
  const sellProceeds = sells.reduce((s, o) => s + o.total, 0)
  const sellCost = sells.reduce((s, o) => s + o.price * o.quantity, 0)
  const realisedPnl = sellProceeds - sellCost

  if (!orders.length) return null

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5" />
          Trade Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {[
          { label: "Total Trades", value: String(orders.length) },
          { label: "Buys", value: String(buys.length), icon: <ShoppingCart className="w-3 h-3 text-emerald-500" /> },
          { label: "Sells", value: String(sells.length), icon: <ArrowDownLeft className="w-3 h-3 text-red-500" /> },
          { label: "Total Volume", value: fmtSmall(totalVolume) },
          { label: "Realised P&L", value: fmt(realisedPnl), color: realisedPnl >= 0 ? "text-emerald-600" : "text-red-500" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {icon}{label}
            </span>
            <span className={`text-xs font-semibold tabular-nums ${color ?? ""}`}>{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ── Portfolio value chart ──────────────────────────────────────────────────────
function PortfolioChart({ portfolioId, currentValue }: { portfolioId: number; currentValue: number }) {
  const { getPortfolioSnapshots } = useAccount()
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])

  useEffect(() => {
    getPortfolioSnapshots(portfolioId)
      .then((rows: Snapshot[]) => setSnapshots(rows))
      .catch(() => {})
  }, [portfolioId, getPortfolioSnapshots])

  const data = useMemo(() => {
    const points = snapshots.map(s => ({
      date: new Date(s.snapped_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: s.total_value,
    }))
    // Always include current value as the latest point
    if (!points.length || points[points.length - 1]?.value !== currentValue) {
      points.push({ date: "Now", value: currentValue })
    }
    return points
  }, [snapshots, currentValue])

  if (data.length < 2) return null

  const minV = Math.min(...data.map(d => d.value))
  const maxV = Math.max(...data.map(d => d.value))
  const isUp = data[data.length - 1].value >= data[0].value

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Portfolio Value History</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis
                domain={[minV * 0.998, maxV * 1.002]}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                width={40}
              />
              <Tooltip
                formatter={(v) => [fmt(v as number), "Value"]}
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isUp ? "#10b981" : "#ef4444"}
                strokeWidth={1.5}
                fill="url(#portfolioGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function PortfolioPage({ portfolioId, onNavigate }: Props) {
  const { getPortfolio, placeOrder, getOrders } = useAccount()
  const { stocks, forexPairs } = useSimulation()

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Order form state
  const [assetType, setAssetType] = useState("stock")
  const [selectedSymbol, setSelectedSymbol] = useState<SearchResult | null>(null)
  const [side, setSide] = useState<"buy" | "sell">("buy")
  const [quantity, setQuantity] = useState("")
  const [orderNotes, setOrderNotes] = useState("")
  const [placing, setPlacing] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!portfolioId) return
    try {
      const [p, o] = await Promise.all([
        getPortfolio(portfolioId),
        getOrders(portfolioId, { limit: 50 } as never),
      ])
      setPortfolio(p)
      setOrders(o.orders ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load portfolio")
    } finally {
      setLoading(false)
    }
  }, [portfolioId, getPortfolio, getOrders])

  useEffect(() => { load() }, [load])

  function getCurrentPrice(asset_type: string, sym: string): number | null {
    if (asset_type === "stock") return stocks[sym]?.price ?? null
    if (asset_type === "forex") return forexPairs[sym]?.price ?? null
    return null
  }

  function getPositionValue(pos: Position): number {
    const price = getCurrentPrice(pos.asset_type, pos.symbol)
    return price !== null ? price * pos.quantity : pos.avg_cost * pos.quantity
  }

  function getUnrealizedPnl(pos: Position): number {
    const price = getCurrentPrice(pos.asset_type, pos.symbol)
    if (price === null) return 0
    return (price - pos.avg_cost) * pos.quantity
  }

  const totalPositionsValue = portfolio?.positions.reduce((sum, p) => sum + getPositionValue(p), 0) ?? 0
  const totalValue = (portfolio?.cash_balance ?? 0) + totalPositionsValue
  const totalPnl = portfolio?.positions.reduce((sum, p) => sum + getUnrealizedPnl(p), 0) ?? 0

  const currentSelectedPrice = selectedSymbol?.symbol
    ? getCurrentPrice(assetType, selectedSymbol.symbol) ?? selectedSymbol.price
    : null
  const previewCost = currentSelectedPrice && quantity ? currentSelectedPrice * parseFloat(quantity) : null

  // Keep live price in the selected symbol context
  const liveSelectedResult: SearchResult | null = selectedSymbol ? {
    ...selectedSymbol,
    price: currentSelectedPrice ?? selectedSymbol.price,
  } : null

  async function handlePlaceOrder() {
    if (!selectedSymbol?.symbol || !quantity || !portfolioId) return
    setPlacing(true)
    setOrderError(null)
    setOrderSuccess(null)
    try {
      const result = await placeOrder(portfolioId, {
        asset_type: assetType,
        symbol: selectedSymbol.symbol,
        side,
        quantity: parseFloat(quantity),
        notes: orderNotes || undefined,
      })
      setPortfolio(result.portfolio ? { ...result.portfolio, positions: portfolio?.positions ?? [], recentOrders: portfolio?.recentOrders ?? [] } : portfolio)
      setOrderSuccess(`${side === "buy" ? "Bought" : "Sold"} ${quantity} ${selectedSymbol.symbol} @ ${fmt(result.executedPrice)}`)
      setSelectedSymbol(null)
      setQuantity("")
      setOrderNotes("")
      await load()
    } catch (e: unknown) {
      setOrderError(e instanceof Error ? e.message : "Order failed")
    } finally {
      setPlacing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !portfolio) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-12">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error ?? "Portfolio not found"}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onNavigate("dashboard")} className="mt-4 gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => onNavigate("dashboard")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2 bg-transparent border-0 p-0 cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" /> Dashboard
          </button>
          <h1 className="text-2xl font-bold text-foreground">{portfolio.name}</h1>
          {portfolio.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{portfolio.description}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={load} title="Refresh" className="h-8 w-8 shrink-0">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Value", value: fmt(totalValue) },
          { label: "Available Cash", value: fmt(portfolio.cash_balance) },
          { label: "Invested", value: fmt(totalPositionsValue) },
          {
            label: "Unrealised P&L",
            value: fmt(totalPnl),
            color: totalPnl >= 0 ? "text-emerald-600" : "text-red-500",
          },
        ].map(({ label, value, color }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={`text-xl font-bold ${color ?? "text-foreground"}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Portfolio value chart */}
      <PortfolioChart portfolioId={portfolioId} currentValue={totalValue} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: positions + orders */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="positions">
            <TabsList className="mb-4">
              <TabsTrigger value="positions">Positions ({portfolio.positions.length})</TabsTrigger>
              <TabsTrigger value="orders">Order History</TabsTrigger>
            </TabsList>

            <TabsContent value="positions">
              {portfolio.positions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">No open positions.</p>
                  <p className="text-xs mt-1">Use the order form to make your first trade.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {portfolio.positions.map(pos => {
                    const currentPrice = getCurrentPrice(pos.asset_type, pos.symbol)
                    const pnl = getUnrealizedPnl(pos)
                    const pnlPct = pos.avg_cost > 0 ? (pnl / (pos.avg_cost * pos.quantity)) * 100 : 0
                    const stockData: StockSummary | undefined = pos.asset_type === "stock" ? stocks[pos.symbol] : undefined
                    const forexData: ForexPairSummary | undefined = pos.asset_type === "forex" ? forexPairs[pos.symbol] : undefined
                    const rsi = stockData?.rsi ?? forexData?.rsi
                    const sector = stockData?.sector

                    return (
                      <Card key={pos.id} className="bg-card border-border">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm font-mono">{pos.symbol}</span>
                                <Badge variant="outline" className="text-[10px]">{pos.asset_type}</Badge>
                                {sector && <Badge variant="secondary" className="text-[10px]">{sector}</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {pos.quantity} shares @ {fmt(pos.avg_cost)} &middot; cost {fmt(pos.avg_cost * pos.quantity)}
                              </p>
                              {rsi !== undefined && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  RSI <RsiGauge rsi={rsi} />
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold tabular-nums">{currentPrice ? fmt(currentPrice) : "-"}</p>
                              <p className={`text-xs font-medium tabular-nums ${pnl >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                {pnl >= 0 ? <TrendingUp className="inline w-3 h-3 mr-0.5" /> : <TrendingDown className="inline w-3 h-3 mr-0.5" />}
                                {fmt(pnl)} ({pct(pnlPct)})
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="orders">
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No orders yet.</p>
              ) : (
                <div className="space-y-2">
                  {orders.map(o => (
                    <Card key={o.id} className="bg-card border-border">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge
                              className={`text-[10px] shrink-0 ${o.side === "buy" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20"}`}
                              variant="outline"
                            >
                              {o.side.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] shrink-0">{o.asset_type}</Badge>
                            <span className="font-mono font-medium text-sm truncate">{o.symbol}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{o.quantity} @ {fmt(o.price)}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold tabular-nums">{fmt(o.total)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(o.executed_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {o.notes && <p className="text-xs text-muted-foreground mt-1.5 pl-1 italic">{o.notes}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: order form + stats */}
        <div className="space-y-4">
          <Card className="bg-card border-border sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Place Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">

              {/* Asset type */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Asset Type</label>
                <Select value={assetType} onValueChange={v => { setAssetType(v); setSelectedSymbol(null) }}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">Stock</SelectItem>
                    <SelectItem value="forex">Forex</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Symbol search */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Symbol</label>
                <SymbolSearch
                  assetType={assetType}
                  onSelect={r => setSelectedSymbol(r.symbol ? r : null)}
                />
              </div>

              {/* Context card when symbol selected */}
              {liveSelectedResult && liveSelectedResult.symbol && (
                <SymbolContextCard result={liveSelectedResult} />
              )}

              {/* Side */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Side</label>
                <div className="flex gap-2">
                  {(["buy", "sell"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSide(s)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                        side === s
                          ? s === "buy"
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "bg-red-500 border-red-500 text-white"
                          : "bg-transparent border-border text-muted-foreground hover:border-foreground/30"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
                <Input
                  type="number"
                  placeholder="0"
                  min={0}
                  step="any"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              {/* Estimated cost */}
              {previewCost !== null && selectedSymbol?.symbol && (
                <div className="rounded-md bg-muted/40 px-3 py-2 flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Estimated {side === "buy" ? "Cost" : "Proceeds"}</span>
                  <span>{fmt(previewCost)}</span>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</label>
                <Input
                  placeholder="Trade rationale..."
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  className="h-8 text-sm"
                  maxLength={500}
                />
              </div>

              {orderError && <p className="text-xs text-destructive">{orderError}</p>}
              {orderSuccess && <p className="text-xs text-emerald-600">{orderSuccess}</p>}

              <Button
                className="w-full"
                disabled={placing || !selectedSymbol?.symbol || !quantity || parseFloat(quantity) <= 0}
                onClick={handlePlaceOrder}
              >
                {placing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `Execute ${side === "buy" ? "Buy" : "Sell"}`}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center">
                Prices are simulated. No real money involved.
              </p>
            </CardContent>
          </Card>

          {/* Trade stats */}
          <TradeStats orders={orders} />
        </div>
      </div>
    </div>
  )
}
