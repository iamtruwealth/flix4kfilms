import { useMemo } from 'react'
import * as THREE from 'three'
import { useCalibrationConfig } from '../lib/calibrationStore'
import { useDebug } from '../lib/debugStore'
import { PHYSICAL_LCD, MODEL_CENTER } from '../lib/calibrationPresets'

const COLOR_PHYSICAL = '#22ff88'
const COLOR_VIRTUAL = '#ff4d3d'
const COLOR_CENTER = '#ffd84d'

/** Rect outline helper (camera-local space, model units). */
function RectLines({ cx, cy, z, w, h, rotationY = 0, color }: {
  cx: number
  cy: number
  z: number
  w: number
  h: number
  rotationY?: number
  color: string
}) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const hw = w / 2
    const hh = h / 2
    g.setAttribute('position', new THREE.Float32BufferAttribute(
      [-hw, -hh, 0, hw, -hh, 0, hw, hh, 0, -hw, hh, 0],
      3,
    ))
    g.setIndex([0, 1, 1, 2, 2, 3, 3, 0])
    return g
  }, [w, h])

  return (
    <group position={[cx, cy, z]} rotation={[0, rotationY, 0]}>
      <lineSegments geometry={geo}>
        <lineBasicMaterial color={color} />
      </lineSegments>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={color} transparent opacity={0.06} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** Crosshair at a point (camera-local space). */
function Crosshair({ x, y, z, color }: { x: number; y: number; z: number; color: string }) {
  const geo = useMemo(() => {
    const s = 0.16
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([-s, 0, 0, s, 0, 0, 0, -s, 0, 0, s, 0], 3))
    return g
  }, [])
  return (
    <group position={[x, y, z]}>
      <lineSegments geometry={geo}>
        <lineBasicMaterial color={color} />
      </lineSegments>
    </group>
  )
}

/**
 * Dev-only calibration overlay (key `C`). Draws:
 *   1. PHYSICAL LCD bounds (green, from GLB measurement)
 *   2. VIRTUAL LCD plane bounds (red, from live `lcd` calibration)
 *   3. Screen center crosshair (yellow)
 *   4. Model visual bounding box (grey)
 *
 * Alignment target: the green (physical) and red (virtual) rects coincide.
 */
export function CalibrationGuides() {
  const cfg = useCalibrationConfig()
  const debug = useDebug()

  const physical = {
    cx: PHYSICAL_LCD.cx - MODEL_CENTER.x,
    cy: PHYSICAL_LCD.cy - MODEL_CENTER.y,
    z: PHYSICAL_LCD.z - MODEL_CENTER.z,
    w: PHYSICAL_LCD.width,
    h: PHYSICAL_LCD.height,
  }
  const bboxGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(4.85, 3.74, 6.85)
    const edges = new THREE.EdgesGeometry(box)
    box.dispose()
    return edges
  }, [])

  if (!debug.guides) return null

  const lcd = cfg.lcd

  return (
    <group>
      {/* 1. physical LCD bounds (green) */}
      <RectLines {...physical} color={COLOR_PHYSICAL} />
      {/* 2. virtual LCD plane (red) */}
      <RectLines
        cx={lcd.x}
        cy={lcd.y}
        z={lcd.z - lcd.depthBias}
        w={lcd.width}
        h={lcd.height}
        rotationY={lcd.rotationY}
        color={COLOR_VIRTUAL}
      />
      {/* 3. screen center crosshair on the virtual plane */}
      <Crosshair x={lcd.x} y={lcd.y} z={lcd.z - lcd.depthBias} color={COLOR_CENTER} />

      {/* 4. camera visual bbox (model-local, under the same scale) */}
      <lineSegments geometry={bboxGeo}>
        <lineBasicMaterial color="#888888" transparent opacity={0.5} />
      </lineSegments>
    </group>
  )
}

/** DOM viewport-center crosshair + axis guides (dev only). */
export function ViewportCrosshair() {
  const debug = useDebug()
  if (!debug.guides) return null
  return (
    <div className="vp-guides" aria-hidden="true">
      <div className="vp-cross" />
      <div className="vp-h" />
      <div className="vp-v" />
    </div>
  )
}
