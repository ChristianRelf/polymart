import { type Route } from "@/App"
import { Button } from "@/components/ui/button"
import { Shield, AlertTriangle, Ban, Flag, MessageSquare, Users, ChevronRight } from "lucide-react"

interface Props {
  onNavigate: (r: Route) => void
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
          {icon}
        </div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      <div className="pl-9 space-y-2 text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </div>
  )
}

function RuleCard({ label, description, severity }: { label: string; description: string; severity: "critical" | "high" | "medium" }) {
  const colors = {
    critical: "border-red-500/20 bg-red-500/5 text-red-400",
    high:     "border-orange-500/20 bg-orange-500/5 text-orange-400",
    medium:   "border-yellow-500/20 bg-yellow-500/5 text-yellow-400",
  }
  const labels = { critical: "Zero Tolerance", high: "Strict Enforcement", medium: "Moderated" }
  return (
    <div className={`rounded-lg border p-3.5 ${colors[severity].split(" ").slice(0, 2).join(" ")}`}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${colors[severity]}`}>{labels[severity]}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

export default function CommunityStandardsPage({ onNavigate }: Props) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <button onClick={() => onNavigate("communities")} className="hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0">
            Communities
          </button>
          <ChevronRight className="w-3 h-3" />
          <span>Community Standards</span>
        </div>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Community Standards</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Rules and guidelines that apply to all Polymart communities, posts, and interactions.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1.5">Last updated May 2026 · Applies to all community features</p>
          </div>
        </div>
      </div>

      {/* Overview */}
      <div className="bg-muted/30 border border-border rounded-xl p-5">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Polymart communities are spaces for traders, investors, and learners to share ideas, strategies, and analysis.
          These standards exist to keep every corner of Polymart respectful, constructive, and welcoming to everyone
          regardless of their background, experience level, or trading style. Violations may result in content removal,
          temporary suspension, or permanent bans depending on severity.
        </p>
      </div>

      {/* Prohibited content */}
      <Section icon={<Ban className="w-4 h-4" />} title="Prohibited Content">
        <p>The following content is strictly prohibited across all communities, posts, comments, and direct interactions on Polymart.</p>

        <div className="space-y-2.5 mt-3">
          <RuleCard
            severity="critical"
            label="Hate Speech & Racial Slurs"
            description="Any content that uses racial slurs, promotes hatred based on race, ethnicity, national origin, religion, gender, sexual orientation, disability, or any other protected characteristic. This includes coded language, dog whistles, and content designed to demean or dehumanise groups of people. Zero tolerance — immediate permanent ban on first offence."
          />
          <RuleCard
            severity="critical"
            label="Harassment & Targeted Abuse"
            description="Repeatedly targeting or threatening specific individuals. This includes doxxing (posting private information), coordinated harassment campaigns, sexual harassment, and persistent unwanted contact after a user has asked you to stop."
          />
          <RuleCard
            severity="critical"
            label="Violent Threats"
            description="Explicit or implied threats of violence toward any person or group. Content that glorifies, celebrates, or incites real-world violence."
          />
          <RuleCard
            severity="high"
            label="Financial Fraud & Pump-and-Dump"
            description="Deliberately spreading false information to manipulate simulated asset prices, coordinating pump-and-dump schemes, or impersonating financial advisors. Polymart is a simulation platform — treat it with the same integrity you would real markets."
          />
          <RuleCard
            severity="high"
            label="Spam & Unsolicited Promotion"
            description="Posting the same content repeatedly, unsolicited advertising, referral links, or using automated tools to generate posts or comments. Each post should add genuine value to the community."
          />
          <RuleCard
            severity="high"
            label="Misinformation"
            description="Deliberately spreading provably false financial, economic, or factual information intended to mislead others. Speculation and opinion are fine — knowingly false statements are not."
          />
          <RuleCard
            severity="medium"
            label="Off-Topic & Low-Quality Content"
            description="Posts that have no relevance to trading, investing, finance, or the community's stated purpose. Low-effort content such as single-word posts, content-free memes, or posts designed solely to farm engagement."
          />
          <RuleCard
            severity="medium"
            label="Impersonation"
            description="Claiming to be another user, public figure, moderator, or Polymart staff member. Creating accounts designed to confuse or mislead other users."
          />
        </div>
      </Section>

      {/* Content Moderation Policy */}
      <Section icon={<Flag className="w-4 h-4" />} title="Content Moderation Policy">
        <p>
          Polymart uses a layered moderation system combining automated filtering and human review:
        </p>

        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-border p-3.5">
            <p className="text-sm font-semibold text-foreground mb-1.5">Automated Filtering</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              All posts and comments are screened at submission for slurs, hate speech patterns, and known prohibited phrases.
              Content that triggers automated filters is blocked before it reaches other users. False positives can be appealed
              via the Help Center.
            </p>
          </div>

          <div className="rounded-lg border border-border p-3.5">
            <p className="text-sm font-semibold text-foreground mb-1.5">Community Reporting</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Any user can report content that violates these standards using the flag icon on any post or comment.
              Reported content is queued for moderator review. High-volume reports on the same content are escalated
              to administrators automatically.
            </p>
          </div>

          <div className="rounded-lg border border-border p-3.5">
            <p className="text-sm font-semibold text-foreground mb-1.5">Moderator & Admin Actions</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Community moderators can remove posts and comments within their community. Platform administrators
              handle cross-community issues, ban appeals, and zero-tolerance violations. All moderation actions
              are logged in an audit trail.
            </p>
          </div>

          <div className="rounded-lg border border-border p-3.5">
            <p className="text-sm font-semibold text-foreground mb-1.5">Enforcement Ladder</p>
            <ul className="text-xs text-muted-foreground space-y-1 mt-1">
              <li className="flex items-start gap-2"><span className="text-yellow-400 shrink-0 mt-0.5">①</span> Content removal and written warning</li>
              <li className="flex items-start gap-2"><span className="text-orange-400 shrink-0 mt-0.5">②</span> Temporary community ban (3–30 days depending on severity)</li>
              <li className="flex items-start gap-2"><span className="text-red-400 shrink-0 mt-0.5">③</span> Permanent community ban</li>
              <li className="flex items-start gap-2"><span className="text-red-500 shrink-0 mt-0.5">④</span> Platform-wide ban (for zero-tolerance violations or repeat offenders)</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* Healthy community guidelines */}
      <Section icon={<MessageSquare className="w-4 h-4" />} title="Building a Healthy Community">
        <p>Beyond avoiding prohibited content, great communities are built on positive contributions:</p>
        <ul className="space-y-1.5 mt-2">
          <li className="flex items-start gap-2"><span className="text-emerald-400 shrink-0 mt-0.5">→</span> Share your reasoning, not just conclusions — help others learn</li>
          <li className="flex items-start gap-2"><span className="text-emerald-400 shrink-0 mt-0.5">→</span> Disagree respectfully — challenge ideas, not people</li>
          <li className="flex items-start gap-2"><span className="text-emerald-400 shrink-0 mt-0.5">→</span> Welcome newcomers — everyone started somewhere</li>
          <li className="flex items-start gap-2"><span className="text-emerald-400 shrink-0 mt-0.5">→</span> Acknowledge when you're wrong — markets humiliate everyone eventually</li>
          <li className="flex items-start gap-2"><span className="text-emerald-400 shrink-0 mt-0.5">→</span> Be specific — vague hot takes help nobody</li>
          <li className="flex items-start gap-2"><span className="text-emerald-400 shrink-0 mt-0.5">→</span> Check your sources — cite data when making factual claims</li>
        </ul>
      </Section>

      {/* For moderators */}
      <Section icon={<Users className="w-4 h-4" />} title="For Community Moderators">
        <p>As a community owner or moderator, you agree to uphold these standards within your community and use moderation powers responsibly:</p>
        <ul className="space-y-1.5 mt-2">
          <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0 mt-0.5">→</span> Moderate consistently — apply the same standards to all members including friends</li>
          <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0 mt-0.5">→</span> Document your reasoning — use the mod log to record actions taken</li>
          <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0 mt-0.5">→</span> Don't abuse banning — bans should be for policy violations, not personal disagreements</li>
          <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0 mt-0.5">→</span> Report platform-level violations — escalate zero-tolerance content to admins immediately</li>
          <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0 mt-0.5">→</span> Set clear community rules — use the rules section to set expectations for your members</li>
        </ul>
        <p className="mt-3">
          Moderators who abuse their powers or fail to enforce these platform-wide standards may have their moderator role
          revoked by platform administrators.
        </p>
      </Section>

      {/* Reporting and appeals */}
      <Section icon={<AlertTriangle className="w-4 h-4" />} title="Reporting & Appeals">
        <p>
          If you see content that violates these standards, use the flag/report button on any post or comment.
          Do not engage with or repost prohibited content — this can inadvertently spread it further.
        </p>
        <p className="mt-2">
          If your content was removed and you believe it was in error, or if you were banned and wish to appeal,
          please contact support via the Help Center. Include the post URL or share ID and your reasoning.
          Appeals for zero-tolerance violations (hate speech, racial slurs, violent threats) are not accepted.
        </p>
      </Section>

      {/* CTA */}
      <div className="border border-border rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Ready to contribute?</p>
          <p className="text-xs text-muted-foreground mt-0.5">Explore communities or start your own around your trading niche.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => onNavigate("help")}>Help Center</Button>
          <Button size="sm" onClick={() => onNavigate("communities")}>Browse Communities</Button>
        </div>
      </div>

    </div>
  )
}
