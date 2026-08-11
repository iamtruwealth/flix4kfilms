import { createStore, useStore } from './store'

/**
 * Development-only debug flags. Gated by `import.meta.env.DEV` so the panels,
 * diagnostics and calibration UI are never shipped to production builds.
 *
 * Keys (only active in dev):
 *   C — calibration guides (physical/virtual LCD bounds, viewport crosshair)
 *   D — LCD calibration panel
 *   G — scene grid + axes gizmo
 *   L — lighting helpers
 *   P — performance telemetry overlay
 */

export interface DebugState {
  calibration: boolean
  grid: boolean
  lighting: boolean
  perf: boolean
  /** Manual preview of the LCD (let the camera be overridden). */
  lcdPreview: boolean
  /** Manual photo index override (keyboard arrows while D open). */
  forcedPhotoIndex: number | null
  /** Dev calibration guides overlay (physical vs virtual LCD bounds). */
  guides: boolean
}

export const debugStore = createStore<DebugState>({
  calibration: false,
  grid: false,
  lighting: false,
  perf: false,
  lcdPreview: false,
  forcedPhotoIndex: null,
  guides: false,
})

export function useDebug(): DebugState {
  return useStore(debugStore)
}

export function toggleDebug(key: keyof DebugState): void {
  debugStore.update((s) => ({ ...s, [key]: !s[key] }))
}

export function setDebug(patch: Partial<DebugState>): void {
  debugStore.update((s) => ({ ...s, ...patch }))
}

/** True only in development builds — debug code is excluded from prod. */
export const DEBUG_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG === '1'
