import { useState } from 'react'
import type { PortfolioItem } from '../../portfolio/types'
import { useAdminItems, useAdminCategories, refreshAdminData } from '../adminData'
import { UploadDropzone, type UploadedObject } from '../UploadDropzone'
import { getPortfolioRepository } from '../../portfolio/repository'
import { PhotoEditDialog } from './PhotoEditDialog'
import { ReorderList } from './ReorderList'
import { applyOrder, saveReorder, visibleItems } from '../reorder'

/**
 * Photos management — upload, edit metadata, publish/unpublish, delete and
 * drag-to-reorder. Writes go through the repository (RLS-protected
 * server-side); failures surface inline and never leave a half-published record.
 *
 * Reorder mode:
 *  - a category filter scopes which collection is rearranged; only the ids in
 *    the scoped collection are ever sent to `reorderItems()`, so unrelated
 *    categories are never touched.
 *  - the drag list is the public portfolio order for that scope.
 *  - order is persisted only on explicit SAVE (local drag does not write to the
 *    DB); a failed save keeps the local order and offers a retry.
 */

export function PhotosPage() {
  const items = useAdminItems()
  const categories = useAdminCategories()
  const [editing, setEditing] = useState<PortfolioItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [filterCategory, setFilterCategory] = useState('')
  const [reordering, setReordering] = useState(false)
  const [draft, setDraft] = useState<PortfolioItem[]>([])

  /** The collection currently on screen (scoped by the category filter). */
  const scoped = visibleItems(items, filterCategory)

  const onUploaded = async (objects: UploadedObject[]) => {
    setError(null)
    const repo = getPortfolioRepository()
    for (const obj of objects) {
      try {
        const category = categories.find((c) => c.published)
        await repo.createItem({
          title: '',
          categoryId: category?.id ?? categories[0]?.id ?? '',
          slug: `${Date.now()}-${obj.path.split('/').pop() ?? 'item'}`,
          description: '',
          imagePath: obj.path,
          thumbnailPath: null,
          year: '2026',
          sortOrder: items.length + 1,
          published: false,
          featured: false,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save upload.')
      }
    }
    refreshAdminData()
  }

  const togglePublished = async (item: PortfolioItem) => {
    setError(null)
    setBusy(true)
    try {
      await getPortfolioRepository().updateItem(item.id, { published: !item.published })
      refreshAdminData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update item.')
    } finally {
      setBusy(false)
    }
  }

  const deleteItem = async (item: PortfolioItem) => {
    if (!window.confirm('Delete this photo? This cannot be undone.')) return
    setError(null)
    setBusy(true)
    try {
      await getPortfolioRepository().deleteItem(item.id)
      refreshAdminData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete item.')
    } finally {
      setBusy(false)
    }
  }

  const onSaved = () => {
    setEditing(null)
    refreshAdminData()
  }

  /* ------------------------------ reorder mode ------------------------------ */

  const enterReorder = () => {
    setError(null)
    setDraft(scoped)
    setReordering(true)
  }

  const cancelReorder = () => {
    setReordering(false)
    setDraft([])
    setError(null)
  }

  const onReorder = (orderedIds: string[]) => {
    // Local visual reorder only — nothing touches the DB until SAVE.
    setDraft((prev) => applyOrder(prev.length > 0 ? prev : scoped, orderedIds))
  }

  const onFilterChange = (value: string) => {
    setFilterCategory(value)
    // Keep the reorder scope honest: switching category resets the draft to
    // the newly scoped collection rather than dragging across categories.
    if (reordering) setDraft(visibleItems(items, value))
  }

  const saveOrder = async () => {
    setError(null)
    setBusy(true)
    const result = await saveReorder(
      getPortfolioRepository(),
      draft.map((i) => i.id),
      refreshAdminData,
    )
    setBusy(false)
    if (result.ok) {
      setReordering(false)
      setDraft([])
    } else {
      // Keep the local order + stay in reorder mode so the admin can retry.
      setError(result.error ?? 'Could not save order.')
    }
  }

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—'
  const scopeLabel = filterCategory ? categoryName(filterCategory) : 'ALL CATEGORIES'

  const reorderRow = (item: PortfolioItem, index: number) => (
    <div className="admin-row reorder-row">
      {item.thumbnailUrl || item.imageUrl ? (
        <img className="admin-thumb" src={item.thumbnailUrl ?? item.imageUrl ?? ''} alt="" />
      ) : (
        <div className="admin-thumb admin-thumb-empty" aria-hidden="true" />
      )}
      <div className="admin-row-main">
        <p className="admin-row-title">
          <span className="reorder-idx">{String(index + 1).padStart(2, '0')}</span>
          {item.featured ? <span className="admin-tag">FEATURED</span> : null}
          {!item.published ? <span className="admin-tag admin-tag-dim">DRAFT</span> : null}
        </p>
        <p className="admin-row-sub">
          {categoryName(item.category)} · {item.year}
        </p>
      </div>
    </div>
  )

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <p className="kicker">PHOTOS</p>
        <h1>Manage photos.</h1>
        <p className="admin-page-lede">Upload, publish and arrange the archive.</p>
      </header>

      {error ? <p className="admin-error admin-error-block" role="alert">{error}</p> : null}

      {!reordering ? (
        <UploadDropzone
          bucket="portfolio-images"
          categorySlug={categories.find((c) => c.published)?.slug ?? ''}
          year={new Date().getFullYear().toString()}
          onUploaded={(objs) => void onUploaded(objs)}
        />
      ) : null}

      <div className="admin-card">
        <div className="admin-card-head">
          <h2 className="admin-card-title">
            {reordering
              ? `REORDER — ${scopeLabel}`
              : `${items.length} photo${items.length === 1 ? '' : 's'}`}
          </h2>
          <div className="admin-card-head-actions">
            <label className="admin-filter">
              <span className="admin-filter-label">CATEGORY</span>
              <select
                value={filterCategory}
                onChange={(e) => onFilterChange(e.target.value)}
                disabled={reordering}
                aria-label="Filter photos by category"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {reordering ? (
              <>
                <button type="button" className="admin-btn admin-btn-sm admin-btn-ghost" onClick={cancelReorder} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className="admin-btn admin-btn-sm" onClick={() => void saveOrder()} disabled={busy}>
                  {busy ? 'Saving…' : 'Save order'}
                </button>
              </>
            ) : (
              <button type="button" className="admin-btn admin-btn-sm admin-btn-ghost" onClick={enterReorder} disabled={busy}>
                Reorder
              </button>
            )}
          </div>
        </div>

        {reordering ? (
          <div className="admin-reorder-panel">
            <p className="admin-reorder-note">
              Drag to arrange. The order shown is the public portfolio order for{' '}
              <strong>{scopeLabel}</strong>. Order is saved only when you press{' '}
              <strong>Save order</strong>.
            </p>
            <ReorderList items={draft} onReorder={onReorder} renderRow={reorderRow} />
            {draft.length === 0 ? (
              <p className="admin-empty">No photos in this scope to reorder.</p>
            ) : null}
          </div>
        ) : (
          <>
            <ul className="admin-list">
              {scoped.map((item) => (
                <li key={item.id} className="admin-row">
                  {item.thumbnailUrl || item.imageUrl ? (
                    <img
                      className="admin-thumb"
                      src={item.thumbnailUrl ?? item.imageUrl ?? ''}
                      alt=""
                    />
                  ) : (
                    <div className="admin-thumb admin-thumb-empty" aria-hidden="true" />
                  )}
                  <div className="admin-row-main">
                    <p className="admin-row-title">
                      {item.featured ? <span className="admin-tag">FEATURED</span> : null}
                      {!item.published ? <span className="admin-tag admin-tag-dim">DRAFT</span> : null}
                    </p>
                    <p className="admin-row-sub">
                      {categoryName(item.category)} · {item.year}
                    </p>
                  </div>
                  <div className="admin-row-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm"
                      onClick={() => setEditing(item)}
                      disabled={busy}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm admin-btn-ghost"
                      onClick={() => void togglePublished(item)}
                      disabled={busy}
                    >
                      {item.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm admin-btn-danger"
                      onClick={() => void deleteItem(item)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {scoped.length === 0 ? (
              <p className="admin-empty">
                {filterCategory
                  ? 'No photos in this category yet.'
                  : 'No photos yet — drop files above to begin.'}
              </p>
            ) : null}
          </>
        )}
      </div>

      {editing ? (
        <PhotoEditDialog item={editing} categories={categories} onClose={() => setEditing(null)} onSaved={onSaved} />
      ) : null}
    </div>
  )
}
