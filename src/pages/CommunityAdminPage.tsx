import { useState, useEffect, useCallback } from "react"
import { useUser } from "@clerk/clerk-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, AlertCircle, Shield, Trash2, Flag, Search,
  BadgeCheck, Star, ChevronLeft, EyeOff,
} from "lucide-react"
import { VerificationBadge, UserVerifiedBadge } from "@/components/VerificationBadge"
import type { Route } from "@/App"

const API = import.meta.env.VITE_API_URL ?? ""

type Tab = "reports" | "communities" | "users"

interface Report {
  id: number
  post_id: number
  post_title: string
  is_removed: number
  community_slug: string
  community_name: string
  reporter_name: string
  reason: string
  created_at: string
}

interface AdminCommunity {
  id: number
  slug: string
  display_name: string
  icon_url: string | null
  member_count: number
  post_count: number
  owner_clerk_id: string
  created_at: string
  verification_type: "none" | "verified" | "official"
  open_reports: number
}

interface AdminUser {
  clerk_id: string
  display_name: string | null
  email: string | null
  tier: string
  is_verified: number
  created_at: string
}

interface Props {
  onNavigate: (r: Route) => void
  onNavigateToCommunity: (slug: string) => void
}

function useAdminFetch() {
  const { user } = useUser()
  const isAdmin = user?.publicMetadata?.role === "admin"

  const adminFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
    const res = await fetch(url, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers ?? {}),
      },
      credentials: "include",
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Request failed")
    return data
  }, [])

  return { adminFetch, isAdmin }
}

