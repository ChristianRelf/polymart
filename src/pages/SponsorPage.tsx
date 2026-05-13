import {
  Heart,
  Coffee,
  Zap,
  Shield,
  ArrowUpRight,
} from "lucide-react"

import type { Route } from "@/lib/routes"

interface Props {
  onNavigate: (route: Route) => void
}

const KOFI_URL = "https://ko-fi.com/polymartco"

const SUPPORT_ITEMS = [
  {
    icon: Zap,
    title: "Infrastructure",
    description:
      "Polymart runs continuously with live market updates, APIs, and persistent simulation systems.",
  },
  {
    icon: Shield,
    title: "Independent platform",
    description:
      "No ads, subscriptions, or locked features. Community support keeps the project open for everyone.",
  },
  {
    icon: Heart,
    title: "Future development",
    description:
      "Sponsorships directly fund new widgets, education systems, dashboards, APIs, and platform features.",
  },
]

export default function SponsorPage({ onNavigate }: Props) {
  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-8 py-16 sm:py-20">

      {/* Hero */}
      <section className="mb-20">

        <div className="inline-flex items-center gap-2 border border-border rounded-full px-3 py-1 mb-6">
          <Heart className="w-3.5 h-3.5 text-rose-400" />

          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Sponsor Polymart
          </span>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_420px] gap-12 items-start">

          {/* Left side */}
          <div>

            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.02] mb-6">
              Help fund the future of Polymart
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-6">
              Polymart is a free simulated stock market platform built for
              students, developers, creators, and communities.
            </p>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-10">
              There are no subscriptions, no ads, and no locked features.
              Sponsorships help keep the platform online and fund future
              development.
            </p>

            <div className="flex flex-wrap gap-4">

              <a
                href={KOFI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 bg-[#FF5E5B] hover:bg-[#e14e4b] text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors no-underline"
              >
                <Coffee className="w-4 h-4" />

                Support on Ko-fi

                <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
              </a>

              <button
                onClick={() => onNavigate("home")}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm font-medium cursor-pointer"
              >
                Return home
              </button>

            </div>
          </div>

          {/* Right card */}
          <div className="rounded-3xl border border-border bg-card p-8">

            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <Coffee className="w-5 h-5 text-rose-400" />
              </div>

              <div>
                <p className="text-sm font-semibold text-foreground">
                  Community funded
                </p>

                <p className="text-xs text-muted-foreground">
                  Supported by sponsors & contributors
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {SUPPORT_ITEMS.map((item) => {
                const Icon = item.icon

                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-4"
                  >
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-foreground" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-foreground mb-1">
                        {item.title}
                      </p>

                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

          </div>
        </div>
      </section>

      {/* Supporters */}
      <section className="mb-20">

        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Supporters
          </p>

          <h2 className="text-3xl font-bold tracking-tight text-foreground mb-3">
            Recent sponsors
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
            Thank you to everyone helping keep Polymart online and evolving.
          </p>
        </div>

        <div className="rounded-3xl overflow-hidden border border-border bg-card">
          <iframe
            id="kofiframe"
            src={`${KOFI_URL}/?hidefeed=false&widget=true&embed=true&preview=true`}
            title="Polymart Ko-fi supporters"
            height="720"
            style={{
              border: "none",
              width: "100%",
              display: "block",
            }}
          />
        </div>

      </section>

      {/* Bottom CTA */}
      <section>

        <div className="rounded-3xl border border-border bg-card p-8 sm:p-10">

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">

            <div className="max-w-2xl">
              <p className="text-2xl font-bold tracking-tight text-foreground mb-3">
                Every contribution helps
              </p>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                One-time or recurring — every contribution directly supports
                infrastructure, development, and future educational tools for
                the Polymart ecosystem.
              </p>
            </div>

            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#FF5E5B] hover:bg-[#e14e4b] text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors no-underline shrink-0"
            >
              <Coffee className="w-4 h-4" />

              Buy a coffee

              <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
            </a>

          </div>
        </div>

      </section>
    </div>
  )
}