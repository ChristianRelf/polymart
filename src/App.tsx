import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Hop as Home, TrendingUp, Code as Code2, Layers, GraduationCap, Circle as HelpCircle, ShieldCheck, FileText, Bot, ArrowUpRight, Activity } from "lucide-react"
import { SimulationProvider, useSimulation } from "@/lib/SimulationContext"
import HomePage from "@/pages/HomePage"
import MarketPage from "@/pages/MarketPage"
import ApiDocsPage from "@/pages/ApiDocsPage"
import LegalPage from "@/pages/LegalPage"
import ChangelogPage from "@/pages/ChangelogPage"
import EducationPage from "@/pages/EducationPage"
import ProductsPage from "@/pages/ProductsPage"
import HelpCenterPage from "@/pages/HelpCenterPage"

// ── Routing ───────────────────────────────────────────────────────────────────
export type Route = "home" | "market" | "api" | "terms" | "privacy" | "changelog" | "education" | "products" | "help"

const HASH_MAP: Record<string, Route> = {
  "": "home",
  "/": "home",
  "/market": "market",
  "/docs/api": "api",
  "/api": "api",        // legacy redirect
  "/docs/terms": "terms",
  "/docs/privacy": "privacy",
  "/changelog": "changelog",
  "/education": "education",
  "/products": "products",
  "/help": "help",
}

const ROUTE_HASH: Record<Route, string> = {
  home: "/",
  market: "/market",
  api: "/docs/api",
  terms: "/docs/terms",
  privacy: "/docs/privacy",
  changelog: "/changelog",
  education: "/education",
  products: "/products",
  help: "/help",
}

function getRoute(): Route {
  const hash = window.location.hash.replace("#", "")
  return HASH_MAP[hash] ?? "home"
}

function navigate(r: Route) {
  window.location.hash = ROUTE_HASH[r]
}

