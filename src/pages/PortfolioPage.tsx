import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, TrendingUp, TrendingDown, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { useAccount } from "@/hooks/useAccount"
import { useSimulation } from "@/lib/SimulationContext"
import type { Route } from "@/App"

interface Position {
  id: number
  asset_type: string
  symbol: string
  quantity: number
  avg_cost: number
  opened_at: string
}

interface Order {
  id: number
  asset_type: string
  symbol: string
  side: "buy" | "sell"
  quantity: number
  price: number
  total: number
  notes: string | null
  executed_at: string
}

interface Portfolio {
  id: number
  name: string
  description: string | null
  cash_balance: number
  positions: Position[]
  recentOrders: Order[]
}

interface Props {
  portfolioId: number
  onNavigate: (r: Route) => void
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
}

function pct(n: number) {
  const sign = n >= 0 ? "+" : ""
  return `${sign}${n.toFixed(2)}%`
}

export default function PortfolioPage({ portfolioId, onNavigate }: Props) {
  const { getPortfolio, placeOrder, getOrders } = useAccount()
  const { stocks, forexPairs } = useSimulation()

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Order form state
  const [assetType, setAssetType] = useState("stock")
  const [symbol, setSymbol] = useState("")
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

  const previewPrice = getCurrentPrice(assetType, symbol.toUpperCase())
  const previewCost = previewPrice && quantity ? previewPrice * parseFloat(quantity) : null

  async function handlePlaceOrder() {
    if (!symbol || !quantity || !portfolioId) return
    setPlacing(true)
    setOrderError(null)
    setOrderSuccess(null)
    try {
      const result = await placeOrder(portfolioId, {
        asset_type: assetType,
        symbol: symbol.toUpperCase(),
        side,
        quantity: parseFloat(quantity),
        notes: orderNotes || undefined,
      })
      setPortfolio(result.portfolio ? { ...result.portfolio, positions: portfolio?.positions ?? [], recentOrders: portfolio?.recentOrders ?? [] } : portfolio)
      setOrderSuccess(`${side === "buy" ? "Bought" : "Sold"} ${quantity} ${symbol.toUpperCase()} @ ${fmt(result.executedPrice)}`)
      setSymbol("")
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Total Value</p>
            <p className="text-xl font-bold text-foreground">{fmt(totalValue)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Cash</p>
            <p className="text-xl font-bold text-foreground">{fmt(portfolio.cash_balance)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border col-span-2 sm:col-span-1">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Invested</p>
            <p className="text-xl font-bold text-foreground">{fmt(totalPositionsValue)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: tabs for positions + orders */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="positions">
            <TabsList className="mb-4">
              <TabsTrigger value="positions">Positions ({portfolio.positions.length})</TabsTrigger>
              <TabsTrigger value="orders">Order History</TabsTrigger>
            </TabsList>

            <TabsContent value="positions">
              {portfolio.positions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No open positions. Place your first trade using the order form.</p>
              ) : (
                <div className="space-y-2">
                  {portfolio.positions.map(pos => {
                    const currentPrice = getCurrentPrice(pos.asset_type, pos.symbol)
                    const pnl = getUnrealizedPnl(pos)
                    const pnlPct = pos.avg_cost > 0 ? (pnl / (pos.avg_cost * pos.quantity)) * 100 : 0
                    return (
                      <Card key={pos.id} className="bg-card border-border">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Badge variant="outline" className="text-[10px] shrink-0">{pos.asset_type}</Badge>
                              <span className="font-semibold text-sm truncate">{pos.symbol}</span>
                              <span className="text-xs text-muted-foreground shrink-0">{pos.quantity} @ {fmt(pos.avg_cost)}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold">{currentPrice ? fmt(currentPrice) : "—"}</p>
                              <p className={`text-xs ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
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
                              variant={o.side === "buy" ? "default" : "secondary"}
                              className="text-[10px] shrink-0"
                            >
                              {o.side.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] shrink-0">{o.asset_type}</Badge>
                            <span className="font-medium text-sm truncate">{o.symbol}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{o.quantity} @ {fmt(o.price)}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold">{fmt(o.total)}</p>
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

        {/* Right: order form */}
        <div>
          <Card className="bg-card border-border sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Place Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">

              {/* Asset type */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Asset Type</label>
                <Select value={assetType} onValueChange={v => { setAssetType(v); setSymbol("") }}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">Stock</SelectItem>
                    <SelectItem value="forex">Forex</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Symbol */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Symbol</label>
                <Input
                  placeholder={assetType === "forex" ? "e.g. EUR/USD" : "e.g. AAPL"}
                  value={symbol}
                  onChange={e => setSymbol(e.target.value.toUpperCase())}
                  className="h-8 text-sm uppercase"
                  maxLength={16}
                />
              </div>

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

              {/* Price preview */}
              {symbol && previewPrice && (
                <div className="rounded-md bg-muted/40 p-2.5 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Current Price</span>
                    <span>{fmt(previewPrice)}</span>
                  </div>
                  {previewCost && (
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Estimated {side === "buy" ? "Cost" : "Proceeds"}</span>
                      <span>{fmt(previewCost)}</span>
                    </div>
                  )}
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
              {orderSuccess && <p className="text-xs text-emerald-400">{orderSuccess}</p>}

              <Button
                className="w-full"
                disabled={placing || !symbol || !quantity || parseFloat(quantity) <= 0}
                onClick={handlePlaceOrder}
              >
                {placing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `Execute ${side === "buy" ? "Buy" : "Sell"}`}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center">
                Prices are simulated. No real money involved.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
