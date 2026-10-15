import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react'
import { slug } from './focus'
import { accentAt, hueAt } from './palette'

type Accented = CSSProperties & { '--accent'?: string }

function WheelToggle({ open, light }: { open: boolean; light?: boolean }) {
  return (
    <span className="toggle-row" aria-hidden="true">
      <span className="toggle-pill" data-open={open}>
        <span className="toggle-label">{open ? 'Collapse' : 'Expand'}</span>
        <span className="toggle-roll">
          <span className={`toggle${light ? ' toggle-light' : ''}`} />
        </span>
      </span>
    </span>
  )
}

// A search result asks the card with this key to open itself.
function useFocusOpen(key: string, open: () => void) {
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent<string>).detail === key) open()
    }
    window.addEventListener('focus-open', on)
    return () => window.removeEventListener('focus-open', on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={`collapse${open ? ' is-open' : ''}`} inert={!open}>
      <div className="collapse-inner">{children}</div>
    </div>
  )
}

export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  )
}

export function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <span key={i} className="word" style={{ '--i': i } as CSSProperties}>
          {w}
          {' '}
        </span>
      ))}
    </>
  )
}

export function Timeline({
  items,
}: {
  items: { title: string; meta?: string; lines: string[] }[]
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const base = useId()

  useEffect(() => {
    const on = (e: Event) => {
      const i = items.findIndex((it) => slug(it.title) === (e as CustomEvent<string>).detail)
      if (i >= 0) setOpenIdx(i)
    }
    window.addEventListener('focus-open', on)
    return () => window.removeEventListener('focus-open', on)
  }, [items])

  return (
    <ol className="timeline">
      {items.map((it, i) => {
        const open = openIdx === i
        const panelId = `${base}-${i}`
        return (
          <li
            key={it.title}
            data-focus={slug(it.title)}
            className={`tl-item${open ? ' is-open' : ''}`}
            style={{ '--accent': accentAt(i * 2) } as Accented}
          >
            <span className="tl-dot" aria-hidden="true" />
            <button
              type="button"
              className="tl-head"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenIdx(open ? null : i)}
            >
              <span>
                <span className="tl-title">{it.title}</span>
                {it.meta && <span className="tl-meta">{it.meta}</span>}
              </span>
              <WheelToggle open={open} />
            </button>
            <div id={panelId}>
              <Collapse open={open}>
                <div className="tl-body">
                  {it.lines.map((l) => (
                    <p key={l}>{l}</p>
                  ))}
                </div>
              </Collapse>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function ExpandCard({
  kicker,
  title,
  teaser,
  badge,
  accent,
  children,
}: {
  kicker?: string
  title: string
  teaser?: string
  badge?: string
  accent?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  useFocusOpen(slug(title), () => setOpen(true))
  return (
    <section
      data-focus={slug(title)}
      className={`card expand${open ? ' is-open' : ''}`}
      style={accent ? ({ '--accent': accent } as Accented) : undefined}
    >
      <button
        type="button"
        className="expand-head"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="expand-text">
          {kicker && <span className="card-kicker">{kicker}</span>}
          <span className="card-title">{title}</span>
          {teaser && <span className="card-teaser">{teaser}</span>}
          {badge && <span className="badge">{badge}</span>}
        </span>
        <WheelToggle open={open} />
      </button>
      <div id={id}>
        <Collapse open={open}>
          <div className="expand-body">{children}</div>
        </Collapse>
      </div>
    </section>
  )
}

export function ExpandBanner({
  color,
  chips,
  title,
  teaser,
  art,
  children,
}: {
  color: string
  chips: string[]
  title: string
  teaser: string
  art?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  useFocusOpen(slug(title), () => setOpen(true))
  return (
    <article data-focus={slug(title)} className={`banner expand${open ? ' is-open' : ''}`} style={{ background: color }}>
      <button
        type="button"
        className="banner-head"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="chips">
          {chips.map((c) => (
            <span key={c} className="chip">
              {c}
            </span>
          ))}
        </span>
        <span className="banner-title">{title}</span>
        <span className="banner-teaser">{teaser}</span>
        <WheelToggle open={open} light />
      </button>
      {art && (
        <div className="tile-art" aria-hidden="true">
          {art}
        </div>
      )}
      <div id={id}>
        <Collapse open={open}>
          <div className="banner-body">{children}</div>
        </Collapse>
      </div>
    </article>
  )
}

export function Reel({ items }: { items: string[] }) {
  const row = (hidden: boolean) => (
    <ul className="reel-row" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <li key={t} className="reel-chip" style={{ '--h': hueAt(i) } as CSSProperties}>
          {t}
        </li>
      ))}
    </ul>
  )
  return (
    <div className="reel" aria-label="Technologies I work with">
      <div className="reel-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}

export function Shot({ src, children }: { src?: string; children?: ReactNode }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className="shot">
      <div className="shot-bar" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="shot-view">
        {src ? (
          <img
            src={src}
            alt=""
            decoding="async"
            className={loaded ? 'is-loaded' : undefined}
            onLoad={() => setLoaded(true)}
            ref={(el) => {
              if (el?.complete && el.naturalWidth > 0) setLoaded(true)
            }}
          />
        ) : (
          children
        )}
      </div>
    </div>
  )
}
