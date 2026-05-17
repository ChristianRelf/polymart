import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@clerk/clerk-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Users, Loader2, AlertCircle, Heart, Trash2, MessageCircle, Pencil,
  Flag, Link, Shield, Settings, ChevronLeft, Pin, EyeOff, Send,
  CornerDownRight, Check,
} from "lucide-react"
import { useAccount } from "@/hooks/useAccount"
import { MarkdownBody } from "@/components/MarkdownBody"
import { MarkdownEditor } from "@/components/MarkdownEditor"
import { CommunitySidebar } from "@/components/CommunitySidebar"
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
  is_member: boolean
  user_role: "member" | "moderator" | "owner" | null
  is_banned: boolean
  verification_type: "none" | "verified" | "official" | null
  rules: { id: number; title: string; description: string | null }[]
  moderators: { clerk_id: string; role: string; display_name: string; avatar_url: string | null }[]
}

interface Post {
  id: number
  share_id: string | null
  clerk_id: string
  display_name: string | null
  avatar_url: string | null
  title: string
  body: string
  post_type: string
  likes: number
  is_pinned: number
  is_removed: number
  community_id: number | null
  comment_count: number
  created_at: string
}

const TYPE_COLORS: Record<string, string> = {
  general:  "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  trade:    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  analysis: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  question: "bg-amber-500/10 text-amber-500 border-amber-500/20",
}
const TYPE_LABELS: Record<string, string> = { general: "General", trade: "Trade", analysis: "Analysis", question: "Question" }

const REPORT_REASONS = ["Spam", "Misinformation", "Inappropriate", "Off-topic"] as const

interface Props {
  slug: string
  onNavigate: (r: Route) => void
  onNavigateToCommunity: (slug: string) => void
  onNavigateToMod: (slug: string) => void
  onNavigateToPost: (shareId: string) => void
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function CommunityIcon({ icon_url, display_name, size = "md" }: { icon_url: string | null; display_name: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-12 h-12 text-xl" : "w-10 h-10"
  if (icon_url) return <img src={icon_url} alt={display_name} className={`${sz} rounded-full object-cover border-2 border-background shrink-0`} />
  return (
    <div className={`${sz} rounded-full bg-muted flex items-center justify-center border-2 border-background font-bold text-muted-foreground shrink-0 text-lg`}>
      {display_name[0]?.toUpperCase() ?? "C"}
    </div>
  )
}

function PostCard({
  post, userId, isMod, onDelete, onLike, onReport, onPin, onUnpin, onRemove, onRestore, onNavigateToPost, uploadImage,
}: {
  post: Post
  userId: string | null | undefined
  isMod: boolean
  onDelete: (id: number) => void
  onLike: (id: number) => void
  onReport: (id: number, reason: string) => void
  onPin: (id: number) => void
  onUnpin: (id: number) => void
  onRemove: (id: number) => void
  onRestore: (id: number) => void
  onNavigateToPost: (shareId: string) => void
  uploadImage: (file: File) => Promise<string>
}) {
  const [expanded, setExpanded] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCt, setLikeCt] = useState(post.likes)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title)
  const [editBody, setEditBody] = useState(post.body)
  const [editType, setEditType] = useState(post.post_type)
  const [editSaving, setEditSaving] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [copied, setCopied] = useState(false)
  const { updatePost } = useAccount()

  const isOwn = userId === post.clerk_id
  const isLong = post.body.length > 280 || post.body.includes("![")

  if (post.is_removed && !isMod) return null

  async function handleSaveEdit() {
    setEditSaving(true)
    try {
      await updatePost(post.id, { title: editTitle, body: editBody, post_type: editType })
      post.title = editTitle; post.body = editBody; post.post_type = editType
      setEditing(false)
    } catch { /* silent */ } finally {
      setEditSaving(false)
    }
  }

  function handleLike() {
    if (liked) return
    setLiked(true); setLikeCt(n => n + 1); onLike(post.id)
  }

