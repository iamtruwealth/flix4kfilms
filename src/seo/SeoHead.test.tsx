// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { AdminSeoHead, NoIndexSeoHead, SeoHead } from './SeoHead'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const entry = {
  title: 'Test Atlanta Photographer | FLIX 4K',
  description: 'A test description for an Atlanta photographer with enough detail to verify document head metadata behavior in the browser test environment.',
  path: '/portfolio',
}

let container: HTMLDivElement | undefined
let root: ReturnType<typeof createRoot> | undefined

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  document.head.innerHTML = ''
  document.title = ''
  root = undefined
  container = undefined
})

function render(element: React.ReactNode) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root?.render(element))
}

function addStaticHomepageSchemas() {
  for (const schemaType of ['WebSite', 'Organization']) {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset.homepageSchema = schemaType
    script.textContent = JSON.stringify({ '@type': schemaType })
    document.head.appendChild(script)
  }
}

describe('SeoHead', () => {
  it('upserts all public head metadata without duplicating tags', () => {
    addStaticHomepageSchemas()
    render(<SeoHead entry={entry} />)

    expect(document.title).toBe(entry.title)
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe(entry.description)
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content).toBe(entry.title)
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content).toBe(entry.description)
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content).toBe('https://flix4kfilms.art/portfolio')
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="twitter:card"]')?.content).toBe('summary_large_image')
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.content).toBe(entry.title)
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')?.content).toBe(entry.description)
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="twitter:image"]')?.content).toBe('https://flix4kfilms.art/og-image.jpg')
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content).toBe('index,follow')
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe('https://flix4kfilms.art/portfolio')
    expect(document.head.querySelectorAll('script[data-homepage-schema]')).toHaveLength(2)

    act(() => root?.render(<SeoHead entry={entry} />))

    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1)
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
  })

  it('removes public metadata and marks admin pages noindex', () => {
    addStaticHomepageSchemas()
    render(<SeoHead entry={entry} />)
    act(() => root?.render(<AdminSeoHead />))

    expect(document.title).toBe('FLIX 4K Admin')
    expect(document.head.querySelector('meta[name="description"]')).toBeNull()
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull()
    expect(document.head.querySelector('meta[name="twitter:title"]')).toBeNull()
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.head.querySelectorAll('script[data-homepage-schema]')).toHaveLength(0)
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content).toBe('noindex,nofollow')
  })

  it('marks unknown public routes noindex without retaining public metadata', () => {
    addStaticHomepageSchemas()
    render(<SeoHead entry={entry} />)
    act(() => root?.render(<NoIndexSeoHead />))

    expect(document.title).toBe('FLIX 4K')
    expect(document.head.querySelector('meta[name="description"]')).toBeNull()
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull()
    expect(document.head.querySelector('meta[name="twitter:image"]')).toBeNull()
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.head.querySelectorAll('script[data-homepage-schema]')).toHaveLength(0)
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content).toBe('noindex,nofollow')
  })
})
