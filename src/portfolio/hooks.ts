import { useEffect, useState } from 'react'
import type { PortfolioCategory, PortfolioItem, VideoItem } from './types'
import { getPortfolioRepository } from './repository'
import { contentCache } from '../lib/contentCache'
import { useStore } from '../lib/store'

/**
 * React hooks over the portfolio repository. Components never import data
 * arrays directly — they ask the repository for what they need, the same way
 * a Supabase-backed provider is asked. The cache subscription re-fetches when
 * `hydrateContent()` swaps the active provider, so the UI always converges on
 * the live content source.
 */

export function usePortfolioItems(categoryId?: string): PortfolioItem[] {
  const [items, setItems] = useState<PortfolioItem[]>(() =>
    categoryId ? [] : getPortfolioRepository().getCachedPortfolioItems().filter((i) => i.published),
  )
  const cacheSource = useCacheSource()

  useEffect(() => {
    let alive = true
    getPortfolioRepository()
      .getPortfolioItems(categoryId)
      .then((list) => {
        if (alive) setItems(list)
      })
    return () => {
      alive = false
    }
  }, [categoryId, cacheSource])

  return items
}

export function useItemsByCategory(slug: string): PortfolioItem[] {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const cacheSource = useCacheSource()

  useEffect(() => {
    let alive = true
    getPortfolioRepository()
      .getItemsByCategory(slug)
      .then((list) => {
        if (alive) setItems(list)
      })
    return () => {
      alive = false
    }
  }, [slug, cacheSource])

  return items
}

export function usePortfolioCategories(): PortfolioCategory[] {
  const [categories, setCategories] = useState<PortfolioCategory[]>([])
  const cacheSource = useCacheSource()

  useEffect(() => {
    let alive = true
    getPortfolioRepository()
      .getPortfolioCategories()
      .then((list) => {
        if (alive) setCategories(list)
      })
    return () => {
      alive = false
    }
  }, [cacheSource])

  return categories
}

export function useVideos(): VideoItem[] {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const cacheSource = useCacheSource()

  useEffect(() => {
    let alive = true
    getPortfolioRepository()
      .getVideos()
      .then((list) => {
        if (alive) setVideos(list)
      })
    return () => {
      alive = false
    }
  }, [cacheSource])

  return videos
}

export function useFeaturedItems(): PortfolioItem[] {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const cacheSource = useCacheSource()

  useEffect(() => {
    let alive = true
    getPortfolioRepository()
      .getFeaturedItems()
      .then((list) => {
        if (alive) setItems(list)
      })
    return () => {
      alive = false
    }
  }, [cacheSource])

  return items
}

/** Synchronous cached items (LCD + captions; no network round-trip). */
export function useCachedPortfolioItems(): PortfolioItem[] {
  return useCacheSnapshot().items
}

/** Reactive to provider swaps — the cache bumps on every hydration/update. */
export function useCacheSource(): string {
  return useStore(contentCache).source
}

/** Live snapshot of the content cache (synchronous, subscribes). */
export function useCacheSnapshot() {
  return useStore(contentCache)
}
