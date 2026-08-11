import { useEffect, useState } from 'react'
import type { PortfolioCategory, PortfolioItem, VideoItem } from '../portfolio/types'
import { getPortfolioRepository } from '../portfolio/repository'
import { useCacheSource } from '../portfolio/hooks'
import { createStore, useStore } from '../lib/store'

/**
 * Admin data hooks — the same repository boundary, but using the admin views
 * that include unpublished rows. Refetch when the provider swaps OR when an
 * admin mutation bumps the reload tick.
 */

const reloadStore = createStore({ tick: 0 })

/** Bump to force all admin lists to refetch after a mutation. */
export function refreshAdminData(): void {
  reloadStore.set({ tick: reloadStore.get().tick + 1 })
}

function useReloadTick(): number {
  return useStore(reloadStore).tick
}

/** Read the reload tick (tests assert refreshAdminData bumped it). */
export function getReloadTick(): number {
  return reloadStore.get().tick
}

export function useAdminItems(): PortfolioItem[] {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const source = useCacheSource()
  const tick = useReloadTick()

  useEffect(() => {
    let alive = true
    getPortfolioRepository()
      .getAdminItems()
      .then((list) => {
        if (alive) setItems(list)
      })
    return () => {
      alive = false
    }
  }, [source, tick])

  return items
}

export function useAdminVideos(): VideoItem[] {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const source = useCacheSource()
  const tick = useReloadTick()

  useEffect(() => {
    let alive = true
    getPortfolioRepository()
      .getAdminVideos()
      .then((list) => {
        if (alive) setVideos(list)
      })
    return () => {
      alive = false
    }
  }, [source, tick])

  return videos
}

export function useAdminCategories(): PortfolioCategory[] {
  const [categories, setCategories] = useState<PortfolioCategory[]>([])
  const source = useCacheSource()
  const tick = useReloadTick()

  useEffect(() => {
    let alive = true
    getPortfolioRepository()
      .getAdminCategories()
      .then((list) => {
        if (alive) setCategories(list)
      })
    return () => {
      alive = false
    }
  }, [source, tick])

  return categories
}
