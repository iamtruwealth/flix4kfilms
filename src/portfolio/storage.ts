/**
 * Storage path + public URL helpers for Supabase Storage.
 * Pure string functions — no I/O — so they're trivially unit-testable.
 */

export type BucketName = 'portfolio-images' | 'portfolio-thumbnails' | 'portfolio-videos'

export type StorageKind = 'image' | 'thumbnail' | 'video'

export function bucketFor(kind: StorageKind): BucketName {
  switch (kind) {
    case 'image':
      return 'portfolio-images'
    case 'thumbnail':
      return 'portfolio-thumbnails'
    case 'video':
      return 'portfolio-videos'
  }
}

/** Slugify a category name for storage paths (a-z0-9 and hyphens). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Strip a leading slash so paths are always bucket-relative. */
export function cleanPath(path: string): string {
  return path.replace(/^\/+/, '')
}

/**
 * Build a predictable, collision-safe storage path:
 * `{kind-folder}/{categorySlug}/{year}/{safeName}`.
 * Never uses the raw original filename (the owner may re-upload the same
 * file name twice; immutable ids keep every version addressable).
 */
export function buildStoragePath(
  kind: StorageKind,
  categorySlug: string,
  year: string,
  safeName: string,
): string {
  const folder = kind === 'image' ? 'images' : kind === 'thumbnail' ? 'thumbs' : 'videos'
  const slug = slugify(categorySlug) || 'uncategorised'
  const yr = /^\d{4}$/.test(year) ? year : 'n-a'
  return cleanPath(`${folder}/${slug}/${yr}/${safeName}`)
}

/**
 * Build an immutable object name from an original file name:
 * `{uuid}{lowercasedExt}`. Extensions are whitelisted by the upload validator
 * before this runs, so we only sanitize casing here.
 */
export function safeStorageName(originalName: string, prefix?: string): string {
  const extMatch = /\.([a-z0-9]+)$/i.exec(originalName)
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ''
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`
  const base = prefix ? `${prefix}-${id}` : id
  return `${base}${ext}`
}

let cachedUrl: string | null = null

/** Resolve the Supabase project URL (env, or injected for tests). */
export function getSupabaseUrl(override?: string): string {
  if (override) return override
  if (cachedUrl) return cachedUrl
  cachedUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
  return cachedUrl
}

/** Public read URL for an object. */
export function publicObjectUrl(bucket: BucketName, path: string, baseUrl?: string): string {
  const base = getSupabaseUrl(baseUrl)
  if (!base) return ''
  return `${base}/storage/v1/object/public/${bucket}/${cleanPath(path)}`
}

/** Public URL with Supabase Image Transform params for a size-capped thumbnail. */
export function transformedImageUrl(
  bucket: 'portfolio-images' | 'portfolio-thumbnails',
  path: string,
  width?: number,
  height?: number,
  baseUrl?: string,
): string {
  const url = publicObjectUrl(bucket, path, baseUrl)
  if (!url) return ''
  if (!width && !height) return url
  const params = new URLSearchParams()
  if (width) params.set('width', String(width))
  if (height) params.set('height', String(height))
  return `${url}?${params.toString()}`
}
