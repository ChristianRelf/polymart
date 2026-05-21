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
    body: "POLYMART is a simulated paper trading platform. All financial data, prices, company names, market events, and economic indicators presented are entirely fictional and generated algorithmically. All trading activity on this platform is simulated — no real money is involved and no real securities are bought or sold. Nothing on this platform constitutes real financial data, investment advice, or any representation of actual market conditions or real companies.",
  },
  {
    title: "3. No Financial Advice",
    body: "The information provided by POLYMART is for entertainment, educational, and paper trading simulation purposes only. It does not constitute financial, investment, trading, or any other form of professional advice. Do not make real-world financial decisions based on data or outcomes from this Service.",
  },
  {
    title: "4. User Accounts",
    body: "To access paper trading, portfolio management, and community features, you must create an account. Accounts are created and managed via Clerk, our authentication provider. You are responsible for maintaining the security of your account credentials. You must not share your account, impersonate others, or use automated tools to create accounts. We reserve the right to suspend or terminate accounts that violate these Terms. You must be at least 13 years of age to create an account.",
  },
  {
    title: "5. Premium Subscriptions",
    body: "POLYMART offers an optional Premium subscription that unlocks higher limits, forex paper trading, multiple portfolios, and other features. Subscriptions are billed on a recurring monthly basis via Stripe, our payment processor. You may cancel your subscription at any time through your account settings; access continues until the end of the current billing period. Payments are non-refundable except where required by applicable law. We reserve the right to adjust pricing or features with reasonable notice.",
  },
  {
    title: "6. User-Generated Content",
    body: "The Service includes community features where users may post content including text, analysis, and trade commentary. You retain ownership of content you post, but grant POLYMART a non-exclusive, royalty-free licence to display and distribute it within the Service. You may not post content that is unlawful, abusive, misleading, or that violates our Community Standards. We reserve the right to remove content or restrict accounts that breach these guidelines.",
  },
  {
    title: "7. API & Discord Bot Usage",
    body: "Access to the POLYMART API is provided for personal, educational, and non-commercial integration (including Discord bots and hobby projects). You may not: scrape or mirror the API at a frequency that causes service degradation; use the API to build a commercial product without written permission; or present simulation data as real market data to end users without clear disclosure.",
  },
  {
    title: "8. Intellectual Property",
    body: "All simulation logic, data structures, event systems, and source code are the intellectual property of POLYMART. You may not reproduce, redistribute, resell, or create derivative commercial products from our simulation engine without express written permission.",
  },
  {
    title: "9. Limitation of Liability",
    body: "POLYMART is provided 'as is' without warranty of any kind, express or implied. We are not liable for any damages arising from your use of the Service, including but not limited to data loss, service downtime, subscription billing issues, or reliance on simulated data.",
  },
  {
    title: "10. Modifications",
    body: "We reserve the right to modify or discontinue the Service at any time without notice. We may also update these Terms; continued use of the Service following any changes constitutes your acceptance of the revised Terms.",
  },
  {
    title: "11. Governing Law",
    body: "These Terms are governed by applicable law. Any disputes shall be resolved through good-faith negotiation before any formal legal proceedings are initiated.",
  },
]

const PRIVACY_SECTIONS = [
  {
    title: "1. Information We Collect",
    body: "When you create an account, we collect the information you provide through our authentication provider (Clerk): your email address, display name, and profile picture. We also collect data you generate while using the Service: portfolio positions, order history, watchlists, community posts and comments, and account settings. Server access logs (IP addresses, request timestamps, endpoint paths) are collected for operational and security purposes.",
  },
  {
    title: "2. How We Use Your Information",
    body: "Your account information is used to operate your account, provide the paper trading simulation, process Premium subscription payments via Stripe, and display your profile in community features. Server logs are used to monitor service health, diagnose issues, and detect abuse. We do not sell, share, or license your personal information to third parties for advertising or commercial purposes.",
  },
  {
    title: "3. Authentication — Clerk",
    body: "Account creation, sign-in, and session management is handled by Clerk (clerk.com). Clerk processes your email address and authentication credentials on our behalf. When you sign in with a social provider (e.g. Google), Clerk manages that OAuth flow. Clerk's privacy policy governs how they handle authentication data. We receive a user identifier and basic profile fields (name, email, avatar) from Clerk.",
  },
  {
    title: "4. Payments — Stripe",
    body: "Premium subscription billing is processed by Stripe (stripe.com). When you subscribe, you are redirected to a Stripe-hosted checkout page. We do not store your payment card details — Stripe handles all card data under PCI-DSS compliance. We receive confirmation of your subscription status and a subscription identifier from Stripe. Stripe's privacy policy governs how they handle payment information.",
  },
  {
    title: "5. Cookies & Local Storage",
    body: "POLYMART uses browser cookies and local storage for session management (via Clerk) and to persist UI preferences such as chart drawings, price alerts, and trading notes. These are stored locally in your browser and are not transmitted to our servers. No third-party advertising cookies or cross-site tracking technologies are used.",
  },
  {
    title: "6. Portfolio & Trading Data",
    body: "All paper trading activity — portfolios, positions, orders, and watchlists — is stored in our database and associated with your account. This data is used to provide the simulation experience and display your trading history. It is not shared with third parties.",
  },
  {
    title: "7. Community Content",
    body: "Posts, comments, and other content you submit to community features are stored in our database and may be publicly visible to other users. Your display name and avatar are shown alongside your content. You may delete your own posts and comments through the interface.",
  },
  {
    title: "8. Data Retention",
    body: "Account and portfolio data is retained for as long as your account exists. Server access logs are automatically purged after 30 days. If you delete your account, your profile, portfolios, and personal data are removed from our systems. Community posts you have made may be anonymised rather than deleted to preserve discussion thread integrity.",
  },
  {
    title: "9. Your Rights",
    body: "You may update your display name and profile picture through your account settings at any time. You may request deletion of your account and associated personal data by contacting us — we will process requests within 30 days. If you are in a jurisdiction with data protection rights (such as the EU/EEA under GDPR or California under CCPA), you may also request a copy of your data.",
  },
  {
    title: "10. Security",
    body: "We implement industry-standard security measures including encrypted connections (HTTPS), hashed credentials via Clerk, and access-controlled databases. However, no internet service can guarantee absolute security. Please use a strong, unique password and do not share your account credentials.",
  },
  {
    title: "11. Changes to this Policy",
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
            <span className="font-semibold text-foreground">simulated paper trading platform</span>{" "}
            for entertainment and educational use. All data is fictional and no real money is involved.
            These terms govern your use of the website, user accounts, Premium subscriptions, community
            features, API endpoints, and Discord bot integrations.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl px-6 py-5 mb-10">
          <p className="text-sm text-muted-foreground leading-relaxed">
            POLYMART is committed to protecting your privacy. This policy explains what data we collect
            now that the platform includes user accounts and Premium subscriptions, how we use it, and
            the third-party services we rely on. We do not sell your data to third parties.
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
