import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@clerk/clerk-react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw, Loader2, Link2Off, CheckCircle2 } from "lucide-react"
import type { Route } from "@/App"

const CODE_TTL = 30 // seconds

const FEATURES = [
  "Trade with /buy and /sell — synced to your Polymart portfolio",
  "Check positions and balance with /portfolio",
  "Order history unified across web and Discord",
  "Alerts and watchlists carry across both",
]

interface DiscordStatus {
  linked: boolean
  discordId: string | null
  discordUsername: string | null
  discordLinkedAt: string | null
}

interface Props {
  onNavigate: (r: Route) => void
}

export default function AccountLinkPage({ onNavigate }: Props) {
  const { getToken } = useAuth()

  const [status, setStatus]         = useState<DiscordStatus | null>(null)
  const [code, setCode]             = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(CODE_TTL)
  const [pageLoading, setPageLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [unlinking, setUnlinking]   = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── API ───────────────────────────────────────────────────────────────────

  const withToken = useCallback(async <T,>(fn: (t: string) => Promise<T>): Promise<T> => {
    let token = await getToken()
    if (!token) { await new Promise(r => setTimeout(r, 300)); token = await getToken() }
    if (!token) throw new Error("Not authenticated")
    return fn(token)
  }, [getToken])

  async function apiCall(path: string, method = "GET", body?: object) {
    return withToken(async token => {
      const res  = await fetch(`/api/v1${path}`, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message || json.error || `Error ${res.status}`)
      return json.data ?? json
    })
  }

  // ── Countdown (text only — bar is CSS animated) ───────────────────────────

  function startCountdown(expiry: Date) {
    if (timerRef.current) clearInterval(timerRef.current)
    const tick = () => {
      const left = Math.max(0, Math.round((expiry.getTime() - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) {
        clearInterval(timerRef.current!)
        generateCode()
      }
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
  }

  // ── Generate ──────────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const generateCode = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      const data = await apiCall("/account/discord/generate", "POST")
      setCode(data.code as string)
      setSecondsLeft(CODE_TTL)
      startCountdown(new Date(data.expiresAt))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!msg.toLowerCase().includes("rate")) setError(msg)
    } finally {
      setGenerating(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withToken])

  // ── Mount ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiCall("/account/discord/status")
        if (cancelled) return
        setStatus(data as DiscordStatus)
        if (!data.linked) generateCode()
      } catch {
        if (!cancelled) setError("Failed to load status.")
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

  // ── Render ────────────────────────────────────────────────────────────────

  const linkedDate = status?.discordLinkedAt
    ? new Date(status.discordLinkedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#111113] flex flex-col items-center justify-center px-4 py-16">

      <style>{`
        @keyframes pm-countdown {
          0%   { width: 100%; background-color: #5865F2; }
          66%  { width: 34%;  background-color: #5865F2; }
          67%  { width: 33%;  background-color: #f59e0b; }
          100% { width: 0%;   background-color: #ef4444; }
        }
        .pm-bar        { animation: pm-countdown ${CODE_TTL}s linear forwards; }
        .pm-discord    { filter: invert(34%) sepia(99%) saturate(1500%) hue-rotate(218deg) brightness(98%) contrast(96%); }
        .pm-discord-bg { background-color: #5865F226; }
      `}</style>

      {/* Back */}
      <div className="w-full max-w-sm mb-8">
        <button
          type="button"
          onClick={() => onNavigate("account")}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer bg-transparent border-0 p-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Account
        </button>
      </div>

      {/* Logos */}
      <div className="flex items-center mb-8">
        <img
          src="/polymartlogoblack.png"
          alt="Polymart"
          className="h-10 brightness-0 invert select-none"
          draggable={false}
        />
        <span className="mx-2.5 text-zinc-600 text-2xl font-thin select-none">×</span>
        <img
          src="/discord (1).svg"
          alt="Discord"
          className="pm-discord h-10 w-10 select-none"
          draggable={false}
        />
      </div>

      {/* Title */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-2">
        Account Link
      </p>

      {pageLoading ? (
        <div className="flex items-center gap-2 text-zinc-500 mt-8">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>

      ) : status?.linked ? (
        /* ── Linked state ──────────────────────────────────────────────────── */
        <div className="w-full max-w-sm flex flex-col items-center gap-6 mt-4">
          <h2 className="text-2xl font-bold text-white">Connected</h2>

          <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-col items-center gap-5">
            <div className="pm-discord-bg w-16 h-16 rounded-full flex items-center justify-center">
              <img src="/discord (1).svg" alt="Discord" className="pm-discord w-8 h-8" />
            </div>

            <div className="text-center">
              <p className="text-sm text-zinc-400 mb-1">Connected as</p>
              <p className="text-2xl font-bold text-white">@{status.discordUsername ?? "Discord User"}</p>
              {linkedDate && <p className="text-xs text-zinc-500 mt-1">Linked {linkedDate}</p>}
            </div>

            <div className="w-full border-t border-white/10 pt-4 space-y-2.5">
              {FEATURES.map(text => (
                <div key={text} className="flex items-start gap-2.5 text-sm text-zinc-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            variant="outline"
            className="w-full border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/50 bg-transparent"
            onClick={handleUnlink}
            disabled={unlinking}
          >
            {unlinking
              ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
              : <Link2Off className="w-4 h-4 mr-2" />}
            Unlink Discord Account
          </Button>

          <p className="text-center text-xs text-zinc-600">
            Unlinking reverts Discord trades to the server's local balance.
          </p>
        </div>

      ) : (
        /* ── Unlinked — code ───────────────────────────────────────────────── */
        <div className="w-full max-w-sm flex flex-col items-center gap-6 mt-4">
          <h2 className="text-2xl font-bold text-white">Pairing Code</h2>

          {/* Code card */}
          <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-col items-center gap-6">

            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
              Your code
            </p>

            {/* The code */}
            {generating ? (
              <div className="h-20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
              </div>
            ) : (
              <div className="flex items-center gap-5 select-all" aria-label={code ?? undefined}>
                <span className="text-6xl font-mono font-bold tracking-[0.2em] text-white tabular-nums leading-none whitespace-nowrap">
                  {code?.slice(0, 3) ?? "—"}
                </span>
                <span className="text-zinc-600 text-2xl font-thin select-none leading-none">·</span>
                <span className="text-6xl font-mono font-bold tracking-[0.2em] text-white tabular-nums leading-none whitespace-nowrap">
                  {code?.slice(3) ?? "—"}
                </span>
              </div>
            )}

            {/* Countdown bar — CSS animated for perfect smoothness */}
            <div className="w-full space-y-2">
              <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                {/* key=code restarts the CSS animation on every new code */}
                <div
                  key={code ?? "init"}
                  className="pm-bar h-full rounded-full"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>{secondsLeft}s remaining</span>
                <button
                  type="button"
                  onClick={() => generateCode()}
                  disabled={generating}
                  className="flex items-center gap-1 hover:text-zinc-300 transition-colors disabled:opacity-40 cursor-pointer bg-transparent border-0 p-0"
                >
                  <RefreshCw className={`w-3 h-3 ${generating ? "animate-spin" : ""}`} />
                  New code
                </button>
              </div>
            </div>
          </div>

          {/* Steps */}
          <ol className="w-full space-y-3">
            <li className="flex items-start gap-3 text-sm text-zinc-400">
              <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-300 mt-0.5">1</span>
              <span>Open any Discord server with <strong className="text-zinc-200 font-semibold">Polymart Bot</strong>.</span>
            </li>
            <li className="flex items-start gap-3 text-sm text-zinc-400">
              <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-300 mt-0.5">2</span>
              <span>Type <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-zinc-200">/link {code ?? "######"}</code> and send.</span>
            </li>
            <li className="flex items-start gap-3 text-sm text-zinc-400">
              <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-300 mt-0.5">3</span>
              <span>This page updates automatically once linked.</span>
            </li>
          </ol>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <p className="text-center text-xs text-zinc-600">
            Your Polymart portfolio stays in sync across web and Discord.
          </p>
        </div>
      )}
    </div>
  )
}
