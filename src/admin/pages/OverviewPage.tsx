import { useAdminCategories, useAdminItems, useAdminVideos } from '../adminData'
import { Link } from 'react-router-dom'

/** Dashboard landing — headline counts + quick links. */
export function OverviewPage() {
  const items = useAdminItems()
  const videos = useAdminVideos()
  const categories = useAdminCategories()

  const published = items.filter((i) => i.published).length
  const featured = items.filter((i) => i.featured).length

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <p className="kicker">OVERVIEW</p>
        <h1>Control room.</h1>
        <p className="admin-page-lede">A snapshot of the content behind the site.</p>
      </header>

      <div className="admin-stats">
        <div className="admin-stat">
          <p className="admin-stat-num">{items.length}</p>
          <p className="admin-stat-label">Photos</p>
        </div>
        <div className="admin-stat">
          <p className="admin-stat-num">{published}</p>
          <p className="admin-stat-label">Published</p>
        </div>
        <div className="admin-stat">
          <p className="admin-stat-num">{featured}</p>
          <p className="admin-stat-label">Featured</p>
        </div>
        <div className="admin-stat">
          <p className="admin-stat-num">{videos.length}</p>
          <p className="admin-stat-label">Videos</p>
        </div>
        <div className="admin-stat">
          <p className="admin-stat-num">{categories.length}</p>
          <p className="admin-stat-label">Categories</p>
        </div>
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">Quick actions</h2>
        <div className="admin-quick-actions">
          <Link className="admin-btn" to="/admin/photos">
            Manage photos
          </Link>
          <Link className="admin-btn admin-btn-ghost" to="/admin/videos">
            Manage videos
          </Link>
          <Link className="admin-btn admin-btn-ghost" to="/admin/categories">
            Manage categories
          </Link>
        </div>
      </div>
    </div>
  )
}
