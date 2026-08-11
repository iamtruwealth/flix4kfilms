import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset base — the built bundle works under any static subpath
  // (e.g. GitHub Pages <org>.github.io/<repo>/). Routing uses HashRouter so
  // no server-side rewrite rules are required for deep links.
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) return 'vendor-react'
          if (id.includes('node_modules/three/build')) return 'vendor-three'
          if (id.includes('node_modules/@react-three/drei')) return 'vendor-drei'
          if (id.includes('node_modules/gsap')) return 'vendor-anim'
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase'
        },
      },
    },
  },
})
