import { useMemo, type RefObject } from 'react'
import { useScrollTrigger } from './useScrollTrigger'
import { useCalibrationConfig } from '../lib/calibrationStore'
import { useResponsiveCalibration } from './useResponsiveCalibration'
import { useReducedMotion } from './useReducedMotion'

export interface ScrollHost {
  trackRef: RefObject<HTMLDivElement | null>
  /** False when reduced motion is preferred — scroll is disabled entirely. */
  enabled: boolean
  /** Track height in vh (compressed to a single viewport when disabled). */
  scrollLengthVh: number
}

export function useScrollExperienceHost(): ScrollHost {
  const reduced = useReducedMotion()
  const enabled = !reduced
  const cfg = useCalibrationConfig()
  const resp = useResponsiveCalibration(cfg)
  const trackRef = useScrollTrigger(enabled)
  const scrollLengthVh = enabled ? resp.scene.scrollLengthVh : 100

  return useMemo(
    () => ({ trackRef, enabled, scrollLengthVh }),
    [trackRef, enabled, scrollLengthVh],
  )
}
