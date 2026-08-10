import { createStore } from './store'
import type { PortfolioCategory, PortfolioItem, VideoItem } from '../portfolio/types'

/**
 * Synchronous content cache — the only source the 3D LCD loop may read from.
 *
 * The LCD paints on a per-frame basis and must never await a network request.
 * `hydrateContent()` fills this cache from Supabase on startup; components
 * subscribe via `useStore` or read synchronously with `getCacheSnapshot()`.
 */

export interface ContentCacheState {
  items: PortfolioItem[]
  categories: PortfolioCategory[]
  videos: VideoItem[]
  source: 'local' | 'supabase'
  hydrated: boolean
}

export const contentCache = createStore<ContentCacheState>({
  items: [],
  categories: [],
  videos: [],
  source: 'local',
  hydrated: false,
})

export function getCacheSnapshot(): ContentCacheState {
  return contentCache.get()
}

export function setCacheItems(items: PortfolioItem[], source: 'local' | 'supabase'): void {
  contentCache.update((s) => ({ ...s, items, source, hydrated: true }))
}

export function setCacheCategories(categories: PortfolioCategory[]): void {
  contentCache.update((s) => ({ ...s, categories }))
}

export function setCacheVideos(videos: VideoItem[]): void {
  contentCache.update((s) => ({ ...s, videos }))
}
