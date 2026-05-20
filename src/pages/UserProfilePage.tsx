import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Heart, MessageCircle, Loader2, AlertCircle, Users } from "lucide-react"
import { useAccount } from "@/hooks/useAccount"
import { UserVerifiedBadge, StaffBadge } from "@/components/VerificationBadge"
import type { Route } from "@/App"

const TYPE_COLORS: Record<string, string> = {
  general:  "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  trade:    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  analysis: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  question: "bg-amber-500/10 text-amber-500 border-amber-500/20",
}
const TYPE_LABELS: Record<string, string> = {
  general: "General", trade: "Trade", analysis: "Analysis", question: "Question",
}

interface ProfilePost {
  id: number
  share_id: string | null
  title: string
  post_type: string
  likes: number
  comment_count: number
  created_at: string
  display_name: string | null
  community_slug: string | null
  community_display_name: string | null
}

interface Profile {
  profile_id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  is_verified: boolean
  is_staff: boolean
  created_at: string
  posts: ProfilePost[]
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

function joinedDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

interface Props {
  profileId: string
  onNavigate: (r: Route) => void
  onNavigateToPost: (shareId: string) => void
  onNavigateToCommunity: (slug: string) => void
}

export default function UserProfilePage({ profileId, onNavigate, onNavigateToPost, onNavigateToCommunity }: Props) {
  const { getPublicProfile } = useAccount()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    setError(null)
    getPublicProfile(profileId)
      .then((data: Profile & { error?: string }) => {
        if (data.error) { setNotFound(true); return }
        setProfile(data)
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false))
  }, [profileId, getPublicProfile])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 flex flex-col items-center text-center gap-4">
        <p className="text-4xl">👤</p>
        <p className="text-lg font-bold text-foreground">Profile not found</p>
        <p className="text-sm text-muted-foreground">This user doesn't exist or their profile is unavailable.</p>
        <Button size="sm" variant="outline" onClick={() => onNavigate("community")} className="mt-2">
          Back to Community
        </Button>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 flex flex-col items-center text-center gap-3">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error ?? "Something went wrong."}</p>
        <Button size="sm" variant="outline" onClick={() => onNavigate("community")} className="mt-2">
          Back
        </Button>
      </div>
    )
  }

  const displayName = profile.display_name ?? "Anonymous"
  const initial = displayName[0].toUpperCase()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

      {/* Back */}
      <button
        type="button"
        onClick={() => onNavigate("community")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Community
      </button>

      {/* Profile header */}
      <Card className="border-border bg-card mb-6">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start gap-5">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-border"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center text-2xl font-bold text-zinc-300 shrink-0 border-2 border-border">
                {initial}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
                {profile.is_staff && <StaffBadge size="sm" />}
                {profile.is_verified && <UserVerifiedBadge size="sm" />}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Member since {joinedDate(profile.created_at)}
                <span className="mx-1.5 opacity-40">·</span>
                {profile.posts.length} post{profile.posts.length !== 1 ? "s" : ""}
              </p>
              {profile.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3">Recent Posts</h2>

        {profile.posts.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl px-6 py-12 flex flex-col items-center text-center gap-2">
            <p className="text-sm text-muted-foreground">No posts yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {profile.posts.map(post => (
              <button
                key={post.id}
                type="button"
                onClick={() => post.share_id && onNavigateToPost(post.share_id)}
                className="w-full text-left border border-border bg-card hover:border-border/60 hover:bg-muted/30 rounded-xl px-4 py-3.5 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <p className="text-sm font-semibold text-foreground leading-snug">{post.title}</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${TYPE_COLORS[post.post_type] ?? TYPE_COLORS.general}`}
                  >
                    {TYPE_LABELS[post.post_type] ?? post.post_type}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
                  {post.community_slug && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); onNavigateToCommunity(post.community_slug!) }}
                      className="flex items-center gap-0.5 hover:text-muted-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
                    >
                      <Users className="w-2.5 h-2.5 mr-0.5" />c/{post.community_slug}
                    </button>
                  )}
                  <span className="flex items-center gap-1">
                    <Heart className="w-2.5 h-2.5" />{post.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-2.5 h-2.5" />{Number(post.comment_count)}
                  </span>
                  <span>{timeAgo(post.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
