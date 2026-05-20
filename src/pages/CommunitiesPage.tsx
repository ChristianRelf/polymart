import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@clerk/clerk-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Users, Search, Plus, Loader2, AlertCircle, ArrowRight, Shield, X,
  Puzzle, ExternalLink, Tag, CheckCircle2, ChevronRight,
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

// ── Tool categories ───────────────────────────────────────────────────────────
const TOOL_CATEGORIES = ["Charting", "Screener", "Backtester", "Portfolio Tracker", "News Aggregator", "API / Data", "Discord Bot", "Education", "Other"] as const
type ToolCategory = typeof TOOL_CATEGORIES[number]

interface Tool {
  id: number
  name: string
  description: string
  url: string
  category: ToolCategory
  author_name: string
  upvotes: number
  created_at: string
}

function SubmitToolModal({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [url, setUrl] = useState("")
  const [category, setCategory] = useState<ToolCategory>("Other")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!name.trim()) { setError("Name is required"); return }
    if (!description.trim()) { setError("Description is required"); return }
    if (!url.trim() || !/^https?:\/\/.+/.test(url.trim())) { setError("A valid URL starting with http:// or https:// is required"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/v1/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), url: url.trim(), category }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Submission failed")
      }
      setDone(true)
      setTimeout(() => { onClose(); onSubmitted() }, 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md bg-card border-border shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Puzzle className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Submit a Tool or Plugin</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <p className="text-sm font-semibold text-foreground">Submitted for review!</p>
              <p className="text-xs text-muted-foreground text-center">Your tool will appear once it's been reviewed by the team.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tool / Plugin Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. TradingView Pine Screener" maxLength={128} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">URL</label>
                <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" maxLength={512} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as ToolCategory)}
                  aria-label="Tool category"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {TOOL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this tool do? How does it help traders?" maxLength={500} rows={3} className="resize-none text-sm" />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
                <Button type="submit" size="sm" disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Submit Tool"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Card className="border-border bg-card hover:border-border/80 transition-colors group">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border">
            <Puzzle className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{tool.name}</p>
                <p className="text-[11px] text-muted-foreground/60">by {tool.author_name}</p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0 border-border text-muted-foreground">
                <Tag className="w-2.5 h-2.5 mr-1" />{tool.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{tool.description}</p>
            <div className="flex items-center justify-between mt-2.5">
              <span className="text-[11px] text-muted-foreground/60">{tool.upvotes} upvotes</span>
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-medium text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
                onClick={e => e.stopPropagation()}
              >
                Visit <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ToolsPanel({ isSignedIn }: { isSignedIn: boolean }) {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showSubmit, setShowSubmit] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<ToolCategory | "All">("All")

  async function fetchTools() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/v1/tools")
      const data = await res.json()
      setTools(data.tools ?? [])
    } catch {
      setError("Failed to load tools")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTools() }, [])

  const filtered = categoryFilter === "All" ? tools : tools.filter(t => t.category === categoryFilter)

  return (
    <div className="space-y-5">
      {showSubmit && (
        <SubmitToolModal onClose={() => setShowSubmit(false)} onSubmitted={fetchTools} />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Tools & Plugins</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Community-submitted tools, scripts, bots, and plugins for traders.</p>
        </div>
        {isSignedIn && (
          <Button type="button" size="sm" onClick={() => setShowSubmit(true)} className="gap-1.5 shrink-0">
            <Plus className="w-3.5 h-3.5" />Submit Tool
          </Button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        {(["All", ...TOOL_CATEGORIES] as const).map(c => (
          <button
            type="button"
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
              categoryFilter === c
                ? "border-foreground/30 text-foreground bg-muted"
                : "border-border text-muted-foreground hover:text-foreground bg-transparent"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm text-red-400 py-8 justify-center">
          <AlertCircle className="w-4 h-4" />{error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Puzzle className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold text-foreground mb-1">No tools yet{categoryFilter !== "All" ? ` in ${categoryFilter}` : ""}</p>
          <p className="text-xs text-muted-foreground mb-4">Be the first to share a tool with the community.</p>
          {isSignedIn && (
            <Button type="button" size="sm" onClick={() => setShowSubmit(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />Submit the first tool
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(t => <ToolCard key={t.id} tool={t} />)}
        </div>
      )}
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
            <button type="button" aria-label="Close" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0">
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
                  type="button"
                  aria-label={isMine ? "Leave community" : "Join community"}
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

type Tab = "communities" | "tools"

export default function CommunitiesPage({ onNavigateToCommunity, onNavigate }: Props) {
  const { isSignedIn } = useAuth()
  const { getCommunities, getMyJoinedCommunities, joinCommunity, leaveCommunity } = useAccount()

  const [tab, setTab] = useState<Tab>("communities")
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {showCreate && (
        <CreateCommunityModal
          onClose={() => setShowCreate(false)}
          onCreated={slug => { setShowCreate(false); onNavigateToCommunity(slug) }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Communities</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Discover groups built around trading strategies, markets, and ideas.
            {tab === "communities" && total > 0 && <span className="ml-1 text-muted-foreground/60">{total.toLocaleString()} communities</span>}
          </p>
        </div>
        {tab === "communities" && isSignedIn && (
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 shrink-0">
            <Plus className="w-3.5 h-3.5" />New community
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border">
        {([["communities", "Communities", <Users key="u" className="w-3.5 h-3.5" />], ["tools", "Tools & Plugins", <Puzzle key="p" className="w-3.5 h-3.5" />]] as const).map(([id, label, icon]) => (
          <button
            type="button"
            key={id}
            onClick={() => setTab(id as Tab)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer bg-transparent ${
              tab === id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {icon}{label}
          </button>
        ))}
        <div className="ml-auto pb-2.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onNavigate("community-standards")}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-0"
          >
            Community Standards <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {tab === "tools" && <ToolsPanel isSignedIn={!!isSignedIn} />}

      {tab === "communities" && <>

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
              type="button"
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
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold text-foreground mb-1">
            {q ? "No communities found" : "No communities yet"}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {q ? `Nothing matched "${q}" - try a different search.` : "Be the first to start a community around your trading niche."}
          </p>
          {isSignedIn && !q && (
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />Create the first community
            </Button>
          )}
          {!isSignedIn && !q && (
            <p className="text-xs text-muted-foreground">Sign in to create a community.</p>
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

      </>}
    </div>
  )
}
