import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AdminItemInput,
  AdminVideoInput,
  CategoryInput,
  PortfolioCategory,
  PortfolioItem,
  VideoItem,
} from './types'
import { publicObjectUrl, transformedImageUrl } from './storage'
import { contentCache } from '../lib/contentCache'

/**
 * Supabase-backed content provider.
 *
 * Public reads are always filtered to `published = true` server-side; admin
 * methods (`getAdmin*`, create/update/delete) assume RLS has already verified
 * the caller. Rows map 1:1 to the schema in `supabase/schema.sql` — all pure
 * mapping lives in the exported `map*Row` helpers so they're unit-testable
 * without a live database.
 */

/* ------------------------------------------------------------------ */
/* Row → domain mapping (pure)                                        */
/* ------------------------------------------------------------------ */

export interface ItemRow {
  id: string
  title: string
  category_id: string
  category_slug?: string | null
  description: string
  image_path: string | null
  thumbnail_path: string | null
  year: string
  sort_order: number
  published: boolean
  featured: boolean
  created_at?: string
}

export interface CategoryRow {
  id: string
  name: string
  slug: string
  description: string
  sort_order: number
  published: boolean
}

export interface VideoRow {
  id: string
  title: string
  year: string
  description: string
  video_path: string | null
  thumbnail_path: string | null
  youtube_url: string | null
  category_id: string | null
  sort_order: number
  published: boolean
  featured: boolean
  created_at?: string
}

export function mapCategoryRow(row: CategoryRow): PortfolioCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sortOrder: row.sort_order,
    published: row.published,
  }
}

export function mapItemRow(row: ItemRow, baseUrl?: string): PortfolioItem {
  return {
    id: row.id,
    title: row.title,
    caption: row.title,
    category: row.category_id,
    imageUrl: row.image_path ? publicObjectUrl('portfolio-images', row.image_path, baseUrl) : null,
    thumbnailUrl: row.thumbnail_path
      ? transformedImageUrl('portfolio-thumbnails', row.thumbnail_path, 640, 640, baseUrl)
      : null,
    year: row.year,
    description: row.description,
    sortOrder: row.sort_order,
    published: row.published,
    featured: row.featured,
    variant: String(row.sort_order).padStart(2, '0'),
  }
}

export function mapVideoRow(row: VideoRow, baseUrl?: string): VideoItem {
  return {
    id: row.id,
    title: row.title,
    year: row.year,
    description: row.description,
    videoUrl: row.video_path ? publicObjectUrl('portfolio-videos', row.video_path, baseUrl) : null,
    thumbnailUrl: row.thumbnail_path
      ? transformedImageUrl('portfolio-thumbnails', row.thumbnail_path, 640, 360, baseUrl)
      : null,
    youtubeUrl: row.youtube_url ?? null,
    categoryId: row.category_id ?? null,
    duration: null,
    sortOrder: row.sort_order,
    published: row.published,
    featured: row.featured,
  }
}

/* ------------------------------------------------------------------ */
/* Repository                                                         */
/* ------------------------------------------------------------------ */

