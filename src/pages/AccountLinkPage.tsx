import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@clerk/clerk-react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw, Loader2, Link2Off, CheckCircle2 } from "lucide-react"
import type { Route } from "@/App"

// Discord SVG logo (no extra dependency)
function DiscordLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.013.044.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  )
}

interface DiscordStatus {
  linked: boolean
  discordId: string | null
  discordUsername: string | null
  discordLinkedAt: string | null
}

const CODE_TTL = 30

const FEATURES = [
  { text: "Trade with /buy and /sell in any Discord server" },
  { text: "Your positions, cash, and orders sync in real time" },
  { text: "Use /portfolio and /balance from Discord" },
  { text: "Trade history unified across web and bot" },
]

interface Props {
  onNavigate: (r: Route) => void
}

export default function AccountLinkPage({ onNavigate }: Props) {
  const { getToken } = useAuth()

  const [status, setStatus]         = useState<DiscordStatus | null>(null)
  const [code, setCode]             = useState<string | null>(null)
  const [expiresAt, setExpiresAt]   = useState<Date | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(CODE_TTL)
  const [pageLoading, setPageLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [unlinking, setUnlinking]   = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── API helpers ───────────────────────────────────────────────────────────

  const withToken = useCallback(async <T>(fn: (t: string) => Promise<T>): Promise<T> => {
    let token = await getToken()
    if (!token) {
      await new Promise(r => setTimeout(r, 300))
      token = await getToken()
    }
    if (!token) throw new Error("Not authenticated")
    return fn(token)
  }, [getToken])

  async function apiCall(path: string, method = "GET", body?: object) {
    return withToken(async token => {
      const res = await fetch(`/api/v1${path}`, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message || json.error || `Error ${res.status}`)
      return json.data ?? json
    })
  }

  // ── Countdown ─────────────────────────────────────────────────────────────

  function startCountdown(expiry: Date) {
    if (timerRef.current) clearInterval(timerRef.current)
    const tick = () => {
      const left = Math.max(0, Math.round((expiry.getTime() - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        generateCode()
      }
    }
    tick()
    timerRef.current = setInterval(tick, 500)
  }

  // ── Generate code ─────────────────────────────────────────────────────────

  const generateCode = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      const data = await apiCall("/account/discord/generate", "POST")
      const exp  = new Date(data.expiresAt)
      setCode(data.code as string)
      setExpiresAt(exp)
      startCountdown(exp)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!msg.toLowerCase().includes("rate")) setError(msg)
    } finally {
      setGenerating(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withToken])

  // ── Load status on mount ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiCall("/account/discord/status")
        if (cancelled) return
        setStatus(data as DiscordStatus)
        if (!data.linked) generateCode()
      } catch {
        if (!cancelled) setError("Failed to load account status.")
      } finally {
        if (!cancelled) setPageLoading(false)
      }
    })()
    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Unlink ────────────────────────────────────────────────────────────────

  async function handleUnlink() {
    setUnlinking(true)
    setError(null)
    try {
      await apiCall("/account/discord/unlink", "DELETE")
      setStatus(prev => prev ? { ...prev, linked: false, discordId: null, discordUsername: null, discordLinkedAt: null } : null)
      generateCode()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setUnlinking(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const pct           = expiresAt ? Math.max(0, Math.min(100, (secondsLeft / CODE_TTL) * 100)) : 0
  const formattedCode = code ? `${code.slice(0, 3)} ${code.slice(3)}` : "— — —"
  const linkedDate    = status?.discordLinkedAt
    ? new Date(status.discordLinkedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">

      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[48%] bg-foreground text-background px-12 py-14">
        <div>
          {/* Logos */}
          <div className="flex items-center gap-3 mb-12">
            <img
              src="/polymartlogoblack.png"
              alt="Polymart"
              className="h-8 brightness-0 invert select-none"
              draggable={false}
            />
            <span className="text-background/20 text-xl font-thin select-none">×</span>
            <DiscordLogo className="h-8 w-8 text-[#7289da]" />
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-background/40 mb-3">
            Account Link
          </p>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Your portfolio,<br />in Discord.
          </h1>
          <p className="text-background/60 text-base mb-10 max-w-sm leading-relaxed">
            Link your Polymart account once, and every trade you make in Discord syncs directly to your portfolio — no duplicate data, no separate game.
          </p>

          <ul className="space-y-4">
            {FEATURES.map(({ text }) => (
              <li key={text} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#7289da] shrink-0 mt-0.5" />
                <span className="text-sm text-background/75 leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom note */}
        <p className="text-[11px] text-background/30 leading-relaxed max-w-xs">
          The link is global — one Discord account to one Polymart account, across all servers the bot is in.
        </p>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">

        {/* Back link */}
        <div className="w-full max-w-sm mb-6">
          <button
            onClick={() => onNavigate("account")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Account
          </button>
        </div>

        {/* Mobile logos */}
        <div className="flex items-center gap-3 mb-8 lg:hidden">
          <img src="/polymartlogoblack.png" alt="Polymart" className="h-7 select-none dark:invert" draggable={false} />
          <span className="text-muted-foreground text-lg font-thin">×</span>
          <DiscordLogo className="h-7 w-7 text-[#5865F2]" />
        </div>

        {pageLoading ? (
          <div className="w-full max-w-sm flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm">Loading…</p>
          </div>
        ) : status?.linked ? (

          /* ── Linked state ──────────────────────────────────────────────── */
          <div className="w-full max-w-sm space-y-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
                Account Link
              </p>
              <h2 className="text-2xl font-bold text-foreground">Connected</h2>
            </div>

            {/* Connected card */}
            <div className="rounded-2xl border border-border bg-muted/20 p-6 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <DiscordLogo className="w-7 h-7 text-[#5865F2]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Connected as</p>
                <p className="text-xl font-bold text-foreground">
                  @{status.discordUsername ?? "Discord User"}
                </p>
                {linkedDate && (
                  <p className="text-xs text-muted-foreground mt-1">Linked {linkedDate}</p>
                )}
              </div>

              <div className="w-full pt-2 border-t border-border space-y-2 text-left">
                {FEATURES.map(({ text }) => (
                  <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={handleUnlink}
              disabled={unlinking}
            >
              {unlinking
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <Link2Off className="w-4 h-4 mr-2" />}
              Unlink Discord Account
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Unlinking will revert Discord trades to the server's local balance.
            </p>
          </div>

        ) : (

          /* ── Unlinked — code entry ──────────────────────────────────────── */
          <div className="w-full max-w-sm space-y-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
                Account Link
              </p>
              <h2 className="text-2xl font-bold text-foreground">Pairing Code</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Use this code in Discord to connect your account.
              </p>
            </div>

            {/* Code card */}
            <div className="rounded-2xl border border-border bg-muted/20 p-7 flex flex-col items-center gap-5">

              {/* Code digits */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Your code
                </p>
                {generating ? (
                  <div className="h-16 flex items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <p className="text-6xl font-mono font-bold tracking-[0.3em] text-foreground select-all tabular-nums leading-none py-2">
                    {formattedCode}
                  </p>
                )}
              </div>

              {/* Countdown bar */}
              <div className="w-full space-y-2">
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      secondsLeft > 10 ? "bg-[#5865F2]" : "bg-amber-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Expires in {secondsLeft}s</span>
                  <button
                    onClick={() => generateCode()}
                    disabled={generating}
                    className="flex items-center gap-1 hover:text-foreground transition-colors disabled:opacity-40 cursor-pointer bg-transparent border-0 p-0"
                  >
                    <RefreshCw className={`w-3 h-3 ${generating ? "animate-spin" : ""}`} />
                    New code
                  </button>
                </div>
              </div>
            </div>

            {/* Step instructions */}
            <ol className="space-y-3">
              {[
                <>Open any Discord server with <strong className="text-foreground">Polymart Bot</strong>.</>,
                <>Type <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">/link {code ?? "######"}</code> and send.</>,
                <>This page will update automatically once linked.</>,
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-foreground mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <p className="text-center text-xs text-muted-foreground">
              Don't have the bot?{" "}
              <a
                href="https://polymart.co/#/docs/api"
                className="underline hover:text-foreground transition-colors"
              >
                Learn more
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