export default function CommunityAdminPage({ onNavigate, onNavigateToCommunity }: Props) {
  const { isLoaded } = useUser()
  const { adminFetch, isAdmin } = useAdminFetch()
  const [tab, setTab] = useState<Tab>("reports")

  // Reports state
  const [reports, setReports] = useState<Report[]>([])
  const [reportPage, setReportPage] = useState(1)
  const [reportPages, setReportPages] = useState(1)
  const [loadingReports, setLoadingReports] = useState(false)
  const [removingPost, setRemovingPost] = useState<number | null>(null)

  // Communities state
  const [communities, setCommunities] = useState<AdminCommunity[]>([])
  const [loadingComms, setLoadingComms] = useState(false)
  const [commSearch, setCommSearch] = useState("")
  const [verifying, setVerifying] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [usersSearch, setUsersSearch] = useState("")
  const [verifyingUser, setVerifyingUser] = useState<string | null>(null)

  const [error, setError] = useState("")

  useEffect(() => {
    if (isLoaded && !isAdmin) onNavigate("community")
  }, [isLoaded, isAdmin])

  const loadReports = useCallback(async (p = 1) => {
    setLoadingReports(true)
    setError("")
    try {
      const data = await adminFetch(`${API}/api/v1/admin/community-reports?page=${p}`)
      setReports(data.reports ?? [])
      setReportPages(data.pages ?? 1)
      setReportPage(p)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reports")
    } finally {
      setLoadingReports(false)
    }
  }, [adminFetch])

  const loadCommunities = useCallback(async (q = "") => {
    setLoadingComms(true)
    setError("")
    try {
      const data = await adminFetch(`${API}/api/v1/admin/communities?q=${encodeURIComponent(q)}`)
      setCommunities(data.communities ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load communities")
    } finally {
      setLoadingComms(false)
    }
  }, [adminFetch])

  const loadUsers = useCallback(async (search = "") => {
    setLoadingUsers(true)
    setError("")
    try {
      const data = await adminFetch(`${API}/api/v1/admin/users?search=${encodeURIComponent(search)}&limit=50`)
      setUsers(data.users ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load users")
    } finally {
      setLoadingUsers(false)
    }
  }, [adminFetch])

  useEffect(() => { if (isAdmin) loadReports(1) }, [isAdmin, loadReports])
  useEffect(() => { if (isAdmin && tab === "communities") loadCommunities("") }, [isAdmin, tab, loadCommunities])
  useEffect(() => { if (isAdmin && tab === "users") loadUsers("") }, [isAdmin, tab, loadUsers])

  async function handleRemovePost(postId: number) {
    if (!window.confirm("Remove this post? It will be hidden from the community.")) return
    setRemovingPost(postId)
    try {
      await adminFetch(`${API}/api/v1/admin/community-posts/${postId}/remove`, { method: "POST" })
      setReports(prev => prev.map(r => r.post_id === postId ? { ...r, is_removed: 1 } : r))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to remove post")
    } finally {
      setRemovingPost(null)
    }
  }

  async function handleSetVerification(slug: string, type: "none" | "verified" | "official") {
    setVerifying(slug)
    try {
      await adminFetch(`${API}/api/v1/admin/communities/${slug}/verification`, {
        method: "PUT",
        body: JSON.stringify({ verification_type: type }),
      })
      setCommunities(prev => prev.map(c => c.slug === slug ? { ...c, verification_type: type } : c))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to update verification")
    } finally {
      setVerifying(null)
    }
  }

  async function handleVerifyUser(clerkId: string, is_verified: boolean) {
    setVerifyingUser(clerkId)
    try {
      await adminFetch(`${API}/api/v1/admin/users/${clerkId}/verify`, {
        method: "PUT",
        body: JSON.stringify({ is_verified }),
      })
      setUsers(prev => prev.map(u => u.clerk_id === clerkId ? { ...u, is_verified: is_verified ? 1 : 0 } : u))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to update verification")
    } finally {
      setVerifyingUser(null)
    }
  }

  async function handleDeleteCommunity(slug: string, name: string) {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return
    setDeleting(slug)
    try {
      await adminFetch(`${API}/api/v1/admin/communities/${slug}`, { method: "DELETE" })
      setCommunities(prev => prev.filter(c => c.slug !== slug))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to delete community")
    } finally {
      setDeleting(null)
    }
  }

  if (!isLoaded || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const TABS: [Tab, string][] = [
    ["reports", "Reports"],
    ["communities", "Communities"],
    ["users", "Users"],
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => onNavigate("community")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0 transition-colors mb-3"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Community
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Community Moderation</h1>
            <p className="text-xs text-muted-foreground">Staff tools - Polymart admin only</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer bg-transparent -mb-px ${
              tab === id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Reports ── */}
      {tab === "reports" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Reported posts across all communities
            </p>
            <Button size="sm" variant="outline" onClick={() => loadReports(reportPage)} disabled={loadingReports}>
              {loadingReports ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Refresh"}
            </Button>
          </div>

          {loadingReports ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No reports
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {reports.map(r => (
                    <div key={r.id} className="px-4 py-3 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Flag className="w-3 h-3 text-amber-500 shrink-0" />
                          <button
                            type="button"
                            onClick={() => onNavigateToCommunity(r.community_slug)}
                            className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0 p-0"
                          >
                            c/{r.community_slug}
                          </button>
                          <span className="text-[10px] text-muted-foreground/50">·</span>
                          <span className="text-[10px] text-muted-foreground">by {r.reporter_name}</span>
                          <span className="text-[10px] text-muted-foreground/50">·</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{r.post_title || `Post #${r.post_id}`}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Reason: {r.reason}</p>
                        {r.is_removed === 1 && (
                          <Badge variant="outline" className="text-[9px] mt-1 border-red-500/30 text-red-500">Removed</Badge>
                        )}
                      </div>
                      {r.is_removed === 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-red-500/30 text-red-500 hover:bg-red-500/10 shrink-0"
                          onClick={() => handleRemovePost(r.post_id)}
                          disabled={removingPost === r.post_id}
                        >
                          {removingPost === r.post_id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <><EyeOff className="w-3 h-3 mr-1" />Remove</>
                          }
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {reportPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" variant="outline" disabled={reportPage <= 1} onClick={() => loadReports(reportPage - 1)}>Previous</Button>
              <span className="text-xs text-muted-foreground">{reportPage} / {reportPages}</span>
              <Button size="sm" variant="outline" disabled={reportPage >= reportPages} onClick={() => loadReports(reportPage + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}

      {/* ── Communities ── */}
      {tab === "communities" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={commSearch}
                onChange={e => setCommSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loadCommunities(commSearch)}
                placeholder="Search by name or slug..."
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Button size="sm" onClick={() => loadCommunities(commSearch)} disabled={loadingComms}>
              {loadingComms ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
            </Button>
          </div>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal">
                {communities.length} communities — sorted by open reports
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingComms ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : communities.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">No communities found</p>
              ) : (
                <div className="divide-y divide-border">
                  {communities.map(c => (
                    <div key={c.slug} className="px-4 py-3 flex items-center gap-4">
                      {/* Icon */}
                      {c.icon_url ? (
                        <img src={c.icon_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {c.display_name[0]?.toUpperCase()}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onNavigateToCommunity(c.slug)}
                            className="text-sm font-medium text-foreground hover:underline cursor-pointer bg-transparent border-0 p-0"
                          >
                            {c.display_name}
                          </button>
                          <VerificationBadge type={c.verification_type} size="xs" />
                          {c.open_reports > 0 && (
                            <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-500 bg-amber-500/5">
                              {c.open_reports} report{c.open_reports !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">c/{c.slug} · {c.member_count.toLocaleString()} members</p>
                      </div>

                      {/* Verification controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {c.verification_type === "none" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] h-7 gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                              onClick={() => handleSetVerification(c.slug, "verified")}
                              disabled={verifying === c.slug}
                              title="Mark as Verified"
                            >
                              <BadgeCheck className="w-3 h-3" /> Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] h-7 gap-1 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                              onClick={() => handleSetVerification(c.slug, "official")}
                              disabled={verifying === c.slug}
                              title="Mark as Official Polymart"
                            >
                              <Star className="w-3 h-3" /> Official
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleSetVerification(c.slug, "none")}
                            disabled={verifying === c.slug}
                          >
                            {verifying === c.slug ? <Loader2 className="w-3 h-3 animate-spin" /> : "Revoke"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-7 border-red-500/30 text-red-500 hover:bg-red-500/10"
                          onClick={() => handleDeleteCommunity(c.slug, c.display_name)}
                          disabled={deleting === c.slug}
                          title="Delete community"
                        >
                          {deleting === c.slug ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Users ── */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={usersSearch}
                onChange={e => setUsersSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loadUsers(usersSearch)}
                placeholder="Search by name or email..."
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Button size="sm" onClick={() => loadUsers(usersSearch)} disabled={loadingUsers}>
              {loadingUsers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
            </Button>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-0">
              {loadingUsers ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : users.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">No users found</p>
              ) : (
                <div className="divide-y divide-border">
                  {users.map(u => (
                    <div key={u.clerk_id} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground">{u.display_name ?? u.clerk_id}</span>
                          {!!u.is_verified && <UserVerifiedBadge size="xs" />}
                          {u.tier === "premium" && (
                            <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-500 bg-amber-500/5">Premium</Badge>
                          )}
                        </div>
                        {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`text-[10px] h-7 gap-1 shrink-0 ${u.is_verified ? "border-sky-500/30 text-sky-400 hover:bg-sky-500/10" : "border-border text-muted-foreground hover:text-foreground"}`}
                        onClick={() => handleVerifyUser(u.clerk_id, !u.is_verified)}
                        disabled={verifyingUser === u.clerk_id}
                      >
                        {verifyingUser === u.clerk_id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : u.is_verified
                            ? <><BadgeCheck className="w-3 h-3" />Verified</>
                            : "Verify user"
                        }
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
