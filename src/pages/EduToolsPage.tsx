import { useState, useMemo, useRef } from "react"
import { useSimulation } from "@/lib/SimulationContext"
import type { StockDetail } from "@/lib/SimulationContext"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Wrench, ChevronUp, ChevronDown, ChevronsUpDown, Search, Loader2, ArrowRight, TrendingUp, TrendingDown } from "lucide-react"

type Route = "home" | "market" | "api" | "terms" | "privacy" | "education" | "changelog" | "products" | "help" | "widgets" | "edu-tools"

interface Props {
  onNavigate: (r: Route) => void
}

// ── Shared helpers ─────────────────────────────────────────────────────────────
function fmt(n: number, dp = 2) { return n.toFixed(dp) }
function fmtPct(n: number) {
  const s = (n >= 0 ? "+" : "") + n.toFixed(2) + "%"
  return s
}
function changeColor(n: number) { return n >= 0 ? "text-emerald-400" : "text-red-400" }

// ── Sort icon ──────────────────────────────────────────────────────────────────
function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: "asc" | "desc" }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 text-muted-foreground/30 ml-1 shrink-0" />
  return sortDir === "asc"
    ? <ChevronUp className="w-3 h-3 text-foreground ml-1 shrink-0" />
    : <ChevronDown className="w-3 h-3 text-foreground ml-1 shrink-0" />
}

