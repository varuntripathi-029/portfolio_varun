import { useEffect, useState, type FormEvent } from 'react'
import { loadAdmin, type AdminData } from '../pulse'

const PASS = 'pf-admin-pass'
const num = (n: number) => n.toLocaleString('en-IN')

function Bars({ days }: { days: AdminData['days'] }) {
  const top = Math.max(1, ...days.map((d) => d.views))
  return (
    <div className="adm-bars" role="img" aria-label="Views per day, last 30 days">
      {days.map((d) => (
        <div key={d.d} className="adm-bar" title={`${d.d}: ${d.views} views, ${d.unique} visitors`}>
          <span style={{ height: `${Math.max(2, (d.views / top) * 100)}%` }} />
        </div>
      ))}
    </div>
  )
}

function Rows({ rows, empty }: { rows: [string, number][]; empty: string }) {
  if (!rows.length) return <p className="adm-empty">{empty}</p>
  return (
    <ul className="adm-rows">
      {rows.slice(0, 12).map(([k, v]) => (
        <li key={k}>
          <span>{k}</span>
          <b>{num(v)}</b>
        </li>
      ))}
    </ul>
  )
}

// A private page: nothing links to it, search engines are told to skip it, and the numbers only
// come back from the server for the right passphrase.
export default function Admin() {
  const [pass, setPass] = useState('')
  const [data, setData] = useState<AdminData | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const m = document.createElement('meta')
    m.name = 'robots'
    m.content = 'noindex, nofollow'
    document.head.appendChild(m)
    return () => m.remove()
  }, [])

  const open = async (p: string) => {
    setBusy(true)
    setError('')
    const r = await loadAdmin(p)
    setBusy(false)
    if (r.data) {
      setData(r.data)
      try {
        sessionStorage.setItem(PASS, p)
      } catch {
        /* the passphrase is simply asked for again next time */
      }
    } else {
      try {
        sessionStorage.removeItem(PASS)
      } catch {
        /* nothing stored */
      }
      setError(
        r.error === 'wrong'
          ? 'That is not the passphrase.'
          : r.error === 'locked'
            ? 'Too many wrong tries. Wait an hour.'
            : 'The numbers are not reachable here. This page only works on the deployed site.',
      )
    }
  }

  useEffect(() => {
    let saved: string | null = null
    try {
      saved = sessionStorage.getItem(PASS)
    } catch {
      /* none */
    }
    if (saved) void open(saved)
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void open(pass)
  }

  if (!data) {
    return (
      <div className="adm">
        <form className="adm-login card" onSubmit={submit}>
          <h1 className="adm-title">Admin</h1>
          <label className="sub-label" htmlFor="adm-pass">
            Passphrase
          </label>
          <div className="sub-row">
            <input
              id="adm-pass"
              type="password"
              autoComplete="current-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
            <button type="submit" className="pill-btn" disabled={busy || !pass}>
              {busy ? 'Checking' : 'Open'}
            </button>
          </div>
          {error && <p className="sub-msg">{error}</p>}
        </form>
      </div>
    )
  }

  const addresses = data.emails.map((e) => e.email).join('\n')
  const csv = 'email,joined\n' + data.emails.map((e) => `${e.email},${e.at}`).join('\n')
  const download = () => {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'subscribers.csv'
    a.click()
    URL.revokeObjectURL(url)
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(addresses)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="adm">
      <h1 className="adm-title">Admin</h1>

      <div className="adm-stats">
        <div className="card">
          <p className="adm-n">{num(data.unique)}</p>
          <p className="adm-l">unique visitors</p>
        </div>
        <div className="card">
          <p className="adm-n">{num(data.visits)}</p>
          <p className="adm-l">visits</p>
        </div>
        <div className="card">
          <p className="adm-n">{num(data.views)}</p>
          <p className="adm-l">section views</p>
        </div>
        <div className="card">
          <p className="adm-n">{num(data.today.views)}</p>
          <p className="adm-l">views today · {num(data.today.unique)} visitors</p>
        </div>
      </div>

      <section className="card">
        <h2 className="card-title card-title-sm">Last 30 days</h2>
        <Bars days={data.days} />
      </section>

      <div className="adm-cols">
        <section className="card">
          <h2 className="card-title card-title-sm">Sections</h2>
          <Rows rows={data.paths} empty="Nothing yet." />
        </section>
        <section className="card">
          <h2 className="card-title card-title-sm">Where from</h2>
          <Rows rows={data.refs} empty="No referrers yet." />
        </section>
        <section className="card">
          <h2 className="card-title card-title-sm">Countries</h2>
          <Rows rows={data.countries} empty="Nothing yet." />
        </section>
      </div>

      <section className="card">
        <h2 className="card-title card-title-sm">Emails ({data.emails.length})</h2>
        {data.emails.length === 0 ? (
          <p className="adm-empty">Nobody has left an address yet.</p>
        ) : (
          <>
            <div className="adm-actions">
              <button type="button" className="pill-btn" onClick={copy}>
                {copied ? 'Copied' : 'Copy all'}
              </button>
              <button type="button" className="pill-btn" onClick={download}>
                Download CSV
              </button>
            </div>
            <ul className="adm-rows">
              {data.emails.map((e) => (
                <li key={e.email}>
                  <span>{e.email}</span>
                  <b>{e.at ? new Date(e.at).toLocaleDateString('en-IN') : ''}</b>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="adm-fine">
        Counted without cookies or IP addresses. Your own browser is left out once you have signed in here.
      </p>
    </div>
  )
}
