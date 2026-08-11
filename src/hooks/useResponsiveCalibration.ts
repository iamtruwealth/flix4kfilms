import { useMemo } from 'react'
import { useResponsiveQuality } from './useResponsiveQuality'
import type { CalibrationConfig } from '../lib/calibrationPresets'

export interface DeviceTier {
  /** Scroll track height in vh. */
  scrollLengthVh: number
  /** Multiplier on normalize.targetDiagonal (higher = smaller model). */
  cameraScaleFactor: number
  /** Camera FOV override (degrees). */
  cameraFov: number
  /** Multiplier on framing offsets. */
  framingFactor: number
}

const DESKTOP: DeviceTier = {
  scrollLengthVh: 1000,
  cameraScaleFactor: 1,
  cameraFov: 42,
  framingFactor: 1,
}

const MOBILE: DeviceTier = {
  scrollLengthVh: 200,
  cameraScaleFactor: 0.7,
  cameraFov: 52,
  framingFactor: 1,
}

/**
 * Merges the base calibration with device-tier overrides.
 * Desktop uses the calibration as-is; tablet and mobile scale
 * the scroll length, camera size, and FOV for the smaller viewport.
 */
export function useResponsiveCalibration(
  cfg: CalibrationConfig,
): CalibrationConfig {
  const { isMobile } = useResponsiveQuality(2)

  return useMemo(() => {
    const tier = isMobile ? MOBILE : DESKTOP
    return {
      ...cfg,
      scene: {
        ...cfg.scene,
        scrollLengthVh: tier.scrollLengthVh,
        cameraFov: tier.cameraFov,
      },
      normalize: {
        ...cfg.normalize,
        targetDiagonal: cfg.normalize.targetDiagonal * tier.cameraScaleFactor,
      },
    }
  }, [cfg, isMobile])
}

/**
 * Returns the raw device tier values so the dot field / silhouettes
 * can use simplified settings on mobile without being forced off.
 */
export function useDeviceTier(): DeviceTier {
  const { isMobile } = useResponsiveQuality(2)
  return isMobile ? MOBILE : DESKTOP
}
