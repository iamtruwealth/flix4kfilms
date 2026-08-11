import { createStore, useStore } from './store'

/**
 * Scroll progress store — the raw 0..1 document-scroll position only.
 * GSAP ScrollTrigger writes here (rAF-throttled); all derived values
 * (phase, yaw, photo index…) are computed from progress via the pure
 * functions in scroll/scrollState.ts, so there is exactly one source of truth.
 */

export interface ScrollProgressOnly {
  progress: number
}

export const scrollStore = createStore<ScrollProgressOnly>({ progress: 0 })

export function useScrollProgress(): number {
  return useStore(scrollStore).progress
}

/** Raw progress for the render loop (avoids React re-renders). */
export function getRawProgress(): number {
  return scrollStore.get().progress
}

/** Called from ScrollTrigger.onUpdate (already rAF-throttled). */
export function publishScrollProgress(progress: number): void {
  scrollStore.set({ progress })
}