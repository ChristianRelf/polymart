import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Circle as HelpCircle, TrendingUp, Code as Code2, Bot, ChartBar as BarChart2, Search, ArrowRight, ChevronRight, Activity, Globe, TriangleAlert as AlertTriangle, BookOpen, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

type Route = "home" | "market" | "api" | "terms" | "privacy" | "education" | "changelog" | "products" | "help"

interface Props {
  onNavigate: (r: Route) => void
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3">
      {children}
    </p>
  )
}

// ── Category pill ─────────────────────────────────────────────────────────────
function CategoryTab({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ElementType
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border-0",
        active
          ? "bg-foreground text-background"
          : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-ring"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}

// ── FAQ entry ─────────────────────────────────────────────────────────────────
interface FaqItem {
  q: string
  a: React.ReactNode
  category: string
}

const ALL_FAQS: FaqItem[] = [
  // Getting Started
  {
    category: "Getting Started",
    q: "What is Polymart?",
    a: "Polymart is a persistent simulated stock exchange. It runs a continuous price engine driving 132 fictional tickers across 20 sectors. Everything — prices, companies, events — is entirely fictional. It is a tool for learning, building, and experimenting with market data without any real financial risk.",
  },
  {
    category: "Getting Started",
    q: "Is Polymart free to use?",
    a: "Yes. The website, the live market view, and the full REST API are all free with no account required.",
  },
  {
    category: "Getting Started",
    q: "Do I need to create an account?",
    a: "No account is needed for any current feature. You can browse the market, view charts, and query the API without signing in.",
  },
  {
    category: "Getting Started",
    q: "Is any of this real financial data?",
    a: "No. Every ticker, company name, price, and market event is entirely fictional. Polymart is a simulation only. Nothing on this platform constitutes financial advice.",
  },

  // The Market
  {
    category: "The Market",
    q: "How does the price simulation work?",
    a: "Prices update on a continuous tick cycle. Each tick applies a combination of: volatility (each stock has its own profile), momentum carry-over, RSI feedback (overbought/oversold pressure), order flow imbalance from buy/sell volumes, macro sensitivity (some sectors respond to interest rates or inflation), and randomised market events such as earnings beats, analyst upgrades, or sector shocks.",
  },
  {
    category: "The Market",
    q: "How often do prices update?",
    a: "The market ticks every 10 seconds. The website polls for fresh data on the same interval and updates charts and prices in real time.",
  },
  {
    category: "The Market",
    q: "What sectors are covered?",
    a: "Twenty sectors: Technology, AI & Machine Learning, Biotech, Crypto, Space & Defence, Meme Stocks, Energy, Automotive, Real Estate, Travel & Leisure, Logistics, Agriculture, Healthcare, Finance, Gaming, Green Energy, Consumer Goods, Media, Industrials, and Telecommunications.",
  },
  {
    category: "The Market",
    q: "What does the Fear & Greed index represent?",
    a: "The Fear & Greed index is a synthetic sentiment score between 0 (extreme fear) and 100 (extreme greed) calculated from market-wide momentum, breadth, and volatility. It influences how aggressively the simulation applies upward or downward pressure across all stocks.",
  },
  {
    category: "The Market",
    q: "What are macro variables and how do they affect stocks?",
    a: "Three macro variables drift over time: interest rate, inflation, and GDP growth. Sectors are sensitive to these in different ways — Green Energy tends to underperform when interest rates are high (capital-intensive), Defence tends to benefit from geopolitical tension reflected in macro stress, and Consumer Goods are more inflation-sensitive. The effect is applied as a weighting multiplier on each tick.",
  },
  {
    category: "The Market",
    q: "What is the Market Composite Index?",
    a: "The Polymart Composite Index is a market-cap-weighted average of all 132 tickers. It gives a single number summarising overall market direction, similar in concept to a broad market index.",
  },
  {
    category: "The Market",
    q: "How do I read the chart on the Market page?",
    a: "The chart shows price history for a selected ticker. You can switch between line view and candlestick view using the toggle in the chart header. Candles show open, high, low, and close for each data point. The chart also overlays technical indicator data when selected.",
  },

  // API
  {
    category: "API",
    q: "Where do I find the API documentation?",
    a: (
      <span>
        Full API documentation is available on the{" "}
        <span className="font-semibold text-foreground">API Docs</span>{" "}
        page in the main navigation. It covers all endpoints, parameters, and example responses.
      </span>
    ),
  },
  {
    category: "API",
    q: "Do I need an API key?",
    a: "No. All current API endpoints are open and require no authentication. Make GET requests directly from any HTTP client.",
  },
  {
    category: "API",
    q: "What is the base URL for the API?",
    a: (
      <span>
        The base URL is{" "}
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[11px] font-mono">
          https://polymart.co/api/v1/
        </code>
        . All endpoints are GET requests and return JSON.
      </span>
    ),
  },
  {
    category: "API",
    q: "What endpoints are available?",
    a: (
      <ul className="space-y-2 mt-1">
        {[
          ["GET /getStocks", "All 132 tickers with key fields"],
          ["GET /getStock?ticker=APEX", "Full detail for a single ticker"],
          ["GET /getSectors", "All sectors with aggregate data"],
          ["GET /getSector?sector=Tech", "Single sector with ticker list"],
          ["GET /getIndex", "Composite market index value"],
          ["GET /getMarketState", "Macro variables and market status"],
        ].map(([endpoint, desc]) => (
          <li key={endpoint} className="flex items-start gap-2">
            <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0">{endpoint}</code>
            <span className="text-xs text-muted-foreground">{desc}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    category: "API",
    q: "Is there a rate limit?",
    a: "Yes. The hosted API applies a sliding-window limit of 60 requests per minute per IP address. The /getStocks endpoint counts as 3 tokens due to payload size. For most use cases — polling every 5–10 seconds — this limit is never reached.",
  },
  {
    category: "API",
    q: "Can I use the API from a browser frontend?",
    a: "Yes. The API has permissive CORS headers and can be called directly from client-side JavaScript using fetch() or any HTTP library.",
  },

  // Discord
  {
    category: "Discord",
    q: "How do I add the Polymart bot to my server?",
    a: "Use the 'Add to Discord' button in the top-right of the navigation bar. This will take you through Discord's standard bot authorisation flow. No configuration is needed after adding it.",
  },
  {
    category: "Discord",
    q: "What commands does the Discord bot support?",
    a: (
      <ul className="space-y-2 mt-1">
        {[
          ["/price [ticker]", "Current price, % change, RSI, and trend direction"],
          ["/stock [ticker]", "Full detail card with all key indicators"],
          ["/market", "Top movers, sector performance, and Fear & Greed"],
          ["/index", "Polymart Composite Index current value"],
          ["/sector [name]", "Sector summary with top performers"],
        ].map(([cmd, desc]) => (
          <li key={cmd} className="flex items-start gap-2">
            <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0">{cmd}</code>
            <span className="text-xs text-muted-foreground">{desc}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    category: "Discord",
    q: "Does the bot need any special permissions?",
    a: "The bot requires permission to send messages and embed links in the channels where it is used. It does not require administrator permissions, access to server members, or any sensitive permissions.",
  },

  // Technical Indicators
  {
    category: "Indicators",
    q: "What is RSI and how is it used here?",
    a: "RSI (Relative Strength Index) is a momentum indicator on a 0–100 scale. Readings above 70 are considered overbought (potential pullback), below 30 oversold (potential bounce). In Polymart's simulation, the RSI feeds back into price movement — an overbought stock faces incremental downward pressure on each tick.",
  },
  {
    category: "Indicators",
    q: "What do the Bollinger Bands show?",
    a: "Bollinger Bands plot a moving average (SMA 20) with upper and lower bands set at 2 standard deviations. When price touches the upper band, the stock may be extended; touching the lower band may indicate oversold conditions. Bandwidth (the gap between bands) reflects current volatility — a squeeze often precedes a breakout.",
  },
  {
    category: "Indicators",
    q: "What is MACD?",
    a: "MACD (Moving Average Convergence/Divergence) is calculated as the difference between EMA 12 and EMA 26. The signal line is a 9-period EMA of the MACD line. The histogram shows the gap between MACD and signal. A MACD line crossing above the signal line is typically a bullish signal; crossing below is bearish.",
  },
  {
    category: "Indicators",
    q: "What does ATR measure?",
    a: "ATR (Average True Range) measures volatility — specifically the average range between high and low prices over 14 periods. A rising ATR means the market is becoming more volatile; a falling ATR signals calmer conditions.",
  },
  {
    category: "Indicators",
    q: "What is VWAP?",
    a: "VWAP (Volume-Weighted Average Price) is the average price weighted by volume over the session. It is often used as a reference for whether a stock is trading above or below fair value for the day. Institutional trading algorithms commonly use VWAP as a benchmark.",
  },
]

const CATEGORIES = ["All", "Getting Started", "The Market", "API", "Discord", "Indicators"]
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "All": Layers,
  "Getting Started": BookOpen,
  "The Market": TrendingUp,
  "API": Code2,
  "Discord": Bot,
  "Indicators": BarChart2,
}

// ── Quick link card ────────────────────────────────────────────────────────────
function QuickCard({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ElementType
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-5 flex items-start gap-4 text-left hover:border-ring transition-colors group cursor-pointer w-full"
    >
      <div className="w-9 h-9 rounded-lg bg-foreground/5 border border-border flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground mb-0.5">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors mt-0.5 shrink-0" />
    </button>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function HelpCenterPage({ onNavigate }: Props) {
  const [activeCategory, setActiveCategory] = useState("All")
  const [query, setQuery] = useState("")

  const filtered = ALL_FAQS.filter(item => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory
    const q = query.trim().toLowerCase()
    const matchesSearch = !q || item.q.toLowerCase().includes(q)
    return matchesCategory && matchesSearch
  })

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-16">

      {/* ── Hero ── */}
      <div className="mb-16">
        <div className="flex items-center gap-2 mb-5">
          <Badge variant="outline" className="text-xs border-border gap-1.5">
            <HelpCircle className="w-3 h-3" />
            Help Center
          </Badge>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-5 text-balance">
          How can we help?
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
          Answers to common questions about using the market, the API, Discord integration,
          and technical indicators.
        </p>

        {/* Search */}
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search for an answer..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9 bg-card border-border text-sm"
          />
        </div>
      </div>

      <Separator className="mb-16" />

      {/* ── Quick links ── */}
      {!query && activeCategory === "All" && (
        <div className="mb-16">
          <SectionLabel>Quick Links</SectionLabel>
          <h2 className="text-2xl font-bold text-foreground mb-6">Jump to a topic</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <QuickCard
              icon={TrendingUp}
              title="Open the Market"
              desc="Browse live prices, charts, and sector data."
              onClick={() => onNavigate("market")}
            />
            <QuickCard
              icon={Code2}
              title="API Reference"
              desc="All endpoints, parameters, and example responses."
              onClick={() => onNavigate("api")}
            />
            <QuickCard
              icon={Bot}
              title="Add Discord Bot"
              desc="Get Polymart market data in your Discord server."
              onClick={() => window.open("https://discord.com/api/oauth2/authorize?client_id=POLYMART_BOT&permissions=2147483648&scope=bot+applications.commands", "_blank")}
            />
            <QuickCard
              icon={Activity}
              title="Changelog"
              desc="See what's new — features, fixes, and updates."
              onClick={() => onNavigate("changelog")}
            />
            <QuickCard
              icon={Globe}
              title="Education"
              desc="Using Polymart for learning, research, and ML training data."
              onClick={() => onNavigate("education")}
            />
            <QuickCard
              icon={Layers}
              title="Products"
              desc="All current and upcoming Polymart simulations."
              onClick={() => onNavigate("products")}
            />
          </div>
        </div>
      )}

      {/* ── Disclaimer ── */}
      {!query && activeCategory === "All" && (
        <div className="flex items-start gap-3 bg-card border border-border rounded-xl p-4 mb-10">
          <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Polymart is a simulation. All tickers, companies, prices, and events are entirely fictional.
            Nothing on this platform constitutes financial advice or represents real market conditions.
          </p>
        </div>
      )}

      {/* ── FAQ ── */}
      <div>
        <SectionLabel>FAQ</SectionLabel>
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <h2 className="text-2xl font-bold text-foreground">
            {query ? `Results for "${query}"` : "Common Questions"}
          </h2>
          <span className="text-xs text-muted-foreground">{filtered.length} article{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Category filter */}
        {!query && (
          <div className="flex flex-wrap gap-2 mb-8">
            {CATEGORIES.map(cat => (
              <CategoryTab
                key={cat}
                label={cat}
                icon={CATEGORY_ICONS[cat]}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">No results found</p>
            <p className="text-xs text-muted-foreground">Try a different search term or browse by category.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Group by category when showing All without search */}
            {activeCategory === "All" && !query
              ? CATEGORIES.filter(c => c !== "All").map(cat => {
                  const catItems = filtered.filter(f => f.category === cat)
                  if (!catItems.length) return null
                  return (
                    <div key={cat} className="mb-8">
                      <div className="flex items-center gap-2 mb-3">
                        {(() => {
                          const Icon = CATEGORY_ICONS[cat]
                          return <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        })()}
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.12em]">{cat}</p>
                      </div>
                      <Accordion type="single" collapsible className="space-y-2">
                        {catItems.map((item, i) => (
                          <AccordionItem
                            key={i}
                            value={`${cat}-${i}`}
                            className="bg-card border border-border rounded-xl px-5 data-[state=open]:border-ring transition-colors"
                          >
                            <AccordionTrigger className="text-sm font-semibold text-foreground py-4 hover:no-underline text-left">
                              {item.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                              {item.a}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  )
                })
              : (
                <Accordion type="single" collapsible className="space-y-2">
                  {filtered.map((item, i) => (
                    <AccordionItem
                      key={i}
                      value={String(i)}
                      className="bg-card border border-border rounded-xl px-5 data-[state=open]:border-ring transition-colors"
                    >
                      <AccordionTrigger className="text-sm font-semibold text-foreground py-4 hover:no-underline text-left">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )
            }
          </div>
        )}
      </div>

      <Separator className="my-16" />

      {/* ── Still stuck ── */}
      <div className="bg-card border border-border rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="w-12 h-12 rounded-xl bg-foreground/5 border border-border flex items-center justify-center shrink-0">
          <HelpCircle className="w-6 h-6 text-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-base font-bold text-foreground mb-1.5">Still have questions?</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The API documentation covers all endpoints in full detail.
            For anything else, the Polymart Discord bot is a good way to test queries live.
          </p>
        </div>
        <button
          onClick={() => onNavigate("api")}
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-semibold cursor-pointer border-0 hover:opacity-90 transition-opacity shrink-0"
        >
          API Docs
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  )
}
