import { hackathons, honors } from '../data'
import { ExpandCard, PageHead } from '../components'
import { accentAt } from '../palette'

export default function Hackathons() {
  return (
    <>
      <PageHead title="Hackathons">
        Four builds under a deadline in 2026: one podium, three finals.
      </PageHead>
      <div className="grid grid-top">
        {hackathons.map((h, i) => (
          <ExpandCard
            key={h.title}
            accent={accentAt(i + 2)}
            kicker={`${h.event}, ${h.when}`}
            title={h.title}
            badge={h.result}
          >
            <p>{h.detail}</p>
          </ExpandCard>
        ))}
        <div className="span-2">
          <ExpandCard title="Honors" badge={`${honors.length} highlights`} accent={accentAt(4)}>
            <ul className="plain-list">
              {honors.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </ExpandCard>
        </div>
      </div>
    </>
  )
}
