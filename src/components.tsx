import type { ReactNode } from 'react'

export function Timeline({
  items,
}: {
  items: { title: string; meta?: string; lines: string[] }[]
}) {
  return (
    <ol className="timeline">
      {items.map((it) => (
        <li key={it.title} className="tl-item">
          <span className="tl-dot" aria-hidden="true" />
          <h3>{it.title}</h3>
          {it.meta && <p className="tl-meta">{it.meta}</p>}
          {it.lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </li>
      ))}
    </ol>
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
