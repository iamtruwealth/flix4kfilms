import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset base — the built bundle works under any static subpath
  // (e.g. GitHub Pages <org>.github.io/<repo>/). Routing uses HashRouter so
  // no server-side rewrite rules are required for deep links.
  base: './',
})
