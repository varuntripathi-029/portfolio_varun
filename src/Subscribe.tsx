import { useState, type FormEvent } from 'react'
import { subscribe } from './pulse'

const KEY = 'pf-subscribed'
const was = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

// An opt-in note list: the visitor types their own address and is told what it is used for.
export default function Subscribe() {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'invalid' | 'slow' | 'error'>(was() ? 'done' : 'idle')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setState('sending')
    const r = await subscribe(email, website)
    if (r === 'ok') {
      try {
        localStorage.setItem(KEY, '1')
      } catch {
        /* fine without it */
      }
      setState('done')
    } else setState(r)
  }

  if (state === 'done') {
    return <p className="sub-thanks">Noted. You will hear from me when something new ships here, and not otherwise.</p>
  }

  return (
    <form className="sub-form" onSubmit={submit}>
      <label className="sub-label" htmlFor="sub-email">
        Want a note when I ship something new?
      </label>
      <div className="sub-row">
        <input
          id="sub-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="pill-btn" disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending' : 'Notify me'}
        </button>
      </div>
      {/* a field only a bot fills in */}
      <input
        className="sub-trap"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />
      <p className="sub-fine">
        Used only to tell you about new work here. No spam, no sharing, and I will delete it if you ask.
      </p>
      {state === 'invalid' && <p className="sub-msg">That does not look like an email address.</p>}
      {state === 'slow' && <p className="sub-msg">Too many tries for now. Give it an hour.</p>}
      {state === 'error' && <p className="sub-msg">Could not save that just now. Try again in a moment.</p>}
    </form>
  )
}
