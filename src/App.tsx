import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react'
import { NavLink, Route, Routes, useLocation, useMatch } from 'react-router-dom'
import { profile } from './data'
import Experience from './pages/Experience'
import Projects from './pages/Projects'
import Hackathons from './pages/Hackathons'
import Blogs from './pages/Blogs'
import BlogPost from './pages/BlogPost'
import Leadership from './pages/Leadership'
import Pager, { type PagerSection } from './Pager'
import Search from './Search'
import { accentAt } from './palette'

const sections: PagerSection[] = [
  { path: '/', label: 'Experience', node: <Experience /> },
  { path: '/projects', label: 'Projects', node: <Projects /> },
  { path: '/hackathons', label: 'Hackathons', node: <Hackathons /> },
  { path: '/blogs', label: 'Blogs', node: <Blogs /> },
  { path: '/leadership', label: 'Leadership', node: <Leadership /> },
]

type Theme = 'light' | 'dark'

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function Sidebar({ onSearch }: { onSearch: () => void }) {
  const [copied, setCopied] = useState(false)
  const [theme, setTheme] = useState<Theme>(currentTheme)

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      /* storage can be blocked; the theme still applies for this visit */
    }
    setTheme(next)
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${profile.email}`
    }
  }

  return (
    <aside className="sidebar">
      <nav className="nav" aria-label="Sections">
        {sections.map((n, i) => (
          <NavLink
            key={n.path}
            to={n.path}
            end={n.path === '/'}
            className="nav-link"
            style={{ '--accent': accentAt(i) } as CSSProperties}
          >
            {n.label}
          </NavLink>
        ))}
      </nav>
      <button type="button" className="search-trigger" onClick={onSearch}>
        <span>Search</span>
        <kbd>/</kbd>
      </button>
      <div className="nav nav-links">
        <a href={profile.linkedin} target="_blank" rel="noreferrer">
          LinkedIn
        </a>
        <a href={profile.github} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href={profile.resume} target="_blank" rel="noreferrer">
          Resume
        </a>
        <button type="button" onClick={copyEmail}>
          {copied ? 'Copied' : 'Copy email'}
        </button>
      </div>
      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-pressed={theme === 'dark'}
      >
        <span className="theme-track" aria-hidden="true">
          <span className="theme-thumb" />
        </span>
        {theme === 'dark' ? 'Dark' : 'Light'}
      </button>
    </aside>
  )
}

function useRevealAndGlow() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.card:not(.hero), .banner, .page-head, .reel, .back',
      ),
    ).filter((el) => !el.hasAttribute('data-in'))
    els.forEach((el) => el.setAttribute('data-reveal', ''))

    // React owns `class`, so reveal state lives in a data attribute it never rewrites.
    const io = new IntersectionObserver(
      (entries) => {
        const entering = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top ||
              a.boundingClientRect.left - b.boundingClientRect.left,
          )
        entering.forEach((e, i) => {
          const el = e.target as HTMLElement
          el.style.setProperty('--d', `${Math.min(i, 5) * 80}ms`)
          el.setAttribute('data-in', '')
          io.unobserve(el)
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -4% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [pathname])

  useEffect(() => {
    let frame = 0
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('.card, .banner')
      if (!el) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--mx', `${e.clientX - r.left}px`)
        el.style.setProperty('--my', `${e.clientY - r.top}px`)
      })
    }
    document.addEventListener('pointermove', onMove, { passive: true })
    return () => document.removeEventListener('pointermove', onMove)
  }, [])
}

function ScrollToTop({ enabled }: { enabled: boolean }) {
  const { pathname } = useLocation()
  useEffect(() => {
    if (enabled) window.scrollTo(0, 0)
  }, [pathname, enabled])
  return null
}

export default function App() {
  const onPost = useMatch('/blogs/:slug') !== null
  const [searchOpen, setSearchOpen] = useState(false)
  useRevealAndGlow()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={`shell${onPost ? '' : ' shell--pager'}`}>
      <ScrollToTop enabled={onPost} />
      <Sidebar onSearch={() => setSearchOpen(true)} />
      <main className="main">
        <Routes>
          <Route path="/blogs/:slug" element={<BlogPost />} />
          <Route path="*" element={<Pager sections={sections} />} />
        </Routes>
      </main>
      <Search open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
