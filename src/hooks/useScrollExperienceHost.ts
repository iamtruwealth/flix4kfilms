import { useMemo, type RefObject } from 'react'
import { useScrollTrigger } from './useScrollTrigger'
import { useCalibrationConfig } from '../lib/calibrationStore'
import { useReducedMotion } from './useReducedMotion'

export interface ScrollHost {
  trackRef: RefObject<HTMLDivElement | null>
  /** False when reduced motion is preferred — scroll is disabled entirely. */
  enabled: boolean
  /** Track height in vh (compressed to a single viewport when disabled). */
  scrollLengthVh: number
}

/**
 * The scroll host: the tall track element that maps document scroll to
 * 0..1 progress. When reduced motion is preferred the experience collapses to
 * a static stage (progress pinned at 0) and the track is one viewport tall.
 */
export function useScrollExperienceHost(): ScrollHost {
  const reduced = useReducedMotion()
  const enabled = !reduced
  const cfg = useCalibrationConfig()
  const trackRef = useScrollTrigger(enabled)
  const scrollLengthVh = enabled ? cfg.scene.scrollLengthVh : 100

  return useMemo(
    () => ({ trackRef, enabled, scrollLengthVh }),
    [trackRef, enabled, scrollLengthVh],
  )
}