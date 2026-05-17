import { useState, useEffect, useCallback } from "react"
import { useUser } from "@clerk/clerk-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, TrendingUp, TrendingDown, Wallet, Star, Loader2, AlertCircle, Eye, Trash2 } from "lucide-react"
import { useAccount } from "@/hooks/useAccount"
import { useSimulation } from "@/lib/SimulationContext"
import type { Route } from "@/App"

interface PositionSymbol { symbol: string; asset_type: string }

interface Portfolio {
  id: number
  name: string
  description: string | null
  cash_balance: number
  position_count: number
  position_symbols: PositionSymbol[]
  created_at: string
}

interface WatchlistItem { asset_type: string; symbol: string }
interface Watchlist { id: number; name: string; items: WatchlistItem[] }

interface UserProfile {
  display_name: string | null
  email: string | null
  tier: "basic" | "premium"
  tierLimits: { label: string; maxPortfolios: number; maxPositions: number; startingCash: number }
}

interface Props {
  onNavigate: (r: Route) => void
  onNavigateToPortfolio: (id: number) => void
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
}

function fearGreedColor(score: number) {
  if (score <= 25) return "text-red-500"
  if (score <= 45) return "text-orange-500"
  if (score <= 55) return "text-yellow-500"
  if (score <= 75) return "text-lime-500"
  return "text-emerald-500"
}

