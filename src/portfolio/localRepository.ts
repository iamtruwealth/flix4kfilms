import type {
  AdminItemInput,
  AdminVideoInput,
  CategoryInput,
  PortfolioCategory,
  PortfolioItem,
  VideoItem,
} from './types'
import {
  LOCAL_PORTFOLIO_CATEGORIES,
  LOCAL_PORTFOLIO_ITEMS,
  LOCAL_VIDEOS,
} from './data'

/**
 * Local placeholder provider — the default until Supabase is wired in.
 * Stores state in memory so admin CRUD (used in local/dev) round-trips;
 * production admin writes target the Supabase provider instead.
 */
export class LocalPortfolioRepository {
  private readonly items: PortfolioItem[]
  private readonly categories: PortfolioCategory[]
  private readonly videos: VideoItem[]

  constructor(
    items: PortfolioItem[] = LOCAL_PORTFOLIO_ITEMS,
    categories: PortfolioCategory[] = LOCAL_PORTFOLIO_CATEGORIES,
    videos: VideoItem[] = LOCAL_VIDEOS,
  ) {
    this.items = items.map((i) => ({ ...i }))
    this.categories = categories.map((c) => ({ ...c }))
    this.videos = videos.map((v) => ({ ...v }))
  }

  getPortfolioItems(categoryId?: string): Promise<PortfolioItem[]> {
    const list = this.items
      .filter((i) => i.published)
      .filter((i) => (categoryId ? i.category === categoryId : true))
      .sort((a, b) => a.sortOrder - b.sortOrder)
    return Promise.resolve(list)
  }

  getPortfolioCategories(): Promise<PortfolioCategory[]> {
    return Promise.resolve(
      [...this.categories]
        .filter((c) => c.published)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    )
  }

  getVideos(): Promise<VideoItem[]> {
    return Promise.resolve(
      [...this.videos].filter((v) => v.published).sort((a, b) => a.sortOrder - b.sortOrder),
    )
  }

