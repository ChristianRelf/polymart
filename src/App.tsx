import { useState, useEffect, useRef, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { ArrowUpRight, X, Menu, Coffee } from "lucide-react"
import { useAuth, UserButton } from "@clerk/clerk-react"
import { SimulationProvider, useSimulation } from "@/lib/SimulationContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import HomePage from "@/pages/HomePage"
import MarketPage from "@/pages/MarketPage"
import ApiDocsPage from "@/pages/ApiDocsPage"
import LegalPage from "@/pages/LegalPage"
import ChangelogPage from "@/pages/ChangelogPage"
import EducationPage from "@/pages/EducationPage"
import ProductsPage from "@/pages/ProductsPage"
import HelpCenterPage from "@/pages/HelpCenterPage"
import WidgetsPage from "@/pages/WidgetsPage"
import EduToolsPage from "@/pages/EduToolsPage"
import CommunityPage from "@/pages/CommunityPage"
import BotLegalPage from "@/pages/BotLegalPage"
import KofiLegalPage from "@/pages/KofiLegalPage"
import CommunityBlogPage from "@/pages/CommunityBlogPage"
import SponsorPage from "@/pages/SponsorPage"
import StockInfoPage from "@/pages/StockInfoPage"
import ForexPage from "@/pages/ForexPage"
import SignInPage from "@/pages/SignInPage"
import SignUpPage from "@/pages/SignUpPage"
import DashboardPage from "@/pages/DashboardPage"
import PortfolioPage from "@/pages/PortfolioPage"
import AccountPage from "@/pages/AccountPage"
import AdminPage from "@/pages/AdminPage"

// ── Routing ───────────────────────────────────────────────────────────────────
export type Route =
  | "home" | "market" | "forex" | "api" | "terms" | "privacy" | "changelog"
  | "education" | "products" | "help" | "widgets" | "edu-tools" | "community"
  | "bot-terms" | "bot-privacy" | "community-blog" | "sponsor" | "stock-info"
  | "kofi-terms" | "kofi-privacy"
  | "sign-in" | "sign-up" | "dashboard" | "portfolio" | "account" | "admin"

const HASH_MAP: Record<string, Route> = {
  "": "home",
  "/": "home",
  "/market": "market",
  "/forex": "forex",
  "/docs/api": "api",
  "/api": "api",
  "/docs/terms": "terms",
  "/docs/privacy": "privacy",
  "/changelog": "changelog",
  "/education": "education",
  "/products": "products",
  "/help": "help",
  "/widgets": "widgets",
  "/edu-tools": "edu-tools",
  "/community": "community",
  "/docs/bots/terms": "bot-terms",
  "/docs/bots/privacy": "bot-privacy",
  "/docs/kofi-terms": "kofi-terms",
  "/docs/kofi-privacy": "kofi-privacy",
  "/community/blog": "community-blog",
  "/sponsor": "sponsor",
  "/sign-in": "sign-in",
  "/sign-up": "sign-up",
  "/dashboard": "dashboard",
  "/account": "account",
  "/admin": "admin",
}

const ROUTE_HASH: Record<Route, string> = {
  home: "/",
  market: "/market",
  forex: "/forex",
  api: "/docs/api",
  terms: "/docs/terms",
  privacy: "/docs/privacy",
  changelog: "/changelog",
  education: "/education",
  products: "/products",
  help: "/help",
  widgets: "/widgets",
  "edu-tools": "/edu-tools",
  community: "/community",
  "bot-terms": "/docs/bots/terms",
  "bot-privacy": "/docs/bots/privacy",
  "community-blog": "/community/blog",
  "kofi-privacy": "/docs/kofi-privacy",
  "kofi-terms": "/docs/kofi-terms",
  sponsor: "/sponsor",
  "stock-info": "/market",
  "sign-in": "/sign-in",
  "sign-up": "/sign-up",
  dashboard: "/dashboard",
  portfolio: "/dashboard",
  account: "/account",
  admin: "/admin",
}

function parseHash(): { route: Route; params: Record<string, string> } {
  const hash = window.location.hash.replace("#", "")
  const stockInfo = hash.match(/^\/market\/([^/]+)\/info$/i)
  if (stockInfo) return { route: "stock-info", params: { ticker: stockInfo[1].toUpperCase() } }
  const portfolio = hash.match(/^\/portfolio\/(\d+)$/)
  if (portfolio) return { route: "portfolio", params: { portfolioId: portfolio[1] } }
  return { route: HASH_MAP[hash] ?? "home", params: {} }
}

function getRoute(): Route {
  return parseHash().route
}

function navigate(r: Route) {
  window.location.hash = ROUTE_HASH[r]
  window.scrollTo({ top: 0, behavior: "instant" })
}

function navigateToInfo(ticker: string) {
  window.location.hash = `/market/${ticker.toLowerCase()}/info`
  window.scrollTo({ top: 0, behavior: "instant" })
}

function navigateToPortfolio(id: number) {
  window.location.hash = `/portfolio/${id}`
  window.scrollTo({ top: 0, behavior: "instant" })
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
const NAV_LINKS: [Route, string][] = [
  ["home", "Home"],
  ["market", "Market"],
  ["api", "Developer Docs"],
  ["products", "Products"],
  ["education", "Education"],
  ["community", "Community"],
  ["help", "Help"],
]

function Navbar({ route, setRoute }: { route: Route; setRoute: (r: Route) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isSignedIn, isLoaded } = useAuth()
  const go = (r: Route) => { navigate(r); setRoute(r); setMobileOpen(false) }
  const isMarket = route === "market"
  const isDashboardRoute = route === "dashboard" || route === "portfolio" || route === "account" || route === "admin"

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 h-16 flex items-center gap-4 sm:gap-6">

        {/* Logo */}
        <button
          onClick={() => go("home")}
          className="cursor-pointer bg-transparent border-0 p-0 shrink-0 hover:opacity-80 transition-opacity"
        >
          <img src="/polymartlogo.png" alt="POLYMART" className="h-9 sm:h-11 w-auto" />
        </button>

        <Separator orientation="vertical" className="h-5 bg-border hidden sm:block" />

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-stretch h-16 gap-0">
          {NAV_LINKS.map(([r, label]) => (
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
          {isLoaded && isSignedIn && (
            <button
              onClick={() => go("dashboard")}
              className={cn(
                "px-4 text-sm font-medium transition-colors cursor-pointer bg-transparent border-0 border-b-2 h-full",
                isDashboardRoute
                  ? "text-foreground border-foreground"
                  : "text-muted-foreground border-transparent hover:text-foreground/80"
              )}
            >
              Dashboard
            </button>
          )}
        </nav>

        {isMarket && (
          <div className="hidden sm:flex ml-auto md:ml-0">
            <TickCountdown intervalMs={5_000} />
          </div>
        )}

        {/* Desktop: auth controls */}
        <div className="ml-auto hidden md:flex items-center gap-3">
          {isLoaded && (
            isSignedIn ? (
              <UserButton afterSignOutUrl="/#/" />
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => go("sign-in")}
                className="h-8 px-3 text-xs"
              >
                Sign In
              </Button>
            )
          )}
        </div>

        {/* Mobile: right-side controls */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          {isLoaded && isSignedIn && <UserButton afterSignOutUrl="/#/" />}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="w-5 h-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 bg-background border-border">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-5 h-16 border-b border-border">
                  <img src="/polymartlogo.png" alt="POLYMART" className="h-8 w-auto" />
                </div>
                <nav className="flex flex-col p-4 gap-1">
                  {NAV_LINKS.map(([r, label]) => (
                    <button
                      key={r}
                      onClick={() => go(r)}
                      className={cn(
                        "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer bg-transparent border-0 text-left w-full",
                        route === r
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                  {isLoaded && isSignedIn && (
                    <button
                      onClick={() => go("dashboard")}
                      className={cn(
                        "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer bg-transparent border-0 text-left w-full",
                        isDashboardRoute
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      )}
                    >
                      Dashboard
                    </button>
                  )}
                  {isLoaded && !isSignedIn && (
                    <button
                      onClick={() => go("sign-in")}
                      className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 text-left w-full"
                    >
                      Sign In
                    </button>
                  )}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer({ setRoute }: { setRoute: (r: Route) => void }) {
  const go = (r: Route) => { navigate(r); setRoute(r) }

  function NavCol({ title, children }: { title: string; children: ReactNode }) {
    return (
      <div>
        <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] mb-4">{title}</p>
        <div className="flex flex-col gap-2.5">{children}</div>
      </div>
    )
  }

  function FLink({ label, route }: { label: string; route: Route }) {
    return (
      <button
        onClick={() => go(route)}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0 text-left w-fit"
      >
        {label}
      </button>
    )
  }

  function FExt({ label, href }: { label: string; href: string }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit no-underline"
      >
        {label}
        <ArrowUpRight className="w-3 h-3 opacity-40" />
      </a>
    )
  }

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 pt-12 pb-8">

        {/* Nav columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-10 mb-12">

          <NavCol title="Platform">
            <FLink label="Home"     route="home" />
            <FLink label="Market"   route="market" />
            <FLink label="Products" route="products" />
            <FLink label="Widgets"  route="widgets" />
            <FLink label="Sponsor"  route="sponsor" />
            <FExt  label="Demo Site" href="/demo/index.html" />
          </NavCol>

          <NavCol title="Learn">
            <FLink label="Education"    route="education" />
            <FLink label="Student Tools" route="edu-tools" />
            <FLink label="Changelog"    route="changelog" />
          </NavCol>

          <NavCol title="Community">
            <FLink label="Community Hub" route="community" />
            <FExt  label="Discord" href="https://discord.com/oauth2/authorize?client_id=1503197938027860102" />
          </NavCol>

          <NavCol title="Developers">
            <FLink label="API Reference" route="api" />
            <FLink label="Help Center"   route="help" />
            <FExt  label="AI Docs"       href="/llms.txt" />
          </NavCol>

          <NavCol title="Legal">
            <FLink label="Terms of Service" route="terms" />
            <FLink label="Privacy Policy"   route="privacy" />
          </NavCol>
        </div>

        {/* Bottom bar */}

      {/* Large logo strip - full bleed */}
      <div
        className="overflow-hidden pointer-events-none select-none"
        style={{ width: "100vw", marginLeft: "calc(50% - 50vw)" }}
      >
        <img
          src="/polymartlogobottom2.png"
          alt=""
          aria-hidden="true"
          className="w-full block"
        />
      </div>
      </div>
    </footer>
  )
}

// ── Sponsor banner ────────────────────────────────────────────────────────────
const SPONSOR_DISMISSED_KEY = "polymart_sponsor_dismissed_until"
const SPONSOR_DELAY_MS = 20_000
const SPONSOR_SNOOZE_DAYS = 7

function SponsorBanner({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const [rendered, setRendered] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const until = parseInt(localStorage.getItem(SPONSOR_DISMISSED_KEY) || "0", 10)
    if (Date.now() < until) return
    const t = setTimeout(() => {
      setRendered(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    }, SPONSOR_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    setVisible(false)
    const until = Date.now() + SPONSOR_SNOOZE_DAYS * 86_400_000
    localStorage.setItem(SPONSOR_DISMISSED_KEY, String(until))
    setTimeout(() => setRendered(false), 350)
  }

  function goToSponsor() {
    onNavigate("sponsor")
    dismiss()
  }

  if (!rendered) return null

  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-50 w-72",
        "transition-all duration-350 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none",
      )}
    >
      <div className="bg-card border border-border rounded-2xl shadow-xl p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
              <Coffee className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">Sponsor development</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Keep Polymart free &amp; running</p>
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0.5 shrink-0 mt-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={goToSponsor}
          className="w-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer border-0"
        >
          Support on Ko-fi ☕
        </button>
      </div>
    </div>
  )
}

// ── Market nudge banner ───────────────────────────────────────────────────────
const NUDGE_KEY = "polymart_nudge_dismissed"
const NUDGE_DELAY_MS = 45_000

function MarketNudge({
  onNavigate,
  currentRoute,
}: {
  onNavigate: (r: Route) => void
  currentRoute: Route
}) {
  const [visible, setVisible] = useState(false)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    // Don't show if already dismissed this session or user is on market
    if (sessionStorage.getItem(NUDGE_KEY) || currentRoute === "market") return

    const timer = setTimeout(() => {
      setRendered(true)
      // Small delay so the element exists before we trigger the animation
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    }, NUDGE_DELAY_MS)

    return () => clearTimeout(timer)
  }, []) // intentionally run once on mount

  // If user navigates to market while nudge is showing, auto-dismiss
  useEffect(() => {
    if (currentRoute === "market" && visible) dismiss()
  }, [currentRoute])

  function dismiss() {
    setVisible(false)
    sessionStorage.setItem(NUDGE_KEY, "1")
    setTimeout(() => setRendered(false), 400)
  }

  function goToMarket() {
    onNavigate("market")
    dismiss()
  }

  if (!rendered) return null

  return (
    <div
      className={cn(
        "fixed top-14 left-1/2 -translate-x-1/2 z-50",
        "w-full max-w-3xl px-3 sm:px-4",
        "transition-all duration-400 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none",
      )}
    >
      <div className="bg-card border border-border rounded-lg shadow-lg px-4 py-2 flex items-center gap-3">
        {/* Pulsing dot */}
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-40" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-foreground" />
        </span>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground leading-none whitespace-nowrap">Market is live</p>
          <span className="text-muted-foreground text-xs leading-none">-</span>
          <p className="text-xs text-muted-foreground leading-none truncate">Real-time prices, charts &amp; sector data</p>
        </div>

        <Button
          size="sm"
          variant="default"
          className="shrink-0 h-7 px-3 text-xs font-semibold"
          onClick={goToMarket}
        >
          View Market
        </Button>

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [route, setRoute] = useState<Route>(getRoute)
  const [routeParams, setRouteParams] = useState<Record<string, string>>(() => parseHash().params)

  useEffect(() => {
    const handler = () => {
      const { route: r, params } = parseHash()
      setRoute(r)
      setRouteParams(params)
    }
    window.addEventListener("hashchange", handler)
    return () => window.removeEventListener("hashchange", handler)
  }, [])

  const go = (r: Route) => { navigate(r); setRoute(r); setRouteParams({}) }
  const goToInfo = (ticker: string) => {
    navigateToInfo(ticker)
    setRoute("stock-info")
    setRouteParams({ ticker: ticker.toUpperCase() })
  }
  const goToPortfolio = (id: number) => {
    navigateToPortfolio(id)
    setRoute("portfolio")
    setRouteParams({ portfolioId: String(id) })
  }

  const isAccountRoute = route === "dashboard" || route === "portfolio" || route === "account" || route === "admin"

  return (
    <SimulationProvider>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        {!isAccountRoute && <SponsorBanner onNavigate={go} />}
        <MarketNudge onNavigate={go} currentRoute={route} />
        <Navbar route={route} setRoute={setRoute} />

        <main className="flex-1">
          {route === "home"       && <HomePage    onNavigate={go} />}
          {route === "market"     && <MarketPage  onNavigateToInfo={goToInfo} onNavigate={go} />}
          {route === "forex"      && <ForexPage   onNavigate={go} />}
          {route === "stock-info" && <StockInfoPage ticker={routeParams.ticker ?? ""} onNavigate={go} onNavigateToInfo={goToInfo} />}
          {route === "api"            && <ApiDocsPage />}
          {route === "terms"          && <LegalPage        type="terms"       onNavigate={go} />}
          {route === "privacy"        && <LegalPage        type="privacy"     onNavigate={go} />}
          {route === "changelog"      && <ChangelogPage    onNavigate={go} />}
          {route === "education"      && <EducationPage    onNavigate={go} />}
          {route === "products"       && <ProductsPage     onNavigate={go} />}
          {route === "help"           && <HelpCenterPage   onNavigate={go} />}
          {route === "widgets"        && <WidgetsPage      onNavigate={go} />}
          {route === "edu-tools"      && <EduToolsPage     onNavigate={go} />}
          {route === "community"      && <CommunityPage    onNavigate={go} />}
          {route === "bot-terms"      && <BotLegalPage     type="bot-terms"   onNavigate={go} />}
          {route === "bot-privacy"    && <BotLegalPage     type="bot-privacy" onNavigate={go} />}
          {route === "kofi-privacy"   && <KofiLegalPage    type="kofi-privacy" onNavigate={go} />}
          {route === "kofi-terms"     && <KofiLegalPage    type="kofi-terms"  onNavigate={go} />}
          {route === "community-blog" && <CommunityBlogPage onNavigate={go} />}
          {route === "sponsor"        && <SponsorPage      onNavigate={go} />}

          {/* Auth pages */}
          {route === "sign-in" && <SignInPage />}
          {route === "sign-up" && <SignUpPage />}

          {/* Protected account pages */}
          {route === "dashboard" && (
            <ProtectedRoute onRedirect={() => go("sign-in")}>
              <DashboardPage onNavigate={go} onNavigateToPortfolio={goToPortfolio} />
            </ProtectedRoute>
          )}
          {route === "portfolio" && (
            <ProtectedRoute onRedirect={() => go("sign-in")}>
              <PortfolioPage
                portfolioId={parseInt(routeParams.portfolioId ?? "0")}
                onNavigate={go}
              />
            </ProtectedRoute>
          )}
          {route === "account" && (
            <ProtectedRoute onRedirect={() => go("sign-in")}>
              <AccountPage onNavigate={go} />
            </ProtectedRoute>
          )}
          {route === "admin" && (
            <ProtectedRoute onRedirect={() => go("sign-in")}>
              <AdminPage onNavigate={go} />
            </ProtectedRoute>
          )}
        </main>

        <Footer setRoute={setRoute} />
      </div>
    </SimulationProvider>
  )
}
