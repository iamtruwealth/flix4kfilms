/**
 * FLIX 4K — Centralized calibration configuration.
 *
 * Every tunable number used by the experience lives here so we can
 * visually calibrate the scene (LCD alignment, framing, pacing) from a
 * single file — and from the in-app debug panel (key `D`).
 *
 * The original GLB is never modified. All transformations happen at runtime.
 */

// ---------------------------------------------------------------------------
// Model normalization
//
// The model is recentered and rescaled at runtime from its measured bounds
// (Box3). These constants are the defaults only — the debug panel can apply
// manual overrides without ever touching the GLB itself.
//
// Measured from sony_alpha_3.glb (Sketchfab "Sony Alpha 3"):
//   world AABB after the loader applies node scale 0.2:
//     size  (x 4.8491, y 3.7392, z 6.8506)
//     center (x -0.0306, y 1.8843, z 0.0001)
//     diagonal ~9.19
//   orientation verified geometrically:
//     front/lens = +Z,  rear = -Z,  up = +Y
// ---------------------------------------------------------------------------

export interface CameraNormalize {
  /** Desired diagonal of the model in scene units (framing baseline). */
  targetDiagonal: number
  /** Manual absolute-scale override (0 = computed from targetDiagonal). */
  scaleOverride: number
}

/**
 * Camera framing — a whole-camera world offset applied at the root of the
 * CameraExperience. This moves the camera in the VIEWPORT, not the LCD;
 * it is the tool for optically centering the hero composition.
 */
export interface CameraFraming {
  x: number
  y: number
  z: number
}

/**
 * Screen-content framing inside the LCD plane (camera-local units, pre-scale).
 * `aspect` is the target photo aspect; 0 means "match the LCD plane aspect".
 * `scale`/`x`/`y` move the photograph within the physical screen.
 */
export interface ScreenContentCalibration {
  /** Multiplier on the default fitted size. */
  scale: number
  /** Offset in plane-widths (+ = right). */
  x: number
  /** Offset in plane-heights (+ = up). */
  y: number
  /** Photo aspect ratio (w/h). 0 = inherit LCD aspect. */
  aspect: number
}

/** Render quality — the GLB is never mutated; quality only affects DPR/shadows. */
export interface QualityCalibration {
  shadowsResolution: number
  maxDpr: number
}

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
  /** Swarm physics master switch (ignored on coarse pointers / reduced motion). */
  swarm: boolean
  /** Acceleration toward the pointer (px/frame² at full strength). */
  attraction: number
  /** Spring-back acceleration toward the home grid position (px/frame² per px). */
  spring: number
  /** Velocity retained per frame (0..1). */
  damping: number
  /** Max dot speed (px/frame). */
  maxSpeed: number
}

// ---------------------------------------------------------------------------
// Scroll phases
// ---------------------------------------------------------------------------

export interface ScrollPhases {
  /** Fraction where the camera starts rotating. */
  rotationStart: number
  /** Fraction where the rotation completes (settle begins). */
  rotationEnd: number
  /** Fraction where the settle completes (full lock). */
  settleEnd: number
  /** Fraction where the LCD starts advancing photos. */
  lockEnd: number
  /** Fraction where the LCD reaches the last photo. */
  lcdEnd: number
  /** Fraction where the FINAL LCD frame stops holding (handoff begins). */
  lcdHoldEnd: number
  /** Fraction where the camera handoff completes (camera fully receded). */
  handoffEnd: number
  /** Fraction where the navigation is fully revealed. */
  navEnd: number
}

/** Camera rotation pacing. */
export interface RotationCalibration {
  /** Yaw at progress 0 (radians). */
  startRotation: number
  /** Total yaw swept across the rotation segment (radians). */
  spanRotation: number
  /** 1 = clockwise, -1 = counter-clockwise. */
  direction: 1 | -1
}

/** Scene/viewing-calibration values. */
export interface SceneCalibration {
  /** Height of the scroll track in viewport-heights. */
  scrollLengthVh: number
  /** Viewing camera FOV (degrees). */
  cameraFov: number
  /** Viewing camera distance at intro (scene units). */
  cameraDistanceIntro: number
  /** Viewing camera distance at lock (scene units). */
  cameraDistanceLock: number
  /** Y of the orbit center — the camera always LOOKS here, so the camera
   *  model stays optically centered in the viewport. */
  orbitTargetY: number
  /** Orbit angle (radians) swept as the camera rotates. */
  orbitPan: number
  ambientIntensity: number
  keyIntensity: number
  rimIntensity: number
  fillIntensity: number
  envIntensity: number
}

