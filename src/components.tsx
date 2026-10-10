import { useId, useState, type ReactNode } from 'react'

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

export function Timeline({
  items,
}: {
  items: { title: string; meta?: string; lines: string[] }[]
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const base = useId()

  return (
    <ol className="timeline">
      {items.map((it, i) => {
        const open = openIdx === i
        const panelId = `${base}-${i}`
        return (
          <li key={it.title} className={`tl-item${open ? ' is-open' : ''}`}>
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
              <span className="toggle" aria-hidden="true" />
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
  badge,
  children,
}: {
  kicker?: string
  title: string
  badge?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <section className={`card expand${open ? ' is-open' : ''}`}>
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
          {badge && <span className="badge">{badge}</span>}
        </span>
        <span className="toggle" aria-hidden="true" />
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
  children,
}: {
  color: string
  chips: string[]
  title: string
  teaser: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <article className={`banner expand${open ? ' is-open' : ''}`} style={{ background: color }}>
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
        <span className="toggle toggle-light" aria-hidden="true" />
      </button>
      <div id={id}>
        <Collapse open={open}>
          <div className="banner-body">{children}</div>
        </Collapse>
      </div>
    </article>
  )
}
