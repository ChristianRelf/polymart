import type { LucideIcon } from "lucide-react"
import { Heart, Coffee, Zap, Shield, ArrowUpRight } from "lucide-react"
import type { Route } from "@/lib/routes"

interface Props {
  onNavigate: (r: Route) => void
}

const KOFI_URL = "https://ko-fi.com/polymartco"

const PERKS: { Icon: LucideIcon; title: string; desc: string }[] = [
  {
    Icon: Zap,
    title: "Keep the simulation running",
    desc: "Server and database costs are ongoing. Every coffee helps cover infrastructure so the market stays live 24/7.",
  },
  {
    Icon: Shield,
    title: "Fund new features",
    desc: "Widgets, API endpoints, charting tools, education content - sponsorships directly fund what gets built next.",
  },
  {
    Icon: Heart,
    title: "Support open data",
    desc: "Polymart is free for everyone - students, developers, teachers. Sponsors make that possible.",
  },
]

export default function SponsorPage({
  onNavigate: _onNavigate,
}: Props) {
  return (
    <div className="max-w-[900px] mx-auto px-6 sm:px-8 py-16">
      {/* Hero */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border rounded-full px-3 py-1">
            <Heart className="w-3 h-3 text-rose-400" />
            Sponsor
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4 leading-[1.06]">
          Support Polymart
        </h1>

        <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-8">
          Polymart is a free, open simulated stock market - no ads, no
          paywalls. If you find it useful, buying a coffee helps keep the
          servers running and new features shipping.
        </p>

        <a
          href={KOFI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 bg-[#FF5E5B] hover:bg-[#e54e4b] text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors no-underline"
        >
          <Coffee className="w-4 h-4" />
          Sponsor on Ko-fi
          <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
        </a>
      </div>

      {/* Why it matters */}
      <div className="grid sm:grid-cols-3 gap-4 mb-14">
        {PERKS.map((p) => (
          <div
            key={p.title}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
              <p.Icon className="w-4 h-4" />
            </div>

            <p className="text-sm font-semibold text-foreground mb-1.5">
              {p.title}
            </p>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {p.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="h-px bg-border mb-10" />

      {/* Ko-fi feed embed */}
      <div className="mb-10">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-4">
          Supporters
        </p>

        <h2 className="text-xl font-bold text-foreground mb-6">
          Our sponsors
        </h2>

        <div className="rounded-2xl border border-border overflow-hidden">
          <iframe
            id="kofiframe"
            src={`${KOFI_URL}/?hidefeed=false&widget=true&embed=true&preview=true`}
            style={{
              border: "none",
              width: "100%",
              display: "block",
            }}
            height="680"
            title="Polymart Ko-fi supporters"
          />
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="rounded-2xl border border-border bg-card p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex-1">
          <p className="text-base font-bold text-foreground mb-1.5">
            Every bit helps
          </p>

          <p className="text-sm text-muted-foreground leading-relaxed">
            One-time or recurring - whatever works for you. Thank you for
            supporting independent open-source projects.
          </p>
        </div>

        <a
          href={KOFI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#FF5E5B] hover:bg-[#e54e4b] text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors no-underline shrink-0"
        >
          <Coffee className="w-4 h-4" />
          Buy a coffee
        </a>
      </div>
    </div>
  )
}