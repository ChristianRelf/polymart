import { useState, useEffect, useCallback } from "react"
import { useUser } from "@clerk/clerk-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, TrendingUp, TrendingDown, Wallet, Star, Loader2, AlertCircle } from "lucide-react"
import { useAccount } from "@/hooks/useAccount"
import type { Route } from "@/App"

interface Portfolio {
  id: number
  name: string
  description: string | null
  cash_balance: number
  position_count: number
  created_at: string
}

interface UserProfile {
  display_name: string | null
  email: string | null
  tier: "basic" | "premium"
  tierLimits: {
    label: string
    maxPortfolios: number
    maxPositions: number
    startingCash: number
  }
}

interface Props {
  onNavigate: (r: Route) => void
  onNavigateToPortfolio: (id: number) => void
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
}

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
      setPortfolios(prev => [...prev, { ...p, position_count: 0 }])
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
    <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back{profile?.display_name ? `, ${profile.display_name}` : user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your paper trading portfolios</p>
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

      {/* Tier summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              <Card
                key={p.id}
                className="border-border bg-card hover:border-foreground/20 transition-colors cursor-pointer"
                onClick={() => onNavigateToPortfolio(p.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center justify-between">
                    <span className="truncate">{p.name}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                      {p.position_count} position{p.position_count !== 1 ? "s" : ""}
                    </Badge>
                  </CardTitle>
                  {p.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xl font-bold text-foreground">{fmt(p.cash_balance)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Available cash</p>
                  <div className="flex items-center justify-between mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={e => { e.stopPropagation(); onNavigateToPortfolio(p.id) }}
                    >
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7 text-destructive hover:text-destructive"
                      onClick={e => { e.stopPropagation(); setDeleteTarget(p) }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
