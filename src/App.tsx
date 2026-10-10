import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { profile } from './data'
import Experience from './pages/Experience'
import Projects from './pages/Projects'
import Hackathons from './pages/Hackathons'
import Blogs from './pages/Blogs'
import BlogPost from './pages/BlogPost'
import Leadership from './pages/Leadership'

function Sidebar() {
  const [copied, setCopied] = useState(false)

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
  return (
    <div className="shell">
      <ScrollToTop />
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Experience />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/hackathons" element={<Hackathons />} />
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/blogs/:slug" element={<BlogPost />} />
          <Route path="/leadership" element={<Leadership />} />
          <Route path="*" element={<Experience />} />
        </Routes>
      </main>
    </div>
  )
}
