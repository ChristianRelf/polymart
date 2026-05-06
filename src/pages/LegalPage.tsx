import { Separator } from "@/components/ui/separator"

type LegalType = "terms" | "privacy"

interface Props {
  type: LegalType
  onNavigate: (r: "home") => void
}

const TERMS_SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using POLYMART ('the Service'), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not access the Service.",
  },
  {
    title: "2. Nature of the Service",
    body: "POLYMART is a simulated stock market platform. All financial data, prices, company names, market events, and economic indicators presented are entirely fictional and generated algorithmically. Nothing on this platform constitutes real financial data, investment advice, or any representation of actual market conditions or real companies.",
  },
  {
    title: "3. No Financial Advice",
    body: "The information provided by POLYMART is for entertainment, educational, and game development purposes only. It does not constitute financial, investment, trading, or any other form of professional advice. Do not make real-world financial decisions based on data from this Service.",
  },
  {
    title: "4. API & Discord Bot Usage",
    body: "Access to the POLYMART API is provided for personal, educational, and non-commercial integration (including Discord bots and hobby projects). You may not: scrape or mirror the API at a frequency that causes service degradation; use the API to build a commercial product without written permission; or present simulation data as real market data to end users without clear disclosure.",
  },
  {
    title: "5. Intellectual Property",
    body: "All simulation logic, data structures, event systems, and source code are the intellectual property of POLYMART. You may not reproduce, redistribute, resell, or create derivative commercial products from our simulation engine without express written permission.",
  },
  {
    title: "6. Limitation of Liability",
    body: "POLYMART is provided 'as is' without warranty of any kind, express or implied. We are not liable for any damages arising from your use of the Service, including but not limited to data loss, service downtime, or reliance on simulated data.",
  },
  {
    title: "7. Modifications",
    body: "We reserve the right to modify or discontinue the Service at any time without notice. We may also update these Terms; continued use of the Service following any changes constitutes your acceptance of the revised Terms.",
  },
  {
    title: "8. Governing Law",
    body: "These Terms are governed by applicable law. Any disputes shall be resolved through good-faith negotiation before any formal legal proceedings are initiated.",
  },
]

const PRIVACY_SECTIONS = [
  {
    title: "1. Information We Collect",
    body: "POLYMART does not require account registration. We collect standard server access logs including IP addresses, request timestamps, and API endpoint paths for operational and security purposes only. We do not collect personal information unless you voluntarily contact us.",
  },
  {
    title: "2. How We Use Information",
    body: "Server logs are used solely for monitoring service health, diagnosing performance issues, and detecting and preventing abuse. We do not sell, share, license, or monetise your access data in any form. Aggregate usage analytics may be used to improve the Service.",
  },
  {
    title: "3. Cookies & Local Storage",
    body: "POLYMART may use browser local storage to persist UI preferences such as theme selection or sort order. No tracking cookies, advertising pixels, or cross-site tracking technologies are used.",
  },
  {
    title: "4. Third-Party Services",
    body: "The POLYMART website loads fonts via Google Fonts CDN. Google's own privacy policy governs those requests. We do not integrate any analytics platforms, advertising networks, or user tracking services.",
  },
  {
    title: "5. Data Retention",
    body: "Server access logs are automatically purged after 30 days. No personal data is stored beyond this period. As we collect no personally identifiable information tied to your identity, there is nothing to export, correct, or delete on your behalf.",
  },
  {
    title: "6. Your Rights",
    body: "Since POLYMART collects no personal data tied to individual identities, rights such as data access, correction, or deletion are not applicable. If you believe we have inadvertently captured personal information, contact us via Discord and we will investigate promptly.",
  },
  {
    title: "7. Security",
    body: "We implement industry-standard security measures to protect our infrastructure. However, no internet service can guarantee absolute security. Please do not submit sensitive personal or financial information through any POLYMART interface.",
  },
  {
    title: "8. Changes to this Policy",
    body: "We may update this Privacy Policy from time to time. We will indicate the revision date at the top of the document. Continued use of the Service following any update constitutes acceptance of the revised policy.",
  },
]

export default function LegalPage({ type, onNavigate }: Props) {
  const isTerms = type === "terms"
  const sections = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS
  const title = isTerms ? "Terms of Service" : "Privacy Policy"
  const path = isTerms ? "docs / terms" : "docs / privacy"

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
      {isTerms ? (
        <div className="bg-card border border-border rounded-xl px-6 py-5 mb-10">
          <p className="text-sm text-muted-foreground leading-relaxed">
            POLYMART operates a{" "}
            <span className="font-semibold text-foreground">simulated stock market</span>{" "}
            for entertainment and educational use. All data is fictional. These terms govern
            your use of the website, API endpoints, and Discord bot integrations.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl px-6 py-5 mb-10">
          <p className="text-sm text-muted-foreground leading-relaxed">
            POLYMART is committed to protecting your privacy. This policy explains what data
            we collect, why we collect it, and how we handle it. We do not collect personal
            data and we do not sell information to third parties.
          </p>
        </div>
      )}

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