export class SupabasePortfolioRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  /* ---------- public reads (published only) ---------- */

  async getPortfolioItems(categoryId?: string): Promise<PortfolioItem[]> {
    const rows = await this.fetchItems({ publishedOnly: true, categoryId })
    return rows.map((r) => mapItemRow(r)).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async getPortfolioCategories(): Promise<PortfolioCategory[]> {
    const rows = await this.fetchCategories({ publishedOnly: true })
    return rows.map((r) => mapCategoryRow(r)).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async getVideos(): Promise<VideoItem[]> {
    const rows = await this.fetchVideos({ publishedOnly: true })
    return rows.map((r) => mapVideoRow(r)).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async getVideosByCategory(slug: string): Promise<VideoItem[]> {
    const rows = await this.fetchVideosByCategorySlug(slug)
    return rows.map((r) => mapVideoRow(r)).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async getFeaturedItems(): Promise<PortfolioItem[]> {
    const rows = await this.fetchItems({ publishedOnly: true, featuredOnly: true })
    return rows.map((r) => mapItemRow(r)).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async getPortfolioItem(id: string): Promise<PortfolioItem | null> {
    const rows = await this.fetchItems({ publishedOnly: true, id })
    const row = rows[0]
    return row ? mapItemRow(row) : null
  }

  async getItemsByCategory(slug: string): Promise<PortfolioItem[]> {
    const rows = await this.fetchItemsBySlug(slug)
    return rows.map((r) => mapItemRow(r)).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  getCachedPortfolioItems(): PortfolioItem[] {
    return contentCache.get().items
  }

  /* ---------- admin views (include unpublished) ---------- */

  async getAdminItems(): Promise<PortfolioItem[]> {
    const rows = await this.fetchItems({})
    return rows.map((r) => mapItemRow(r)).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async getAdminCategories(): Promise<PortfolioCategory[]> {
    const rows = await this.fetchCategories({})
    return rows.map((r) => mapCategoryRow(r)).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async getAdminVideos(): Promise<VideoItem[]> {
    const rows = await this.fetchVideos({})
    return rows.map((r) => mapVideoRow(r)).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  /* ---------- admin writes ---------- */

  async createItem(input: AdminItemInput): Promise<PortfolioItem> {
    const { data, error } = await this.client
      .from('portfolio_items')
      .insert({
        title: input.title,
        category_id: input.categoryId,
        slug: input.slug,
        description: input.description,
        image_path: input.imagePath,
        thumbnail_path: input.thumbnailPath,
        year: input.year,
        sort_order: input.sortOrder,
        published: input.published,
        featured: input.featured,
      })
      .select()
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Create item failed')
    return mapItemRow(data as ItemRow)
  }

  async updateItem(
    id: string,
    patch: Partial<AdminItemInput>,
  ): Promise<PortfolioItem> {
    const { data, error } = await this.client
      .from('portfolio_items')
      .update(toItemPatch(patch))
      .eq('id', id)
      .select()
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Update item failed')
    return mapItemRow(data as ItemRow)
  }

  async deleteItem(id: string): Promise<void> {
    const { error } = await this.client.from('portfolio_items').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async reorderItems(orderedIds: string[]): Promise<void> {
    // Per-row UPDATEs: an UPSERT would propose new rows carrying only
    // { id, sort_order } and hit the NOT NULL constraints on title/slug
    // before the conflict path could update them.
    for (const [index, id] of orderedIds.entries()) {
      const { error } = await this.client
        .from('portfolio_items')
        .update({ sort_order: index + 1 })
        .eq('id', id)
      if (error) throw new Error(error.message)
    }
  }

  async createVideo(input: AdminVideoInput): Promise<VideoItem> {
    const { data, error } = await this.client
      .from('videos')
      .insert(buildVideoInsert(input, true))
      .select()
      .single()
    if (error) {
      // DB may not have youtube_url / category_id columns yet — retry stripped.
      const retry = await this.client
        .from('videos')
        .insert(buildVideoInsert(input, false))
        .select()
        .single()
      if (retry.error || !retry.data) throw new Error(retry.error?.message ?? 'Create video failed')
      return mapVideoRow(retry.data as VideoRow)
    }
    if (!data) throw new Error('Create video failed')
    return mapVideoRow(data as VideoRow)
  }

  async updateVideo(
    id: string,
    patch: Partial<AdminVideoInput>,
  ): Promise<VideoItem> {
    const { data, error } = await this.client
      .from('videos')
      .update(toVideoPatch(patch, true))
      .eq('id', id)
      .select()
      .single()
    if (error) {
      const retry = await this.client
        .from('videos')
        .update(toVideoPatch(patch, false))
        .eq('id', id)
        .select()
        .single()
      if (retry.error || !retry.data) throw new Error(retry.error?.message ?? 'Update video failed')
      return mapVideoRow(retry.data as VideoRow)
    }
    if (!data) throw new Error('Update video failed')
    return mapVideoRow(data as VideoRow)
  }

  async deleteVideo(id: string): Promise<void> {
    const { error } = await this.client.from('videos').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async createCategory(input: CategoryInput): Promise<PortfolioCategory> {
    const { data, error } = await this.client
      .from('portfolio_categories')
      .insert({
        name: input.name,
        slug: input.slug,
        description: input.description,
        sort_order: input.sortOrder,
        published: input.published,
      })
      .select()
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Create category failed')
    return mapCategoryRow(data as CategoryRow)
  }

  async updateCategory(
    id: string,
    patch: Partial<CategoryInput>,
  ): Promise<PortfolioCategory> {
    const { data, error } = await this.client
      .from('portfolio_categories')
      .update(toCategoryPatch(patch))
      .eq('id', id)
      .select()
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Update category failed')
    return mapCategoryRow(data as CategoryRow)
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.client.from('portfolio_categories').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  /* ---------- internals ---------- */

  private async fetchItems(opts: {
    publishedOnly?: boolean
    featuredOnly?: boolean
    categoryId?: string
    id?: string
  }): Promise<ItemRow[]> {
    let query = this.client
      .from('portfolio_items')
      .select('*')
      .order('sort_order', { ascending: true })
    if (opts.publishedOnly) query = query.eq('published', true)
    if (opts.featuredOnly) query = query.eq('featured', true)
    if (opts.categoryId) query = query.eq('category_id', opts.categoryId)
    if (opts.id) query = query.eq('id', opts.id)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as ItemRow[]
  }

  private async fetchItemsBySlug(slug: string): Promise<ItemRow[]> {
    const { data: categories, error: catErr } = await this.client
      .from('portfolio_categories')
      .select('id')
      .eq('slug', slug)
    if (catErr) throw new Error(catErr.message)
    const catId = categories?.[0]?.id
    if (!catId) return []
    return this.fetchItems({ publishedOnly: true, categoryId: catId })
  }

  private async fetchCategories(opts: {
    publishedOnly?: boolean
  }): Promise<CategoryRow[]> {
    let query = this.client
      .from('portfolio_categories')
      .select('*')
      .order('sort_order', { ascending: true })
    if (opts.publishedOnly) query = query.eq('published', true)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as CategoryRow[]
  }

  private async fetchVideos(opts: {
    publishedOnly?: boolean
  }): Promise<VideoRow[]> {
    let query = this.client
      .from('videos')
      .select('*')
      .order('sort_order', { ascending: true })
    if (opts.publishedOnly) query = query.eq('published', true)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as VideoRow[]
  }

  private async fetchVideosByCategorySlug(slug: string): Promise<VideoRow[]> {
    const { data: cat, error: catErr } = await this.client
      .from('portfolio_categories')
      .select('id')
      .eq('slug', slug)
      .single()
    if (catErr || !cat) return []
    const { data, error } = await this.client
      .from('videos')
      .select('*')
      .eq('category_id', cat.id)
      .eq('published', true)
      .order('sort_order', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []) as VideoRow[]
  }
}

/* ------------------------------------------------------------------ */
/* Patch builders — drop `undefined` so DB updates never touch those  */
/* columns, and ignore keys the admin UI doesn't edit.                */
/* ------------------------------------------------------------------ */

function toItemPatch(patch: Partial<AdminItemInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (patch.title !== undefined) out.title = patch.title
  if (patch.categoryId !== undefined) out.category_id = patch.categoryId
  if (patch.slug !== undefined) out.slug = patch.slug
  if (patch.description !== undefined) out.description = patch.description
  if (patch.imagePath !== undefined) out.image_path = patch.imagePath
  if (patch.thumbnailPath !== undefined) out.thumbnail_path = patch.thumbnailPath
  if (patch.year !== undefined) out.year = patch.year
  if (patch.sortOrder !== undefined) out.sort_order = patch.sortOrder
  if (patch.published !== undefined) out.published = patch.published
  if (patch.featured !== undefined) out.featured = patch.featured
  return out
}

function buildVideoInsert(input: AdminVideoInput, newCols: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {
    title: input.title,
    slug: input.slug,
    description: input.description,
    video_path: input.videoPath,
    thumbnail_path: input.thumbnailPath,
    year: input.year,
    sort_order: input.sortOrder,
    published: input.published,
    featured: input.featured,
  }
  if (newCols) {
    out.youtube_url = input.youtubeUrl
    out.category_id = input.categoryId
  }
  return out
}

function toVideoPatch(patch: Partial<AdminVideoInput>, newCols = true): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (patch.title !== undefined) out.title = patch.title
  if (patch.slug !== undefined) out.slug = patch.slug
  if (patch.description !== undefined) out.description = patch.description
  if (patch.videoPath !== undefined) out.video_path = patch.videoPath
  if (patch.thumbnailPath !== undefined) out.thumbnail_path = patch.thumbnailPath
  if (newCols) {
    if (patch.youtubeUrl !== undefined) out.youtube_url = patch.youtubeUrl
    if (patch.categoryId !== undefined) out.category_id = patch.categoryId
  }
  if (patch.year !== undefined) out.year = patch.year
  if (patch.sortOrder !== undefined) out.sort_order = patch.sortOrder
  if (patch.published !== undefined) out.published = patch.published
  if (patch.featured !== undefined) out.featured = patch.featured
  return out
}

function toCategoryPatch(patch: Partial<CategoryInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (patch.name !== undefined) out.name = patch.name
  if (patch.slug !== undefined) out.slug = patch.slug
  if (patch.description !== undefined) out.description = patch.description
  if (patch.sortOrder !== undefined) out.sort_order = patch.sortOrder
  if (patch.published !== undefined) out.published = patch.published
  return out
}
