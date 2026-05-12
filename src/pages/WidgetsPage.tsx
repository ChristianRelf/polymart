import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Check, Copy, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Route = "home" | "market" | "api" | "terms" | "privacy" | "changelog" | "education" | "products" | "help" | "widgets"

interface Props {
  onNavigate: (r: Route) => void
}

// ── Code block with copy button ───────────────────────────────────────────────
function CodeBlock({ code, lang = "HTML" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="rounded-xl border border-border overflow-hidden mb-5">
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border bg-card">
        <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest">
          {lang}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
        >
          {copied
            ? <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Copied</span>
            : <span className="flex items-center gap-1.5"><Copy className="w-3 h-3" /> Copy</span>
          }
        </button>
      </div>
      <pre className="p-5 text-[13px] font-mono text-muted-foreground leading-relaxed overflow-x-auto bg-background/40 whitespace-pre">
        {code}
      </pre>
    </div>
  )
}

// ── Attribute reference table ─────────────────────────────────────────────────
interface AttrRow { name: string; type: string; desc: string }

function AttrsTable({ attrs }: { attrs: AttrRow[] }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border bg-card">
            <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold w-32">
              Attribute
            </th>
            <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold w-48">
              Type
            </th>
            <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {attrs.map((a, i) => (
            <tr key={a.name} className={cn("border-b border-border/40 last:border-b-0", i % 2 !== 0 && "bg-card/20")}>
              <td className="py-2.5 px-4 font-mono text-foreground text-[13px] align-top">{a.name}</td>
              <td className="py-2.5 px-4 font-mono text-muted-foreground text-[12px] align-top">{a.type}</td>
              <td className="py-2.5 px-4 text-muted-foreground text-[13px] align-top">{a.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WidgetsPage({ onNavigate }: Props) {
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-16">

      {/* Hero */}
      <div className="mb-14">
        <div className="flex items-center gap-2 mb-5">
          <Badge variant="outline" className="text-xs border-border gap-1.5">
            Embeds &amp; Widgets
          </Badge>
          <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/5">
            Live
          </Badge>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4 text-balance">
          Drop-in market widgets
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
          Embed live Polymart data on any webpage with a single script tag. Seven ready-made
          widgets, Shadow DOM isolated, zero dependencies, no API key required.
        </p>
        <CodeBlock
          lang="Setup — add once to your page"
          code={`<script src="https://polymart.co/widgets/polymart-widgets.js" defer></script>`}
        />
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-14">
        {[
          { id: "ticker",      label: "Ticker",      sub: "Price card"    },
          { id: "market",      label: "Market",      sub: "Index stats"   },
          { id: "leaderboard", label: "Leaderboard", sub: "Rankings"      },
          { id: "tape",        label: "Tape",        sub: "Scrolling"     },
          { id: "sparkline",   label: "Sparkline",   sub: "Inline chart"  },
          { id: "sector",      label: "Sector",      sub: "Breakdown"     },
          { id: "events",      label: "Events",      sub: "News feed"     },
        ].map(({ id, label, sub }) => (
          <a
            key={id}
            href={`#widget-${id}`}
            className="flex flex-col bg-card border border-border rounded-xl p-3 hover:border-ring transition-colors no-underline"
          >
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <span className="text-[11px] text-muted-foreground">{sub}</span>
          </a>
        ))}
      </div>

      <Separator className="mb-14" />

      {/* ── 1. Ticker ── */}
      <section id="widget-ticker" className="mb-20 scroll-mt-20">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Widget</p>
        <h2 className="text-2xl font-bold text-foreground mb-2">Price Ticker</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          A compact card showing a single stock's price, change, key stats, and sparkline chart.
          Drop it into blog posts, dashboards, or sidebars.
        </p>
        <div className="bg-card/30 border border-border rounded-xl p-8 flex justify-center mb-5">
          <polymart-ticker ticker="APEX" />
        </div>
        <CodeBlock code={`<polymart-ticker ticker="APEX"></polymart-ticker>

<!-- Without sparkline chart -->
<polymart-ticker ticker="VOID" chart="false"></polymart-ticker>

<!-- Light theme -->
<polymart-ticker ticker="LUNATEK" theme="light"></polymart-ticker>`} />
        <AttrsTable attrs={[
          { name: "ticker",   type: "string",          desc: 'Ticker symbol (e.g. "APEX"). Default: "APEX"' },
          { name: "chart",    type: '"true" | "false"', desc: "Show sparkline chart. Default: true" },
          { name: "theme",    type: '"dark" | "light"', desc: "Color theme. Default: dark" },
          { name: "interval", type: "number",           desc: "Refresh interval in ms. Default: 5000" },
        ]} />
      </section>

      {/* ── 2. Market ── */}
      <section id="widget-market" className="mb-20 scroll-mt-20">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Widget</p>
        <h2 className="text-2xl font-bold text-foreground mb-2">Market Summary</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          Full market overview with index value, macro indicators, Fear &amp; Greed gauge,
          and top movers at a glance.
        </p>
        <div className="bg-card/30 border border-border rounded-xl p-8 flex justify-center mb-5">
          <polymart-market />
        </div>
        <CodeBlock code={`<polymart-market></polymart-market>

<!-- Light theme -->
<polymart-market theme="light"></polymart-market>`} />
        <AttrsTable attrs={[
          { name: "theme",    type: '"dark" | "light"', desc: "Color theme. Default: dark" },
          { name: "interval", type: "number",           desc: "Refresh interval in ms. Default: 5000" },
        ]} />
      </section>

      {/* ── 3. Leaderboard ── */}
      <section id="widget-leaderboard" className="mb-20 scroll-mt-20">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Widget</p>
        <h2 className="text-2xl font-bold text-foreground mb-2">Leaderboard</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          Ranked table of stocks sorted by any metric — change, price, volume, RSI, streak,
          or all-time high.
        </p>
        <div className="bg-card/30 border border-border rounded-xl p-8 flex justify-center mb-5">
          <polymart-leaderboard by="change" limit="8" title="Top Gainers" />
        </div>
        <CodeBlock code={`<!-- Top gainers -->
<polymart-leaderboard by="change" limit="10"></polymart-leaderboard>

<!-- Biggest losers -->
<polymart-leaderboard by="change" dir="asc" title="Biggest Losers"></polymart-leaderboard>

<!-- Most overbought by RSI -->
<polymart-leaderboard by="rsi" limit="5" title="Overbought"></polymart-leaderboard>`} />
        <AttrsTable attrs={[
          { name: "by",       type: "string",          desc: '"change" | "price" | "volume" | "rsi" | "ath" | "streak". Default: "change"' },
          { name: "dir",      type: '"asc" | "desc"',  desc: "Sort direction. Default: desc" },
          { name: "limit",    type: "number",          desc: "Number of stocks shown (1–132). Default: 10" },
          { name: "title",    type: "string",          desc: "Custom heading text" },
          { name: "theme",    type: '"dark" | "light"', desc: "Color theme. Default: dark" },
          { name: "interval", type: "number",          desc: "Refresh interval in ms. Default: 5000" },
        ]} />
      </section>

      {/* ── 4. Tape ── */}
      <section id="widget-tape" className="mb-20 scroll-mt-20">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Widget</p>
        <h2 className="text-2xl font-bold text-foreground mb-2">Ticker Tape</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          Continuously scrolling horizontal ticker tape showing the most active stocks by volume.
          Sized to fill its container.
        </p>
        <div className="bg-card/30 border border-border rounded-xl overflow-hidden mb-5">
          <polymart-tape limit="15" style={{ width: "100%" }} />
        </div>
        <CodeBlock code={`<polymart-tape></polymart-tape>

<!-- Slower scroll with more stocks -->
<polymart-tape speed="20" limit="30"></polymart-tape>`} />
        <AttrsTable attrs={[
          { name: "speed",    type: "number",          desc: "Scroll speed (higher = faster). Default: 40" },
          { name: "limit",    type: "number",          desc: "Number of stocks shown. Default: 20" },
          { name: "theme",    type: '"dark" | "light"', desc: "Color theme. Default: dark" },
          { name: "interval", type: "number",          desc: "Refresh interval in ms. Default: 5000" },
        ]} />
      </section>

      {/* ── 5. Sparkline ── */}
      <section id="widget-sparkline" className="mb-20 scroll-mt-20">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Widget</p>
        <h2 className="text-2xl font-bold text-foreground mb-2">Sparkline</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          A tiny inline price chart you can drop into any text flow — tables, paragraphs,
          or alongside other widgets.
        </p>
        <div className="bg-card/30 border border-border rounded-xl p-8 flex justify-center gap-10 flex-wrap mb-5">
          {["APEX", "VOID", "LUNATEK"].map(t => (
            <div key={t} className="flex flex-col items-center gap-2">
              <span className="font-mono text-xs font-bold text-foreground">{t}</span>
              <polymart-sparkline ticker={t} width="140" height="36" />
            </div>
          ))}
        </div>
        <CodeBlock code={`<!-- Inline sparkline -->
<polymart-sparkline ticker="VOID"></polymart-sparkline>

<!-- Custom size -->
<polymart-sparkline ticker="APEX" width="200" height="48"></polymart-sparkline>`} />
        <AttrsTable attrs={[
          { name: "ticker", type: "string", desc: "Ticker symbol. Default: APEX" },
          { name: "width",  type: "number", desc: "Chart width in px. Default: 120" },
          { name: "height", type: "number", desc: "Chart height in px. Default: 32" },
        ]} />
      </section>

      {/* ── 6. Sector ── */}
      <section id="widget-sector" className="mb-20 scroll-mt-20">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Widget</p>
        <h2 className="text-2xl font-bold text-foreground mb-2">Sector Overview</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          All stocks within a sector with aggregate stats. Available sectors: tech, food, space,
          meme, green, finance, gaming, health, crypto, defence, retail, media, auto, realty,
          travel, ai, bio, energy, logistics, agri.
        </p>
        <div className="bg-card/30 border border-border rounded-xl p-8 flex justify-center mb-5">
          <polymart-sector sector="crypto" />
        </div>
        <CodeBlock code={`<polymart-sector sector="crypto"></polymart-sector>

<polymart-sector sector="ai"></polymart-sector>

<polymart-sector sector="meme" theme="light"></polymart-sector>`} />
        <AttrsTable attrs={[
          { name: "sector",   type: "string",          desc: 'Sector key (e.g. "crypto", "ai", "tech"). Default: tech' },
          { name: "theme",    type: '"dark" | "light"', desc: "Color theme. Default: dark" },
          { name: "interval", type: "number",          desc: "Refresh interval in ms. Default: 5000" },
        ]} />
      </section>

      {/* ── 7. Events ── */}
      <section id="widget-events" className="mb-20 scroll-mt-20">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Widget</p>
        <h2 className="text-2xl font-bold text-foreground mb-2">Market Events</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          Live feed of market events — flash crashes, sector booms, meme frenzies, and more
          with bullish/bearish impact indicators.
        </p>
        <div className="bg-card/30 border border-border rounded-xl p-8 flex justify-center mb-5">
          <polymart-events limit="5" />
        </div>
        <CodeBlock code={`<polymart-events limit="5"></polymart-events>

<!-- Filter to a specific sector -->
<polymart-events sector="crypto" limit="10"></polymart-events>`} />
        <AttrsTable attrs={[
          { name: "limit",    type: "number", desc: "Max events shown (1–30). Default: 5" },
          { name: "sector",   type: "string", desc: "Filter to a specific sector (optional)" },
          { name: "theme",    type: '"dark" | "light"', desc: "Color theme. Default: dark" },
          { name: "interval", type: "number", desc: "Refresh interval in ms. Default: 5000" },
        ]} />
      </section>

      <Separator className="mb-14" />

      {/* Global Options */}
      <section className="mb-14">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Reference</p>
        <h2 className="text-2xl font-bold text-foreground mb-2">Global Options</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xl">
          Every widget supports these shared attributes.
        </p>
        <AttrsTable attrs={[
          {
            name: "theme",
            type: '"dark" | "light"',
            desc: "Color scheme. Default: dark. Widgets use Shadow DOM so they won't conflict with your site's styles.",
          },
          {
            name: "interval",
            type: "number",
            desc: "Auto-refresh interval in ms. Default: 5000 (matches the simulation tick rate). Raise this to reduce API calls.",
          },
          {
            name: "logo",
            type: "url",
            desc: "Custom logo URL for the Polymart branding footer. Default: polymart.co/polymartlogo.png",
          },
        ]} />
      </section>

      {/* Bottom CTA */}
      <div className="bg-card border border-border rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex-1">
          <p className="text-base font-bold text-foreground mb-1.5">Explore the live market</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            See the data powering these widgets on the Polymart market dashboard.
          </p>
        </div>
        <Button onClick={() => onNavigate("market")} className="font-semibold shrink-0">
          View Market
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>

    </div>
  )
}
