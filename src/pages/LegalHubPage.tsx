import { ArrowUpRight, FileText, Shield, Bot, Coffee } from "lucide-react"
import type { Route } from "@/lib/routes"

interface Props {
  onNavigate: (r: Route) => void
}

const DOCS: {
  Icon: typeof FileText
  title: string
  desc: string
  route: Exclude<Route, "home">
  label: string
}[] = [
  {
    Icon: FileText,
    title: "Terms of Service",
    desc: "Usage rules, account responsibilities, Premium subscriptions, API & Discord bot terms.",
    route: "terms",
    label: "Read Terms",
  },
  {
    Icon: Shield,
    title: "Privacy Policy",
    desc: "What data we collect, how we use it, Clerk auth, Stripe billing, and your rights.",
    route: "privacy",
    label: "Read Privacy",
  },
  {
    Icon: Bot,
    title: "Discord Bot Terms",
    desc: "Terms governing use of the POLYMART Discord bot commands and integrations.",
    route: "bot-terms",
    label: "Read Terms",
  },
  {
    Icon: Bot,
    title: "Discord Bot Privacy",
    desc: "How the bot handles data from Discord servers and the users who invoke it.",
    route: "bot-privacy",
    label: "Read Privacy",
  },
  {
    Icon: Coffee,
    title: "Ko-fi Terms",
    desc: "Terms applying to one-time Ko-fi donations and supporter perks.",
    route: "kofi-terms",
    label: "Read Terms",
  },
  {
    Icon: Coffee,
    title: "Ko-fi Privacy",
    desc: "Privacy notice for Ko-fi transactions and supporter data.",
    route: "kofi-privacy",
    label: "Read Privacy",
  },
]

export default function LegalHubPage({ onNavigate }: Props) {
  return (
    <div className="max-w-4xl mx-auto px-8 py-16">

      {/* Breadcrumb */}
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-6">
        polymart.co / docs / legal
      </p>

      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-3">Legal & Policies</h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          All legal documentation for POLYMART — the platform, Discord bot, and Ko-fi integrations.
          We aim to keep these policies clear and plain-language.
        </p>
      </div>

      {/* Document grid */}
      <div className="grid sm:grid-cols-2 gap-4 mb-14">
        {DOCS.map((doc) => (
          <button
            key={doc.route}
            type="button"
            onClick={() => onNavigate(doc.route)}
            className="bg-card border border-border rounded-xl p-6 text-left hover:border-ring transition-colors group cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <doc.Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1.5">{doc.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{doc.desc}</p>
          </button>
        ))}
      </div>

      {/* Contact note */}
      <div className="bg-card border border-border rounded-xl px-6 py-5">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Questions about any of these policies?{" "}
          <a
            href="mailto:support@polymart.co"
            className="text-foreground underline underline-offset-4 hover:opacity-70 transition-opacity"
          >
            Contact us
          </a>{" "}
          or join the POLYMART Discord community.
        </p>
      </div>

    </div>
  )
}
