// Small client for /api/pulse: counts page views and keeps emails visitors choose to leave.
// No cookies are set. A random id lives in localStorage so one person counts once as a visitor.

const ENDPOINT = '/api/pulse'

const read = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* private window: the visit simply counts as a new visitor */
  }
}

const visitorId = () => {
  let id = read('pf-vid')
  if (!id) {
    id = crypto.randomUUID()
    write('pf-vid', id)
  }
  return id
}

// Not counted: local development, the owner's own browser, and anyone who sends Do Not Track.
const skip = () =>
  /^(localhost|127\.|10\.|192\.168\.)/.test(location.hostname) ||
  read('pf-owner') === '1' ||
  navigator.doNotTrack === '1'

let first = true

export function trackView(path: string) {
  if (skip()) return
  let ref = ''
  if (first && document.referrer) {
    try {
      const h = new URL(document.referrer).hostname
      if (h !== location.hostname) ref = h
    } catch {
      /* ignore a malformed referrer */
    }
  }
  const body = JSON.stringify({ op: 'view', path, vid: visitorId(), first, ref })
  first = false
  fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(
    () => undefined,
  )
}

export async function subscribe(email: string, website: string): Promise<'ok' | 'invalid' | 'slow' | 'error'> {
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'subscribe', email, website }),
    })
    if (r.ok) return 'ok'
    if (r.status === 400) return 'invalid'
    if (r.status === 429) return 'slow'
    return 'error'
  } catch {
    return 'error'
  }
}

export type AdminData = {
  quarter: string
  resets: string
  months: { key: string; label: string }[]
  scope: string
  views: number
  visits: number
  unique: number
  today: { d: string; views: number; unique: number }
  days: { d: string; views: number; unique: number }[]
  paths: [string, number][]
  refs: [string, number][]
  countries: [string, number][]
  emails: { email: string; at: string }[]
}

export async function loadAdmin(passphrase: string, scope = 'all'): Promise<{ data?: AdminData; error?: 'wrong' | 'locked' | 'down' }> {
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'admin', passphrase, scope }),
    })
    if (r.status === 401) return { error: 'wrong' }
    if (r.status === 429) return { error: 'locked' }
    if (!r.ok) return { error: 'down' }
    // the owner's own visits are left out of the numbers from now on
    write('pf-owner', '1')
    return { data: (await r.json()) as AdminData }
  } catch {
    return { error: 'down' }
  }
}
