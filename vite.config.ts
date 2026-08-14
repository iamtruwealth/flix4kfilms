import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { SEO_ENTRIES } from './src/seo/seoContent.js'
import { buildBreadcrumbSchema } from './src/seo/schema.js'
import { transformAdminRouteHtml, transformRouteHtml } from './src/seo/staticRouteHtml.js'

const ADMIN_ROUTES = ['/admin', '/admin/login', '/admin/photos', '/admin/videos', '/admin/categories', '/admin/settings']

function generateSeoRouteEntrypoints() {
  let outDir = ''

  return {
    name: 'generate-seo-route-entrypoints',
    configResolved(config: { root: string; build: { outDir: string } }) {
      outDir = resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const homepageHtml = await readFile(resolve(outDir, 'index.html'), 'utf8')

      await Promise.all(
        Object.values(SEO_ENTRIES)
          .filter((entry) => entry.path !== '/')
          .map(async (entry) => {
            const routeDir = resolve(outDir, entry.path.slice(1))
            await mkdir(routeDir, { recursive: true })
            const html = transformRouteHtml(homepageHtml, entry, buildBreadcrumbSchema(entry.path))
            await writeFile(resolve(routeDir, 'index.html'), html)
          }),
      )

      await Promise.all(
        ADMIN_ROUTES.map(async (path) => {
          const routeDir = resolve(outDir, path.slice(1))
          await mkdir(routeDir, { recursive: true })
          await writeFile(resolve(routeDir, 'index.html'), transformAdminRouteHtml(homepageHtml))
        }),
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), generateSeoRouteEntrypoints()],
  // The site is deployed at the root of the flix4kfilms.art custom domain.
  base: '/',
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
