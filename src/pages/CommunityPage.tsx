import { Badge } from "@/components/ui/badge"
import { Users, ArrowRight, Bot, Coffee } from "lucide-react"

const KOFI_URL = "https://ko-fi.com/polymartco"

type Route = "home" | "market" | "api" | "terms" | "privacy" | "education" | "changelog" | "products" | "help" | "widgets" | "edu-tools" | "community" | "community-blog" | "sponsor"

interface Props {
  onNavigate: (r: Route) => void
}

export default function CommunityPage({ onNavigate }: Props) {
  return (
    <div className="max-w-[740px] mx-auto px-4 sm:px-8 py-12 sm:py-16">

      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="text-xs border-border gap-1.5">
            <Users className="w-3 h-3" /> Community
          </Badge>
          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400 bg-amber-500/5">
            In development
          </Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
          Community Feed
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-md">
          A place for traders, developers, and researchers to share analyses, tools, and
          resources built on the Polymart simulation.
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

      {/* Empty state */}
      <div className="border border-border border-dashed rounded-xl px-6 py-20 flex flex-col items-center justify-center text-center gap-3">
        <p className="text-2xl">👀</p>
        <p className="text-sm font-semibold text-foreground">Nothing to see here yet</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Community submissions aren't open yet. Share your work in Discord in the meantime.
        </p>
      </div>

      {/* Sponsor segment */}
      <div className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
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
