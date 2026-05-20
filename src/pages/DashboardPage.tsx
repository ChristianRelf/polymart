import { useState, useEffect, useCallback } from "react"
import { useUser } from "@clerk/clerk-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Plus, TrendingUp, TrendingDown, Wallet, Loader2, AlertCircle, Eye, Trash2,
  Trophy, Zap, Target, Flame, DollarSign, BarChart2, Users, CandlestickChart,
} from "lucide-react"
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
  total_value: number | null
  created_at: string
}

interface WatchlistItem { asset_type: string; symbol: string }
interface Watchlist { id: number; name: string; items: WatchlistItem[] }

interface UserProfile {
  display_name: string | null
  email: string | null
  tier: "basic" | "premium"
  tierLimits: { label: string; maxPortfolios: number; maxPositions: number; startingCash: number }
  created_at: string
}

interface AccountStats {
  total_value: number
  total_cash: number
  position_value: number
  unrealised_pnl: number
  total_orders: number
  created_at: string
}

interface Props {
  onNavigate: (r: Route) => void
  onNavigateToPortfolio: (id: number) => void
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
}

function fmtCompact(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toFixed(2)
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
    case "open":  return { label: "Open",        cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" }
    case "pre":   return { label: "Pre-market",  cls: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" }
    case "after": return { label: "After-hours", cls: "bg-orange-500/10 text-orange-600 border-orange-500/20" }
    default:      return { label: "Closed",      cls: "bg-muted text-muted-foreground border-border" }
  }
}

// ── Achievement definitions ───────────────────────────────────────────────────
interface Achievement {
  id: string
  icon: React.ReactNode
  label: string
  desc: string
  earned: (stats: AccountStats) => boolean
  color: string
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_trade",
    icon: <Target className="w-3.5 h-3.5" />,
    label: "First Trade",
    desc: "Executed your first trade",
    earned: s => s.total_orders >= 1,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "active_trader",
    icon: <Zap className="w-3.5 h-3.5" />,
    label: "Active Trader",
    desc: "10 trades placed",
    earned: s => s.total_orders >= 10,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "power_trader",
    icon: <Flame className="w-3.5 h-3.5" />,
    label: "Power Trader",
    desc: "50 trades placed",
    earned: s => s.total_orders >= 50,
    color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  },
  {
    id: "veteran",
    icon: <Trophy className="w-3.5 h-3.5" />,
    label: "Market Veteran",
    desc: "100 trades placed",
    earned: s => s.total_orders >= 100,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "in_profit",
    icon: <DollarSign className="w-3.5 h-3.5" />,
    label: "In the Green",
    desc: "Positive unrealised P&L",
    earned: s => s.unrealised_pnl > 0,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "diversified",
    icon: <BarChart2 className="w-3.5 h-3.5" />,
    label: "Diversified",
    desc: "Total portfolio value over starting cash 2x",
    earned: s => s.total_value > 0 && s.total_orders >= 5,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
]

// ── Market Pulse Bar ──────────────────────────────────────────────────────────
function MarketPulseBar() {
  const { market } = useSimulation()
  if (!market) return null
  const badge = sessionBadge(market.marketSession)
  const idxUp = market.indexChangePct >= 0
  const fgColor = fearGreedColor(market.fearGreed)

  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${badge.cls}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {badge.label}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground text-xs">Index</span>
        <span className="font-semibold">{market.index.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
        <span className={`text-xs font-medium ${idxUp ? "text-emerald-600" : "text-red-500"}`}>
          {idxUp ? "+" : ""}{market.indexChangePct.toFixed(2)}%
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground text-xs">Fear &amp; Greed</span>
        <span className={`font-semibold ${fgColor}`}>{market.fearGreed}</span>
        <span className="text-xs text-muted-foreground">{market.fearGreedLabel}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground text-xs">VIX</span>
        <span className="font-semibold">{market.vix.toFixed(1)}</span>
      </div>
      {market.topGainer && (
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="font-mono text-xs font-semibold">{market.topGainer.ticker}</span>
          <span className="text-xs text-emerald-600">+{market.topGainer.pct.toFixed(2)}%</span>
        </div>
      )}
      {market.topLoser && (
        <div className="flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span className="font-mono text-xs font-semibold">{market.topLoser.ticker}</span>
          <span className="text-xs text-red-500">{market.topLoser.pct.toFixed(2)}%</span>
        </div>
      )}
      <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="text-emerald-600 font-medium">{market.gainers} up</span>
        <span>/</span>
        <span className="text-red-500 font-medium">{market.losers} down</span>
      </div>
    </div>
  )
}

// ── Achievements strip ────────────────────────────────────────────────────────
function AchievementsStrip({ stats }: { stats: AccountStats }) {
  const earned = ACHIEVEMENTS.filter(a => a.earned(stats))
  const locked = ACHIEVEMENTS.filter(a => !a.earned(stats))
  if (earned.length === 0 && stats.total_orders === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-400" />
        Achievements
        <span className="text-xs text-muted-foreground font-normal">
          {earned.length}/{ACHIEVEMENTS.length} unlocked
        </span>
      </h2>
      <div className="flex flex-wrap gap-2">
        {earned.map(a => (
          <div
            key={a.id}
            title={a.desc}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border ${a.color}`}
          >
            {a.icon}
            {a.label}
          </div>
        ))}
        {locked.map(a => (
          <div
            key={a.id}
            title={`Locked: ${a.desc}`}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border border-border text-muted-foreground/40 opacity-40 select-none"
          >
            {a.icon}
            {a.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Overall stats strip ───────────────────────────────────────────────────────
function StatsStrip({ stats, startingCash }: { stats: AccountStats; startingCash: number }) {
  const totalPnl = stats.total_value - startingCash
  const pnlPct = startingCash > 0 ? (totalPnl / startingCash) * 100 : 0
  const pnlUp = totalPnl >= 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="bg-card border-border">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground mb-1">Total Portfolio Value</p>
          <p className="text-xl font-bold text-foreground tabular-nums">${fmtCompact(stats.total_value)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cash: ${fmtCompact(stats.total_cash)} · Positions: ${fmtCompact(stats.position_value)}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground mb-1">Total P&amp;L</p>
          <p className={`text-xl font-bold tabular-nums flex items-center gap-1 ${pnlUp ? "text-emerald-500" : "text-red-500"}`}>
            {pnlUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {pnlUp ? "+" : ""}{fmt(totalPnl)}
          </p>
          <p className={`text-xs mt-0.5 ${pnlUp ? "text-emerald-600" : "text-red-500"}`}>
            {pnlUp ? "+" : ""}{pnlPct.toFixed(2)}% vs starting cash
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground mb-1">Trades Placed</p>
          <p className="text-xl font-bold text-foreground">{stats.total_orders.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Lifetime order count</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground mb-1">Unrealised P&amp;L</p>
          <p className={`text-xl font-bold tabular-nums ${stats.unrealised_pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {stats.unrealised_pnl >= 0 ? "+" : ""}{fmt(stats.unrealised_pnl)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Open positions</p>
        </CardContent>
      </Card>
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
  p, onOpen, onDelete, startingCash,
}: {
  p: Portfolio
  onOpen: () => void
  onDelete: () => void
  startingCash: number
}) {
  const hasPositions = p.position_count > 0
  const totalValue = p.total_value !== null ? Number(p.total_value) : p.cash_balance
  const hasSnapshot = p.total_value !== null
  const pnl = totalValue - startingCash
  const pnlPct = startingCash > 0 ? (pnl / startingCash) * 100 : 0
  const pnlUp = pnl >= 0

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
        {/* Total value */}
        <div className="mb-2">
          <p className="text-2xl font-bold text-foreground tabular-nums">{fmt(totalValue)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasSnapshot ? "Total value" : "Starting cash"}
          </p>
        </div>

        {/* P&L vs starting cash */}
        {hasSnapshot && (
          <div className={`flex items-center gap-1 text-xs font-medium mb-3 ${pnlUp ? "text-emerald-500" : "text-red-500"}`}>
            {pnlUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {pnlUp ? "+" : ""}{fmt(pnl)} ({pnlUp ? "+" : ""}{pnlPct.toFixed(2)}%)
          </div>
        )}

        {/* Cash available */}
        {hasSnapshot && (
          <p className="text-xs text-muted-foreground mb-3">
            Cash: {fmt(p.cash_balance)}
          </p>
        )}

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

        {!hasPositions && !hasSnapshot && (
          <p className="text-xs text-muted-foreground mb-3">
            Make your first trade to start tracking P&amp;L
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
  const { getMe, getPortfolios, createPortfolio, deletePortfolio, getStats } = useAccount()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [stats, setStats] = useState<AccountStats | null>(null)
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
      const [me, plist, accountStats] = await Promise.all([
        getMe(),
        getPortfolios(),
        getStats().catch(() => null),
      ])
      setProfile(me)
      setPortfolios(plist)
      setStats(accountStats)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }, [getMe, getPortfolios, getStats])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const p = await createPortfolio({ name: newName.trim(), description: newDesc.trim() || undefined })
      setPortfolios(prev => [...prev, { ...p, position_count: 0, position_symbols: [], total_value: null }])
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
  const startingCash = profile?.tierLimits.startingCash ?? 10000

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

      {/* Stats strip - only when there's trading activity */}
      {stats && stats.total_orders > 0 && (
        <StatsStrip stats={stats} startingCash={startingCash} />
      )}

      {/* Achievements */}
      {stats && <AchievementsStrip stats={stats} />}

      {/* Trading Terminal CTA */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-gradient-to-r from-emerald-500/5 to-transparent cursor-pointer hover:border-emerald-500/30 transition-colors"
        onClick={() => onNavigate("trading-terminal")}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === "Enter" && onNavigate("trading-terminal")}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <CandlestickChart className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Trading Terminal</p>
            <p className="text-xs text-muted-foreground truncate">Charts, drawing tools, R:R calculator, trade journal — all in one place</p>
          </div>
        </div>
        <Button size="sm" className="text-xs h-7 shrink-0 bg-emerald-600 hover:bg-emerald-500" tabIndex={-1}>
          Open
        </Button>
      </div>

      {/* Community nudge */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-card cursor-pointer hover:border-foreground/20 transition-colors"
        onClick={() => onNavigate("community")}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === "Enter" && onNavigate("community")}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Community Feed is live</p>
            <p className="text-xs text-muted-foreground truncate">Share trades, analysis, and questions with other traders</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="text-xs h-7 shrink-0" tabIndex={-1}>
          View Feed
        </Button>
      </div>

      {/* Portfolios */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Portfolios
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {portfolios.length}/{profile?.tierLimits.maxPortfolios ?? 1}
            </span>
          </h2>
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
                startingCash={startingCash}
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
