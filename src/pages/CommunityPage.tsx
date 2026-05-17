import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@clerk/clerk-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Users, ArrowRight, Bot, Coffee, Heart, Trash2, Plus, Loader2, AlertCircle, Send } from "lucide-react"
import { useAccount } from "@/hooks/useAccount"
import type { Route } from "@/App"

const KOFI_URL = "https://ko-fi.com/polymartco"

const TYPE_LABELS: Record<string, string> = {
  general:  "General",
  trade:    "Trade",
  analysis: "Analysis",
  question: "Question",
}

const TYPE_COLORS: Record<string, string> = {
  general:  "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  trade:    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  analysis: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  question: "bg-amber-500/10 text-amber-500 border-amber-500/20",
}

interface Post {
  id: number
  clerk_id: string
  display_name: string | null
  avatar_url: string | null
  title: string
  body: string
  post_type: string
  likes: number
  created_at: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function Avatar({ name, url, size = 8 }: { name: string | null; url: string | null; size?: number }) {
  const initial = (name || "?")[0].toUpperCase()
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? "User"}
        className={`w-${size} h-${size} rounded-full object-cover shrink-0`}
      />
    )
  }
  return (
    <div
      className={`w-${size} h-${size} rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0`}
    >
      {initial}
    </div>
  )
}

