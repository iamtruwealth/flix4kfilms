import { describe, expect, it } from 'vitest'
import { SEO_ENTRIES } from './seoContent'
import { buildBreadcrumbSchema } from './schema'
import { transformRouteHtml } from './staticRouteHtml'

describe('transformRouteHtml', () => {
  it('creates route-specific metadata and breadcrumb schema', () => {
    const source = `<!doctype html><html><head>
      <title>Home</title><meta name="description" content="Home">
      <link rel="canonical" href="https://flix4kfilms.art/">
      <meta property="og:title" content="Home"><meta property="og:description" content="Home">
      <meta property="og:url" content="https://flix4kfilms.art/">
      <script type="application/ld+json" data-homepage-schema="WebSite">{"@type":"WebSite"}</script>
      <link rel="preload" href="./camera.glb">
    </head><body></body></html>`
    const entry = SEO_ENTRIES['/about']
    const transformed = transformRouteHtml(source, entry, buildBreadcrumbSchema(entry.path))

    expect(transformed).toContain(`<title>${entry.title.replace('&', '&amp;')}</title>`)
    expect(transformed).toContain(`<meta name="description" content="${entry.description}">`)
    expect(transformed).toContain(`<link rel="canonical" href="https://flix4kfilms.art${entry.path}">`)
    expect(transformed).toContain(`<meta property="og:url" content="https://flix4kfilms.art${entry.path}">`)
    expect(transformed).toContain('"@type":"BreadcrumbList"')
    expect(transformed).not.toContain('data-homepage-schema')
    expect(transformed).toContain('href="/camera.glb"')
  })
})
