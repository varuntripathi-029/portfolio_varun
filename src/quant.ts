// Backtesting engine for the Quant lab. Pure functions, no DOM, no network.
// It runs a long-only, all-in/all-out rule on a real daily price series and bills every
// trade for charges and Indian capital-gains tax.

export const TRADING_DAYS = 252
export const START_CAPITAL = 1_000_000 // INR
export const RISK_FREE = 0.065

// Modelled as an index ETF tracking the series: flat brokerage plus statutory and exchange charges.
export const BROKERAGE = 20
export const CHARGE_RATE = 0.0013

// Indian equity capital-gains tax follows the law on the date of sale. Surcharge is not modelled.
export type TaxRegime = { stcg: number; ltcg: number; exempt: number; cess: number }
export const LTCG_REGIME_START = '2018-04-01' // long-term gains were exempt before this date
export const GRANDFATHER_FMV_DATE = '2018-01-31'
export const GRANDFATHER_CUTOFF = '2018-02-01' // acquired before this date: cost is stepped up
export const REFORM_DATE = '2024-07-23' // new rates apply to transfers on or after this date

export function regimeOn(date: string): TaxRegime {
  if (date < LTCG_REGIME_START) return { stcg: 0.15, ltcg: 0, exempt: 0, cess: 0.03 }
  if (date < REFORM_DATE) return { stcg: 0.15, ltcg: 0.1, exempt: 100_000, cess: 0.04 }
  return { stcg: 0.2, ltcg: 0.125, exempt: 125_000, cess: 0.04 }
}

// Long-term means held for MORE than 12 months, so the first long-term day is the day after the
// twelve-month anniversary.
export function isLongTerm(entry: string, sale: string): boolean {
  const e = new Date(`${entry}T00:00:00Z`)
  e.setUTCFullYear(e.getUTCFullYear() + 1)
  return Date.parse(`${sale}T00:00:00Z`) > e.getTime()
}

export type Series = { name: string; source: string; from: string; to: string; dates: string[]; nav: number[] }

export type LevelId = 'crash' | 'bull' | 'side' | 'full'
export type Level = { id: LevelId; label: string; short: string; from: string; to: string; blurb: string }

export const LEVELS: Level[] = [
  { id: 'crash', label: '2020 crash', short: 'CRASH', from: '2019-10-01', to: '2021-03-31', blurb: 'Pre-crash, the March 2020 collapse, the rebound' },
  { id: 'bull', label: '2020-21 bull run', short: 'BULL', from: '2020-04-01', to: '2021-12-31', blurb: 'A one-way market, 21 months' },
  { id: 'side', label: '2021-23 sideways', short: 'SIDE', from: '2021-10-01', to: '2023-03-31', blurb: 'Eighteen months of going nowhere' },
  { id: 'full', label: 'Full run 2013-26', short: 'FULL', from: '2013-01-01', to: '2099-12-31', blurb: 'Everything in the file' },
]

export type RuleKind = 'sma' | 'mom'
export type Rule = { kind: RuleKind; fast: number; slow: number; lookback: number }
export type Options = { charges: boolean; tax: boolean }

export const PRESETS: { label: string; rule: Rule }[] = [
  { label: 'SMA 10/50', rule: { kind: 'sma', fast: 10, slow: 50, lookback: 120 } },
  { label: 'SMA 20/100', rule: { kind: 'sma', fast: 20, slow: 100, lookback: 120 } },
  { label: 'SMA 50/200', rule: { kind: 'sma', fast: 50, slow: 200, lookback: 120 } },
  { label: 'MOM 60', rule: { kind: 'mom', fast: 20, slow: 100, lookback: 60 } },
  { label: 'MOM 120', rule: { kind: 'mom', fast: 20, slow: 100, lookback: 120 } },
  { label: 'MOM 250', rule: { kind: 'mom', fast: 20, slow: 100, lookback: 250 } },
]

export function ruleLabel(r: Rule): string {
  return r.kind === 'sma' ? `SMA ${r.fast}/${r.slow}` : `MOM ${r.lookback}`
}

export function sliceSeries(series: Series, from: string, to: string) {
  const dates: string[] = []
  const prices: number[] = []
  for (let i = 0; i < series.dates.length; i++) {
    if (series.dates[i] >= from && series.dates[i] <= to) {
      dates.push(series.dates[i])
      prices.push(series.nav[i])
    }
  }
  return { dates, prices }
}

