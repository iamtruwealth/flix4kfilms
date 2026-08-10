import { describe, expect, it } from 'vitest'
import {
  detectKind,
  validateUpload,
  buildUploadPath,
  RESUMABLE_THRESHOLD_BYTES,
} from './upload'

/** Upload validation contract: allowlist, size caps, kind detection, paths. */

function fileOf(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type })
}

describe('detectKind', () => {
  it('detects images by MIME type', () => {
    expect(detectKind(fileOf('a.jpg', 'image/jpeg', 1))).toBe('image')
    expect(detectKind(fileOf('a.png', 'image/png', 1))).toBe('image')
    expect(detectKind(fileOf('a.webp', 'image/webp', 1))).toBe('image')
  })

  it('detects videos by MIME type', () => {
    expect(detectKind(fileOf('a.mp4', 'video/mp4', 1))).toBe('video')
    expect(detectKind(fileOf('a.webm', 'video/webm', 1))).toBe('video')
    expect(detectKind(fileOf('a.mov', 'video/quicktime', 1))).toBe('video')
  })

  it('rejects unsupported types (RAW, HEIC, GIF, executables)', () => {
    expect(detectKind(fileOf('raw.arw', 'image/x-sony-arw', 1))).toBeNull()
    expect(detectKind(fileOf('heic', 'image/heic', 1))).toBeNull()
    expect(detectKind(fileOf('gif', 'image/gif', 1))).toBeNull()
    expect(detectKind(fileOf('exe', 'application/x-msdownload', 1))).toBeNull()
  })
})

describe('validateUpload', () => {
  it('accepts a normal JPEG', () => {
    expect(validateUpload(fileOf('a.jpg', 'image/jpeg', 1024))).toEqual({
      ok: true,
      kind: 'image',
    })
  })

  it('rejects empty files', () => {
    const result = validateUpload(fileOf('a.jpg', 'image/jpeg', 0))
    expect(result).toMatchObject({ ok: false })
  })

  it('rejects images over the image size cap', () => {
    const result = validateUpload(
      fileOf('big.jpg', 'image/jpeg', 26 * 1024 * 1024),
    )
    expect(result).toMatchObject({ ok: false })
    if (!result.ok) expect(result.error).toMatch(/25 MB/)
  })

  it('accepts videos under the video size cap', () => {
    const result = validateUpload(
      fileOf('reel.mp4', 'video/mp4', 100 * 1024 * 1024),
    )
    expect(result).toEqual({ ok: true, kind: 'video' })
  })

  it('rejects videos over the video size cap', () => {
    const result = validateUpload(
      fileOf('huge.mp4', 'video/mp4', 3 * 1024 * 1024 * 1024),
    )
    expect(result).toMatchObject({ ok: false })
  })

  it('rejects unsupported files with a clear message', () => {
    const result = validateUpload(fileOf('raw.arw', 'image/x-sony-arw', 10))
    expect(result).toMatchObject({ ok: false })
    if (!result.ok) expect(result.error).toContain('not a supported file')
  })
})

describe('buildUploadPath', () => {
  it('builds image paths under images/{slug}/{year}', () => {
    const path = buildUploadPath('image', 'Weddings', '2026', 'photo.jpg')
    expect(path).toMatch(/^images\/weddings\/2026\/[0-9a-f-]+\.jpg$/)
  })

  it('builds video paths under videos/{slug}/{year}', () => {
    const path = buildUploadPath('video', 'events', '2025', 'reel.MP4')
    expect(path).toMatch(/^videos\/events\/2025\/[0-9a-f-]+\.mp4$/)
  })

  it('is collision-safe across identical original names', () => {
    const a = buildUploadPath('image', 'portraits', '2024', 'same.jpg')
    const b = buildUploadPath('image', 'portraits', '2024', 'same.jpg')
    expect(a).not.toBe(b)
  })
})

describe('resumable threshold', () => {
  it('threshold is 6 MB', () => {
    expect(RESUMABLE_THRESHOLD_BYTES).toBe(6 * 1024 * 1024)
  })
})
