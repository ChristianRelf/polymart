import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@clerk/clerk-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Users, Search, Plus, Loader2, AlertCircle, ArrowRight, Shield, X,
} from "lucide-react"
import { useAccount } from "@/hooks/useAccount"
import { VerificationBadge } from "@/components/VerificationBadge"
import type { Route } from "@/App"

interface Community {
  id: number
  slug: string
  display_name: string
  description: string | null
  icon_url: string | null
  banner_url: string | null
  member_count: number
  post_count: number
  owner_clerk_id: string
  created_at: string
  role?: string
  verification_type?: string | null
}

interface Props {
  onNavigate: (r: Route) => void
  onNavigateToCommunity: (slug: string) => void
}

function CommunityAvatar({ icon_url, display_name, size = "md" }: { icon_url: string | null; display_name: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-8 h-8 text-sm" : size === "lg" ? "w-14 h-14 text-xl" : "w-10 h-10 text-base"
  if (icon_url) return <img src={icon_url} alt={display_name} loading="lazy" decoding="async" className={`${sz} rounded-full object-cover shrink-0 border border-border`} />
  return (
    <div className={`${sz} rounded-full bg-muted flex items-center justify-center shrink-0 border border-border font-bold text-muted-foreground`}>
      {display_name[0]?.toUpperCase() ?? "C"}
    </div>
  )
}

function CreateCommunityModal({ onClose, onCreated }: { onClose: () => void; onCreated: (slug: string) => void }) {
  const { createCommunity } = useAccount()
  const [slug, setSlug] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
  }

  function handleNameChange(v: string) {
    setDisplayName(v)
    if (!slug || slug === slugify(displayName)) setSlug(slugify(v))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!/^[a-z0-9-]{3,64}$/.test(slug)) {
      setError("Slug must be 3-64 lowercase letters, numbers, or hyphens")
      return
    }
    if (!displayName.trim()) { setError("Display name is required"); return }
    setLoading(true)
    try {
      await createCommunity({ slug, display_name: displayName.trim(), description: description.trim() })
      onCreated(slug)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create community")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md bg-card border-border shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-foreground">Create a community</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
              <Input
                value={displayName}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Stocks Analysis"
                maxLength={128}
                className="h-9 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Community URL</label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground whitespace-nowrap">polymart.co/#/c/</span>
                <Input
                  value={slug}
                  onChange={e => setSlug(slugify(e.target.value))}
                  placeholder="stocks-analysis"
                  maxLength={64}
                  className="h-9 text-sm font-mono"
                />
              </div>
              <p className="text-[11px] text-muted-foreground/60 mt-1">3-64 chars: lowercase letters, numbers, hyphens</p>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this community about?"
                maxLength={500}
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" size="sm" disabled={loading} className="flex-1">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create Community"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function CommunityCard({
  community, isMine, onNavigate, onJoin, onLeave, joining,
}: {
  community: Community
  isMine: boolean
  onNavigate: () => void
  onJoin: () => void
  onLeave: () => void
  joining: boolean
}) {
  const { isSignedIn } = useAuth()

  return (
    <Card className="border-border bg-card hover:border-border/80 transition-colors cursor-pointer group" onClick={onNavigate}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <CommunityAvatar icon_url={community.icon_url} display_name={community.display_name} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate group-hover:text-foreground/80 transition-colors flex items-center gap-1">
                  {community.display_name}
                  <VerificationBadge type={community.verification_type as "none" | "verified" | "official" | null} size="xs" />
                </p>
                <p className="text-xs text-muted-foreground/60 font-mono">c/{community.slug}</p>
              </div>
              {isMine && community.role === "owner" && (
                <Badge variant="outline" className="text-[10px] shrink-0 border-amber-500/30 text-amber-500 bg-amber-500/5">
                  <Shield className="w-2.5 h-2.5 mr-1" />Owner
                </Badge>
              )}
              {isMine && community.role === "moderator" && (
                <Badge variant="outline" className="text-[10px] shrink-0 border-blue-500/30 text-blue-400 bg-blue-500/5">
                  <Shield className="w-2.5 h-2.5 mr-1" />Mod
                </Badge>
              )}
            </div>
            {community.description && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{community.description}</p>
            )}
            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{community.member_count.toLocaleString()} members</span>
                <span>{community.post_count.toLocaleString()} posts</span>
              </div>
              {isSignedIn && (
                <button
                  onClick={e => { e.stopPropagation(); isMine ? onLeave() : onJoin() }}
                  disabled={joining}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                    isMine
                      ? "border-border text-muted-foreground hover:border-red-500/40 hover:text-red-400 bg-transparent"
                      : "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 bg-transparent"
                  }`}
                >
                  {joining ? <Loader2 className="w-3 h-3 animate-spin" /> : isMine ? "Leave" : "Join"}
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function CommunitiesPage({ onNavigateToCommunity }: Props) {
  const { isSignedIn } = useAuth()
  const { getCommunities, getMyJoinedCommunities, joinCommunity, leaveCommunity } = useAccount()

  const [communities, setCommunities] = useState<Community[]>([])
  const [myCommunities, setMyCommunities] = useState<Community[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [q, setQ] = useState("")
  const [sort, setSort] = useState<"members" | "new">("members")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [joiningSlug, setJoiningSlug] = useState<string | null>(null)

  const fetchCommunities = useCallback(async (p = 1, query = q, s = sort) => {
    setLoading(true)
    setError("")
    try {
      const data = await getCommunities({ q: query, sort: s, page: p })
      setCommunities(data.communities ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
      setPage(p)
    } catch {
      setError("Failed to load communities")
    } finally {
      setLoading(false)
    }
  }, [getCommunities, q, sort])

  const fetchMine = useCallback(async () => {
    if (!isSignedIn) return
    try {
      const data = await getMyJoinedCommunities()
      setMyCommunities(data.communities ?? [])
    } catch {
      // silent
    }
  }, [isSignedIn, getMyJoinedCommunities])

  useEffect(() => { fetchCommunities(1, "", "members") }, [])
  useEffect(() => { fetchMine() }, [isSignedIn])

  function handleSearch(v: string) {
    setQ(v)
    fetchCommunities(1, v, sort)
  }

  function handleSort(s: "members" | "new") {
    setSort(s)
    fetchCommunities(1, q, s)
  }

  async function handleJoin(slug: string) {
    setJoiningSlug(slug)
    try {
      await joinCommunity(slug)
      await Promise.all([fetchMine(), fetchCommunities(page)])
    } catch { /* silent */ } finally {
      setJoiningSlug(null)
    }
  }

  async function handleLeave(slug: string) {
    if (!window.confirm("Leave this community?")) return
    setJoiningSlug(slug)
    try {
      await leaveCommunity(slug)
      await Promise.all([fetchMine(), fetchCommunities(page)])
    } catch { /* silent */ } finally {
      setJoiningSlug(null)
    }
  }

  const mySlugSet = new Set(myCommunities.map(c => c.slug))

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {showCreate && (
        <CreateCommunityModal
          onClose={() => setShowCreate(false)}
          onCreated={slug => { setShowCreate(false); onNavigateToCommunity(slug) }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Communities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total.toLocaleString()} communities</p>
        </div>
        {isSignedIn && (
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />Create
          </Button>
        )}
      </div>

      {/* My Communities (signed-in only) */}
      {isSignedIn && myCommunities.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">My Communities</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {myCommunities.map(c => (
              <div
                key={c.slug}
                onClick={() => onNavigateToCommunity(c.slug)}
                className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border hover:border-border/70 cursor-pointer transition-colors group"
              >
                <CommunityAvatar icon_url={c.icon_url} display_name={c.display_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{c.display_name}</p>
                  <p className="text-[11px] text-muted-foreground/60">{c.member_count.toLocaleString()} members</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + sort bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <Input
            value={q}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search communities..."
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-1">
          {(["members", "new"] as const).map(s => (
            <button
              key={s}
              onClick={() => handleSort(s)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
                sort === s
                  ? "border-foreground/30 text-foreground bg-muted"
                  : "border-border text-muted-foreground hover:text-foreground bg-transparent"
              }`}
            >
              {s === "members" ? "Popular" : "New"}
            </button>
          ))}
        </div>
      </div>

      {/* Community grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm text-red-400 py-8 justify-center">
          <AlertCircle className="w-4 h-4" />{error}
        </div>
      ) : communities.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{q ? "No communities match your search" : "No communities yet — be the first!"}</p>
          {isSignedIn && !q && (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowCreate(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />Create one
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {communities.map(c => (
              <CommunityCard
                key={c.slug}
                community={{ ...c, role: myCommunities.find(m => m.slug === c.slug)?.role }}
                isMine={mySlugSet.has(c.slug)}
                onNavigate={() => onNavigateToCommunity(c.slug)}
                onJoin={() => handleJoin(c.slug)}
                onLeave={() => handleLeave(c.slug)}
                joining={joiningSlug === c.slug}
              />
            ))}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => fetchCommunities(page - 1)}>
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">{page} / {pages}</span>
              <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => fetchCommunities(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
