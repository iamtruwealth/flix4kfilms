import { useVideos } from '../portfolio/hooks'
import { VideoEmbed } from '../ui/VideoEmbed'

export function VideosPage() {
  const videos = useVideos()

  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">VIDEOS</p>
        <h1>In motion.</h1>
      </header>

      {videos.length === 0 ? (
        <div className="empty-state">
          <p className="kicker">NO REELS YET</p>
          <p>Videos will appear here once published from the admin panel.</p>
        </div>
      ) : (
        <div className="video-grid">
          {videos.map((v) => (
            <VideoEmbed
              key={v.id}
              youtubeUrl={v.youtubeUrl}
              videoUrl={v.videoUrl}
              title={v.title}
              description={v.description}
            />
          ))}
        </div>
      )}
    </div>
  )
}
