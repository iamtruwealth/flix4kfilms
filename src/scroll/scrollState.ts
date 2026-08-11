/**
 * FLIX 4K — Deterministic scroll state machine (pure, framework-free).
 *
 * Scroll progress `p ∈ [0,1]` is the single source of truth. Every derived
 * value is a pure function of `p`, so the same scroll position always
 * produces the same state, and forward/reverse scrolling is perfectly
 * reversible. No wheel velocity, no incremental accumulation.
 *
 * Phase map:
 *   INTRO → CAMERA_ROTATION → CAMERA_SETTLE → CAMERA_LOCK →
 *   LCD_PORTFOLIO → LCD_HOLD → CAMERA_HANDOFF → NAV_REVEAL → PORTFOLIO
 *
 * The camera segment spans [0, lcdHoldEnd]; the final LCD frame holds during
 * LCD_HOLD, the camera recedes during CAMERA_HANDOFF, the navigation reveals
 * during NAV_REVEAL, and the portfolio content is reached at PORTFOLIO.
 */

import type { RotationCalibration, ScrollPhases } from '../lib/calibrationPresets'

export type ScrollPhase =
  | 'INTRO'
  | 'CAMERA_ROTATION'
  | 'CAMERA_SETTLE'
  | 'CAMERA_LOCK'
  | 'LCD_PORTFOLIO'
  | 'LCD_HOLD'
  | 'CAMERA_HANDOFF'
  | 'NAV_REVEAL'
  | 'PORTFOLIO'

