import { useState, useEffect, useCallback } from "react"
import { useUser, useClerk } from "@clerk/clerk-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  Loader2, AlertCircle, CheckCircle2, Camera, CreditCard, ShieldCheck,
  TrendingUp, TrendingDown, Activity, Clock, Ticket, Users, Flag, Shield,
  User, LogOut, Link2, BarChart3, Lock, ExternalLink,
} from "lucide-react"
import { useAccount } from "@/hooks/useAccount"
import { DiscordLinkSection } from "@/components/account/DiscordLinkSection"
import type { Route } from "@/App"

// ── Interfaces ─────────────────────────────────────────────────────────────────
interface UserProfile {
  display_name: string | null
  bio?: string | null
  email: string | null
  tier: "basic" | "premium"
  show_on_leaderboard: number
  tierLimits: {
    label: string
    maxPortfolios: number
    maxPositions: number
    maxWatchlists: number
    maxWatchlistItems: number
    startingCash: number
    canExportHistory: boolean
    assets: Record<string, boolean>
  }
  stripe_subscription_id: string | null
  tier_expires_at: string | null
}

interface AccountStats {
  total_value: number
  total_cash: number
  position_value: number
  unrealised_pnl: number
  total_orders: number
  created_at: string | null
}

interface RecentOrder {
  id: number
  asset_type: string
  symbol: string
  side: "buy" | "sell"
  quantity: number
  price: number
  total: number
  executed_at: string
  portfolio_id: number
  portfolio_name: string
}

interface SupportTicket {
  id: number
  subject: string
  status: "open" | "in_progress" | "resolved"
  created_at: string
}

interface MyReport {
  id: number
  post_id: number
  reason: string
  created_at: string
  post_body: string | null
}

interface ModAction {
  id: number
  action_type: string
  community_id: number
  community_slug: string
  community_display_name: string
  mod_display_name: string | null
  details: string | null
  created_at: string
}

interface JoinedCommunity {
  id: number
  slug: string
  display_name: string
  icon_url: string | null
  member_count: number
  role: "member" | "moderator" | "owner"
}

