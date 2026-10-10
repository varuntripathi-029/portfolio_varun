import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { profile } from './data'
import Experience from './pages/Experience'
import Projects from './pages/Projects'
import Hackathons from './pages/Hackathons'
import Blogs from './pages/Blogs'
import BlogPost from './pages/BlogPost'
import Leadership from './pages/Leadership'

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
        <NavLink to="/" end className="nav-link">
          Experience
        </NavLink>
        <NavLink to="/projects" className="nav-link">
          Projects
        </NavLink>
        <NavLink to="/hackathons" className="nav-link">
          Hackathons
        </NavLink>
        <NavLink to="/blogs" className="nav-link">
          Blogs
        </NavLink>
        <NavLink to="/leadership" className="nav-link">
          Leadership
        </NavLink>
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

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const location = useLocation()
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
