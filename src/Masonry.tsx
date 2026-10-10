import { Children, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

type Props = {
  /** Width of each child in grid units, in order. */
  spans: number[]
  /** Optional narrower width an item may fall back to when that packs the grid without a hole. */
  alt?: (number | undefined)[]
  /** Number of grid units across (default 6, so spans of 2 and 3 make three or two columns). */
  units?: number
  className?: string
  children: ReactNode
}

// Below this width everything stacks in a single column.
const NARROW = '(max-width: 1000px)'
// A later column must be at least this much higher to win a slot, so collapsed tiles keep their
// designed order instead of reshuffling over a few pixels of difference.
const PREFER_EARLIER = 48

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches)
  useLayoutEffect(() => {
    const mq = window.matchMedia(NARROW)
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

/**
 * Packs its children into the shortest available slots, so when a card grows the cards around it
 * close the gap instead of leaving empty space or being pushed down a whole row.
 *
 * Positions are recomputed from live heights every frame the content changes, so neighbours follow
 * an expanding card smoothly. When a card changes column (a discrete jump) it glides there.
 * Collapsing reverses all of it. Use it for any group of expandable cards.
 */
export default function Masonry({ spans, alt, units = 6, className = '', children }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const slots = useRef<(HTMLDivElement | null)[]>([])
  const last = useRef<{ x: number; y: number }[]>([])
  const narrow = useNarrow()
  const items = Children.toArray(children)

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')

    const layout = () => {
      const W = el.clientWidth
      if (!W) return
      const root = getComputedStyle(document.documentElement)
      const gap = parseFloat(getComputedStyle(el).getPropertyValue('--gutter')) || parseFloat(root.getPropertyValue('--gutter')) || 24
      const U = narrow ? 1 : units
      const unit = (W - (U - 1) * gap) / U
      const skyline = new Array<number>(U).fill(0)
      const dur = parseFloat(root.getPropertyValue('--expand-dur')) * 1000 || 710
      const easing = root.getPropertyValue('--ease-expand').trim() || 'ease'

      slots.current.forEach((slot, i) => {
        if (!slot) return
        const preferred = narrow ? 1 : Math.min(spans[i] ?? 1, U)
        const fallback = narrow ? undefined : alt?.[i]
        const widths = fallback && fallback < preferred ? [preferred, fallback] : [preferred]

        // Every aligned slot at every allowed width; take the leftmost one that is about as high
        // as the best, preferring the wider width. The width settles first so heights are real.
        const cands: { x: number; span: number; y: number }[] = []
        let minY = Infinity
        for (const span of widths) {
          for (let x = 0; x + span <= U; x += span) {
            let y = 0
            for (let k = x; k < x + span; k++) y = Math.max(y, skyline[k])
            cands.push({ x, span, y })
            minY = Math.min(minY, y)
          }
        }
        const near = cands.filter((c) => c.y <= minY + PREFER_EARLIER).sort((p, q) => p.x - q.x || q.span - p.span)
        const pick = near[0]
        const span = pick.span
        const bx = pick.x
        const by = pick.y

        const width = span * unit + (span - 1) * gap
        slot.style.width = `${width}px`
        slot.dataset.span = String(span)
        const h = slot.offsetHeight
        const px = bx * (unit + gap)
        for (let k = bx; k < bx + span; k++) skyline[k] = by + h + gap

        slot.style.transform = `translate(${px}px, ${by}px)`

        const prev = last.current[i]
        if (prev && Math.abs(prev.x - px) > 1 && !reduce.matches) {
          const inner = slot.firstElementChild as HTMLElement | null
          inner?.animate(
            [{ transform: `translate(${prev.x - px}px, ${prev.y - by}px)` }, { transform: 'translate(0, 0)' }],
            { duration: dur, easing },
          )
        }
        last.current[i] = { x: px, y: by }
      })

      el.style.height = `${Math.max(0, Math.max(...skyline) - gap)}px`
    }

    layout()
    const ro = new ResizeObserver(layout)
    ro.observe(el)
    slots.current.forEach((s) => s && ro.observe(s))
    return () => ro.disconnect()
  }, [narrow, spans, alt, units, items.length])

  return (
    <div ref={box} className={`mason ${className}`.trim()}>
      {items.map((child, i) => (
        <div
          key={i}
          className="mason-item"
          data-span={spans[i] ?? 1}
          ref={(node) => {
            slots.current[i] = node
          }}
        >
          <div className="mason-inner">{child}</div>
        </div>
      ))}
    </div>
  )
}
