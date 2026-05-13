import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, Copy, ArrowRight, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

type Route = "home" | "market" | "api" | "terms" | "privacy" | "changelog" | "education" | "products" | "help" | "widgets"

interface Props {
  onNavigate: (r: Route) => void
}

function CodeBlock({ code, lang = "HTML" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="rounded-xl border border-border overflow-hidden mb-5">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card">
        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">{lang}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
        >
          {copied
            ? <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Copied</span>
            : <span className="flex items-center gap-1.5"><Copy className="w-3 h-3" /> Copy</span>}
        </button>
      </div>
      <pre className="p-5 text-[12.5px] font-mono text-muted-foreground leading-relaxed overflow-x-auto bg-background/40 whitespace-pre">
        {code}
      </pre>
    </div>
  )
}

interface AttrRow { name: string; type: string; desc: string }
function AttrsTable({ attrs }: { attrs: AttrRow[] }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border bg-card">
            <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-widest text-muted-foreground font-bold w-32">Attribute</th>
            <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-widest text-muted-foreground font-bold w-48">Type</th>
            <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Description</th>
          </tr>
        </thead>
        <tbody>
          {attrs.map((a, i) => (
            <tr key={a.name} className={cn("border-b border-border/40 last:border-b-0", i % 2 !== 0 && "bg-card/20")}>
              <td className="py-2.5 px-4 font-mono text-foreground text-[12.5px] align-top">{a.name}</td>
              <td className="py-2.5 px-4 font-mono text-muted-foreground text-[11.5px] align-top">{a.type}</td>
              <td className="py-2.5 px-4 text-muted-foreground text-[12.5px] align-top">{a.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Dark-framed preview container matching the widget's own background */
function PreviewFrame({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn(
      "rounded-2xl border border-white/[0.07] overflow-hidden mb-5",
      "bg-[#0b0e14]",
    )}>
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[10px] font-mono font-semibold text-white/20 uppercase tracking-widest">Preview</span>
      </div>
      <div className={cn("flex items-start justify-center p-8 flex-wrap gap-6", wide && "px-0 pb-0")}>
        {children}
      </div>
    </div>
  )
}

const WIDGETS = [
  { id: "ticker",      label: "Ticker",      sub: "Price card"   },
  { id: "market",      label: "Market",      sub: "Index stats"  },
  { id: "leaderboard", label: "Leaderboard", sub: "Rankings"     },
  { id: "tape",        label: "Tape",        sub: "Scrolling"    },
  { id: "sparkline",   label: "Sparkline",   sub: "Inline chart" },
  { id: "sector",      label: "Sector",      sub: "Breakdown"    },
  { id: "events",      label: "Events",      sub: "News feed"    },
]

export default function WidgetsPage({ onNavigate }: Props) {
  return (
    <div className="max-w-[1060px] mx-auto px-8 py-16">

      {/* ── Hero ── */}
      <div className="mb-14">
        <div className="flex items-center gap-2 mb-6">
          <Badge variant="outline" className="text-xs border-border">Embeds &amp; Widgets</Badge>
          <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Live
          </Badge>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4 text-balance leading-[1.06]">
          Drop-in market widgets
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mb-8">
          Embed live Polymart data on any webpage with a single script tag. Seven ready-made
          widgets, Shadow DOM isolated, zero dependencies, no API key required.
        </p>
        <CodeBlock
          lang="Setup - add once to your page"
          code={`<script src="https://polymart.co/widgets/polymart-widgets.js" defer></script>`}
        />
        <a
          href="/demo/"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View live demo site
        </a>
      </div>

      {/* ── Widget index ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-14">
        {WIDGETS.map(({ id, label, sub }) => (
          <a
            key={id}
            href={`#widget-${id}`}
            className="flex flex-col bg-card border border-border rounded-xl p-3 hover:border-ring hover:bg-card/80 transition-colors no-underline group"
          >
            <span className="text-sm font-semibold text-foreground group-hover:text-foreground">{label}</span>
            <span className="text-[11px] text-muted-foreground">{sub}</span>
          </a>
        ))}
      </div>

      <div className="h-px bg-border mb-14" />

      {/* ── 1. Ticker ── */}
      <section id="widget-ticker" className="mb-20 scroll-mt-20">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Widget 1 of 7</p>
        <h2 className="text-2xl font-bold text-foreground mb-2">Price Ticker</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xl">
          Compact card showing a single stock's price, daily change, key stats, and sparkline chart.
          Drop it into blog posts, dashboards, or sidebars.
        </p>
        <PreviewFrame>
          <polymart-ticker ticker="APEX" />
        </PreviewFrame>
        <CodeBlock code={`<polymart-ticker ticker="APEX"></polymart-ticker>

<!-- Without sparkline -->
<polymart-ticker ticker="VOID" chart="false"></polymart-ticker>

<!-- Light theme -->
<polymart-ticker ticker="LUNATEK" theme="light"></polymart-ticker>`} />
        <AttrsTable attrs={[
          { name: "ticker",   type: "string",          desc: 'Ticker symbol (e.g. "APEX"). Default: "APEX"' },
          { name: "chart",    type: '"true" | "false"', desc: "Show sparkline chart. Default: true" },
          { name: "theme",    type: '"dark" | "light"', desc: "Color theme. Default: dark" },
          { name: "interval", type: "number",           desc: "Refresh interval ms. Default: 5000" },
        ]} />
      </section>

      {/* ── 2. Market ── */}
      <section id="widget-market" className="mb-20 scroll-mt-20">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Widget 2 of 7</p>
        <h2 className="text-2xl font-bold text-foreground mb-2">Market Summary</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xl">
          Full market overview with index value, macro indicators, Fear &amp; Greed gauge, and top movers at a glance.
        </p>
        <PreviewFrame>
          <polymart-market />
        </PreviewFrame>
        <CodeBlock code={`<polymart-market></polymart-market>

<!-- Light theme -->
<polymart-market theme="light"></polymart-market>`} />
        <AttrsTable attrs={[
          { name: "theme",    type: '"dark" | "light"', desc: "Color theme. Default: dark" },
          { name: "interval", type: "number",           desc: "Refresh interval ms. Default: 5000" },
        ]} />
      </section>

      {/* ── 3. Leaderboard ── */}
      <section id="widget-leaderboard" className="mb-20 scroll-mt-20">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Widget 3 of 7</p>
        <h2 className="text-2xl font-bold text-foreground mb-2">Leaderboard</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xl">
          Ranked table of stocks sorted by any metric - change, price, volume, RSI, streak, or all-time high.
        </p>
        <PreviewFrame>
          <polymart-leaderboard by="change" limit="8" title="Top Gainers" />
        </PreviewFrame>
        <CodeBlock code={`<!-- Top gainers -->
<polymart-leaderboard by="change" limit="10"></polymart-leaderboard>

<!-- Biggest losers -->
<polymart-leaderboard by="change" dir="asc" title="Biggest Losers"></polymart-leaderboard>

<!-- Most overbought by RSI -->
<polymart-leaderboard by="rsi" limit="5" title="Overbought"></polymart-leaderboard>`} />
        <AttrsTable attrs={[
          { name: "by",       type: "string",          desc: '"change" | "price" | "volume" | "rsi" | "ath" | "streak". Default: "change"' },
          { name: "dir",      type: '"asc" | "desc"',  desc: "Sort direction. Default: desc" },
          { name: "limit",    type: "number",          desc: "Rows shown (1–132). Default: 10" },
          { name: "title",    type: "string",          desc: "Custom heading text" },
          { name: "theme",    type: '"dark" | "light"', desc: "Color theme. Default: dark" },
          { name: "interval", type: "number",          desc: "Refresh interval ms. Default: 5000" },
        ]} />
      </section>

      {/* ── 4. Tape ── */}
      <section id="widget-tape" className="mb-20 scroll-mt-20">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Widget 4 of 7</p>
        <h2 className="text-2xl font-bold text-foreground mb-2">Ticker Tape</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xl">
          Continuously scrolling horizontal ticker tape showing the most active stocks by volume. Sizes to fill its container.
        </p>
        <PreviewFrame wide>
          <polymart-tape limit="15" style={{ width: "100%" }} />
        </PreviewFrame>
        <CodeBlock code={`<polymart-tape></polymart-tape>

<!-- Slower scroll, more stocks -->
<polymart-tape speed="20" limit="30"></polymart-tape>`} />
        <AttrsTable attrs={[
          { name: "speed",    type: "number",          desc: "Scroll speed (higher = faster). Default: 40" },
          { name: "limit",    type: "number",          desc: "Stocks shown. Default: 20" },
          { name: "theme",    type: '"dark" | "light"', desc: "Color theme. Default: dark" },
          { name: "interval", type: "number",          desc: "Refresh interval ms. Default: 5000" },
        ]} />
      </section>

      {/* ── 5. Sparkline ── */}
      <section id="widget-sparkline" className="mb-20 scroll-mt-20">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Widget 5 of 7</p>
        <h2 className="text-2xl font-bold text-foreground mb-2">Sparkline</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xl">
          Tiny inline price chart - drop it into tables, paragraphs, or headers alongside other content.
        </p>
        <PreviewFrame>
          {["APEX", "VOID", "LUNATEK"].map(t => (
            <div key={t} className="flex flex-col items-center gap-2">
              <span className="font-mono text-xs font-bold text-white/60">{t}</span>
              <polymart-sparkline ticker={t} width="140" height="36" />
            </div>
          ))}
        </PreviewFrame>
        <CodeBlock code={`<polymart-sparkline ticker="VOID"></polymart-sparkline>

<!-- Custom size -->
<polymart-sparkline ticker="APEX" width="200" height="48"></polymart-sparkline>`} />
        <AttrsTable attrs={[
          { name: "ticker", type: "string", desc: "Ticker symbol. Default: APEX" },
          { name: "width",  type: "number", desc: "Width px. Default: 120" },
          { name: "height", type: "number", desc: "Height px. Default: 32" },
        ]} />
      </section>

      {/* ── 6. Sector ── */}
      <section id="widget-sector" className="mb-20 scroll-mt-20">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Widget 6 of 7</p>
        <h2 className="text-2xl font-bold text-foreground mb-2">Sector Overview</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xl">
          All stocks within a sector with aggregate stats. Sectors: tech, food, space, meme, green, finance,
          gaming, health, crypto, defence, retail, media, auto, realty, travel, ai, bio, energy, logistics, agri.
        </p>
        <PreviewFrame>
          <polymart-sector sector="crypto" />
        </PreviewFrame>
        <CodeBlock code={`<polymart-sector sector="crypto"></polymart-sector>
<polymart-sector sector="ai"></polymart-sector>
<polymart-sector sector="meme" theme="light"></polymart-sector>`} />
        <AttrsTable attrs={[
          { name: "sector",   type: "string",          desc: 'Sector key (e.g. "crypto", "ai", "tech"). Default: tech' },
          { name: "theme",    type: '"dark" | "light"', desc: "Color theme. Default: dark" },
          { name: "interval", type: "number",          desc: "Refresh interval ms. Default: 5000" },
        ]} />
      </section>

      {/* ── 7. Events ── */}
      <section id="widget-events" className="mb-20 scroll-mt-20">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Widget 7 of 7</p>
        <h2 className="text-2xl font-bold text-foreground mb-2">Market Events</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xl">
          Live feed of market events - flash crashes, sector booms, meme frenzies - with bullish/bearish indicators.
        </p>
        <PreviewFrame>
          <polymart-events limit="5" />
        </PreviewFrame>
        <CodeBlock code={`<polymart-events limit="5"></polymart-events>

<!-- Filter to a sector -->
<polymart-events sector="crypto" limit="10"></polymart-events>`} />
        <AttrsTable attrs={[
          { name: "limit",    type: "number", desc: "Max events shown (1–30). Default: 5" },
          { name: "sector",   type: "string", desc: "Filter to a specific sector (optional)" },
          { name: "theme",    type: '"dark" | "light"', desc: "Color theme. Default: dark" },
          { name: "interval", type: "number", desc: "Refresh interval ms. Default: 5000" },
        ]} />
      </section>

      <div className="h-px bg-border mb-14" />

      {/* ── Global Options ── */}
      <section className="mb-14">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Reference</p>
        <h2 className="text-2xl font-bold text-foreground mb-2">Global Options</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xl">Shared attributes supported by every widget.</p>
        <AttrsTable attrs={[
          { name: "theme",    type: '"dark" | "light"', desc: "Color scheme. Widgets use Shadow DOM so they won't conflict with your site's styles. Default: dark." },
          { name: "interval", type: "number",           desc: "Auto-refresh interval ms. Default: 5000. Raise this to reduce API calls." },
          { name: "logo",     type: "url",              desc: "Custom logo URL for the Polymart branding footer." },
        ]} />
      </section>

      {/* ── Bottom CTA ── */}
      <div className="rounded-2xl border border-border bg-card p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex-1">
          <p className="text-base font-bold text-foreground mb-1.5">See the widgets in context</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The demo site shows all seven widgets embedded in a realistic company IR page.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/demo/"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-4 py-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Demo site
          </a>
          <Button onClick={() => onNavigate("market")} className="font-semibold">
            View Market
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </div>

    </div>
  )
}
