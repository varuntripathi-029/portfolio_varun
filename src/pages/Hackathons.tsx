import { hackathons, honors } from '../data'
import { PageHead } from '../components'

export default function Hackathons() {
  return (
    <>
      <PageHead title="Hackathons">
        Four builds under a deadline in 2026: one podium, three finals.
      </PageHead>
      <div className="grid">
        {hackathons.map((h) => (
          <section key={h.title} className="card">
            <p className="card-kicker">
              {h.event}, {h.when}
            </p>
            <h2 className="card-title">{h.title}</h2>
            <p className="result">{h.result}</p>
            <p>{h.detail}</p>
          </section>
        ))}
        <section className="card span-2">
          <h2 className="card-title">Honors</h2>
          <ul className="plain-list">
            {honors.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
