import { describe, expect, it, vi } from 'vitest'
import { applyOrder, saveReorder, visibleItems } from './reorder'
import { getReloadTick, refreshAdminData } from './adminData'
import type { PortfolioItem } from '../portfolio/types'
import type { PortfolioRepository } from '../portfolio/repository'

/**
 * Reorder contract:
 *  - visibleItems scopes the admin collection to a category ('' = all).
 *  - applyOrder rebuilds a list to a desired id sequence (drag result).
 *  - saveReorder persists ONLY the given ids through reorderItems(), then
 *    refreshes admin data; failures are surfaced and never "succeed silently".
 */

const ITEMS: PortfolioItem[] = [
  { id: 'w1', title: 'Wedding A', caption: '', category: 'weddings', imageUrl: null, thumbnailUrl: null, year: '2026', description: '', sortOrder: 1, published: true, featured: false, variant: '01' },
  { id: 'w2', title: 'Wedding B', caption: '', category: 'weddings', imageUrl: null, thumbnailUrl: null, year: '2026', description: '', sortOrder: 2, published: true, featured: false, variant: '02' },
  { id: 'e1', title: 'Event A', caption: '', category: 'events', imageUrl: null, thumbnailUrl: null, year: '2026', description: '', sortOrder: 3, published: true, featured: false, variant: '03' },
  { id: 'p1', title: 'Portrait A', caption: '', category: 'portraits', imageUrl: null, thumbnailUrl: null, year: '2026', description: '', sortOrder: 4, published: false, featured: false, variant: '04' },
]

describe('visibleItems', () => {
  it('returns every item when no category filter is set', () => {
    expect(visibleItems(ITEMS, '').map((i) => i.id)).toEqual(['w1', 'w2', 'e1', 'p1'])
  })

  it('returns only items in the selected category, in existing order', () => {
    expect(visibleItems(ITEMS, 'weddings').map((i) => i.id)).toEqual(['w1', 'w2'])
  })

  it('returns an empty list for a category with no items', () => {
    expect(visibleItems(ITEMS, 'birthdays')).toEqual([])
  })
})

describe('applyOrder', () => {
  it('rebuilds the list to the desired id sequence', () => {
    const ordered = applyOrder(ITEMS, ['w2', 'w1', 'p1', 'e1'])
    expect(ordered.map((i) => i.id)).toEqual(['w2', 'w1', 'p1', 'e1'])
  })

  it('drops ids that are not in the source list', () => {
    const ordered = applyOrder(ITEMS, ['w2', 'ghost', 'w1'])
    expect(ordered.map((i) => i.id)).toEqual(['w2', 'w1'])
  })
})

describe('saveReorder', () => {
  it('persists the ordered ids and then refreshes admin data on success', async () => {
    const repo = {
      reorderItems: vi.fn().mockResolvedValue(undefined),
    } as unknown as PortfolioRepository
    const onSaved = vi.fn()

    const result = await saveReorder(repo, ['w2', 'w1'], onSaved)

    expect(result).toEqual({ ok: true })
    expect(repo.reorderItems).toHaveBeenCalledWith(['w2', 'w1'])
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('bumps the admin reload tick when refreshAdminData is the callback', async () => {
    const repo = {
      reorderItems: vi.fn().mockResolvedValue(undefined),
    } as unknown as PortfolioRepository

    const before = getReloadTick()
    const result = await saveReorder(repo, ['w2', 'w1'], refreshAdminData)

    expect(result).toEqual({ ok: true })
    expect(getReloadTick()).toBe(before + 1)
  })

  it('does not refresh admin data when persistence fails', async () => {
    const repo = {
      reorderItems: vi.fn().mockRejectedValue(new Error('boom on reorder')),
    } as unknown as PortfolioRepository
    const onSaved = vi.fn()

    const result = await saveReorder(repo, ['w2', 'w1'], onSaved)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/boom on reorder/)
    expect(onSaved).not.toHaveBeenCalled()
  })
})
