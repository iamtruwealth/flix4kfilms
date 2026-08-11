import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  applyStudioVisibility,
  recenterObject,
  computeRingSlots,
} from './studioEnvironment'

function makeScene(): THREE.Group {
  const root = new THREE.Group()
  const names = [
    'root',
    'Um.Flash.01_16',
    'SoftBox.01_15',
    'Ladder_17',
    'Flash.04_12',
    'Mic.01_8',
    'Red Light_14',
    'Camera.02_0',
  ]
  names.forEach((name) => {
    const g = new THREE.Group()
    g.name = name
    // each named node owns a mesh child (like Object_36 in the GLB)
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))
    mesh.name = `Object_${name.length}`
    g.add(mesh)
    root.add(g)
  })
  return root
}

describe('applyStudioVisibility', () => {
  it('hides every node not in the keep list', () => {
    const root = makeScene()
    const keep = ['Um.Flash.01_16', 'SoftBox.01_15', 'Ladder_17', 'Flash.04_12', 'Mic.01_8']
    applyStudioVisibility(root, keep)
    const visible = root.children.filter((c) => c.visible).map((c) => c.name)
    expect(visible.sort()).toEqual([...keep].sort())
  })
})

describe('recenterObject', () => {
  it('moves the object so its bounding box center is the origin', () => {
    const g = new THREE.Group()
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 3))
    mesh.position.set(5, 5, 5)
    g.add(mesh)
    recenterObject(g)
    const box = new THREE.Box3().setFromObject(g)
    const center = box.getCenter(new THREE.Vector3())
    expect(center.x).toBeCloseTo(0, 5)
    expect(center.y).toBeCloseTo(0, 5)
    expect(center.z).toBeCloseTo(0, 5)
  })
})

describe('computeRingSlots', () => {
  it('places a single object directly behind the camera (-Z)', () => {
    const [slot] = computeRingSlots(1, 7, Math.PI, -1.5)
    expect(slot.position[0]).toBeCloseTo(0, 5)
    expect(slot.position[1]).toBeCloseTo(-1.5, 5)
    expect(slot.position[2]).toBeCloseTo(-7, 5)
  })

  it('spreads N objects evenly across the arc', () => {
    const slots = computeRingSlots(5, 7, Math.PI, 0)
    expect(slots).toHaveLength(5)
    const zs = slots.map((s) => s.position[2])
    // arc spans π/2..3π/2 ⇒ all on the -Z half
    // (tolerance absorbs cos(π/2) ≈ 6.1e-17 floating-point error at the endpoint)
    zs.forEach((z) => expect(z).toBeLessThanOrEqual(1e-10))
    // each sits on the requested radius
    slots.forEach((s) => {
      const r = Math.hypot(s.position[0], s.position[2])
      expect(r).toBeCloseTo(7, 5)
    })
  })

  it('handles count === 0', () => {
    expect(computeRingSlots(0, 7, Math.PI, 0)).toEqual([])
  })
})
