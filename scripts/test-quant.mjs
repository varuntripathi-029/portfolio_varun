// Verifies the Quant lab's maths. Run with: npm run test:quant
// 1. hand-worked examples, one per rule, checked against figures computed by hand
// 2. an independent oracle (a deliberately different, naive implementation) compared with the
//    engine over hundreds of random periods, rules and option sets
// 3. structural invariants that must hold for any input
import { readFileSync } from 'node:fs'
import * as q from '../src/quant.ts'

const series = JSON.parse(readFileSync(new URL('../public/data/nifty50.json', import.meta.url), 'utf8'))
let passed = 0
const failures = []

function check(name, ok, detail = '') {
  if (ok) passed++
  else failures.push(`${name} ${detail}`)
}
function near(name, got, want, tol = 1e-6) {
  check(name, Math.abs(got - want) <= tol * Math.max(1, Math.abs(want)), `got ${got}, want ${want}`)
}

const mkDates = (n, start) =>
  Array.from({ length: n }, (_, i) => new Date(Date.parse(`${start}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10))
const hold = (n) => new Array(n).fill(true)
const NONE = { charges: false, tax: false }
const TAX = { charges: false, tax: true }
const ALL = { charges: true, tax: true }
const CAP = q.START_CAPITAL

// ---------- 1. hand-worked examples ----------

// Buy and hold, no costs: ends at exactly the price ratio.
{
  const p = series.nav
  const r = q.run(series.dates, p, hold(p.length), NONE)
  near('B&H equals price ratio', r.finalValue, CAP * p[p.length - 1] / p[0])
  check('B&H is one buy and one sell', r.trades.length === 2)
}

// Charges: Rs 20 + 0.13% on both legs, applied to a flat price.
{
  const d = mkDates(10, '2021-06-01')
  const p = new Array(10).fill(100)
  const r = q.run(d, p, hold(10), { charges: true, tax: false })
  const buyFee = 20 + 0.0013 * CAP
  const afterBuy = CAP - buyFee
  const sellFee = 20 + 0.0013 * afterBuy
  near('buy fee', r.trades[0].fee, buyFee)
  near('sell fee', r.trades[1].fee, sellFee)
  near('final after two fees', r.finalValue, afterBuy - sellFee)
  near('charges total', r.charges, buyFee + sellFee)
}

// Short-term tax, 2021 (15% + 4% cess): price 100 -> 150 in 100 days.
{
  const d = mkDates(100, '2021-04-12')
  const p = new Array(100).fill(100)
  p[99] = 150
  const r = q.run(d, p, hold(100), TAX)
  near('STCG 2021 = 15% + 4% cess', r.tax, 0.5 * CAP * 0.15 * 1.04)
  check('marked short-term', r.trades[1].term === 'ST')
}

// Short-term tax after the July 2024 reform (20% + 4% cess).
{
  const d = mkDates(100, '2024-08-01')
  const p = new Array(100).fill(100)
  p[99] = 150
  const r = q.run(d, p, hold(100), TAX)
  near('STCG 2024-08 = 20% + 4% cess', r.tax, 0.5 * CAP * 0.2 * 1.04)
}

// Long-term in the 10% era: gain 1,000,000 over 400 days (2020-04 -> 2021-05), exemption 1,00,000.
{
  const d = mkDates(400, '2020-04-10')
  const p = new Array(400).fill(100)
  p[399] = 200
  const r = q.run(d, p, hold(400), TAX)
  near('LTCG 10% above Rs 1L exemption', r.tax, (CAP - 100_000) * 0.1 * 1.04)
  check('marked long-term', r.trades[1].term === 'LT')
}

// Long-term after the reform: 12.5% above Rs 1.25L.
{
  const d = mkDates(400, '2024-08-01')
  const p = new Array(400).fill(100)
  p[399] = 200
  const r = q.run(d, p, hold(400), TAX)
  near('LTCG 12.5% above Rs 1.25L exemption', r.tax, (CAP - 125_000) * 0.125 * 1.04)
}

// Long-term gains sold before 1 April 2018 were exempt.
{
  const d = mkDates(400, '2016-04-10')
  const p = new Array(400).fill(100)
  p[399] = 200
  const r = q.run(d, p, hold(400), TAX)
  near('LTCG before Apr 2018 is exempt', r.tax, 0)
}

// Grandfathering: bought 2016 at 100, FMV on 31 Jan 2018 = 180, sold 2019 at 200.
{
  const d = ['2016-06-01', '2018-01-31', '2019-06-03']
  const p = [100, 180, 200]
  const r = q.run(d, p, hold(3), TAX)
  // cost steps up to max(1,000,000, min(units * 180, proceeds)) = 1,800,000; gain = 200,000 on proceeds 2,000,000
  const gain = 2_000_000 - 1_800_000
  near('grandfathered gain taxed at 10% above 1L', r.tax, Math.max(0, gain - 100_000) * 0.1 * 1.04)
}

// Grandfathering never creates a loss: FMV above the sale price steps cost up to the sale price only.
{
  const d = ['2016-06-01', '2018-01-31', '2019-06-03']
  const p = [100, 250, 200]
  const r = q.run(d, p, hold(3), TAX)
  near('no taxable gain when sold below FMV', r.tax, 0)
}

// "More than 12 months": exactly 12 months is still short-term; one day later is long-term.
check('exactly 12 months is short-term', q.isLongTerm('2021-03-05', '2022-03-05') === false)
check('12 months and a day is long-term', q.isLongTerm('2021-03-05', '2022-03-06') === true)
check('leap-day entry', q.isLongTerm('2020-02-29', '2021-02-28') === false)

// The yearly exemption resets on 1 April. Sale A (FY2021-22): long-term gain 80,000, fully inside
// the Rs 1,00,000 exemption, tax 0. Sale B (FY2022-23): long-term gain 3,20,000, a fresh exemption of
// 1,00,000 leaves 2,20,000 taxable at 10% + 4% cess = 22,880. (Two long-term sales in one year cannot
// happen for a single all-in position, because each needs more than 12 months of holding.)
{
  const d = ['2019-01-02', '2019-01-03', '2021-05-31', '2021-06-01', '2021-06-02', '2022-07-04', '2022-07-05']
  const p = [100, 100, 100, 108, 108, 140, 140]
  const sig = [true, true, false, true, true, true, true]
  const r = q.run(d, p, sig, TAX)
  const sells = r.trades.filter((t) => t.side === 'SELL')
  check('two long-term sales', sells.length === 2 && sells.every((t) => t.term === 'LT'), JSON.stringify(sells.map((t) => t.term)))
  near('sale A tax (inside exemption)', sells[0].tax, 0)
  near('sale B tax (fresh exemption)', sells[1].tax, (320_000 - 100_000) * 0.1 * 1.04)
  near('final value', r.finalValue, 1_400_000 - 22_880)
}

// Last day: a rule is never opened on the final day.
{
  const d = mkDates(20, '2021-06-01')
  const p = Array.from({ length: 20 }, (_, i) => 100 + i)
  const sig = new Array(20).fill(false)
  sig[18] = true // signal arrives on the second-to-last day, would fill on the last day
  const r = q.run(d, p, sig, ALL)
  check('no position opened on the last day', r.trades.length === 0, `trades ${r.trades.length}`)
  near('stays in cash', r.finalValue, CAP)
}

// Next-close fills: a signal on day 3 fills at day 4's price.
{
  const d = mkDates(10, '2021-06-01')
  const p = [100, 100, 100, 100, 110, 120, 130, 140, 150, 160]
  const sig = new Array(10).fill(false)
  for (let i = 3; i <= 6; i++) sig[i] = true
  const r = q.run(d, p, sig, NONE)
  check('buy fills the day after the signal', r.trades[0].date === d[4] && r.trades[0].price === 110, JSON.stringify(r.trades[0]))
  // the signal is last true on day 6, first false on day 7 (decided at that close), filled at day 8's close
  check('sell fills at the close after the first false signal', r.trades[1].date === d[8] && r.trades[1].price === 150, JSON.stringify(r.trades[1]))
}

// SMA and momentum signals against naive formulas.
{
  const p = series.nav.slice(0, 600)
  const sma = (t, k) => p.slice(t - k + 1, t + 1).reduce((a, b) => a + b, 0) / k
  const sg = q.signals(p, { kind: 'sma', fast: 20, slow: 100, lookback: 0 })
  let ok = true
  for (let t = 0; t < p.length; t++) {
    const want = t >= 99 ? sma(t, 20) > sma(t, 100) : false
    if (sg[t] !== want) ok = false
  }
  check('SMA signal matches the naive formula', ok)
  const mm = q.signals(p, { kind: 'mom', fast: 0, slow: 0, lookback: 60 })
  ok = true
  for (let t = 0; t < p.length; t++) {
    const want = t >= 60 ? p[t] > p[t - 60] : false
    if (mm[t] !== want) ok = false
  }
  check('momentum signal matches the naive formula', ok)
}

// Metrics on a hand-made equity curve: 100 -> 110 -> 99 -> 121.
{
  const eq = [1_000_000, 1_100_000, 990_000, 1_210_000]
  const fakeRun = { equity: eq, finalValue: 1_210_000, trades: [], charges: 0, tax: 0 }
  const dates = ['2021-01-01', '2021-01-04', '2021-01-05', '2021-01-06']
  const m = q.metrics(fakeRun, dates)
  near('max drawdown = 990/1100 - 1', m.maxDrawdown, 990_000 / 1_100_000 - 1)
  const rets = [0.1, -0.1, 990_000 === 0 ? 0 : 1_210_000 / 990_000 - 1]
  const mean = rets.reduce((a, b) => a + b, 0) / 3
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / 2
  near('annualised volatility', m.vol, Math.sqrt(variance) * Math.sqrt(252))
  near('Sharpe', m.sharpe, (mean * 252 - 0.065) / (Math.sqrt(variance) * Math.sqrt(252)))
  const years = 5 / 365.25
  near('CAGR over 5 calendar days', m.cagr, Math.pow(1.21, 1 / years) - 1)
  near('total return', m.returnPct, 0.21)
}

// ---------- 2. independent oracle ----------
// A second implementation written differently on purpose: unit counting instead of cash, naive
// signal windows, month arithmetic by string parts.

function oracleSignal(prices, rule, t) {
  if (rule === 'hold') return true
  if (rule.kind === 'sma') {
    const slow = rule.slow
    const fast = Math.min(rule.fast, slow - 1)
    if (t < slow - 1) return false
    let f = 0
    for (let i = t - fast + 1; i <= t; i++) f += prices[i]
    let s = 0
    for (let i = t - slow + 1; i <= t; i++) s += prices[i]
    return f / fast > s / slow
  }
  return t >= rule.lookback && prices[t] > prices[t - rule.lookback]
}

function oracleLong(entry, sale) {
  const [ey, em, ed] = entry.split('-').map(Number)
  const [sy, sm, sd] = sale.split('-').map(Number)
  // sale strictly after the same calendar date one year later
  if (sy !== ey + 1) return sy > ey + 1
  if (sm !== em) return sm > em
  return sd > ed
}

function oracle(dates, prices, rule, opts) {
  const n = prices.length
  let cash = CAP
  let units = 0
  let paid = 0
  let entry = null
  let fees = 0
  let taxes = 0
  let roundTrips = 0
  const used = {}
  let fmv = null
  for (let i = 0; i < n; i++) if (dates[i] <= '2018-01-31') fmv = prices[i]
  const fee = (v) => (opts.charges ? 20 + 0.0013 * v : 0)

  for (let t = 0; t < n; t++) {
    const want = oracleSignal(prices, rule, Math.max(t - 1, 0))
    if (want && units === 0 && t < n - 1) {
      const f = fee(cash)
      units = (cash - f) / prices[t]
      paid = cash
      fees += f
      cash = 0
      entry = dates[t]
    } else if (!want && units > 0 && t < n - 1) {
      doSell(t)
    }
  }
  if (units > 0) doSell(n - 1)

  function doSell(t) {
    const gross = units * prices[t]
    const f = fee(gross)
    const long = oracleLong(entry, dates[t])
    const sale = dates[t]
    let cost = paid
    if (long && fmv !== null && entry < '2018-02-01' && sale >= '2018-04-01') cost = Math.max(paid, Math.min(fmv * units, gross))
    const gain = gross - f - cost
    let due = 0
    if (opts.tax && gain > 0) {
      let stcg, ltcg, exempt, cess
      if (sale < '2018-04-01') [stcg, ltcg, exempt, cess] = [0.15, 0, 0, 0.03]
      else if (sale < '2024-07-23') [stcg, ltcg, exempt, cess] = [0.15, 0.1, 100000, 0.04]
      else [stcg, ltcg, exempt, cess] = [0.2, 0.125, 125000, 0.04]
      if (!long) due = gain * stcg * (1 + cess)
      else if (ltcg > 0) {
        const fy = Number(sale.slice(5, 7)) >= 4 ? Number(sale.slice(0, 4)) : Number(sale.slice(0, 4)) - 1
        const u = used[fy] || 0
        const free = Math.max(0, exempt - u)
        used[fy] = u + Math.min(gain, free)
        due = Math.max(0, gain - free) * ltcg * (1 + cess)
      }
    }
    fees += f
    taxes += due
    cash = gross - f - due
    units = 0
    roundTrips++
  }
  return { final: cash, fees, taxes, roundTrips }
}

// deterministic pseudo-random generator for the sampled cases
let seed = 20260711
const rnd = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 4294967296
}
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1))

let oracleCases = 0
for (let i = 0; i < 400; i++) {
  const len = int(150, 1800)
  const start = int(0, series.nav.length - len)
  const dates = series.dates.slice(start, start + len)
  const prices = series.nav.slice(start, start + len)
  const kind = rnd() < 0.5 ? 'sma' : 'mom'
  const fast = int(3, 60)
  const rule = { kind, fast, slow: fast + int(5, 220), lookback: int(10, 260) }
  const opts = { charges: rnd() < 0.7, tax: rnd() < 0.7 }
  const eng = q.run(dates, prices, q.signals(prices, rule), opts)
  const ora = oracle(dates, prices, rule, opts)
  const tag = `case ${i} (${kind} ${kind === 'sma' ? `${rule.fast}/${rule.slow}` : rule.lookback}, ${dates[0]}..${dates[len - 1]}, c=${opts.charges} t=${opts.tax})`
  near(`${tag} final`, eng.finalValue, ora.final, 1e-9)
  near(`${tag} charges`, eng.charges, ora.fees, 1e-9)
  near(`${tag} tax`, eng.tax, ora.taxes, 1e-9)
  check(`${tag} round trips`, eng.trades.filter((t) => t.side === 'SELL').length === ora.roundTrips)
  oracleCases++
}

// ---------- 3. invariants on the real levels and all presets ----------
for (const level of q.LEVELS) {
  for (const preset of q.PRESETS) {
    for (const opts of [NONE, { charges: true, tax: false }, ALL]) {
      const c = q.compare(series, level, preset.rule, opts)
      const tag = `${level.id}/${preset.label}/${opts.charges ? 'c' : '-'}${opts.tax ? 't' : '-'}`
      check(`${tag}: equity never negative`, c.strategy.equity.every((v) => v >= 0) && c.hold.equity.every((v) => v >= 0))
      check(`${tag}: ends in cash`, c.strategy.finalValue > 0 && c.hold.finalValue > 0)
      check(`${tag}: drawdown within [-1, 0]`, c.s.maxDrawdown <= 0 && c.s.maxDrawdown >= -1)
      check(`${tag}: buys and sells alternate`, c.strategy.trades.every((t, k) => t.side === (k % 2 === 0 ? 'BUY' : 'SELL')))
      // replaying the blotter reproduces the final value
      let cash = CAP
      let units = 0
      for (const t of c.strategy.trades) {
        if (t.side === 'BUY') {
          units = (cash - t.fee) / t.price
          cash = 0
        } else {
          cash = units * t.price - t.fee - t.tax
          units = 0
        }
      }
      near(`${tag}: blotter replays to the final value`, cash, c.strategy.finalValue, 1e-9)
      check(`${tag}: no tax when tax is off`, opts.tax || c.strategy.tax === 0)
      check(`${tag}: no charges when charges are off`, opts.charges || c.strategy.charges === 0)
      check(`${tag}: excess = difference of finals`, Math.abs(c.excess - (c.strategy.finalValue - c.hold.finalValue)) < 1e-6)
      check(`${tag}: verdict flag agrees with the numbers`, c.beat === c.strategy.finalValue > c.hold.finalValue)
    }
  }
}

// Costs and tax can only make a result worse, window by window.
{
  let ok = true
  for (let i = 0; i < 60; i++) {
    const len = int(300, 1500)
    const start = int(0, series.nav.length - len)
    const d = series.dates.slice(start, start + len)
    const p = series.nav.slice(start, start + len)
    const sg = q.signals(p, q.PRESETS[int(0, q.PRESETS.length - 1)].rule)
    const a = q.run(d, p, sg, NONE).finalValue
    const b = q.run(d, p, sg, { charges: true, tax: false }).finalValue
    const c = q.run(d, p, sg, ALL).finalValue
    if (!(a >= b && b >= c)) ok = false
  }
  check('free >= charged >= charged and taxed', ok)
}

// Rolling windows: counts, bounds and a recomputation of one window by hand.
{
  const rule = q.PRESETS[1].rule
  const w = q.windows(series, rule)
  const len = 3 * 252
  const expectedCount = Math.floor((series.nav.length - len) / 21) + 1
  check('window count', w.count === expectedCount, `${w.count} vs ${expectedCount}`)
  check('win rates within [0, 1]', w.winPre >= 0 && w.winPre <= 1 && w.winNet >= 0 && w.winNet <= 1)
  check('histogram holds every window', w.bins.reduce((a, b) => a + b.count, 0) === w.count)
  // recompute the win rates independently
  const sig = q.signals(series.nav, rule)
  let pre = 0
  let net = 0
  let n = 0
  for (let s = 0; s + len <= series.nav.length; s += 21) {
    const d = series.dates.slice(s, s + len)
    const p = series.nav.slice(s, s + len)
    const sg = sig.slice(s, s + len)
    const a = q.run(d, p, sg, NONE).finalValue > q.run(d, p, hold(len), NONE).finalValue
    const b = q.run(d, p, sg, ALL).finalValue > q.run(d, p, hold(len), ALL).finalValue
    if (a) pre++
    if (b) net++
    n++
  }
  near('win rate before costs recomputed', w.winPre, pre / n)
  near('win rate after costs recomputed', w.winNet, net / n)
}

console.log(`${passed} checks passed (${oracleCases} oracle cases, ${q.LEVELS.length * q.PRESETS.length * 3} level/rule/option combinations)`)
if (failures.length) {
  console.log(`\n${failures.length} FAILED:`)
  for (const f of failures.slice(0, 25)) console.log(' -', f)
  process.exit(1)
}
