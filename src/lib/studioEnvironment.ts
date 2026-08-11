import * as THREE from 'three'

export const STUDIO_GLB = './photography_studio_equipment.glb'

export interface RingSlot {
  position: [number, number, number]
  rotationY: number
}

/**
 * Hide every node whose name is not in `keep`. Mesh children of a kept node
 * keep their default `visible = true`, so whole subtrees survive.
 */
export function applyStudioVisibility(root: THREE.Object3D, keep: readonly string[]): void {
  const keepSet = new Set(keep)
  root.traverse((obj) => {
    obj.visible = keepSet.has(obj.name)
  })
}

/** Shift an object so its bounding-box center sits at the origin. */
export function recenterObject(obj: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(obj)
  const center = box.getCenter(new THREE.Vector3())
  obj.position.sub(center)
  obj.updateWorldMatrix(true, true)
}

/**
 * Evenly spaced ring slots behind the camera. Angles span `arc` radians
 * centered at π (i.e. the -Z half-space, behind the origin). Rotation faces
 * the front (+Z) of each object toward the ring center.
 */
export function computeRingSlots(count: number, radius: number, arc: number, y: number): RingSlot[] {
  const slots: RingSlot[] = []
  for (let i = 0; i < count; i++) {
    const angle = count === 1 ? Math.PI : Math.PI - arc / 2 + (arc * i) / (count - 1)
    slots.push({
      position: [Math.sin(angle) * radius, y, Math.cos(angle) * radius],
      rotationY: angle + Math.PI,
    })
  }
  return slots
}
