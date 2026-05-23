import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, CheckCircle2 } from "lucide-react"
import { useAccount } from "@/hooks/useAccount"
import type { Route } from "@/App"

interface LeaderboardEntry {
  rank: number
  profile_id: string
  display_name: string | null
  avatar_url: string | null
  is_verified: boolean
  portfolio_name: string
  total_value: number
  position_count: number
  cash_balance: number
}

interface Props {
  onNavigate: (r: Route) => void
  onNavigateToProfile: (profileId: string) => void
}

const PAGE_SIZE = 50

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
}

function rankBadge(rank: number) {
  if (rank === 1) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
  if (rank === 2) return "bg-slate-400/20 text-slate-300 border-slate-400/30"
  if (rank === 3) return "bg-amber-700/20 text-amber-600 border-amber-700/30"
  return "bg-muted/40 text-muted-foreground border-border"
}

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  if (url) {
    return <img src={url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
  }
  const initials = (name ?? "?").slice(0, 2).toUpperCase()
  return (
    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
      {initials}
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b border-border last:border-0 animate-pulse">
      <div className="w-8 h-5 bg-muted rounded" />
      <div className="w-8 h-8 bg-muted rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-muted rounded w-32" />
        <div className="h-2.5 bg-muted rounded w-20" />
      </div>
      <div className="h-4 bg-muted rounded w-24" />
    </div>
  )
}

export default function LeaderboardPage({ onNavigateToProfile }: Props) {
  const { getLeaderboard } = useAccount()

  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (off: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getLeaderboard(PAGE_SIZE, off)
      setEntries(data.entries ?? [])
      setTotal(data.total ?? 0)
      setOffset(off)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load leaderboard")
    } finally {
      setLoading(false)
    }
  }, [getLeaderboard])

  useEffect(() => { load(0) }, [load])

  const totalPages  = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const topValue    = entries[0]?.total_value ?? null

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-8 space-y-6">

      {/* Hero header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Community Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Paper-trading rankings by total portfolio value across the Polymart community.
          </p>
        </div>
      </div>

      {/* Stats strip */}
      {!loading && !error && total > 0 && (
        <div className="flex flex-wrap gap-4">
          <div className="rounded-lg bg-muted/30 border border-border px-4 py-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Participants</p>
            <p className="text-lg font-bold tabular-nums">{total.toLocaleString()}</p>
          </div>
          {topValue !== null && (
            <div className="rounded-lg bg-muted/30 border border-border px-4 py-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Top Portfolio</p>
              <p className="text-lg font-bold tabular-nums text-emerald-400">{fmt(topValue)}</p>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <Card className="bg-card border-border">
        {/* Header row */}
        <div className="hidden sm:grid grid-cols-[3rem_1fr_1fr_9rem_6rem_9rem] gap-2 px-6 py-2.5 border-b border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Rank</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">User</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Portfolio</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide text-right">Total Value</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide text-right">Positions</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide text-right">Cash</p>
        </div>

        <CardContent className="p-0">
          {loading && (
            <div>
              {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          )}

          {!loading && error && (
            <div className="py-12 text-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="py-16 text-center">
              <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No entries yet. Start paper trading to appear here.</p>
            </div>
          )}

          {!loading && !error && entries.map(entry => (
            <div
              key={entry.profile_id}
              className="flex items-center gap-3 sm:grid sm:grid-cols-[3rem_1fr_1fr_9rem_6rem_9rem] sm:gap-2 px-6 py-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
            >
              {/* Rank */}
              <Badge
                variant="outline"
                className={`w-8 h-6 justify-center shrink-0 text-xs font-bold ${rankBadge(entry.rank)}`}
              >
                {entry.rank}
              </Badge>

              {/* User */}
              <div className="flex items-center gap-2 min-w-0">
                <Avatar url={entry.avatar_url} name={entry.display_name} />
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onNavigateToProfile(entry.profile_id)}
                    className="text-sm font-medium text-foreground hover:underline cursor-pointer bg-transparent border-0 p-0 truncate block max-w-[140px] sm:max-w-none text-left"
                  >
                    {entry.display_name ?? "Anonymous"}
                  </button>
                  {entry.is_verified && (
                    <span className="flex items-center gap-0.5 text-[10px] text-emerald-400">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Portfolio name */}
              <p className="hidden sm:block text-sm text-muted-foreground truncate">{entry.portfolio_name}</p>

              {/* Total value */}
              <p className="ml-auto sm:ml-0 text-right text-sm font-mono font-semibold text-emerald-400">
                {fmt(entry.total_value)}
              </p>

              {/* Positions */}
              <p className="hidden sm:block text-right text-sm text-muted-foreground tabular-nums">
                {entry.position_count}
              </p>

              {/* Cash */}
              <p className="hidden sm:block text-right text-sm font-mono text-muted-foreground tabular-nums">
                {fmt(entry.cash_balance)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages} &middot; {total} participants
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0 || loading}
              onClick={() => load(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= total || loading}
              onClick={() => load(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}
