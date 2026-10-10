import { Link } from 'react-router-dom'
import { blogs } from '../data'
import { ExpandBanner, PageHead } from '../components'

export default function Blogs() {
  return (
    <>
      <PageHead title="Blogs">
        Write-ups on fintech products and the systems behind them. Some come with a working demo.
      </PageHead>
      <div className="grid grid-top">
        {blogs.map((b) => (
          <ExpandBanner
            key={b.slug}
            color={b.color}
            chips={[b.org, ...b.tags]}
            title={b.title}
            teaser={b.tagline}
          >
            <p className="banner-summary">{b.summary}</p>
            <div className="actions">
              <Link viewTransition className="ghost-btn ghost-solid" to={`/blogs/${b.slug}`}>
                Read the write-up
              </Link>
              {b.links.map((l) => (
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
