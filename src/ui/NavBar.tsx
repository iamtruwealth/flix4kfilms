import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { usePortfolioCategories } from '../portfolio/hooks'
import { useScrollExperience } from '../hooks/useScrollExperience'
import { useCachedPortfolioItems } from '../portfolio/hooks'
import { useReducedMotion } from '../hooks/useReducedMotion'

/**
 * Editorial navigation. On the home page it fades in as the camera handoff
 * completes (navReveal); on every other route it is always visible.
 * PORTFOLIO expands a full-width category sub-strip (desktop hover/focus,
 * tap toggle on touch). Categories come from the content repository.
 */
export function NavBar() {
  const location = useLocation()
  const onHome = location.pathname === '/'
  const reduced = useReducedMotion()
  const scroll = useScrollExperience(useCachedPortfolioItems().length)
  const categories = usePortfolioCategories()
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  const timer = useRef<number | null>(null)

  const setOpenDebounced = useCallback((next: boolean, delay = 0) => {
    if (timer.current) window.clearTimeout(timer.current)
    if (delay) {
      timer.current = window.setTimeout(() => {
        openRef.current = next
        setOpen(next)
      }, delay)
    } else {
      openRef.current = next
      setOpen(next)
    }
  }, [])

  const visible = onHome ? reduced ? 1 : scroll.navReveal : 1

  const links = useMemo(
    () => [
      { to: '/portfolio', label: 'PORTFOLIO', sub: true },
      { to: '/videos', label: 'VIDEOS', sub: false },
      { to: '/about', label: 'ABOUT', sub: false },
      { to: '/book', label: 'BOOK ONLINE', sub: false },
    ],
    [],
  )

  return (
    <header className="nav" style={{ opacity: visible }} aria-label="Site">
      <div className="nav-inner">
        <Link to="/" className="nav-brand" aria-label="FLIX 4K — home">
          <span className="brand-mark">FLIX</span>
          <span className="brand-sub">4K</span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          {links.map((l) =>
            l.sub ? (
              <div className="nav-sub-wrap" key={l.to}>
                <button
                  type="button"
                  className="nav-link nav-link-btn"
                  aria-expanded={open}
                  aria-controls="nav-categories"
                  onClick={() => setOpenDebounced(!open)}
                  onMouseEnter={() => setOpenDebounced(true, 80)}
                  onMouseLeave={() => setOpenDebounced(false, 200)}
                >
                  PORTFOLIO
                  <span className="nav-caret" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
              >
                {l.label}
              </NavLink>
            ),
          )}
        </nav>
      </div>

      <div
        id="nav-categories"
        className={`nav-categories${open ? ' nav-categories-open' : ''}`}
        onMouseEnter={() => setOpenDebounced(true)}
        onMouseLeave={() => setOpenDebounced(false, 200)}
        hidden={!open && !reduced}
      >
        <ul className="nav-categories-list">
          {categories.map((c) => (
            <li key={c.id}>
              <NavLink
                to={`/portfolio/${c.slug}`}
                className={({ isActive }) =>
                  `nav-cat${isActive ? ' nav-cat-active' : ''}`
                }
                onClick={() => setOpenDebounced(false)}
              >
                <span className="nav-cat-name">{c.name}</span>
                <span className="nav-cat-desc">{c.description}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </header>
  )
}
