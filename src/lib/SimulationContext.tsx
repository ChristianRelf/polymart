import { createContext, useContext, useEffect, useState, useCallback } from "react"

function apiFetch(endpoint: string) {
  return fetch(endpoint).then(r => r.json())
}

// ── Simulation registry ───────────────────────────────────────────────────────

export type SimType = "stocks" | "crypto" | "forex"

export const SIM_CONFIGS: {
  id: SimType
  label: string
  icon: string
  status: "live" | "coming_soon"
  description: string
}[] = [
  { id: "stocks", label: "Stocks", icon: "📈", status: "live",        description: "132 simulated equities across 20 sectors. Prices update every 10 seconds." },
  { id: "forex",  label: "Forex",  icon: "💱", status: "live",        description: "40 currency pairs (major, minor, exotic) with live technical indicators." },
  { id: "crypto", label: "Crypto", icon: "₿",  status: "coming_soon", description: "Simulated cryptocurrency market with volatile assets and 24/7 trading." },
]

// ── Stock types ───────────────────────────────────────────────────────────────

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

// ── Forex types ───────────────────────────────────────────────────────────────

export type ForexPairSummary = {
  pair: string
  base: string
  quote: string
  category: "major" | "minor" | "exotic"
  baseName: string
  quoteName: string
  baseCountry: string
  quoteCountry: string
  baseFlag: string
  quoteFlag: string
  price: number
  prevPrice: number
  change: number
  changePct: number
  bid: number
  ask: number
  spread: number
  spreadPips: string
  hiSession: number
  loSession: number
  hi52w: number
  lo52w: number
  volume: number
  rsi: number
  momentum: number
  atr: number
  macd: number
  macdSignal: number
  macdHist: number
  stochK: number
  stochD: number
  cci: number
  bbUpper: number
  bbMiddle: number
  bbLower: number
  bbBw: number
  sma20: number
  sma50: number
  pipSize: number
  decimals: number
  updatedAt: string
  pivotP: number
  pivotR1: number
  pivotR2: number
  pivotS1: number
  pivotS2: number
  pctFrom52wHigh: number
  pctFrom52wLow: number
  activeSession: string
}

export type ForexPairDetail = ForexPairSummary & {
  description: string
  economicDrivers: string[]
  factSheet: Record<string, string>
  history: number[]
  candles: Candle[]
}

// ── Context ───────────────────────────────────────────────────────────────────

type SimCtx = {
  market: MarketOverview | null
  stocks: Record<string, StockSummary>
  sectors: Record<string, SectorInfo>
  events: MarketEvent[]
  forexPairs: Record<string, ForexPairSummary>
  tickCount: number
  loading: boolean
  lastRefresh: number
  getDetail: (ticker: string) => Promise<StockDetail | null>
  getForexPair: (pair: string) => Promise<ForexPairDetail | null>
}

const SimContext = createContext<SimCtx>({
  market: null, stocks: {}, sectors: {}, events: [], forexPairs: {},
  tickCount: 0, loading: true, lastRefresh: 0,
  getDetail: async () => null,
  getForexPair: async () => null,
})

export function useSimulation() {
  return useContext(SimContext)
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [market,     setMarket]     = useState<MarketOverview | null>(null)
  const [stocks,     setStocks]     = useState<Record<string, StockSummary>>({})
  const [sectors,    setSectors]    = useState<Record<string, SectorInfo>>({})
  const [events,     setEvents]     = useState<MarketEvent[]>([])
  const [forexPairs, setForexPairs] = useState<Record<string, ForexPairSummary>>({})
  const [tickCount,  setTickCount]  = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [lastRefresh,setLastRefresh]= useState(0)

  const refresh = useCallback(async () => {
    try {
      const [mkt, stks, secs, evts, forex] = await Promise.all([
        apiFetch("/api/v1/getMarket"),
        apiFetch("/api/v1/getStocks"),
        apiFetch("/api/v1/getSectors"),
        apiFetch("/api/v1/getEvents?limit=20"),
        apiFetch("/api/v1/forex/getPairs"),
      ])

      if (mkt && !mkt.error) { setMarket(mkt); setTickCount(mkt.tickCount) }
      if (stks && !stks.error) setStocks(stks)
      if (secs && !secs.error) setSectors(secs)
      if (Array.isArray(evts)) setEvents(evts)
      if (forex && !forex.error) setForexPairs(forex)
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

  const getForexPair = useCallback(async (pair: string): Promise<ForexPairDetail | null> => {
    const data = await apiFetch(`/api/v1/forex/getPair?pair=${encodeURIComponent(pair)}`)
    if (!data || data.error) return null
    return data as ForexPairDetail
  }, [])

  return (
    <SimContext.Provider value={{ market, stocks, sectors, events, forexPairs, tickCount, loading, lastRefresh, getDetail, getForexPair }}>
      {children}
    </SimContext.Provider>
  )
}
