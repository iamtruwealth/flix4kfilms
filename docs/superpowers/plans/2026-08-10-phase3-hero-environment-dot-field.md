# Phase 3 — Hero Environment: Studio Silhouettes + Interactive Dot Field

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the FLIX 4K hero beyond the single camera subject by layering a subtle interactive canvas dot field behind the 3D scene and a ring of distant monochrome studio silhouettes (flash, softbox, ladder, mic) behind and around the rotating camera — all calibration-driven, monochrome-only, and invisible on touch / reduced-motion.

**Architecture:** Two new layers sit inside the existing `.stage` (fixed, `z-index: 0`, black background): (1) `<HeroDotField/>`, a single fullscreen 2D canvas at `z-index: 0` drawn behind the WebGL canvas; (2) `<StudioSilhouettes/>`, a WebGL group of selected clones from `photography_studio_equipment.glb` placed on a ring at radius ~6–9, scaled ~0.25–0.35, using near-black `meshStandardMaterial`. The WebGL `<Canvas>` becomes `alpha: true` and drops its opaque scene background so the dot field shows through the void; the `.stage` `background: #000` remains the black void. All tunables (gap, radius, ring radius, arc, yaw, shade, alphas) live in `calibrationPresets.ts` (`environment` + `dotField` blocks) and are adjustable live from the debug panel (`D`).

**Tech Stack:** React 19 + `@react-three/fiber` + `@react-three/drei` + three, Vite 8, Vitest (node env, no DOM), oxlint. No new npm dependencies.

## Global Constraints

- Black/white/grayscale ONLY. No accent color anywhere in these layers.
- Do NOT modify: camera rotation, camera calibration / LCD positioning, LCD photo scrolling, scroll state machine, portfolio system, photography admin, Supabase, routing, nav, booking.
- The GLB `photography_studio_equipment.glb` is CC-BY 4.0 (LowPolyModelsWorld, Sketchfab). It must be copied to `public/` and the license attribution added to `SiteFooter`.
- Dot field is ONE canvas, no per-dot DOM nodes, `pointer-events: none`, DPR-capped, static under `prefers-reduced-motion` or coarse/touch pointers.
- `verbatimModuleSyntax` + `erasableSyntaxOnly` are ON: use `import type` for types, no enums, no namespaces. `noUnusedLocals`/`noUnusedParameters` ON.
- All tunable numbers go in `calibrationPresets.ts`; components read via `useCalibrationConfig()`.
- Tests run with `npx vitest run` (no `test` script in package.json). Quality gates: `npx tsc -b`, `npm run lint`, `npx vitest run`, `npm run build`, `npm run smoke`.
- Do not edit comments in files unless the change requires it; match existing comment style when adding code.
- Frequent, small commits.

---

### Task 1: Calibration — `environment` + `dotField` blocks

**Files:**
- Modify: `src/lib/calibrationPresets.ts`
- Test: `src/lib/calibrationPresets.test.ts` (create)

**Interfaces:**
- Consumes: existing `CalibrationConfig`, `DEFAULT_CALIBRATION`, `PHYSICAL_LCD`.
- Produces: `EnvironmentCalibration`, `DotFieldCalibration`, extended `CalibrationConfig` with `environment` + `dotField`, extended `DEFAULT_CALIBRATION`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { DEFAULT_CALIBRATION } from './calibrationPresets'

