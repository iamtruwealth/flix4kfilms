import { Link } from 'react-router-dom'
import { usePortfolioCategories } from '../portfolio/hooks'

/** Editorial site footer — the same data-driven category list as the nav. */
export function SiteFooter() {
  const categories = usePortfolioCategories()
  const year = new Date().getFullYear()

  return (
    <footer className="site-foot">
      <div className="site-foot-inner">
        <div className="site-foot-brand">
          <p className="site-foot-logo">
            <span className="brand-mark">FLIX</span>
            <span className="brand-sub">4K</span>
          </p>
          <p className="site-foot-tag">Monochrome. Editorial. Film, not pixels.</p>
        </div>

        <nav className="site-foot-cols" aria-label="Footer">
          <ul className="site-foot-col">
            <li className="site-foot-heading">PORTFOLIO</li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link to={`/portfolio/${c.slug}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
          <ul className="site-foot-col">
            <li className="site-foot-heading">SITE</li>
            <li><Link to="/portfolio">All work</Link></li>
            <li><Link to="/videos">Videos</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/book">Book online</Link></li>
            <li><Link to="/admin">Admin</Link></li>
          </ul>
        </nav>
      </div>

      <div className="site-foot-base">
        <p>© {year} FLIX 4K. All rights reserved.</p>
        <p className="site-foot-mono">MONOCHROME · 4K · FILM</p>
      </div>
    </footer>
  )
}