interface Props {
  onNavigate: (r: Route) => void
  onNavigateToCommunity?: (slug: string) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function fmtFull(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
}

function ticketStatusBadge(status: SupportTicket["status"]) {
  switch (status) {
    case "open":        return { label: "Open",        cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" }
    case "in_progress": return { label: "In Progress",  cls: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" }
    case "resolved":    return { label: "Resolved",     cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" }
  }
}

// ── Section nav ────────────────────────────────────────────────────────────────
type Section = "overview" | "profile" | "plan" | "integrations" | "support" | "community"

const SECTIONS: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview",     label: "Overview",       icon: BarChart3 },
  { id: "profile",      label: "Profile",        icon: User },
  { id: "plan",         label: "Plan & Billing",  icon: CreditCard },
  { id: "integrations", label: "Integrations",   icon: Link2 },
  { id: "support",      label: "Support",        icon: Ticket },
  { id: "community",    label: "Community",      icon: Users },
]

// ── Trading overview card ──────────────────────────────────────────────────────
function TradingOverview({ stats }: { stats: AccountStats }) {
  const pnlUp = stats.unrealised_pnl >= 0
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          Trading Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-md bg-muted/30 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Total Value</p>
            <p className="text-lg font-bold tabular-nums">{fmt(stats.total_value)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{fmt(stats.total_cash)} cash</p>
          </div>
          <div className="rounded-md bg-muted/30 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Unrealised P&amp;L</p>
            <p className={`text-lg font-bold tabular-nums flex items-center gap-1 ${pnlUp ? "text-emerald-600" : "text-red-500"}`}>
              {pnlUp ? <TrendingUp className="w-4 h-4 shrink-0" /> : <TrendingDown className="w-4 h-4 shrink-0" />}
              {fmtFull(stats.unrealised_pnl)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">across all portfolios</p>
          </div>
          <div className="rounded-md bg-muted/30 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Total Trades</p>
            <p className="text-lg font-bold tabular-nums">{stats.total_orders.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">lifetime orders</p>
          </div>
          <div className="rounded-md bg-muted/30 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Position Value</p>
            <p className="text-lg font-bold tabular-nums">{fmt(stats.position_value)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">in open positions</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Recent activity feed ───────────────────────────────────────────────────────
function ActivityFeed({
  orders,
  onNavigateToPortfolio,
}: {
  orders: RecentOrder[]
  onNavigateToPortfolio: (id: number) => void
}) {
  if (!orders.length) return null
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {orders.map(o => (
            <div key={o.id} className="flex items-center justify-between px-6 py-3 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 ${
                    o.side === "buy"
                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                      : "bg-red-500/10 text-red-600 border-red-500/20"
                  }`}
                >
                  {o.side.toUpperCase()}
                </Badge>
                <div className="min-w-0">
                  <span className="font-mono text-sm font-semibold">{o.symbol}</span>
                  <span className="text-xs text-muted-foreground ml-2">{o.quantity} @ {fmtFull(o.price)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold tabular-nums">{fmtFull(o.total)}</p>
                <button
                  type="button"
                  onClick={() => onNavigateToPortfolio(o.portfolio_id)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
                >
                  {o.portfolio_name}
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

const MOD_ACTION_LABELS: Record<string, string> = {
  ban: "Banned",
  unban: "Unbanned",
  remove_post: "Post Removed",
  restore_post: "Post Restored",
  pin: "Post Pinned",
  unpin: "Post Unpinned",
  add_mod: "Added as Moderator",
  remove_mod: "Removed as Moderator",
}

// ── Community activity ─────────────────────────────────────────────────────────
function CommunitySection({
  communities,
  reports,
  modHistory,
  onNavigateToCommunity,
}: {
  communities: JoinedCommunity[]
  reports: MyReport[]
  modHistory: ModAction[]
  onNavigateToCommunity?: (slug: string) => void
}) {
  if (!communities.length && !reports.length && !modHistory.length) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No community activity yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {communities.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Joined Communities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {communities.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onNavigateToCommunity?.(c.slug)}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-sm hover:bg-muted/60 transition-colors cursor-pointer"
                >
                  {c.icon_url ? (
                    <img src={c.icon_url} alt="" loading="lazy" decoding="async" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                      {c.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium">{c.display_name}</span>
                  {c.role !== "member" && (
                    <Badge variant="outline" className="text-[9px] ml-0.5 capitalize">{c.role}</Badge>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {reports.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Flag className="w-4 h-4 text-muted-foreground" />
              My Submitted Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {reports.map(r => (
                <div key={r.id} className="flex items-start justify-between gap-4 px-6 py-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">
                      {r.post_body
                        ? `"${r.post_body.slice(0, 80)}${r.post_body.length > 80 ? "..." : ""}"`
                        : `Post #${r.post_id}`}
                    </p>
                    <p className="text-xs mt-0.5">
                      <span className="text-muted-foreground">Reason: </span>
                      <span>{r.reason}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {modHistory.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              Moderation History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {modHistory.map(a => (
                <div key={a.id} className="flex items-start justify-between gap-4 px-6 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {MOD_ACTION_LABELS[a.action_type] ?? a.action_type}
                      {" "}<span className="font-normal text-muted-foreground">in</span>{" "}
                      <button
                        type="button"
                        onClick={() => onNavigateToCommunity?.(a.community_slug)}
                        className="text-foreground hover:underline cursor-pointer bg-transparent border-0 p-0 font-medium"
                      >
                        {a.community_display_name}
                      </button>
                    </p>
                    {a.details && <p className="text-xs text-muted-foreground mt-0.5">{a.details}</p>}
                    {a.mod_display_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">by {a.mod_display_name}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AccountPage({ onNavigate, onNavigateToCommunity }: Props) {
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const {
    getMe, updateMe, updateLeaderboardVisibility, getBilling, startCheckout,
    getStats, getRecentOrders, getSupportTickets, getMyReports,
    getModActionsAgainstMe, getMyJoinedCommunities,
  } = useAccount()

  const [section, setSection] = useState<Section>("overview")

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [billing, setBilling] = useState<{ portalUrl: string | null } | null>(null)
  const [stats, setStats] = useState<AccountStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [myReports, setMyReports] = useState<MyReport[]>([])
  const [modHistory, setModHistory] = useState<ModAction[]>([])
  const [joinedCommunities, setJoinedCommunities] = useState<JoinedCommunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<"saved" | "error" | null>(null)

  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true)
  const [leaderboardSaving, setLeaderboardSaving] = useState(false)

  const [avatarUploading, setAvatarUploading] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)

  const load = useCallback(async () => {
    try {
      const [me, bill, st, orders, tix, reports, modActs, comms] = await Promise.all([
        getMe(),
        getBilling().catch(() => null),
        getStats().catch(() => null),
        getRecentOrders().catch(() => []),
        getSupportTickets().catch(() => []),
        getMyReports().catch(() => []),
        getModActionsAgainstMe().catch(() => []),
        getMyJoinedCommunities().catch(() => []),
      ])
      setProfile(me)
      setDisplayName(me.display_name ?? "")
      setBio(me.bio ?? "")
      setShowOnLeaderboard(me.show_on_leaderboard !== 0)
      if (bill) setBilling(bill)
      if (st) setStats(st)
      setRecentOrders(Array.isArray(orders) ? orders : [])
      setTickets(Array.isArray(tix) ? tix : [])
      setMyReports(Array.isArray(reports) ? reports : [])
      setModHistory(Array.isArray(modActs) ? modActs : [])
      setJoinedCommunities(Array.isArray(comms) ? comms : [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load account")
    } finally {
      setLoading(false)
    }
  }, [getMe, getBilling, getStats, getRecentOrders, getSupportTickets, getMyReports, getModActionsAgainstMe, getMyJoinedCommunities])

  useEffect(() => { load() }, [load])

  async function handleSaveProfile() {
    setSaving(true)
    setSaveResult(null)
    try {
      await updateMe({ display_name: displayName, bio })
      setSaveResult("saved")
      setTimeout(() => setSaveResult(null), 3000)
    } catch {
      setSaveResult("error")
    } finally {
      setSaving(false)
    }
  }

  async function handleLeaderboardToggle(checked: boolean) {
    setShowOnLeaderboard(checked)
    setLeaderboardSaving(true)
    try {
      await updateLeaderboardVisibility(checked)
    } catch {
      setShowOnLeaderboard(!checked)
    } finally {
      setLeaderboardSaving(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setAvatarUploading(true)
    try {
      await user.setProfileImage({ file })
    } finally {
      setAvatarUploading(false)
      e.target.value = ""
    }
  }

  async function handleUpgrade() {
    setCheckingOut(true)
    try {
      const { url } = await startCheckout()
      window.location.href = url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start checkout")
      setCheckingOut(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    window.location.hash = "/"
  }

  function goToPortfolio(id: number) {
    window.location.hash = `/portfolio/${id}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-12">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error ?? "Failed to load account"}</span>
        </div>
      </div>
    )
  }

  const isPremium = profile.tier === "premium"
  const limits = profile.tierLimits
  const memberSince = stats?.created_at
    ? new Date(stats.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-5">

      {/* ── Profile header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 p-5 rounded-xl border border-border bg-card">
        <div className="relative shrink-0">
          <img
            src={user?.imageUrl}
            alt="Avatar"
            className="w-16 h-16 rounded-full object-cover border border-border"
          />
          <label
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center cursor-pointer hover:bg-accent transition-colors"
            title="Change photo"
          >
            {avatarUploading
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Camera className="w-3 h-3" />}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground truncate">
              {profile.display_name || user?.fullName || "—"}
            </h1>
            <Badge variant={isPremium ? "default" : "secondary"} className="text-[10px] shrink-0">
              {limits.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{profile.email}</p>
          {memberSince && (
            <p className="text-xs text-muted-foreground mt-0.5">Member since {memberSince}</p>
          )}
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => openUserProfile()}
          >
            <Lock className="w-3.5 h-3.5" />
            Email &amp; Password
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Mobile: action row */}
      <div className="flex sm:hidden gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={() => openUserProfile()}
        >
          <Lock className="w-3.5 h-3.5" />
          Email &amp; Password
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </Button>
      </div>

      {/* Mobile: horizontal section tabs */}
      <div className="md:hidden flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border",
              section === s.id
                ? "bg-foreground text-background border-foreground"
                : "text-muted-foreground border-border bg-transparent hover:bg-accent hover:text-foreground"
            )}
          >
            <s.icon className="w-3 h-3 shrink-0" />
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex gap-8 items-start">

        {/* Sidebar — desktop only */}
        <aside className="hidden md:flex flex-col w-48 shrink-0 gap-0.5 sticky top-24">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer bg-transparent border-0 text-left w-full",
                section === s.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <s.icon className="w-4 h-4 shrink-0" />
              {s.label}
            </button>
          ))}

          <Separator className="my-3" />

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer bg-transparent border-0 text-left w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </aside>

        {/* Section content */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* ── Overview ─────────────────────────────────────────────────── */}
          {section === "overview" && (
            <>
              {stats ? (
                <TradingOverview stats={stats} />
              ) : (
                <Card className="bg-card border-border">
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">No trading data yet.</p>
                    <Button variant="link" size="sm" onClick={() => onNavigate("dashboard")} className="text-xs mt-1 h-auto p-0">
                      Go to Paper Trading
                    </Button>
                  </CardContent>
                </Card>
              )}

              <ActivityFeed orders={recentOrders} onNavigateToPortfolio={goToPortfolio} />

              <Card className="bg-card border-border">
                <CardContent className="py-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Quick Links</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => onNavigate("dashboard")} className="h-8 text-xs">
                      My Portfolios
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onNavigate("trading-terminal")} className="h-8 text-xs">
                      Terminal
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onNavigate("leaderboard")} className="h-8 text-xs">
                      Leaderboard
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onNavigate("communities")} className="h-8 text-xs">
                      Communities
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onNavigate("help")} className="h-8 text-xs">
                      Help &amp; Support
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── Profile ──────────────────────────────────────────────────── */}
          {section === "profile" && (
            <>
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
                      <Input
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        maxLength={128}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Bio</label>
                      <Input
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        placeholder="Short bio"
                        maxLength={500}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button size="sm" onClick={handleSaveProfile} disabled={saving} className="h-8">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
                    </Button>
                    {saveResult === "saved" && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Saved
                      </span>
                    )}
                    {saveResult === "error" && (
                      <span className="text-xs text-destructive">Save failed</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Privacy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Community Leaderboard</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Show your portfolio on the public leaderboard rankings.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {leaderboardSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                      <Switch
                        checked={showOnLeaderboard}
                        onCheckedChange={handleLeaderboardToggle}
                        disabled={leaderboardSaving}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Account Security
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage your email address, password, and connected social accounts.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => openUserProfile()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Manage Email &amp; Password
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── Plan & Billing ────────────────────────────────────────────── */}
          {section === "plan" && (
            <>
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                      Current Plan
                    </span>
                    <Badge variant={isPremium ? "default" : "secondary"}>{limits.label}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Portfolios",           value: limits.maxPortfolios },
                      { label: "Positions / Portfolio", value: limits.maxPositions },
                      { label: "Starting Cash",         value: fmt(limits.startingCash) },
                      { label: "Watchlists",            value: limits.maxWatchlists },
                      { label: "Watchlist Items",       value: limits.maxWatchlistItems },
                      { label: "Export History",        value: limits.canExportHistory ? "Yes" : "No" },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-md bg-muted/30 p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                        <p className="text-sm font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Asset Access</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(limits.assets).map(([type, allowed]) => (
                        <Badge key={type} variant={allowed ? "default" : "outline"} className="text-[10px]">
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                          {!allowed && " (Premium)"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {!isPremium && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Upgrade to Premium</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Unlock more portfolios, forex &amp; crypto access, higher limits, and trade history export.
                    </p>
                    <Button onClick={handleUpgrade} disabled={checkingOut} className="gap-1.5">
                      {checkingOut
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <><CreditCard className="w-3.5 h-3.5" /> Upgrade to Premium</>}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {isPremium && billing?.portalUrl && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Manage Subscription</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Update your payment method, view invoices, or cancel your subscription.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => window.open(billing.portalUrl!, "_blank")}
                      className="gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Billing Portal
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ── Integrations ─────────────────────────────────────────────── */}
          {section === "integrations" && (
            <DiscordLinkSection onNavigate={onNavigate} />
          )}

          {/* ── Support ──────────────────────────────────────────────────── */}
          {section === "support" && (
            <>
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-muted-foreground" />
                    Support Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent className={tickets.length ? "p-0" : undefined}>
                  {tickets.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No support tickets.</p>
                      <Button variant="link" size="sm" onClick={() => onNavigate("help")} className="text-xs mt-1 h-auto p-0">
                        Visit Help &amp; Support
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {tickets.map(t => {
                        const badge = ticketStatusBadge(t.status)
                        return (
                          <div key={t.id} className="flex items-center justify-between px-6 py-3 gap-4">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{t.subject}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                #{t.id} &middot; {new Date(t.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="outline" className={`text-[10px] shrink-0 ${badge.cls}`}>
                              {badge.label}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="py-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Get Help</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => onNavigate("help")} className="h-8 text-xs">
                      Help Center
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onNavigate("bug-report")} className="h-8 text-xs">
                      Report a Bug
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onNavigate("suggestion")} className="h-8 text-xs">
                      Suggestion
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── Community ────────────────────────────────────────────────── */}
          {section === "community" && (
            <CommunitySection
              communities={joinedCommunities}
              reports={myReports}
              modHistory={modHistory}
              onNavigateToCommunity={onNavigateToCommunity}
            />
          )}

        </div>
      </div>
    </div>
  )
}
