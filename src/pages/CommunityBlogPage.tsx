import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import {
  Users, Search, FileText, FlaskConical, GraduationCap,
  Code2, TrendingUp, ArrowRight, ArrowLeft, Clock, Star, Rss,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Route =
  | "home" | "market" | "api" | "terms" | "privacy" | "education"
  | "changelog" | "products" | "help" | "widgets" | "edu-tools"
  | "community" | "bot-terms" | "bot-privacy" | "community-blog"

interface Props {
  onNavigate: (r: Route) => void
}

// ── Data ──────────────────────────────────────────────────────────────────────
type Category = "All" | "Analysis" | "Strategy" | "Educational" | "Research" | "Tutorial"

const CATEGORY_META: Record<Exclude<Category, "All">, { color: string; icon: React.ElementType }> = {
  Analysis:    { color: "#6366f1", icon: TrendingUp },
  Strategy:    { color: "#22c55e", icon: Star },
  Educational: { color: "#f59e0b", icon: GraduationCap },
  Research:    { color: "#ec4899", icon: FlaskConical },
  Tutorial:    { color: "#06b6d4", icon: Code2 },
}

const ALL_CATEGORIES: Category[] = ["All", "Analysis", "Strategy", "Educational", "Research", "Tutorial"]

interface Post {
  id: number
  category: Exclude<Category, "All">
  title: string
  excerpt: string
  author: string
  date: string
  readTime: string
  tags: string[]
  featured?: true
}

const POSTS: Post[] = [
  {
    id: 1,
    category: "Analysis",
    title: "Why the Tech sector leads every bull run",
    excerpt:
      "A deep-dive into RSI clustering and momentum divergence in Polymart's Tech sector over the past 30 days. We examine why high-beta growth names consistently front-run broad market rallies and what early signals to watch for before the move.",
    author: "@trader_k",
    date: "May 8, 2026",
    readTime: "6 min read",
    tags: ["RSI", "Tech", "Momentum"],
    featured: true,
  },
  {
    id: 2,
    category: "Strategy",
    title: "Mean-reversion on oversold streaks: a 30-day back-test",
    excerpt:
      "When RSI drops below 28 for three consecutive ticks, does buying the bounce work? I ran 30 days of Polymart data through a mean-reversion script and the results are more consistent than expected.",
    author: "@quant_r",
    date: "May 6, 2026",
    readTime: "8 min read",
    tags: ["RSI", "Back-test", "Mean-reversion"],
  },
  {
    id: 3,
    category: "Educational",
    title: "Using Polymart for your Algo Trading class: a full lesson plan",
    excerpt:
      "A structured three-week lesson plan for university-level algo trading courses. Includes API exercises, back-testing assignments, and portfolio projects - all using Polymart as the live data environment.",
    author: "@prof_chen",
    date: "May 5, 2026",
    readTime: "4 min read",
    tags: ["Education", "Lesson plan", "Algo trading"],
  },
  {
    id: 4,
    category: "Research",
    title: "Macro sensitivity: how interest rates move sectors in simulation",
    excerpt:
      "A 30-day study correlating Polymart's interest rate macro variable with sector-level price changes. Healthcare and Utilities show the strongest inverse correlation - consistent with real-world theory.",
    author: "@ml_labs",
    date: "May 3, 2026",
    readTime: "12 min read",
    tags: ["Macro", "Interest rates", "Sectors"],
  },
  {
    id: 5,
    category: "Analysis",
    title: "RSI divergence signals in the Energy sector",
    excerpt:
      "Price makes a new high but RSI doesn't confirm - classic bearish divergence. I tracked 14 divergence events in Polymart's Energy sector and found a consistent short-term pattern worth watching.",
    author: "@charty",
    date: "Apr 28, 2026",
    readTime: "5 min read",
    tags: ["RSI", "Divergence", "Energy"],
  },
  {
    id: 6,
    category: "Tutorial",
    title: "Building a momentum screener with the Polymart API in Python",
    excerpt:
      "Step-by-step guide to pulling /getStocks, calculating a simple momentum score, and ranking the top 10 tickers each tick. Full code included - works with the free API, no key required.",
    author: "@devhive",
    date: "Apr 25, 2026",
    readTime: "10 min read",
    tags: ["Python", "API", "Screener"],
  },
  {
    id: 7,
    category: "Research",
    title: "Fear & Greed cycles: what the VIX tells us in a simulated market",
    excerpt:
      "Polymart's macro engine includes a VIX-like volatility index. We analysed 60 days of data and found that VIX spikes above 35 consistently precede a broad market recovery within 5–10 ticks.",
    author: "@quant_r",
    date: "Apr 22, 2026",
    readTime: "7 min read",
    tags: ["VIX", "Volatility", "Macro"],
  },
  {
    id: 8,
    category: "Strategy",
    title: "Sector rotation playbook: following macro signals in Polymart",
    excerpt:
      "A systematic approach to rotating between Polymart sectors based on the macro environment - interest rates, GDP growth, and inflation readings. Which sectors lead in each macro regime?",
    author: "@market_sage",
    date: "Apr 18, 2026",
    readTime: "6 min read",
    tags: ["Sectors", "Rotation", "Macro"],
  },
  {
    id: 9,
    category: "Tutorial",
    title: "Polymart API crash course: from zero to live dashboard in 30 minutes",
    excerpt:
      "No prior API experience needed. Covers fetching prices, parsing sector data, and rendering a live leaderboard widget - all with vanilla JavaScript and one script tag.",
    author: "@devhive",
    date: "Apr 14, 2026",
    readTime: "9 min read",
    tags: ["API", "JavaScript", "Dashboard"],
  },
]

// ── Components ────────────────────────────────────────────────────────────────
function CategoryBadge({ category }: { category: Exclude<Category, "All"> }) {
  const { color } = CATEGORY_META[category]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-[0.08em]"
      style={{ background: `${color}18`, color }}
    >
      {category}
    </span>
  )
}

