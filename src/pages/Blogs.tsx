import { Link } from 'react-router-dom'
import { blogs } from '../data'
import { PageHead } from '../components'

export default function Blogs() {
  return (
    <>
      <PageHead title="Blogs">
        Write-ups on fintech products and the systems behind them. Some come with a working demo.
      </PageHead>
      <div className="grid">
        {blogs.map((b) => (
          <Link key={b.slug} to={`/blogs/${b.slug}`} className="banner banner-tall" style={{ background: b.color }}>
            <div className="banner-copy">
              <div className="chips">
                <span className="chip">{b.org}</span>
                {b.tags.map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
              </div>
              <h2>{b.title}</h2>
              <p>{b.summary}</p>
              <span className="circle" aria-hidden="true">
                →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
