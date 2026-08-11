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
