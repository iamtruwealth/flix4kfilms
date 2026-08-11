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
 * pointer-events: none.
 *
 * With `swarm` enabled (and a fine pointer, no reduced-motion), dots are
 * physically simulated: an attraction force pulls dots inside `hoverRadius`
 * toward the pointer while a spring pulls them back to their home grid spot.
 * The result is a swarm that gathers around and follows the cursor, then
 * relaxes home. Under prefers-reduced-motion or coarse/touch pointers the
 * field renders once, static.
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

    interface Particle {
      homeX: number
      homeY: number
      x: number
      y: number
      vx: number
      vy: number
    }

    let homes: { x: number; y: number }[] = []
    let dots: Particle[] = []
    let pointer: { x: number; y: number } | null = null
    let raf = 0
    let running = false

    const loop = () => {
      if (df.swarm) {
        for (const dot of dots) {
          let ax = 0
          let ay = 0
          if (pointer) {
            const dx = pointer.x - dot.x
            const dy = pointer.y - dot.y
            const d = Math.hypot(dx, dy)
            if (d > 0 && d < df.hoverRadius) {
              const t = 1 - d / df.hoverRadius
              const s = (df.attraction * t) / d
              ax += dx * s
              ay += dy * s
            }
          }
          ax += (dot.homeX - dot.x) * df.spring
          ay += (dot.homeY - dot.y) * df.spring
          dot.vx = (dot.vx + ax) * df.damping
          dot.vy = (dot.vy + ay) * df.damping
          const speed = Math.hypot(dot.vx, dot.vy)
          if (speed > df.maxSpeed) {
            dot.vx = (dot.vx / speed) * df.maxSpeed
            dot.vy = (dot.vy / speed) * df.maxSpeed
          }
          dot.x += dot.vx
          dot.y += dot.vy
        }
      }
      draw()
      if (pointer || dots.some((d) => Math.abs(d.vx) > 0.02 || Math.abs(d.vy) > 0.02)) {
        raf = requestAnimationFrame(loop)
      } else {
        running = false
      }
    }

    const start = () => {
      if (running) return
      running = true
      raf = requestAnimationFrame(loop)
    }

    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      running = false
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)
      ctx.fillStyle = df.color
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i]
        let alpha = df.baseAlpha
        if (pointer) {
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

    const build = () => {
      const rect = canvas.getBoundingClientRect()
      const w = Math.max(0, Math.round(rect.width * dpr))
      const h = Math.max(0, Math.round(rect.height * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)
      homes = computeDotPositions(rect.width, rect.height, df.gap)
      dots = homes.map((home) => ({ ...home, homeX: home.x, homeY: home.y, vx: 0, vy: 0 }))
      pointer = null
      draw()
    }

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      if (!staticField) start()
      else draw()
    }

    const onPointerLeave = () => {
      pointer = null
      if (!staticField) start()
      else draw()
    }

    const resize = () => {
      build()
      if (!staticField) draw()
    }

    build()
    window.addEventListener('resize', resize)
    if (!staticField) {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      window.addEventListener('pointerleave', onPointerLeave)
    }

    return () => {
      stop()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [df.enabled, df.gap, df.radius, df.color, df.baseAlpha, df.hoverRadius, df.hoverStrength, df.swarm, df.attraction, df.spring, df.damping, df.maxSpeed, dpr, staticField])

  if (!df.enabled) return null

  return (
    <canvas
      ref={canvasRef}
      className="dot-field"
      aria-hidden="true"
      data-static={staticField}
    />
  )
}
