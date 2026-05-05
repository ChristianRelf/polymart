import { useState, useEffect, useRef, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, TrendingUp, TrendingDown, Search, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSimulation } from "@/lib/SimulationContext"
import type { StockDetail } from "@/lib/SimulationContext"

// ── Gain / loss colours ───────────────────────────────────────────────────────
const GAIN = "#5bce8a"
const LOSS = "#e8696a"
const NEUT = "#eab34d"
const BLUE = "#7c8af4"

// ── Price chart ───────────────────────────────────────────────────────────────
function PriceChart({ data }: { data: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || data.length < 2) return
    const ctx = cv.getContext("2d")!
    const W = cv.width, H = cv.height
    const pad = { t: 14, r: 64, b: 24, l: 8 }
    const cW = W - pad.l - pad.r
    const cH = H - pad.t - pad.b
    const mn = Math.min(...data) * 0.997
    const mx = Math.max(...data) * 1.003
    const rng = mx - mn || 1
    const up = data[data.length - 1] >= data[0]
    const accent = up ? GAIN : LOSS

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = "oklch(0.138 0.004 264)"
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = "rgba(255,255,255,0.04)"
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH / 4) * i
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke()
      ctx.fillStyle = "rgba(255,255,255,0.25)"
      ctx.font = "10px 'DM Mono', monospace"
      ctx.textAlign = "left"
      ctx.fillText((mx - (i / 4) * rng).toFixed(2), W - pad.r + 8, y + 4)
    }

    const pts = data.map((v, i) => ({
      x: pad.l + (i / (data.length - 1)) * cW,
      y: pad.t + ((mx - v) / rng) * cH,
    }))

    const g = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH)
    g.addColorStop(0, up ? "rgba(91,206,138,.12)" : "rgba(232,105,106,.10)")
    g.addColorStop(1, "transparent")
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pad.t + cH)
    pts.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.lineTo(pts[pts.length - 1].x, pad.t + cH)
    ctx.closePath()
    ctx.fillStyle = g
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y)
    ctx.strokeStyle = accent
    ctx.lineWidth = 1.5
    ctx.lineJoin = "round"
    ctx.stroke()

    const last = pts[pts.length - 1]
    ctx.beginPath()
    ctx.arc(last.x, last.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = accent
    ctx.fill()
  }, [data])
  return (
    <canvas
      ref={ref}
      width={900}
      height={280}
      className="w-full rounded-lg block"
      style={{ background: "oklch(0.138 0.004 264)" }}
    />
  )
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
function StatTile({ label, value, sub, subColor }: { label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4">
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{label}</p>
      <p className="text-2xl font-bold font-mono text-foreground tabular-nums">{value}</p>
      {sub && (
        <p className="text-xs font-semibold font-mono mt-1" style={{ color: subColor }}>
          {sub}
        </p>
      )}
    </div>
  )
}

