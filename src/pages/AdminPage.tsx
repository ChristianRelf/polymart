import { useState, useEffect, useCallback } from "react"
import { useAuth, useUser } from "@clerk/clerk-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2, AlertCircle, ShieldAlert, Search } from "lucide-react"
import type { Route } from "@/App"

const API = "/api/v1"

interface AdminUser {
  clerk_id: string
  display_name: string | null
  email: string | null
  tier: "basic" | "premium"
  created_at: string
}

interface Ticket {
  id: number
  clerk_id: string | null
  email: string
  subject: string
  status: "open" | "in_progress" | "resolved"
  display_name: string | null
  created_at: string
}

interface Props {
  onNavigate: (r: Route) => void
}

function useAdminFetch() {
  const { getToken } = useAuth()
  const { user } = useUser()

  const isAdmin = user?.publicMetadata?.role === "admin"

  async function adminFetch(path: string, options: RequestInit = {}) {
    const token = await getToken()
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers as Record<string, string>),
      },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
    return data
  }

  return { adminFetch, isAdmin }
}

export default function AdminPage({ onNavigate }: Props) {
  const { adminFetch, isAdmin } = useAdminFetch()
  const { isLoaded } = useAuth()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [ticketStatus, setTicketStatus] = useState("open")

  // User detail dialog
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [userDetail, setUserDetail] = useState<Record<string, unknown> | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [tierOverride, setTierOverride] = useState<"basic" | "premium">("basic")
  const [saving, setSaving] = useState(false)

  // Ticket detail dialog
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [ticketNote, setTicketNote] = useState("")
  const [newStatus, setNewStatus] = useState<string>("")
  const [updatingTicket, setUpdatingTicket] = useState(false)

  const loadUsers = useCallback(async () => {
    try {
      const data = await adminFetch(`/admin/users?${search ? `search=${encodeURIComponent(search)}` : ""}`)
      setUsers(data.users)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load users")
    }
  }, [adminFetch, search])

  const loadTickets = useCallback(async () => {
    try {
      const data = await adminFetch(`/admin/tickets?status=${ticketStatus}`)
      setTickets(data.tickets)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load tickets")
    }
  }, [adminFetch, ticketStatus])

  useEffect(() => {
    if (!isLoaded || !isAdmin) { setLoading(false); return }
    Promise.all([loadUsers(), loadTickets()]).finally(() => setLoading(false))
  }, [isLoaded, isAdmin, loadUsers, loadTickets])

  async function openUserDetail(u: AdminUser) {
    setSelectedUser(u)
    setTierOverride(u.tier)
    setDetailLoading(true)
    try {
      const d = await adminFetch(`/admin/users/${u.clerk_id}`)
      setUserDetail(d)
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleTierOverride() {
    if (!selectedUser) return
    setSaving(true)
    try {
      await adminFetch(`/admin/users/${selectedUser.clerk_id}/tier`, {
        method: "PUT",
        body: JSON.stringify({ tier: tierOverride }),
      })
      setUsers(prev => prev.map(u => u.clerk_id === selectedUser.clerk_id ? { ...u, tier: tierOverride } : u))
      setSelectedUser(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update tier")
    } finally {
      setSaving(false)
    }
  }

  async function openTicketDetail(t: Ticket) {
    setSelectedTicket(t)
    setNewStatus(t.status)
    setTicketNote("")
  }

  async function handleTicketUpdate() {
    if (!selectedTicket) return
    setUpdatingTicket(true)
    try {
      await adminFetch(`/admin/tickets/${selectedTicket.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus || undefined, note: ticketNote || undefined }),
      })
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: newStatus as Ticket["status"] } : t))
      setSelectedTicket(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update ticket")
    } finally {
      setUpdatingTicket(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-16 text-center">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">You do not have admin access.</p>
        <Button variant="ghost" size="sm" onClick={() => onNavigate("dashboard")} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-8 space-y-6">

      <div className="flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        <Badge variant="destructive" className="text-[10px]">Internal</Badge>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Users tab */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loadUsers()}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Button size="sm" variant="outline" onClick={loadUsers} className="h-8">Search</Button>
          </div>

          <div className="space-y-2">
            {users.map(u => (
              <Card key={u.clerk_id} className="bg-card border-border cursor-pointer hover:border-foreground/20 transition-colors" onClick={() => openUserDetail(u)}>
                <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.display_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email ?? "no email"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={u.tier === "premium" ? "default" : "secondary"} className="text-[10px]">
                      {u.tier}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {users.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No users found.</p>}
          </div>
        </TabsContent>

        {/* Tickets tab */}
        <TabsContent value="tickets" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <Select value={ticketStatus} onValueChange={v => { setTicketStatus(v); loadTickets() }}>
              <SelectTrigger className="h-8 w-40 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {tickets.map(t => (
              <Card key={t.id} className="bg-card border-border cursor-pointer hover:border-foreground/20 transition-colors" onClick={() => openTicketDetail(t)}>
                <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">#{t.id} — {t.subject}</p>
                    <p className="text-xs text-muted-foreground">{t.display_name ?? t.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={t.status === "open" ? "destructive" : t.status === "in_progress" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {t.status.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {tickets.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No tickets with status "{ticketStatus}".</p>}
          </div>
        </TabsContent>

        {/* Audit log tab */}
        <TabsContent value="audit" className="mt-4">
          <AuditLog adminFetch={adminFetch} />
        </TabsContent>
      </Tabs>

      {/* User detail dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedUser?.display_name ?? "User"}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : userDetail ? (
            <div className="space-y-4 py-2">
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Email: {selectedUser?.email}</p>
                <p>ID: <span className="font-mono">{selectedUser?.clerk_id}</span></p>
                <p>Portfolios: {(userDetail.portfolios as unknown[])?.length ?? 0}</p>
                <p>Open tickets: {(userDetail.tickets as Ticket[])?.filter(t => t.status === "open").length ?? 0}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Override Tier</label>
                <Select value={tierOverride} onValueChange={v => setTierOverride(v as "basic" | "premium")}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>Close</Button>
            <Button onClick={handleTierOverride} disabled={saving || detailLoading}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Tier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket detail dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ticket #{selectedTicket?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm font-medium">{selectedTicket?.subject}</p>
            <p className="text-xs text-muted-foreground">From: {selectedTicket?.display_name ?? selectedTicket?.email}</p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Internal Note</label>
              <Input
                placeholder="Add a note..."
                value={ticketNote}
                onChange={e => setTicketNote(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTicket(null)}>Cancel</Button>
            <Button onClick={handleTicketUpdate} disabled={updatingTicket}>
              {updatingTicket ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

function AuditLog({ adminFetch }: { adminFetch: (path: string, opts?: RequestInit) => Promise<Record<string, unknown>> }) {
  const [entries, setEntries] = useState<{ id: number; admin_name: string | null; action: string; target_clerk_id: string | null; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminFetch("/admin/audit-log")
      .then(d => setEntries(d.entries as typeof entries))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [adminFetch])

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">Recent admin actions (read-only)</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No audit entries yet.</p>
        ) : (
          <div className="space-y-2">
            {entries.map(e => (
              <div key={e.id} className="flex items-center justify-between gap-4 text-xs py-1.5 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[10px] shrink-0">{e.action}</Badge>
                  <span className="text-muted-foreground truncate">{e.admin_name ?? "admin"}</span>
                  {e.target_clerk_id && <span className="text-muted-foreground/60 truncate font-mono">{e.target_clerk_id.slice(0, 12)}…</span>}
                </div>
                <span className="text-muted-foreground shrink-0">{new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