// ── Tiny RSI bar ───────────────────────────────────────────────────────────────
function RsiBar({ rsi }: { rsi: number }) {
  const pct = Math.max(0, Math.min(100, rsi))
  const color = rsi > 70 ? "#ef4444" : rsi < 30 ? "#22c55e" : "#6366f1"
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden shrink-0">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono">{fmt(rsi, 1)}</span>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 1: Stock Screener
// ══════════════════════════════════════════════════════════════════════════════
function ScreenerTab() {
  const { stocks, loading } = useSimulation()
  const [search, setSearch] = useState("")
  const [sector, setSector] = useState("all")
  const [rsiFilter, setRsiFilter] = useState<"all" | "overbought" | "oversold">("all")
  const [changeFilter, setChangeFilter] = useState<"all" | "gainers" | "losers">("all")
  const [sortCol, setSortCol] = useState("change")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const sectors = useMemo(() => {
    const s = new Set<string>()
    Object.values(stocks).forEach(st => s.add(st.sector))
    return Array.from(s).sort()
  }, [stocks])

  const filtered = useMemo(() => {
    let entries = Object.entries(stocks)
    if (search) {
      const q = search.toLowerCase()
      entries = entries.filter(([ticker, st]) =>
        ticker.toLowerCase().includes(q) || st.name.toLowerCase().includes(q)
      )
    }
    if (sector !== "all") entries = entries.filter(([, st]) => st.sector === sector)
    if (rsiFilter === "overbought") entries = entries.filter(([, st]) => st.rsi > 70)
    if (rsiFilter === "oversold") entries = entries.filter(([, st]) => st.rsi < 30)
    if (changeFilter === "gainers") entries = entries.filter(([, st]) => st.change > 0)
    if (changeFilter === "losers") entries = entries.filter(([, st]) => st.change < 0)

    entries.sort(([aKey, a], [bKey, b]) => {
      let av: number | string
      let bv: number | string
      switch (sortCol) {
        case "ticker": av = aKey; bv = bKey; break
        case "price": av = a.price; bv = b.price; break
        case "rsi": av = a.rsi; bv = b.rsi; break
        case "atr": av = a.atr; bv = b.atr; break
        case "beta": av = a.beta; bv = b.beta; break
        case "volume": av = a.volume; bv = b.volume; break
        default: av = a.change; bv = b.change
      }
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
    return entries
  }, [stocks, search, sector, rsiFilter, changeFilter, sortCol, sortDir])

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortCol(col); setSortDir("desc") }
  }

  const filterToggle = "px-3 py-1.5 text-xs font-medium rounded-lg border border-border cursor-pointer bg-transparent transition-colors"
  const filterActive = "border-foreground text-foreground bg-foreground/5"
  const filterInactive = "text-muted-foreground hover:text-foreground hover:border-foreground/40"

  if (loading) return <div className="py-16 flex items-center justify-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading market data…</div>

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ticker or name…"
            className="pl-9 text-sm h-9"
          />
        </div>

        <Select value={sector} onValueChange={setSector}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="All sectors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sectors</SelectItem>
            {sectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          {(["all", "overbought", "oversold"] as const).map(f => (
            <button key={f} onClick={() => setRsiFilter(f)} className={cn(filterToggle, rsiFilter === f ? filterActive : filterInactive)}>
              {f === "all" ? "All RSI" : f === "overbought" ? "RSI >70" : "RSI <30"}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {(["all", "gainers", "losers"] as const).map(f => (
            <button key={f} onClick={() => setChangeFilter(f)} className={cn(filterToggle, changeFilter === f ? filterActive : filterInactive)}>
              {f === "all" ? "All" : f === "gainers" ? "Gainers" : "Losers"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {[
                  { col: "ticker", label: "Ticker" },
                  { col: "name", label: "Name", nosort: true },
                  { col: "sector", label: "Sector", nosort: true },
                  { col: "price", label: "Price" },
                  { col: "change", label: "Change %" },
                  { col: "rsi", label: "RSI" },
                  { col: "atr", label: "ATR" },
                  { col: "beta", label: "Beta" },
                  { col: "volume", label: "Volume" },
                ].map(({ col, label, nosort }) => (
                  <th
                    key={col}
                    className={cn(
                      "px-4 py-2.5 text-left font-semibold text-muted-foreground select-none",
                      !nosort && "cursor-pointer hover:text-foreground transition-colors"
                    )}
                    onClick={nosort ? undefined : () => toggleSort(col)}
                  >
                    <span className="flex items-center">
                      {label}
                      {!nosort && <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(([ticker, st], i) => (
                <tr
                  key={ticker}
                  className={cn(
                    "border-b border-border/50 transition-colors hover:bg-muted/30",
                    i % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                  )}
                >
                  <td className="px-4 py-2.5 font-mono font-bold text-foreground">{ticker}</td>
                  <td className="px-4 py-2.5 text-muted-foreground max-w-[160px] truncate">{st.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{st.sector}</td>
                  <td className="px-4 py-2.5 font-mono text-foreground">${fmt(st.price)}</td>
                  <td className={cn("px-4 py-2.5 font-mono font-semibold", changeColor(st.change))}>
                    {fmtPct(st.change)}
                  </td>
                  <td
                    className="px-4 py-2.5 font-mono"
                    style={st.rsi > 70 ? { color: "#ef4444" } : st.rsi < 30 ? { color: "#22c55e" } : undefined}
                  >
                    <span
                      className="px-1.5 py-0.5 rounded text-xs"
                      style={
                        st.rsi > 70 ? { background: "rgba(239,68,68,0.08)" } :
                        st.rsi < 30 ? { background: "rgba(34,197,94,0.08)" } : undefined
                      }
                    >
                      {fmt(st.rsi, 1)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{fmt(st.atr)}</td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{fmt(st.beta)}</td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">
                    {(st.volume / 1000).toFixed(0)}K
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-3">
        Showing {filtered.length} of {Object.keys(stocks).length} stocks · Updates every 5 seconds
      </p>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 2: Indicator Explorer
// ══════════════════════════════════════════════════════════════════════════════
function IndicatorCard({
  label,
  value,
  statusLabel,
  statusColor,
  note,
  children,
}: {
  label: string
  value: string
  statusLabel: string
  statusColor: string
  note: string
  children?: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">{label}</p>
      <p className="text-xl font-mono font-bold text-foreground">{value}</p>
      {children}
      <p className={cn("text-xs font-semibold", statusColor)}>{statusLabel}</p>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{note}</p>
    </div>
  )
}

function IndicatorExplorerTab() {
  const { stocks, getDetail } = useSimulation()
  const [query, setQuery] = useState("")
  const [showDrop, setShowDrop] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<StockDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const suggestions = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return Object.entries(stocks)
      .filter(([ticker, st]) => ticker.toLowerCase().includes(q) || st.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [stocks, query])

  async function pick(ticker: string) {
    setQuery(ticker)
    setShowDrop(false)
    setSelected(ticker)
    setLoadingDetail(true)
    setShowRaw(false)
    const d = await getDetail(ticker)
    setDetail(d)
    setLoadingDetail(false)
  }

  function handleFocus() {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setShowDrop(true)
  }
  function handleBlur() {
    blurTimer.current = setTimeout(() => setShowDrop(false), 150)
  }

  // Interpretations
  function rsiI(rsi: number) {
    if (rsi > 80) return { label: "Extremely Overbought", color: "text-red-400", note: "RSI above 80 — strong overbought signal, pullback risk is elevated." }
    if (rsi > 70) return { label: "Overbought", color: "text-orange-400", note: "RSI above 70 — price may be extended; watch for reversal signals." }
    if (rsi < 20) return { label: "Extremely Oversold", color: "text-emerald-400", note: "RSI below 20 — strong oversold signal, bounce potential is elevated." }
    if (rsi < 30) return { label: "Oversold", color: "text-emerald-400", note: "RSI below 30 — price may be depressed; watch for stabilisation." }
    return { label: "Neutral Zone", color: "text-muted-foreground", note: "RSI in the neutral zone (30–70) — no strong directional signal from RSI alone." }
  }

  function macdI(hist: number) {
    if (hist > 0) return { label: "Bullish Momentum", color: "text-emerald-400", note: "Positive histogram — MACD is above the signal line; bullish momentum is building." }
    return { label: "Bearish Momentum", color: "text-red-400", note: "Negative histogram — MACD is below the signal line; bearish momentum is building." }
  }

  function bbI(price: number, upper: number, lower: number) {
    if (upper === lower) return { label: "No Data", color: "text-muted-foreground", note: "Band data unavailable." }
    const pos = (price - lower) / (upper - lower)
    if (pos > 0.85) return { label: "Near Upper Band", color: "text-orange-400", note: "Price near the upper Bollinger Band — potential resistance; overbought on the bands." }
    if (pos < 0.15) return { label: "Near Lower Band", color: "text-emerald-400", note: "Price near the lower Bollinger Band — potential support; oversold on the bands." }
    return { label: "Mid-Band", color: "text-muted-foreground", note: "Price in the middle of the Bollinger Bands — no edge signal from band position alone." }
  }

  function atrI(atr: number, price: number) {
    const pct = (atr / price) * 100
    if (pct > 3.5) return { label: "High Volatility", color: "text-orange-400", note: `ATR is ${pct.toFixed(1)}% of price — expect large daily price swings.` }
    if (pct < 1) return { label: "Low Volatility", color: "text-blue-400", note: `ATR is ${pct.toFixed(1)}% of price — tight range; low daily movement expected.` }
    return { label: "Moderate Volatility", color: "text-muted-foreground", note: `ATR is ${pct.toFixed(1)}% of price — typical daily swing range for this ticker.` }
  }

  function betaI(beta: number) {
    if (beta > 1.5) return { label: "High Beta", color: "text-orange-400", note: `Beta ${beta.toFixed(2)} — moves significantly more than the market index in both directions.` }
    if (beta < 0.7) return { label: "Low Beta (Defensive)", color: "text-blue-400", note: `Beta ${beta.toFixed(2)} — moves less than the market; a defensive, lower-risk profile.` }
    return { label: "Market-Correlated", color: "text-muted-foreground", note: `Beta ${beta.toFixed(2)} — moves roughly in line with the overall market index.` }
  }

  function emaI(ema12: number, ema26: number) {
    if (ema12 > ema26) return { label: "Bullish (EMA12 > EMA26)", color: "text-emerald-400", note: "Short-term EMA is above the longer-term EMA — short-term trend is bullish." }
    return { label: "Bearish (EMA12 < EMA26)", color: "text-red-400", note: "Short-term EMA is below the longer-term EMA — short-term trend is bearish." }
  }

  function smaI(sma20: number, sma50: number) {
    if (sma20 > sma50) return { label: "Golden Cross", color: "text-emerald-400", note: "SMA 20 is above SMA 50 — longer-term trend is bullish (golden cross configuration)." }
    return { label: "Death Cross", color: "text-red-400", note: "SMA 20 is below SMA 50 — longer-term trend is bearish (death cross configuration)." }
  }

  return (
    <div>
      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setShowDrop(true) }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search ticker or company name…"
          className="pl-9 text-sm"
        />
        {showDrop && suggestions.length > 0 && (
          <div className="absolute z-20 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            {suggestions.map(([ticker, st]) => (
              <button
                key={ticker}
                onMouseDown={() => pick(ticker)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted/50 transition-colors cursor-pointer border-0 bg-transparent"
              >
                <div>
                  <span className="text-xs font-mono font-bold text-foreground">{ticker}</span>
                  <span className="text-xs text-muted-foreground ml-2">{st.name}</span>
                </div>
                <span className={cn("text-xs font-mono font-semibold", changeColor(st.change))}>
                  {fmtPct(st.change)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!selected && (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
          Search for a ticker above to see its technical indicators with plain-English interpretations.
        </div>
      )}

      {selected && loadingDetail && (
        <div className="py-16 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading {selected}…
        </div>
      )}

      {selected && !loadingDetail && detail && (
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-2xl font-extrabold font-mono text-foreground">{detail.ticker}</p>
                <span className={cn("text-sm font-semibold font-mono", changeColor(detail.change))}>
                  {fmtPct(detail.change)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{detail.name} · {detail.sector}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-foreground">${fmt(detail.price)}</p>
              <p className="text-xs text-muted-foreground">Current price</p>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Indicator grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
            {/* RSI */}
            {(() => { const i = rsiI(detail.rsi); return (
              <IndicatorCard label="RSI (14)" value={fmt(detail.rsi, 1)} statusLabel={i.label} statusColor={i.color} note={i.note}>
                <RsiBar rsi={detail.rsi} />
              </IndicatorCard>
            ) })()}

            {/* MACD */}
            {(() => { const i = macdI(detail.macdHist); return (
              <IndicatorCard label="MACD Histogram" value={fmt(detail.macdHist)} statusLabel={i.label} statusColor={i.color} note={i.note} />
            ) })()}

            {/* Bollinger Bands */}
            {(() => { const i = bbI(detail.price, detail.bbUpper, detail.bbLower); return (
              <IndicatorCard label="Bollinger Band Position" value={`${fmt(detail.bbLower)} – ${fmt(detail.bbUpper)}`} statusLabel={i.label} statusColor={i.color} note={i.note} />
            ) })()}

            {/* ATR */}
            {(() => { const i = atrI(detail.atr, detail.price); return (
              <IndicatorCard label="ATR (14)" value={fmt(detail.atr)} statusLabel={i.label} statusColor={i.color} note={i.note} />
            ) })()}

            {/* Beta */}
            {(() => { const i = betaI(detail.beta); return (
              <IndicatorCard label="Beta" value={fmt(detail.beta)} statusLabel={i.label} statusColor={i.color} note={i.note} />
            ) })()}

            {/* EMA crossover */}
            {(() => { const i = emaI(detail.ema12, detail.ema26); return (
              <IndicatorCard label="EMA 12 vs EMA 26" value={`${fmt(detail.ema12)} / ${fmt(detail.ema26)}`} statusLabel={i.label} statusColor={i.color} note={i.note} />
            ) })()}

            {/* SMA crossover */}
            {(() => { const i = smaI(detail.sma20, detail.sma50); return (
              <IndicatorCard label="SMA 20 vs SMA 50" value={`${fmt(detail.sma20)} / ${fmt(detail.sma50)}`} statusLabel={i.label} statusColor={i.color} note={i.note} />
            ) })()}

            {/* Momentum */}
            <IndicatorCard
              label="Momentum"
              value={detail.momentum >= 0 ? `+${fmt(detail.momentum)}` : fmt(detail.momentum)}
              statusLabel={detail.momentum >= 0 ? "Positive" : "Negative"}
              statusColor={detail.momentum >= 0 ? "text-emerald-400" : "text-red-400"}
              note={detail.momentum >= 0
                ? "Positive momentum — the price trend has been upward over the recent period."
                : "Negative momentum — the price trend has been downward over the recent period."}
            />
          </div>

          {/* Raw JSON toggle */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowRaw(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0"
            >
              <span>Show raw API response</span>
              {showRaw ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showRaw && (
              <pre className="p-5 text-[11px] font-mono text-muted-foreground leading-relaxed overflow-x-auto border-t border-border max-h-96">
                {JSON.stringify(detail, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 3: Sector Dashboard
// ══════════════════════════════════════════════════════════════════════════════
function SectorDashboardTab() {
  const { sectors, stocks, loading } = useSimulation()

  const topMovers = useMemo(() => {
    const result: Record<string, { ticker: string; change: number }> = {}
    Object.entries(stocks).forEach(([ticker, st]) => {
      const ex = result[st.sector]
      if (!ex || st.change > ex.change) result[st.sector] = { ticker, change: st.change }
    })
    return result
  }, [stocks])

  const sorted = useMemo(() =>
    Object.entries(sectors).sort(([, a], [, b]) => b.avgChange - a.avgChange),
    [sectors]
  )

  if (loading) return <div className="py-16 flex items-center justify-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading sector data…</div>

  return (
    <div>
      {/* Sector cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {sorted.map(([key, info]) => {
          const mover = topMovers[info.label] ?? topMovers[key]
          const isUp = info.avgChange >= 0
          return (
            <div key={key} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-ring transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{info.icon}</span>
                  <p className="text-xs font-bold text-foreground leading-tight">{info.label}</p>
                </div>
                {isUp
                  ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  : <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />}
              </div>

              <div>
                <p className={cn("text-xl font-mono font-bold", changeColor(info.avgChange))}>
                  {fmtPct(info.avgChange)}
                </p>
                <p className="text-[10px] text-muted-foreground">avg change</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-muted-foreground">Avg RSI</p>
                  <span className="text-[10px] font-mono text-muted-foreground">{fmt(info.avgRsi, 1)}</span>
                </div>
                <RsiBar rsi={info.avgRsi} />
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 pt-2 mt-auto">
                <span>{info.tickerCount} tickers</span>
                {mover && (
                  <span className={cn("font-mono font-semibold", changeColor(mover.change))}>
                    {mover.ticker} {fmtPct(mover.change)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Sector leaderboard table */}
      <div>
        <p className="text-xs font-bold text-foreground mb-3">Sector Leaderboard</p>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground w-10">#</th>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Sector</th>
                <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Avg Change</th>
                <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Avg RSI</th>
                <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Avg Beta</th>
                <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Tickers</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(([key, info], i) => (
                <tr key={key} className={cn("border-b border-border/50", i % 2 === 0 ? "bg-transparent" : "bg-muted/10")}>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground/60">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <span className="mr-2">{info.icon}</span>
                    <span className="font-medium text-foreground">{info.label}</span>
                  </td>
                  <td className={cn("px-4 py-2.5 text-right font-mono font-semibold", changeColor(info.avgChange))}>
                    {fmtPct(info.avgChange)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{fmt(info.avgRsi, 1)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{fmt(info.avgBeta)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{info.tickerCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 4: Macro Dashboard
// ══════════════════════════════════════════════════════════════════════════════
function MacroDashboardTab() {
  const { market, events, loading } = useSimulation()

  if (loading || !market) return <div className="py-16 flex items-center justify-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading macro data…</div>

  function fgLabel(fg: number) {
    if (fg <= 25) return { label: "Extreme Fear", color: "#ef4444" }
    if (fg <= 40) return { label: "Fear", color: "#f97316" }
    if (fg <= 60) return { label: "Neutral", color: "#eab308" }
    if (fg <= 75) return { label: "Greed", color: "#84cc16" }
    return { label: "Extreme Greed", color: "#22c55e" }
  }

  function rateNote(r: number) {
    if (r > 6) return "Very elevated rates — significant tightening; weighs heavily on growth and tech stocks."
    if (r > 4) return "Elevated rates — tighter conditions. Favours value; weighs on high-multiple growth stocks."
    if (r > 2) return "Moderate rates — balanced environment, neither strongly supportive nor restrictive for equities."
    return "Low rates — supportive for risk assets, especially growth and technology stocks."
  }

  function inflNote(i: number) {
    if (i > 4) return "High inflation — erodes real returns. Commodities and real assets may outperform equities."
    if (i > 2.5) return "Above-target inflation — pressure on policy rates; bond markets pricing in further tightening."
    return "Low or on-target inflation — benign environment for equities, less pressure on interest rates."
  }

  function gdpNote(g: number) {
    if (g > 3) return "Strong expansion — supports cyclicals, industrials, and consumer discretionary. Low recession risk."
    if (g > 1) return "Moderate growth — balanced environment; markets can support risk assets at reasonable valuations."
    return "Weak growth — recession risk is elevated. Favour defensives, utilities, and high-quality value stocks."
  }

  function vixNote(v: number) {
    if (v > 30) return "Elevated VIX — markets are stressed. Wide spreads and high intraday volatility are expected."
    if (v > 20) return "Moderate VIX — some uncertainty. Implied volatility is above average; risk is acknowledged."
    return "Low VIX — calm markets, low expected volatility. Watch for complacency; sharp moves can surprise."
  }

  const fg = fgLabel(market.fearGreed)

  const macroCards = [
    {
      label: "Interest Rate",
      value: `${market.interestRate.toFixed(2)}%`,
      note: rateNote(market.interestRate),
    },
    {
      label: "Inflation",
      value: `${market.inflation.toFixed(2)}%`,
      note: inflNote(market.inflation),
    },
    {
      label: "GDP Growth",
      value: `${market.gdpGrowth.toFixed(2)}%`,
      note: gdpNote(market.gdpGrowth),
    },
    {
      label: "VIX",
      value: market.vix.toFixed(1),
      note: vixNote(market.vix),
    },
  ]

  return (
    <div>
      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {macroCards.map((c, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-2">{c.label}</p>
            <p className="text-3xl font-mono font-bold text-foreground mb-3">{c.value}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{c.note}</p>
          </div>
        ))}
      </div>

      {/* Fear & Greed gauge */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-foreground">Fear &amp; Greed Index</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-mono font-bold text-foreground">{Math.round(market.fearGreed)}</span>
            <span className="text-sm font-semibold" style={{ color: fg.color }}>{fg.label}</span>
          </div>
        </div>
        <div className="relative h-4 rounded-full overflow-hidden mb-3"
          style={{ background: "linear-gradient(to right, #ef4444, #f97316, #eab308, #84cc16, #22c55e)" }}>
          <div
            className="absolute top-0 h-full w-0.5 bg-white rounded-full shadow-md"
            style={{ left: `${Math.max(0, Math.min(100, market.fearGreed))}%`, transform: "translateX(-50%)" }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0 — Extreme Fear</span>
          <span>50 — Neutral</span>
          <span>Extreme Greed — 100</span>
        </div>
      </div>

      {/* Market breadth */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Advancing", value: market.gainers, color: "text-emerald-400" },
          { label: "Unchanged", value: market.unchanged, color: "text-muted-foreground" },
          { label: "Declining", value: market.losers, color: "text-red-400" },
        ].map((c, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={cn("text-2xl font-mono font-bold", c.color)}>{c.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Market events */}
      <div>
        <p className="text-xs font-bold text-foreground mb-3">Recent Market Events</p>
        <div className="space-y-2">
          {events.slice(0, 10).map(ev => (
            <div key={ev.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3">
              <span
                className={cn(
                  "shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5",
                  ev.effect > 0
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                )}
              >
                {ev.effect > 0 ? `+${ev.effect}` : ev.effect}
              </span>
              <div className="min-w-0">
                <p className="text-xs text-foreground leading-relaxed">{ev.text}</p>
                {ev.sector && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Sector: {ev.sector}
                  </p>
                )}
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No market events yet — check back shortly.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main page
// ══════════════════════════════════════════════════════════════════════════════
export default function EduToolsPage({ onNavigate }: Props) {
  return (
    <div className="max-w-[1200px] mx-auto px-8 py-16">

      {/* Hero */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <Badge variant="outline" className="text-xs border-border gap-1.5">
            <Wrench className="w-3 h-3" />
            Student Tools
          </Badge>
          <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-400 bg-emerald-500/5 gap-1.5">
            Live · Updates every 5s
          </Badge>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4 text-balance">
          Interactive Market Tools
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
          Explore the Polymart simulation with live interactive tools — screen stocks, decode technical
          indicators, compare sectors, and analyse macro conditions.
        </p>
      </div>

      <Separator className="mb-10" />

      {/* Tabs */}
      <Tabs defaultValue="screener">
        <TabsList className="mb-8 flex-wrap h-auto gap-1">
          <TabsTrigger value="screener">Stock Screener</TabsTrigger>
          <TabsTrigger value="indicators">Indicator Explorer</TabsTrigger>
          <TabsTrigger value="sectors">Sector Dashboard</TabsTrigger>
          <TabsTrigger value="macro">Macro Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="screener"><ScreenerTab /></TabsContent>
        <TabsContent value="indicators"><IndicatorExplorerTab /></TabsContent>
        <TabsContent value="sectors"><SectorDashboardTab /></TabsContent>
        <TabsContent value="macro"><MacroDashboardTab /></TabsContent>
      </Tabs>

      <Separator className="my-12" />

      {/* Footer CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground mb-1">Looking for the full market view?</p>
          <p className="text-sm text-muted-foreground">Open the market page for charts, order flow, and individual stock detail.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => onNavigate("market")}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-semibold cursor-pointer border-0 hover:opacity-90 transition-opacity"
          >
            Open Market <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigate("education")}
            className="flex items-center gap-2 px-4 py-2 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium cursor-pointer hover:bg-accent transition-colors"
          >
            Education Hub
          </button>
        </div>
      </div>

    </div>
  )
}
