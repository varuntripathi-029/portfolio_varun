import { projects } from '../data'
import { ExpandBanner, PageHead } from '../components'

export default function Projects() {
  return (
    <>
      <PageHead title="Projects">
        AI systems I’ve built end to end, from retrieval and inference to the interface on top.
      </PageHead>
      <div className="grid grid-top">
        {projects.map((p) => (
          <ExpandBanner
            key={p.slug}
            color={p.color}
            chips={[...p.tags, ...(p.status ? [p.status] : [])]}
            title={p.title}
            teaser={p.tagline}
            art={
              <>
                <span className="art-label">Stack</span>
                <ul>
                  {p.stack.slice(0, 4).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </>
            }
          >
            <p className="banner-summary">{p.summary}</p>
            <div className="panel">
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
            <div className="actions">
              {p.links.map((l) => (
                <a key={l.href} className="ghost-btn" href={l.href} target="_blank" rel="noreferrer">
                  {l.label} ↗
                </a>
              ))}
            </div>
          </ExpandBanner>
        ))}
      </div>
    </>
  )
}