// ── Tick Countdown ────────────────────────────────────────────────────────────
function TickCountdown({ intervalMs = 5_000 }: { intervalMs?: number }) {
  const { lastRefresh } = useSimulation()
  const [elapsed, setElapsed] = useState(0)
  const baseRef = useRef(lastRefresh || Date.now())

  // Reset base whenever the context signals a fresh fetch
  useEffect(() => {
    if (lastRefresh > 0) baseRef.current = lastRefresh
  }, [lastRefresh])

  useEffect(() => {
    const frame = setInterval(() => {
      setElapsed(Date.now() - baseRef.current)
    }, 50)
    return () => clearInterval(frame)
  }, [intervalMs])

  const size = 36
  const strokeWidth = 2.5
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const clampedElapsed = Math.min(elapsed, intervalMs)
  const progress = 1 - clampedElapsed / intervalMs
  const dashOffset = circumference * (1 - progress)
  const secondsLeft = Math.max(0, Math.ceil((intervalMs - clampedElapsed) / 1000))

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      title={`Next refresh in ${secondsLeft}s`}
    >
      {/* Ring SVG */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="stroke-emerald-400 transition-[stroke-dashoffset] duration-[50ms] ease-linear"
        />
       </svg>
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ route, setRoute }: { route: Route; setRoute: (r: Route) => void }) {
  const go = (r: Route) => { navigate(r); setRoute(r) }
  const isMarket = route === "market"

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-8 h-16 flex items-center gap-6">

        {/* Logo */}
        <button
          onClick={() => go("home")}
          className="cursor-pointer bg-transparent border-0 p-0 shrink-0 hover:opacity-80 transition-opacity"
        >
          <img src="/polymartlogo.png" alt="POLYMART" className="h-11 w-auto" />
        </button>


        <Separator orientation="vertical" className="h-5 bg-border" />

        {/* Nav links */}
        <nav className="flex items-stretch h-16 gap-0">
          {([
            ["home", "Home"],
            ["market", "Market"],
            ["api", "API Docs"],
            ["products", "Products"],
            ["education", "Education"],
            ["help", "Help"],
          ] as [Route, string][]).map(([r, label]) => (
            <button
              key={r}
              onClick={() => go(r)}
              className={cn(
                "px-4 text-sm font-medium transition-colors cursor-pointer bg-transparent border-0 border-b-2 h-full",
                route === r
                  ? "text-foreground border-foreground"
                  : "text-muted-foreground border-transparent hover:text-foreground/80"
              )}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          {isMarket && (
            <div className="hidden sm:flex">
              <TickCountdown intervalMs={5_000} />
            </div>
          )}
          <Button variant="outline" size="sm" className="text-xs border-border font-medium" asChild>
            <a
              href="https://discord.com/api/oauth2/authorize?client_id=POLYMART_BOT&permissions=2147483648&scope=bot+applications.commands"
              target="_blank"
              rel="noopener noreferrer"
            >
              Add to Discord
            </a>
          </Button>
        </div>

      </div>
    </header>
  )
}

// ── Footer nav link ───────────────────────────────────────────────────────────
function FooterLink({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0 w-fit"
    >
      <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
      {label}
    </button>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer({ setRoute }: { setRoute: (r: Route) => void }) {
  const go = (r: Route) => { navigate(r); setRoute(r) }

  return (
    <footer className="border-t border-border mt-auto">
      {/* Main footer body */}
      <div className="max-w-[1600px] mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12">

          {/* Left: brand + nav columns */}
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_1fr] gap-10">

            {/* Brand */}
            <div className="flex flex-col gap-4 max-w-[200px]">
              <img src="/polymartlogo.png" alt="POLYMART" className="h-8 w-auto" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                A persistent simulated stock exchange. All data is entirely fictional.
                Not financial advice.
              </p>
            </div>

            {/* Explore */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em] mb-4">Explore</p>
              <div className="flex flex-col gap-3">
                <FooterLink icon={Home}         label="Home"          onClick={() => go("home")} />
                <FooterLink icon={TrendingUp}   label="Market"        onClick={() => go("market")} />
                <FooterLink icon={Layers}       label="Products"      onClick={() => go("products")} />
                <FooterLink icon={GraduationCap} label="Education"   onClick={() => go("education")} />
              </div>
            </div>

            {/* Developers */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em] mb-4">Developers</p>
              <div className="flex flex-col gap-3">
                <FooterLink icon={Code2}       label="API Reference" onClick={() => go("api")} />
                <FooterLink icon={HelpCircle}  label="Help Center"   onClick={() => go("help")} />
                <FooterLink icon={Activity}    label="Changelog"     onClick={() => go("changelog")} />
              </div>
            </div>

            {/* Legal */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em] mb-4">Legal</p>
              <div className="flex flex-col gap-3">
                <FooterLink icon={FileText}    label="Terms of Service" onClick={() => go("terms")} />
                <FooterLink icon={ShieldCheck} label="Privacy Policy"   onClick={() => go("privacy")} />
              </div>
            </div>
          </div>

          {/* Right: Discord CTA */}
          <div className="flex items-start">
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 w-full lg:w-[220px] shrink-0">
              <div className="w-9 h-9 rounded-lg bg-foreground/5 border border-border flex items-center justify-center">
                <Bot className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Add to Discord</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Live market data, slash commands, and price alerts in your server.
                </p>
              </div>
              <a
                href="https://discord.com/api/oauth2/authorize?client_id=POLYMART_BOT&permissions=2147483648&scope=bot+applications.commands"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 bg-foreground text-background rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity no-underline"
              >
                Add Bot
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="max-w-[1600px] mx-auto px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground/60">
            &copy; {new Date().getFullYear()} Polymart. Simulation only — not real financial data.
          </p>
          <div className="flex items-center gap-5">
            <button
              onClick={() => go("terms")}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              Terms
            </button>
            <button
              onClick={() => go("privacy")}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              Privacy
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [route, setRoute] = useState<Route>(getRoute)

  useEffect(() => {
    const handler = () => setRoute(getRoute())
    window.addEventListener("hashchange", handler)
    return () => window.removeEventListener("hashchange", handler)
  }, [])

  const go = (r: Route) => { navigate(r); setRoute(r) }

  return (
    <SimulationProvider>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar route={route} setRoute={setRoute} />

        <main className="flex-1">
          {route === "home"    && <HomePage    onNavigate={go} />}
          {route === "market"  && <MarketPage  />}
          {route === "api"     && <ApiDocsPage />}
          {route === "terms"     && <LegalPage      type="terms"   onNavigate={go} />}
          {route === "privacy"   && <LegalPage      type="privacy" onNavigate={go} />}
          {route === "changelog" && <ChangelogPage  onNavigate={go} />}
          {route === "education" && <EducationPage  onNavigate={go} />}
          {route === "products"  && <ProductsPage   onNavigate={go} />}
          {route === "help"      && <HelpCenterPage onNavigate={go} />}
        </main>

        <Footer setRoute={setRoute} />
      </div>
    </SimulationProvider>
  )
}
