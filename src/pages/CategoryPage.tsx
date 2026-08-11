import { useParams, Link } from 'react-router-dom'
import { useItemsByCategory, usePortfolioCategories, useVideosByCategory } from '../portfolio/hooks'
import { PortfolioGrid } from '../ui/PortfolioGrid'
import { VideoEmbed } from '../ui/VideoEmbed'

/** One category of work, filtered by slug from the repository. */
export function CategoryPage() {
  const { category } = useParams<{ category: string }>()
  const categories = usePortfolioCategories()
  const items = useItemsByCategory(category ?? '')
  const videos = useVideosByCategory(category ?? '')
  const active = categories.find((c) => c.slug === category)

  if (!active) {
    return (
      <div className="page">
        <header className="page-head">
          <p className="kicker">NOT FOUND</p>
          <h1>No such category.</h1>
          <p className="page-lede">
            <Link to="/portfolio">Return to the full archive.</Link>
          </p>
        </header>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">{active.name}</p>
        <h1>{active.description}</h1>
      </header>

      <nav className="rail" aria-label="Portfolio categories">
        <Link className="rail-link" to="/portfolio">
          ALL
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            className={`rail-link${c.slug === category ? ' rail-link-active' : ''}`}
            to={`/portfolio/${c.slug}`}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      <PortfolioGrid items={items} />

      {videos.length > 0 && (
        <section className="video-section" aria-label="Videos">
          <h2 className="kicker">FILMS</h2>
          <div className="video-grid">
            {videos.map((v) => (
              <VideoEmbed
                key={v.id}
                youtubeUrl={v.youtubeUrl ?? ''}
                title={v.title}
                description={v.description}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
