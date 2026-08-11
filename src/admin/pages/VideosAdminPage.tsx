import { useState } from 'react'
import { useAdminVideos, refreshAdminData } from '../adminData'
import { UploadDropzone, type UploadedObject } from '../UploadDropzone'
import { getPortfolioRepository } from '../../portfolio/repository'
import type { VideoItem } from '../../portfolio/types'

/**
 * Videos management — upload reels, publish/unpublish, delete. Video playback
 * appears on the public /videos page once published; metadata here mirrors the
 * photo flow.
 */

export function VideosAdminPage() {
  const videos = useAdminVideos()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onUploaded = async (objects: UploadedObject[]) => {
    setError(null)
    for (const obj of objects) {
      try {
        await getPortfolioRepository().createVideo({
          title: '',
          slug: `${Date.now()}-${obj.path.split('/').pop() ?? 'video'}`,
          description: '',
          videoPath: obj.path,
          thumbnailPath: null,
          year: '2026',
          sortOrder: videos.length + 1,
          published: false,
          featured: false,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save upload.')
      }
    }
    refreshAdminData()
  }

  const togglePublished = async (video: VideoItem) => {
    setError(null)
    setBusy(true)
    try {
      await getPortfolioRepository().updateVideo(video.id, { published: !video.published })
      refreshAdminData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update video.')
    } finally {
      setBusy(false)
    }
  }

  const deleteVideo = async (video: VideoItem) => {
    if (!window.confirm('Delete this video? This cannot be undone.')) return
    setError(null)
    setBusy(true)
    try {
      await getPortfolioRepository().deleteVideo(video.id)
      refreshAdminData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete video.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <p className="kicker">VIDEOS</p>
        <h1>Manage reels.</h1>
        <p className="admin-page-lede">Upload motion work and publish it to the site.</p>
      </header>

      {error ? <p className="admin-error admin-error-block" role="alert">{error}</p> : null}

      <UploadDropzone
        bucket="portfolio-videos"
        categorySlug="videos"
        year={new Date().getFullYear().toString()}
        onUploaded={(objs) => void onUploaded(objs)}
      />

      <div className="admin-card">
        <h2 className="admin-card-title">
          {videos.length} video{videos.length === 1 ? '' : 's'}
        </h2>
        <ul className="admin-list">
          {videos.map((video) => (
            <li key={video.id} className="admin-row">
              {video.thumbnailUrl ? (
                <img className="admin-thumb" src={video.thumbnailUrl} alt="" />
              ) : (
                <div className="admin-thumb admin-thumb-empty" aria-hidden="true" />
              )}
              <div className="admin-row-main">
                <p className="admin-row-title">
                  {video.featured ? <span className="admin-tag">FEATURED</span> : null}
                  {!video.published ? <span className="admin-tag admin-tag-dim">DRAFT</span> : null}
                </p>
                <p className="admin-row-sub">{video.year}</p>
              </div>
              <div className="admin-row-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-sm admin-btn-ghost"
                  onClick={() => void togglePublished(video)}
                  disabled={busy}
                >
                  {video.published ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-sm admin-btn-danger"
                  onClick={() => void deleteVideo(video)}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        {videos.length === 0 ? (
          <p className="admin-empty">No reels yet — drop files above to begin.</p>
        ) : null}
      </div>
    </div>
  )
}
