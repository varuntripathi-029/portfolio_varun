// One serverless function for the three small jobs that need a server:
//   op "view"      count a page view (no cookies, no IP address stored)
//   op "subscribe" keep an email address a visitor chose to leave
//   op "admin"     return the numbers and the emails, behind a passphrase
//
// Counts live in one set of keys per calendar month, and every key expires at the start of the
// next quarter (1 Jan, 1 Apr, 1 Jul, 1 Oct, India time), so the free database never fills and
// each quarter starts from zero by itself. Emails are kept: they are the one thing worth keeping.
//
// Storage is Upstash Redis over its REST API. The variables come from Vercel's environment:
//   KV_REST_API_URL, KV_REST_API_TOKEN   (added by the Upstash integration)
//   ADMIN_PASSPHRASE                     (set by hand, never committed)
//   STATS_PREFIX                         (optional key prefix, used to keep test data apart)
import { createHash, timingSafeEqual } from 'node:crypto'

type Cmd = (string | number)[]

const env = (k: string) => process.env[k] ?? ''
const url = () => env('KV_REST_API_URL') || env('UPSTASH_REDIS_REST_URL')
const token = () => env('KV_REST_API_TOKEN') || env('UPSTASH_REDIS_REST_TOKEN')
const P = () => env('STATS_PREFIX') || 'pf'

