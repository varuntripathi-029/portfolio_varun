// Downloads the daily NAV history of an index fund that tracks the Nifty 50 and stores it as a
// compact static file, so the site never calls a market-data API at runtime.
// Source: AMFI NAV data via the community API mfapi.in (no key, no account).
// Run with: npm run data
import { writeFileSync, mkdirSync } from 'node:fs'

const SCHEME = 119063 // HDFC Nifty 50 Index Fund - Direct Plan - Growth Option
const res = await fetch(`https://api.mfapi.in/mf/${SCHEME}`)
if (!res.ok) throw new Error(`mfapi.in responded ${res.status}`)
const body = await res.json()

// mfapi returns newest first with dd-mm-yyyy dates; store oldest first as ISO dates.
const rows = body.data
  .map((r) => {
    const [d, m, y] = r.date.split('-')
    return { date: `${y}-${m}-${d}`, nav: Number(r.nav) }
  })
  .filter((r) => Number.isFinite(r.nav) && r.nav > 0)
  .sort((a, b) => (a.date < b.date ? -1 : 1))

const out = {
  name: body.meta.scheme_name,
  fundHouse: body.meta.fund_house,
  source: 'AMFI NAV data via mfapi.in',
  from: rows[0].date,
  to: rows[rows.length - 1].date,
  dates: rows.map((r) => r.date),
  nav: rows.map((r) => Math.round(r.nav * 10000) / 10000),
}

mkdirSync(new URL('../public/data/', import.meta.url), { recursive: true })
writeFileSync(new URL('../public/data/nifty50.json', import.meta.url), JSON.stringify(out))
console.log(`${out.name}: ${rows.length} NAVs, ${out.from} to ${out.to}`)
