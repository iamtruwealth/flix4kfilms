import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  SupabasePortfolioRepository,
  mapItemRow,
  mapCategoryRow,
  mapVideoRow,
  type ItemRow,
  type CategoryRow,
  type VideoRow,
} from './supabaseRepository'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildStoragePath,
  bucketFor,
  publicObjectUrl,
  safeStorageName,
  slugify,
} from './storage'
import { contentCache, setCacheItems } from '../lib/contentCache'

/**
 * Fake Supabase client: records the table/queries exercised and returns
 * canned rows. Enough surface to prove the repository's filtering + mapping
 * contract without a live database.
 */

interface Filter {
  column: string
  value: unknown
}

interface QueryBuilder {
  eq: (column: string, value: unknown) => QueryBuilder
  order: () => QueryBuilder
  select: () => QueryBuilder
  insert: () => QueryBuilder
  update: () => QueryBuilder
  delete: () => QueryBuilder
  upsert: () => QueryBuilder
  single: () => Promise<{ data: unknown; error: { message: string } | null }>
  then: <T>(resolve: (v: { data: unknown; error: { message: string } | null }) => T) => Promise<T>
}

function makeFakeClient(opts: {
  items?: ItemRow[]
  categories?: CategoryRow[]
  videos?: VideoRow[]
  failOn?: string
}): { client: SupabaseClient; calls: { table: string; filters: Filter[] }[] } {
  const calls: { table: string; filters: Filter[] }[] = []

  const client = {
    from: vi.fn((table: string) => {
      const rows =
        table === 'portfolio_items'
          ? (opts.items ?? [])
          : table === 'portfolio_categories'
            ? (opts.categories ?? [])
            : table === 'videos'
              ? (opts.videos ?? [])
              : []

      const filters: Filter[] = []
      const respond = (single: boolean) => {
        calls.push({ table, filters: [...filters] })
        const error = opts.failOn === table ? { message: `boom on ${table}` } : null
        let data = rows.filter((r) =>
          filters.every((f) => (r as unknown as Record<string, unknown>)[f.column] === f.value),
        )
        if (single) data = data.slice(0, 1)
        return { data, error }
      }

      const builder: QueryBuilder = {
        eq: (column, value) => {
          filters.push({ column, value })
          return builder
        },
        order: () => builder,
        select: () => builder,
        insert: () => builder,
        update: () => builder,
        delete: () => builder,
        upsert: () => builder,
        single: () => Promise.resolve(respond(true)),
        then: (resolve) => Promise.resolve(respond(false)).then(resolve),
      }
      return builder
    }),
  }

  return { client: client as unknown as SupabaseClient, calls }
}

const BASE_URL = 'https://demo.supabase.co'

const ITEMS: ItemRow[] = [
  {
    id: 'row-1',
    title: 'Frame 01',
    category_id: 'cat-a',
    description: 'First frame',
    image_path: 'images/weddings/2026/abc.jpg',
    thumbnail_path: 'thumbs/weddings/2026/abc.jpg',
    year: '2026',
    sort_order: 2,
    published: true,
    featured: true,
  },
  {
    id: 'row-2',
    title: 'Frame 02',
    category_id: 'cat-b',
    description: 'Second frame',
    image_path: null,
    thumbnail_path: null,
    year: '2025',
    sort_order: 1,
    published: false,
    featured: false,
  },
  {
    id: 'row-3',
    title: 'Frame 03',
    category_id: 'cat-a',
    description: 'Third frame',
    image_path: null,
    thumbnail_path: null,
    year: '2024',
    sort_order: 3,
    published: true,
    featured: false,
  },
]

const CATEGORIES: CategoryRow[] = [
  {
    id: 'cat-a',
    name: 'WEDDINGS',
    slug: 'weddings',
    description: 'Ceremony',
    sort_order: 1,
    published: true,
  },
  {
    id: 'cat-b',
    name: 'EVENTS',
    slug: 'events',
    description: 'Live',
    sort_order: 2,
    published: false,
  },
]

const VIDEOS: VideoRow[] = [
  {
    id: 'v-1',
    title: 'Reel 01',
    year: '2026',
    description: 'A reel',
    video_path: 'videos/weddings/2026/reel.mp4',
    thumbnail_path: null,
    sort_order: 1,
    published: true,
    featured: false,
  },
]

function makeRepo(opts: {
  items?: ItemRow[]
  categories?: CategoryRow[]
  videos?: VideoRow[]
  failOn?: string
}) {
  const { client, calls } = makeFakeClient(opts)
  return { repo: new SupabasePortfolioRepository(client), calls }
}

