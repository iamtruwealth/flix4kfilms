import { useEffect } from 'react'
import { DEBUG_ENABLED, debugStore, setDebug, toggleDebug } from '../lib/debugStore'

/**
 * Dev-only keyboard shortcuts:
 *   C  calibration guides (physical/virtual LCD bounds, viewport crosshair)
 *   D  LCD calibration panel
 *   G  grid + gizmo
 *   L  lighting helpers
 *   P  performance telemetry
 *   ←/→  force LCD photo index (while calibration panel is open)
 *   Escape  close any open panel
 */
export function useDebugKeys(): void {
  useEffect(() => {
    if (!DEBUG_ENABLED) return

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key.toLowerCase()) {
        case 'c':
          toggleDebug('guides')
          break
        case 'd':
          toggleDebug('calibration')
          break
        case 'g':
          toggleDebug('grid')
          break
        case 'l':
          toggleDebug('lighting')
          break
        case 'p':
          toggleDebug('perf')
          break
        case ' ': {
          const { lcdPreview, calibration } = debugStore.get()
          if (calibration) setDebug({ lcdPreview: !lcdPreview })
          e.preventDefault()
          break
        }
        case 'arrowleft': {
          const s = debugStore.get()
          if (!s.calibration) return
          const cur = s.forcedPhotoIndex ?? -1
          setDebug({ forcedPhotoIndex: Math.max(-1, cur - 1) })
          e.preventDefault()
          break
        }
        case 'arrowright': {
          const s = debugStore.get()
          if (!s.calibration) return
          const cur = s.forcedPhotoIndex ?? -1
          setDebug({ forcedPhotoIndex: cur < 7 ? cur + 1 : cur })
          e.preventDefault()
          break
        }
        case 'escape':
          setDebug({ calibration: false, lcdPreview: false })
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}