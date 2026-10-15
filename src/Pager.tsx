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
// How far a vertical swipe must travel to count as "next" or "previous".
const SWIPE = 90
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// On a desktop the section is part of the page, so the window scrolls it and the browser's own
// rubber-band applies at the top and bottom. On a phone the section scrolls inside its screen.
const isDesktop = () => window.matchMedia('(min-width: 761px)').matches

// A section taller than the screen scrolls inside itself first (phones).
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
  const shown = useRef(0)

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

    // The window scrolls the section, so the one leaving is pinned where it was while the page
    // returns to the top for the one arriving.
    const leaving = panels.current[shown.current]
    shown.current = i
    let pinned: HTMLElement | null = null
    if (isDesktop() && window.scrollY > 0) {
      if (leaving && !instant) {
        pinned = leaving
        leaving.style.transform = `translateY(${window.scrollY}px)`
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
    const unpin = () => {
      if (pinned) pinned.style.transform = ''
    }
    if (instant || Math.abs(target - el.scrollLeft) < 1) {
      el.scrollLeft = target
      el.style.scrollSnapType = ''
      busy.current = false
      unpin()
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
        unpin()
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

  // On a desktop the track takes the height of the section on show, so the document is exactly as
  // long as that section and the window scrolls it.
  useEffect(() => {
    const el = track.current
    const panel = panels.current[active]
    if (!el || !panel) return
    const fit = () => {
      el.style.height = isDesktop() ? `${panel.offsetHeight}px` : ''
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(panel)
    window.addEventListener('resize', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [active])

  // Keep the track aligned when the window changes size.
  useEffect(() => {
    const on = () => moveTo(current.current, true)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [moveTo])

  const dragging = useRef(false)

  // Trackpad: a sideways swipe turns the page, one page per gesture. Vertical scrolling is left
  // completely alone, so the page scrolls and bounces the way the browser always does.
  useEffect(() => {
    const el = track.current
    if (!el) return
    let last = 0
    let pushed = 0
    let sideways = false

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
        // Vertical scrolling is the browser's own, so its bounce at either end is the default one.
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
      if (busy.current || e.touches.length !== 1 || isDesktop()) return
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
