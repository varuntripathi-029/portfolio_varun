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
        <div className="hero-id">
          <img className="avatar" src={profile.photo} alt="Portrait of Varun Tripathi" width={108} height={135} />
          <span className="scribble" aria-hidden="true">
            yes, a real
            <br />
            person
          </span>
        </div>
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
        <section className="banner now" style={{ background: 'var(--c-blue)' }}>
          <div className="chips">
            <span className="chip">Now</span>
            <span className="chip">AI + QA</span>
          </div>
          <h2>AI + QA engineer at TIFIN AI</h2>
          <p>Since October 2026, helping test and check the quality of the AI features the platform ships.</p>
          <ul className="now-list">
            <li>HireSignal in production</li>
            <li>Zoho Catalyst 3rd runner up</li>
            <li>3 more hackathon finals</li>
          </ul>
        </section>

        <section className="card links-card">
          <h2 className="card-title">Find me</h2>
          <ul className="link-pills">
            {links.map((l, i) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  target={l.href.startsWith('http') || l.href.endsWith('.pdf') ? '_blank' : undefined}
                  rel="noreferrer"
                  style={{ '--accent': accentAt(i) } as CSSProperties}
                >
                  {l.label}
                  <span aria-hidden="true"> ↗</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <ExpandCard
          kicker="or play"
          title="Paper Hands"
          teaser="Can your trading rule beat doing nothing?"
          accent={accentAt(1)}
        >
          <p>
            Most trading rules look brilliant in a spreadsheet and fall apart at the till, where every trade is billed for
            charges and, if you sold inside a year, short-term capital-gains tax. Paper Hands runs your rule on 13 years of real Nifty 50
            index-fund prices, 2013 to 2026, and bills it exactly that way. Then it sets the result against the opponent
            that never trades and never complains: buy and hold.
          </p>
          <p className="aside">Your opponent has no strategy, no analyst team and no excuses.</p>
          <button type="button" className="pill-btn" onClick={() => window.dispatchEvent(new CustomEvent('open-lab'))}>
            Enter the arena
          </button>
        </ExpandCard>
      </div>


      <section className="card">
        <h2 className="card-title card-title-sm">Experience</h2>
        <Timeline
          items={experience.map((e) => ({
            title: `${e.role}, ${e.org}`,
            meta: e.period,
            lines: e.points,
          }))}
        />
      </section>

      <div className="exp-right">
      <ExpandCard
        title="The toolbox"
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
      <Reel items={reel} />
      </div>
    </div>
  )
}