  function handleCopy() {
    if (post.share_id) {
      const url = `${window.location.origin}/s/${post.share_id}`
      navigator.clipboard.writeText(url).catch(() => {})
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card className={`border-border bg-card ${post.is_pinned ? "border-amber-500/30" : ""} ${post.is_removed ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        {post.is_pinned > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-amber-500 mb-2">
            <Pin className="w-3 h-3" />Pinned
          </div>
        )}
        {post.is_removed > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-red-400 mb-2">
            <EyeOff className="w-3 h-3" />Removed by moderator
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          {post.avatar_url
            ? <img src={post.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
            : <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-muted-foreground">{post.display_name?.[0]?.toUpperCase() ?? "?"}</div>
          }
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{post.display_name ?? "Anonymous"}</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{timeAgo(post.created_at)}</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${TYPE_COLORS[post.post_type] ?? TYPE_COLORS.general}`}>
                {TYPE_LABELS[post.post_type] ?? post.post_type}
              </Badge>
            </div>
          </div>
        </div>

        {/* Edit mode */}
        {editing ? (
          <div className="space-y-2 mt-2">
            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} maxLength={280} className="text-sm font-semibold h-9" />
            <MarkdownEditor value={editBody} onChange={setEditBody} rows={6} onUploadImage={uploadImage} />
            <div className="flex gap-1.5 pt-1">
              {(["general","trade","analysis","question"] as const).map(t => (
                <button key={t} onClick={() => setEditType(t)} className={`text-[10px] px-2 py-1 rounded border cursor-pointer transition-colors ${editType === t ? "border-foreground text-foreground bg-muted" : "border-border text-muted-foreground bg-transparent hover:text-foreground"}`}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" disabled={editSaving} onClick={handleSaveEdit}>
                {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-foreground mb-1.5 leading-snug">{post.title}</h3>
            <div className={!expanded && isLong ? "line-clamp-4 overflow-hidden" : ""}>
              <MarkdownBody content={post.body} />
            </div>
            {isLong && !expanded && (
              <button onClick={() => setExpanded(true)} className="text-xs text-muted-foreground hover:text-foreground mt-1 cursor-pointer bg-transparent border-0 p-0">
                Read more
              </button>
            )}
          </>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/30">
          <button onClick={handleLike} className={`flex items-center gap-1 text-xs cursor-pointer bg-transparent border-0 transition-colors ${liked ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}>
            <Heart className={`w-3.5 h-3.5 ${liked ? "fill-red-400" : ""}`} />{likeCt}
          </button>
          {post.share_id && (
            <button onClick={() => post.share_id && onNavigateToPost(post.share_id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0 transition-colors">
              <MessageCircle className="w-3.5 h-3.5" />{post.comment_count}
            </button>
          )}
          {post.share_id && (
            <button onClick={handleCopy} className={`flex items-center gap-1 text-xs cursor-pointer bg-transparent border-0 transition-colors ${copied ? "text-emerald-400" : "text-muted-foreground hover:text-foreground"}`}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
            </button>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {isOwn && !editing && (
              <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {isOwn && (
              <button onClick={() => window.confirm("Delete this post?") && onDelete(post.id)} className="text-muted-foreground hover:text-red-400 cursor-pointer bg-transparent border-0 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {isMod && (
              <>
                {post.is_pinned ? (
                  <button onClick={() => onUnpin(post.id)} title="Unpin" className="text-amber-500 hover:text-muted-foreground cursor-pointer bg-transparent border-0 transition-colors">
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button onClick={() => onPin(post.id)} title="Pin" className="text-muted-foreground hover:text-amber-500 cursor-pointer bg-transparent border-0 transition-colors">
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                )}
                {post.is_removed ? (
                  <button onClick={() => onRestore(post.id)} title="Restore" className="text-muted-foreground hover:text-emerald-400 cursor-pointer bg-transparent border-0 transition-colors">
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button onClick={() => window.confirm("Remove this post?") && onRemove(post.id)} title="Remove" className="text-muted-foreground hover:text-red-400 cursor-pointer bg-transparent border-0 transition-colors">
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
            {!isOwn && userId && (
              <div className="relative">
                <button onClick={() => setShowReport(v => !v)} className="text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0 transition-colors">
                  <Flag className="w-3.5 h-3.5" />
                </button>
                {showReport && (
                  <div className="absolute right-0 top-5 z-20 bg-card border border-border rounded-lg shadow-lg p-2 w-44">
                    {REPORT_REASONS.map(r => (
                      <button key={r} onClick={() => { if (window.confirm(`Report as "${r}"?`)) { onReport(post.id, r); setShowReport(false) } }} className="block w-full text-left text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded cursor-pointer bg-transparent border-0 hover:bg-muted transition-colors">
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ComposeForm({ communityId, onPost, uploadImage }: {
  communityId: number
  onPost: (post: Post) => void
  uploadImage: (file: File) => Promise<string>
}) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [postType, setPostType] = useState("general")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { createCommunityPostScoped } = useAccount()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError("Title is required"); return }
    if (!body.trim()) { setError("Body is required"); return }
    setLoading(true); setError("")
    try {
      const post = await createCommunityPostScoped({ title: title.trim(), body: body.trim(), post_type: postType, community_id: communityId })
      setTitle(""); setBody(""); setPostType("general")
      onPost(post)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to post")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Post title..." maxLength={280} className="text-sm font-medium h-9" />
          <MarkdownEditor value={body} onChange={setBody} rows={4} placeholder="Share your thoughts..." onUploadImage={uploadImage} />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {(["general","trade","analysis","question"] as const).map(t => (
                <button key={t} type="button" onClick={() => setPostType(t)} className={`text-[10px] px-2 py-1 rounded border cursor-pointer transition-colors ${postType === t ? "border-foreground text-foreground bg-muted" : "border-border text-muted-foreground bg-transparent hover:text-foreground"}`}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <Button size="sm" type="submit" disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5" />Post</>}
            </Button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </form>
      </CardContent>
    </Card>
  )
}

export default function SubCommunityPage({ slug, onNavigate, onNavigateToMod, onNavigateToPost }: Props) {
  const { isSignedIn, userId } = useAuth()
  const {
    getCommunity, joinCommunity, leaveCommunity,
    getCommunityPostsBySlug, likePost, deletePost, reportPost,
    pinPost, unpinPost, removePost, restorePost,
    uploadCommunityImage,
  } = useAccount()

  const [community, setCommunity] = useState<Community | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [sort, setSort] = useState<"new" | "top">("new")
  const [loading, setLoading] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [error, setError] = useState("")
  const [joining, setJoining] = useState(false)

  const isMod = community?.user_role === "moderator" || community?.user_role === "owner"

  const fetchCommunity = useCallback(async () => {
    try {
      const data = await getCommunity(slug)
      setCommunity(data)
    } catch {
      setError("Community not found")
    }
  }, [getCommunity, slug])

  const fetchPosts = useCallback(async (p = 1, s = sort) => {
    setLoadingPosts(true)
    try {
      const data = await getCommunityPostsBySlug(slug, { page: p, sort: s })
      setPosts(data.posts ?? [])
      setPages(data.pages ?? 1)
      setPage(p)
    } catch { /* silent */ } finally {
      setLoadingPosts(false)
    }
  }, [getCommunityPostsBySlug, slug, sort])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchCommunity(), fetchPosts(1)]).finally(() => setLoading(false))
  }, [slug])

  async function handleJoin() {
    setJoining(true)
    try {
      await joinCommunity(slug)
      await fetchCommunity()
    } catch { /* silent */ } finally {
      setJoining(false)
    }
  }

  async function handleLeave() {
    if (!window.confirm("Leave this community?")) return
    setJoining(true)
    try {
      await leaveCommunity(slug)
      await fetchCommunity()
    } catch { /* silent */ } finally {
      setJoining(false)
    }
  }

  function handleSort(s: "new" | "top") {
    setSort(s)
    fetchPosts(1, s)
  }

  const uploadImage = (file: File) => uploadCommunityImage(file)

  if (loading) return (
    <div className="flex justify-center items-center py-24">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  )

  if (error || !community) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-400" />
      <p className="text-sm text-muted-foreground">{error || "Community not found"}</p>
      <Button size="sm" variant="outline" className="mt-4" onClick={() => onNavigate("communities")}>
        Browse Communities
      </Button>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto">
      {/* Banner */}
      {community.banner_url && (
        <div className="w-full h-32 sm:h-48 overflow-hidden">
          <img src={community.banner_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Community header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-start gap-3">
            <div className={community.banner_url ? "-mt-8" : ""}>
              <CommunityIcon icon_url={community.icon_url} display_name={community.display_name} size="lg" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-foreground">{community.display_name}</h1>
                <VerificationBadge type={community.verification_type} size="sm" />
                {community.user_role === "owner" && (
                  <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500 bg-amber-500/5"><Shield className="w-2.5 h-2.5 mr-1" />Owner</Badge>
                )}
                {community.user_role === "moderator" && (
                  <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400 bg-blue-500/5"><Shield className="w-2.5 h-2.5 mr-1" />Mod</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono">c/{community.slug}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{community.member_count.toLocaleString()} members</span>
                <span>{community.post_count.toLocaleString()} posts</span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isMod && (
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => onNavigateToMod(slug)}>
                  <Settings className="w-3.5 h-3.5" />Mod Tools
                </Button>
              )}
              {isSignedIn && (
                community.user_role === "owner" ? null : community.is_member ? (
                  <Button size="sm" variant="outline" onClick={handleLeave} disabled={joining} className="h-8 text-xs">
                    {joining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Leave"}
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleJoin} disabled={joining || community.is_banned} className="h-8 text-xs">
                    {joining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : community.is_banned ? "Banned" : "Join"}
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body: left nav + feed + right sidebar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex gap-6">

        {/* Left: communities navigation */}
        <aside className="hidden xl:block w-48 shrink-0 sticky top-4 self-start">
          <CommunitySidebar
            currentSlug={slug}
            onNavigate={onNavigate}
            onNavigateToCommunity={onNavigateToCommunity}
          />
        </aside>

        {/* Feed */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Back link (mobile only — xl has sidebar) */}
          <button onClick={() => onNavigate("community")} className="xl:hidden flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />Community
          </button>

          {/* Compose */}
          {community.is_member && !community.is_banned && (
            <ComposeForm
              communityId={community.id}
              onPost={post => setPosts(prev => [post, ...prev])}
              uploadImage={uploadImage}
            />
          )}
          {community.is_banned && (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardContent className="p-4 text-sm text-red-400">You are banned from posting in this community.</CardContent>
            </Card>
          )}
          {!isSignedIn && (
            <Card className="border-border bg-card/50">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Sign in to join and post in this community</p>
                <Button size="sm" onClick={() => onNavigate("sign-in")}>Sign In</Button>
              </CardContent>
            </Card>
          )}
          {isSignedIn && !community.is_member && !community.is_banned && (
            <Card className="border-border bg-card/50">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Join this community to post</p>
                <Button size="sm" onClick={handleJoin} disabled={joining}>
                  {joining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Join to post"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Sort tabs */}
          <div className="flex items-center gap-1">
            {(["new","top"] as const).map(s => (
              <button key={s} onClick={() => handleSort(s)} className={`text-xs px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${sort === s ? "border-foreground/30 text-foreground bg-muted" : "border-border text-muted-foreground hover:text-foreground bg-transparent"}`}>
                {s === "new" ? "New" : "Top"}
              </button>
            ))}
          </div>

          {/* Posts */}
          {loadingPosts ? (
            <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CornerDownRight className="w-7 h-7 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No posts yet — be the first to share something!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map(p => (
                <PostCard
                  key={p.id}
                  post={p}
                  userId={userId}
                  isMod={isMod}
                  onDelete={async id => { if (await deletePost(id).then(() => true).catch(() => false)) setPosts(prev => prev.filter(x => x.id !== id)) }}
                  onLike={id => likePost(id)}
                  onReport={(id, reason) => reportPost(id, reason)}
                  onPin={async id => { await pinPost(slug, id); fetchPosts(page) }}
                  onUnpin={async id => { await unpinPost(slug, id); fetchPosts(page) }}
                  onRemove={async id => { await removePost(slug, id); fetchPosts(page) }}
                  onRestore={async id => { await restorePost(slug, id); fetchPosts(page) }}
                  onNavigateToPost={onNavigateToPost}
                  uploadImage={uploadImage}
                />
              ))}
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => fetchPosts(page - 1)}>Previous</Button>
              <span className="text-xs text-muted-foreground">{page} / {pages}</span>
              <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => fetchPosts(page + 1)}>Next</Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-64 shrink-0 hidden lg:block space-y-4">

          {/* About */}
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">About</p>
              {community.description ? (
                <p className="text-sm text-muted-foreground leading-relaxed">{community.description}</p>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic">No description yet.</p>
              )}
              <div className="mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground/60 space-y-1">
                <p>Created {new Date(community.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</p>
              </div>
            </CardContent>
          </Card>

          {/* Rules */}
          {community.rules.length > 0 && (
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">Rules</p>
                <ol className="space-y-2">
                  {community.rules.map((rule, i) => (
                    <li key={rule.id} className="text-xs">
                      <span className="font-medium text-foreground">{i + 1}. {rule.title}</span>
                      {rule.description && <p className="text-muted-foreground mt-0.5 leading-relaxed">{rule.description}</p>}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Moderators */}
          {community.moderators.length > 0 && (
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">Moderators</p>
                <div className="space-y-2">
                  {community.moderators.map(m => (
                    <div key={m.clerk_id} className="flex items-center gap-2">
                      {m.avatar_url
                        ? <img src={m.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                        : <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{m.display_name[0]?.toUpperCase()}</div>
                      }
                      <span className="text-xs text-muted-foreground">{m.display_name}</span>
                      {m.role === "owner" && <Shield className="w-3 h-3 text-amber-500 ml-auto" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mod tools shortcut */}
          {isMod && (
            <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => onNavigateToMod(slug)}>
              <Settings className="w-3.5 h-3.5" />Mod Tools
            </Button>
          )}
        </aside>
      </div>
    </div>
  )
}
