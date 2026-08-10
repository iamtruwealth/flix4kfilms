import { useEffect, useMemo, useState } from 'react'
import type { PortfolioCategory, PortfolioItem, VideoItem } from './types'
import { getCachedPortfolioItems, getPortfolioRepository } from './repository'

/**
 * React hooks over the portfolio repository. Components never import data
 * arrays directly — they ask the repository for what they need, the same way
 * a Supabase-backed provider will be asked later.
 */

export function usePortfolioItems(categoryId?: string): PortfolioItem[] {
  const repo = useMemo(() => getPortfolioRepository(), [])
  const [items, setItems] = useState<PortfolioItem[]>(() =>
    categoryId ? [] : getCachedPortfolioItems().filter((i) => i.published),
  )

  useEffect(() => {
    let alive = true
    repo.getPortfolioItems(categoryId).then((list) => {
      if (alive) setItems(list)
    })
    return () => {
      alive = false
    }
  }, [repo, categoryId])

  return items
}

export function usePortfolioCategories(): PortfolioCategory[] {
  const repo = useMemo(() => getPortfolioRepository(), [])
  const [categories, setCategories] = useState<PortfolioCategory[]>([])

  useEffect(() => {
    let alive = true
    repo.getPortfolioCategories().then((list) => {
      if (alive) setCategories(list)
    })
    return () => {
      alive = false
    }
  }, [repo])

  return categories
}

/** Items for one category, matched by URL slug (correct for UUID ids too). */
export function useItemsByCategory(slug: string): PortfolioItem[] {
  const repo = useMemo(() => getPortfolioRepository(), [])
  const [items, setItems] = useState<PortfolioItem[]>([])

  useEffect(() => {
    let alive = true
    repo.getItemsByCategory(slug).then((list) => {
      if (alive) setItems(list)
    })
    return () => {
      alive = false
    }
  }, [repo, slug])

  return items
}

export function useVideos(): VideoItem[] {
  const repo = useMemo(() => getPortfolioRepository(), [])
  const [videos, setVideos] = useState<VideoItem[]>([])

  useEffect(() => {
    let alive = true
    repo.getVideos().then((list) => {
      if (alive) setVideos(list)
    })
    return () => {
      alive = false
    }
  }, [repo])

  return videos
}

export function useFeaturedItems(): PortfolioItem[] {
  const repo = useMemo(() => getPortfolioRepository(), [])
  const [items, setItems] = useState<PortfolioItem[]>([])

  useEffect(() => {
    let alive = true
    repo.getFeaturedItems().then((list) => {
      if (alive) setItems(list)
    })
    return () => {
      alive = false
    }
  }, [repo])

  return items
}

/** Synchronous cached items (LCD + captions; no network round-trip). */
export function useCachedPortfolioItems(): PortfolioItem[] {
  return useMemo(() => getCachedPortfolioItems(), [])
}
