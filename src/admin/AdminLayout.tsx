import { NavLink, Outlet, Link } from 'react-router-dom'
import { signOutAdmin } from './auth'

/**
 * Admin shell — functional control-room layout (deliberately NOT cinematic:
 * this is a tool, not the public experience). Sidebar nav on desktop, top
 * strip on small screens; content scrolls in the main area.
 */

const NAV = [
  { to: '/admin', label: 'OVERVIEW', end: true },
  { to: '/admin/photos', label: 'PHOTOS' },
  { to: '/admin/videos', label: 'VIDEOS' },
  { to: '/admin/categories', label: 'CATEGORIES' },
  { to: '/admin/settings', label: 'SETTINGS' },
]

export function AdminLayout() {
  return (
    <div className="admin">
      <aside className="admin-side">
        <Link to="/admin" className="admin-brand">
          <span className="admin-brand-mark">FLIX 4K</span>
          <span className="admin-brand-sub">CONTROL ROOM</span>
        </Link>

        <nav className="admin-nav" aria-label="Admin">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-link${isActive ? ' admin-nav-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-side-foot">
          <Link to="/" className="admin-nav-link admin-nav-link-muted">
            VIEW SITE
          </Link>
          <button type="button" className="admin-nav-link admin-logout" onClick={() => void signOutAdmin()}>
            LOG OUT
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
