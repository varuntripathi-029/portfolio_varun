import { slug as focusKey } from '../focus'
import { Link, useParams } from 'react-router-dom'
import { blogs } from '../data'

export default function BlogPost() {
  const { slug } = useParams()
  const post = blogs.find((b) => b.slug === slug)

  if (!post) {
    return (
      <section className="card">
        <h1 className="card-title">That post doesn’t exist</h1>
        <p>
          <Link to="/blogs">Back to blogs</Link>
        </p>
      </section>
    )
  }

  return (
    <article className="post">
      <Link to="/blogs" viewTransition className="back">
        ← All blogs
      </Link>
      <header className="banner post-head" style={{ background: post.color }}>
        <div className="banner-copy">
          <div className="chips">
            <span className="chip">{post.org}</span>
            {post.tags.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
          <h1>{post.title}</h1>
          <p>{post.summary}</p>
          <div className="actions">
            {post.links.map((l) => (
              <a key={l.href} className="ghost-btn" href={l.href} target="_blank" rel="noreferrer">
                {l.label} ↗
              </a>
            ))}
          </div>
        </div>
      </header>
      <section className="card post-body">
        {post.sections.map((s) => (
          <div key={s.heading} data-focus={focusKey(s.heading)} className="post-section">
            <h2>{s.heading}</h2>
            <p>{s.text}</p>
          </div>
        ))}
      </section>
    </article>
  )
}
