import { hackathons, honors } from '../data'
import { ExpandBanner, PageHead } from '../components'
import Masonry from '../Masonry'
import { accentAt } from '../palette'

// Podium first, then the finals in the order of the calendar.
const COLORS = ['var(--c-vermilion)', 'var(--c-blue)', 'var(--c-teal)', 'var(--c-ochre)']

// Who ran the event: their mark, their name, and when it happened.
function OrgBadge({ logo, org, foot }: { logo?: string; org: string; foot: string }) {
  return (
    <div className="org-badge">
      {logo && <img src={logo} alt="" width={44} height={44} />}
      <div>
        <p className="org-name">{org}</p>
        <p className="org-foot">{foot}</p>
      </div>
    </div>
  )
}

export default function Hackathons() {
  return (
    <>
      <PageHead title="Hackathons">
        Four deadlines in 2026. One podium, three finals, and a lot of code written too fast.
      </PageHead>

      <Masonry className="tiles-3 hack">
        {hackathons.map((h, i) => (
          <ExpandBanner
            key={h.title}
            color={COLORS[i % COLORS.length]}
            chips={[h.result, h.when]}
            title={h.title}
            teaser={h.line}
            art={<OrgBadge logo={h.logo} org={h.org} foot={h.event} />}
          >
            <p className="banner-summary">{h.detail}</p>
            <div className="actions">
              <a className="ghost-btn" href={h.repo} target="_blank" rel="noreferrer">
                GitHub ↗
              </a>
            </div>
          </ExpandBanner>
        ))}
        <ExpandBanner
          color={accentAt(4)}
          chips={['Honors']}
          title="Honors"
          teaser={`${honors.length} highlights beyond the hackathons`}
        >
          <ul className="plain-list banner-list">
            {honors.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </ExpandBanner>
      </Masonry>
    </>
  )
}
