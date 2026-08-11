import { useMemo } from 'react'
import { useScrollProgress } from '../lib/scrollStore'
import { useCalibrationConfig } from '../lib/calibrationStore'
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

/**
 * Single derived view over the scroll state machine. Everything is computed
 * as a pure function of raw scroll progress + the centralized calibration.
 * Components subscribe once; the 3D loop reads the same numbers each frame.
 */
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
  /** 0 = camera fully present; 1 = fully receded (camera handoff). */
  handoff: number
  /** 0 = nav hidden; 1 = fully revealed. */
  navReveal: number
  /** 0 = portfolio hidden; 1 = fully faded in. */
  portfolioReveal: number
  /** 3D canvas opacity (1 = camera visible, 0 = gone). */
  stageOpacity: number
}

export function useScrollExperience(photoCount: number): ScrollState {
  const progress = useScrollProgress()
  const cfg = useCalibrationConfig()

  return useMemo<ScrollState>(() => {
    const count = Math.max(1, photoCount)
    const phases = cfg.phases
    const rot = cfg.rotation
    const scene = cfg.scene
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
  }, [progress, cfg])
}
