import { hackathons, honors } from '../data'
import { ExpandBanner, PageHead } from '../components'
import Masonry from '../Masonry'
import { accentAt } from '../palette'

const SPANS = [3, 3, 3, 3, 6]
// Podium first, then the finals in the order of the calendar.
const COLORS = ['var(--c-vermilion)', 'var(--c-blue)', 'var(--c-teal)', 'var(--c-ochre)']

type PassProps = { logo?: string; org: string; value: string; label: string; foot: string }

// A boarding-pass style card: who ran it, the number worth remembering, and the result.
function Pass({ logo, org, value, label, foot }: PassProps) {
  return (
    <div className="pass">
      <div className="pass-head">
        {logo && <img src={logo} alt="" width={30} height={30} />}
        <span>{org}</span>
      </div>
      <p className="pass-value">{value}</p>
      <p className="pass-label">{label}</p>
      <p className="pass-foot">{foot}</p>
    </div>
  )
}

export default function Hackathons() {
  const podium = hackathons.filter((h) => h.result.toLowerCase().includes('runner')).length
  const finals = hackathons.length - podium

  return (
    <>
      <PageHead title="Hackathons">
        Four deadlines in 2026. One podium, three finals, and a lot of code written too fast.
      </PageHead>

      <ul className="hack-strip" aria-label="Summary">
        <li>
          <b>{hackathons.length}</b>
          <span>hackathons</span>
        </li>
        <li>
          <b>{podium}</b>
          <span>podium</span>
        </li>
        <li>
          <b>{finals}</b>
          <span>finals</span>
        </li>
        <li>
          <b>Jun–Aug</b>
          <span>2026</span>
        </li>
      </ul>

      <Masonry spans={SPANS} className="hack">
        {hackathons.map((h, i) => (
          <ExpandBanner
            key={h.title}
            color={COLORS[i % COLORS.length]}
            chips={[h.result, h.when]}
            title={h.title}
            teaser={h.line}
            art={<Pass logo={h.logo} org={h.org} value={h.stat.value} label={h.stat.label} foot={`${h.event} · ${h.when}`} />}
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
          art={<Pass org="Competitive programming" value="1886" label="LeetCode Knight rating, 300+ problems solved" foot="and counting" />}
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
