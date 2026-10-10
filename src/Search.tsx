import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isModelReady, loadIndex, loadModel, search, type Hit } from './searchEngine'

const EXAMPLES = [
  'best RAG work',
  'low latency inference',
  'anything with trading or tax',
  'a mobile app',
  'air quality forecasting',
  'who leads teams',
]

type Phase = 'idle' | 'loading' | 'ready' | 'fallback'

function snippet(text: string, max = 150) {
  return text.length > max ? text.slice(0, max).replace(/\s\S*$/, '') + '…' : text
}

export default function Search({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [active, setActive] = useState(0)
  const [phase, setPhase] = useState<Phase>(() => (isModelReady() ? 'ready' : 'idle'))
  const [progress, setProgress] = useState(0)

  // Start loading the index and model the first time the panel opens.
  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    if (isModelReady()) {
      setPhase('ready')
      return
    }
    setPhase('loading')
    loadIndex().catch(() => setPhase('fallback'))
    loadModel(setProgress)
      .then(() => setPhase('ready'))
      .catch(() => setPhase('fallback'))
  }, [open])

  // Re-run the query as it changes, and again when the model finishes loading.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      search(query, phase === 'ready')
        .then((h) => {
          if (!cancelled) {
            setHits(h)
            setActive(0)
          }
        })
        .catch(() => undefined)
    }, 110)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, phase, open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const go = (hit: Hit | undefined) => {
    if (!hit) return
    navigate(hit.chunk.path)
    onClose()
  }

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, hits.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      go(hits[active])
    }
  }

  const status =
    phase === 'ready'
      ? 'Semantic search is on.'
      : phase === 'fallback'
        ? 'Model unavailable, using keyword matching.'
        : `Loading the language model (about 25 MB, once)… ${Math.round(progress)}%`

  return (
    <div className="search-backdrop" data-overlay="search" onMouseDown={onClose}>
      <div
        className="search"
        role="dialog"
        aria-modal="true"
        aria-label="Search this portfolio"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKey}
          placeholder="Ask in your own words: “who has built a RAG system?”"
          aria-label="Search query"
          spellCheck={false}
        />

        {!query.trim() && (
          <div className="search-empty">
            <p>Try one of these, or type anything.</p>
            <div className="search-examples">
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => setQuery(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {query.trim() && hits.length === 0 && (
          <p className="search-empty-note">
            {phase === 'loading' ? 'Matching keywords while the model loads…' : 'Nothing close to that. Try other words.'}
          </p>
        )}

        <ol className="search-results">
          {hits.map((h, i) => (
            <li key={h.chunk.id}>
              <button
                type="button"
                className={`search-hit${i === active ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(h)}
              >
                <span className="hit-top">
                  <span className="hit-section">{h.chunk.section}</span>
                  <span className="hit-title">{h.chunk.title}</span>
                </span>
                <span className="hit-text">{snippet(h.chunk.text)}</span>
                <span className="hit-meta">
                  <span className="hit-bar" aria-hidden="true">
                    <i style={{ width: `${Math.round(Math.min(Math.max(h.score, 0), 0.8) * 125)}%` }} />
                  </span>
                  <span>
                    {h.semantic !== null ? `similarity ${h.semantic.toFixed(2)}` : 'keyword match'}
                    {h.matched.length > 0 && ` · matched: ${h.matched.slice(0, 4).join(', ')}`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <p className="search-foot">
          {status} Runs in your browser with all-MiniLM-L6-v2. No server, nothing sent anywhere.
        </p>
      </div>
    </div>
  )
}