// ── Market page ───────────────────────────────────────────────────────────────
export default function MarketPage() {
  const { market, stocks, sectors, events, loading, getDetail } = useSimulation()

  const [detail, setDetail] = useState<StockDetail | null>(null)
  const [view, setView] = useState<"list" | "detail">("list")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [sort, setSort] = useState("ticker")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  // refresh detail on each market tick
  useEffect(() => {
    if (detail && view === "detail") {
      getDetail(detail.ticker).then(updated => { if (updated) setDetail(updated) })
    }
  }, [market])

  const openDetail = async (ticker: string) => {
    const d = await getDetail(ticker)
    if (d) { setDetail(d); setView("detail") }
  }

  const sectorList = useMemo(
    () => Object.entries(sectors).sort((a, b) => b[1].avgChange - a[1].avgChange),
    [sectors]
  )

  const sortedStocks = useMemo(() => {
    let entries = Object.entries(stocks)
    if (search) {
      const q = search.toLowerCase()
      entries = entries.filter(([t, s]) =>
        t.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.includes(q)
      )
    } else if (filter !== "all") {
      entries = entries.filter(([, s]) => s.sector === filter)
    }
    entries.sort((a, b) => {
      let cmp = 0
      if (sort === "price") cmp = a[1].price - b[1].price
      else if (sort === "change") cmp = a[1].change - b[1].change
      else if (sort === "volume") cmp = a[1].volume - b[1].volume
      else cmp = a[0].localeCompare(b[0])
      return sortDir === "asc" ? cmp : -cmp
    })
    return entries
  }, [stocks, search, filter, sort, sortDir])

  const toggleSort = (col: string) => {
    if (sort === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSort(col); setSortDir("asc") }
  }

  const fmtVol = (v: number) =>
    v > 1e6 ? `${(v / 1e6).toFixed(1)}M` : v > 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v)

  if (loading || !market) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Connecting to simulation engine...</p>
        </div>
      </div>
    )
  }

  const idxUp = (market.indexChange || 0) >= 0
  const idxPct = market.index > 0
    ? Math.abs((market.indexChange || 0) / market.index * 100).toFixed(2)
    : "0.00"

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (view === "detail" && detail) {
    const up = detail.change >= 0
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 cursor-pointer bg-transparent border-0 p-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to market
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
          <div>
            <div className="flex items-baseline gap-4 mb-3">
              <h1 className="text-4xl font-extrabold font-mono text-foreground tracking-tight">
                {detail.ticker}
              </h1>
              <span className="text-lg text-muted-foreground">{detail.name}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs border-border capitalize">{detail.sector}</Badge>
              <Badge variant="outline" className="text-xs border-border">{detail.mcap} cap</Badge>
              {detail.volatility != null && <Badge variant="outline" className="text-xs border-border">vol {(detail.volatility * 100).toFixed(0)}%</Badge>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-5xl font-extrabold font-mono text-foreground tabular-nums">
              {detail.price.toFixed(2)}
            </p>
            <p className="text-xl font-bold font-mono mt-1" style={{ color: up ? GAIN : LOSS }}>
              {up ? "+" : ""}{detail.change.toFixed(2)}%
            </p>
          </div>
        </div>

        {detail.history && detail.history.length > 1 && (
          <div className="mb-8 rounded-xl border border-border overflow-hidden">
            <PriceChart data={detail.history} />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Current Price",  value: detail.price.toFixed(2),               color: undefined },
            { label: "Previous Close", value: detail.previousPrice.toFixed(2),        color: undefined },
            { label: "Tick Change",    value: `${up ? "+" : ""}${detail.change.toFixed(2)}%`, color: up ? GAIN : LOSS },
            { label: "Open",           value: detail.openPrice.toFixed(2),             color: undefined },
            { label: "Since Open",     value: `${detail.changeSinceOpen >= 0 ? "+" : ""}${detail.changeSinceOpen.toFixed(2)}%`, color: detail.changeSinceOpen >= 0 ? GAIN : LOSS },
            { label: "52w High",       value: detail.high52w.toFixed(2),              color: undefined },
            { label: "52w Low",        value: detail.low52w.toFixed(2),               color: undefined },
            { label: "All Time High",  value: detail.allTimeHigh.toFixed(2),          color: undefined },
            { label: "Volume",         value: fmtVol(detail.volume),                  color: undefined },
            { label: "RSI",            value: detail.rsi.toFixed(1),                  color: detail.rsi > 70 ? LOSS : detail.rsi < 30 ? GAIN : NEUT },
            { label: "Momentum",       value: detail.momentum.toFixed(4),             color: detail.momentum > 0 ? GAIN : detail.momentum < 0 ? LOSS : undefined },
            { label: "Streak",         value: `${detail.streak > 0 ? "▲ " : detail.streak < 0 ? "▼ " : "— "}${Math.abs(detail.streak)}`, color: detail.streak > 0 ? GAIN : detail.streak < 0 ? LOSS : undefined },
          ].map((m, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{m.label}</p>
              <p className="text-base font-semibold font-mono tabular-nums" style={{ color: m.color ?? "var(--foreground)" }}>
                {m.value}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4">52-Week Range</p>
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono text-muted-foreground w-16 text-right tabular-nums">
              {detail.low52w.toFixed(2)}
            </span>
            <div className="flex-1 h-2 bg-background rounded-full relative">
              {(() => {
                const rng = detail.high52w - detail.low52w
                const pos = rng > 0 ? Math.max(0, Math.min(100, (detail.price - detail.low52w) / rng * 100)) : 50
                return (
                  <div
                    className="absolute -top-1 w-4 h-4 rounded-full border-2 border-card shadow-md"
                    style={{ left: `${pos}%`, background: BLUE, transform: "translateX(-50%)" }}
                  />
                )
              })()}
            </div>
            <span className="text-sm font-mono text-muted-foreground w-16 tabular-nums">
              {detail.high52w.toFixed(2)}
            </span>
          </div>
        </div>

        {detail.sectorPeers && detail.sectorPeers.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4">Sector Peers</p>
            <div className="flex flex-wrap gap-2">
              {detail.sectorPeers.map(pt => {
                const s = stocks[pt]
                return (
                  <button
                    key={pt}
                    onClick={() => openDetail(pt)}
                    className="bg-card border border-border rounded-xl px-4 py-3 text-left hover:bg-accent hover:border-ring transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-6 mb-1">
                      <span className="text-sm font-bold font-mono text-foreground">{pt}</span>
                      {s && (
                        <span className="text-xs font-semibold font-mono tabular-nums" style={{ color: s.change >= 0 ? GAIN : LOSS }}>
                          {s.change >= 0 ? "+" : ""}{s.change.toFixed(2)}%
                        </span>
                      )}
                    </div>
                    {s && <p className="text-sm font-mono text-muted-foreground tabular-nums">{s.price.toFixed(2)}</p>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── List view ─────────────────────────────────────────────────────────────────
  const SortIcon = ({ col }: { col: string }) => {
    if (sort !== col) return <ChevronUp className="w-3 h-3 opacity-20" />
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 opacity-70" /> : <ChevronDown className="w-3 h-3 opacity-70" />
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Market</h1>
          <p className="text-sm text-muted-foreground">
            {market.totalStocks} stocks · ticks every 10s · tick #{market.tickCount}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-muted-foreground">Live simulation</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatTile label="Index"        value={market.index.toFixed(0)} sub={`${idxUp ? "+" : "-"}${idxPct}%`} subColor={idxUp ? GAIN : LOSS} />
        <StatTile label="Fear & Greed" value={market.fearGreed.toString()} sub={market.fearGreedLabel} subColor={market.fearGreed > 60 ? GAIN : market.fearGreed < 40 ? LOSS : NEUT} />
        <StatTile label="Gainers"      value={market.gainers.toString()} sub={`of ${market.totalStocks} stocks`} subColor={GAIN} />
        <StatTile label="Losers"       value={market.losers.toString()} sub={`of ${market.totalStocks} stocks`} subColor={LOSS} />
      </div>

      {events.length > 0 && (
        <div className="bg-card border border-border rounded-xl px-6 py-4 mb-6 overflow-hidden">
          <div className="flex items-center gap-8 overflow-x-auto">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest shrink-0">Events</span>
            {events.slice(-5).reverse().map((e, i) => (
              <div key={i} className="flex items-center gap-2.5 shrink-0" style={{ opacity: 1 - i * 0.18 }}>
                <span
                  className="text-xs font-bold px-2 py-1 rounded"
                  style={{ color: e.effect >= 0 ? GAIN : LOSS, background: e.effect >= 0 ? "rgba(91,206,138,.1)" : "rgba(232,105,106,.1)" }}
                >
                  {e.effect >= 0 ? "▲" : "▼"}
                </span>
                <span className="text-sm text-foreground whitespace-nowrap">{e.text}</span>
                {e.weight >= 3 && <span className="text-[10px] font-bold tracking-wider" style={{ color: NEUT }}>HIGH IMPACT</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={e => { setSearch(e.target.value); if (e.target.value) setFilter("all") }}
                placeholder="Search stocks..."
                className="pl-9 h-9 bg-card border-border text-sm"
              />
            </div>
            <select
              value={filter}
              onChange={e => { setFilter(e.target.value); setSearch("") }}
              className="h-9 bg-card text-foreground border border-border rounded-lg px-3 text-xs outline-none cursor-pointer"
            >
              <option value="all">All Sectors</option>
              {sectorList.map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground ml-auto">{sortedStocks.length} stocks</span>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/60">
                  {[
                    { key: "ticker", label: "Ticker", align: "left" },
                    { key: "name",   label: "Name",   align: "left" },
                    { key: "price",  label: "Price",  align: "right" },
                    { key: "change", label: "Change", align: "right" },
                    { key: "volume", label: "Volume", align: "right" },
                    { key: "range",  label: "52w",    align: "center" },
                  ].map(col => (
                    <th
                      key={col.key}
                      className={cn(
                        "px-4 py-3 text-[10px] font-medium text-muted-foreground uppercase tracking-widest select-none",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.align === "left" && "text-left",
                        col.key !== "name" && col.key !== "range" && "cursor-pointer hover:text-foreground transition-colors"
                      )}
                      onClick={() => col.key !== "name" && col.key !== "range" && toggleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.key !== "name" && col.key !== "range" && <SortIcon col={col.key} />}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {sortedStocks.map(([t, s], idx) => {
                  const up = s.change >= 0
                  const rng = (s.hi52w || 0) - (s.lo52w || 0)
                  const pos = rng > 0 ? Math.max(0, Math.min(100, (s.price - s.lo52w) / rng * 100)) : 50
                  return (
                    <tr
                      key={t}
                      onClick={() => openDetail(t)}
                      className={cn(
                        "cursor-pointer hover:bg-card/60 transition-colors border-b border-border/50",
                        idx === sortedStocks.length - 1 && "border-b-0"
                      )}
                    >
                      <td className="px-4 py-3 font-bold font-mono text-xs text-foreground">{t}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[160px] truncate">{s.name}</td>
                      <td className="px-4 py-3 text-right font-semibold font-mono text-sm tabular-nums text-foreground">
                        {s.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 font-semibold font-mono text-xs tabular-nums" style={{ color: up ? GAIN : LOSS }}>
                          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {up ? "+" : ""}{s.change.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {fmtVol(s.volume)}
                      </td>
                      <td className="px-4 py-3 w-[120px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono text-muted-foreground w-7 text-right tabular-nums">
                            {(s.lo52w || 0).toFixed(0)}
                          </span>
                          <div className="flex-1 h-1 bg-background rounded-full relative">
                            <div
                              className="absolute -top-[3px] w-2.5 h-2.5 rounded-full border-2 border-card"
                              style={{ left: `${pos}%`, background: pos > 75 ? GAIN : pos < 25 ? LOSS : BLUE, transform: "translateX(-50%)" }}
                            />
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground w-7 tabular-nums">
                            {(s.hi52w || 0).toFixed(0)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-muted-foreground text-xs">›</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-52 shrink-0 space-y-6">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Sectors</p>
            <div className="space-y-1.5">
              {sectorList.map(([k, v]) => {
                const up = v.avgChange >= 0
                const maxVal = Math.max(0.01, ...sectorList.map(([, e]) => Math.abs(e.avgChange)))
                const barW = Math.min(100, (Math.abs(v.avgChange) / maxVal) * 100)
                return (
                  <button
                    key={k}
                    onClick={() => { setFilter(k === filter ? "all" : k); setSearch("") }}
                    className={cn(
                      "w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer",
                      filter === k ? "bg-card border-ring/40" : "bg-card/40 border-border hover:bg-card"
                    )}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-foreground">{v.icon} {v.label}</span>
                      <span className="text-[11px] font-semibold font-mono tabular-nums" style={{ color: up ? GAIN : LOSS }}>
                        {up ? "+" : ""}{v.avgChange.toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-0.5 bg-background rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barW}%`, background: up ? GAIN : LOSS }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <Separator className="bg-border" />

          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Macro</p>
            <div className="space-y-1.5">
              {[
                ["Interest Rate", `${market.interestRate}%`],
                ["Inflation",     `${market.inflation}%`],
                ["GDP Growth",    `${market.gdpGrowth}%`],
              ].map(([label, val], i) => (
                <div key={i} className="flex justify-between items-center px-3 py-2.5 bg-card/40 border border-border rounded-lg">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-semibold font-mono text-foreground tabular-nums">{val}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-border" />

          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Top Movers</p>
            <div className="space-y-1.5">
              <button
                onClick={() => openDetail(market.topGainer.ticker)}
                className="w-full flex justify-between items-center px-3 py-2.5 bg-card/40 border border-border rounded-lg hover:bg-card transition-colors cursor-pointer"
              >
                <span className="text-xs text-muted-foreground">Top Gainer</span>
                <span className="text-xs font-semibold font-mono" style={{ color: GAIN }}>
                  {market.topGainer.ticker} +{market.topGainer.pct}%
                </span>
              </button>
              <button
                onClick={() => openDetail(market.topLoser.ticker)}
                className="w-full flex justify-between items-center px-3 py-2.5 bg-card/40 border border-border rounded-lg hover:bg-card transition-colors cursor-pointer"
              >
                <span className="text-xs text-muted-foreground">Top Loser</span>
                <span className="text-xs font-semibold font-mono" style={{ color: LOSS }}>
                  {market.topLoser.ticker} {market.topLoser.pct}%
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
