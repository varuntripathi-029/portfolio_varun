import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export type PagerSection = { path: string; label: string; node: ReactNode }

// Long enough to read as a glide, short enough that it never feels like waiting.
const DURATION = 780
const COOLDOWN = 220
// How much further a wheel or trackpad must scroll past the end of a tall section to move on.
const OVERSCROLL = 110
// How far a vertical swipe must travel to count as "next" or "previous".
const SWIPE = 56
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// A section taller than the screen scrolls inside itself first.
const overflows = (panel: HTMLElement | null | undefined) => !!panel && panel.scrollHeight - panel.clientHeight > 40
const atBottom = (p: HTMLElement) => p.scrollTop + p.clientHeight >= p.scrollHeight - 2
const atTop = (p: HTMLElement) => p.scrollTop <= 1

export default function Pager({ sections }: { sections: PagerSection[] }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const track = useRef<HTMLDivElement>(null)
  const panels = useRef<(HTMLElement | null)[]>([])
  const frame = useRef(0)
  const busy = useRef(false)
  const consumed = useRef(false)

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
      consumed.current = true
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
    if (current.current !== urlIndex || first) {
      current.current = urlIndex
      moveTo(urlIndex, !!first || !track.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlIndex])

  // Keep the track aligned when the window changes size.
  useEffect(() => {
    const on = () => moveTo(current.current, true)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [moveTo])

  // Mouse wheel and trackpad: every vertical scroll ends in a move to the next section.
  // A section that fits the screen moves on at once; a taller one scrolls inside itself, and
  // once its end is reached a little more scrolling in the same direction moves on.
  useEffect(() => {
    const el = track.current
    if (!el) return
    let last = 0
    let pushed = 0
    let lastPush = 0

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return
      const now = performance.now()
      if (now - last > 160) consumed.current = false
      last = now

      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY)
      const d = horizontal ? e.deltaX : e.deltaY
      if (Math.abs(d) < 2) return
      const dir = d > 0 ? 1 : -1

      if (busy.current) {
        e.preventDefault()
        return
      }

      const panel = panels.current[current.current]
      if (!horizontal && panel && overflows(panel)) {
        const edge = dir > 0 ? atBottom(panel) : atTop(panel)
        if (!edge) {
          pushed = 0
          return
        }
        e.preventDefault()
        if (now - lastPush > 450 || Math.sign(pushed) !== dir) pushed = 0
        lastPush = now
        pushed += d
        if (Math.abs(pushed) >= OVERSCROLL && !consumed.current) {
          pushed = 0
          go(current.current + dir)
        }
        return
      }

      e.preventDefault()
      if (consumed.current) return
      go(current.current + dir)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [go])

  // Touch: a vertical swipe moves between sections. A tall section scrolls first, and a swipe
  // that starts at its end moves on. Horizontal swipes pan the track natively and snap.
  useEffect(() => {
    const el = track.current
    if (!el) return
    let sx = 0
    let sy = 0
    let canNext = false
    let canPrev = false
    let tracking = false

    const onStart = (e: TouchEvent) => {
      tracking = false
      if (busy.current || e.touches.length !== 1) return
      const panel = panels.current[current.current]
      const tall = overflows(panel)
      canNext = !tall || (!!panel && atBottom(panel))
      canPrev = !tall || (!!panel && atTop(panel))
      sx = e.touches[0].clientX
      sy = e.touches[0].clientY
      tracking = true
    }

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return
      tracking = false
      const t = e.changedTouches[0]
      const dx = t.clientX - sx
      const dy = t.clientY - sy
      if (Math.abs(dy) < SWIPE || Math.abs(dy) < Math.abs(dx) * 1.3 || busy.current) return
      if (dy < 0 && canNext) go(current.current + 1)
      else if (dy > 0 && canPrev) go(current.current - 1)
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchend', onEnd)
    }
  }, [go])

  // Horizontal swipes and trackpad pans scroll the track natively; sync the URL when they settle.
  useEffect(() => {
    const el = track.current
    if (!el) return
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
  }, [go, sections.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[data-overlay]')) return
      const t = e.target as HTMLElement | null
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
      if (busy.current) return
      let step = 0
      if (e.key === 'ArrowRight') step = 1
      else if (e.key === 'ArrowLeft') step = -1
      else if (['ArrowDown', 'PageDown', ' '].includes(e.key) || ['ArrowUp', 'PageUp'].includes(e.key)) {
        const panel = panels.current[current.current]
        if (overflows(panel)) return
        step = ['ArrowDown', 'PageDown', ' '].includes(e.key) ? 1 : -1
        e.preventDefault()
      }
      if (step) go(current.current + step)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

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
            aria-hidden={i !== active ? true : undefined}
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