  getVideosByCategory(slug: string): Promise<VideoItem[]> {
    const cat = this.categories.find((c) => c.slug === slug)
    if (!cat) return Promise.resolve([])
    return Promise.resolve(
      [...this.videos]
        .filter((v) => v.published && v.categoryId === cat.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    )
  }

  getFeaturedItems(): Promise<PortfolioItem[]> {
    return this.getPortfolioItems().then((list) => list.filter((i) => i.featured))
  }

  getCachedPortfolioItems(): PortfolioItem[] {
    return this.items
  }

  getPortfolioItem(id: string): Promise<PortfolioItem | null> {
    return Promise.resolve(this.items.find((i) => i.id === id) ?? null)
  }

  getItemsByCategory(slug: string): Promise<PortfolioItem[]> {
    const cat = this.categories.find((c) => c.slug === slug)
    if (!cat) return Promise.resolve([])
    return this.getPortfolioItems(cat.id)
  }

  /** Admin views — include unpublished rows. */
  getAdminItems(): Promise<PortfolioItem[]> {
    return Promise.resolve([...this.items].sort((a, b) => a.sortOrder - b.sortOrder))
  }

  getAdminCategories(): Promise<PortfolioCategory[]> {
    return Promise.resolve([...this.categories].sort((a, b) => a.sortOrder - b.sortOrder))
  }

  getAdminVideos(): Promise<VideoItem[]> {
    return Promise.resolve([...this.videos].sort((a, b) => a.sortOrder - b.sortOrder))
  }

  createItem(input: AdminItemInput): Promise<PortfolioItem> {
    const item: PortfolioItem = {
      id: input.slug,
      title: input.title,
      caption: input.title,
      category: input.categoryId,
      imageUrl: input.imagePath ? `${input.imagePath}` : null,
      thumbnailUrl: input.thumbnailPath ?? null,
      year: input.year,
      description: input.description,
      sortOrder: input.sortOrder,
      published: input.published,
      featured: input.featured,
      variant: String(this.items.length + 1).padStart(2, '0'),
    }
    this.items.push(item)
    return Promise.resolve(item)
  }

  updateItem(id: string, patch: Partial<AdminItemInput>): Promise<PortfolioItem> {
    const existing = this.items.find((i) => i.id === id)
    if (!existing) return Promise.reject(new Error('Item not found'))
    const next: PortfolioItem = {
      ...existing,
      title: patch.title ?? existing.title,
      caption: patch.title ?? existing.caption,
      category: patch.categoryId ?? existing.category,
      imageUrl: patch.imagePath !== undefined ? patch.imagePath : existing.imageUrl,
      thumbnailUrl:
        patch.thumbnailPath !== undefined ? patch.thumbnailPath : existing.thumbnailUrl,
      year: patch.year ?? existing.year,
      description: patch.description ?? existing.description,
      sortOrder: patch.sortOrder ?? existing.sortOrder,
      published: patch.published ?? existing.published,
      featured: patch.featured ?? existing.featured,
    }
    const idx = this.items.findIndex((i) => i.id === id)
    this.items[idx] = next
    return Promise.resolve(next)
  }

  deleteItem(id: string): Promise<void> {
    const idx = this.items.findIndex((i) => i.id === id)
    if (idx === -1) return Promise.reject(new Error('Item not found'))
    this.items.splice(idx, 1)
    return Promise.resolve()
  }

  reorderItems(orderedIds: string[]): Promise<void> {
    const byId = new Map(this.items.map((i) => [i.id, i]))
    orderedIds.forEach((id, index) => {
      const item = byId.get(id)
      if (item) item.sortOrder = index + 1
    })
    return Promise.resolve()
  }

  createVideo(input: AdminVideoInput): Promise<VideoItem> {
    const video: VideoItem = {
      id: input.slug,
      title: input.title,
      year: input.year,
      description: input.description,
      videoUrl: input.videoPath,
      thumbnailUrl: input.thumbnailPath,
      youtubeUrl: input.youtubeUrl,
      categoryId: input.categoryId,
      duration: null,
      sortOrder: input.sortOrder,
      published: input.published,
      featured: input.featured,
    }
    this.videos.push(video)
    return Promise.resolve(video)
  }

  updateVideo(id: string, patch: Partial<AdminVideoInput>): Promise<VideoItem> {
    const existing = this.videos.find((v) => v.id === id)
    if (!existing) return Promise.reject(new Error('Video not found'))
    const next: VideoItem = {
      ...existing,
      title: patch.title ?? existing.title,
      year: patch.year ?? existing.year,
      description: patch.description ?? existing.description,
      videoUrl: patch.videoPath !== undefined ? patch.videoPath : existing.videoUrl,
      thumbnailUrl:
        patch.thumbnailPath !== undefined ? patch.thumbnailPath : existing.thumbnailUrl,
      youtubeUrl: patch.youtubeUrl !== undefined ? patch.youtubeUrl : existing.youtubeUrl,
      categoryId: patch.categoryId !== undefined ? patch.categoryId : existing.categoryId,
      sortOrder: patch.sortOrder ?? existing.sortOrder,
      published: patch.published ?? existing.published,
      featured: patch.featured ?? existing.featured,
    }
    const idx = this.videos.findIndex((v) => v.id === id)
    this.videos[idx] = next
    return Promise.resolve(next)
  }

  deleteVideo(id: string): Promise<void> {
    const idx = this.videos.findIndex((v) => v.id === id)
    if (idx === -1) return Promise.reject(new Error('Video not found'))
    this.videos.splice(idx, 1)
    return Promise.resolve()
  }

  createCategory(input: CategoryInput): Promise<PortfolioCategory> {
    const category: PortfolioCategory = {
      id: input.slug,
      name: input.name,
      slug: input.slug,
      description: input.description,
      sortOrder: input.sortOrder,
      published: input.published,
    }
    this.categories.push(category)
    return Promise.resolve(category)
  }

  updateCategory(id: string, patch: Partial<CategoryInput>): Promise<PortfolioCategory> {
    const existing = this.categories.find((c) => c.id === id)
    if (!existing) return Promise.reject(new Error('Category not found'))
    const next: PortfolioCategory = {
      ...existing,
      name: patch.name ?? existing.name,
      slug: patch.slug ?? existing.slug,
      description: patch.description ?? existing.description,
      sortOrder: patch.sortOrder ?? existing.sortOrder,
      published: patch.published ?? existing.published,
    }
    const idx = this.categories.findIndex((c) => c.id === id)
    this.categories[idx] = next
    return Promise.resolve(next)
  }

  deleteCategory(id: string): Promise<void> {
    const hasItems = this.items.some((i) => i.category === id)
    if (hasItems) return Promise.reject(new Error('Category has items'))
    const idx = this.categories.findIndex((c) => c.id === id)
    if (idx === -1) return Promise.reject(new Error('Category not found'))
    this.categories.splice(idx, 1)
    return Promise.resolve()
  }
}
