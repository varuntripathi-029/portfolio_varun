import { experience, profile, skills } from '../data'
import { ExpandCard, Reel, Timeline, Words } from '../components'
import { accentAt } from '../palette'

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

export default function Experience() {
  return (
    <div className="grid">
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

      <section className="banner now" style={{ background: 'var(--c-indigo)' }}>
        <div className="chips">
          <span className="chip">Now</span>
          <span className="chip">Agentic AI</span>
        </div>
        <h2>AI + QA engineer at TIFIN AI</h2>
        <p>Agentic infrastructure for wealth management, backed by J.P. Morgan.</p>
        <ul className="now-list">
          <li>HireSignal live in production</li>
          <li>3rd runner up, Zoho Catalyst</li>
          <li>Three more hackathon finals in 2026</li>
        </ul>
      </section>

      <div className="span-2">
        <Reel items={reel} />
      </div>

      <section className="card span-2">
        <h2 className="card-title">Experience</h2>
        <Timeline
          items={experience.map((e) => ({
            title: `${e.role}, ${e.org}`,
            meta: e.period,
            lines: e.points,
          }))}
        />
      </section>

      <div className="span-2">
        <ExpandCard
          title="What I work with"
          badge={skills.map((s) => s.group).join(' · ')}
          accent={accentAt(3)}
        >
          <dl className="skills">
            {skills.map((s, i) => (
              <div key={s.group} className="skill-row">
                <dt>{s.group}</dt>
                <dd>
                  {s.items.split(', ').map((t) => (
                    <span
                      key={t}
                      className="skill-chip"
                      style={{ '--accent': accentAt(i) } as React.CSSProperties}
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
    </div>
  )
}
