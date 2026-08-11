import type { FramePhoto } from '../portfolio/types'

/**
 * Shared deterministic monochrome frame painter.
 *
 * The LCD (CameraScreen) and the DOM portfolio tiles draw through this single
 * function, so the frame on the camera's screen is always the same artwork as
 * its page tile. Everything is a seeded pure function of the photo — same
 * photo, same image, forever. No randomness at runtime.
 */

/** Deterministic pseudo-random in [0,1) from an integer seed. */
function rand(seed: number, n: number): number {
  const x = Math.sin(seed + n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export interface FrameOpts {
  /** Greyscale boost 0..1 (LCD adds glow on top of this). */
  brightness?: number
}

/**
 * Paints a full-bleed fine-art monochrome frame into `ctx` sized W×H.
 * Deterministic per photo variant. No chrome — use paintChrome for LCD UI.
 */
export function paintFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  photo: FramePhoto,
  opts: FrameOpts = {},
): void {
  const ix = Number(photo.variant)
  const seed = ix * 7919
  const brightness = opts.brightness ?? 1

  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v)
  const g = (v: number) => clamp(v * brightness)

  // 1 — tonal ramp: directional "key light" from upper-left, tilted per frame
  const lg = ctx.createLinearGradient(0, 0, W * 1.1, H * (0.55 + 0.12 * rand(seed, 1)))
  const baseTone = 14 + ix * 3
  lg.addColorStop(0, `rgb(${g(baseTone + 30)},${g(baseTone + 30)},${g(baseTone + 30)})`)
  lg.addColorStop(0.45, `rgb(${g(baseTone + 8)},${g(baseTone + 8)},${g(baseTone + 8)})`)
  lg.addColorStop(1, `rgb(${g(baseTone - 6)},${g(baseTone - 6)},${g(baseTone - 6)})`)
  ctx.fillStyle = lg
  ctx.fillRect(0, 0, W, H)

  // 2 — composition. Odd frames: vertical subjects; even frames: horizons.
  if (ix % 2 === 1) {
    // vertical silhouette with a soft light seam on one edge
    const side = rand(seed, 2) > 0.5 ? -1 : 1
    const bw = W * (0.16 + 0.1 * rand(seed, 3))
    const x0 = side < 0 ? W * 0.08 : W * (0.92 - bw / W)
    const sog = ctx.createLinearGradient(x0, 0, x0 + bw * 2.4, H)
    sog.addColorStop(0, `rgb(${g(baseTone - 10)},${g(baseTone - 10)},${g(baseTone - 10)})`)
    sog.addColorStop(0.55, `rgb(${g(baseTone + 2)},${g(baseTone + 2)},${g(baseTone + 2)})`)
    sog.addColorStop(1, `rgb(${g(baseTone - 14)},${g(baseTone - 14)},${g(baseTone - 14)})`)
    ctx.fillStyle = sog
    ctx.beginPath()
    ctx.moveTo(x0, 0)
    ctx.lineTo(x0 + bw, H)
    ctx.lineTo(x0 + bw * 3.2, H)
    ctx.lineTo(x0 + bw * 2.4, 0)
    ctx.closePath()
    ctx.fill()
  } else {
    // horizon: soft gradient sky meeting a heavier ground
    const hy = H * (0.34 + 0.2 * rand(seed, 4))
    const sky = ctx.createLinearGradient(0, 0, 0, hy)
    sky.addColorStop(0, `rgb(${g(baseTone + 26)},${g(baseTone + 26)},${g(baseTone + 26)})`)
    sky.addColorStop(1, `rgb(${g(baseTone - 2)},${g(baseTone - 2)},${g(baseTone - 2)})`)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, hy)
    const grd = ctx.createLinearGradient(0, hy, 0, H)
    grd.addColorStop(0, `rgb(${g(baseTone - 4)},${g(baseTone - 4)},${g(baseTone - 4)})`)
    grd.addColorStop(1, `rgb(${g(baseTone - 16)},${g(baseTone - 16)},${g(baseTone - 16)})`)
    ctx.fillStyle = grd
    ctx.fillRect(0, hy, W, H - hy)
    // horizon line with soft glow
    const hlg = ctx.createLinearGradient(0, hy - H * 0.03, 0, hy + H * 0.03)
    hlg.addColorStop(0, 'rgba(255,255,255,0)')
    hlg.addColorStop(0.5, `rgba(255,255,255,${0.22 * brightness})`)
    hlg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = hlg
    ctx.fillRect(0, hy - H * 0.03, W, H * 0.06)
  }

  // 3 — key-light bloom: big soft radial near the light source
  const lx = W * 0.3, ly = H * 0.24
  const bloom = ctx.createRadialGradient(lx, ly, 0, lx, ly, W * 0.75)
  bloom.addColorStop(0, `rgba(255,255,255,${0.14 * brightness})`)
  bloom.addColorStop(0.4, 'rgba(255,255,255,0)')
  bloom.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = bloom
  ctx.fillRect(0, 0, W, H)

  // 4 — light leak: faint streak from the top edge
  const leakX = W * (0.2 + 0.6 * rand(seed, 7))
  const leak = ctx.createLinearGradient(0, 0, 0, H * 0.5)
  leak.addColorStop(0, `rgba(255,255,255,${0.08 * brightness})`)
  leak.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = leak
  ctx.beginPath()
  ctx.moveTo(leakX - W * 0.06, 0)
  ctx.lineTo(leakX + W * 0.06, 0)
  ctx.lineTo(leakX + W * 0.22, H * 0.5)
  ctx.lineTo(leakX - W * 0.16, H * 0.5)
  ctx.closePath()
  ctx.fill()

  // 5 — film grain (deterministic)
  ctx.fillStyle = `rgba(255,255,255,${0.05 * brightness})`
  for (let i = 0; i < W * H * 0.0012; i++) {
    const gx = rand(seed, 50 + i) * W
    const gy = rand(seed, 250 + i) * H
    ctx.fillRect(gx, gy, 1.6, 1.6)
  }

  // 6 — vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.98)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)
}

