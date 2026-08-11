import { useState, type FormEvent } from 'react'
import type { PortfolioCategory } from '../../portfolio/types'
import { useAdminCategories, refreshAdminData } from '../adminData'
import { getPortfolioRepository } from '../../portfolio/repository'

/**
 * Categories management — create, rename, republish, delete. Deleting is
 * refused when photos still sit in the category (the repository enforces this
 * too, so the UI mirrors the rule rather than catching an error).
 */

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function CategoriesPage() {
  const categories = useAdminCategories()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await getPortfolioRepository().createCategory({
        name: name.trim(),
        slug: slugify(name) || `category-${Date.now()}`,
        description: description.trim(),
        sortOrder: categories.length + 1,
        published: false,
      })
      setName('')
      setDescription('')
      refreshAdminData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create category.')
    } finally {
      setBusy(false)
    }
  }

  const togglePublished = async (category: PortfolioCategory) => {
    setError(null)
    setBusy(true)
    try {
      await getPortfolioRepository().updateCategory(category.id, {
        published: !category.published,
      })
      refreshAdminData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update category.')
    } finally {
      setBusy(false)
    }
  }

  const deleteCategory = async (category: PortfolioCategory) => {
    if (!window.confirm(`Delete "${category.name}"? Categories with photos cannot be deleted.`)) {
      return
    }
    setError(null)
    setBusy(true)
    try {
      await getPortfolioRepository().deleteCategory(category.id)
      refreshAdminData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete category.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <p className="kicker">CATEGORIES</p>
        <h1>Organize the work.</h1>
        <p className="admin-page-lede">Categories drive the public rail and photo pages.</p>
      </header>

      {error ? <p className="admin-error admin-error-block" role="alert">{error}</p> : null}

      <div className="admin-card">
        <h2 className="admin-card-title">New category</h2>
        <form className="admin-form admin-form-row" onSubmit={(e) => void onCreate(e)}>
          <label className="admin-field">
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Editorial"
              required
            />
          </label>
          <label className="admin-field admin-field-grow">
            <span>Description (shown on the rail)</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short line about this category"
            />
          </label>
          <button type="submit" className="admin-btn" disabled={busy}>
            {busy ? 'Creating…' : 'Create'}
          </button>
        </form>
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">
          {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
        </h2>
        <ul className="admin-list">
          {categories.map((category) => (
            <li key={category.id} className="admin-row">
              <div className="admin-row-main">
                <p className="admin-row-title">
                  {category.name}
                  {!category.published ? <span className="admin-tag admin-tag-dim">HIDDEN</span> : null}
                </p>
                <p className="admin-row-sub">/{category.slug}</p>
              </div>
              <div className="admin-row-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-sm admin-btn-ghost"
                  onClick={() => void togglePublished(category)}
                  disabled={busy}
                >
                  {category.published ? 'Hide' : 'Publish'}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-sm admin-btn-danger"
                  onClick={() => void deleteCategory(category)}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        {categories.length === 0 ? (
          <p className="admin-empty">No categories yet — create the first one above.</p>
        ) : null}
      </div>
    </div>
  )
}
