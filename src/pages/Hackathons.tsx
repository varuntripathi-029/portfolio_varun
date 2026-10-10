import { hackathons, honors } from '../data'
import { ExpandCard, PageHead } from '../components'
import { accentAt } from '../palette'

export default function Hackathons() {
  return (
    <>
      <PageHead title="Hackathons">
        Four deadlines in 2026. One podium, three finals, and a lot of code written too fast.
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
            <a className="text-link" href={h.repo} target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
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
