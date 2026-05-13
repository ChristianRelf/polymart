import { Separator } from "@/components/ui/separator"

type LegalType = "kofi-terms" | "kofi-privacy"

interface Props {
  type: LegalType
  onNavigate: (r: "home") => void
}

const KOFI_TERMS_SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By supporting, subscribing to, or purchasing digital content through the POLYMART Ko-fi page ('the Page'), you agree to these Terms of Use. If you do not agree, please discontinue use of the Page and refrain from making purchases or donations.",
  },
  {
    title: "2. Nature of Content",
    body: "The POLYMART Ko-fi page may provide digital downloads, supporter perks, early access content, development updates, artwork, software utilities, or other community-related materials. Unless otherwise stated, all content is provided for personal use only.",
  },
  {
    title: "3. Payments and Donations",
    body: "Payments made through Ko-fi are processed by third-party payment providers. POLYMART does not directly store or process your payment information. Support contributions, donations, and digital purchases are generally non-refundable unless required by applicable law.",
  },
  {
    title: "4. Digital Products",
    body: "Any downloadable assets, software, templates, or files distributed through the Page are provided 'as is' without warranties of any kind. We do not guarantee compatibility, uninterrupted availability, or future updates unless explicitly stated.",
  },
  {
    title: "5. Permitted Use",
    body: "You may use purchased or downloaded content for personal and non-commercial purposes unless otherwise specified. You may not redistribute, resell, reupload, leak, sublicense, or falsely claim ownership of POLYMART content without express written permission.",
  },
  {
    title: "6. Community Conduct",
    body: "Users engaging with the Page, comments, or supporter community must behave respectfully. Harassment, abuse, spam, impersonation, or malicious conduct may result in revoked access to supporter content or community spaces.",
  },
  {
    title: "7. Intellectual Property",
    body: "All branding, artwork, code, written material, downloads, and creative assets published through the POLYMART Ko-fi page remain the intellectual property of POLYMART unless otherwise stated.",
  },
  {
    title: "8. Availability and Changes",
    body: "We reserve the right to modify, pause, discontinue, or remove content, memberships, rewards, or services offered through the Page at any time without prior notice.",
  },
  {
    title: "9. Limitation of Liability",
    body: "POLYMART shall not be liable for any indirect, incidental, or consequential damages arising from use of the Page, downloaded materials, supporter content, or inability to access services.",
  },
  {
    title: "10. Changes to These Terms",
    body: "These Terms may be updated periodically. Continued use of the Page after updates become effective constitutes acceptance of the revised Terms.",
  },
]

const KOFI_PRIVACY_SECTIONS = [
  {
    title: "1. Information We Receive",
    body: "When you support POLYMART through Ko-fi, we may receive limited account-related information provided by Ko-fi, such as your display name, supporter message, membership tier, and transaction metadata.",
  },
  {
    title: "2. Payment Processing",
    body: "Payments are processed entirely by Ko-fi and its payment providers. POLYMART does not directly collect or store credit card details, banking information, or sensitive payment credentials.",
  },
  {
    title: "3. Supporter Content Access",
    body: "If you subscribe to memberships or purchase digital products, limited account information may be used to verify access eligibility and deliver supporter-only content or downloads.",
  },
  {
    title: "4. Communications",
    body: "If you contact us through Ko-fi, Discord, email, or linked community platforms, we may retain communication records solely for support, moderation, or operational purposes.",
  },
  {
    title: "5. Data Usage",
    body: "Information received through Ko-fi is used exclusively for operating the Page, fulfilling purchases, managing memberships, improving content, and communicating with supporters.",
  },
  {
    title: "6. Third-Party Platforms",
    body: "Ko-fi operates as an independent third-party platform. Your use of Ko-fi is also governed by Ko-fi's own Terms of Service and Privacy Policy. We encourage users to review those policies directly on ko-fi.com.",
  },
  {
    title: "7. Data Retention",
    body: "Support-related records may be retained for operational, accounting, moderation, or legal compliance purposes. Information is not sold to advertisers or unrelated third parties.",
  },
  {
    title: "8. Your Rights",
    body: "You may request clarification regarding information associated with your support activity or request deletion where applicable under relevant laws. Requests should be made through official POLYMART contact channels.",
  },
  {
    title: "9. Policy Updates",
    body: "This Privacy Policy may be updated periodically. Continued use of the Page after changes become effective constitutes acceptance of the revised policy.",
  },
]

export default function KofiLegalPage({ type, onNavigate }: Props) {
  const isTerms = type === "kofi-terms"
  const sections = isTerms ? KOFI_TERMS_SECTIONS : KOFI_PRIVACY_SECTIONS
  const title = isTerms ? "Ko-fi - Terms of Use" : "Ko-fi - Privacy Policy"
  const path = isTerms ? "docs / ko-fi / terms" : "docs / ko-fi / privacy"

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">

      {/* Breadcrumb */}
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-6">
        polymart.co / {path}
      </p>

      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-3">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">Last updated: May 2026</p>
      </div>

      {/* Intro callout */}
      <div className="bg-card border border-border rounded-xl px-6 py-5 mb-10">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isTerms ? (
            <>
              These Terms govern use of the{" "}
              <span className="font-semibold text-foreground">
                POLYMART Ko-fi Page
              </span>
              {" "}including digital downloads, supporter memberships, donations,
              and community perks provided through the platform.
            </>
          ) : (
            <>
              This policy explains how the{" "}
              <span className="font-semibold text-foreground">
                POLYMART Ko-fi Page
              </span>
              {" "}handles supporter information, purchases, and membership-related
              data received through Ko-fi.
            </>
          )}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((s, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl px-6 py-6"
          >
            <h2 className="text-sm font-semibold text-foreground mb-3">
              {s.title}
            </h2>

            <p className="text-sm text-muted-foreground leading-[1.85]">
              {s.body}
            </p>
          </div>
        ))}
      </div>

      <Separator className="bg-border my-12" />

      {/* Footer nav */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Questions? Contact POLYMART through Ko-fi or Discord.
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