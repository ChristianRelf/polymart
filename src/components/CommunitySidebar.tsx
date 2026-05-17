import { useState, useEffect } from "react"
import { useAuth } from "@clerk/clerk-react"
import { Plus, ArrowRight } from "lucide-react"
import { useAccount } from "@/hooks/useAccount"
import { VerificationBadge } from "@/components/VerificationBadge"
import type { Route } from "@/App"

interface Community {
  id: number
  slug: string
  display_name: string
  icon_url: string | null
  member_count: number
  verification_type?: string | null
}

interface Props {
  currentSlug?: string | null
  onNavigate: (r: Route) => void
  onNavigateToCommunity: (slug: string) => void
}

export function CommunitySidebar({ currentSlug, onNavigate, onNavigateToCommunity }: Props) {
  const { isSignedIn } = useAuth()
  const { getMyJoinedCommunities, getCommunities } = useAccount()
  const [mine, setMine] = useState<Community[]>([])
  const [popular, setPopular] = useState<Community[]>([])

  useEffect(() => {
    getCommunities({ sort: "members", page: 1 })
      .then((d: { communities?: Community[] }) => setPopular((d.communities ?? []).slice(0, 8)))
      .catch(() => {})
    if (isSignedIn) {
      getMyJoinedCommunities()
        .then((d: { communities?: Community[] }) => setMine((d.communities ?? []).slice(0, 10)))
        .catch(() => {})
    }
  }, [isSignedIn])

  const mySet = new Set(mine.map(c => c.slug))
  const popularFiltered = popular.filter(c => !mySet.has(c.slug)).slice(0, 5)

  function CommunityLink({ c }: { c: Community }) {
    const active = c.slug === currentSlug
    return (
      <button
        type="button"
        onClick={() => onNavigateToCommunity(c.slug)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer bg-transparent border-0 text-left ${
          active
            ? "bg-muted text-foreground font-semibold"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        }`}
      >
        {c.icon_url ? (
          <img src={c.icon_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
            {c.display_name[0]?.toUpperCase()}
          </div>
        )}
        <span className="truncate flex-1 text-xs">{c.display_name}</span>
        <VerificationBadge type={c.verification_type as "none" | "verified" | "official" | null} size="xs" />
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {/* General feed */}
      <div>
        <button
          type="button"
          onClick={() => onNavigate("community")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer bg-transparent border-0 text-left ${
            currentSlug === null || currentSlug === undefined
              ? "bg-muted text-foreground font-semibold"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[9px] font-bold text-blue-500 shrink-0">
            G
          </div>
          <span className="text-xs">General Feed</span>
        </button>
      </div>

      {/* My communities */}
      {mine.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 px-3">
            My Communities
          </p>
          <div className="space-y-0.5">
            {mine.map(c => <CommunityLink key={c.slug} c={c} />)}
          </div>
        </div>
      )}

      {/* Popular communities not in mine */}
      {popularFiltered.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 px-3">
            Popular
          </p>
          <div className="space-y-0.5">
            {popularFiltered.map(c => <CommunityLink key={c.slug} c={c} />)}
          </div>
        </div>
      )}

      {/* Footer links */}
      <div className="pt-1 space-y-1">
        <button
          type="button"
          onClick={() => onNavigate("communities")}
          className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground px-3 cursor-pointer bg-transparent border-0 transition-colors"
        >
          Browse all <ArrowRight className="w-2.5 h-2.5" />
        </button>
        {isSignedIn && (
          <button
            type="button"
            onClick={() => onNavigate("communities")}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground px-3 cursor-pointer bg-transparent border-0 transition-colors"
          >
            <Plus className="w-2.5 h-2.5" /> Create community
          </button>
        )}
      </div>
    </div>
  )
}