describe('storage helpers (pure)', () => {
  it('maps storage kinds to buckets', () => {
    expect(bucketFor('image')).toBe('portfolio-images')
    expect(bucketFor('thumbnail')).toBe('portfolio-thumbnails')
    expect(bucketFor('video')).toBe('portfolio-videos')
  })

  it('slugifies category names for storage paths', () => {
    expect(slugify('Weddings & More!')).toBe('weddings-more')
    expect(slugify('  portraits  ')).toBe('portraits')
    expect(slugify('')).toBe('')
  })

  it('builds predictable, immutable storage paths', () => {
    expect(buildStoragePath('image', 'Weddings', '2026', 'x.jpg')).toBe(
      'images/weddings/2026/x.jpg',
    )
    expect(buildStoragePath('video', 'events', '2025', 'y.mp4')).toBe(
      'videos/events/2025/y.mp4',
    )
  })

  it('sanitizes original filenames to unique ids with lowercased ext', () => {
    const name = safeStorageName('My Photo.JPG', 'pre')
    expect(name).toMatch(/^pre-[0-9a-f-]+\.jpg$/)
    const noExt = safeStorageName('no-extension')
    expect(noExt).not.toContain('.')
  })

  it('builds public object URLs', () => {
    expect(publicObjectUrl('portfolio-images', 'images/a/b.jpg', BASE_URL)).toBe(
      'https://demo.supabase.co/storage/v1/object/public/portfolio-images/images/a/b.jpg',
    )
  })
})

describe('row mapping (pure)', () => {
  it('maps an item row with image + thumbnail to public URLs', () => {
    const item = mapItemRow(ITEMS[0], BASE_URL)
    expect(item.id).toBe('row-1')
    expect(item.category).toBe('cat-a')
    expect(item.imageUrl).toBe(
      'https://demo.supabase.co/storage/v1/object/public/portfolio-images/images/weddings/2026/abc.jpg',
    )
    expect(item.thumbnailUrl).toContain('/storage/v1/object/public/portfolio-thumbnails/')
    expect(item.thumbnailUrl).toContain('width=640')
    expect(item.published).toBe(true)
  })

  it('leaves imageUrl null when no image_path', () => {
    expect(mapItemRow(ITEMS[1], BASE_URL).imageUrl).toBeNull()
  })

  it('maps category + video rows', () => {
    expect(mapCategoryRow(CATEGORIES[0])).toMatchObject({
      id: 'cat-a',
      name: 'WEDDINGS',
      slug: 'weddings',
    })
    const video = mapVideoRow(VIDEOS[0], BASE_URL)
    expect(video.videoUrl).toContain('/portfolio-videos/')
    expect(video.duration).toBeNull()
  })
})

describe('SupabasePortfolioRepository (fake client)', () => {
  afterEach(() => {
    setCacheItems([], 'local')
  })

  beforeEach(() => {
    setCacheItems([], 'local')
  })

  it('filters public reads to published items and sorts by sort_order', async () => {
    const { repo } = makeRepo({ items: ITEMS, categories: CATEGORIES })
    const items = await repo.getPortfolioItems()
    expect(items.map((i) => i.id)).toEqual(['row-1', 'row-3'])
    expect(items.every((i) => i.published)).toBe(true)
  })

  it('filters public items by category id', async () => {
    const { repo } = makeRepo({ items: ITEMS, categories: CATEGORIES })
    const items = await repo.getPortfolioItems('cat-a')
    expect(items.map((i) => i.id)).toEqual(['row-1', 'row-3'])
  })

  it('returns published categories only', async () => {
    const { repo } = makeRepo({ items: ITEMS, categories: CATEGORIES })
    const cats = await repo.getPortfolioCategories()
    expect(cats.map((c) => c.id)).toEqual(['cat-a'])
  })

  it('hydrates the content cache from admin views', async () => {
    const { repo } = makeRepo({ items: ITEMS, categories: CATEGORIES })
    const items = await repo.getAdminItems()
    expect(items).toHaveLength(3)
    expect(contentCache.get().items).toHaveLength(3)
    expect(contentCache.get().source).toBe('supabase')
    expect(repo.getCachedPortfolioItems()).toHaveLength(3)
  })

  it('returns published videos only', async () => {
    const { repo } = makeRepo({ videos: VIDEOS })
    const videos = await repo.getVideos()
    expect(videos.map((v) => v.id)).toEqual(['v-1'])
  })

  it('throws when the underlying query fails', async () => {
    const { repo } = makeRepo({ items: ITEMS, categories: CATEGORIES, failOn: 'portfolio_items' })
    await expect(repo.getPortfolioItems()).rejects.toThrow(/boom on portfolio_items/)
  })
})
