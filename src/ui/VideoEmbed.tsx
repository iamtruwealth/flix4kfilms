import { useState } from 'react'

function youtubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  )
  return m?.[1] ?? null
}

export interface VideoEmbedProps {
  youtubeUrl: string
  title: string
  description?: string
}

/**
 * Lazy YouTube embed. Shows a placeholder thumbnail until the user clicks
 * play — avoids loading the full iframe on mount. Falls back gracefully
 * when the URL is not a valid YouTube URL.
 */
export function VideoEmbed({ youtubeUrl, title, description }: VideoEmbedProps) {
  const [playing, setPlaying] = useState(false)
  const id = youtubeId(youtubeUrl)

  if (!id) {
    return (
      <div className="video-embed video-embed--error" role="alert">
        <p>Video unavailable — invalid YouTube URL.</p>
      </div>
    )
  }

  if (!playing) {
    return (
      <button
        className="video-embed video-embed--placeholder"
        onClick={() => setPlaying(true)}
        aria-label={`Play ${title}`}
      >
        <img
          src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          decoding="async"
        />
        <span className="video-embed__play" aria-hidden="true">▶</span>
        <span className="video-embed__title">{title}</span>
        {description && <span className="video-embed__desc">{description}</span>}
      </button>
    )
  }

  return (
    <div className="video-embed">
      <iframe
        src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
      {description && <p className="video-embed__desc">{description}</p>}
    </div>
  )
}
