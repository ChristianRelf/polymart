import type { Candle } from "@/lib/SimulationContext"

// ── Basic math helpers ────────────────────────────────────────────────────────

function closes(candles: Candle[]) { return candles.map(c => c.c) }
function highs(candles: Candle[])  { return candles.map(c => c.h) }
function lows(candles: Candle[])   { return candles.map(c => c.l) }

export function calcSMA(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null
    const slice = values.slice(i - period + 1, i + 1)
    return slice.reduce((a, b) => a + b, 0) / period
  })
}

export function calcEMA(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1)
  const out: (number | null)[] = new Array(values.length).fill(null)
  let prev: number | null = null
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { continue }
    if (prev === null) {
      // Seed with SMA
      prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period
      out[i] = prev
    } else {
      prev = values[i] * k + prev * (1 - k)
      out[i] = prev
    }
  }
  return out
}

export function calcWMA(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null
    const slice = values.slice(i - period + 1, i + 1)
    const weights = period * (period + 1) / 2
    return slice.reduce((sum, v, wi) => sum + v * (wi + 1), 0) / weights
  })
}

export function calcBB(values: number[], period: number, stddev: number): { upper: (number|null)[]; middle: (number|null)[]; lower: (number|null)[] } {
  const middle = calcSMA(values, period)
  const upper: (number | null)[] = []
  const lower: (number | null)[] = []
  for (let i = 0; i < values.length; i++) {
    if (middle[i] === null) { upper.push(null); lower.push(null); continue }
    const slice = values.slice(i - period + 1, i + 1)
    const mean = middle[i]!
    const variance = slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period
    const sd = Math.sqrt(variance)
    upper.push(mean + stddev * sd)
    lower.push(mean - stddev * sd)
  }
  return { upper, middle, lower }
}

export function calcRSI(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null)
  if (values.length < period + 1) return out
  let avgGain = 0, avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1]
    if (diff > 0) avgGain += diff; else avgLoss -= diff
  }
  avgGain /= period; avgLoss /= period
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  out[period] = 100 - 100 / (1 + rs)
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    const r = avgLoss === 0 ? 100 : avgGain / avgLoss
    out[i] = 100 - 100 / (1 + r)
  }
  return out
}

export function calcMACD(values: number[], fast: number, slow: number, signal: number): { macd: (number|null)[]; signal: (number|null)[]; hist: (number|null)[] } {
  const emaFast = calcEMA(values, fast)
  const emaSlow = calcEMA(values, slow)
  const macdLine: (number | null)[] = values.map((_, i) => {
    const f = emaFast[i], s = emaSlow[i]
    return f !== null && s !== null ? f - s : null
  })
  const validMacd = macdLine.filter(v => v !== null) as number[]
  const sigSma = calcEMA(validMacd, signal)
  // Align signal back to full array
  let sigIdx = 0
  const signalLine: (number | null)[] = macdLine.map(v => {
    if (v === null) return null
    return sigSma[sigIdx++] ?? null
  })
  const hist: (number | null)[] = macdLine.map((m, i) => {
    const s = signalLine[i]
    return m !== null && s !== null ? m - s : null
  })
  return { macd: macdLine, signal: signalLine, hist }
}

export function calcStochastic(candles: Candle[], k: number, d: number): { kLine: (number|null)[]; dLine: (number|null)[] } {
  const hs = highs(candles), ls = lows(candles), cs = closes(candles)
  const kLine: (number | null)[] = candles.map((_, i) => {
    if (i < k - 1) return null
    const hi = Math.max(...hs.slice(i - k + 1, i + 1))
    const lo = Math.min(...ls.slice(i - k + 1, i + 1))
    return hi === lo ? 50 : ((cs[i] - lo) / (hi - lo)) * 100
  })
  const validK = kLine.map(v => v ?? 0)
  const dLine = calcSMA(validK, d).map((v, i) => kLine[i] !== null ? v : null)
  return { kLine, dLine }
}

export function calcCCI(candles: Candle[], period: number): (number | null)[] {
  const tp = candles.map(c => (c.h + c.l + c.c) / 3)
  return tp.map((_, i) => {
    if (i < period - 1) return null
    const slice = tp.slice(i - period + 1, i + 1)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const mad = slice.reduce((a, b) => a + Math.abs(b - mean), 0) / period
    return mad === 0 ? 0 : (tp[i] - mean) / (0.015 * mad)
  })
}

export function calcATR(candles: Candle[], period: number): (number | null)[] {
  if (candles.length < 2) return new Array(candles.length).fill(null)
  const tr: number[] = [candles[0].h - candles[0].l]
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1].c
    tr.push(Math.max(candles[i].h - candles[i].l, Math.abs(candles[i].h - prev), Math.abs(candles[i].l - prev)))
  }
  return calcSMA(tr, period)
}

export function calcOBV(candles: Candle[]): number[] {
  const out: number[] = [0]
  for (let i = 1; i < candles.length; i++) {
    const vol = candles[i].v ?? 0
    const prev = out[i - 1]
    if (candles[i].c > candles[i - 1].c) out.push(prev + vol)
    else if (candles[i].c < candles[i - 1].c) out.push(prev - vol)
    else out.push(prev)
  }
  return out
}

