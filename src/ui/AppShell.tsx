import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { NavBar } from './NavBar'
import { SiteFooter } from './SiteFooter'

/** Scroll to top on every route change. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/**
 * Site shell: skip link, fixed nav, routed content, footer. The home page
 * owns the fixed cinematic stage; every other page is a normal document flow
 * inside <main>. `ScrollToTop` resets scroll so deep links start at the top.
 */
export function AppShell() {
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ScrollToTop />
      <NavBar />
      <main id="main" className="site-main">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
