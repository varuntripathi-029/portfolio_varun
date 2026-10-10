import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export type PagerSection = { path: string; label: string; node: ReactNode }

// Long enough to read as a glide, short enough that it never feels like waiting.
const DURATION = 780
const COOLDOWN = 220
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function useMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)')
    const on = () => setMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return mobile
}

export default function Pager({ sections }: { sections: PagerSection[] }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const mobile = useMobile()

  const track = useRef<HTMLDivElement>(null)
  const panels = useRef<(HTMLElement | null)[]>([])
  const frame = useRef(0)
  const busy = useRef(false)
  const gestureEdge = useRef(false)

  const indexOfPath = useCallback(
    (p: string) => Math.max(0, sections.findIndex((s) => s.path === p)),
    [sections],
  )
  const urlIndex = indexOfPath(pathname)
  const current = useRef(urlIndex)
  const [active, setActive] = useState(urlIndex)

  const go = useCallback(
    (i: number) => {
      const next = Math.min(Math.max(i, 0), sections.length - 1)
      gestureEdge.current = false
      if (sections[next].path !== window.location.pathname) {
        navigate(sections[next].path, { replace: true })
      }
    },
    [navigate, sections],
  )

  // Move the track so section `i` is in view. `instant` is used for first paint and resize.
  const moveTo = useCallback((i: number, instant: boolean) => {
    const el = track.current
    if (!el) return
    cancelAnimationFrame(frame.current)
    const target = i * el.clientWidth
    if (instant || Math.abs(target - el.scrollLeft) < 1) {
      el.scrollLeft = target
      busy.current = false
      return
    }
    const from = el.scrollLeft
    const start = performance.now()
    busy.current = true
    el.style.scrollSnapType = 'none'
    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION, 1)
      el.scrollLeft = from + (target - from) * easeInOut(t)
      if (t < 1) {
        frame.current = requestAnimationFrame(tick)
      } else {
        el.scrollLeft = target
        el.style.scrollSnapType = ''
        window.setTimeout(() => {
          busy.current = false
        }, COOLDOWN)
      }
    }
    frame.current = requestAnimationFrame(tick)
  }, [])

  // URL is the single source of truth: any path change slides the track.
  useLayoutEffect(() => {
    const first = current.current === urlIndex && track.current && track.current.scrollLeft === 0
    setActive(urlIndex)
    if (mobile) {
      current.current = urlIndex
      return
    }
    if (current.current !== urlIndex || first) {
      const instant = first
      current.current = urlIndex
      moveTo(urlIndex, instant || !track.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlIndex, mobile])

  useEffect(() => {
    if (!mobile) return
    panels.current[urlIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [urlIndex, mobile])

  // Keep the track aligned when the window changes size.
  useEffect(() => {
    if (mobile) return
    const on = () => moveTo(current.current, true)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [mobile, moveTo])

  // Scroll wheel: scroll inside a section first, then glide to the next one.
  useEffect(() => {
    const el = track.current
    if (!el || mobile) return
    let last = 0

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return
      const now = performance.now()
      const fresh = now - last > 160
      last = now

      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY)
      const d = horizontal ? e.deltaX : e.deltaY
      if (Math.abs(d) < 2) return
      const dir = d > 0 ? 1 : -1

      if (busy.current) {
        e.preventDefault()
        return
      }

      if (!horizontal) {
        const panel = panels.current[current.current]
        if (panel) {
          const atEdge =
            dir > 0
              ? panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 2
              : panel.scrollTop <= 1
          if (fresh) gestureEdge.current = atEdge
          if (!atEdge) return
        }
      } else if (fresh) {
        gestureEdge.current = true
      }

      e.preventDefault()
      if (!gestureEdge.current) return
      go(current.current + dir)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [mobile, go])

  // Touch and trackpad swipes scroll the track natively; sync the URL when they settle.
  useEffect(() => {
    const el = track.current
    if (!el || mobile) return
    let timer = 0
    const onScroll = () => {
      if (busy.current) return
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const i = Math.round(el.scrollLeft / el.clientWidth)
        if (i !== current.current && i >= 0 && i < sections.length) {
          current.current = i
          go(i)
        }
      }, 110)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.clearTimeout(timer)
      el.removeEventListener('scroll', onScroll)
    }
  }, [mobile, go, sections.length])

  useEffect(() => {
    if (mobile) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      const t = e.target as HTMLElement | null
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
      if (busy.current) return
      go(current.current + (e.key === 'ArrowRight' ? 1 : -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobile, go])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  return (
    <div className="pager-wrap">
      <div className="pager" ref={track}>
        {sections.map((s, i) => (
          <section
            key={s.path}
            ref={(el) => {
              panels.current[i] = el
            }}
            className="pager-panel"
            aria-label={s.label}
            aria-hidden={!mobile && i !== active ? true : undefined}
          >
            {s.node}
          </section>
        ))}
      </div>
      <div className="pager-dots" role="tablist" aria-label="Sections">
        {sections.map((s, i) => (
          <button
            key={s.path}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={s.label}
            className={`dot${i === active ? ' is-active' : ''}`}
            onClick={() => navigate(s.path)}
          />
        ))}
      </div>
    </div>
  )
}
