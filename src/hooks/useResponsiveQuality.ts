import { useEffect, useMemo, useState } from 'react'

export type Quality = 'HIGH' | 'MEDIUM' | 'LOW'

export interface ResponsiveQuality {
  quality: Quality
  /** DPR we should actually render at (already clamped by calibration). */
  dpr: number
  isMobile: boolean
  /** Hint for the renderer to trade fidelity for framerate. */
  reducedShadows: boolean
}

/**
 * Device/model quality tiering. Desktop is the primary experience; mobile
 * still preserves the camera concept but at a clamped DPR and reduced shadow
 * cost. Phase-1 heuristic only — calibration-driven presets come later.
 */
export function useResponsiveQuality(maxDpr: number): ResponsiveQuality {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    dpr: typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
  }))

  useEffect(() => {
    const onResize = () =>
      setViewport({ width: window.innerWidth, dpr: window.devicePixelRatio || 1 })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return useMemo(() => {
    const isMobile = viewport.width < 768
    const dpr = Math.min(viewport.dpr, maxDpr)
    const quality: Quality = isMobile ? 'LOW' : viewport.dpr <= 1.5 ? 'HIGH' : 'MEDIUM'
    return { quality, dpr, isMobile, reducedShadows: isMobile }
  }, [viewport, maxDpr])
}