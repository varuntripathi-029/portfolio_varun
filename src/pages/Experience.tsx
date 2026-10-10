import { experience, profile, skills } from '../data'
import { ExpandCard, Reel, Timeline, Words } from '../components'
import { accentAt, hueAt } from '../palette'
import type { CSSProperties } from 'react'

const reel = [
  'RAG pipelines',
  'FastAPI',
  'LangGraph',
  'PyTorch',
  'FAISS',
  'pgvector',
  'Groq',
  'Celery',
  'PostgreSQL',
  'Redis',
  'React 19',
  'Next.js',
  'TypeScript',
  'Playwright',
  'Docker',
  'AWS',
]

const links = [
  { label: 'LinkedIn', note: 'varun-tripathi', href: profile.linkedin },
  { label: 'GitHub', note: 'varuntripathi-029', href: profile.github },
  { label: 'Resume', note: 'PDF', href: profile.resume },
  { label: 'Email', note: profile.email, href: `mailto:${profile.email}` },
]

export default function Experience() {
  return (
    <div className="exp-grid">
      <section className="card hero">
        <img className="avatar" src={profile.photo} alt="Portrait of Varun Tripathi" width={108} height={135} />
        <p className="hello">Hi, I’m {profile.name}</p>
        <h1>
          <Words text={profile.headline} />
        </h1>
        <p className="lede">{profile.intro}</p>
        <a className="pill-btn" href={profile.resume} target="_blank" rel="noreferrer">
          Resume
        </a>
      </section>

      <div className="side-stack">
        <section className="banner now" style={{ background: 'var(--c-indigo)' }}>
          <div className="chips">
            <span className="chip">Now</span>
            <span className="chip">Agentic AI</span>
          </div>
          <h2>AI + QA engineer at TIFIN AI</h2>
          <p>Agentic infrastructure for wealth management, backed by J.P. Morgan.</p>
          <ul className="now-list">
            <li>HireSignal in production</li>
            <li>Zoho Catalyst 3rd runner up</li>
            <li>3 more hackathon finals</li>
          </ul>
        </section>

        <section className="card links-card">
          <h2 className="card-title">Find me</h2>
          <ul className="link-rows">
            {links.map((l, i) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  target={l.href.startsWith('http') || l.href.endsWith('.pdf') ? '_blank' : undefined}
                  rel="noreferrer"
                  style={{ '--accent': accentAt(i) } as CSSProperties}
                >
                  <span className="link-label">{l.label}</span>
                  <span className="link-note">{l.note}</span>
                  <span className="link-arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="span-2">
        <Reel items={reel} />
      </div>

      <section className="card">
        <h2 className="card-title">Experience</h2>
        <Timeline
          items={experience.map((e) => ({
            title: `${e.role}, ${e.org}`,
            meta: e.period,
            lines: e.points,
          }))}
        />
      </section>

      <ExpandCard
        title="What I work with"
        badge={skills.map((s) => s.group).join(' · ')}
        accent={accentAt(3)}
      >
        <dl className="skills">
          {skills.map((s, g) => (
            <div key={s.group} className="skill-row">
              <dt>{s.group}</dt>
              <dd>
                {s.items.split(', ').map((t, i) => (
                  <span
                    key={t}
                    className="skill-chip"
                    style={{ '--h': hueAt(g * 3 + i) } as CSSProperties}
                  >
                    {t}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </ExpandCard>
    </div>
  )
}