export function calcParabolicSAR(candles: Candle[], step: number, max: number): { sar: number[]; trend: ("up" | "down")[] } {
  if (candles.length < 2) return { sar: [], trend: [] }
  const sar: number[] = []
  const trend: ("up" | "down")[] = []
  let bull = true
  let af = step
  let ep = candles[0].h
  let sarVal = candles[0].l

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) { sar.push(sarVal); trend.push("up"); continue }
    const prev = candles[i - 1]
    const cur  = candles[i]
    sarVal = sarVal + af * (ep - sarVal)
    if (bull) {
      if (cur.h > ep) { ep = cur.h; af = Math.min(af + step, max) }
      sarVal = Math.min(sarVal, prev.l, i > 1 ? candles[i - 2].l : prev.l)
      if (cur.l < sarVal) { bull = false; sarVal = ep; ep = cur.l; af = step }
    } else {
      if (cur.l < ep) { ep = cur.l; af = Math.min(af + step, max) }
      sarVal = Math.max(sarVal, prev.h, i > 1 ? candles[i - 2].h : prev.h)
      if (cur.h > sarVal) { bull = true; sarVal = ep; ep = cur.h; af = step }
    }
    sar.push(sarVal)
    trend.push(bull ? "up" : "down")
  }
  return { sar, trend }
}

export function calcIchimoku(candles: Candle[], tenkan: number, kijun: number, senkou: number): {
  tenkanLine: (number|null)[]
  kijunLine: (number|null)[]
  senkouA: (number|null)[]
  senkouB: (number|null)[]
  chikouSpan: (number|null)[]
} {
  const midpoint = (period: number, i: number) => {
    if (i < period - 1) return null
    const slice = candles.slice(i - period + 1, i + 1)
    return (Math.max(...slice.map(c => c.h)) + Math.min(...slice.map(c => c.l))) / 2
  }
  const tenkanLine = candles.map((_, i) => midpoint(tenkan, i))
  const kijunLine  = candles.map((_, i) => midpoint(kijun, i))
  const senkouA = candles.map((_, i) => {
    const t = tenkanLine[i], k = kijunLine[i]
    return t !== null && k !== null ? (t + k) / 2 : null
  })
  const senkouB = candles.map((_, i) => midpoint(senkou, i))
  const chikouSpan: (number|null)[] = candles.map((c, i) => i + kijun < candles.length ? c.c : null)
  return { tenkanLine, kijunLine, senkouA, senkouB, chikouSpan }
}

export function calcKeltner(candles: Candle[], period: number, mult: number): { upper: (number|null)[]; middle: (number|null)[]; lower: (number|null)[] } {
  const cs = closes(candles)
  const middle = calcEMA(cs, period)
  const atr = calcATR(candles, period)
  const upper = middle.map((m, i) => m !== null && atr[i] !== null ? m + mult * atr[i]! : null)
  const lower = middle.map((m, i) => m !== null && atr[i] !== null ? m - mult * atr[i]! : null)
  return { upper, middle, lower }
}

export function calcDonchian(candles: Candle[], period: number): { upper: (number|null)[]; lower: (number|null)[] } {
  return {
    upper: candles.map((_, i) => i < period - 1 ? null : Math.max(...highs(candles).slice(i - period + 1, i + 1))),
    lower: candles.map((_, i) => i < period - 1 ? null : Math.min(...lows(candles).slice(i - period + 1, i + 1))),
  }
}

export function calcLinReg(values: number[]): { line: number[]; upper: number[]; lower: number[] } {
  const n = values.length
  if (n < 2) return { line: values, upper: values, lower: values }
  const xs = Array.from({ length: n }, (_, i) => i)
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = values.reduce((a, b) => a + b, 0) / n
  const ssxy = xs.reduce((s, x, i) => s + (x - mx) * (values[i] - my), 0)
  const ssx  = xs.reduce((s, x) => s + (x - mx) ** 2, 0)
  const slope = ssx === 0 ? 0 : ssxy / ssx
  const intercept = my - slope * mx
  const line = xs.map(x => slope * x + intercept)
  const se = Math.sqrt(values.reduce((s, v, i) => s + (v - line[i]) ** 2, 0) / n)
  return { line, upper: line.map(v => v + 2 * se), lower: line.map(v => v - 2 * se) }
}

export function calcPivots(candles: Candle[]): { p: number; r1: number; r2: number; r3: number; s1: number; s2: number; s3: number } | null {
  if (candles.length < 2) return null
  const prev = candles[candles.length - 2]
  const p  = (prev.h + prev.l + prev.c) / 3
  const r1 = 2 * p - prev.l
  const s1 = 2 * p - prev.h
  const r2 = p + (prev.h - prev.l)
  const s2 = p - (prev.h - prev.l)
  const r3 = prev.h + 2 * (p - prev.l)
  const s3 = prev.l - 2 * (prev.h - p)
  return { p, r1, r2, r3, s1, s2, s3 }
}
