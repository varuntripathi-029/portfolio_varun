import { projects } from '../data'
import { ExpandBanner, PageHead, Shot } from '../components'
import Masonry from '../Masonry'

const SPANS = [2, 2, 2, 3, 3]
const ALT = [undefined, undefined, undefined, 2, 2]

export default function Projects() {
  return (
    <>
      <PageHead title="Projects">
        Built end to end: retrieval, inference, the interface on top, and the tests nobody asked for.
      </PageHead>
      <Masonry spans={SPANS} alt={ALT} className="tiles-3">
        {projects.map((p) => (
          <ExpandBanner
            key={p.slug}
            color={p.color}
            chips={[...p.tags, ...(p.status ? [p.status] : [])]}
            title={p.title}
            teaser={p.tagline}
            art={
              <Shot src={p.shot}>
                {p.diagram ? (
                  <div className="ph ph-flow">
                    {p.diagram.map((n, i) => (
                      <span key={n} className="flow-node-wrap">
                        <span className="flow-node">{n}</span>
                        {i < p.diagram!.length - 1 && <span className="flow-link" aria-hidden="true" />}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="ph">
                    <span className="ph-label">Stack</span>
                    <ul>
                      {p.stack.slice(0, 4).map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Shot>
            }
          >
            <p className="banner-summary">{p.summary}</p>
            <div className="panel">
              <div>
                <p className="panel-label">Stack</p>
                <ul>
                  {p.stack.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="panel-label">Results</p>
                <ul>
                  {p.facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
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
      </Masonry>
    </>
  )
}
