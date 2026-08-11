import { Environment, Grid, Lightformer } from '@react-three/drei'
import { useCalibrationConfig } from '../lib/calibrationStore'
import { useDebug } from '../lib/debugStore'

const KEY_POS: [number, number, number] = [5.5, 8.5, 7]
const RIM_POS: [number, number, number] = [-6, 5, -8]
const FILL_POS: [number, number, number] = [0, -3, 4]

/**
 * Studio environment for the product reveal: pure white lights, no color
 * cast, local lightformers for the metal/glass reflections (no network HDR).
 * Black environment; black/white only.
 */
export function SceneEnvironment() {
  const cfg = useCalibrationConfig()
  const debug = useDebug()
  const { scene, quality } = cfg

  return (
    <>
      <ambientLight intensity={0.12} />

      {/* Key — sculpts the front/sides */}
      <directionalLight
        position={KEY_POS}
        intensity={scene.keyIntensity}
        castShadow
        shadow-mapSize={[quality.shadowsResolution, quality.shadowsResolution]}
        shadow-bias={-0.0004}
      />

      {/* Rim — separates silhouette from the black field */}
      <directionalLight position={RIM_POS} intensity={scene.rimIntensity} />

      {/* Fill — controlled, cool */}
      <directionalLight position={FILL_POS} intensity={scene.fillIntensity} />

      {/* Local studio reflections, deterministic, offline-safe */}
      {scene.envIntensity > 0 && (
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={scene.envIntensity} rotation-x={Math.PI / 2} position={[0, 4, -2]} scale={[10, 10, 1]} />
          <Lightformer intensity={scene.envIntensity * 0.7} rotation-y={Math.PI / 2} position={[-6, 1, 0]} scale={[12, 4, 1]} />
          <Lightformer intensity={scene.envIntensity * 0.5} rotation-y={-Math.PI / 2} position={[6, 1, 0]} scale={[12, 4, 1]} />
          <Lightformer intensity={scene.envIntensity * 0.4} rotation-x={Math.PI} position={[0, -2, 0]} scale={[12, 8, 1]} />
        </Environment>
      )}

      {/* Dev gizmos */}
      {debug.grid && (
        <>
          <Grid
            position={[0, -1.9, 0]}
            args={[24, 24]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#1a1a1a"
            sectionSize={2.5}
            sectionThickness={1}
            sectionColor="#3a3a3a"
            fadeDistance={40}
            fadeStrength={1.5}
            infiniteGrid
          />
          <axesHelper args={[3]} />
        </>
      )}

      {/* Light source markers for the L overlay */}
      {debug.lighting &&
        [KEY_POS, RIM_POS, FILL_POS].map((p, i) => (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.18, 12, 12]} />
            <meshBasicMaterial color="#ffffff" wireframe />
          </mesh>
        ))}
    </>
  )
}