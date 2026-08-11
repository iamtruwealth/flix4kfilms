import { useSyncExternalStore } from 'react'

/**
 * Minimal external store (no third-party state lib).
 * Calibration, scroll state, and debug flags subscribe with React's
 * useSyncExternalStore; the 3D render loop reads the same snapshots directly.
 */

export interface ExternalStore<T> {
  get: () => T
  snapshot: () => T
  subscribe: (listener: () => void) => () => void
  set: (patch: Partial<T> | ((prev: T) => T)) => void
  update: (updater: (prev: T) => T) => void
}

export function createStore<T>(initial: T): ExternalStore<T> {
  let state = initial
  const listeners = new Set<() => void>()

  const emit = () => {
    for (const l of listeners) l()
  }

  return {
    get: () => state,
    // Always return a fresh-but-stable reference: we only mutate by replacement.
    snapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    set: (patch) => {
      state = typeof patch === 'function' ? (patch as (prev: T) => T)(state) : { ...state, ...patch }
      emit()
    },
    update: (updater) => {
      state = updater(state)
      emit()
    },
  }
}

export function useStore<T>(store: ExternalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot)
}