import type {
  AdminItemInput,
  AdminVideoInput,
  CategoryInput,
  PortfolioCategory,
  PortfolioItem,
  VideoItem,
} from './types'
import { LocalPortfolioRepository } from './localRepository'

/**
 * Content provider abstraction — the single boundary the UI talks to.
 *
 * `LocalPortfolioRepository` is the offline/dev fallback. A Supabase-backed
 * provider implements the same interface (Auth + RLS, publishable key only in
 * the browser) and is registered here without touching any visual component.
 *
 * Contract notes:
 * - Public reads (`getPortfolioItems`, `getPortfolioCategories`, `getVideos`,
 *   `getFeaturedItems`, `getItemsByCategory`) only ever return published rows.
 * - `getPortfolioItems(categoryId?)` filters by category **id**.
 *   For slug-driven filtering (public URLs) use `getItemsByCategory(slug)`.
 * - `getAdmin*` views include unpublished rows and are only reachable behind
 *   admin auth.
 * - `getCachedPortfolioItems()` is synchronous — required by the 3D LCD loop,
 *   which must paint without awaiting. A remote provider returns the last
 *   hydrated cache (or [] until hydration completes).
 */
export interface PortfolioRepository {
  getPortfolioItems(categoryId?: string): Promise<PortfolioItem[]>
  getPortfolioCategories(): Promise<PortfolioCategory[]>
  getVideos(): Promise<VideoItem[]>
  getVideosByCategory(slug: string): Promise<VideoItem[]>
  getFeaturedItems(): Promise<PortfolioItem[]>
  getCachedPortfolioItems(): PortfolioItem[]

  getPortfolioItem(id: string): Promise<PortfolioItem | null>
  getItemsByCategory(slug: string): Promise<PortfolioItem[]>

  /** Admin views — include unpublished rows. */
  getAdminItems(): Promise<PortfolioItem[]>
  getAdminCategories(): Promise<PortfolioCategory[]>
  getAdminVideos(): Promise<VideoItem[]>

  createItem(input: AdminItemInput): Promise<PortfolioItem>
  updateItem(id: string, patch: Partial<AdminItemInput>): Promise<PortfolioItem>
  deleteItem(id: string): Promise<void>
  reorderItems(orderedIds: string[]): Promise<void>

  createVideo(input: AdminVideoInput): Promise<VideoItem>
  updateVideo(id: string, patch: Partial<AdminVideoInput>): Promise<VideoItem>
  deleteVideo(id: string): Promise<void>

  createCategory(input: CategoryInput): Promise<PortfolioCategory>
  updateCategory(id: string, patch: Partial<CategoryInput>): Promise<PortfolioCategory>
  deleteCategory(id: string): Promise<void>
}

let provider: PortfolioRepository | null = null

/** Access the single content provider (swappable for Supabase via bootstrap). */
export function getPortfolioRepository(): PortfolioRepository {
  if (!provider) {
    provider = new LocalPortfolioRepository()
  }
  return provider
}

/** Replace the active provider (used by the content bootstrap). */
export function setPortfolioRepository(repo: PortfolioRepository): void {
  provider = repo
}

/** Reset to the default local provider (used by tests). */
export function resetPortfolioRepository(): void {
  provider = null
}

/** Synchronous items for the 3D LCD / caption (never awaits the network). */
export function getCachedPortfolioItems(): PortfolioItem[] {
  return getPortfolioRepository().getCachedPortfolioItems()
}
