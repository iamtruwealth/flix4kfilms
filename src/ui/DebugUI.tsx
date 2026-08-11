import { useEffect, useRef, useState } from 'react'
import {
  DEBUG_ENABLED,
  useDebug,
  toggleDebug,
} from '../lib/debugStore'
import {
  useCalibrationConfig,
  setCalibration,
  resetCalibration,
} from '../lib/calibrationStore'
import { useScrollProgress } from '../lib/scrollStore'
import { phaseAt } from '../scroll/scrollState'

interface Row {
  label: string
  min: number
  max: number
  step: number
  get: (cfg: ReturnType<typeof useCalibrationConfig>) => number
  set: (cfg: ReturnType<typeof useCalibrationConfig>, v: number) => ReturnType<typeof useCalibrationConfig>
}

function Slider({ label, value, min, max, step, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="ctl">
      <span className="ctl-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="ctl-val">{value.toFixed(3)}</span>
    </label>
  )
}

function Panel({ title, rows }: { title: string; rows: Row[] }) {
  const cfg = useCalibrationConfig()
  return (
    <section className="panel">
      <h3>{title}</h3>
      {rows.map((r) => (
        <Slider
          key={r.label}
          label={r.label}
          value={r.get(cfg)}
          min={r.min}
          max={r.max}
          step={r.step}
          onChange={(v) => setCalibration((prev) => r.set(prev, v))}
        />
      ))}
    </section>
  )
}

