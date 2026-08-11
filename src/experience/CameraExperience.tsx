import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { CameraModel } from './CameraModel'
import { CameraScreen } from './CameraScreen'
import { CalibrationGuides } from './CalibrationGuides'
import { getRawProgress } from '../lib/scrollStore'
import { useCalibrationConfig, calibrationStore } from '../lib/calibrationStore'
import { computeCameraScene } from '../hooks/useCameraScene'
import { cameraHandoff } from '../scroll/scrollState'

export const CAMERA_GLB = './sony_alpha_3.glb'

/**
 * The product reveal: GLTF clone → normalize (recenter + rescale on an
 * invariant diagonal) → rotate around the pivot. Pivot yaw is a pure
 * function of scroll progress, read imperatively every frame. Nothing here
 * re-renders with scroll; only calibration edits re-render the light bits.
 *
 * Hierarchy:
 *   framing (world offset) → pivot (yaw) → scale → camera-local
 *     ├─ CameraModel (recentered)
 *     └─ CameraScreen (LCD plane, same 3D space as the model)
 *   Guides ride inside `pivot` so they rotate with the camera.
 */
export function CameraExperience() {
  const cfg = useCalibrationConfig()
  const { scene: gltfScene } = useGLTF(CAMERA_GLB)
  const pivotRef = useRef<THREE.Group>(null)
  const frameRef = useRef<THREE.Group>(null)

  // Clone so we control lifecycle and never mutate the cached GLB.
  const model = useMemo(() => {
    const clone = gltfScene.clone(true)
    clone.traverse((obj) => {
      obj.userData.flix4k = true
    })
    return clone
  }, [gltfScene])

  // Normalization measured from the clone's actual bounds — single source.
  const norm = useMemo(() => {
    model.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const diagonal = Math.sqrt(size.x ** 2 + size.y ** 2 + size.z ** 2) || 1
    const scale = cfg.normalize.scaleOverride || cfg.normalize.targetDiagonal / diagonal
    return { center, scale }
  }, [model, cfg])

  // Dispose the clone when we unmount (keeps the shared cache intact).
  useEffect(() => {
    return () => {
      model.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.isMesh) {
          mesh.geometry?.dispose()
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach((m) => m?.dispose())
        }
      })
    }
  }, [model])

  // Imperative pose: yaw + handoff, pure functions of scroll progress.
  useFrame(() => {
    const progress = getRawProgress()
    const cfgNow = calibrationStore.get()
    const pose = computeCameraScene(progress, cfgNow)
    if (pivotRef.current) pivotRef.current.rotation.y = pose.yaw

    // Camera handoff: after the final LCD frame holds, the camera gently
    // recedes (scale + downward drift) as the site takes over.
    const handoff = cameraHandoff(progress, cfgNow.phases)
    const frame = frameRef.current
    if (frame) {
      frame.scale.setScalar(1 - 0.14 * handoff)
      frame.position.set(cfgNow.framing.x, cfgNow.framing.y - 0.5 * handoff, cfgNow.framing.z)
    }
  })

  const { x: fx, y: fy, z: fz } = cfg.framing
  const { center, scale } = norm

  return (
    <group ref={frameRef} position={[fx, fy, fz]}>
      <group ref={pivotRef}>
        <group scale={scale}>
          <group>
            <CameraModel object={model} position={[-center.x, -center.y, -center.z]} />
            <CameraScreen />
          </group>
          <CalibrationGuides />
        </group>
      </group>
    </group>
  )
}
