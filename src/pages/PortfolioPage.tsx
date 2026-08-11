import { Link } from 'react-router-dom'
import { usePortfolioCategories, usePortfolioItems } from '../portfolio/hooks'
import { PortfolioGrid } from '../ui/PortfolioGrid'

/** Full portfolio index — every published item, with a category rail. */
export function PortfolioPage() {
  const items = usePortfolioItems()
  const categories = usePortfolioCategories()

  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">PORTFOLIO</p>
        <h1>The archive.</h1>
        <p className="page-lede">
          Every frame, shot in monochrome at 4K on a single camera. Filter by
          discipline — the grid is driven entirely by the content repository.
        </p>
      </header>

      <nav className="rail" aria-label="Portfolio categories">
        {categories.map((c) => (
          <Link key={c.id} className="rail-link" to={`/portfolio/${c.slug}`}>
            {c.name}
          </Link>
        ))}
      </nav>

      <PortfolioGrid items={items} />
    </div>
  )
}