// ---------------------------------------------------------------------------
// LCD display plane (camera-local space, in pre-scale model units)
//
// The PHYSICAL LCD is the rectangular screen on the rear of the GLB.
// At the reveal the pivot rotates yaw = π (R_y(π) negates x), so a local
// POSITIVE x renders on the viewer's LEFT — where a Sony-style camera's
// LCD sits (the controls live on the viewer's right). The values below are
// camera-local; the local center is the model-space center minus the model
// center offset.
//   physical screen (model coords):  cx 1.205  cy 1.334  z ≈ -3.15
//                                    w 2.195  h 2.059   (aspect 1.07)
//   model center (-0.03, 1.88, 0) ⇒ camera-local position is minus center.
// ---------------------------------------------------------------------------

export interface LcdCalibration {
  /** Local position relative to the model center (model units). */
  x: number
  y: number
  z: number
  /** Euler rotations (radians). Default faces the rear (-Z) surface. */
  rotationX: number
  rotationY: number
  rotationZ: number
  /** Plane size in model units. */
  width: number
  height: number
  /** How far the plane floats OUT of the rear panel (negative z), clear of
   *  z-fighting against the back shell. Positive = further outward. */
  depthBias: number
  /** Perceived brightness of the screen fill-light in the panel. */
  lighten: number
}

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

/**
 * The physical LCD rectangle, in MODEL coordinates (before recenter).
 * Used by the dev calibration guides to draw the "target" the virtual LCD
 * plane must match. Never mutated at runtime.
 */
export const PHYSICAL_LCD = {
  /** Model-space center (x, y) and plane depth z. Positive x = viewer's left
   *  in the reveal (rear view) because the pivot rotates yaw = π. */
  cx: 0.845,
  cy: 1.334,
  z: -3.15,
  width: 2.195,
  height: 2.059,
} as const

const MODEL_CENTER = { x: -0.031, y: 1.884, z: 0 } as const

/** Exported for the calibration guides (model-center offset). */
export { MODEL_CENTER }

/** Physical LCD center expressed in camera-local space (minus model center). */
const PHYSICAL_LCD_LOCAL = {
  x: PHYSICAL_LCD.cx - MODEL_CENTER.x,
  y: PHYSICAL_LCD.cy - MODEL_CENTER.y,
  z: PHYSICAL_LCD.z - MODEL_CENTER.z,
} as const

export const DEFAULT_CALIBRATION: CalibrationConfig = {
  phases: {
    rotationStart: 0.04,
    rotationEnd: 0.32,
    settleEnd: 0.38,
    lockEnd: 0.42,
    lcdEnd: 0.66,
    lcdHoldEnd: 0.74,
    handoffEnd: 0.84,
    navEnd: 0.9,
  },
  rotation: {
    startRotation: 0,
    spanRotation: Math.PI,
    direction: 1,
  },
  scene: {
    scrollLengthVh: 1000,
    cameraFov: 42,
    cameraDistanceIntro: 6.0,
    cameraDistanceLock: 5.2,
    orbitTargetY: 0,
    orbitPan: 0.22,
    ambientIntensity: 0.08,
    keyIntensity: 1.6,
    rimIntensity: 1.1,
    fillIntensity: 0.55,
    envIntensity: 1.1,
  },
  normalize: {
    targetDiagonal: 4.3,
    scaleOverride: 0,
  },
  // Camera is optically centered by aiming the viewing camera at the model
  // center (orbitTargetY = 0). These offsets exist for final fine-tuning.
  framing: { x: 0, y: 0, z: 0 },
  lcd: {
    x: PHYSICAL_LCD_LOCAL.x,
    y: PHYSICAL_LCD_LOCAL.y,
    z: PHYSICAL_LCD_LOCAL.z,
    rotationX: 0,
    rotationY: Math.PI, // faces the rear (-Z) surface
    rotationZ: 0,
    width: PHYSICAL_LCD.width,
    height: PHYSICAL_LCD.height,
    depthBias: 0.05,
    lighten: 0.05,
  },
  content: {
    scale: 1,
    x: 0,
    y: 0,
    aspect: 0, // 0 = inherit LCD aspect
  },
  quality: {
    shadowsResolution: 2048,
    maxDpr: 2,
  },
  environment: {
    enabled: true,
    keepNodes: [
      'UmFlash01_16',
      'SoftBox01_15',
      'Ladder_17',
      'Flash04_12',
      'Mic01_8',
    ],
    radius: 4.5,
    y: -1.5,
    arc: Math.PI,
    scale: 0.6,
    yaw: 0,
    shade: 0.25,
  },
  dotField: {
    enabled: true,
    gap: 32,
    radius: 1.75,
    color: '#3d3d3d',
    hoverRadius: 150,
    hoverStrength: 0.4,
    baseAlpha: 0.7,
    maxDpr: 1.5,
    swarm: true,
    attraction: 0.4,
    spring: 0.005,
    damping: 0.94,
    maxSpeed: 12,
  },
}
