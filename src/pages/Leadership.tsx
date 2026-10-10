import { leadership } from '../data'
import { PageHead, Timeline } from '../components'

export default function Leadership() {
  return (
    <>
      <PageHead title="Leadership">
        Work done at college: sponsorships, events and campus programmes at IIIT Nagpur.
      </PageHead>
      <section className="card">
        <Timeline
          items={leadership.map((l) => ({
            title: `${l.role}, ${l.org}`,
            meta: l.period,
            lines: l.points,
          }))}
        />
      </section>
    </>
  )
}
