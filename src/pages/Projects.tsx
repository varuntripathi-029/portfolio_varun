import { projects } from '../data'
import { PageHead } from '../components'

export default function Projects() {
  return (
    <>
      <PageHead title="Projects">
        AI systems I’ve built end to end, from retrieval and inference to the interface on top.
      </PageHead>
      <div className="stack">
        {projects.map((p) => (
          <article key={p.slug} className="banner banner-wide" style={{ background: p.color }}>
            <div className="banner-copy">
              <div className="chips">
                {p.tags.map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
                {p.status && <span className="chip chip-solid">{p.status}</span>}
              </div>
              <h2>{p.title}</h2>
              <p>{p.summary}</p>
              <div className="actions">
                {p.links.map((l) => (
                  <a key={l.href} className="ghost-btn" href={l.href} target="_blank" rel="noreferrer">
                    {l.label} ↗
                  </a>
                ))}
              </div>
            </div>
            <div className="banner-panel">
              <p className="panel-label">Stack</p>
              <ul>
                {p.stack.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <p className="panel-label">Results</p>
              <ul>
                {p.facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
