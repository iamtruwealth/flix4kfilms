import { useEffect } from 'react'
import type { SeoEntry } from './seoContent'

const CANONICAL_BASE = 'https://flix4kfilms.art'

function absoluteUrl(path: string) {
  return new URL(path, CANONICAL_BASE).toString()
}

function setMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }

  element.content = content
}

function setCanonical(url: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')

  if (!element) {
    element = document.createElement('link')
    element.rel = 'canonical'
    document.head.appendChild(element)
  }

  element.href = url
}

export function SeoHead({ entry }: { entry: SeoEntry }) {
  useEffect(() => {
    document.title = entry.title
    setMeta('description', entry.description)
    setMeta('og:title', entry.title, 'property')
    setMeta('og:description', entry.description, 'property')
    setMeta('og:url', absoluteUrl(entry.path), 'property')
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', entry.title)
    setMeta('twitter:description', entry.description)
    setMeta('robots', 'index,follow')
    setCanonical(absoluteUrl(entry.path))
  }, [entry])

  return null
}
