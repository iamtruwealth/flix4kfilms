import { getSupabaseClient } from '../lib/supabaseClient'
import { setCacheCategories, setCacheItems, setCacheVideos } from '../lib/contentCache'
import { setPortfolioRepository } from './repository'
import { SupabasePortfolioRepository } from './supabaseRepository'
import {
  LOCAL_PORTFOLIO_CATEGORIES,
  LOCAL_PORTFOLIO_ITEMS,
  LOCAL_VIDEOS,
} from './data'

/**
 * Content bootstrap — loads Supabase content into the synchronous LCD cache
 * and swaps the active repository provider.
 *
 * Failure contract: if Supabase is unreachable/unconfigured the app degrades
 * to the local placeholder catalog. It must NEVER leave a blank portfolio, so
 * the local catalog is always seeded before any remote attempt.
 */

export interface ContentHydrationResult {
  ok: boolean
  source: 'local' | 'supabase'
}

let hydratePromise: Promise<ContentHydrationResult> | null = null

function seedLocalCache(): void {
  setCacheItems(LOCAL_PORTFOLIO_ITEMS, 'local')
  setCacheCategories(LOCAL_PORTFOLIO_CATEGORIES)
  setCacheVideos(LOCAL_VIDEOS)
}

export function hydrateContent(): Promise<ContentHydrationResult> {
  if (hydratePromise) return hydratePromise

  // Seed local catalog first so the LCD always has frames to paint.
  seedLocalCache()

  hydratePromise = (async () => {
    const client = getSupabaseClient()
    if (!client) {
      return { ok: true, source: 'local' } as const
    }

    const repo = new SupabasePortfolioRepository(client)
    try {
      const [items, categories, videos] = await Promise.all([
        repo.getPortfolioItems(),
        repo.getPortfolioCategories(),
        repo.getVideos(),
      ])
      setCacheItems(items, 'supabase')
      setCacheCategories(categories)
      setCacheVideos(videos)
      setPortfolioRepository(repo)
      return { ok: true, source: 'supabase' } as const
    } catch (err) {
      // Cache already holds the local catalog — safe to stay on it.
      if (import.meta.env.DEV) {
        console.error('[content] Supabase hydration failed, using local catalog.', err)
      }
      return { ok: false, source: 'local' } as const
    }
  })()

  return hydratePromise
}

/** Test helper: allow hydration to be re-run with a fresh provider. */
export function resetHydration(): void {
  hydratePromise = null
}