describe('calibrationPresets — environment + dotField', () => {
  it('adds an environment block with the studio defaults', () => {
    const env = DEFAULT_CALIBRATION.environment
    expect(env.enabled).toBe(true)
    expect(env.radius).toBeGreaterThanOrEqual(4)
    expect(env.radius).toBeLessThanOrEqual(12)
    expect(env.scale).toBeGreaterThanOrEqual(0.1)
    expect(env.scale).toBeLessThanOrEqual(1)
    expect(env.shade).toBeGreaterThan(0)
    expect(env.shade).toBeLessThan(0.5)
    expect(env.keepNodes).toHaveLength(5)
  })

  it('selects exactly the five intended studio objects', () => {
    expect(DEFAULT_CALIBRATION.environment.keepNodes).toEqual([
      'Um.Flash.01_16',
      'SoftBox.01_15',
      'Ladder_17',
      'Flash.04_12',
      'Mic.01_8',
    ])
  })

  it('adds a dotField block with subtle defaults', () => {
    const df = DEFAULT_CALIBRATION.dotField
    expect(df.enabled).toBe(true)
    expect(df.gap).toBeGreaterThanOrEqual(24)
    expect(df.gap).toBeLessThanOrEqual(40)
    expect(df.radius).toBeGreaterThanOrEqual(0.5)
    expect(df.radius).toBeLessThanOrEqual(3)
    expect(df.baseAlpha).toBeGreaterThan(0)
    expect(df.baseAlpha).toBeLessThanOrEqual(1)
    expect(df.maxDpr).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/calibrationPresets.test.ts`
Expected: FAIL — `DEFAULT_CALIBRATION.environment` is `undefined`.

- [ ] **Step 3: Add the interfaces and defaults**

Append after the `QualityCalibration` interface (before `ScrollPhases`):

```ts
/** Distant studio silhouettes behind/around the hero camera. */
export interface EnvironmentCalibration {
  /** Master switch — the whole layer renders when true. */
  enabled: boolean
  /** GLB node names kept visible (everything else is hidden). */
  keepNodes: readonly string[]
  /** Ring radius in scene units (distance from the origin). */
  radius: number
  /** Vertical position of the ring. */
  y: number
  /** Angular span of the ring in radians (centered behind the camera, -Z). */
  arc: number
  /** Per-object scale multiplier. */
  scale: number
  /** Additional per-object yaw (radians). */
  yaw: number
  /** Material lightness 0..1 (0.05 ≈ #0D0D0D near-black silhouette). */
  shade: number
}

/** Fullscreen interactive canvas dot field behind the 3D scene. */
export interface DotFieldCalibration {
  /** Master switch. */
  enabled: boolean
  /** Dot grid spacing in CSS px. */
  gap: number
  /** Dot radius in CSS px. */
  radius: number
  /** Dot fill color (monochrome). */
  color: string
  /** Interaction reach around the pointer (CSS px). */
  hoverRadius: number
  /** Peak additive brightness near the pointer (0..1). */
  hoverStrength: number
  /** Base dot opacity (0..1). */
  baseAlpha: number
  /** DPR cap for the canvas. */
  maxDpr: number
}
```

Extend `CalibrationConfig`:

```ts
export interface CalibrationConfig {
  phases: ScrollPhases
  rotation: RotationCalibration
  scene: SceneCalibration
  normalize: CameraNormalize
  framing: CameraFraming
  lcd: LcdCalibration
  content: ScreenContentCalibration
  quality: QualityCalibration
  environment: EnvironmentCalibration
  dotField: DotFieldCalibration
}
```

Extend `DEFAULT_CALIBRATION` (add after `quality`):

```ts
  environment: {
    enabled: true,
    keepNodes: [
      'Um.Flash.01_16',
      'SoftBox.01_15',
      'Ladder_17',
      'Flash.04_12',
      'Mic.01_8',
    ],
    radius: 7,
    y: -1.5,
    arc: Math.PI,
    scale: 0.3,
    yaw: 0,
    shade: 0.06,
  },
  dotField: {
    enabled: true,
    gap: 32,
    radius: 1.25,
    color: '#161616',
    hoverRadius: 90,
    hoverStrength: 0.4,
    baseAlpha: 0.5,
    maxDpr: 1.5,
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/calibrationPresets.test.ts`
Expected: PASS (2 assertions blocks).

- [ ] **Step 5: Commit**

```bash
git add src/lib/calibrationPresets.ts src/lib/calibrationPresets.test.ts
git commit -m "feat(calibration): add environment + dotField blocks"
```

---

### Task 2: Pure studio-environment logic — visibility + ring slots

**Files:**
- Create: `src/lib/studioEnvironment.ts`
- Test: `src/lib/studioEnvironment.test.ts` (create)

**Interfaces:**
- Consumes: three, `EnvironmentCalibration` (from Task 1, for types only).
- Produces:
  - `STUDIO_GLB = './photography_studio_equipment.glb'`
  - `applyStudioVisibility(root: THREE.Object3D, keep: readonly string[]): void` — sets `obj.visible = keepSet.has(obj.name)` on every node.
  - `recenterObject(obj: THREE.Object3D): void` — offsets the object so its `Box3` center is the origin.
  - `computeRingSlots(count: number, radius: number, arc: number, y: number): RingSlot[]` where `RingSlot = { position: [number, number, number]; rotationY: number }`.

- [ ] **Step 1: Write the failing test**

```ts
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
    zs.forEach((z) => expect(z).toBeLessThanOrEqual(0))
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/studioEnvironment.test.ts`
Expected: FAIL — module `./studioEnvironment` cannot be resolved.

- [ ] **Step 3: Implement `src/lib/studioEnvironment.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/studioEnvironment.test.ts`
Expected: PASS (4 blocks). Note: `recenterObject` subtracts the center so the assertions on `getCenter()` hold for the freshly-updated matrix.

- [ ] **Step 5: Commit**

```bash
git add src/lib/studioEnvironment.ts src/lib/studioEnvironment.test.ts
git commit -m "feat(environment): visibility filtering + ring slot layout"
```

---

### Task 3: Studio silhouettes in the scene

**Files:**
- Create: `src/experience/StudioSilhouettes.tsx`
- Modify: `src/experience/Experience.tsx`
- Copy: `photography_studio_equipment.glb` → `public/photography_studio_equipment.glb`

**Interfaces:**
- Consumes: `useGLTF` (drei), `STUDIO_GLB`, `applyStudioVisibility`, `recenterObject`, `computeRingSlots` (Task 2), `useCalibrationConfig`, `CalibrationConfig['environment']`.
- Produces: `StudioSilhouettes` component (renders `<group>` of kept objects placed on the ring, monochrome materials, no shadows).

- [ ] **Step 1: Copy the GLB into `public/`**

Run:
```bash
cp photography_studio_equipment.glb public/photography_studio_equipment.glb
ls -la public/photography_studio_equipment.glb
```
Expected: the 1,376,116-byte GLB now lives in `public/` (served at `/photography_studio_equipment.glb`).

- [ ] **Step 2: Implement `StudioSilhouettes.tsx`**

```tsx
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
```

- [ ] **Step 3: Wire into `Experience.tsx`**

Change `Experience.tsx`:

- Add `import { StudioSilhouettes } from './StudioSilhouettes'` and `import { STUDIO_GLB } from '../lib/studioEnvironment'`.
- Add `useGLTF.preload(STUDIO_GLB)` next to the existing `useGLTF.preload(CAMERA_GLB)`.
- Inside `<Suspense fallback={null}>`, after `<CameraExperience />`, add `<StudioSilhouettes />`.
- Make the canvas transparent so the DOM dot field (Task 5) shows through the void:
  - `gl={{ antialias: true, alpha: false, ... }}` → `gl={{ antialias: true, alpha: true, ... }}`
  - remove the line `<color attach="background" args={['#000000']} />`

The full `<Canvas>` block after edit:

```tsx
<Canvas
  dpr={dpr}
  camera={{ fov: cfg.scene.cameraFov, near: 0.1, far: 80, position: [0, 0, 6] }}
  shadows
  gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
  onCreated={({ gl }) => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
  }}
>
  <Suspense fallback={null}>
    <CameraExperience />
    <StudioSilhouettes />
  </Suspense>
  <SceneEnvironment />
  <SceneCameraRig />
</Canvas>
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: clean (no new errors; existing warnings unchanged). `StudioSilhouettes` compiles with `env`, `scene`, `THREE` imports all used.

- [ ] **Step 5: Commit**

```bash
git add public/photography_studio_equipment.glb src/experience/StudioSilhouettes.tsx src/experience/Experience.tsx
git commit -m "feat(experience): distant studio silhouettes behind the camera"
```

---

### Task 4: Dot-field pure logic — grid + pointer response

**Files:**
- Create: `src/ui/dotField.ts`
- Test: `src/ui/dotField.test.ts` (create)

**Interfaces:**
- Consumes: none (pure).
- Produces:
  - `DotPos = { x: number; y: number }`
  - `computeDotPositions(width: number, height: number, gap: number): DotPos[]` — grid centered, first dot at `gap/2`, inset by `gap/2` on each edge.
  - `dotFade(distance: number, hoverRadius: number): number` — `1` at distance `0`, `0` at `distance >= hoverRadius`, smoothstep in between.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { computeDotPositions, dotFade } from './dotField'

describe('computeDotPositions', () => {
  it('returns [] for a viewport smaller than the gap', () => {
    expect(computeDotPositions(10, 10, 32)).toEqual([])
  })

  it('lays out a centered grid at the requested spacing', () => {
    const dots = computeDotPositions(320, 200, 32)
    expect(dots.length).toBeGreaterThan(0)
    const xs = dots.map((d) => d.x)
    const ys = dots.map((d) => d.y)
    expect(Math.min(...xs)).toBeCloseTo(16, 5)
    expect(Math.min(...ys)).toBeCloseTo(16, 5)
    expect(Math.max(...xs)).toBeLessThanOrEqual(320 - 16 + 1e-6)
    expect(Math.max(...ys)).toBeLessThanOrEqual(200 - 16 + 1e-6)
    // rows/columns are gap apart
    const rowXs = [...new Set(xs)].sort((a, b) => a - b)
    for (let i = 1; i < rowXs.length; i++) {
      expect(rowXs[i] - rowXs[i - 1]).toBeCloseTo(32, 5)
    }
  })

  it('returns the exact expected count for a 320x160 grid with gap 32', () => {
    const dots = computeDotPositions(320, 160, 32)
    const cols = Math.floor((320 - 16) / 32) + 1
    const rows = Math.floor((160 - 16) / 32) + 1
    expect(dots).toHaveLength(cols * rows)
  })
})

describe('dotFade', () => {
  it('is 1 at the pointer and 0 beyond the hover radius', () => {
    expect(dotFade(0, 90)).toBe(1)
    expect(dotFade(90, 90)).toBe(0)
    expect(dotFade(200, 90)).toBe(0)
  })

  it('is monotonic decreasing between 0 and the radius', () => {
    const values = [10, 30, 50, 70].map((d) => dotFade(d, 90))
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1])
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/dotField.test.ts`
Expected: FAIL — module `./dotField` cannot be resolved.

- [ ] **Step 3: Implement `src/ui/dotField.ts`**

```ts
export interface DotPos {
  x: number
  y: number
}

/**
 * Centered dot grid. The first dot sits at `gap/2` from each edge; spacing is
 * exactly `gap` on both axes. Pure — used by the canvas renderer.
 */
export function computeDotPositions(width: number, height: number, gap: number): DotPos[] {
  if (width <= gap || height <= gap) return []
  const dots: DotPos[] = []
  for (let y = gap / 2; y <= height - gap / 2; y += gap) {
    for (let x = gap / 2; x <= width - gap / 2; x += gap) {
      dots.push({ x, y })
    }
  }
  return dots
}

/** 1 at distance 0 → 0 at distance >= hoverRadius (smooth step). */
export function dotFade(distance: number, hoverRadius: number): number {
  if (hoverRadius <= 0 || distance >= hoverRadius) return 0
  const t = distance / hoverRadius
  return (1 - t) * (1 - t) * (3 - 2 * (1 - t)) * 0 + (1 - t) * (1 - t)
}
```

Note: use the simple falloff `(1 - t) ** 2` — replace the convoluted line above with:

```ts
/** 1 at distance 0 → 0 at distance >= hoverRadius. */
export function dotFade(distance: number, hoverRadius: number): number {
  if (hoverRadius <= 0 || distance >= hoverRadius) return 0
  const t = distance / hoverRadius
  return (1 - t) * (1 - t)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/dotField.test.ts`
Expected: PASS. Confirm `dotFade(90, 90) === 0` and the monotonic block holds.

- [ ] **Step 5: Commit**

```bash
git add src/ui/dotField.ts src/ui/dotField.test.ts
git commit -m "feat(ui): dot field grid + pointer falloff logic"
```

---

### Task 5: HeroDotField component + CSS + HomePage wiring

**Files:**
- Create: `src/ui/HeroDotField.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `useCalibrationConfig`, `useResponsiveQuality`, `useReducedMotion`, `computeDotPositions`, `dotFade`, `DotFieldCalibration`.
- Produces: `<HeroDotField/>` canvas component; `.dot-field` and `.stage-3d` CSS; HomePage wiring that places it behind the WebGL canvas.

- [ ] **Step 1: Write the failing test (module exists + behavior of a pure selector)**

The heavy DOM behavior (canvas, rAF, pointer events) can't be asserted in the node test env, but the config-to-render decision is pure. Export `dotFieldStatic(reduced: boolean, coarse: boolean): boolean` from `src/ui/HeroDotField.tsx` and test it.

Create `src/ui/HeroDotField.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { dotFieldStatic } from './HeroDotField'

describe('dotFieldStatic', () => {
  it('is static under reduced motion', () => {
    expect(dotFieldStatic(true, false)).toBe(true)
  })

  it('is static on coarse (touch) pointers', () => {
    expect(dotFieldStatic(false, true)).toBe(true)
  })

  it('is interactive on fine pointers without reduced motion', () => {
    expect(dotFieldStatic(false, false)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/HeroDotField.test.ts`
Expected: FAIL — module `./HeroDotField` cannot be resolved.

- [ ] **Step 3: Implement `src/ui/HeroDotField.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import { useCalibrationConfig } from '../lib/calibrationStore'
import { useResponsiveQuality } from '../hooks/useResponsiveQuality'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { computeDotPositions, dotFade } from './dotField'

/** True when the field should render once and never animate. */
export function dotFieldStatic(reduced: boolean, coarse: boolean): boolean {
  return reduced || coarse
}

function isCoarsePointer(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(pointer: coarse)').matches
}

/**
 * Fullscreen canvas dot grid behind the 3D scene. One canvas, no per-dot DOM.
 * pointer-events: none; dots subtly brighten near the pointer. Static (drawn
 * once) under prefers-reduced-motion or coarse/touch pointers.
 */
export function HeroDotField() {
  const cfg = useCalibrationConfig()
  const reduced = useReducedMotion()
  const { dpr } = useResponsiveQuality(cfg.dotField.maxDpr)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const df = cfg.dotField
  const staticField = dotFieldStatic(reduced, isCoarsePointer())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let dots: ReturnType<typeof computeDotPositions> = []
    let pointer: { x: number; y: number } | null = null
    let raf = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const w = Math.max(0, Math.round(rect.width * dpr))
      const h = Math.max(0, Math.round(rect.height * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)
      dots = computeDotPositions(rect.width, rect.height, df.gap)
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)
      ctx.fillStyle = df.color
      for (const dot of dots) {
        let alpha = df.baseAlpha
        if (pointer && !staticField) {
          const dx = dot.x - pointer.x
          const dy = dot.y - pointer.y
          const d = Math.hypot(dx, dy)
          alpha = Math.min(1, alpha + df.hoverStrength * dotFade(d, df.hoverRadius))
        }
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, df.radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      if (!raf) raf = requestAnimationFrame(() => {
        draw()
        raf = 0
      })
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    if (!staticField) window.addEventListener('pointermove', onPointerMove, { passive: true })

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [df.gap, df.radius, df.color, df.baseAlpha, df.hoverRadius, df.hoverStrength, dpr, staticField])

  return (
    <canvas
      ref={canvasRef}
      className="dot-field"
      aria-hidden="true"
      data-static={staticField}
    />
  )
}
```

- [ ] **Step 4: Add CSS**

Append to `src/styles.css` (near the `.stage` block):

```css
/* Dot field — one canvas behind the WebGL stage */
.dot-field {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* The 3D canvas wrapper paints above the dot field */
.stage-3d {
  position: absolute;
  inset: 0;
  z-index: 1;
}
```

- [ ] **Step 5: Wire into `HomePage.tsx`**

- Add `import { HeroDotField } from '../ui/HeroDotField'`.
- In the `.stage` block, place the dot field first, then the WebGL canvas in a `.stage-3d` wrapper:

```tsx
<div
  className="stage"
  style={{ opacity: scroll.stageOpacity }}
  aria-hidden={stageGone}
>
  <HeroDotField />
  <div className="stage-3d">
    <Suspense fallback={null}>
      <Experience />
    </Suspense>
  </div>
</div>
```

Note: the dot field is always rendered; the component itself decides whether to animate (`staticField` = reduced motion or coarse pointer → draws once, no pointer listener). This satisfies "degrades to a static dot field" rather than vanishing.

- [ ] **Step 6: Typecheck + lint + full test run**

Run: `npx tsc -b && npm run lint && npx vitest run`
Expected: clean typecheck/lint; all prior + new tests pass (now ~110 tests).

- [ ] **Step 7: Commit**

```bash
git add src/ui/HeroDotField.tsx src/ui/HeroDotField.test.ts src/pages/HomePage.tsx src/styles.css
git commit -m "feat(ui): interactive dot field behind the hero scene"
```

---

### Task 6: Debug panel sliders

**Files:**
- Modify: `src/ui/DebugUI.tsx`

**Interfaces:**
- Consumes: `useCalibrationConfig`, `setCalibration`, existing `Panel`/`Slider`/`Row`.
- Produces: `Environment` panel + `Dot field` panel, plus enable toggles.

- [ ] **Step 1: Add the `Environment` panel**

Insert before the `Global` panel (after the `guides` action):

```tsx
<Panel
  title="Environment"
  rows={[
    { label: 'radius', min: 2, max: 12, step: 0.25, get: (c) => c.environment.radius, set: (c, v) => ({ ...c, environment: { ...c.environment, radius: v } }) },
    { label: 'y', min: -4, max: 2, step: 0.05, get: (c) => c.environment.y, set: (c, v) => ({ ...c, environment: { ...c.environment, y: v } }) },
    { label: 'arc (rad)', min: 0.5, max: 6.3, step: 0.05, get: (c) => c.environment.arc, set: (c, v) => ({ ...c, environment: { ...c.environment, arc: v } }) },
    { label: 'scale', min: 0.05, max: 1, step: 0.01, get: (c) => c.environment.scale, set: (c, v) => ({ ...c, environment: { ...c.environment, scale: v } }) },
    { label: 'yaw (rad)', min: -3.2, max: 3.2, step: 0.05, get: (c) => c.environment.yaw, set: (c, v) => ({ ...c, environment: { ...c.environment, yaw: v } }) },
    { label: 'shade', min: 0, max: 0.5, step: 0.005, get: (c) => c.environment.shade, set: (c, v) => ({ ...c, environment: { ...c.environment, shade: v } }) },
  ]}
/>
<div className="panel-actions">
  <button
    onClick={() =>
      setCalibration((p) => ({ ...p, environment: { ...p.environment, enabled: !p.environment.enabled } }))
    }
  >
    env: {cfg.environment.enabled ? 'ON' : 'OFF'}
  </button>
</div>
```

- [ ] **Step 2: Add the `Dot field` panel**

Insert after the `Environment` panel:

```tsx
<Panel
  title="Dot field"
  rows={[
    { label: 'gap', min: 20, max: 48, step: 1, get: (c) => c.dotField.gap, set: (c, v) => ({ ...c, dotField: { ...c.dotField, gap: v } }) },
    { label: 'radius', min: 0.5, max: 3, step: 0.1, get: (c) => c.dotField.radius, set: (c, v) => ({ ...c, dotField: { ...c.dotField, radius: v } }) },
    { label: 'baseAlpha', min: 0, max: 1, step: 0.05, get: (c) => c.dotField.baseAlpha, set: (c, v) => ({ ...c, dotField: { ...c.dotField, baseAlpha: v } }) },
    { label: 'hoverRadius', min: 30, max: 200, step: 5, get: (c) => c.dotField.hoverRadius, set: (c, v) => ({ ...c, dotField: { ...c.dotField, hoverRadius: v } }) },
    { label: 'hoverStrength', min: 0, max: 1, step: 0.05, get: (c) => c.dotField.hoverStrength, set: (c, v) => ({ ...c, dotField: { ...c.dotField, hoverStrength: v } }) },
  ]}
/>
<div className="panel-actions">
  <button
    onClick={() =>
      setCalibration((p) => ({ ...p, dotField: { ...p.dotField, enabled: !p.dotField.enabled } }))
    }
  >
    dots: {cfg.dotField.enabled ? 'ON' : 'OFF'}
  </button>
</div>
```

Note: the `Panel`/`Slider`/`Row` types and `cfg` variable already exist in `DebugUI` — no type changes needed. The `color` field is intentionally not a slider (constant `#161616`).

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/ui/DebugUI.tsx
git commit -m "feat(debug): environment + dot field sliders"
```

---

### Task 7: CC-BY attribution in the footer

**Files:**
- Modify: `src/ui/SiteFooter.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `Link` (existing), the footer base block.
- Produces: an attribution line under the copyright.

- [ ] **Step 1: Add the attribution line**

In `SiteFooter.tsx`, inside `.site-foot-base` (after the existing copyright paragraph), add:

```tsx
<p className="site-foot-credit">
  Studio model: LowPolyModelsWorld —{' '}
  <a
    href="https://creativecommons.org/licenses/by/4.0/"
    target="_blank"
    rel="noreferrer"
  >
    CC BY 4.0
  </a>
</p>
```

- [ ] **Step 2: Style it**

Append near the `.site-foot-mono` rule in `src/styles.css`:

```css
.site-foot-credit {
  color: var(--faint);
  font-size: 0.8rem;
}
.site-foot-credit a {
  color: var(--dim);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.site-foot-credit a:hover {
  color: var(--ink);
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/ui/SiteFooter.tsx src/styles.css
git commit -m "feat(footer): attribute studio model license (CC BY 4.0)"
```

---

### Task 8: Full verification + visual QA

**Files:**
- None (verification only).

- [ ] **Step 1: Full quality gates**

Run:
```bash
npx tsc -b
npm run lint
npx vitest run
npm run build
npm run smoke
```
Expected: typecheck clean, lint 0 errors (existing warnings unchanged), all tests pass, build succeeds, smoke 13/13.

- [ ] **Step 2: Visual QA on the dev server**

Run `npm run dev`, open `http://localhost:5173/`, and verify:
1. Dot field is a subtle dark-gray grid behind the camera (camera still dominant; dots do NOT wash it out).
2. Studio silhouettes (flash, softbox, ladder, mic) are faintly visible behind/around the camera and stay monochrome.
3. No dots overlap the intro typography illegibly; the LCD photo is unaffected.
4. Reduce motion (OS setting) → dot field absent, silhouettes still, still behaves as a still reveal.
5. Touch device / narrow viewport → dot field static or absent, no layout shift.
6. Debug panel `D` → Environment + Dot field sliders change the scene live; `env:` / `dots:` toggles work.
7. Footer shows the CC BY 4.0 credit.
8. Scroll through the full experience — handoff, LCD, portfolio, footer all intact.
9. Screenshots saved for the record if a visual-diff tool is available.

- [ ] **Step 3: Record any calibration tweaks**

If any value needs tuning after visual QA, adjust the corresponding default in `calibrationPresets.ts`, re-run `npx vitest run`, and commit:

```bash
git add src/lib/calibrationPresets.ts
git commit -m "tune(calibration): phase-3 defaults after visual QA"
```

---

## Self-Review

- **Spec coverage:** dot field (Task 4/5), silhouettes (Task 2/3), calibration (Task 1), DebugUI (Task 6), attribution (Task 7), perf/a11y/responsive (Task 5: DPR cap, pointer-events none, reduced-motion + coarse static, aria-hidden; Task 3: no shadows, one clone), tests (each task), visual QA (Task 8). All nine spec points covered.
- **Placeholder scan:** all code blocks concrete; no TBD/TODO. `dotFade` implementation simplified to `(1-t)^2` explicitly.
- **Type consistency:** `environment`/`dotField` field names match between Task 1 (`CalibrationConfig`), Task 5 (`HeroDotField` reads `cfg.dotField.*`), Task 6 (`DebugUI` `get`/`set`), and Task 2 (`EnvironmentCalibration` referenced). `RingSlot.position` is a tuple `[number, number, number]` consumed by r3f `position`. `dotFieldStatic` name matches its test. `STUDIO_GLB` shared between Task 2 and Task 3.
- **Constraint checks:** no camera/LCD/scroll/portfolio/routing files touched; black/white/grayscale only; no new dependencies; `import type` used; GLB copied to `public/` and licensed.