function PostCard({
  post,
  currentUserId,
  onLike,
  onDelete,
}: {
  post: Post
  currentUserId: string | null | undefined
  onLike: (id: number) => void
  onDelete: (id: number) => void
}) {
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(post.likes)
  const [expanded, setExpanded] = useState(false)
  const isLong = post.body.length > 280
  const bodyText = isLong && !expanded ? post.body.slice(0, 280) + "…" : post.body
  const isOwn = currentUserId === post.clerk_id

  function handleLike() {
    if (liked) return
    setLiked(true)
    setLikes(l => l + 1)
    onLike(post.id)
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar name={post.display_name} url={post.avatar_url} size={8} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-semibold text-foreground truncate">
                {post.display_name ?? "Anonymous"}
              </span>
              <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
              <Badge variant="outline" className={`text-[10px] ${TYPE_COLORS[post.post_type] ?? TYPE_COLORS.general}`}>
                {TYPE_LABELS[post.post_type] ?? post.post_type}
              </Badge>
            </div>

            <p className="text-sm font-semibold text-foreground mb-1">{post.title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
              {bodyText}
            </p>
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded(e => !e)}
                className="text-xs text-muted-foreground hover:text-foreground mt-1 cursor-pointer bg-transparent border-0 p-0"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}

            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={handleLike}
                className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer bg-transparent border-0 p-0 ${
                  liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"
                }`}
                title={liked ? "Liked" : "Like"}
              >
                <Heart className={`w-3.5 h-3.5 ${liked ? "fill-rose-500" : ""}`} />
                <span>{likes}</span>
              </button>

              {isOwn && (
                <button
                  type="button"
                  onClick={() => onDelete(post.id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer bg-transparent border-0 p-0 ml-auto"
                  title="Delete post"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ComposeForm({ onPosted }: { onPosted: (post: Post) => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [postType, setPostType] = useState("general")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { createCommunityPost } = useAccount()

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const post = await createCommunityPost({ title: title.trim(), body: body.trim(), post_type: postType })
      onPosted(post)
      setTitle("")
      setBody("")
      setPostType("general")
      setOpen(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to post")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border bg-card hover:border-foreground/30 hover:bg-card/80 transition-colors cursor-pointer text-left"
      >
        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
          <Plus className="w-3.5 h-3.5 text-zinc-400" />
        </div>
        <span className="text-sm text-muted-foreground">What's on your mind? Share a trade, analysis, or question...</span>
      </button>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex gap-2">
          {(["general", "trade", "analysis", "question"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setPostType(t)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                postType === t
                  ? TYPE_COLORS[t]
                  : "border-border text-muted-foreground bg-transparent hover:border-foreground/30"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <Input
          placeholder="Title (required)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={280}
          className="text-sm"
        />

        <Textarea
          placeholder="Share your trade, analysis, or question..."
          value={body}
          onChange={e => setBody(e.target.value)}
          maxLength={2000}
          rows={4}
          className="text-sm resize-none"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{body.length}/2000</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setOpen(false); setError(null) }}
              disabled={submitting}
              className="text-xs h-7"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !body.trim()}
              className="text-xs h-7 gap-1.5"
            >
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Post
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "trade", label: "Trades" },
  { value: "analysis", label: "Analysis" },
  { value: "question", label: "Questions" },
  { value: "general", label: "General" },
]

interface Props {
  onNavigate: (r: Route) => void
}

export default function CommunityPage({ onNavigate }: Props) {
  const { isSignedIn, userId } = useAuth()
  const { getCommunityPosts, likePost, deletePost } = useAccount()

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [typeFilter, setTypeFilter] = useState("")
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(async (p: number, type: string, replace: boolean) => {
    try {
      const data = await getCommunityPosts({ page: p, type: type || undefined })
      if (replace) {
        setPosts(data.posts)
      } else {
        setPosts(prev => [...prev, ...data.posts])
      }
      setTotalPages(data.pages)
    } catch {
      setError("Failed to load posts")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [getCommunityPosts])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    load(1, typeFilter, true)
  }, [typeFilter, load])

  function handleLoadMore() {
    const next = page + 1
    setPage(next)
    setLoadingMore(true)
    load(next, typeFilter, false)
  }

  function handlePosted(post: Post) {
    setPosts(prev => [post, ...prev])
  }

  function handleLike(id: number) {
    likePost(id).catch(() => {})
  }

  function handleDelete(id: number) {
    deletePost(id)
      .then(() => setPosts(prev => prev.filter(p => p.id !== id)))
      .catch(() => {})
  }

  return (
    <div className="max-w-[740px] mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-8">

      {/* Hero */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="text-xs border-border gap-1.5">
            <Users className="w-3 h-3" /> Community
          </Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
          Community Feed
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-md">
          Share your trades, analysis, and questions with other Polymart traders. No real money, just real strategy.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href="https://discord.com/oauth2/authorize?client_id=1503197938027860102"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
            style={{ background: "#5865f2" }}
          >
            <Bot className="w-3.5 h-3.5" />
            Join on Discord
          </a>
          <button
            onClick={() => onNavigate("community-blog")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
          >
            Browse the blog <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Compose */}
      {isSignedIn ? (
        <ComposeForm onPosted={handlePosted} />
      ) : (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-dashed border-border bg-card">
          <span className="text-sm text-muted-foreground">Sign in to post, like, and join the conversation.</span>
          <Button size="sm" onClick={() => onNavigate("sign-in")} className="text-xs h-7 shrink-0">
            Sign in
          </Button>
        </div>
      )}

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.value}
            type="button"
            onClick={() => setTypeFilter(f.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
              typeFilter === f.value
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground bg-transparent hover:border-foreground/40 hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm text-destructive py-8">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      ) : posts.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl px-6 py-20 flex flex-col items-center text-center gap-3">
          <p className="text-2xl">💬</p>
          <p className="text-sm font-semibold text-foreground">No posts yet</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {typeFilter ? "No posts in this category yet." : "Be the first to share a trade, analysis, or question."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={userId}
              onLike={handleLike}
              onDelete={handleDelete}
            />
          ))}

          {page < totalPages && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="text-xs"
              >
                {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Sponsor segment */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
            <Coffee className="w-5 h-5 text-rose-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground mb-1">Support the community</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Polymart is free, ad-free, and community-supported. If it's been useful to you,
              buying a coffee helps keep the servers running and new features shipping.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#FF5E5B] hover:bg-[#e54e4b] text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors no-underline"
            >
              <Coffee className="w-3.5 h-3.5" />
              Buy a coffee
            </a>
            <button
              onClick={() => onNavigate("sponsor")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              Learn more <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
