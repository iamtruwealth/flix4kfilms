// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { JsonLd } from './JsonLd'
import {
  buildBreadcrumbSchema,
  buildOrganizationSchema,
  buildWebSiteSchema,
} from './schema'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const FORBIDDEN_FIELDS = ['telephone', 'address', 'aggregateRating', 'review', 'award']

let container: HTMLDivElement | undefined
let root: ReturnType<typeof createRoot> | undefined

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  document.head.innerHTML = ''
  root = undefined
  container = undefined
})

function renderJsonLd(data: Record<string, unknown>) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root?.render(createElement(JsonLd, { data })))
}

describe('JSON-LD schemas', () => {
  it('builds homepage WebSite and Organization schemas with verified fields only', () => {
    const schemas = [buildWebSiteSchema(), buildOrganizationSchema()]

    expect(schemas.map((schema) => schema['@type'])).toEqual(['WebSite', 'Organization'])
    expect(schemas.every((schema) => schema['@context'] === 'https://schema.org')).toBe(true)
    expect(schemas.every((schema) => schema.url === 'https://flix4kfilms.art')).toBe(true)
    expect(schemas.flatMap((schema) => Object.keys(schema))).not.toEqual(
      expect.arrayContaining(FORBIDDEN_FIELDS),
    )
  })

  it('builds absolute breadcrumbs for public non-home routes', () => {
    expect(buildBreadcrumbSchema('/portfolio/weddings')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://flix4kfilms.art/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Portfolio',
          item: 'https://flix4kfilms.art/portfolio',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Weddings',
          item: 'https://flix4kfilms.art/portfolio/weddings',
        },
      ],
    })
    expect(buildBreadcrumbSchema('/')).toBeNull()
    expect(buildBreadcrumbSchema('/admin/settings')).toBeNull()
  })

  it('escapes less-than characters before writing JSON-LD markup', () => {
    renderJsonLd({ '@context': 'https://schema.org', '@type': 'Thing', name: '</script><script>alert(1)</script>' })

    const script = container?.querySelector('script[type="application/ld+json"]')
    expect(script?.textContent).toContain('\\u003c/script>')
    expect(script?.textContent).not.toContain('</script>')
  })
})
