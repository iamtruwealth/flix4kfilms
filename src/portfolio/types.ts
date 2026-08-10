/**
 * FLIX 4K — Portfolio content model.
 *
 * These records are what the UI consumes. Phase 2 ships with a local provider;
 * a future Supabase provider returns the same shapes (image/video URLs can be
 * remote storage paths). Nothing here ever points at a component.
 */

/** Publishable portfolio photograph record. */
export interface PortfolioItem {
  id: string
  title: string
  caption: string
  /** Category id (matches PortfolioCategory.id). */
  category: string
  /** Remote-ready image URL; null = render the procedural artwork instead. */
  imageUrl: string | null
  thumbnailUrl: string | null
  year: string
  description: string
  sortOrder: number
  published: boolean
  featured: boolean
  /** Procedural artwork seed (placeholder '01'..'NN' while imageUrl is null). */
  variant: string
}

export interface PortfolioCategory {
  id: string
  name: string
  slug: string
  description: string
  sortOrder: number
  published: boolean
}

export interface VideoItem {
  id: string
  title: string
  year: string
  description: string
  /** Remote-ready video URL; null until real content exists. */
  videoUrl: string | null
  thumbnailUrl: string | null
  duration: string | null
  sortOrder: number
  published: boolean
  featured: boolean
}

/** Input record for creating/updating a portfolio item (admin). */
export interface AdminItemInput {
  title: string
  categoryId: string
  slug: string
  description: string
  /** Storage object path (bucket-relative); the repo resolves it to a URL. */
  imagePath: string | null
  thumbnailPath: string | null
  year: string
  sortOrder: number
  published: boolean
  featured: boolean
}

/** Input record for creating/updating a video (admin). */
export interface AdminVideoInput {
  title: string
  slug: string
  description: string
  videoPath: string | null
  thumbnailPath: string | null
  year: string
  sortOrder: number
  published: boolean
  featured: boolean
}

/** Input record for creating/updating a category (admin). */
export interface CategoryInput {
  name: string
  slug: string
  description: string
  sortOrder: number
  published: boolean
}

/**
 * The minimal photo shape the deterministic frame painter needs.
 * Both the LCD and DOM tiles draw from this, so the artwork always matches.
 */
export interface FramePhoto {
  title: string
  caption: string
  year: string
  variant: string
}
