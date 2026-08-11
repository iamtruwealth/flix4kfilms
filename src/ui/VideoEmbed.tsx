import { useState, type SyntheticEvent } from 'react'

function youtubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  )
  return m?.[1] ?? null
}

export interface VideoEmbedProps {
  youtubeUrl: string | null
  videoUrl: string | null
  title: string
  description?: string
}

export function VideoEmbed({ youtubeUrl, videoUrl, title, description }: VideoEmbedProps) {
  const ytId = youtubeUrl ? youtubeId(youtubeUrl) : null
  const source: 'youtube' | 'upload' | null = ytId ? 'youtube' : videoUrl ? 'upload' : null

  if (!source) {
    return (
      <div className="video-embed video-embed--error" role="alert">
        <p>No video source — missing URL.</p>
      </div>
    )
  }

  if (source === 'youtube') {
    return <YoutubeEmbed ytId={ytId!} title={title} description={description} />
  }

  return <UploadedVideo url={videoUrl!} title={title} description={description} />
}

function YoutubeEmbed({ ytId, title, description }: { ytId: string; title: string; description?: string }) {
  const [playing, setPlaying] = useState(false)

  if (!playing) {
    return (
      <button
        className="video-embed video-embed--placeholder"
        onClick={() => setPlaying(true)}
        aria-label={`Play ${title}`}
      >
        <img
          src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
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
    <div className="video-embed video-embed--youtube">
      <iframe
        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
      {description && <p className="video-embed__desc">{description}</p>}
    </div>
  )
}

function UploadedVideo({ url, title, description }: { url: string; title: string; description?: string }) {
  const [playing, setPlaying] = useState(false)
  const [orientation, setOrientation] = useState<'landscape' | 'portrait' | null>(null)

  const onLoaded = (e: SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget
    setOrientation(v.videoWidth >= v.videoHeight ? 'landscape' : 'portrait')
  }

  if (!playing) {
    return (
      <button
        className="video-embed video-embed--placeholder"
        onClick={() => setPlaying(true)}
        aria-label={`Play ${title}`}
      >
        <span className="video-embed__play" aria-hidden="true">▶</span>
        <span className="video-embed__title">{title}</span>
        {description && <span className="video-embed__desc">{description}</span>}
      </button>
    )
  }

  return (
    <div className={`video-embed video-embed--upload${orientation === 'portrait' ? ' video-embed--portrait' : ''}`}>
      <video
        src={url}
        title={title}
        controls
        autoPlay
        playsInline
        onLoadedMetadata={onLoaded}
      />
      {description && <p className="video-embed__desc">{description}</p>}
    </div>
  )
}
