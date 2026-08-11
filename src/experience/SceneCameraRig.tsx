import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getRawProgress } from '../lib/scrollStore'
import { calibrationStore } from '../lib/calibrationStore'
import { computeCameraScene } from '../hooks/useCameraScene'

/**
 * The *viewing* camera orbits and dollies while ALWAYS looking at the model
 * center (orbitTargetY). Because the look-target sits at the model's visual
 * center, the camera stays optically centered in the viewport for the whole
 * reveal — pan only adds an orbit, it never shifts the subject.
 */
export function SceneCameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera

  useFrame(() => {
    const progress = getRawProgress()
    const cfg = calibrationStore.get()
    const pose = computeCameraScene(progress, cfg)
    const scn = cfg.scene

    const dist = pose.distance
    const pan = pose.pan
    const targetY = scn.orbitTargetY

    // Orbit around a fixed visual center — the subject never leaves center.
    const target = new THREE.Vector3(0, targetY, 0)
    const pos = new THREE.Vector3(
      Math.sin(pan) * dist,
      targetY + dist * 0.05,
      Math.cos(pan) * dist,
    )

    camera.position.copy(pos)
    camera.up.set(0, 1, 0)
    camera.lookAt(target)
    camera.near = 0.1
    camera.far = 80

    if (scn.cameraFov !== camera.fov) {
      camera.fov = scn.cameraFov
      camera.updateProjectionMatrix()
    }
  })

  return null
}