export function DebugUI() {
  const debug = useDebug()
  const cfg = useCalibrationConfig()
  const progress = useScrollProgress()
  const phase = phaseAt(progress, cfg.phases)

  return (
    <>
      {DEBUG_ENABLED && debug.calibration && (
        <aside className="caliblab" aria-label="Calibration controls">
          <div className="caliblab-head">
            <span>CALIBRATION — LIVE</span>
            <button onClick={() => toggleDebug('calibration')}>✕</button>
          </div>
          <div className="caliblab-scroll">
            <Panel
              title="Phases"
              rows={[
                { label: 'rotationStart', min: 0.02, max: 0.6, step: 0.01, get: (c) => c.phases.rotationStart, set: (c, v) => ({ ...c, phases: { ...c.phases, rotationStart: v } }) },
                { label: 'rotationEnd', min: 0.2, max: 0.8, step: 0.01, get: (c) => c.phases.rotationEnd, set: (c, v) => ({ ...c, phases: { ...c.phases, rotationEnd: v } }) },
                { label: 'settleEnd', min: 0.3, max: 0.9, step: 0.01, get: (c) => c.phases.settleEnd, set: (c, v) => ({ ...c, phases: { ...c.phases, settleEnd: v } }) },
                { label: 'lockEnd', min: 0.4, max: 0.95, step: 0.01, get: (c) => c.phases.lockEnd, set: (c, v) => ({ ...c, phases: { ...c.phases, lockEnd: v } }) },
                { label: 'lcdEnd', min: 0.6, max: 1, step: 0.01, get: (c) => c.phases.lcdEnd, set: (c, v) => ({ ...c, phases: { ...c.phases, lcdEnd: v } }) },
                { label: 'lcdHoldEnd', min: 0.6, max: 1, step: 0.01, get: (c) => c.phases.lcdHoldEnd, set: (c, v) => ({ ...c, phases: { ...c.phases, lcdHoldEnd: v } }) },
                { label: 'handoffEnd', min: 0.7, max: 1, step: 0.01, get: (c) => c.phases.handoffEnd, set: (c, v) => ({ ...c, phases: { ...c.phases, handoffEnd: v } }) },
                { label: 'navEnd', min: 0.8, max: 1, step: 0.01, get: (c) => c.phases.navEnd, set: (c, v) => ({ ...c, phases: { ...c.phases, navEnd: v } }) },
              ]}
            />
            <Panel
              title="Rotation"
              rows={[
                { label: 'startRotation', min: -3.2, max: 3.2, step: 0.01, get: (c) => c.rotation.startRotation, set: (c, v) => ({ ...c, rotation: { ...c.rotation, startRotation: v } }) },
                { label: 'span (π)', min: 0.2, max: 6.3, step: 0.01, get: (c) => c.rotation.spanRotation, set: (c, v) => ({ ...c, rotation: { ...c.rotation, spanRotation: v } }) },
              ]}
            />
            <div className="panel-actions">
              <button onClick={() => setCalibration((p) => ({ ...p, rotation: { ...p.rotation, direction: p.rotation.direction === 1 ? -1 : 1 } }))}>
                direction: {cfg.rotation.direction === 1 ? '+' : '−'}
              </button>
            </div>
            <Panel
              title="Camera"
              rows={[
                { label: 'fov', min: 25, max: 75, step: 0.5, get: (c) => c.scene.cameraFov, set: (c, v) => ({ ...c, scene: { ...c.scene, cameraFov: v } }) },
                { label: 'dist intro', min: 3, max: 10, step: 0.05, get: (c) => c.scene.cameraDistanceIntro, set: (c, v) => ({ ...c, scene: { ...c.scene, cameraDistanceIntro: v } }) },
                { label: 'dist lock', min: 2, max: 8, step: 0.05, get: (c) => c.scene.cameraDistanceLock, set: (c, v) => ({ ...c, scene: { ...c.scene, cameraDistanceLock: v } }) },
                { label: 'targetY', min: -2, max: 2, step: 0.01, get: (c) => c.scene.orbitTargetY, set: (c, v) => ({ ...c, scene: { ...c.scene, orbitTargetY: v } }) },
                { label: 'pan', min: 0, max: 1.5, step: 0.01, get: (c) => c.scene.orbitPan, set: (c, v) => ({ ...c, scene: { ...c.scene, orbitPan: v } }) },
              ]}
            />
            <Panel
              title="Lights"
              rows={[
                { label: 'key', min: 0, max: 8, step: 0.05, get: (c) => c.scene.keyIntensity, set: (c, v) => ({ ...c, scene: { ...c.scene, keyIntensity: v } }) },
                { label: 'rim', min: 0, max: 6, step: 0.05, get: (c) => c.scene.rimIntensity, set: (c, v) => ({ ...c, scene: { ...c.scene, rimIntensity: v } }) },
                { label: 'fill', min: 0, max: 4, step: 0.05, get: (c) => c.scene.fillIntensity, set: (c, v) => ({ ...c, scene: { ...c.scene, fillIntensity: v } }) },
                { label: 'env', min: 0, max: 3, step: 0.05, get: (c) => c.scene.envIntensity, set: (c, v) => ({ ...c, scene: { ...c.scene, envIntensity: v } }) },
              ]}
            />
            <Panel
              title="LCD plane"
              rows={[
                { label: 'x', min: -4, max: 4, step: 0.01, get: (c) => c.lcd.x, set: (c, v) => ({ ...c, lcd: { ...c.lcd, x: v } }) },
                { label: 'y', min: -4, max: 4, step: 0.01, get: (c) => c.lcd.y, set: (c, v) => ({ ...c, lcd: { ...c.lcd, y: v } }) },
                { label: 'z', min: -6, max: 0, step: 0.01, get: (c) => c.lcd.z, set: (c, v) => ({ ...c, lcd: { ...c.lcd, z: v } }) },
                { label: 'width', min: 0.5, max: 5, step: 0.01, get: (c) => c.lcd.width, set: (c, v) => ({ ...c, lcd: { ...c.lcd, width: v } }) },
                { label: 'height', min: 0.5, max: 4, step: 0.01, get: (c) => c.lcd.height, set: (c, v) => ({ ...c, lcd: { ...c.lcd, height: v } }) },
                { label: 'depthBias', min: 0, max: 0.5, step: 0.01, get: (c) => c.lcd.depthBias, set: (c, v) => ({ ...c, lcd: { ...c.lcd, depthBias: v } }) },
                { label: 'lighten', min: 0, max: 0.4, step: 0.01, get: (c) => c.lcd.lighten, set: (c, v) => ({ ...c, lcd: { ...c.lcd, lighten: v } }) },
                { label: 'rotX (rad)', min: -3.2, max: 3.2, step: 0.01, get: (c) => c.lcd.rotationX, set: (c, v) => ({ ...c, lcd: { ...c.lcd, rotationX: v } }) },
                { label: 'rotY (rad)', min: 0, max: 6.3, step: 0.01, get: (c) => c.lcd.rotationY, set: (c, v) => ({ ...c, lcd: { ...c.lcd, rotationY: v } }) },
                { label: 'rotZ (rad)', min: -3.2, max: 3.2, step: 0.01, get: (c) => c.lcd.rotationZ, set: (c, v) => ({ ...c, lcd: { ...c.lcd, rotationZ: v } }) },
              ]}
            />
            <Panel
              title="Screen content"
              rows={[
                { label: 'aspect (0=inherit)', min: 0, max: 2.4, step: 0.01, get: (c) => c.content.aspect, set: (c, v) => ({ ...c, content: { ...c.content, aspect: v } }) },
                { label: 'scale', min: 0.5, max: 1.6, step: 0.01, get: (c) => c.content.scale, set: (c, v) => ({ ...c, content: { ...c.content, scale: v } }) },
                { label: 'offset x', min: -0.4, max: 0.4, step: 0.01, get: (c) => c.content.x, set: (c, v) => ({ ...c, content: { ...c.content, x: v } }) },
                { label: 'offset y', min: -0.4, max: 0.4, step: 0.01, get: (c) => c.content.y, set: (c, v) => ({ ...c, content: { ...c.content, y: v } }) },
              ]}
            />
            <Panel
              title="Framing (viewport)"
              rows={[
                { label: 'offset x', min: -1, max: 1, step: 0.01, get: (c) => c.framing.x, set: (c, v) => ({ ...c, framing: { ...c.framing, x: v } }) },
                { label: 'offset y', min: -1, max: 1, step: 0.01, get: (c) => c.framing.y, set: (c, v) => ({ ...c, framing: { ...c.framing, y: v } }) },
                { label: 'offset z', min: -1, max: 1, step: 0.01, get: (c) => c.framing.z, set: (c, v) => ({ ...c, framing: { ...c.framing, z: v } }) },
              ]}
            />
            <div className="panel-actions">
              <button onClick={() => toggleDebug('guides')}>
                guides: {debug.guides ? 'ON' : 'OFF'}
              </button>
            </div>
            <Panel
              title="Environment"
              rows={[
                { label: 'radius', min: 2, max: 12, step: 0.25, get: (c) => c.environment.radius, set: (c, v) => ({ ...c, environment: { ...c.environment, radius: v } }) },
                { label: 'y', min: -4, max: 2, step: 0.05, get: (c) => c.environment.y, set: (c, v) => ({ ...c, environment: { ...c.environment, y: v } }) },
                { label: 'arc (rad)', min: 0.5, max: 6.3, step: 0.05, get: (c) => c.environment.arc, set: (c, v) => ({ ...c, environment: { ...c.environment, arc: v } }) },
                { label: 'scale', min: 0.05, max: 1, step: 0.01, get: (c) => c.environment.scale, set: (c, v) => ({ ...c, environment: { ...c.environment, scale: v } }) },
                { label: 'yaw (rad)', min: -3.2, max: 3.2, step: 0.05, get: (c) => c.environment.yaw, set: (c, v) => ({ ...c, environment: { ...c.environment, yaw: v } }) },
                { label: 'shade', min: 0, max: 0.5, step: 0.005, get: (c) => c.environment.shade, set: (c, v) => ({ ...c, environment: { ...c.environment, shade: v } }) },
              ]}
            />
            <div className="panel-actions">
              <button
                onClick={() =>
                  setCalibration((p) => ({ ...p, environment: { ...p.environment, enabled: !p.environment.enabled } }))
                }
              >
                env: {cfg.environment.enabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <Panel
              title="Dot field"
              rows={[
                { label: 'gap', min: 20, max: 48, step: 1, get: (c) => c.dotField.gap, set: (c, v) => ({ ...c, dotField: { ...c.dotField, gap: v } }) },
                { label: 'radius', min: 0.5, max: 3, step: 0.1, get: (c) => c.dotField.radius, set: (c, v) => ({ ...c, dotField: { ...c.dotField, radius: v } }) },
                { label: 'baseAlpha', min: 0, max: 1, step: 0.05, get: (c) => c.dotField.baseAlpha, set: (c, v) => ({ ...c, dotField: { ...c.dotField, baseAlpha: v } }) },
                { label: 'hoverRadius', min: 30, max: 200, step: 5, get: (c) => c.dotField.hoverRadius, set: (c, v) => ({ ...c, dotField: { ...c.dotField, hoverRadius: v } }) },
                { label: 'hoverStrength', min: 0, max: 1, step: 0.05, get: (c) => c.dotField.hoverStrength, set: (c, v) => ({ ...c, dotField: { ...c.dotField, hoverStrength: v } }) },
                { label: 'attraction', min: 0, max: 1.0, step: 0.02, get: (c) => c.dotField.attraction, set: (c, v) => ({ ...c, dotField: { ...c.dotField, attraction: v } }) },
                { label: 'spring', min: 0, max: 0.05, step: 0.001, get: (c) => c.dotField.spring, set: (c, v) => ({ ...c, dotField: { ...c.dotField, spring: v } }) },
                { label: 'damping', min: 0.5, max: 0.99, step: 0.005, get: (c) => c.dotField.damping, set: (c, v) => ({ ...c, dotField: { ...c.dotField, damping: v } }) },
                { label: 'maxSpeed', min: 2, max: 24, step: 0.5, get: (c) => c.dotField.maxSpeed, set: (c, v) => ({ ...c, dotField: { ...c.dotField, maxSpeed: v } }) },
              ]}
            />
            <div className="panel-actions">
              <button
                onClick={() =>
                  setCalibration((p) => ({ ...p, dotField: { ...p.dotField, swarm: !p.dotField.swarm } }))
                }
              >
                swarm: {cfg.dotField.swarm ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() =>
                  setCalibration((p) => ({ ...p, dotField: { ...p.dotField, enabled: !p.dotField.enabled } }))
                }
              >
                dots: {cfg.dotField.enabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <Panel
              title="Global"
              rows={[
                { label: 'track vh', min: 300, max: 1500, step: 25, get: (c) => c.scene.scrollLengthVh, set: (c, v) => ({ ...c, scene: { ...c.scene, scrollLengthVh: v } }) },
                { label: 'targetDiagonal', min: 2, max: 10, step: 0.05, get: (c) => c.normalize.targetDiagonal, set: (c, v) => ({ ...c, normalize: { ...c.normalize, targetDiagonal: v } }) },
                { label: 'scaleOverride (0=auto)', min: 0, max: 10, step: 0.05, get: (c) => c.normalize.scaleOverride, set: (c, v) => ({ ...c, normalize: { ...c.normalize, scaleOverride: v } }) },
                { label: 'shadows', min: 512, max: 4096, step: 256, get: (c) => c.quality.shadowsResolution, set: (c, v) => ({ ...c, quality: { ...c.quality, shadowsResolution: v } }) },
                { label: 'max dpr', min: 0.5, max: 2, step: 0.25, get: (c) => c.quality.maxDpr, set: (c, v) => ({ ...c, quality: { ...c.quality, maxDpr: v } }) },
              ]}
            />
            <div className="panel-actions">
              <button onClick={resetCalibration}>RESET</button>
              <span className="phase-tag">{phase}</span>
            </div>
          </div>
        </aside>
      )}

      {DEBUG_ENABLED && debug.perf && <PerfOverlay />}
    </>
  )
}

function PerfOverlay() {
  const [fps, setFps] = useState(60)
  const cfg = useCalibrationConfig()
  const progress = useScrollProgress()
  const phase = phaseAt(progress, cfg.phases)
  const frames = useRef(0)
  const last = useRef(performance.now())

  useEffect(() => {
    let raf = 0
    const loop = (t: number) => {
      frames.current++
      if (t - last.current >= 500) {
        setFps(Math.round(frames.current / ((t - last.current) / 1000)))
        frames.current = 0
        last.current = t
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio

  return (
    <div className="perf" aria-hidden="true">
      <dl>
        <div><dt>fps</dt><dd>{fps}</dd></div>
        <div><dt>progress</dt><dd>{progress.toFixed(3)}</dd></div>
        <div><dt>phase</dt><dd>{phase}</dd></div>
        <div><dt>dpr</dt><dd>{dpr.toFixed(1)}</dd></div>
      </dl>
    </div>
  )
}