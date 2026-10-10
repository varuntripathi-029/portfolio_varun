import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { profile } from './data'
import Experience from './pages/Experience'
import Projects from './pages/Projects'
import Hackathons from './pages/Hackathons'
import Blogs from './pages/Blogs'
import BlogPost from './pages/BlogPost'
import Leadership from './pages/Leadership'
import { accentAt } from './palette'

const sections = [
  { to: '/', label: 'Experience' },
  { to: '/projects', label: 'Projects' },
  { to: '/hackathons', label: 'Hackathons' },
  { to: '/blogs', label: 'Blogs' },
  { to: '/leadership', label: 'Leadership' },
]

type Theme = 'light' | 'dark'

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function Sidebar() {
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
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            viewTransition
            className="nav-link"
            style={{ '--accent': accentAt(i) } as CSSProperties}
          >
            {n.label}
          </NavLink>
        ))}
      </nav>
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
      document.querySelectorAll<HTMLElement>('.card:not(.hero), .banner, .page-head, .reel, .back'),
    )
    els.forEach((el) => el.setAttribute('data-reveal', ''))
    const io = new IntersectionObserver(
      (entries) => {
        const entering = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
        entering.forEach((e, i) => {
          const el = e.target as HTMLElement
          el.style.setProperty('--d', `${Math.min(i, 5) * 80}ms`)
          el.classList.add('is-in')
          io.unobserve(el)
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
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

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const location = useLocation()
  useRevealAndGlow()
  return (
    <div className="shell">
      <ScrollToTop />
      <Sidebar />
      <main className="main">
        <div className="page" key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Experience />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/hackathons" element={<Hackathons />} />
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/blogs/:slug" element={<BlogPost />} />
          <Route path="/leadership" element={<Leadership />} />
          <Route path="*" element={<Experience />} />
        </Routes>
        </div>
      </main>
    </div>
  )
}
