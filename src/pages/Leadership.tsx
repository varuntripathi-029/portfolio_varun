import { leadership } from '../data'
import { PageHead, Timeline } from '../components'

export default function Leadership() {
  return (
    <>
      <PageHead title="Leadership">
        College work: sponsors, events and a great deal of cold outreach at IIIT Nagpur.
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
