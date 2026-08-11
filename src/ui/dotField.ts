export interface DotPos {
  x: number
  y: number
}

/**
 * Centered dot grid. The first dot sits at `gap/2` from each edge; spacing is
 * exactly `gap` on both axes. Pure — used by the canvas renderer.
 */
export function computeDotPositions(width: number, height: number, gap: number): DotPos[] {
  if (width <= gap || height <= gap) return []
  const dots: DotPos[] = []
  for (let y = gap / 2; y <= height - gap / 2; y += gap) {
    for (let x = gap / 2; x <= width - gap / 2; x += gap) {
      dots.push({ x, y })
    }
  }
  return dots
}

/** 1 at distance 0 → 0 at distance >= hoverRadius. */
export function dotFade(distance: number, hoverRadius: number): number {
  if (hoverRadius <= 0 || distance >= hoverRadius) return 0
  const t = distance / hoverRadius
  return (1 - t) * (1 - t)
}