function prefix(prices: number[]): number[] {
  const p = [0]
  for (let i = 0; i < prices.length; i++) p.push(p[i] + prices[i])
  return p
}

// signal[t] is true when the rule wants to be long from the close of day t.
export function signals(prices: number[], rule: Rule | 'hold'): boolean[] {
  const n = prices.length
  if (rule === 'hold') return new Array(n).fill(true)
  const out = new Array<boolean>(n).fill(false)
  if (rule.kind === 'sma') {
    const pre = prefix(prices)
    const slow = Math.max(rule.slow, 2)
    const fast = Math.min(rule.fast, slow - 1)
    for (let t = slow - 1; t < n; t++) {
      const f = (pre[t + 1] - pre[t + 1 - fast]) / fast
      const s = (pre[t + 1] - pre[t + 1 - slow]) / slow
      out[t] = f > s
    }
  } else {
    const k = rule.lookback
    for (let t = k; t < n; t++) out[t] = prices[t] > prices[t - k]
  }
  return out
}

export type Trade = {
  date: string
  side: 'BUY' | 'SELL'
  price: number
  value: number
  fee: number
  tax: number
  pnl: number | null
  term: 'ST' | 'LT' | null
}

export type RunResult = {
  equity: number[] // daily value, after charges, before tax
  finalValue: number // fully liquidated, after charges and (optionally) tax
  trades: Trade[]
  charges: number
  tax: number
}

const fyOf = (date: string) => {
  const y = Number(date.slice(0, 4))
  const m = Number(date.slice(5, 7))
  return m >= 4 ? y : y - 1
}

// Signals are decided at one close and filled at the next, so a rule never trades on a price it
// had not yet seen. Index 0 is filled on day 0 (buy and hold starts immediately).
export function run(dates: string[], prices: number[], sig: boolean[], opts: Options): RunResult {
  const n = prices.length
  let cash = START_CAPITAL
  let shares = 0
  let basis = 0
  let entry = ''
  let charges = 0
  let tax = 0
  const trades: Trade[] = []
  const ltcgUsed: Record<number, number> = {}
  const equity = new Array<number>(n)

  // Fair market value per unit on 31 Jan 2018, used to step up the cost of older holdings.
  let fmv: number | null = null
  if (n > 0 && dates[0] <= GRANDFATHER_FMV_DATE) {
    for (let i = 0; i < n && dates[i] <= GRANDFATHER_FMV_DATE; i++) fmv = prices[i]
  }

  const sell = (t: number) => {
    const proceeds = shares * prices[t]
    const fee = opts.charges ? BROKERAGE + CHARGE_RATE * proceeds : 0
    const long = isLongTerm(entry, dates[t])
    const reg = regimeOn(dates[t])
    let cost = basis
    if (long && fmv !== null && entry < GRANDFATHER_CUTOFF && dates[t] >= LTCG_REGIME_START) {
      cost = Math.max(basis, Math.min(fmv * shares, proceeds))
    }
    const taxableGain = proceeds - fee - cost
    let due = 0
    if (opts.tax && taxableGain > 0) {
      if (long) {
        if (reg.ltcg > 0) {
          const fy = fyOf(dates[t])
          const used = ltcgUsed[fy] ?? 0
          const free = Math.max(0, reg.exempt - used)
          const taxable = Math.max(0, taxableGain - free)
          ltcgUsed[fy] = used + Math.min(taxableGain, free)
          due = taxable * reg.ltcg * (1 + reg.cess)
        }
      } else {
        due = taxableGain * reg.stcg * (1 + reg.cess)
      }
    }
    const economicGain = proceeds - fee - basis
    cash = proceeds - fee - due
    charges += fee
    tax += due
    trades.push({ date: dates[t], side: 'SELL', price: prices[t], value: proceeds, fee, tax: due, pnl: economicGain - due, term: long ? 'LT' : 'ST' })
    shares = 0
  }

  for (let t = 0; t < n; t++) {
    const want = sig[Math.max(t - 1, 0)]
    if (want && shares === 0 && t < n - 1) {
      const fee = opts.charges ? BROKERAGE + CHARGE_RATE * cash : 0
      basis = cash
      shares = (cash - fee) / prices[t]
      trades.push({ date: dates[t], side: 'BUY', price: prices[t], value: cash, fee, tax: 0, pnl: null, term: null })
      cash = 0
      entry = dates[t]
      charges += fee
    } else if (!want && shares > 0 && t < n - 1) {
      sell(t)
    }
    equity[t] = cash + shares * prices[t]
  }
  if (shares > 0) sell(n - 1)

  return { equity, finalValue: cash, trades, charges, tax }
}

