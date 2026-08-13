const base = 'https://flix4kfilms.art'
const description =
  'Atlanta photography, wedding photography, portraits, events, video, and film production by FLIX 4K.'

export function buildWebSiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FLIX 4K',
    url: base,
    description,
  }
}

export function buildOrganizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FLIX 4K',
    url: base,
    description,
  }
}

export function buildBreadcrumbSchema(pathname: string): Record<string, unknown> | null {
  if (pathname === '/' || pathname.startsWith('/admin')) return null

  const segments = pathname.split('/').filter(Boolean)
  const itemListElement = segments.map((segment, index) => {
    const path = `/${segments.slice(0, index + 1).join('/')}`
    const name = segment.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

    return {
      '@type': 'ListItem',
      position: index + 2,
      name,
      item: `${base}${path}`,
    }
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${base}/`,
      },
      ...itemListElement,
    ],
  }
}
