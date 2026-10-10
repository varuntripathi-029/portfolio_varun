import { Link } from 'react-router-dom'
import { experience, profile, skills } from '../data'
import { Timeline } from '../components'

export default function Experience() {
  return (
    <div className="grid">
      <section className="card hero">
        <p className="hello">Hi, I’m {profile.name}</p>
        <h1>{profile.headline}</h1>
        <p className="lede">{profile.intro}</p>
        <a className="pill-btn" href={profile.resume} target="_blank" rel="noreferrer">
          Resume
        </a>
      </section>

      <Link to="/projects" className="banner" style={{ background: '#5560a6' }}>
        <div className="banner-copy">
          <div className="chips">
            <span className="chip">Now</span>
            <span className="chip">Agentic AI</span>
          </div>
          <h2>AI + QA engineer at TIFIN AI</h2>
          <p>Agentic infrastructure for wealth management, backed by J.P. Morgan.</p>
          <span className="circle" aria-hidden="true">
            →
          </span>
        </div>
      </Link>

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

      <section className="card span-2">
        <h2 className="card-title">What I work with</h2>
        <dl className="skills">
          {skills.map((s) => (
            <div key={s.group} className="skill-row">
              <dt>{s.group}</dt>
              <dd>{s.items}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