export const PHASE_ORDER: ScrollPhase[] = [
  'INTRO',
  'CAMERA_ROTATION',
  'CAMERA_SETTLE',
  'CAMERA_LOCK',
  'LCD_PORTFOLIO',
  'LCD_HOLD',
  'CAMERA_HANDOFF',
  'NAV_REVEAL',
  'PORTFOLIO',
] as const

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Smoothstep easing — hermite interpolation, C1 continuous at both ends. */
export const smoothstep = (t: number) => {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Progress → phase. Segment boundaries are half-open: a value exactly at a
 * boundary belongs to the *following* phase (e.g. p === settleEnd ⇒ CAMERA_LOCK).
 */
export function phaseAt(p: number, phases: ScrollPhases): ScrollPhase {
  if (p < phases.rotationStart) return 'INTRO'
  if (p < phases.rotationEnd) return 'CAMERA_ROTATION'
  if (p < phases.settleEnd) return 'CAMERA_SETTLE'
  if (p < phases.lockEnd) return 'CAMERA_LOCK'
  if (p < phases.lcdEnd) return 'LCD_PORTFOLIO'
  if (p < phases.lcdHoldEnd) return 'LCD_HOLD'
  if (p < phases.handoffEnd) return 'CAMERA_HANDOFF'
  if (p < phases.navEnd) return 'NAV_REVEAL'
  return 'PORTFOLIO'
}

/**
 * Rotation progress 0..1 — starts at rotationStart, completes at rotationEnd.
 */
export function cameraProgress(p: number, phases: ScrollPhases): number {
  if (p <= phases.rotationStart) return 0
  if (p >= phases.rotationEnd) return 1
  return smoothstep((p - phases.rotationStart) / (phases.rotationEnd - phases.rotationStart))
}

/** Yaw is driven by rotation progress — reaches spanRotation at rotationEnd. */
export function cameraYaw(p: number, phases: ScrollPhases, rot: RotationCalibration): number {
  return rot.startRotation + rot.direction * cameraProgress(p, phases) * rot.spanRotation
}

/** Camera dolly distance — intro distance → lock distance across the reveal. */
export function cameraDistance(p: number, phases: ScrollPhases, intro: number, lock: number): number {
  if (p >= phases.lockEnd) return lock
  if (p <= phases.lockEnd - 0.05) return intro
  return lerp(intro, lock, smoothstep((p - (phases.lockEnd - 0.05)) / 0.05))
}

/** Orbit pan — 0 before lock, orbitPan after; smoothstep across the lock. */
export function cameraPan(p: number, phases: ScrollPhases, orbitPan: number): number {
  const t = cameraProgress(p, phases)
  return orbitPan * smoothstep(t)
}

/**
 * Photo index over the LCD portfolio segment — climbs to count-1 at lcdEnd,
 * then HOLDS the final frame through LCD_HOLD and beyond (deterministic;
 * reversed scrolling unwinds it).
 */
export function photoIndex(p: number, phases: ScrollPhases, count: number): number {
  if (count <= 0) return -1
  if (p <= phases.lockEnd) return -1
  if (p >= phases.lcdEnd) return count - 1
  if (count === 1) return 0
  const t = (p - phases.lockEnd) / (phases.lcdEnd - phases.lockEnd)
  return Math.min(count - 1, Math.floor(t * count))
}

/** LCD cursor — 0..1 across the LCD portfolio segment (drives slide cues). */
export function lcdCursor(p: number, phases: ScrollPhases): number {
  if (p <= phases.lockEnd) return 0
  if (p >= phases.lcdEnd) return 1
  return (p - phases.lockEnd) / (phases.lcdEnd - phases.lockEnd)
}

/**
 * Intro overlay opacity — fully visible at 0, fades by rotationStart + 0.03.
 */
export function introOpacity(p: number, phases: ScrollPhases): number {
  if (p >= phases.rotationStart) return 0
  return 1 - smoothstep(p / phases.rotationStart)
}

/**
 * Screen intensity: off during rotation, ramps at settle, fully lit at lock,
 * holds at 1 through LCD_PORTFOLIO and LCD_HOLD (the final frame stays lit),
 * then fades 1→0 across the camera handoff.
 */
export function screenIntensity(p: number, phases: ScrollPhases): number {
  if (p < phases.rotationEnd) return 0
  if (p < phases.settleEnd) return 0.35
  if (p < phases.lockEnd) return smoothstep((p - phases.settleEnd) / (phases.lockEnd - phases.settleEnd))
  if (p < phases.lcdHoldEnd) return 1
  if (p < phases.handoffEnd) return 1 - smoothstep((p - phases.lcdHoldEnd) / (phases.handoffEnd - phases.lcdHoldEnd))
  return 0
}

/** Scroll hint opacity — visible through the camera lock, then fades. */
export function hintOpacity(p: number, phases: ScrollPhases): number {
  if (p >= phases.lockEnd) return 0
  return 1
}

/**
 * Camera handoff 0..1 — 0 while the camera is fully present, ramps to 1 as
 * the camera recedes across [lcdHoldEnd, handoffEnd] (scale/y/opacity cues).
 */
export function cameraHandoff(p: number, phases: ScrollPhases): number {
  if (p < phases.lcdHoldEnd) return 0
  if (p >= phases.handoffEnd) return 1
  return smoothstep((p - phases.lcdHoldEnd) / (phases.handoffEnd - phases.lcdHoldEnd))
}

/** Navigation reveal 0..1 — ramps across [handoffEnd, navEnd]. */
export function navReveal(p: number, phases: ScrollPhases): number {
  if (p < phases.handoffEnd) return 0
  if (p >= phases.navEnd) return 1
  return smoothstep((p - phases.handoffEnd) / (phases.navEnd - phases.handoffEnd))
}

/** Portfolio fade-in 0..1 — ramps from navEnd to the end of the track. */
export function portfolioReveal(p: number, phases: ScrollPhases): number {
  if (p < phases.navEnd) return 0
  if (p >= 1) return 1
  return smoothstep((p - phases.navEnd) / (1 - phases.navEnd))
}

/** Stage (3D canvas) opacity — full while the camera is present, fades with it. */
export function stageOpacity(p: number, phases: ScrollPhases): number {
  return 1 - cameraHandoff(p, phases)
}
