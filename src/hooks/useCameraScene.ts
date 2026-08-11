import type { CalibrationConfig } from '../lib/calibrationPresets'
import { cameraProgress, cameraDistance, cameraYaw, cameraPan } from '../scroll/scrollState'

/**
 * Camera/scene rig for the reveal — pure function of scroll progress.
 * Used by the render loop each frame; nothing here depends on React state.
 */
export interface CameraScenePose {
  yaw: number
  distance: number
  pan: number
  cameraProgress: number
}

export function computeCameraScene(progress: number, cfg: CalibrationConfig): CameraScenePose {
  const { phases, rotation, scene } = cfg
  return {
    yaw: cameraYaw(progress, phases, rotation),
    distance: cameraDistance(progress, phases, scene.cameraDistanceIntro, scene.cameraDistanceLock),
    pan: cameraPan(progress, phases, scene.orbitPan),
    cameraProgress: cameraProgress(progress, phases),
  }
}