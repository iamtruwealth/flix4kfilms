import { useMemo } from 'react'
import type { CalibrationConfig } from './calibrationPresets'
import { DEFAULT_CALIBRATION } from './calibrationPresets'
import { createStore, useStore } from './store'

/**
 * Centralized calibration store. All tunable values live in
 * calibrationPresets.ts; this store exposes runtime edits (debug panel `D`).
 * Paint in a single store; components subscribe via useStore.
 */

export const calibrationStore = createStore<CalibrationConfig>(DEFAULT_CALIBRATION)

export function useCalibrationConfig(): CalibrationConfig {
  return useStore(calibrationStore)
}

/** Deep-merge a partial calibration update (stable helper for the panel). */
export function setCalibration(updater: (prev: CalibrationConfig) => CalibrationConfig): void {
  calibrationStore.update(updater)
}

export function useSetCalibration() {
  return useMemo(() => setCalibration, [])
}

export function resetCalibration(): void {
  calibrationStore.update(() => DEFAULT_CALIBRATION)
}