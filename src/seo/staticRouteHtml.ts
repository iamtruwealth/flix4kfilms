import type { SeoEntry } from './seoContent.js'

const CANONICAL_BASE = 'https://flix4kfilms.art'

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function absoluteUrl(path: string) {
  return new URL(path, CANONICAL_BASE).toString()
}

function replaceTag(html: string, pattern: RegExp, replacement: string) {
  return html.replace(pattern, replacement)
}

export function transformRouteHtml(
  html: string,
  entry: SeoEntry,
  breadcrumb: Record<string, unknown> | null,
): string {
  const title = escapeHtml(entry.title)
  const description = escapeHtml(entry.description)
  const canonical = escapeHtml(absoluteUrl(entry.path))
  let transformed = html
    .replace(/\s*<script[^>]*data-homepage-schema[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/(\s(?:href|src)=")\.\//g, '$1/')

  transformed = replaceTag(transformed, /<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
  transformed = replaceTag(
    transformed,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>(?=\s|<|$)/i,
    `<meta name="description" content="${description}">`,
  )
  transformed = replaceTag(
    transformed,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>(?=\s|<|$)/i,
    `<link rel="canonical" href="${canonical}">`,
  )
  transformed = replaceTag(
    transformed,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>(?=\s|<|$)/i,
    `<meta property="og:title" content="${title}">`,
  )
  transformed = replaceTag(
    transformed,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>(?=\s|<|$)/i,
    `<meta property="og:description" content="${description}">`,
  )
  transformed = replaceTag(
    transformed,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>(?=\s|<|$)/i,
    `<meta property="og:url" content="${canonical}">`,
  )

  const schema = breadcrumb
    ? `\n    <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`
    : ''
  return transformed.replace(/<\/head>/i, `${schema}\n  </head>`)
}
