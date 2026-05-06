import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { SimulationProvider } from "@/lib/SimulationContext"
import HomePage from "@/pages/HomePage"
import MarketPage from "@/pages/MarketPage"
import ApiDocsPage from "@/pages/ApiDocsPage"
import LegalPage from "@/pages/LegalPage"

// ── Routing ───────────────────────────────────────────────────────────────────
export type Route = "home" | "market" | "api" | "terms" | "privacy"

const HASH_MAP: Record<string, Route> = {
  "": "home",
  "/": "home",
  "/market": "market",
  "/docs/api": "api",
  "/api": "api",        // legacy redirect
  "/docs/terms": "terms",
  "/docs/privacy": "privacy",
}

const ROUTE_HASH: Record<Route, string> = {
  home: "/",
  market: "/market",
  api: "/docs/api",
  terms: "/docs/terms",
  privacy: "/docs/privacy",
}

function getRoute(): Route {
  const hash = window.location.hash.replace("#", "")
  return HASH_MAP[hash] ?? "home"
}

function navigate(r: Route) {
  window.location.hash = ROUTE_HASH[r]
}

// ── Tick Countdown ────────────────────────────────────────────────────────────
function TickCountdown({ intervalMs = 10_000 }: { intervalMs?: number }) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    startRef.current = Date.now()
    setElapsed(0)
    const frame = setInterval(() => {
      const e = (Date.now() - startRef.current) % intervalMs
      setElapsed(e)
    }, 50)
    return () => clearInterval(frame)
  }, [intervalMs])

  const size = 36
  const strokeWidth = 2.5
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const progress = 1 - elapsed / intervalMs
  const dashOffset = circumference * (1 - progress)
  const secondsLeft = Math.ceil((intervalMs - elapsed) / 1000)

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
              <TickCountdown intervalMs={10_000} />
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

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer({ setRoute }: { setRoute: (r: Route) => void }) {
  const go = (r: Route) => { navigate(r); setRoute(r) }

  return (
    <footer className="border-t border-border mt-auto bg-card/30">
      <div className="max-w-[1600px] mx-auto px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-10">

          {/* Brand */}
          <div>
            <p className="text-sm font-extrabold text-foreground tracking-tight mb-3">POLYMART</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A persistent simulated stock exchange engine. All data is entirely fictional.
              Not financial advice.
            </p>
          </div>

          {/* Platform */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4">Platform</p>
            <div className="flex flex-col gap-2.5">
              {([
                ["home", "Home"],
                ["market", "Market"],
                ["api", "API Reference"],
              ] as [Route, string][]).map(([r, label]) => (
                <button
                  key={r}
                  onClick={() => go(r)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left cursor-pointer bg-transparent border-0 p-0 w-fit"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4">Legal</p>
            <div className="flex flex-col gap-2.5">
              {([
                ["terms", "Terms of Service"],
                ["privacy", "Privacy Policy"],
              ] as [Route, string][]).map(([r, label]) => (
                <button
                  key={r}
                  onClick={() => go(r)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left cursor-pointer bg-transparent border-0 p-0 w-fit"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>

        <Separator className="bg-border mb-6" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © 2026 POLYMART. All simulation data is fictional.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => go("terms")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              Terms
            </button>
            <button
              onClick={() => go("privacy")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
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
          {route === "terms"   && <LegalPage   type="terms"   onNavigate={go} />}
          {route === "privacy" && <LegalPage   type="privacy" onNavigate={go} />}
        </main>

        <Footer setRoute={setRoute} />
      </div>
    </SimulationProvider>
  )
}
