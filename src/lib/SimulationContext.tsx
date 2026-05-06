import { createContext, useContext, useEffect, useState, useCallback } from "react"

function apiFetch(endpoint: string) {
  return fetch(endpoint).then(r => r.json())
}

// ── Exported types ────────────────────────────────────────────────────────────

export type MarketOverview = {
  index: number
  indexChange: number
  indexChangePct: number
  fearGreed: number
  fearGreedLabel: string
  vix: number
  marketSession: string
  advanceDecline: number
  newHighs: number
  newLows: number
  interestRate: number
  inflation: number
  gdpGrowth: number
  gainers: number
  losers: number
  unchanged: number
  totalStocks: number
  topGainer: { ticker: string; pct: number }
  topLoser: { ticker: string; pct: number }
  upStreak: number
  downStreak: number
  tickCount: number
  updatedAt: string
}

export type StockSummary = {
  name: string
  sector: string
  mcap: string
  price: number
  change: number
  volume: number
  buyVolume: number
  sellVolume: number
  orderFlow: number
  rsi: number
  streak: number
  hi52w: number
  lo52w: number
  bid: number
  ask: number
  spreadPct: number
  vwap: number
  session: string
  halted: boolean
  atr: number
  beta: number
  macd: number
  macdSignal: number
  macdHist: number
  bbUpper: number
  bbMiddle: number
  bbLower: number
  bbBw: number
  sma20: number
  sma50: number
  volatility: number | null
  trend: number | null
}

export type Candle = {
  o: number
  h: number
  l: number
  c: number
  v: number
  t: number
}

export type StockDetail = {
  ticker: string
  name: string
  sector: string
  mcap: string
  price: number
  previousPrice: number
  openPrice: number
  change: number
  changeSinceOpen: number
  high52w: number
  low52w: number
  allTimeHigh: number
  volume: number
  buyVolume: number
  sellVolume: number
  orderFlow: number
  bid: number
  ask: number
  spreadPct: number
  vwap: number
  session: string
  halted: boolean
  rsi: number
  momentum: number
  streak: number
  insiderBias: number
  beta: number
  atr: number
  ema12: number
  ema26: number
  macd: number
  macdSignal: number
  macdHist: number
  bbUpper: number
  bbMiddle: number
  bbLower: number
  bbBw: number
  sma20: number
  sma50: number
  volatility: number | null
  trend: number | null
  history: number[]
  candles: Candle[]
  sectorPeers: string[]
  updatedAt: string
}

export type SectorInfo = {
  label: string
  icon: string
  avgChange: number
  avgRsi: number
  avgBeta: number
  newsStack: number
  momentum: number
  tickers: string[]
  tickerCount: number
}

export type MarketEvent = {
  id: string
  text: string
  effect: number
  sector: string | null
  category: string | null
  weight: number
  firedAt: string
}

// ── Context ───────────────────────────────────────────────────────────────────

type SimCtx = {
  market: MarketOverview | null
  stocks: Record<string, StockSummary>
  sectors: Record<string, SectorInfo>
  events: MarketEvent[]
  tickCount: number
  loading: boolean
  lastRefresh: number
  getDetail: (ticker: string) => Promise<StockDetail | null>
}

const SimContext = createContext<SimCtx>({
  market: null, stocks: {}, sectors: {}, events: [],
  tickCount: 0, loading: true, lastRefresh: 0,
  getDetail: async () => null,
})

export function useSimulation() {
  return useContext(SimContext)
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [market,    setMarket]    = useState<MarketOverview | null>(null)
  const [stocks,    setStocks]    = useState<Record<string, StockSummary>>({})
  const [sectors,   setSectors]   = useState<Record<string, SectorInfo>>({})
  const [events,    setEvents]    = useState<MarketEvent[]>([])
  const [tickCount,    setTickCount]    = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [lastRefresh,  setLastRefresh]  = useState(0)

  const refresh = useCallback(async () => {
    try {
      const [mkt, stks, secs, evts] = await Promise.all([
        apiFetch("/api/v1/getMarket"),
        apiFetch("/api/v1/getStocks"),
        apiFetch("/api/v1/getSectors"),
        apiFetch("/api/v1/getEvents?limit=20"),
      ])

      if (mkt && !mkt.error) { setMarket(mkt); setTickCount(mkt.tickCount) }
      if (stks && !stks.error) setStocks(stks)
      if (secs && !secs.error) setSectors(secs)
      if (Array.isArray(evts)) setEvents(evts)
      setLoading(false)
      setLastRefresh(Date.now())
    } catch {
      // silently retry on next interval
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 10_000)
    return () => clearInterval(id)
  }, [refresh])

  const getDetail = useCallback(async (ticker: string): Promise<StockDetail | null> => {
    const data = await apiFetch(`/api/v1/getStock?ticker=${encodeURIComponent(ticker)}`)
    if (!data || data.error) return null
    return data as StockDetail
  }, [])

  return (
    <SimContext.Provider value={{ market, stocks, sectors, events, tickCount, loading, lastRefresh, getDetail }}>
      {children}
    </SimContext.Provider>
  )
}
