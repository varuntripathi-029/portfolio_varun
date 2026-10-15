import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export type PagerSection = { path: string; label: string; node: ReactNode }

// Long enough to read as a glide, short enough that it never feels like waiting.
const DURATION = 720
// After a glide lands, the next one is held off for this long so a quick second swipe cannot
// chain straight into another section.
const COOLDOWN = 500
// How far a sideways trackpad swipe must travel before it counts as a page turn.
const SIDE_PUSH = 70
// A mouse drag turns the page past this share of the width, or when it is thrown fast enough
// (pixels per millisecond).
const DRAG_SHARE = 0.14
const DRAG_FLING = 0.6
// Elastic stretch past the top or bottom of a section: the furthest it can be pulled (px), how
// much of the scroll it follows, and how long after the last scroll it springs back.
const STRETCH_MAX = 24
const STRETCH_PULL = 0.5
const STRETCH_IDLE = 30
// How far a vertical swipe must travel to count as "next" or "previous".
const SWIPE = 90
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
      const arriving = panels.current[next]
      if (arriving && next !== current.current) arriving.scrollTop = 0
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
      el.style.scrollSnapType = ''
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

  const dragging = useRef(false)

  // Trackpad: a sideways swipe turns the page, one page per gesture. Vertical scrolling is left
  // alone, so it only ever moves inside the section.
  useEffect(() => {
    const el = track.current
    if (!el) return
    let last = 0
    let pushed = 0
    let sideways = false
    let stretch = 0
    let stretched: HTMLElement | null = null
    let release = 0

    const spring = () => {
      const p = stretched
      stretched = null
      stretch = 0
      if (!p) return
      p.style.transition = 'transform 0.07s cubic-bezier(0.2, 0.8, 0.3, 1)'
      p.style.transform = ''
      window.setTimeout(() => {
        if (p.style.transform === '') p.style.transition = ''
      }, 110)
    }

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return
      const now = performance.now()
      if (now - last > 160) {
        // a new gesture: decide its axis once, so a slightly diagonal swipe does not switch mid-way
        consumed.current = false
        pushed = 0
        sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY)
      }
      last = now
      if (!sideways) {
        // Vertical: scroll inside the section; past its top or bottom, stretch like rubber.
        const panel = panels.current[current.current]
        if (!panel || busy.current) return
        const dy = e.deltaY
        const atEdge = dy < 0 ? atTop(panel) : atBottom(panel)
        const relaxing = stretch !== 0 && Math.sign(stretch) === -Math.sign(dy) * -1
        if (!atEdge && stretch === 0) return
        e.preventDefault()
        if (stretched && stretched !== panel) spring()
        stretched = panel
        if (atEdge && !relaxing) {
          stretch -= dy * STRETCH_PULL * (1 - Math.min(Math.abs(stretch) / STRETCH_MAX, 1))
        } else {
          // scrolling back the other way eases the stretch off before real scrolling resumes
          stretch -= dy
          if (Math.sign(stretch) !== Math.sign(stretch + dy)) stretch = 0
        }
        stretch = Math.max(-STRETCH_MAX, Math.min(STRETCH_MAX, stretch))
        panel.style.transition = 'none'
        panel.style.transform = `translate3d(0, ${stretch}px, 0)`
        window.clearTimeout(release)
        release = window.setTimeout(spring, STRETCH_IDLE)
        return
      }

      e.preventDefault()
      if (busy.current || consumed.current) return
      pushed += e.deltaX
      if (Math.abs(pushed) >= SIDE_PUSH) {
        const dir = pushed > 0 ? 1 : -1
        pushed = 0
        go(current.current + dir)
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.clearTimeout(release)
      el.removeEventListener('wheel', onWheel)
    }
  }, [go])

  // Mouse: press, drag sideways and let go. The page follows the pointer, then settles on the
  // nearest section, or the next one if it was pulled far or thrown.
  useEffect(() => {
    const el = track.current
    if (!el) return
    let id = -1
    let sx = 0
    let sy = 0
    let from = 0
    let armed = false
    let moved = false
    let lastX = 0
    let lastT = 0
    let vx = 0
    let swallow = false

    const settle = (dx: number, fling: number) => {
      const far = Math.abs(dx) > el.clientWidth * DRAG_SHARE || (Math.abs(dx) > 60 && Math.abs(fling) > DRAG_FLING)
      const step = far ? (dx < 0 ? 1 : -1) : 0
      const target = Math.min(Math.max(current.current + step, 0), sections.length - 1)
      dragging.current = false
      el.classList.remove('is-dragging')
      if (target !== current.current) go(target)
      else moveTo(current.current, false)
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.button !== 0 || busy.current) return
      id = e.pointerId
      sx = e.clientX
      sy = e.clientY
      from = el.scrollLeft
      lastX = sx
      lastT = e.timeStamp
      vx = 0
      armed = true
      moved = false
    }

    const onMove = (e: PointerEvent) => {
      if (!armed || e.pointerId !== id) return
      const dx = e.clientX - sx
      if (!moved) {
        const dy = e.clientY - sy
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) armed = false
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return
        moved = true
        dragging.current = true
        cancelAnimationFrame(frame.current)
        el.style.scrollSnapType = 'none'
        el.classList.add('is-dragging')
        window.getSelection()?.removeAllRanges()
        try {
          el.setPointerCapture(id)
        } catch {
          /* the pointer may already be gone */
        }
      }
      el.scrollLeft = from - dx
      const dt = e.timeStamp - lastT
      if (dt > 0) vx = 0.7 * vx + 0.3 * ((e.clientX - lastX) / dt)
      lastX = e.clientX
      lastT = e.timeStamp
    }

    const onUp = (e: PointerEvent) => {
      if (!armed || e.pointerId !== id) return
      armed = false
      if (!moved) return
      try {
        el.releasePointerCapture(id)
      } catch {
        /* already released */
      }
      // a drag must not also count as a click on whatever is under the pointer
      swallow = true
      window.setTimeout(() => (swallow = false), 60)
      // a fling points the way the pointer was moving at release; the pull decides otherwise
      settle(e.clientX - sx, -vx)
    }

    const onCancel = (e: PointerEvent) => {
      if (!armed || e.pointerId !== id) return
      armed = false
      if (moved) settle(0, 0)
    }

    const onClick = (e: MouseEvent) => {
      if (!swallow) return
      e.preventDefault()
      e.stopPropagation()
    }
    const onSelect = (e: Event) => {
      if (moved && armed) e.preventDefault()
    }
    const onDragStart = (e: Event) => e.preventDefault()

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onCancel)
    el.addEventListener('click', onClick, true)
    el.addEventListener('selectstart', onSelect)
    el.addEventListener('dragstart', onDragStart)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onCancel)
      el.removeEventListener('click', onClick, true)
      el.removeEventListener('selectstart', onSelect)
      el.removeEventListener('dragstart', onDragStart)
    }
  }, [go, moveTo, sections.length])

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
      if (busy.current || dragging.current) return
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
