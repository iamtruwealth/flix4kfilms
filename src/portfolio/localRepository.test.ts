import { describe, expect, it } from 'vitest'
import { LocalPortfolioRepository } from './localRepository'
import type { PortfolioCategory, PortfolioItem } from './types'

/**
 * Local provider reorder contract:
 *  - reorderItems assigns ascending sortOrder (1..N) to the supplied ids only.
 *  - items whose ids are NOT supplied are untouched (category-scoped safety).
 *  - existing photo CRUD still round-trips after a reorder.
 */

const SAMPLE_ITEMS: PortfolioItem[] = [
  { id: 'w1', title: 'Wedding A', caption: '', category: 'weddings', imageUrl: null, thumbnailUrl: null, year: '2026', description: '', sortOrder: 1, published: true, featured: false, variant: '01' },
  { id: 'w2', title: 'Wedding B', caption: '', category: 'weddings', imageUrl: null, thumbnailUrl: null, year: '2026', description: '', sortOrder: 2, published: true, featured: false, variant: '02' },
  { id: 'e1', title: 'Event A', caption: '', category: 'events', imageUrl: null, thumbnailUrl: null, year: '2026', description: '', sortOrder: 3, published: true, featured: false, variant: '03' },
  { id: 'p1', title: 'Portrait A', caption: '', category: 'portraits', imageUrl: null, thumbnailUrl: null, year: '2026', description: '', sortOrder: 4, published: false, featured: false, variant: '04' },
]

const SAMPLE_CATEGORIES: PortfolioCategory[] = [
  { id: 'weddings', name: 'WEDDINGS', slug: 'weddings', description: '', sortOrder: 1, published: true },
  { id: 'events', name: 'EVENTS', slug: 'events', description: '', sortOrder: 2, published: true },
  { id: 'portraits', name: 'PORTRAITS', slug: 'portraits', description: '', sortOrder: 3, published: true },
]

function makeRepo() {
  return new LocalPortfolioRepository(SAMPLE_ITEMS, SAMPLE_CATEGORIES, [])
}

describe('LocalPortfolioRepository.reorderItems', () => {
  it('produces the expected sort_order for the reordered ids', async () => {
    const repo = makeRepo()
    await repo.reorderItems(['w2', 'w1'])

    const items = await repo.getAdminItems()
    expect(items.find((i) => i.id === 'w2')?.sortOrder).toBe(1)
    expect(items.find((i) => i.id === 'w1')?.sortOrder).toBe(2)
  })

  it('leaves unrelated (other-category) items untouched', async () => {
    const repo = makeRepo()
    const before = await repo.getAdminItems()
    const eventsBefore = before.find((i) => i.id === 'e1')?.sortOrder
    const portraitsBefore = before.find((i) => i.id === 'p1')?.sortOrder

    // Category-scoped reorder: only weddings ids are supplied.
    await repo.reorderItems(['w2', 'w1'])

    const after = await repo.getAdminItems()
    expect(after.find((i) => i.id === 'e1')?.sortOrder).toBe(eventsBefore)
    expect(after.find((i) => i.id === 'p1')?.sortOrder).toBe(portraitsBefore)
  })

  it('reorders within a category without reordering other categories in the public view', async () => {
    const repo = makeRepo()
    await repo.reorderItems(['w2', 'w1'])

    const weddings = await repo.getItemsByCategory('weddings')
    expect(weddings.map((i) => i.id)).toEqual(['w2', 'w1'])
    const events = await repo.getItemsByCategory('events')
    expect(events.map((i) => i.id)).toEqual(['e1'])
  })

  it('ignores unknown ids instead of failing', async () => {
    const repo = makeRepo()
    await expect(repo.reorderItems(['ghost', 'w1'])).resolves.toBeUndefined()
  })
})

describe('LocalPortfolioRepository photo CRUD', () => {
  it('creates an item that appears in the admin list', async () => {
    const repo = makeRepo()
    const created = await repo.createItem({
      title: 'New frame',
      categoryId: 'weddings',
      slug: 'new-frame',
      description: 'A test frame',
      imagePath: null,
      thumbnailPath: null,
      year: '2026',
      sortOrder: 99,
      published: false,
      featured: false,
    })

    expect(created.id).toBe('new-frame')
    const items = await repo.getAdminItems()
    expect(items.find((i) => i.id === 'new-frame')?.title).toBe('New frame')
  })

  it('updates an existing item', async () => {
    const repo = makeRepo()
    await repo.updateItem('w1', { published: false, title: 'Wedding A v2' })

    const item = await repo.getPortfolioItem('w1')
    expect(item?.published).toBe(false)
    expect(item?.title).toBe('Wedding A v2')
  })

  it('deletes an existing item', async () => {
    const repo = makeRepo()
    await repo.deleteItem('w1')
    const items = await repo.getAdminItems()
    expect(items.find((i) => i.id === 'w1')).toBeUndefined()
  })

  it('keeps CRUD working after a reorder', async () => {
    const repo = makeRepo()
    await repo.reorderItems(['w2', 'w1'])

    const created = await repo.createItem({
      title: 'After reorder',
      categoryId: 'events',
      slug: 'after-reorder',
      description: '',
      imagePath: null,
      thumbnailPath: null,
      year: '2026',
      sortOrder: 100,
      published: false,
      featured: false,
    })
    await repo.updateItem(created.id, { published: true })

    const items = await repo.getAdminItems()
    expect(items.find((i) => i.id === 'after-reorder')?.published).toBe(true)
    expect(items.find((i) => i.id === 'w2')?.sortOrder).toBe(1)
  })
})
