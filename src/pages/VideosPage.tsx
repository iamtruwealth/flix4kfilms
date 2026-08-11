import { useVideos } from '../portfolio/hooks'

/** Motion work. Video content arrives in a later phase; the empty state
 *  reads from the repository's (currently empty) video list. */
export function VideosPage() {
  const videos = useVideos()

  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">VIDEOS</p>
        <h1>In motion.</h1>
        <p className="page-lede">
          Reels and films cut from the same monochrome negative. These will
          publish here once the content pipeline lands.
        </p>
      </header>

      {videos.length === 0 ? (
        <div className="empty-state">
          <p className="kicker">NO REELS YET</p>
          <p>Video uploads arrive in a later phase — the page is wired to the same repository.</p>
        </div>
      ) : (
        <ul className="video-list">
          {videos.map((v) => (
            <li key={v.id} className="video-item">
              <p>{v.description ? `${v.description} — ` : ''}{v.year}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
