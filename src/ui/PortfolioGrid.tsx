import { useEffect, useRef } from 'react'
import type { PortfolioCategory, PortfolioItem } from '../portfolio/types'
import { paintFrame } from '../lib/lcdArt'
import { usePortfolioCategories } from '../portfolio/hooks'
import { composeEditorial, type EditorialFrame } from './editorialLayout'

/**
 * Data-driven editorial portfolio gallery.
 *
 * Items come from the repository via props (never fetched here). The layout
 * is composed by the pure editorial engine — asymmetric art-directed bands
 * with hero / large / standard / portrait / wide roles and whitespace — not
 * a CSS-columns masonry. Tiles are deliberately name-free: photo titles only
 * live in alt text so they never appear on screen.
 */
function FrameMedia({ item }: { item: PortfolioItem }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || item.imageUrl) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = canvas.clientWidth * dpr
    canvas.height = canvas.clientHeight * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    paintFrame(ctx, canvas.width, canvas.height, item)
  }, [item])

  if (item.imageUrl) {
    return (
      <img
        className="frame-media"
        src={item.imageUrl}
        alt={item.title || ''}
        loading="lazy"
        decoding="async"
      />
    )
  }
  return <canvas ref={ref} className="frame-media" aria-hidden="true" />
}

function Frame({
  frame,
  catName,
}: {
  frame: EditorialFrame
  catName: (id: string) => string
}) {
  const { item, role, offset } = frame
  const showCaption = role === 'hero' || role === 'wide' || role === 'large'

  return (
    <figure className={`frame frame--${role}${offset ? ' frame--offset' : ''}`}>
      <a className="frame-link" href="#/portfolio" tabIndex={-1} aria-hidden="true">
        <span className="frame-media-box">
          <FrameMedia item={item} />
        </span>
      </a>
      {showCaption ? (
        <figcaption className="frame-caption">
          <span className="frame-caption-cat">{catName(item.category)}</span>
          <span>{item.year}</span>
        </figcaption>
      ) : null}
    </figure>
  )
}

export function PortfolioGrid({ items }: { items: PortfolioItem[] }) {
  const categories = usePortfolioCategories()
  const catName = (id: string) =>
    categories.find((c: PortfolioCategory) => c.id === id)?.name ?? id.toUpperCase()

  if (items.length === 0) {
    return (
      <div className="editorial-empty">
        <p className="kicker">PORTFOLIO</p>
        <p>Nothing here yet — the first frames arrive in a later phase.</p>
      </div>
    )
  }

  const bands = composeEditorial(items)

  return (
    <div className="editorial" role="list" aria-label="Portfolio">
      {bands.map((band, i) => (
        <div key={`${band.kind}-${i}`} className={`band band--${band.kind}`} role="listitem">
          {band.frames.map((f) => (
            <Frame key={f.item.id} frame={f} catName={catName} />
          ))}
        </div>
      ))}
    </div>
  )
}