function TagPill({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded-md bg-foreground/5 border border-border text-[10px] text-muted-foreground font-medium">
      {label}
    </span>
  )
}

function FeaturedPost({ post }: { post: Post }) {
  const { color } = CATEGORY_META[post.category]
  return (
    <div
      className="relative bg-card border border-border rounded-2xl p-8 flex flex-col gap-5 overflow-hidden"
    >
      {/* Subtle accent glow */}
      <div
        className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-[0.07] pointer-events-none"
        style={{ background: color, filter: "blur(40px)" }}
      />

      <div className="flex items-center gap-2.5 flex-wrap">
        <CategoryBadge category={post.category} />
        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400 bg-amber-500/5 gap-1">
          <Star className="w-2.5 h-2.5" />
          Featured
        </Badge>
      </div>

      <div className="max-w-2xl">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-3 leading-tight">
          {post.title}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{post.excerpt}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">{post.author}</span>
        <span>{post.date}</span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {post.readTime}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {post.tags.map(t => <TagPill key={t} label={t} />)}
      </div>

      <div>
        <button
          disabled
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground cursor-not-allowed opacity-50"
        >
          Read post <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

function PostCard({ post }: { post: Post }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-ring transition-colors">
      <CategoryBadge category={post.category} />

      <div className="flex-1">
        <h3 className="text-sm font-bold text-foreground mb-2 leading-snug">{post.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{post.excerpt}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {post.tags.map(t => <TagPill key={t} label={t} />)}
      </div>

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1 border-t border-border/50 mt-auto">
        <span className="font-medium text-foreground/70">{post.author}</span>
        <span>{post.date}</span>
        <span className="ml-auto flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {post.readTime}
        </span>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function CommunityBlogPage({ onNavigate }: Props) {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<Category>("All")

  const featured = POSTS.find(p => p.featured)!
  const rest = POSTS.filter(p => !p.featured)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rest.filter(p => {
      const matchesCategory = activeCategory === "All" || p.category === activeCategory
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q)) ||
        p.author.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [search, activeCategory, rest])

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-16">

      {/* ── Back + Hero ── */}
      <div className="mb-12">
        <button
          onClick={() => onNavigate("community")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0 mb-6"
        >
          <ArrowLeft className="w-3 h-3" />
          Community
        </button>

        <div className="flex items-center gap-2 mb-5">
          <Badge variant="outline" className="text-xs border-border gap-1.5">
            <Rss className="w-3 h-3" />
            Blogs &amp; Posts
          </Badge>
          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400 bg-amber-500/5">
            Preview
          </Badge>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4 text-balance">
          Community posts
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
          Market analyses, strategies, research, and tutorials written by the Polymart community.
          All built on real simulation data.
        </p>
      </div>

      {/* ── Illustrative notice ── */}
      <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4 mb-10">
        <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-amber-400">Preview only</span> - posts shown below are
          illustrative examples of the kind of content the community will share once this feature launches.
          Submission is coming soon.
        </p>
      </div>

      {/* ── Featured ── */}
      <div className="mb-10">
        <FeaturedPost post={featured} />
      </div>

      <Separator className="mb-10" />

      {/* ── Search + Filter ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search posts, tags, authors…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-card border-border"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border",
                activeCategory === cat
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/40"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground sm:ml-auto shrink-0">
          {filtered.length} post{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Post grid ── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {filtered.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center mb-16">
          <FileText className="w-8 h-8 text-muted-foreground/30 mb-4" />
          <p className="text-sm font-semibold text-foreground mb-1">No posts found</p>
          <p className="text-xs text-muted-foreground">Try a different search term or category.</p>
        </div>
      )}

      <Separator className="mb-12" />

      {/* ── Submit CTA ── */}
      <div className="bg-card border border-border rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "#6366f118" }}
        >
          <Rss className="w-6 h-6" style={{ color: "#6366f1" }} />
        </div>
        <div className="flex-1">
          <p className="text-base font-bold text-foreground mb-1.5">Want to write a post?</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            Once community submissions open, anyone will be able to share market analyses, strategy
            write-ups, tutorials, and research notes built on Polymart data. Join the Discord to be
            notified first.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 opacity-60 pointer-events-none select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
          <span className="text-xs text-muted-foreground font-medium">Coming soon</span>
        </div>
      </div>

    </div>
  )
}
