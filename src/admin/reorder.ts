import type { PortfolioItem } from '../portfolio/types'
import type { PortfolioRepository } from '../portfolio/repository'

/**
 * Reorder helpers for the photos room.
 *
 * Pure, repository-agnostic pieces so the drag flow is unit-testable without a
 * DOM: scoping the collection to a category, mapping a drag result back onto
 * items, and persisting an order through the existing `reorderItems()` contract
 * (which renumbers ONLY the supplied ids — the category-scoping safety net).
 */

/** Scope the admin collection to one category ('' = all items). */
export function visibleItems(items: PortfolioItem[], categoryId: string): PortfolioItem[] {
  if (!categoryId) return items
  return items.filter((i) => i.category === categoryId)
}

/** Rebuild a list to a desired id sequence; ids not in the source are dropped. */
export function applyOrder(items: PortfolioItem[], orderedIds: string[]): PortfolioItem[] {
  const byId = new Map(items.map((i) => [i.id, i]))
  const out: PortfolioItem[] = []
  for (const id of orderedIds) {
    const item = byId.get(id)
    if (item) out.push(item)
  }
  return out
}

export interface ReorderSaveResult {
  ok: boolean
  error?: string
}

/**
 * Persist a new order through the repository's `reorderItems()`, then refresh
 * admin data ONLY on success. Failures are surfaced so the caller can keep the
 * local order and offer a retry — we never pretend a failed save succeeded.
 */
export async function saveReorder(
  repo: PortfolioRepository,
  orderedIds: string[],
  onSaved: () => void,
): Promise<ReorderSaveResult> {
  try {
    await repo.reorderItems(orderedIds)
    onSaved()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not save order.' }
  }
}
