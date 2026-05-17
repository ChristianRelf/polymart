import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@clerk/clerk-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Users, ArrowRight, Bot, Coffee, Heart, Trash2, Plus, Loader2,
  AlertCircle, Send, MessageCircle, Pencil, Flag, Check, Link,
} from "lucide-react"
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

const TYPE_FILTER_ITEMS = [
  { value: "",         label: "All Posts" },
  { value: "trade",    label: "Trades" },
  { value: "analysis", label: "Analysis" },
  { value: "question", label: "Questions" },
  { value: "general",  label: "General" },
]

const REPORT_REASONS = ["Spam", "Misinformation", "Inappropriate", "Off-topic"] as const
type ReportReason = typeof REPORT_REASONS[number]

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
  comment_count: number
  created_at: string
}

interface Comment {
  id: number
  post_id: number
  clerk_id: string
  display_name: string | null
  avatar_url: string | null
  body: string
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

// ── CommentsSection ───────────────────────────────────────────────────────────

function CommentsSection({
  postId,
  currentUserId,
  isSignedIn,
  onCountChange,
}: {
  postId: number
  currentUserId: string | null | undefined
  isSignedIn: boolean
  onCountChange: (delta: number) => void
}) {
  const { getComments, createComment, deleteComment } = useAccount()
  const [comments, setComments]   = useState<Comment[]>([])
  const [loading, setLoading]     = useState(true)
  const [body, setBody]           = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    getComments(postId)
      .then((data: { comments: Comment[] }) => setComments(data.comments))
      .catch(() => setError("Failed to load comments"))
      .finally(() => setLoading(false))
  }, [postId, getComments])

  async function handleComment() {
    if (!body.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const comment = await createComment(postId, body.trim())
      setComments(prev => [...prev, comment])
      setBody("")
      onCountChange(1)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to post comment")
    } finally {
      setSubmitting(false)
    }
  }

  function handleDeleteComment(id: number) {
    deleteComment(id)
      .then(() => {
        setComments(prev => prev.filter(c => c.id !== id))
        onCountChange(-1)
      })
      .catch(() => {})
  }

  if (loading) {
    return (
      <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading comments...
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/60">
      {comments.length === 0 ? (
        <p className="text-xs text-muted-foreground mb-3">No comments yet.</p>
      ) : (
        <div className="space-y-3 mb-4">
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar name={c.display_name} url={c.avatar_url} size={6} />
              <div className="flex-1 min-w-0 bg-muted/40 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold text-foreground">
                    {c.display_name ?? "Anonymous"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                  {currentUserId === c.clerk_id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(c.id)}
                      className="ml-auto text-muted-foreground hover:text-destructive transition-colors cursor-pointer bg-transparent border-0 p-0"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {c.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isSignedIn ? (
        <div className="flex items-start gap-2">
          <div className="flex-1 flex gap-2 items-end">
            <Textarea
              placeholder="Write a comment..."
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={1000}
              rows={2}
              className="text-xs resize-none flex-1"
            />
            <Button
              size="sm"
              onClick={handleComment}
              disabled={submitting || !body.trim()}
              className="shrink-0 h-8 px-3"
            >
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sign in to comment.</p>
      )}

      {error && (
        <div className="flex items-center gap-1 text-xs text-destructive mt-2">
          <AlertCircle className="w-3 h-3" /> {error}
        </div>
      )}
    </div>
  )
}

// ── EditPostForm ──────────────────────────────────────────────────────────────

function EditPostForm({
  post,
  onSave,
  onCancel,
}: {
  post: Post
  onSave: (updated: Partial<Post>) => void
  onCancel: () => void
}) {
  const { updatePost } = useAccount()
  const [title, setTitle]     = useState(post.title)
  const [body, setBody]       = useState(post.body)
  const [postType, setPostType] = useState(post.post_type)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSave() {
    setSubmitting(true)
    setError(null)
    try {
      await updatePost(post.id, { title: title.trim(), body: body.trim(), post_type: postType })
      onSave({ title: title.trim(), body: body.trim(), post_type: postType })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1.5 flex-wrap">
        {(["general", "trade", "analysis", "question"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setPostType(t)}
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
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
        value={title}
        onChange={e => setTitle(e.target.value)}
        maxLength={280}
        className="text-sm"
        placeholder="Title"
      />
      <Textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        maxLength={2000}
        rows={4}
        className="text-sm resize-none"
        placeholder="Post body"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{body.length}/2000</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={submitting} className="h-7 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={submitting || !title.trim() || !body.trim()}
            className="h-7 text-xs gap-1"
          >
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Save
          </Button>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ── ReportButton ──────────────────────────────────────────────────────────────

function ReportButton({
  postId,
  onReport,
}: {
  postId: number
  onReport: (postId: number, reason: string) => Promise<void>
}) {
  const [open, setOpen]         = useState(false)
  const [reported, setReported] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [open])

  if (reported) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Check className="w-3 h-3 text-emerald-500" /> Reported
      </span>
    )
  }

  async function handleReport(reason: ReportReason) {
    setSubmitting(true)
    try {
      await onReport(postId, reason)
      setReported(true)
    } catch {
      // silently ignore — user sees no change
    } finally {
      setSubmitting(false)
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={submitting}
        title="Report post"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-500 transition-colors cursor-pointer bg-transparent border-0 p-0"
      >
        <Flag className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-5 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[150px]">
          <p className="px-3 py-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
            Report reason
          </p>
          {REPORT_REASONS.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => handleReport(r)}
              className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors cursor-pointer bg-transparent border-0"
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── PostCard ──────────────────────────────────────────────────────────────────

function PostCard({
  post,
  currentUserId,
  isSignedIn,
  onLike,
  onDelete,
  onEdit,
  onReport,
}: {
  post: Post
  currentUserId: string | null | undefined
  isSignedIn: boolean
  onLike: (id: number) => void
  onDelete: (id: number) => void
  onEdit: (id: number, updated: Partial<Post>) => void
  onReport: (postId: number, reason: string) => Promise<void>
}) {
  const [liked, setLiked]           = useState(false)
  const [likes, setLikes]           = useState(post.likes)
  const [expanded, setExpanded]     = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentCount, setCommentCount] = useState(Number(post.comment_count))
  const [editing, setEditing]       = useState(false)
  const [copied, setCopied]         = useState(false)

  function handleShare() {
    if (!post.share_id) return
    const url = `${window.location.origin}/s/${post.share_id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  const isLong  = post.body.length > 320
  const bodyText = isLong && !expanded ? post.body.slice(0, 320) + "…" : post.body
  const isOwn   = currentUserId === post.clerk_id

  function handleLike() {
    if (liked) return
    setLiked(true)
    setLikes(l => l + 1)
    onLike(post.id)
  }

  function handleSaveEdit(updated: Partial<Post>) {
    onEdit(post.id, updated)
    setEditing(false)
  }

  return (
    <Card className="border-border bg-card transition-colors">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <Avatar name={post.display_name} url={post.avatar_url} size={8} />
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">
              {post.display_name ?? "Anonymous"}
            </span>
            <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
            <Badge
              variant="outline"
              className={`text-[10px] ml-auto shrink-0 ${TYPE_COLORS[post.post_type] ?? TYPE_COLORS.general}`}
            >
              {TYPE_LABELS[post.post_type] ?? post.post_type}
            </Badge>
          </div>
        </div>

        {/* Content / Edit form */}
        {editing ? (
          <EditPostForm
            post={post}
            onSave={handleSaveEdit}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <h3 className="text-sm font-bold text-foreground mb-1.5 leading-snug">{post.title}</h3>
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
          </>
        )}

        {/* Action bar */}
        {!editing && (
          <div className="flex items-center gap-4 mt-4">
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

            <button
              type="button"
              onClick={() => setCommentsOpen(o => !o)}
              className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer bg-transparent border-0 p-0 ${
                commentsOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              title="View comments"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{commentCount}</span>
            </button>

            <div className="ml-auto flex items-center gap-3">
              {post.share_id && (
                <button
                  type="button"
                  onClick={handleShare}
                  className={`flex items-center gap-1 text-xs transition-colors cursor-pointer bg-transparent border-0 p-0 ${
                    copied ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Copy share link"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
                </button>
              )}
              {isOwn ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
                    title="Edit post"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(post.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer bg-transparent border-0 p-0"
                    title="Delete post"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                isSignedIn && <ReportButton postId={post.id} onReport={onReport} />
              )}
            </div>
          </div>
        )}

        {/* Inline comments */}
        {commentsOpen && !editing && (
          <CommentsSection
            postId={post.id}
            currentUserId={currentUserId}
            isSignedIn={isSignedIn}
            onCountChange={delta => setCommentCount(c => c + delta)}
          />
        )}
      </CardContent>
    </Card>
  )
}

// ── ComposeForm ───────────────────────────────────────────────────────────────

function ComposeForm({ onPosted }: { onPosted: (post: Post) => void }) {
  const [open, setOpen]         = useState(false)
  const [title, setTitle]       = useState("")
  const [body, setBody]         = useState("")
  const [postType, setPostType] = useState("general")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string | null>(null)
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
        <span className="text-sm text-muted-foreground">
          What's on your mind? Share a trade, analysis, or question...
        </span>
      </button>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
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
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── CommunityPage ─────────────────────────────────────────────────────────────

interface Props {
  onNavigate: (r: Route) => void
}

export default function CommunityPage({ onNavigate }: Props) {
  const { isSignedIn, userId } = useAuth()
  const { getCommunityPosts, likePost, deletePost, reportPost } = useAccount()

  const [posts, setPosts]           = useState<Post[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [typeFilter, setTypeFilter] = useState("")
  const [sort, setSort]             = useState<"new" | "top">("new")
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(
    async (p: number, type: string, s: string, replace: boolean) => {
      try {
        const data = await getCommunityPosts({ page: p, type: type || undefined, sort: s })
        setPosts(prev => replace ? data.posts : [...prev, ...data.posts])
        setTotalPages(data.pages)
      } catch {
        setError("Failed to load posts")
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [getCommunityPosts]
  )

  useEffect(() => {
    setLoading(true)
    setError(null)
    setPage(1)
    load(1, typeFilter, sort, true)
  }, [typeFilter, sort, load])

  function handleLoadMore() {
    const next = page + 1
    setPage(next)
    setLoadingMore(true)
    load(next, typeFilter, sort, false)
  }

  const handlePosted = useCallback((post: Post) => {
    setPosts(prev => [post, ...prev])
  }, [])

  const handleLike = useCallback((id: number) => {
    likePost(id).catch(() => {})
  }, [likePost])

  const handleDelete = useCallback((id: number) => {
    deletePost(id)
      .then(() => setPosts(prev => prev.filter(p => p.id !== id)))
      .catch(() => {})
  }, [deletePost])

  const handleEdit = useCallback((id: number, updated: Partial<Post>) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
  }, [])

  const handleReport = useCallback(async (postId: number, reason: string) => {
    await reportPost(postId, reason)
  }, [reportPost])

  // Sidebar nav used on both desktop and mobile (different layouts)
  function FilterNav({ vertical }: { vertical: boolean }) {
    const base = vertical
      ? "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer bg-transparent border-0 text-left"
      : "shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors cursor-pointer"

    const active = vertical
      ? "bg-muted text-foreground font-semibold"
      : "bg-foreground text-background border-foreground"

    const inactive = vertical
      ? "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      : "border-border text-muted-foreground bg-transparent hover:border-foreground/40 hover:text-foreground"

    return (
      <>
        {TYPE_FILTER_ITEMS.map(f => (
          <button
            key={f.value}
            type="button"
            onClick={() => setTypeFilter(f.value)}
            className={`${base} ${typeFilter === f.value ? active : inactive}`}
          >
            {f.label}
          </button>
        ))}
      </>
    )
  }

  function SortNav({ vertical }: { vertical: boolean }) {
    const base = vertical
      ? "flex-1 text-sm py-1.5 rounded-lg border transition-colors cursor-pointer"
      : "shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors cursor-pointer"
    const active = "bg-foreground text-background border-foreground"
    const inactive = "border-border text-muted-foreground bg-transparent hover:border-foreground/40 hover:text-foreground"

    return (
      <>
        {(["new", "top"] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setSort(s)}
            className={`${base} ${sort === s ? active : inactive}`}
          >
            {s === "new" ? "Newest" : "Top"}
          </button>
        ))}
      </>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-xs border-border gap-1.5">
            <Users className="w-3 h-3" /> Community
          </Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-2">
          Community Feed
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-lg">
          Share trades, analysis, and questions with other Polymart traders. No real money, just real strategy.
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

      {/* Mobile filter + sort strip */}
      <div className="xl:hidden flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        <FilterNav vertical={false} />
        <div className="w-px bg-border shrink-0 mx-1" />
        <SortNav vertical={false} />
      </div>

      {/* Two-column layout */}
      <div className="flex gap-8 items-start">

        {/* Desktop sidebar */}
        <aside className="hidden xl:block w-52 shrink-0 sticky top-6">
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 px-3">
                Feed
              </p>
              <div className="space-y-0.5">
                <FilterNav vertical={true} />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 px-3">
                Sort
              </p>
              <div className="flex gap-1.5 px-1">
                <SortNav vertical={true} />
              </div>
            </div>

            <a
              href="https://discord.com/oauth2/authorize?client_id=1503197938027860102"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-white no-underline transition-opacity hover:opacity-90 w-full"
              style={{ background: "#5865f2" }}
            >
              <Bot className="w-3.5 h-3.5" />
              Join Discord
            </a>
          </div>
        </aside>

        {/* Main feed */}
        <main className="flex-1 min-w-0 space-y-4">

          {/* Compose / sign-in nudge */}
          {isSignedIn ? (
            <ComposeForm onPosted={handlePosted} />
          ) : (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-dashed border-border bg-card">
              <span className="text-sm text-muted-foreground">
                Sign in to post, like, and join the conversation.
              </span>
              <Button size="sm" onClick={() => onNavigate("sign-in")} className="text-xs h-7 shrink-0">
                Sign in
              </Button>
            </div>
          )}

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
                {typeFilter
                  ? `No ${TYPE_LABELS[typeFilter]?.toLowerCase()} posts yet.`
                  : "Be the first to share a trade, analysis, or question."}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={userId}
                    isSignedIn={!!isSignedIn}
                    onLike={handleLike}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onReport={handleReport}
                  />
                ))}
              </div>
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
            </>
          )}
        </main>
      </div>

      {/* Sponsor */}
      <div className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
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
