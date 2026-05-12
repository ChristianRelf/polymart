import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Rss, FileText, FlaskConical, GraduationCap, TrendingUp, ArrowLeft, Clock } from "lucide-react"

type Route =
  | "home" | "market" | "api" | "terms" | "privacy" | "education"
  | "changelog" | "products" | "help" | "widgets" | "edu-tools"
  | "community" | "bot-terms" | "bot-privacy" | "community-blog"

interface Props {
  onNavigate: (r: Route) => void
}

const POST_TYPES = [
  {
    icon: TrendingUp,
    accent: "#6366f1",
    label: "Market Analyses",
    desc: "Deep-dives into sector trends, RSI conditions, macro impacts, and price action — all using live Polymart simulation data.",
  },
  {
    icon: FlaskConical,
    accent: "#22c55e",
    label: "Strategy Write-ups",
    desc: "Back-tested trading strategies, signal scanners, mean-reversion systems, and algorithm ideas shared openly with the community.",
  },
  {
    icon: GraduationCap,
    accent: "#f59e0b",
    label: "Educational Content",
    desc: "Tutorials, explainers, lesson plans, and guides for using Polymart in courses, research projects, and self-directed learning.",
  },
  {
    icon: FileText,
    accent: "#ec4899",
    label: "Research & Papers",
    desc: "Academic write-ups, data studies, and research projects that use Polymart as a simulation environment or data source.",
  },
]

export default function CommunityBlogPage({ onNavigate }: Props) {
  return (
    <div className="max-w-[900px] mx-auto px-8 py-16">

      {/* ── Back ── */}
      <button
        onClick={() => onNavigate("community")}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0 mb-8"
      >
        <ArrowLeft className="w-3 h-3" />
        Community
      </button>

      {/* ── Hero ── */}
      <div className="mb-14">
        <div className="flex items-center gap-2 mb-5">
          <Badge variant="outline" className="text-xs border-border gap-1.5">
            <Rss className="w-3 h-3" />
            Blogs &amp; Posts
          </Badge>
          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400 bg-amber-500/5">
            Coming Soon
          </Badge>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-5 text-balance">
          Community posts<br />are on their way.
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
          We're building a space for the Polymart community to share analyses, strategies,
          tutorials, and research — all built on real simulation data.
        </p>
      </div>

      <Separator className="mb-14" />

      {/* ── What's coming ── */}
      <div className="mb-14">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3">
          What's coming
        </p>
        <h2 className="text-2xl font-bold text-foreground mb-8">Four types of community posts</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {POST_TYPES.map(({ icon: Icon, accent, label, desc }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${accent}18` }}
              >
                <Icon className="w-5 h-5" style={{ color: accent }} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground mb-1.5">{label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator className="mb-14" />

      {/* ── Timeline hint ── */}
      <div className="bg-card border border-border rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="w-12 h-12 rounded-xl bg-foreground/5 border border-border flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-base font-bold text-foreground mb-1.5">In active development</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            Community posts, submission tools, and author profiles are being built. Check back soon
            or keep an eye on the changelog for updates.
          </p>
        </div>
        <button
          onClick={() => onNavigate("changelog")}
          className="flex items-center gap-1.5 text-xs font-semibold text-foreground cursor-pointer bg-transparent border-0 p-0 shrink-0 hover:opacity-70 transition-opacity"
        >
          View Changelog
        </button>
      </div>

    </div>
  )
}
