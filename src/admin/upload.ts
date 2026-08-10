import { buildStoragePath, safeStorageName, type StorageKind } from '../portfolio/storage'
import { getSupabaseClient } from '../lib/supabaseClient'

/**
 * Client-side upload validation + storage path construction.
 *
 * Validation is a UX gate, not a security boundary — Storage policies + MIME
 * checks on the Supabase side are the real controls. We keep the allowlist
 * tight anyway so garbage never reaches the bucket.
 */

export const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const
export const VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime'] as const

/** Hard cap for a single image upload. */
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024
/** Hard cap for a single video upload (2 GiB — the resumable path exists for these). */
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024
/** Files below this size use the simple upload; larger go resumable (TUS). */
export const RESUMABLE_THRESHOLD_BYTES = 6 * 1024 * 1024

export type UploadFileKind = 'image' | 'video'

export type ValidationResult = { ok: true; kind: UploadFileKind } | { ok: false; error: string }

export function detectKind(file: File): UploadFileKind | null {
  if (IMAGE_MIME.includes(file.type as (typeof IMAGE_MIME)[number])) return 'image'
  if (VIDEO_MIME.includes(file.type as (typeof VIDEO_MIME)[number])) return 'video'
  return null
}

export function validateUpload(file: File): ValidationResult {
  const kind = detectKind(file)
  if (!kind) {
    return {
      ok: false,
      error: `"${file.name}" is not a supported file. Use JPEG, PNG, WebP, MP4, WebM or MOV.`,
    }
  }
  const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES
  if (file.size === 0) {
    return { ok: false, error: `"${file.name}" is empty.` }
  }
  if (file.size > max) {
    const limit = kind === 'image' ? '25 MB' : '2 GB'
    return { ok: false, error: `"${file.name}" exceeds the ${limit} limit.` }
  }
  return { ok: true, kind }
}

/** Build the storage object path for an upload. */
export function buildUploadPath(
  kind: UploadFileKind,
  categorySlug: string,
  year: string,
  originalName: string,
): string {
  const storageKind: StorageKind = kind === 'video' ? 'video' : 'image'
  const safe = safeStorageName(originalName)
  return buildStoragePath(storageKind, categorySlug, year, safe)
}

/** Object URL for a newly uploaded file (same shape the repo resolves later). */
export function uploadPreviewUrl(bucket: 'portfolio-images' | 'portfolio-videos', path: string): string {
  const client = getSupabaseClient()
  const base = import.meta.env.VITE_SUPABASE_URL
  if (!client || !base) return ''
  return `${base}/storage/v1/object/public/${bucket}/${path}`
}

/**
 * Upload a file to Supabase Storage.
 *
 * Small files use the simple `upload()`; large/video files go through the
 * resumable (TUS) path with `createSignedUploadUrl`, giving percentage
 * progress and retry-ability. Clean failure handling is the caller's job —
 * we never create a DB record from a failed upload here.
 */
export async function uploadToBucket(opts: {
  bucket: 'portfolio-images' | 'portfolio-videos'
  path: string
  file: File
  onProgress?: (pct: number) => void
}): Promise<{ path: string }> {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase is not configured — uploads are unavailable.')

  const { bucket, path, file, onProgress } = opts
  const isResumable = file.size >= RESUMABLE_THRESHOLD_BYTES

  if (!isResumable) {
    const { error } = await client.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })
    if (error) throw new Error(error.message)
    onProgress?.(100)
    return { path }
  }

  // Large/video files: token-based signed upload with real progress events.
  // The SDK has no TUS client, so we PUT to the signed URL via XHR to get
  // byte-level `onprogress`. `createSignedUploadUrl` returns a signed URL we
  // can also resume/retry against (valid 2h, same path).
  const { data: signed, error: signedError } = await client.storage
    .from(bucket)
    .createSignedUploadUrl(path)
  if (signedError || !signed) {
    throw new Error(signedError?.message ?? 'Could not start a resumable upload.')
  }

  await uploadViaSignedUrl(signed.signedUrl, file, onProgress)
  return { path }
}

/**
 * PUT a file to a signed upload URL with progress reporting.
 * Returns a promise that rejects with a descriptive error on failure.
 */
function uploadViaSignedUrl(
  signedUrl: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signedUrl)

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        onProgress(Math.round((ev.loaded / ev.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Upload failed (HTTP ${xhr.status}).`))
      }
    }
    xhr.onerror = () => reject(new Error('Network error during upload.'))
    xhr.onabort = () => reject(new Error('Upload aborted.'))

    xhr.send(file)
  })
}

/** Object preview URL for the browser (used by the dropzone before saving). */
export function localObjectUrl(file: File): string {
  return URL.createObjectURL(file)
}