function sessionBadge(session: string) {
  switch (session?.toLowerCase()) {
    case "open":      return { label: "Open", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" }
    case "pre":       return { label: "Pre-market", cls: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" }
    case "after":     return { label: "After-hours", cls: "bg-orange-500/10 text-orange-600 border-orange-500/20" }
    default:          return { label: "Closed", cls: "bg-muted text-muted-foreground border-border" }
  }
}

// ── Market Pulse Bar ──────────────────────────────────────────────────────────
function MarketPulseBar() {
  const { market } = useSimulation()
  if (!market) return null

  const badge = sessionBadge(market.marketSession)
  const idxUp = market.indexChangePct >= 0
  const fgColor = fearGreedColor(market.fearGreed)

  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {/* Session */}
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${badge.cls}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {badge.label}
      </span>

      {/* Index */}
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground text-xs">Index</span>
        <span className="font-semibold">{market.index.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
        <span className={`text-xs font-medium ${idxUp ? "text-emerald-600" : "text-red-500"}`}>
          {idxUp ? "+" : ""}{market.indexChangePct.toFixed(2)}%
        </span>
      </div>

      {/* Fear & Greed */}
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground text-xs">Fear &amp; Greed</span>
        <span className={`font-semibold ${fgColor}`}>{market.fearGreed}</span>
        <span className="text-xs text-muted-foreground">{market.fearGreedLabel}</span>
      </div>

      {/* VIX */}
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground text-xs">VIX</span>
        <span className="font-semibold">{market.vix.toFixed(1)}</span>
      </div>

      {/* Top gainer */}
      {market.topGainer && (
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="font-mono text-xs font-semibold">{market.topGainer.ticker}</span>
          <span className="text-xs text-emerald-600">+{market.topGainer.pct.toFixed(2)}%</span>
        </div>
      )}

      {/* Top loser */}
      {market.topLoser && (
        <div className="flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span className="font-mono text-xs font-semibold">{market.topLoser.ticker}</span>
          <span className="text-xs text-red-500">{market.topLoser.pct.toFixed(2)}%</span>
        </div>
      )}

      {/* Advancers / decliners */}
      <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="text-emerald-600 font-medium">{market.gainers} up</span>
        <span>/</span>
        <span className="text-red-500 font-medium">{market.losers} down</span>
      </div>
    </div>
  )
}

// ── Watchlist widget ──────────────────────────────────────────────────────────
function WatchlistWidget() {
  const { stocks, forexPairs } = useSimulation()
  const { getWatchlists } = useAccount()
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWatchlists()
      .then(setWatchlists)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [getWatchlists])

  const allItems = watchlists.flatMap(wl => wl.items)
  if (loading) return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading watchlist...
    </div>
  )
  if (!allItems.length) return null

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">Watchlist</h2>
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {allItems.map(item => {
              const isStock = item.asset_type === "stock"
              const data = isStock ? stocks[item.symbol] : forexPairs[item.symbol]
              const price = data?.price ?? null
              const pct = isStock
                ? (data as typeof stocks[string] | undefined)?.change ?? null
                : (data as typeof forexPairs[string] | undefined)?.changePct ?? null

              return (
                <div key={`${item.asset_type}:${item.symbol}`} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-sm font-semibold truncate">{item.symbol}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {isStock ? "Stock" : "Forex"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-medium tabular-nums">
                      {price !== null ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: isStock ? 2 : 4 }) : "-"}
                    </span>
                    {pct !== null && (
                      <span className={`text-xs font-medium tabular-nums w-16 text-right ${pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Portfolio card ─────────────────────────────────────────────────────────────
function PortfolioCard({
  p, onOpen, onDelete,
}: {
  p: Portfolio
  onOpen: () => void
  onDelete: () => void
}) {
  const { stocks, forexPairs } = useSimulation()

  // Estimated total from positions_preview symbols (may be partial)
  const positionEstimate = (p.position_symbols ?? []).reduce((sum, pos) => {
    const price = pos.asset_type === "stock"
      ? (stocks[pos.symbol]?.price ?? 0)
      : (forexPairs[pos.symbol]?.price ?? 0)
    return sum + price
  }, 0)

  const hasPositions = p.position_count > 0

  return (
    <Card
      className="border-border bg-card hover:border-foreground/20 transition-colors cursor-pointer group"
      onClick={onOpen}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center justify-between gap-2">
          <span className="truncate">{p.name}</span>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {p.position_count} position{p.position_count !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
        {p.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="mb-3">
          <p className="text-2xl font-bold text-foreground tabular-nums">{fmt(p.cash_balance)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Available cash</p>
        </div>

        {/* Position symbol badges */}
        {hasPositions && p.position_symbols?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {p.position_symbols.map(pos => (
              <span
                key={`${pos.asset_type}:${pos.symbol}`}
                className="font-mono text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded"
              >
                {pos.symbol}
              </span>
            ))}
            {p.position_count > (p.position_symbols?.length ?? 0) && (
              <span className="text-[10px] text-muted-foreground px-1 py-0.5">
                +{p.position_count - (p.position_symbols?.length ?? 0)} more
              </span>
            )}
          </div>
        )}

        {!hasPositions && (
          <p className="text-xs text-muted-foreground mb-3">
            Start with {fmt(p.cash_balance)} - make your first trade
          </p>
        )}

        <div className="flex items-center gap-2 mt-2">
          <Button
            size="sm"
            className="gap-1.5 text-xs h-7 flex-1"
            onClick={e => { e.stopPropagation(); onOpen() }}
          >
            <Eye className="w-3 h-3" />
            Open
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
            onClick={e => { e.stopPropagation(); onDelete() }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function DashboardPage({ onNavigate, onNavigateToPortfolio }: Props) {
  const { user } = useUser()
  const { getMe, getPortfolios, createPortfolio, deletePortfolio } = useAccount()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<Portfolio | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      const [me, plist] = await Promise.all([getMe(), getPortfolios()])
      setProfile(me)
      setPortfolios(plist)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }, [getMe, getPortfolios])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const p = await createPortfolio({ name: newName.trim(), description: newDesc.trim() || undefined })
      setPortfolios(prev => [...prev, { ...p, position_count: 0, position_symbols: [] }])
      setCreateOpen(false)
      setNewName("")
      setNewDesc("")
      onNavigateToPortfolio(p.id)
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Failed to create portfolio")
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deletePortfolio(deleteTarget.id)
      setPortfolios(prev => prev.filter(p => p.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete portfolio")
    } finally {
      setDeleting(false)
    }
  }

  const atLimit = profile ? portfolios.length >= profile.tierLimits.maxPortfolios : false

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-12">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back{profile?.display_name ? `, ${profile.display_name}` : user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Paper trading dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={profile?.tier === "premium" ? "default" : "secondary"} className="text-xs">
            {profile?.tierLimits.label ?? "Basic"}
          </Badge>
          {profile?.tier === "basic" && (
            <Button size="sm" variant="outline" onClick={() => onNavigate("account")} className="text-xs h-7">
              Upgrade
            </Button>
          )}
        </div>
      </div>

      {/* Market Pulse Bar */}
      <MarketPulseBar />

      {/* Tier stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Portfolios", value: `${portfolios.length} / ${profile?.tierLimits.maxPortfolios ?? 1}`, icon: Wallet },
          { label: "Starting Cash", value: fmt(profile?.tierLimits.startingCash ?? 10000), icon: TrendingUp },
          { label: "Max Positions", value: String(profile?.tierLimits.maxPositions ?? 10), icon: Star },
          { label: "Plan", value: profile?.tierLimits.label ?? "Basic", icon: TrendingDown },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs">{label}</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Portfolios */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Portfolios</h2>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            disabled={atLimit}
            title={atLimit ? `Plan limit: ${profile?.tierLimits.maxPortfolios} portfolio(s). Upgrade for more.` : undefined}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Portfolio
          </Button>
        </div>

        {portfolios.length === 0 ? (
          <Card className="border-dashed border-border bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <Wallet className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No portfolios yet. Create one to start paper trading.</p>
              <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Create Portfolio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolios.map(p => (
              <PortfolioCard
                key={p.id}
                p={p}
                onOpen={() => onNavigateToPortfolio(p.id)}
                onDelete={() => setDeleteTarget(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Watchlist widget */}
      <WatchlistWidget />

      {/* Create portfolio dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Portfolio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Portfolio name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              maxLength={128}
              autoFocus
            />
            <Input
              placeholder="Description (optional)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              maxLength={256}
            />
            {createError && <p className="text-xs text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Portfolio</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? All positions and order history will be permanently removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
