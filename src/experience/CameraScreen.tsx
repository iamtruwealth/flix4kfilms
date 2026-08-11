import { useLayoutEffect, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getCachedPortfolioItems } from '../portfolio/repository'
import { contentCache } from '../lib/contentCache'
import { useStore } from '../lib/store'
import { getRawProgress } from '../lib/scrollStore'
import { calibrationStore } from '../lib/calibrationStore'
import { debugStore } from '../lib/debugStore'
import { photoIndex, screenIntensity } from '../scroll/scrollState'
import { paintImageInto } from '../lib/lcdArt'

/** Pixel density of the LCD canvas (px per model unit). */
const PX_PER_UNIT = 200
const MAX_CANVAS = 2048

/** Module-level image cache so the per-frame LCD loop never re-fetches. */
const imageCache = new Map<string, HTMLImageElement>()
const imageLoaders = new Map<string, Promise<void>>()

function getLoadedImage(url: string): HTMLImageElement | null {
  return imageCache.get(url) ?? null
}

function ensureImageLoaded(url: string): void {
  if (imageCache.has(url) || imageLoaders.has(url)) return
  const loader = new Promise<void>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageCache.set(url, img)
      resolve()
    }
    img.onerror = () => resolve()
    img.src = url
  })
  imageLoaders.set(url, loader)
}

/**
 * The camera's rear LCD. A single canvas texture is redrawn imperatively,
 * once per photo, so nothing on the React tree re-renders during the reveal.
 * Geometry/pose/intensity/content are all recomputed per-frame from the
 * calibration store (works live with the debug panel `D`).
 *
 * The canvas resolution follows the LCD plane aspect (no stretching), and the
 * photograph is fitted inside the plane via the `content` calibration
 * (letterbox + offsets) — the photo can never escape the physical screen.
 *
 * Only real photographs are shown. All portfolio images are preloaded as soon
 * as the catalog is known (never on the scroll path), so by the time the LCD
 * reaches a frame it is usually already painted. If a photo is not ready yet
 * the screen stays dark — no procedural placeholder, no chrome.
 */
export function CameraScreen() {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  const planeRef = useRef<THREE.Mesh>(null)

  // Preload the whole catalog the moment it is known (cache subscription also
  // catches the local→Supabase swap after hydration). ensureImageLoaded
  // dedupes, so re-runs are cheap and never refetch.
  const cache = useStore(contentCache)
  useEffect(() => {
    for (const item of cache.items) {
      if (item.imageUrl) ensureImageLoaded(item.imageUrl)
    }
  }, [cache])

  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 16
    canvas.height = 10
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return { canvas, texture }
  }, [])

  const lastIndex = useRef(-2)
  const paintedUrl = useRef<string | null>(null)

  useLayoutEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])

  useFrame(() => {
    const progress = getRawProgress()
    const cfg = calibrationStore.get()
    const debug = debugStore.get()

    const items = getCachedPortfolioItems()
    const count = items.length
    let index = photoIndex(progress, cfg.phases, count)
    if (debug.lcdPreview && debug.forcedPhotoIndex != null) {
      index = Math.min(count - 1, Math.max(-1, debug.forcedPhotoIndex))
    }

    // Keep canvas resolution matched to the plane aspect (no stretching).
    const lcd = cfg.lcd
    const targetW = Math.min(MAX_CANVAS, Math.max(16, Math.round(PX_PER_UNIT * lcd.width)))
    const targetH = Math.min(MAX_CANVAS, Math.max(16, Math.round(PX_PER_UNIT * lcd.height)))
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW
      canvas.height = targetH
    }

    const item = index >= 0 ? items[index] : undefined
    const url = item?.imageUrl ?? null

    // Kick off image loading as soon as the frame needs it (never await in
    // the render loop). Normally preloaded already — this is the fallback.
    if (url) ensureImageLoaded(url)

    const img = url ? getLoadedImage(url) : null
    const indexChanged = index !== lastIndex.current
    const imageJustLoaded = url !== null && url !== paintedUrl.current && img !== null

    if (indexChanged || imageJustLoaded) {
      const ctx = canvas.getContext('2d')!
      if (index < 0 || !item || !img) {
        // Nothing to show yet — a dark screen, never a placeholder.
        blank(canvas)
      } else {
        const rect = contentRect(
          targetW,
          targetH,
          cfg.content.aspect,
          cfg.content.scale,
          cfg.content.x,
          cfg.content.y,
        )
        paintImageInto(ctx, img, targetW, targetH, rect, false)
      }
      texture.needsUpdate = true
      lastIndex.current = index
      // Only "claimed" once a real photo is on screen; while blanking, keep
      // paintedUrl null so the arrival of the image triggers a repaint.
      paintedUrl.current = img ? url : null
    }

    const glow = screenIntensity(progress, cfg.phases)
    const mat = materialRef.current
    const plane = planeRef.current
    if (!mat || !plane) return

    mat.opacity = Math.min(1, glow * 0.92 + lcd.lighten)
    // depthBias floats the plane OUT of the rear panel (negative z), clear of
    // z-fighting against the back shell. Positive bias = further outward.
    plane.position.set(lcd.x, lcd.y, lcd.z - lcd.depthBias)
    plane.rotation.set(lcd.rotationX, lcd.rotationY, lcd.rotationZ)
    plane.scale.set(lcd.width, lcd.height, 1)
  })

  return (
    <mesh ref={planeRef} renderOrder={3}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        opacity={0}
        toneMapped={false}
        side={THREE.DoubleSide}
        depthWrite={false}
        color="#ffffff"
      />
    </mesh>
  )
}

/**
 * Compute the rectangle (in canvas px) the photograph occupies inside the
 * LCD, given the content calibration. `aspect` 0 → inherit the plane aspect.
 */
function contentRect(
  W: number,
  H: number,
  aspect: number,
  scale: number,
  offsetX: number,
  offsetY: number,
): { x: number; y: number; w: number; h: number } {
  const a = aspect > 0 ? aspect : W / H
  let w = W
  let h = w / a
  if (h > H) {
    h = H
    w = h * a
  }
  w *= scale
  h *= scale
  const x = (W - w) / 2 + offsetX * W
  const y = (H - h) / 2 - offsetY * H
  return { x, y, w, h }
}

function blank(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = '#050505'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}
