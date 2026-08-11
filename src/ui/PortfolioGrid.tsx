import { useEffect, useRef, useState, useCallback } from 'react'
import type { PortfolioCategory, PortfolioItem } from '../portfolio/types'
import { paintFrame } from '../lib/lcdArt'
import { usePortfolioCategories } from '../portfolio/hooks'
import { composeEditorial, type EditorialFrame } from './editorialLayout'

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
  onExpand,
}: {
  frame: EditorialFrame
  catName: (id: string) => string
  onExpand: (item: PortfolioItem) => void
}) {
  const { item, role, offset } = frame
  const showCaption = role === 'hero' || role === 'wide' || role === 'large'

  return (
    <figure className={`frame frame--${role}${offset ? ' frame--offset' : ''}`}>
      <button
        className="frame-link"
        onClick={() => onExpand(item)}
        aria-label={`View ${item.title || 'photo'}`}
      >
        <span className="frame-media-box">
          <FrameMedia item={item} />
        </span>
      </button>
      {showCaption ? (
        <figcaption className="frame-caption">
          <span className="frame-caption-cat">{catName(item.category)}</span>
          <span>{item.year}</span>
        </figcaption>
      ) : null}
    </figure>
  )
}

function Lightbox({ item, onClose }: { item: PortfolioItem; onClose: () => void }) {
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onKey])

  const src = item.imageUrl
  if (!src) {
    return (
      <div className="lightbox" onClick={onClose} role="dialog" aria-label="Photo viewer">
        <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
          <p>No image to display.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-label={item.title || 'Photo'}>
      <button className="lightbox-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={item.title || ''} />
      </div>
    </div>
  )
}

export function PortfolioGrid({ items }: { items: PortfolioItem[] }) {
  const categories = usePortfolioCategories()
  const catName = (id: string) =>
    categories.find((c: PortfolioCategory) => c.id === id)?.name ?? id.toUpperCase()
  const [expanded, setExpanded] = useState<PortfolioItem | null>(null)

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
    <>
      <div className="editorial" role="list" aria-label="Portfolio">
        {bands.map((band, i) => (
          <div key={`${band.kind}-${i}`} className={`band band--${band.kind}`} role="listitem">
            {band.frames.map((f) => (
              <Frame key={f.item.id} frame={f} catName={catName} onExpand={setExpanded} />
            ))}
          </div>
        ))}
      </div>
      {expanded && <Lightbox item={expanded} onClose={() => setExpanded(null)} />}
    </>
  )
}
