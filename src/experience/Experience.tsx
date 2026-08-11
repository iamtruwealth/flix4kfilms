import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { SceneEnvironment } from './SceneEnvironment'
import { CameraExperience, CAMERA_GLB } from './CameraExperience'
import { SceneCameraRig } from './SceneCameraRig'
import { StudioSilhouettes } from './StudioSilhouettes'
import { STUDIO_GLB } from '../lib/studioEnvironment'
import { useResponsiveQuality } from '../hooks/useResponsiveQuality'
import { useCalibrationConfig } from '../lib/calibrationStore'
import { useWebGLSupport } from '../hooks/useWebGLSupport'

// Warm the GLBs so the camera and studio props are ready the moment the canvas mounts.
useGLTF.preload(CAMERA_GLB)
useGLTF.preload(STUDIO_GLB)

/**
 * The full deterministic 3D experience:
 *
 *   <Experience/>           — WebGL canvas root
 *   ├─ <SceneEnvironment/>  — studio lights + reflections, no scene `color`
 *   ├─ <CameraExperience/>  — GLTF clone → normalize → pivot (scroll yaw)
 *   │  ├─ <CameraModel/>    — model, recentered in camera-local space
 *   │  └─ <CameraScreen/>   — rear LCD canvas layer (per-frame, no re-renders)
 *   └─ <SceneCameraRig/>    — viewing camera orbit (pure function of scroll)
 *
 * The scene background stays pure black — the camera is the only subject.
 */
export function Experience() {
  const supported = useWebGLSupport()
  if (!supported) return <FallbackMessage />

  return (
    <ExperienceCanvas />
  )
}

function ExperienceCanvas() {
  const cfg = useCalibrationConfig()
  const { dpr } = useResponsiveQuality(cfg.quality.maxDpr)

  return (
    <Canvas
      dpr={dpr}
      camera={{ fov: cfg.scene.cameraFov, near: 0.1, far: 80, position: [0, 0, 6] }}
      shadows="percentage"
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
      }}
    >
      <Suspense fallback={null}>
        <CameraExperience />
        <StudioSilhouettes />
      </Suspense>
      <SceneEnvironment />
      <SceneCameraRig />
    </Canvas>
  )
}

function FallbackMessage() {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#aaa',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        background: '#000',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      This experience needs WebGL. Try a current browser — Firefox, Chrome, or Safari.
    </div>
  )
}