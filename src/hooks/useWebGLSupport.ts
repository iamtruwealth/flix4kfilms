import { useEffect, useState } from 'react'

/**
 * Detects a usable WebGL context (WebGL2 preferred; GL fallback acceptable).
 * Used to branch the app to a static, accessible fallback when unsupported.
 */
export function useWebGLSupport(): boolean {
  const [supported, setSupported] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl2 = canvas.getContext('webgl2')
      const gl = gl2 || canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
      setSupported(Boolean(gl))
    } catch {
      setSupported(false)
    }
  }, [])

  return supported !== false
}