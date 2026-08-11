import type { Object3D } from 'three'

interface CameraModelProps {
  /** Cloned GLTF scene (the camera geometry). */
  object: Object3D
  /**
   * Local position that recenters the model on the pivot origin.
   * (model units — the parent scale group makes this camera-local.)
   */
  position: [number, number, number]
}

/**
 * Owns the model's local position/orientation inside the camera-local frame.
 * Rotation of the whole camera is owned by CameraPivot; visual framing is
 * owned by the normalization group. Changes to framing never touch rotation.
 */
export function CameraModel({ object, position }: CameraModelProps) {
  return <primitive object={object} position={position} />
}