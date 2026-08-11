import { useState } from 'react'
import { useAdminVideos, useAdminCategories, refreshAdminData } from '../adminData'
import { UploadDropzone, type UploadedObject } from '../UploadDropzone'
import { getPortfolioRepository } from '../../portfolio/repository'
import type { VideoItem } from '../../portfolio/types'

export function VideosAdminPage() {
  const videos = useAdminVideos()
  const categories = useAdminCategories()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [ytUrl, setYtUrl] = useState('')
  const [catId, setCatId] = useState('')
  const [vTitle, setVTitle] = useState('')

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
          youtubeUrl: null,
          categoryId: null,
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

  const startEdit = (v: VideoItem) => {
    setEditId(v.id)
    setYtUrl(v.youtubeUrl ?? '')
    setCatId(v.categoryId ?? '')
    setVTitle(v.title)
  }

  const saveEdit = async () => {
    if (!editId) return
    setBusy(true)
    try {
      await getPortfolioRepository().updateVideo(editId, {
        title: vTitle,
        youtubeUrl: ytUrl || null,
        categoryId: catId || null,
      })
      setEditId(null)
      refreshAdminData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <p className="kicker">VIDEOS</p>
        <h1>Manage reels.</h1>
        <p className="admin-page-lede">
          Upload motion work or link YouTube embeds. Each video can be assigned to a category.
        </p>
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
                {editId === video.id ? (
                  <div className="admin-edit-row">
                    <input
                      className="admin-input"
                      value={vTitle}
                      onChange={(e) => setVTitle(e.target.value)}
                      placeholder="Title"
                    />
                    <input
                      className="admin-input"
                      value={ytUrl}
                      onChange={(e) => setYtUrl(e.target.value)}
                      placeholder="YouTube URL (e.g. https://www.youtube.com/watch?v=...)"
                    />
                    <select
                      className="admin-input"
                      value={catId}
                      onChange={(e) => setCatId(e.target.value)}
                    >
                      <option value="">No category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm"
                        onClick={() => void saveEdit()}
                        disabled={busy}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm admin-btn-ghost"
                        onClick={() => setEditId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="admin-row-title">
                      {video.featured ? <span className="admin-tag">FEATURED</span> : null}
                      {!video.published ? <span className="admin-tag admin-tag-dim">DRAFT</span> : null}
                      <span>{video.title || 'Untitled'}</span>
                    </p>
                    <p className="admin-row-sub">
                      {video.year}
                      {video.youtubeUrl ? ' • YT' : ''}
                      {video.categoryId ? ' • in category' : ''}
                    </p>
                  </>
                )}
              </div>
              {editId !== video.id && (
                <div className="admin-row-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-sm admin-btn-ghost"
                    onClick={() => startEdit(video)}
                  >
                    Edit
                  </button>
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
              )}
            </li>
          ))}
        </ul>
        {videos.length === 0 ? (
          <p className="admin-empty">No reels yet — drop files above or add a YouTube link.</p>
        ) : null}
      </div>
    </div>
  )
}
