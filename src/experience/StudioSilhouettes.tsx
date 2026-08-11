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

  // One fresh clone per env change — cloning is cheap (geometry is shared with
  // the cache) and guarantees `applyStudioVisibility` re-traverses a complete
  // tree. Mounting `<primitive>` re-parents kept nodes out of the clone, so
  // reusing a single clone across calibration edits would lose them on the
  // next memo recompute.
  const objects = useMemo(() => {
    if (!env.enabled) return []
    const clone = scene.clone(true)
    applyStudioVisibility(clone, env.keepNodes)
    const shade = new THREE.Color().setScalar(env.shade)
    const keepSet = new Set(env.keepNodes.map((name) => name.replace(/^\/+/, '')))
    const kept = new Map<string, THREE.Object3D>()
    clone.traverse((obj) => {
      if (keepSet.has(obj.name)) kept.set(obj.name, obj)
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = false
        obj.receiveShadow = false
        obj.material = new THREE.MeshStandardMaterial({
          color: shade,
          roughness: 0.9,
          metalness: 0,
        })
      }
    })
    kept.forEach((obj) => recenterObject(obj))
    return [...kept.values()]
  }, [scene, env])

  const slots = useMemo(
    () => (objects.length ? computeRingSlots(objects.length, env.radius, env.arc, env.y) : []),
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