async function run(cmds: Cmd[]): Promise<unknown[]> {
  const r = await fetch(`${url()}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  })
  if (!r.ok) throw new Error(`store ${r.status}`)
  const out = (await r.json()) as { result?: unknown; error?: string }[]
  const bad = out.find((x) => x.error)
  if (bad) throw new Error(bad.error)
  return out.map((x) => x.result)
}

// Calendar day in India, so "today" matches the owner's day.
const istDay = (offset = 0) => new Date(Date.now() + 5.5 * 3600e3 - offset * 86400e3).toISOString().slice(0, 10)

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// The quarter that contains "now" in India: its three months, and the moment it ends.
function quarter() {
  const ist = new Date(Date.now() + 5.5 * 3600e3)
  const y = ist.getUTCFullYear()
  const q = Math.floor(ist.getUTCMonth() / 3)
  const months = [0, 1, 2].map((i) => {
    const m = q * 3 + i
    return { key: `${y}-${String(m + 1).padStart(2, '0')}`, label: MONTHS[m], days: new Date(Date.UTC(y, m + 1, 0)).getUTCDate() }
  })
  // 00:00 IST on the first day of the next quarter, as a unix timestamp
  const endsAt = Math.floor((Date.UTC(y, q * 3 + 3, 1) - 5.5 * 3600e3) / 1000)
  const resets = new Date(Date.UTC(y, q * 3 + 3, 1)).toISOString().slice(0, 10)
  return { id: `${y}-Q${q + 1}`, months, endsAt, resets }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  })

const digest = (s: string) => createHash('sha256').update(s).digest()
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b))

const pairs = (flat: unknown): [string, number][] => {
  const a = Array.isArray(flat) ? (flat as string[]) : []
  const out: [string, number][] = []
  for (let i = 0; i + 1 < a.length; i += 2) out.push([a[i], Number(a[i + 1])])
  return out.sort((x, y) => y[1] - x[1])
}

const clientKey = (req: Request) =>
  digest((req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim()).toString('hex').slice(0, 16)

async function view(b: Record<string, unknown>, req: Request) {
  const path = String(b.path ?? '')
  const vid = String(b.vid ?? '')
  if (!/^\/[a-z0-9/_-]{0,80}$/i.test(path) || path.startsWith('/admin')) return json({ ok: false }, 400)
  if (!/^[a-z0-9-]{8,48}$/i.test(vid)) return json({ ok: false }, 400)

  const { endsAt } = quarter()
  const day = istDay()
  const mk = `${P()}:${day.slice(0, 7)}`
  const dd = day.slice(8, 10)

  const cmds: Cmd[] = [
    ['INCR', `${mk}:views`],
    ['INCR', `${mk}:d:${dd}`],
    ['HINCRBY', `${mk}:paths`, path, 1],
    ['PFADD', `${mk}:uniq`, vid],
    ['PFADD', `${mk}:u:${dd}`, vid],
  ]
  const keys = [`${mk}:views`, `${mk}:d:${dd}`, `${mk}:paths`, `${mk}:uniq`, `${mk}:u:${dd}`]
  if (b.first === true) {
    cmds.push(['INCR', `${mk}:visits`])
    keys.push(`${mk}:visits`)
    const ref = String(b.ref ?? '').slice(0, 80)
    if (/^[a-z0-9.-]+$/i.test(ref)) {
      cmds.push(['HINCRBY', `${mk}:refs`, ref, 1])
      keys.push(`${mk}:refs`)
    }
    const country = (req.headers.get('x-vercel-ip-country') ?? '').toUpperCase()
    if (/^[A-Z]{2}$/.test(country)) {
      cmds.push(['HINCRBY', `${mk}:countries`, country, 1])
      keys.push(`${mk}:countries`)
    }
  }
  // the same moment every time, so setting it again changes nothing
  for (const k of keys) cmds.push(['EXPIREAT', k, endsAt])
  await run(cmds)
  return json({ ok: true })
}

async function subscribe(b: Record<string, unknown>, req: Request) {
  // a hidden field real visitors never fill
  if (b.website) return json({ ok: true })
  const email = String(b.email ?? '').trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ ok: false, error: 'email' }, 400)

  const p = P()
  const hour = Math.floor(Date.now() / 3600e3)
  const key = `${p}:rl:sub:${clientKey(req)}:${hour}`
  const [count] = await run([['INCR', key], ['EXPIRE', key, 7200]])
  if (Number(count) > 8) return json({ ok: false, error: 'slow' }, 429)

  await run([['HSETNX', `${p}:emails`, email, JSON.stringify({ at: new Date().toISOString() })]])
  return json({ ok: true })
}

async function admin(b: Record<string, unknown>, req: Request) {
  const secret = env('ADMIN_PASSPHRASE')
  if (!secret) return json({ ok: false, error: 'not-configured' }, 503)

  const p = P()
  const hour = Math.floor(Date.now() / 3600e3)
  const failKey = `${p}:rl:admin:${clientKey(req)}:${hour}`
  const [fails] = await run([['GET', failKey]])
  if (Number(fails ?? 0) >= 10) return json({ ok: false, error: 'locked' }, 429)

  if (!same(String(b.passphrase ?? ''), secret)) {
    await run([['INCR', failKey], ['EXPIRE', failKey, 7200]])
    return json({ ok: false, error: 'wrong' }, 401)
  }

  const q = quarter()
  const wanted = String(b.scope ?? 'all')
  const chosen = q.months.filter((m) => m.key === wanted)
  const scope = chosen.length ? chosen : q.months
  const today = istDay()

  // day rows for the chosen months, up to today (later days cannot have counts yet)
  const dayRows: { d: string; k: string; u: string }[] = []
  for (const m of scope) {
    for (let n = 1; n <= m.days; n++) {
      const dd = String(n).padStart(2, '0')
      const d = `${m.key}-${dd}`
      if (d <= today) dayRows.push({ d, k: `${p}:${m.key}:d:${dd}`, u: `${p}:${m.key}:u:${dd}` })
    }
  }

  const mk = (m: { key: string }) => `${p}:${m.key}`
  const cmds: Cmd[] = [
    ...scope.map((m): Cmd => ['GET', `${mk(m)}:views`]),
    ...scope.map((m): Cmd => ['GET', `${mk(m)}:visits`]),
    ['PFCOUNT', ...scope.map((m) => `${mk(m)}:uniq`)],
    ...scope.map((m): Cmd => ['HGETALL', `${mk(m)}:paths`]),
    ...scope.map((m): Cmd => ['HGETALL', `${mk(m)}:refs`]),
    ...scope.map((m): Cmd => ['HGETALL', `${mk(m)}:countries`]),
    ['HGETALL', `${p}:emails`],
    ...dayRows.flatMap((r): Cmd[] => [['GET', r.k], ['PFCOUNT', r.u]]),
  ]
  const r = await run(cmds)

  const n = scope.length
  const sum = (from: number) => r.slice(from, from + n).reduce<number>((a, v) => a + Number(v ?? 0), 0)
  const merge = (from: number) => {
    const out = new Map<string, number>()
    for (let i = 0; i < n; i++) for (const [k, v] of pairs(r[from + i])) out.set(k, (out.get(k) ?? 0) + v)
    return [...out.entries()].sort((x, y) => y[1] - x[1])
  }
  const emailsFlat = Array.isArray(r[n * 5 + 1]) ? (r[n * 5 + 1] as string[]) : []
  const emails: { email: string; at: string }[] = []
  for (let i = 0; i + 1 < emailsFlat.length; i += 2) {
    let at = ''
    try {
      at = JSON.parse(String(emailsFlat[i + 1])).at
    } catch {
      /* an older row without a date */
    }
    emails.push({ email: emailsFlat[i], at })
  }
  emails.sort((x, y) => y.at.localeCompare(x.at))

  const base = n * 5 + 2
  const days = dayRows.map((row, i) => ({ d: row.d, views: Number(r[base + i * 2] ?? 0), unique: Number(r[base + i * 2 + 1] ?? 0) }))
  const todayRow = days.find((x) => x.d === today) ?? { d: today, views: 0, unique: 0 }

  return json({
    ok: true,
    quarter: q.id,
    resets: q.resets,
    months: q.months.map((m) => ({ key: m.key, label: m.label })),
    scope: chosen.length ? chosen[0].key : 'all',
    views: sum(0),
    visits: sum(n),
    unique: Number(r[n * 2] ?? 0),
    today: todayRow,
    days,
    paths: merge(n * 2 + 1),
    refs: merge(n * 3 + 1),
    countries: merge(n * 4 + 1),
    emails,
  })
}

export async function POST(req: Request) {
  if (!url() || !token()) return json({ ok: false, error: 'not-configured' }, 503)
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return json({ ok: false }, 400)
  }
  try {
    if (body.op === 'view') return await view(body, req)
    if (body.op === 'subscribe') return await subscribe(body, req)
    if (body.op === 'admin') return await admin(body, req)
    return json({ ok: false }, 400)
  } catch {
    return json({ ok: false, error: 'store' }, 502)
  }
}

export function GET() {
  return json({ ok: false }, 405)
}
