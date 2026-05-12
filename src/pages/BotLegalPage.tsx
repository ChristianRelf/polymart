import { Separator } from "@/components/ui/separator"

type BotLegalType = "bot-terms" | "bot-privacy"

interface Props {
  type: BotLegalType
  onNavigate: (r: "home") => void
}

const BOT_TERMS_SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By adding or using the POLYMART Discord Bot ('the Bot') in your server, you agree to these Terms of Use. If you do not agree, remove the Bot from your server and discontinue use.",
  },
  {
    title: "2. Nature of the Bot",
    body: "The POLYMART Bot is a Discord integration that surfaces data from the POLYMART simulated stock exchange. All prices, tickers, company names, market events, and indicators returned by the Bot are entirely fictional and algorithmically generated. Nothing the Bot returns constitutes real financial data, real company information, or investment advice of any kind.",
  },
  {
    title: "3. No Financial Advice",
    body: "The Bot is provided for entertainment and educational purposes only. Do not make real-world financial or investment decisions based on any data returned by the Bot. POLYMART accepts no liability for any such decisions.",
  },
  {
    title: "4. Permitted Use",
    body: "You may use the Bot in Discord servers for personal, educational, and non-commercial purposes. You may not: automate or script interactions with the Bot at a rate that degrades service for others; use Bot output to build commercial products without written permission from POLYMART; or present Bot data as real market data without clear disclosure that it is simulated.",
  },
  {
    title: "5. Bot Availability",
    body: "The Bot is provided 'as is'. We do not guarantee uptime, response accuracy, or continuity of service. We may modify, suspend, or discontinue the Bot at any time without notice.",
  },
  {
    title: "6. Server Administrator Responsibility",
    body: "By adding the Bot to a server you are responsible for ensuring its use complies with Discord's Terms of Service, your community's own rules, and these terms. POLYMART is not liable for misuse of the Bot within your server.",
  },
  {
    title: "7. Intellectual Property",
    body: "All simulation data, branding, and Bot functionality are the intellectual property of POLYMART. You may not clone, redistribute, or resell the Bot or its outputs as your own without express written permission.",
  },
  {
    title: "8. Modifications",
    body: "We may update these Terms at any time. Continued use of the Bot after an update constitutes acceptance of the revised Terms. We will endeavour to communicate significant changes via our Discord community server.",
  },
  {
    title: "9. Governing Law",
    body: "These Terms are governed by applicable law. Any disputes shall first be addressed through good-faith communication before any formal proceedings are initiated.",
  },
]

const BOT_PRIVACY_SECTIONS = [
  {
    title: "1. What the Bot Collects",
    body: "The POLYMART Bot is a read-only data bot. It does not store, log, or retain any information about the users who invoke its commands, the content of messages in your server, or any personal data. The only data transmitted is the slash command name and any ticker or parameter you supply, which is used solely to query the POLYMART simulation API and return a response.",
  },
  {
    title: "2. Guild and User Identifiers",
    body: "Discord provides the Bot with a guild ID and user ID as part of the interaction payload. These identifiers are not stored, logged, or linked to any profile. They are used transiently to format and deliver the command response and are discarded immediately thereafter.",
  },
  {
    title: "3. No Persistent Storage",
    body: "The POLYMART Bot maintains no database of users, servers, commands issued, or usage history. There is no user profile, no command log, and no analytics tied to individual Discord accounts or guilds.",
  },
  {
    title: "4. API Requests",
    body: "When you run a slash command, the Bot queries the POLYMART simulation API on your behalf. The POLYMART API itself logs standard server access data (see the main Privacy Policy at polymart.co/docs/privacy). No Discord-specific identifiers are forwarded to or stored by the API.",
  },
  {
    title: "5. Third-Party Platform",
    body: "The Bot operates on Discord's platform. Discord's own Privacy Policy governs how Discord handles interaction data, message metadata, and platform-level logs. We encourage you to review Discord's Privacy Policy at discord.com/privacy.",
  },
  {
    title: "6. Data Retention",
    body: "Because the Bot stores no data, there is nothing to retain, export, or delete. If you remove the Bot from your server, there is no residual data held on our side.",
  },
  {
    title: "7. Your Rights",
    body: "As the Bot collects no personal data, rights such as access, correction, portability, or erasure have no applicable scope. If you have a concern or believe data has been captured in error, contact us via the POLYMART Discord community server and we will investigate promptly.",
  },
  {
    title: "8. Changes to this Policy",
    body: "We may update this Privacy Policy. The revision date will be updated at the top of this page. Continued use of the Bot after an update constitutes acceptance of the revised policy.",
  },
]

export default function BotLegalPage({ type, onNavigate }: Props) {
  const isTerms = type === "bot-terms"
  const sections = isTerms ? BOT_TERMS_SECTIONS : BOT_PRIVACY_SECTIONS
  const title = isTerms ? "Discord Bot — Terms of Use" : "Discord Bot — Privacy Policy"
  const path = isTerms ? "docs / bots / terms" : "docs / bots / privacy"

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">

      {/* Breadcrumb */}
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-6">
        polymart.co / {path}
      </p>

      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-3">{title}</h1>
        <p className="text-sm text-muted-foreground">Last updated: May 2026</p>
      </div>

      {/* Intro callout */}
      <div className="bg-card border border-border rounded-xl px-6 py-5 mb-10">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isTerms ? (
            <>
              These Terms govern use of the{" "}
              <span className="font-semibold text-foreground">POLYMART Discord Bot</span>
              {" "}— a slash-command integration that surfaces live data from the POLYMART simulated
              stock exchange. All data returned is fictional and for entertainment or educational use only.
            </>
          ) : (
            <>
              This policy explains how the{" "}
              <span className="font-semibold text-foreground">POLYMART Discord Bot</span>
              {" "}handles data. The short version: the Bot stores nothing. No user data, no command logs,
              no personal information of any kind is retained.
            </>
          )}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl px-6 py-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">{s.title}</h2>
            <p className="text-sm text-muted-foreground leading-[1.85]">{s.body}</p>
          </div>
        ))}
      </div>

      <Separator className="bg-border my-12" />

      {/* Footer nav */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Questions? Join the POLYMART Discord community.
        </p>
        <button
          onClick={() => onNavigate("home")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 cursor-pointer bg-transparent border-0 p-0"
        >
          Return to homepage
        </button>
      </div>
    </div>
  )
}
