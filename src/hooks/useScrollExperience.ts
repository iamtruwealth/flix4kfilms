import { useMemo } from 'react'
import { useScrollProgress } from '../lib/scrollStore'
import { useCalibrationConfig } from '../lib/calibrationStore'
import { useResponsiveCalibration } from './useResponsiveCalibration'
import {
  cameraHandoff,
  cameraPan,
  cameraProgress,
  cameraDistance,
  cameraYaw,
  introOpacity,
  lcdCursor,
  navReveal,
  phaseAt,
  photoIndex,
  portfolioReveal,
  screenIntensity,
  stageOpacity,
  hintOpacity,
} from '../scroll/scrollState'

export interface ScrollState {
  progress: number
  phase: ReturnType<typeof phaseAt>
  cameraProgress: number
  yaw: number
  distance: number
  pan: number
  photoIndex: number
  lcdCursor: number
  screenIntensity: number
  introOpacity: number
  hintOpacity: number
  handoff: number
  navReveal: number
  portfolioReveal: number
  stageOpacity: number
}

export function useScrollExperience(photoCount: number): ScrollState {
  const progress = useScrollProgress()
  const cfg = useCalibrationConfig()
  const resp = useResponsiveCalibration(cfg)

  return useMemo<ScrollState>(() => {
    const count = Math.max(1, photoCount)
    const phases = resp.phases
    const rot = resp.rotation
    const scene = resp.scene
    return {
      progress,
      phase: phaseAt(progress, phases),
      cameraProgress: cameraProgress(progress, phases),
      yaw: cameraYaw(progress, phases, rot),
      distance: cameraDistance(progress, phases, scene.cameraDistanceIntro, scene.cameraDistanceLock),
      pan: cameraPan(progress, phases, scene.orbitPan),
      photoIndex: photoIndex(progress, phases, count),
      lcdCursor: lcdCursor(progress, phases),
      screenIntensity: screenIntensity(progress, phases),
      introOpacity: introOpacity(progress, phases),
      hintOpacity: hintOpacity(progress, phases),
      handoff: cameraHandoff(progress, phases),
      navReveal: navReveal(progress, phases),
      portfolioReveal: portfolioReveal(progress, phases),
      stageOpacity: stageOpacity(progress, phases),
    }
  }, [progress, resp])
}