/**
 * LCD chrome (frame counter only) — drawn LAST, always inside the screen
 * bounds. Photo names/captions are intentionally NOT painted: the UX is
 * name-free, so only the deterministic frame counter is shown.
 */
export function paintChrome(ctx: CanvasRenderingContext2D, W: number, _H: number, photo: FramePhoto) {
  const ix = Number(photo.variant)
  const pad = Math.max(24, W * 0.045)
  const metaSize = Math.max(15, W * 0.02)
  const idxSize = Math.max(64, W * 0.09)

  ctx.fillStyle = 'rgba(245,245,245,0.96)'
  ctx.font = `${metaSize}px "Helvetica Neue", Arial, sans-serif`
  ctx.fillText(`FR ${String(ix).padStart(2, '0')}`, pad, pad + metaSize)

  ctx.font = `${idxSize}px "Helvetica Neue", Arial, sans-serif`
  ctx.fillStyle = 'rgba(250,250,250,0.9)'
  ctx.fillText(String(ix).padStart(2, '0'), pad, pad + idxSize * 1.35)
}

/**
 * Paints the artwork inside an arbitrary rectangle `rect` (content framing).
 * The art is clipped to the rect and scaled to fit, so the photograph can be
 * letterboxed/moved within the LCD while chrome always stays on the canvas.
 */
export function paintFrameInto(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  photo: FramePhoto,
  rect: { x: number; y: number; w: number; h: number },
  opts: FrameOpts = {},
  chrome = true,
): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.w, rect.h)
  ctx.clip()
  ctx.translate(rect.x, rect.y)
  ctx.scale(rect.w / W, rect.h / H)
  paintFrame(ctx, W, H, photo, opts)
  ctx.restore()
  if (chrome) paintChrome(ctx, W, H, photo)
}

/**
 * Paints a real photograph inside an arbitrary rectangle `rect` (content
 * framing), cover-fitted (cropped, never distorted). Used by the LCD whenever
 * the item has an uploaded `imageUrl`; the chrome stays on top so the frame
 * counter remains consistent with the procedural fallback.
 */
export function paintImageInto(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  W: number,
  H: number,
  rect: { x: number; y: number; w: number; h: number },
  chrome = true,
  photo?: FramePhoto,
): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.w, rect.h)
  ctx.clip()
  const iw = (img as HTMLImageElement).naturalWidth || (img as HTMLImageElement).width || W
  const ih = (img as HTMLImageElement).naturalHeight || (img as HTMLImageElement).height || H
  if (iw > 0 && ih > 0) {
    const s = Math.max(rect.w / iw, rect.h / ih)
    const dw = iw * s
    const dh = ih * s
    ctx.drawImage(img, rect.x + (rect.w - dw) / 2, rect.y + (rect.h - dh) / 2, dw, dh)
  }
  ctx.restore()
  if (chrome && photo) paintChrome(ctx, W, H, photo)
}
