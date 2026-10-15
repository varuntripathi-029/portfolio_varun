// Lets a search result land on the exact card it came from: the matching card opens, scrolls
// into view and flashes once. Cards and timeline entries carry `data-focus` with a key that is
// the slug of their title; scripts/build-index.mjs computes the same slugs for the index.

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const FOUND = 'is-found'

function scrollTo(el: HTMLElement) {
  const panel = el.closest<HTMLElement>('.pager-panel')
  // a phone scrolls the section inside its screen; a desktop scrolls the whole page
  if (panel && panel.scrollHeight - panel.clientHeight > 2) {
    const top = panel.scrollTop + el.getBoundingClientRect().top - panel.getBoundingClientRect().top - 24
    panel.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  } else {
    // a write-up is a normal page: the window scrolls
    window.scrollTo({ top: Math.max(0, window.scrollY + el.getBoundingClientRect().top - 24), behavior: 'smooth' })
  }
}

/** Open, reveal and flash the element for `key`. Retries while the page is still arriving. */
export function focusTarget(key: string, tries = 0) {
  if (!key) return
  if (key === 'top') {
    // the page itself, from its beginning
    document.querySelectorAll<HTMLElement>('.pager-panel').forEach((p) => p.scrollTo({ top: 0, behavior: 'smooth' }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  // every section stays mounted, so the same title can exist twice: prefer the one on screen
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-focus="${key}"]`))
  const el = all.find((n) => n.closest('.pager-panel')?.getAttribute('aria-hidden') !== 'true') ?? null
  if (!el) {
    if (tries < 25) window.setTimeout(() => focusTarget(key, tries + 1), 100)
    return
  }
  window.dispatchEvent(new CustomEvent('focus-open', { detail: key }))
  // aim at once, then correct after the card has finished opening and the grid has settled
  window.setTimeout(() => scrollTo(el), 80)
  window.setTimeout(() => {
    const panel = el.closest<HTMLElement>('.pager-panel')
    const inner = !!panel && panel.scrollHeight - panel.clientHeight > 2
    const from = inner ? panel!.getBoundingClientRect().top : 0
    if (Math.abs(el.getBoundingClientRect().top - from - 24) > 40) scrollTo(el)
  }, 900)
  el.classList.remove(FOUND)
  void el.offsetWidth
  el.classList.add(FOUND)
  window.setTimeout(() => el.classList.remove(FOUND), 2200)
}
