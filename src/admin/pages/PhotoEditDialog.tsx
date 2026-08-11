import { useState, type FormEvent } from 'react'
import type { PortfolioCategory, PortfolioItem } from '../../portfolio/types'
import { getPortfolioRepository } from '../../portfolio/repository'

/**
 * Metadata editor for a photo: title, category, year, description, featured,
 * published. Saving writes through the repository; on success the parent
 * refreshes its list.
 */

interface PhotoEditDialogProps {
  item: PortfolioItem
  categories: PortfolioCategory[]
  onClose: () => void
  onSaved: () => void
}

export function PhotoEditDialog({ item, categories, onClose, onSaved }: PhotoEditDialogProps) {
  const [title, setTitle] = useState(item.title)
  const [categoryId, setCategoryId] = useState(item.category)
  const [year, setYear] = useState(item.year)
  const [description, setDescription] = useState(item.description)
  const [featured, setFeatured] = useState(item.featured)
  const [published, setPublished] = useState(item.published)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await getPortfolioRepository().updateItem(item.id, {
        title: title.trim(),
        categoryId,
        year,
        description,
        featured,
        published,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="admin-modal-head">
          <h2>Edit photo</h2>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
          <label className="admin-field">
            <span>Title (optional — used as alt text only)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label className="admin-field">
            <span>Category</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>Year</span>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2026"
              pattern="[0-9]{4}"
              required
            />
          </label>

          <label className="admin-field">
            <span>Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </label>

          <div className="admin-checks">
            <label className="admin-check">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
              <span>Featured</span>
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              <span>Published</span>
            </label>
          </div>

          {error ? <p className="admin-error" role="alert">{error}</p> : null}

          <div className="admin-modal-actions">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="admin-btn" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
