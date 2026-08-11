import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useCalibrationConfig } from '../lib/calibrationStore'
import {
  STUDIO_GLB,
  applyStudioVisibility,
  recenterObject,
  computeRingSlots,
} from '../lib/studioEnvironment'

/**
 * Distant monochrome studio props behind/around the hero camera: one umbrella
 * flash, one softbox, a ladder, one bare flash and a microphone, cloned from
 * photography_studio_equipment.glb (CC BY 4.0, LowPolyModelsWorld). Every
 * node except the calibration-selected ones is hidden; materials are replaced
 * with a single near-black matte standard material so the props read as
 * silhouettes against the black void. No shadows are cast or received.
 */
export function StudioSilhouettes() {
  const cfg = useCalibrationConfig()
  const env = cfg.environment
  const { scene } = useGLTF(STUDIO_GLB)

  // One clone per GLB load — materials are set once here.
  const clone = useMemo(() => scene.clone(true), [scene])

  const objects = useMemo(() => {
    applyStudioVisibility(clone, env.keepNodes)
    const shade = new THREE.Color().setScalar(env.shade)
    const kept: THREE.Object3D[] = []
    clone.traverse((obj) => {
      if (env.keepNodes.includes(obj.name)) kept.push(obj)
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh
        mesh.castShadow = false
        mesh.receiveShadow = false
        mesh.material = new THREE.MeshStandardMaterial({
          color: shade,
          roughness: 0.9,
          metalness: 0,
        })
      }
    })
    kept.forEach((obj) => recenterObject(obj))
    return kept
  }, [clone, env])

  const slots = useMemo(
    () => computeRingSlots(objects.length, env.radius, env.arc, env.y),
    [objects, env.radius, env.arc, env.y],
  )

  if (!env.enabled || objects.length === 0) return null

  return (
    <group>
      {objects.map((obj, i) => {
        const slot = slots[i]
        return (
          <group
            key={obj.name ?? i}
            position={slot.position}
            rotation={[0, slot.rotationY + env.yaw, 0]}
            scale={env.scale}
          >
            <primitive object={obj} />
          </group>
        )
      })}
    </group>
  )
}
