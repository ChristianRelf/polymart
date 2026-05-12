import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Users, FileText, Puzzle, BookMarked, ArrowRight, Bot, Rss, Wrench, Share2, FlaskConical, Code2, GraduationCap, Star } from "lucide-react"
import { cn } from "@/lib/utils"

type Route = "home" | "market" | "api" | "terms" | "privacy" | "education" | "changelog" | "products" | "help" | "widgets" | "edu-tools" | "community" | "community-blog"

interface Props {
  onNavigate: (r: Route) => void
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3">
      {children}
    </p>
  )
}

// ── Coming-soon feature pillar ─────────────────────────────────────────────────
function Pillar({
  icon: Icon,
  title,
  description,
  features,
  accent,
  action,
}: {
  icon: React.ElementType
  title: string
  description: string
  features: { icon: React.ElementType; label: string; sub: string }[]
  accent: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-8 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accent}18` }}
        >
          <Icon className="w-6 h-6" style={{ color: accent }} />
        </div>
        {action ? (
          <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/5 shrink-0">
            Live preview
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] border-border text-muted-foreground shrink-0">
            Coming Soon
          </Badge>
        )}
      </div>

      <div>
        <p className="text-xl font-bold text-foreground mb-2">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>

      <div className="space-y-3 mt-auto">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-foreground/5 border border-border flex items-center justify-center shrink-0 mt-0.5">
              <f.icon className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{f.label}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{f.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-1.5 text-xs font-semibold text-foreground cursor-pointer bg-transparent border-0 p-0 w-fit hover:opacity-70 transition-opacity"
        >
          {action.label} <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

// ── Showcase card ──────────────────────────────────────────────────────────────
function ShowcaseCard({
  icon: Icon,
  tag,
  title,
  author,
  meta,
  accent,
}: {
  icon: React.ElementType
  tag: string
  title: string
  author: string
  meta: string
  accent: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 opacity-60 select-none">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${accent}18` }}
      >
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">{tag}</span>
        </div>
        <p className="text-xs font-semibold text-foreground truncate">{title}</p>
        <p className="text-[10px] text-muted-foreground">{author} · {meta}</p>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function CommunityPage({ onNavigate }: Props) {
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-16">

      {/* ── Hero ── */}
      <div className="mb-16">
        <div className="flex items-center gap-2 mb-5">
          <Badge variant="outline" className="text-xs border-border gap-1.5">
            <Users className="w-3 h-3" />
            Community
          </Badge>
          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400 bg-amber-500/5">
            In development
          </Badge>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-5 text-balance">
          Built by the community,<br />for the community.
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
          A space for traders, students, developers, and researchers to share their work, tools,
          and insights - all built on the Polymart simulation.
        </p>
      </div>

      <Separator className="mb-16" />

      {/* ── Three pillars ── */}
      <div className="mb-16">
        <SectionLabel>What's coming</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-2">Three pillars of the community</h2>
        <p className="text-sm text-muted-foreground mb-10 max-w-xl">
          Each section gives the community a place to contribute, discover, and learn from each other.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Pillar
            icon={Rss}
            title="Blogs & Posts"
            description="A space for community members to share market analyses, strategy write-ups, educational breakdowns, and research notes - all using Polymart data."
            accent="#6366f1"
            features={[
              { icon: FileText, label: "Market analyses", sub: "Deep-dives into sector trends, RSI conditions, and macro impacts using live simulation data." },
              { icon: FlaskConical, label: "Strategy write-ups", sub: "Share back-tested trading strategies, signal scanners, and algorithm ideas with the community." },
              { icon: GraduationCap, label: "Educational content", sub: "Tutorials, explainers, and guides for using Polymart in courses and personal learning." },
            ]}
            action={{ label: "Browse posts", onClick: () => onNavigate("community-blog") }}
          />
          <Pillar
            icon={Puzzle}
            title="Plugins & Tools"
            description="A curated directory of community-built tools - Discord bots, dashboards, screeners, alert systems, and libraries that extend what Polymart can do."
            accent="#22c55e"
            features={[
              { icon: Bot, label: "Discord bots", sub: "Custom bots using the Polymart API for price alerts, portfolio tracking, and slash commands." },
              { icon: Code2, label: "Libraries & SDKs", sub: "Wrapper libraries for Python, JavaScript, and other languages built by the community." },
              { icon: Wrench, label: "Dashboards & tools", sub: "Custom web dashboards, screeners, and visualisation tools built on top of the API." },
            ]}
          />
          <Pillar
            icon={BookMarked}
            title="Shared Resources"
            description="A library of datasets, code snippets, project starters, research papers, and assignment templates that the community can download and build from."
            accent="#f59e0b"
            features={[
              { icon: Share2, label: "Datasets & exports", sub: "Community-collected Polymart data snapshots, feature matrices, and historical datasets." },
              { icon: Code2, label: "Code snippets & starters", sub: "Reusable snippets, project templates, and boilerplate for common Polymart use cases." },
              { icon: Star, label: "Research & papers", sub: "Academic papers and research projects that used Polymart as a data source or simulation environment." },
            ]}
          />
        </div>
      </div>

      <Separator className="mb-16" />

      {/* ── Preview ── */}
      <div className="mb-16">
        <SectionLabel>Preview</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-2">What it will look like</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          A glimpse at the kinds of content the community will be able to share and discover.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ShowcaseCard icon={FileText} tag="Analysis" title="Why the Tech sector leads every bull run" author="@trader_k" meta="6 min read" accent="#6366f1" />
          <ShowcaseCard icon={Code2} tag="Plugin" title="Polymart RSI Alert Bot for Discord" author="@devhive" meta="Python · 240 stars" accent="#22c55e" />
          <ShowcaseCard icon={Share2} tag="Resource" title="30-day historical feature matrix (CSV)" author="@ml_labs" meta="132 tickers · 4.2MB" accent="#f59e0b" />
          <ShowcaseCard icon={FlaskConical} tag="Strategy" title="Mean-reversion on oversold streaks" author="@quant_r" meta="Backtested · +18.4%" accent="#6366f1" />
          <ShowcaseCard icon={Bot} tag="Plugin" title="Polymart Portfolio Tracker - Telegram" author="@botbuilder" meta="JS · 88 stars" accent="#22c55e" />
          <ShowcaseCard icon={GraduationCap} tag="Guide" title="Using Polymart for your Algo Trading class" author="@prof_chen" meta="Lesson plan · PDF" accent="#f59e0b" />
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Preview only - content is illustrative and not real.
        </p>
      </div>

      <Separator className="mb-16" />

      {/* ── Discord CTA ── */}
      <div className="bg-card border border-border rounded-2xl p-10 flex flex-col sm:flex-row items-start sm:items-center gap-8 mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(88,101,242,0.12)" }}
        >
          <Bot className="w-7 h-7" style={{ color: "#5865f2" }} />
        </div>
        <div className="flex-1">
          <p className="text-xl font-bold text-foreground mb-2">Join the conversation on Discord</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            The community already lives in our Discord server. Share strategies, get help with the API,
            show off what you've built, and be first to know when community features launch.
          </p>
        </div>
        <a
          href="https://discord.com/oauth2/authorize?client_id=1502125060524347512&permissions=139586455616&integration_type=0&scope=bot+applications.commands"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90 shrink-0"
          style={{ background: "#5865f2" }}
        >
          Add to Discord
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* ── Want to contribute ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: FileText,
            label: "Write a post",
            sub: "Share a market analysis, strategy, or tutorial with the community.",
          },
          {
            icon: Puzzle,
            label: "Submit a tool",
            sub: "Built something using the Polymart API? Share it so others can use it too.",
          },
          {
            icon: Share2,
            label: "Share a resource",
            sub: "Have a dataset, snippet, or project template that would help others?",
          },
        ].map((item, i) => (
          <div
            key={i}
            className={cn(
              "bg-card border border-border rounded-xl p-5 flex flex-col gap-3",
              "opacity-60 pointer-events-none select-none"
            )}
          >
            <item.icon className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">{item.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.sub}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
              Coming soon
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
