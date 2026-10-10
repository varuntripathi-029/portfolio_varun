import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LEVELS,
  PRESETS,
  START_CAPITAL,
  compare,
  ruleLabel,
  windows,
  type Comparison,
  type LevelId,
  type Options,
  type Rule,
  type Series,
  type WindowStats,
} from './quant'

const DEFAULT_RULE: Rule = PRESETS[1].rule
const COMMANDS = [
  'SMA 20 100',
  'SMA 50 200',
  'SMA 10 50',
  'MOM 60',
  'MOM 120',
  'MOM 250',
  'PERIOD CRASH',
  'PERIOD BULL',
  'PERIOD SIDE',
  'PERIOD FULL',
  'COSTS ON',
  'COSTS OFF',
  'TAX ON',
  'TAX OFF',
  'THEME PS',
  'THEME WT',
  'HELP',
  'TOUR',
  'RESET',
  'EXIT',
]

const HELP =
  'SMA <fast> <slow> | MOM <days> | PERIOD CRASH/BULL/SIDE/FULL | COSTS ON/OFF | TAX ON/OFF | THEME PS/WT | TOUR | RESET | EXIT'

const inr = (v: number) => `${v < 0 ? '-' : ''}₹${Math.abs(Math.round(v)).toLocaleString('en-IN')}`
const lakh = (v: number) => `₹${(v / 100000).toFixed(2)}L`
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`
const signed = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const fmtDate = (iso: string) => `${iso.slice(8, 10)} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`

type Theme = 'ps' | 'wt'
type Spot = 'rule' | 'period' | 'verdict' | null

function readStore(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStore(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode or blocked storage: the preference just does not persist */
  }
}

function EquityChart({ cmp }: { cmp: Comparison }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 900
  const H = 290
  const L = 54
  const R = 14
  const T = 16
  const B = 26
  const n = cmp.dates.length
  const all = [...cmp.strategy.equity, ...cmp.hold.equity]
  const min = Math.min(...all)
  const max = Math.max(...all)
  const x = (i: number) => L + (i / Math.max(n - 1, 1)) * (W - L - R)
  const y = (v: number) => T + (1 - (v - min) / (max - min || 1)) * (H - T - B)
  const line = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')

  const ticks = [0, 1, 2, 3].map((k) => min + ((max - min) * k) / 3)
  const years: { i: number; label: string }[] = []
  let lastYear = ''
  cmp.dates.forEach((d, i) => {
    const yr = d.slice(0, 4)
    if (yr !== lastYear) {
      years.push({ i, label: yr })
      lastYear = yr
    }
  })
  const stride = Math.ceil(years.length / 7)
  const markers = cmp.strategy.trades.map((t) => ({ ...t, i: cmp.dates.indexOf(t.date) })).filter((t) => t.i >= 0)

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const frac = (e.clientX - r.left) / r.width
    const px = frac * W
    const i = Math.round(((px - L) / (W - L - R)) * (n - 1))
    setHover(Math.min(n - 1, Math.max(0, i)))
  }

  return (
    <div className="t-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Equity curve of the rule against buy and hold"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="t-grid-line" />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" className="t-axis">
              {(v / 100000).toFixed(1)}L
            </text>
          </g>
        ))}
        {years.map((yr, k) =>
          k % stride === 0 ? (
            <text key={yr.label} x={x(yr.i)} y={H - 8} textAnchor="middle" className="t-axis">
              {yr.label}
            </text>
          ) : null,
        )}
        <path d={line(cmp.hold.equity)} className="t-line-hold" />
        <path d={line(cmp.strategy.equity)} className="t-line-rule" />
        {markers.map((m, k) => (
          <text
            key={k}
            x={x(m.i)}
            y={y(cmp.strategy.equity[m.i]) + (m.side === 'BUY' ? 14 : -7)}
            textAnchor="middle"
            className={m.side === 'BUY' ? 't-mark-buy' : 't-mark-sell'}
          >
            {m.side === 'BUY' ? '▲' : '▼'}
          </text>
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="t-cursor" />
            <circle cx={x(hover)} cy={y(cmp.strategy.equity[hover])} r="3.5" className="t-dot-rule" />
            <circle cx={x(hover)} cy={y(cmp.hold.equity[hover])} r="3.5" className="t-dot-hold" />
          </g>
        )}
      </svg>
      <div className="t-readout">
        {hover !== null ? (
          <>
            <span>{fmtDate(cmp.dates[hover])}</span>
            <span className="t-c-cyan">RULE {lakh(cmp.strategy.equity[hover])}</span>
            <span className="t-c-dim">B&amp;H {lakh(cmp.hold.equity[hover])}</span>
          </>
        ) : (
          <>
            <span className="t-c-cyan">── RULE</span>
            <span className="t-c-dim">── BUY &amp; HOLD</span>
            <span>▲ buy ▼ sell · hover for values</span>
          </>
        )}
      </div>
    </div>
  )
}

function DrawdownChart({ cmp }: { cmp: Comparison }) {
  const W = 400
  const H = 120
  const n = cmp.dates.length
  const lo = Math.min(...cmp.s.drawdown, ...cmp.h.drawdown, -0.01)
  const x = (i: number) => (i / Math.max(n - 1, 1)) * W
  const y = (v: number) => 6 + (v / lo) * (H - 12)
  const line = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Drawdown of the rule and of buy and hold" className="t-dd-svg">
      <line x1="0" x2={W} y1={y(0)} y2={y(0)} className="t-grid-line" />
      <path d={line(cmp.h.drawdown)} className="t-line-hold" />
      <path d={line(cmp.s.drawdown)} className="t-line-dd" />
    </svg>
  )
}

function Histogram({ win }: { win: WindowStats }) {
  const W = 400
  const H = 110
  const maxCount = Math.max(...win.bins.map((b) => b.count), 1)
  const lo = win.bins[0].lo
  const hi = win.bins[win.bins.length - 1].hi
  const zeroX = ((0 - lo) / (hi - lo || 1)) * W
  const bw = W / win.bins.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Distribution of rule minus buy-and-hold across rolling windows" className="t-hist">
      {win.bins.map((b, i) => {
        const h = (b.count / maxCount) * (H - 16)
        const mid = (b.lo + b.hi) / 2
        return <rect key={i} x={i * bw + 1} y={H - 14 - h} width={bw - 2} height={h} className={mid >= 0 ? 't-bar-up' : 't-bar-down'} />
      })}
      {zeroX >= 0 && zeroX <= W && <line x1={zeroX} x2={zeroX} y1="2" y2={H - 12} className="t-zero" />}
      <text x="2" y={H - 2} className="t-axis">
        {signed(lo, 0)}
      </text>
      <text x={W - 2} y={H - 2} textAnchor="end" className="t-axis">
        {signed(hi, 0)}
      </text>
    </svg>
  )
}

export default function Terminal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [series, setSeries] = useState<Series | null>(null)
  const [failed, setFailed] = useState(false)
  const [levelId, setLevelId] = useState<LevelId>('crash')
  const [rule, setRule] = useState<Rule>(DEFAULT_RULE)
  const [opts, setOpts] = useState<Options>({ charges: true, tax: true })
  const [theme, setTheme] = useState<Theme>(() => (readStore('lab-theme') === 'wt' ? 'wt' : 'ps'))
  const [cmd, setCmd] = useState('')
  const [msg, setMsg] = useState('')
  const [tour, setTour] = useState<number>(() => (readStore('lab-tour') === 'done' ? -1 : 0))
  const [attempts, setAttempts] = useState<Record<string, { n: number; fails: number; best: number | null }>>({})

  useEffect(() => {
    if (!open || series || failed) return
    fetch('/data/nifty50.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('missing'))))
      .then((d: Series) => setSeries(d))
      .catch(() => setFailed(true))
  }, [open, series, failed])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open && series) inputRef.current?.focus()
  }, [open, series])

  const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0]
  const cmp = useMemo(() => (series ? compare(series, level, rule, opts) : null), [series, level, rule, opts])
  const win = useMemo(() => (series ? windows(series, rule) : null), [series, rule])

  useEffect(() => {
    if (!cmp) return
    setAttempts((a) => {
      const prev = a[levelId] ?? { n: 0, fails: 0, best: null }
      return {
        ...a,
        [levelId]: {
          n: prev.n + 1,
          fails: prev.fails + (cmp.beat ? 0 : 1),
          best: prev.best === null ? cmp.excess : Math.max(prev.best, cmp.excess),
        },
      }
    })
    // Count one attempt each time the result changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmp])

  if (!open) return null

  const finishTour = () => {
    setTour(-1)
    writeStore('lab-tour', 'done')
  }

  const setThemeAndSave = (t: Theme) => {
    setTheme(t)
    writeStore('lab-theme', t)
  }

  const exec = (raw: string) => {
    const parts = raw.trim().toUpperCase().split(/\s+/).filter(Boolean)
    if (!parts.length) {
      setMsg('Results refresh as soon as a rule or period changes. Type HELP for commands.')
      return
    }
    const [c, a, b] = parts
    if (c === 'SMA') {
      const f = parseInt(a, 10)
      const s = parseInt(b, 10)
      if (Number.isFinite(f) && Number.isFinite(s) && f >= 2 && f < s && s <= 400) {
        setRule({ kind: 'sma', fast: f, slow: s, lookback: rule.lookback })
        setMsg(`OK  rule set to SMA ${f}/${s}`)
      } else setMsg('ERR  usage: SMA <fast> <slow>, with 2 <= fast < slow <= 400. Example: SMA 20 100')
    } else if (c === 'MOM') {
      const k = parseInt(a, 10)
      if (Number.isFinite(k) && k >= 5 && k <= 500) {
        setRule({ ...rule, kind: 'mom', lookback: k })
        setMsg(`OK  rule set to MOM ${k}`)
      } else setMsg('ERR  usage: MOM <days>, 5 to 500. Example: MOM 120')
    } else if (c === 'PERIOD') {
      const l = LEVELS.find((x) => x.short === a || x.id.toUpperCase() === a)
      if (l) {
        setLevelId(l.id)
        setMsg(`OK  period set to ${l.label}`)
      } else setMsg('ERR  usage: PERIOD CRASH | BULL | SIDE | FULL')
    } else if (c === 'COSTS' || c === 'TAX') {
      if (a === 'ON' || a === 'OFF') {
        setOpts((o) => ({ ...o, [c === 'COSTS' ? 'charges' : 'tax']: a === 'ON' }))
        setMsg(`OK  ${c.toLowerCase()} ${a.toLowerCase()}`)
      } else setMsg(`ERR  usage: ${c} ON | OFF`)
    } else if (c === 'THEME') {
      if (a === 'PS' || a === 'WT') {
        setThemeAndSave(a === 'PS' ? 'ps' : 'wt')
        setMsg(`OK  theme ${a === 'PS' ? 'PowerShell' : 'Windows Terminal'}`)
      } else setMsg('ERR  usage: THEME PS | WT')
    } else if (c === 'HELP') {
      setMsg(HELP)
    } else if (c === 'TOUR') {
      setTour(0)
      setMsg('OK  tour restarted')
    } else if (c === 'RESET') {
      setRule(DEFAULT_RULE)
      setLevelId('crash')
      setOpts({ charges: true, tax: true })
      setMsg('OK  reset to the starting setup')
    } else if (c === 'EXIT' || c === 'QUIT') {
      onClose()
    } else {
      const guess = COMMANDS.find((k) => k.startsWith(c.slice(0, 2)))
      setMsg(`ERR  unknown command "${raw.trim()}".${guess ? ` Did you mean ${guess}?` : ''} Type HELP.`)
    }
  }

  const typed = cmd.trim().toUpperCase()
  const suggestions = typed
    ? COMMANDS.filter((k) => k.startsWith(typed) && k !== typed).slice(0, 5)
    : []

  const spot: Spot = tour === 0 ? 'rule' : tour === 1 ? 'period' : tour === 2 ? 'verdict' : null
  const att = attempts[levelId]

  let verdict = ''
  let hint = ''
  if (cmp) {
    const fees = `${inr(cmp.s.charges)} in charges and ${inr(cmp.s.tax)} in tax`
    verdict = cmp.beat
      ? `${ruleLabel(rule)} finished ${inr(cmp.excess)} ahead of buy-and-hold, after paying ${fees}.`
      : `${ruleLabel(rule)} finished ${inr(-cmp.excess)} behind buy-and-hold. It paid ${fees}; buy-and-hold paid ${inr(cmp.h.charges)} in charges and ${inr(cmp.h.tax)} in tax.`
    if (!cmp.beat && att && att.fails >= 2) {
      if (win && win.winPre - win.winNet > 0.15) {
        hint = `Before charges and tax this rule beats buy-and-hold in ${pct(win.winPre, 0)} of 3-year windows. After them, ${pct(win.winNet, 0)}. Tax is doing the damage.`
      } else if (rule.kind === 'sma' && rule.slow < 100) {
        hint = 'Faster rules trade more, and every sale is billed. Try a slower one.'
      } else {
        hint = 'Buy-and-hold is hard to beat in a market that mostly rises. The crash period is where stepping aside can pay.'
      }
    }
  }

  const coach = [
    'Pick a rule. Click a chip under RULE, or type SMA 20 100 in the command line.',
    'Change the market. Each period is a different history. Try the 2020 crash, then the bull run.',
    'Read the verdict. Can you beat the grey line after charges and tax?',
  ]

  return (
    <div className="term-backdrop" data-overlay="lab" role="dialog" aria-modal="true" aria-label="Quant lab terminal">
      <div className={`term term--${theme}`}>
        <header className="t-bar">
          <span className="t-title">QUANT LAB</span>
          <span className="t-sub">
            {series ? `${series.name} · ${series.source} · ${fmtDate(series.from)} to ${fmtDate(series.to)}` : 'loading market data...'}
          </span>
          <span className="t-keys">
            <button type="button" onClick={() => exec('HELP')}>F1 HELP</button>
            <button type="button" onClick={() => setTour(0)}>F2 TOUR</button>
            <button type="button" onClick={() => setThemeAndSave(theme === 'ps' ? 'wt' : 'ps')}>
              F3 THEME {theme === 'ps' ? 'PS' : 'WT'}
            </button>
            <button type="button" onClick={onClose}>ESC EXIT</button>
          </span>
        </header>

        {failed && <p className="t-error">ERR  market data file could not be loaded. Close the terminal and try again.</p>}
        {!series && !failed && <p className="t-loading">Loading 13 years of daily NAVs...</p>}

        {series && cmp && win && (
          <>
            <form
              className="t-cmd"
              onSubmit={(e) => {
                e.preventDefault()
                exec(cmd)
                setCmd('')
              }}
            >
              <label htmlFor="t-input" className="t-prompt">
                {theme === 'ps' ? 'PS C:\\lab>' : 'lab>'}
              </label>
              <input
                id="t-input"
                ref={inputRef}
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                placeholder="SMA 20 100   or click anything below"
                spellCheck={false}
                autoComplete="off"
              />
            </form>
            <div className="t-msg" aria-live="polite">
              {suggestions.length > 0 ? (
                suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => { exec(s); setCmd('') }}>
                    {s}
                  </button>
                ))
              ) : (
                <span>{msg || 'Goal: beat buy-and-hold after charges and tax. Type HELP for commands.'}</span>
              )}
            </div>

            <div className="t-grid">
              <section className={`t-panel t-period${spot === 'period' ? ' is-spot' : ''}`}>
                <h3>PERIOD</h3>
                <ul>
                  {LEVELS.map((l) => (
                    <li key={l.id}>
                      <button type="button" className={l.id === levelId ? 'is-on' : ''} onClick={() => setLevelId(l.id)}>
                        <span>{l.label}</span>
                        <small>{l.blurb}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={`t-panel t-rule${spot === 'rule' ? ' is-spot' : ''}`}>
                <h3>RULE</h3>
                <div className="t-chips">
                  {PRESETS.map((p) => {
                    const on = p.rule.kind === rule.kind && (p.rule.kind === 'sma' ? p.rule.fast === rule.fast && p.rule.slow === rule.slow : p.rule.lookback === rule.lookback)
                    return (
                      <button key={p.label} type="button" className={on ? 'is-on' : ''} onClick={() => setRule({ ...p.rule })}>
                        {p.label}
                      </button>
                    )
                  })}
                </div>
                {rule.kind === 'sma' ? (
                  <div className="t-sliders">
                    <label>
                      <span>fast {rule.fast}</span>
                      <input
                        type="range"
                        min={5}
                        max={100}
                        value={rule.fast}
                        onChange={(e) => setRule({ ...rule, fast: Math.min(Number(e.target.value), rule.slow - 1) })}
                      />
                    </label>
                    <label>
                      <span>slow {rule.slow}</span>
                      <input
                        type="range"
                        min={20}
                        max={300}
                        value={rule.slow}
                        onChange={(e) => setRule({ ...rule, slow: Math.max(Number(e.target.value), rule.fast + 1) })}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="t-sliders">
                    <label>
                      <span>lookback {rule.lookback}d</span>
                      <input
                        type="range"
                        min={20}
                        max={300}
                        value={rule.lookback}
                        onChange={(e) => setRule({ ...rule, lookback: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                )}
                <div className="t-toggles">
                  <button type="button" aria-pressed={opts.charges} onClick={() => setOpts({ ...opts, charges: !opts.charges })}>
                    [{opts.charges ? 'x' : ' '}] charges
                  </button>
                  <button type="button" aria-pressed={opts.tax} onClick={() => setOpts({ ...opts, tax: !opts.tax })}>
                    [{opts.tax ? 'x' : ' '}] tax
                  </button>
                </div>
              </section>

              <section className={`t-panel t-verdict${spot === 'verdict' ? ' is-spot' : ''}`}>
                <h3>VERDICT</h3>
                <p className={`t-flag ${cmp.beat ? 't-c-green' : 't-c-red'}`}>
                  {cmp.beat ? 'BEATS BUY-AND-HOLD' : 'BEHIND BUY-AND-HOLD'}
                </p>
                <p>{verdict}</p>
                {hint && <p className="t-hint">HINT  {hint}</p>}
                <p className="t-score">
                  attempts {att?.n ?? 0} · misses {att?.fails ?? 0} · best{' '}
                  {att?.best != null ? `${att.best >= 0 ? '+' : '-'}${inr(Math.abs(att.best))}` : 'n/a'}
                </p>
              </section>

              <section className="t-panel t-equity">
                <h3>
                  EQUITY · {level.label.toUpperCase()} · start {lakh(START_CAPITAL)}
                </h3>
                <EquityChart cmp={cmp} />
              </section>

              <section className="t-panel t-perf">
                <h3>PERFORMANCE</h3>
                <table>
                  <thead>
                    <tr>
                      <th />
                      <th>{ruleLabel(rule)}</th>
                      <th>BUY&amp;HOLD</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td title="Value after charges and tax, fully sold on the last day">Final value</td>
                      <td>{lakh(cmp.s.finalValue)}</td>
                      <td>{lakh(cmp.h.finalValue)}</td>
                    </tr>
                    <tr>
                      <td title="Compound annual growth rate of the final value">CAGR</td>
                      <td>{signed(cmp.s.cagr)}</td>
                      <td>{signed(cmp.h.cagr)}</td>
                    </tr>
                    <tr>
                      <td title="Annualised standard deviation of daily returns">Volatility</td>
                      <td>{pct(cmp.s.vol)}</td>
                      <td>{pct(cmp.h.vol)}</td>
                    </tr>
                    <tr>
                      <td title="Excess return over a 6.5% risk-free rate per unit of volatility">Sharpe</td>
                      <td>{cmp.s.sharpe.toFixed(2)}</td>
                      <td>{cmp.h.sharpe.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td title="Largest fall from a peak">Max drawdown</td>
                      <td>{pct(cmp.s.maxDrawdown)}</td>
                      <td>{pct(cmp.h.maxDrawdown)}</td>
                    </tr>
                    <tr>
                      <td>Round trips</td>
                      <td>{cmp.s.trades}</td>
                      <td>{cmp.h.trades}</td>
                    </tr>
                    <tr>
                      <td>Charges</td>
                      <td>{inr(cmp.s.charges)}</td>
                      <td>{inr(cmp.h.charges)}</td>
                    </tr>
                    <tr>
                      <td>Tax</td>
                      <td>{inr(cmp.s.tax)}</td>
                      <td>{inr(cmp.h.tax)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="t-panel t-dd">
                <h3>DRAWDOWN</h3>
                <DrawdownChart cmp={cmp} />
                <p className="t-note">
                  <span className="t-c-red">── rule</span> <span className="t-c-dim">── buy &amp; hold</span>
                </p>
              </section>

              <section className="t-panel t-win">
                <h3>ROLLING {win.years}-YEAR WINDOWS</h3>
                <Histogram win={win} />
                <p className="t-note">
                  {win.count} windows, overlapping. Rule beats buy-and-hold in{' '}
                  <b className="t-c-yellow">{pct(win.winPre, 0)}</b> before charges and tax,{' '}
                  <b className="t-c-yellow">{pct(win.winNet, 0)}</b> after. Median {signed(win.medianExcess)} of capital.
                </p>
              </section>

              <section className="t-panel t-blotter">
                <h3>TRADE BLOTTER</h3>
                <div className="t-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Side</th>
                        <th>NAV</th>
                        <th>P&amp;L net</th>
                        <th>Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cmp.strategy.trades.map((t, i) => (
                        <tr key={i}>
                          <td>{fmtDate(t.date)}</td>
                          <td className={t.side === 'BUY' ? 't-c-green' : 't-c-red'}>
                            {t.side}
                            {t.term ? ` ${t.term}` : ''}
                          </td>
                          <td>{t.price.toFixed(2)}</td>
                          <td className={t.pnl === null ? '' : t.pnl >= 0 ? 't-c-green' : 't-c-red'}>
                            {t.pnl === null ? '' : inr(t.pnl)}
                          </td>
                          <td>{t.side === 'SELL' ? inr(t.tax) : ''}</td>
                        </tr>
                      ))}
                      {cmp.strategy.trades.length === 0 && (
                        <tr>
                          <td colSpan={5}>No trades in this period for this rule.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <footer className="t-foot">
              Past data, not advice. Real daily NAVs of a Nifty 50 index fund ({series.source}). Long-only and all-in or all-out;
              a signal at one close is filled at the next close. ₹10,00,000 start, modelled as an index ETF with ₹20 plus 0.13% per
              trade. Cash earns nothing while out of the market. Tax follows the law on the sale date: short-term 15% and long-term
              10% above ₹1L until 22 Jul 2024, then 20% and 12.5% above ₹1.25L; long-term gains exempt before 1 Apr 2018; gains up to
              31 Jan 2018 grandfathered; 3% to 4% cess; surcharge and loss set-off not modelled. 6.5% risk-free rate for Sharpe.
            </footer>
          </>
        )}

        {tour >= 0 && series && (
          <div className="t-coach" role="status">
            <span>
              {tour + 1} / 3 &nbsp; {coach[tour]}
            </span>
            <span className="t-coach-keys">
              <button type="button" onClick={() => (tour >= 2 ? finishTour() : setTour(tour + 1))}>
                {tour >= 2 ? 'Done' : 'Next'}
              </button>
              <button type="button" onClick={finishTour}>
                Skip
              </button>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
