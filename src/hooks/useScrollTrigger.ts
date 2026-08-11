import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { publishScrollProgress } from '../lib/scrollStore'

gsap.registerPlugin(ScrollTrigger)

/**
 * Wires the deterministic scroll path: a tall track element whose document
 * position maps 0..1 to scroll progress. GSAP provides the scroll engine,
 * pinning and scrubbing; the camera itself never animates from wheel events —
 * it is recomputed each frame as a pure function of this progress.
 */
export function useScrollTrigger(enabled: boolean) {
  const trackRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!enabled) return
    const trigger = trackRef.current
    if (!trigger) return

    let raf = 0

    const instance = ScrollTrigger.create({
      trigger,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true, // direct mapping: same scroll position ⇒ same progress
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress
        if (raf) cancelAnimationFrame(raf)
        raf = requestAnimationFrame(() => {
          publishScrollProgress(p)
          raf = 0
        })
      },
    })

    // Resync on mount so a reload at depth keeps a valid state.
    instance.refresh()

    return () => {
      if (raf) cancelAnimationFrame(raf)
      instance.kill()
    }
  }, [enabled])

  return trackRef
}