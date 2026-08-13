import { describe, expect, it } from 'vitest'
import { SEO_ENTRIES } from './seoContent'

const expectedPaths = [
  '/',
  '/about',
  '/portfolio',
  '/portfolio/weddings',
  '/portfolio/events',
  '/portfolio/birthdays',
  '/portfolio/portraits',
  '/videos',
  '/book',
]

describe('SEO content registry', () => {
  it('contains an entry for every public SEO route', () => {
    expect(Object.keys(SEO_ENTRIES)).toEqual(expectedPaths)
  })

  it('uses unique titles no longer than 60 characters', () => {
    const entries = Object.values(SEO_ENTRIES)
    const titles = entries.map(({ title }) => title)

    expect(new Set(titles).size).toBe(titles.length)
    expect(titles.every((title) => title.length <= 60)).toBe(true)
  })

  it('keeps descriptions between 120 and 160 characters', () => {
    expect(
      Object.values(SEO_ENTRIES).every(
        ({ description }) => description.length >= 120 && description.length <= 160,
      ),
    ).toBe(true)
  })

  it('includes the approved homepage target phrases', () => {
    const homepage = SEO_ENTRIES['/']
    const content = `${homepage.title} ${homepage.description}`.toLowerCase()

    expect(content).toContain('atlanta photographer')
    expect(content).toContain('wedding photography')
  })

  it('includes the approved wedding target phrases', () => {
    const wedding = SEO_ENTRIES['/portfolio/weddings']
    const content = `${wedding.title} ${wedding.description}`.toLowerCase()

    expect(content).toContain('atlanta wedding photographer')
    expect(content).toContain('atlanta wedding photography')
  })
})
