// One serverless function for the three small jobs that need a server:
//   op "view"      count a page view (no cookies, no IP address stored)
//   op "subscribe" keep an email address a visitor chose to leave
//   op "admin"     return the numbers and the emails, behind a passphrase
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

  const p = P()
  const day = istDay()
  const cmds: Cmd[] = [
    ['INCR', `${p}:views`],
    ['INCR', `${p}:day:${day}`],
    ['HINCRBY', `${p}:paths`, path, 1],
    ['PFADD', `${p}:uniq`, vid],
    ['PFADD', `${p}:uniq:${day}`, vid],
  ]
  if (b.first === true) {
    cmds.push(['INCR', `${p}:visits`])
    const ref = String(b.ref ?? '').slice(0, 80)
    if (/^[a-z0-9.-]+$/i.test(ref)) cmds.push(['HINCRBY', `${p}:refs`, ref, 1])
    const country = (req.headers.get('x-vercel-ip-country') ?? '').toUpperCase()
    if (/^[A-Z]{2}$/.test(country)) cmds.push(['HINCRBY', `${p}:countries`, country, 1])
  }
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

  const days = Array.from({ length: 30 }, (_, i) => istDay(29 - i))
  const cmds: Cmd[] = [
    ['GET', `${p}:views`],
    ['GET', `${p}:visits`],
    ['PFCOUNT', `${p}:uniq`],
    ['HGETALL', `${p}:paths`],
    ['HGETALL', `${p}:refs`],
    ['HGETALL', `${p}:countries`],
    ['HGETALL', `${p}:emails`],
    ...days.flatMap((d): Cmd[] => [['GET', `${p}:day:${d}`], ['PFCOUNT', `${p}:uniq:${d}`]]),
  ]
  const r = await run(cmds)
  const perDay = days.map((d, i) => ({ d, views: Number(r[7 + i * 2] ?? 0), unique: Number(r[8 + i * 2] ?? 0) }))
  const emails = pairs(r[6])
    .map(([email]) => email)
    .map((email) => {
      const raw = (Array.isArray(r[6]) ? (r[6] as string[]) : []).indexOf(email)
      let at = ''
      try {
        at = JSON.parse(String((r[6] as string[])[raw + 1])).at
      } catch {
        /* an older row without a date */
      }
      return { email, at }
    })
    .sort((a, b2) => b2.at.localeCompare(a.at))

  return json({
    ok: true,
    views: Number(r[0] ?? 0),
    visits: Number(r[1] ?? 0),
    unique: Number(r[2] ?? 0),
    today: perDay[perDay.length - 1],
    days: perDay,
    paths: pairs(r[3]),
    refs: pairs(r[4]),
    countries: pairs(r[5]),
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
