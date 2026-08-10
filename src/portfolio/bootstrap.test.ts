import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { hydrateContent, resetHydration } from './bootstrap'
import { getSupabaseClient } from '../lib/supabaseClient'
import { getPortfolioRepository, resetPortfolioRepository } from './repository'
import { contentCache } from '../lib/contentCache'
import { LOCAL_PORTFOLIO_ITEMS } from './data'

/**
 * Hydration contract:
 *  - No Supabase client  -> local catalog seeded, source 'local'.
 *  - Supabase succeeds   -> cache seeded from Supabase, provider swapped.
 *  - Supabase fails      -> local catalog retained, source 'local', never blank.
 */

vi.mock('../lib/supabaseClient', () => ({
  getSupabaseClient: vi.fn(),
}))

const mockGetClient = vi.mocked(getSupabaseClient)

/** Mutable behavior the mocked SupabasePortfolioRepository reads from. */
let repoBehavior: {
  items: unknown[]
  categories: unknown[]
  videos: unknown[]
  failItems: boolean
} = { items: [], categories: [], videos: [], failItems: false }

vi.mock('./supabaseRepository', () => ({
  SupabasePortfolioRepository: class {
    async getPortfolioItems() {
      if (repoBehavior.failItems) throw new Error('network down')
      return repoBehavior.items
    }
    async getPortfolioCategories() {
      return repoBehavior.categories
    }
    async getVideos() {
      return repoBehavior.videos
    }
    getCachedPortfolioItems() {
      return repoBehavior.items
    }
  },
}))

function makeClientStub() {
  return { storage: {} } as never
}

describe('hydrateContent', () => {
  beforeEach(() => {
    resetHydration()
    resetPortfolioRepository()
    mockGetClient.mockReset()
    repoBehavior = { items: [], categories: [], videos: [], failItems: false }
  })

  afterEach(() => {
    resetHydration()
    resetPortfolioRepository()
  })

  it('seeds the local catalog and reports local when Supabase is unconfigured', async () => {
    mockGetClient.mockReturnValue(null)
    const result = await hydrateContent()
    expect(result).toEqual({ ok: true, source: 'local' })
    expect(contentCache.get().items).toHaveLength(LOCAL_PORTFOLIO_ITEMS.length)
    expect(contentCache.get().hydrated).toBe(true)
    expect(getPortfolioRepository().getCachedPortfolioItems()).toHaveLength(
      LOCAL_PORTFOLIO_ITEMS.length,
    )
  })

  it('swaps to the Supabase provider and seeds the cache from it', async () => {
    const client = makeClientStub()
    mockGetClient.mockReturnValue(client)
    const supabaseItem = { id: 's1', title: 'Remote frame' }
    const supabaseCategory = { id: 'c1', name: 'WEDDINGS' }
    const supabaseVideo = { id: 'v1', title: 'Reel' }
    repoBehavior = {
      items: [supabaseItem],
      categories: [supabaseCategory],
      videos: [supabaseVideo],
      failItems: false,
    }

    const result = await hydrateContent()
    expect(result).toEqual({ ok: true, source: 'supabase' })
    expect(contentCache.get().source).toBe('supabase')
    expect(contentCache.get().items).toEqual([supabaseItem])
    expect(getPortfolioRepository().getCachedPortfolioItems()).toEqual([supabaseItem])
  })

  it('falls back to the local catalog when Supabase reads fail', async () => {
    const client = makeClientStub()
    mockGetClient.mockReturnValue(client)
    repoBehavior = { items: [], categories: [], videos: [], failItems: true }

    const result = await hydrateContent()
    expect(result).toEqual({ ok: false, source: 'local' })
    expect(contentCache.get().items).toHaveLength(LOCAL_PORTFOLIO_ITEMS.length)
    expect(getPortfolioRepository().getCachedPortfolioItems()).toHaveLength(
      LOCAL_PORTFOLIO_ITEMS.length,
    )
  })
})