const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000

export type Metrics = {
  finalValue: number
  returnPct: number
  cagr: number
  vol: number
  sharpe: number
  maxDrawdown: number
  drawdown: number[]
  trades: number
  charges: number
  tax: number
}

export function metrics(r: RunResult, dates: string[]): Metrics {
  const eq = r.equity
  const rets: number[] = []
  for (let i = 1; i < eq.length; i++) rets.push(eq[i] / eq[i - 1] - 1)
  const mean = rets.reduce((a, b) => a + b, 0) / Math.max(rets.length, 1)
  const variance = rets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(rets.length - 1, 1)
  const vol = Math.sqrt(variance) * Math.sqrt(TRADING_DAYS)
  const sharpe = vol > 1e-9 ? (mean * TRADING_DAYS - RISK_FREE) / vol : 0
  let peak = eq[0]
  let maxDrawdown = 0
  const drawdown = eq.map((v) => {
    if (v > peak) peak = v
    const d = v / peak - 1
    if (d < maxDrawdown) maxDrawdown = d
    return d
  })
  const years = Math.max(daysBetween(dates[0], dates[dates.length - 1]) / 365.25, 0.01)
  return {
    finalValue: r.finalValue,
    returnPct: r.finalValue / START_CAPITAL - 1,
    cagr: Math.pow(Math.max(r.finalValue, 1) / START_CAPITAL, 1 / years) - 1,
    vol,
    sharpe,
    maxDrawdown,
    drawdown,
    trades: r.trades.filter((t) => t.side === 'SELL').length,
    charges: r.charges,
    tax: r.tax,
  }
}

export type Comparison = {
  dates: string[]
  prices: number[]
  strategy: RunResult
  hold: RunResult
  s: Metrics
  h: Metrics
  beat: boolean
  excess: number // net final value difference, strategy minus hold
}

export function compare(series: Series, level: Level, rule: Rule, opts: Options): Comparison {
  const { dates, prices } = sliceSeries(series, level.from, level.to)
  const strategy = run(dates, prices, signals(prices, rule), opts)
  const hold = run(dates, prices, signals(prices, 'hold'), opts)
  const s = metrics(strategy, dates)
  const h = metrics(hold, dates)
  return { dates, prices, strategy, hold, s, h, beat: strategy.finalValue > hold.finalValue, excess: strategy.finalValue - hold.finalValue }
}

export type WindowStats = {
  count: number
  years: number
  winPre: number
  winNet: number
  medianExcess: number // net, as a fraction of starting capital
  bins: { lo: number; hi: number; count: number }[]
}

// Rolling windows over the whole series. They overlap, so they are not independent samples.
export function windows(series: Series, rule: Rule, years = 3, step = 21): WindowStats {
  const len = years * TRADING_DAYS
  const excess: number[] = []
  let winPre = 0
  let winNet = 0
  const sig = signals(series.nav, rule)
  const hold = signals(series.nav, 'hold')
  const none: Options = { charges: false, tax: false }
  const all: Options = { charges: true, tax: true }
  for (let s = 0; s + len <= series.nav.length; s += step) {
    const d = series.dates.slice(s, s + len)
    const p = series.nav.slice(s, s + len)
    const sg = sig.slice(s, s + len)
    const hg = hold.slice(s, s + len)
    const pre = run(d, p, sg, none).finalValue
    const preH = run(d, p, hg, none).finalValue
    const net = run(d, p, sg, all).finalValue
    const netH = run(d, p, hg, all).finalValue
    if (pre > preH) winPre++
    if (net > netH) winNet++
    excess.push((net - netH) / START_CAPITAL)
  }
  const count = excess.length
  const sorted = [...excess].sort((a, b) => a - b)
  const lo = Math.min(...excess)
  const hi = Math.max(...excess)
  const nb = 24
  const width = (hi - lo) / nb || 1
  const bins = Array.from({ length: nb }, (_, i) => ({ lo: lo + i * width, hi: lo + (i + 1) * width, count: 0 }))
  for (const e of excess) bins[Math.min(nb - 1, Math.floor((e - lo) / width))].count++
  return {
    count,
    years,
    winPre: count ? winPre / count : 0,
    winNet: count ? winNet / count : 0,
    medianExcess: count ? sorted[Math.floor(count / 2)] : 0,
    bins,
  }
}
