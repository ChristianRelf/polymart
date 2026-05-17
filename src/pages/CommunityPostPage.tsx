import { useState, useEffect } from "react"
import { useAuth } from "@clerk/clerk-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft, Heart, MessageCircle, Loader2, AlertCircle,
  Send, Trash2, Check, Link, CornerDownRight,
} from "lucide-react"
import { useAccount } from "@/hooks/useAccount"
import { MarkdownBody } from "@/components/MarkdownBody"
import type { Route } from "@/App"

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
  parent_id: number | null
  clerk_id: string
  display_name: string | null
  avatar_url: string | null
  body: string
  created_at: string
}

interface CommentNode extends Comment {
  children: CommentNode[]
}

function buildTree(flat: Comment[]): CommentNode[] {
  const map = new Map<number, CommentNode>()
  for (const c of flat) map.set(c.id, { ...c, children: [] })
  const roots: CommentNode[] = []
  for (const c of flat) {
    const node = map.get(c.id)!
    if (c.parent_id != null && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
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
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function Avatar({ name, url, size = 10 }: { name: string | null; url: string | null; size?: number }) {
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
      className={`w-${size} h-${size} rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-300 shrink-0`}
    >
      {initial}
    </div>
  )
}

// ── CommentThread (full-size, for post detail page) ───────────────────────────

function CommentThread({
  node,
  depth,
  postAuthorId,
  currentUserId,
  isSignedIn,
  onDelete,
  onSubmitReply,
}: {
  node: CommentNode
  depth: number
  postAuthorId: string
  currentUserId: string | null | undefined
  isSignedIn: boolean
  onDelete: (id: number) => void
  onSubmitReply: (parentId: number | null, body: string) => Promise<void>
}) {
  const [replying, setReplying]     = useState(false)
  const [replyBody, setReplyBody]   = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  const canDelete = currentUserId === node.clerk_id || currentUserId === postAuthorId

  function startReply() {
    setReplyBody(node.display_name ? `@${node.display_name} ` : "")
    setReplyError(null)
    setReplying(true)
  }

  async function handleReply() {
    if (!replyBody.trim()) return
    setSubmitting(true)
    setReplyError(null)
    try {
      await onSubmitReply(node.id, replyBody.trim())
      setReplyBody("")
      setReplying(false)
    } catch (e: unknown) {
      setReplyError(e instanceof Error ? e.message : "Failed to post reply")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-border/30 pl-4 mt-3" : "mt-4"}>
      <div className="flex items-start gap-3">
        <Avatar name={node.display_name} url={node.avatar_url} size={7} />
        <div className="flex-1 min-w-0">
          <div className="bg-muted/40 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-foreground">
                {node.display_name ?? "Anonymous"}
              </span>
              <span className="text-[10px] text-muted-foreground">{timeAgo(node.created_at)}</span>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(node.id)}
                  className="ml-auto text-muted-foreground hover:text-destructive transition-colors cursor-pointer bg-transparent border-0 p-0"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            <MarkdownBody content={node.body} />
          </div>

          {isSignedIn && depth < 4 && (
            <button
              type="button"
              onClick={replying ? () => setReplying(false) : startReply}
              className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              <CornerDownRight className="w-3 h-3" />
              {replying ? "Cancel" : `Reply to ${node.display_name ?? "Anonymous"}`}
            </button>
          )}

          {replying && (
            <div className="mt-2 space-y-1.5">
              <Textarea
                autoFocus
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder={`Replying to ${node.display_name ?? "Anonymous"}...`}
                className="text-sm resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{replyBody.length}/2000</span>
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={submitting || !replyBody.trim()}
                  className="gap-1.5 h-7"
                >
                  {submitting
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Send className="w-3 h-3" />}
                  Post reply
                </Button>
              </div>
              {replyError && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {replyError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {node.children.map(child => (
        <CommentThread
          key={child.id}
          node={child}
          depth={Math.min(depth + 1, 4)}
          postAuthorId={postAuthorId}
          currentUserId={currentUserId}
          isSignedIn={isSignedIn}
          onDelete={onDelete}
          onSubmitReply={onSubmitReply}
        />
      ))}
    </div>
  )
}

// ── CommunityPostPage ─────────────────────────────────────────────────────────

export default function CommunityPostPage({
  shareId,
  onNavigate,
}: {
  shareId: string
  onNavigate: (r: Route) => void
}) {
  const { isSignedIn, userId } = useAuth()
  const { getPostByShareId, likePost, getComments, createComment, deleteComment } = useAccount()

  const [post, setPost]         = useState<Post | null>(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const [liked, setLiked]   = useState(false)
  const [likes, setLikes]   = useState(0)
  const [copied, setCopied] = useState(false)

  const [comments, setComments]               = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [rootBody, setRootBody]               = useState("")
  const [rootSubmitting, setRootSubmitting]   = useState(false)
  const [rootError, setRootError]             = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data: Post = await getPostByShareId(shareId)
        setPost(data)
        setLikes(data.likes)
        const cd = await getComments(data.id)
        setComments(cd.comments)
      } catch (e: unknown) {
        if (e instanceof Error && e.message === "not_found") {
          setNotFound(true)
        } else {
          setError("Failed to load post")
        }
      } finally {
        setLoading(false)
        setCommentsLoading(false)
      }
    }
    load()
  }, [shareId, getPostByShareId, getComments])

  function handleLike() {
    if (!post || liked) return
    setLiked(true)
    setLikes(l => l + 1)
    likePost(post.id).catch(() => {})
  }

  function handleShare() {
    if (!post?.share_id) return
    const url = `${window.location.origin}/s/${post.share_id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  async function handleSubmitReply(parentId: number | null, body: string) {
    if (!post) return
    const comment: Comment = await createComment(post.id, body, parentId)
    setComments(prev => [...prev, comment])
  }

  function handleDeleteComment(id: number) {
    if (!window.confirm("Delete this comment?")) return
    deleteComment(id)
      .then(() => {
        setComments(prev => {
          const toRemove = new Set<number>()
          function mark(cid: number) {
            toRemove.add(cid)
            prev.filter(c => c.parent_id === cid).forEach(c => mark(c.id))
          }
          mark(id)
          return prev.filter(c => !toRemove.has(c.id))
        })
      })
      .catch(() => {})
  }

  async function handleRootComment() {
    if (!post || !rootBody.trim()) return
    setRootSubmitting(true)
    setRootError(null)
    try {
      await handleSubmitReply(null, rootBody.trim())
      setRootBody("")
    } catch (e: unknown) {
      setRootError(e instanceof Error ? e.message : "Failed to post comment")
    } finally {
      setRootSubmitting(false)
    }
  }

  // ── Render states ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-[760px] mx-auto px-4 py-24 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-[760px] mx-auto px-4 py-24 flex flex-col items-center text-center gap-4">
        <p className="text-4xl">🔍</p>
        <p className="text-lg font-bold text-foreground">Post not found</p>
        <p className="text-sm text-muted-foreground">
          This post may have been deleted or the link is invalid.
        </p>
        <Button size="sm" variant="outline" onClick={() => onNavigate("community")} className="mt-2">
          Back to Community
        </Button>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="max-w-[760px] mx-auto px-4 py-24 flex flex-col items-center text-center gap-3">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error ?? "Something went wrong."}</p>
        <Button size="sm" variant="outline" onClick={() => onNavigate("community")} className="mt-2">
          Back to Community
        </Button>
      </div>
    )
  }

  // ── Post view ─────────────────────────────────────────────────────────────────

  const isOwn = userId === post.clerk_id
  const tree  = buildTree(comments)

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-12 sm:py-16">

      {/* Back link */}
      <button
        type="button"
        onClick={() => onNavigate("community")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Community
      </button>

      {/* Post card */}
      <Card className="border-border bg-card mb-8">
        <CardContent className="p-6 sm:p-8">

          {/* Author row */}
          <div className="flex items-center gap-3 mb-5">
            <Avatar name={post.display_name} url={post.avatar_url} size={10} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {post.display_name ?? "Anonymous"}
              </p>
              <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] shrink-0 ${TYPE_COLORS[post.post_type] ?? TYPE_COLORS.general}`}
            >
              {TYPE_LABELS[post.post_type] ?? post.post_type}
            </Badge>
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mb-4 leading-snug">
            {post.title}
          </h1>

          {/* Body — full markdown, no truncation */}
          <MarkdownBody content={post.body} className="mb-6" />

          {/* Action bar */}
          <div className="flex items-center gap-5 pt-4 border-t border-border/60">
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-sm transition-colors cursor-pointer bg-transparent border-0 p-0 ${
                liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"
              }`}
              title={liked ? "Liked" : "Like"}
            >
              <Heart className={`w-4 h-4 ${liked ? "fill-rose-500" : ""}`} />
              <span>{likes}</span>
            </button>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              <span>{comments.length}</span>
            </div>

            <button
              type="button"
              onClick={handleShare}
              className={`flex items-center gap-1.5 text-sm transition-colors cursor-pointer bg-transparent border-0 p-0 ml-auto ${
                copied ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Copy share link"
            >
              {copied ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
              <span className="text-xs">{copied ? "Copied!" : "Share"}</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Comments section */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-2">
          {comments.length === 1 ? "1 Reply" : `${comments.length} Replies`}
        </h2>

        {commentsLoading ? (
          <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading replies...
          </div>
        ) : (
          <>
            {comments.length === 0 && (
              <p className="text-sm text-muted-foreground py-2 mb-4">
                No replies yet. {isSignedIn ? "Be the first!" : "Sign in to reply."}
              </p>
            )}

            {/* Threaded comment tree */}
            <div className="mb-8">
              {tree.map(node => (
                <CommentThread
                  key={node.id}
                  node={node}
                  depth={0}
                  postAuthorId={post.clerk_id}
                  currentUserId={userId}
                  isSignedIn={!!isSignedIn}
                  onDelete={handleDeleteComment}
                  onSubmitReply={handleSubmitReply}
                />
              ))}
            </div>
          </>
        )}

        {/* Root compose */}
        {isSignedIn ? (
          <div className="space-y-2">
            {isOwn ? null : (
              <p className="text-xs text-muted-foreground">
                Replying to <span className="font-semibold text-foreground">{post.display_name ?? "Anonymous"}</span>'s post
              </p>
            )}
            <Textarea
              placeholder="Write a reply..."
              value={rootBody}
              onChange={e => setRootBody(e.target.value)}
              maxLength={2000}
              rows={3}
              className="text-sm resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{rootBody.length}/2000</span>
              <Button
                size="sm"
                onClick={handleRootComment}
                disabled={rootSubmitting || !rootBody.trim()}
                className="gap-1.5"
              >
                {rootSubmitting
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />}
                Reply
              </Button>
            </div>
            {rootError && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {rootError}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-dashed border-border bg-card">
            <span className="text-sm text-muted-foreground">Sign in to join the conversation.</span>
            <Button size="sm" onClick={() => onNavigate("sign-in")} className="text-xs h-7 shrink-0">
              Sign in
            </Button>
          </div>
        )}
      </div>

    </div>
  )
}
