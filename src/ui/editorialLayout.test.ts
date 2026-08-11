import { describe, expect, it } from 'vitest'
import type { PortfolioItem } from '../portfolio/types'
import { composeEditorial } from './editorialLayout'

function makeItem(overrides: Partial<PortfolioItem> = {}): PortfolioItem {
  return {
    id: `p-${Math.random().toString(36).slice(2)}`,
    title: 'Untitled',
    caption: '',
    category: 'still',
    imageUrl: null,
    thumbnailUrl: null,
    year: '2026',
    description: '',
    sortOrder: 0,
    published: true,
    featured: false,
    variant: '01',
    ...overrides,
  }
}

describe('composeEditorial — determinism & coverage', () => {
  it('returns [] for an empty catalog', () => {
    expect(composeEditorial([])).toEqual([])
  })

  it('is deterministic for the same input', () => {
    const items = Array.from({ length: 7 }, () => makeItem())
    expect(composeEditorial(items)).toEqual(composeEditorial(items))
  })

  it('renders every item exactly once', () => {
    const items = Array.from({ length: 13 }, () => makeItem())
    const frames = composeEditorial(items).flatMap((b) => b.frames)
    expect(frames.length).toBe(items.length)
    const ids = new Set(frames.map((f) => f.item.id))
    expect(ids.size).toBe(items.length)
  })
})

describe('composeEditorial — role handling', () => {
  it('opens with a large frame when nothing is hero/featured', () => {
    const bands = composeEditorial([makeItem(), makeItem(), makeItem()])
    expect(bands[0].frames[0].role).toBe('large')
  })

  it('promotes the explicit hero to the lead and pairs it', () => {
    const lead = makeItem({ layout: 'hero' })
    const support = makeItem()
    const bands = composeEditorial([support, lead, makeItem(), makeItem()])
    expect(bands[0].kind).toBe('heroDuo')
    expect(bands[0].frames[0].item.id).toBe(lead.id)
    expect(bands[0].frames[0].role).toBe('hero')
    expect(bands[0].frames[1].offset).toBe(true)
  })

  it('makes the first featured item the hero when no explicit hero exists', () => {
    const featured = makeItem({ featured: true })
    const bands = composeEditorial([makeItem(), featured, makeItem()])
    expect(bands[0].frames[0].item.id).toBe(featured.id)
    expect(bands[0].frames[0].role).toBe('hero')
  })

  it('keeps explicit non-hero layouts', () => {
    const wide = makeItem({ layout: 'wide' })
    const portrait = makeItem({ layout: 'portrait' })
    const bands = composeEditorial([wide, portrait])
    expect(bands[0].kind).toBe('wide')
    expect(bands[0].frames[0].role).toBe('wide')
    expect(bands[1].kind).toBe('soloPortrait')
    expect(bands[1].frames[0].role).toBe('portrait')
  })

  it('gives a wide frame its own full-width band', () => {
    const items = [makeItem({ layout: 'wide' }), makeItem(), makeItem()]
    const bands = composeEditorial(items)
    expect(bands[0].kind).toBe('wide')
    expect(bands[0].frames).toHaveLength(1)
  })
})

describe('composeEditorial — band shape', () => {
  it('rotates templates so the trio appears second and wides keep their band', () => {
    // 7 fallback roles → large, large, standard, portrait, large, portrait, wide.
    const bands = composeEditorial(Array.from({ length: 7 }, () => makeItem()))
    expect(bands[0].kind).toBe('duoLarge')
    expect(bands[1].kind).toBe('trio')
    expect(bands[1].frames).toHaveLength(3)
    // The trailing wide never gets paired into a duo — it owns a band.
    expect(bands[2].kind).toBe('soloPortrait')
    expect(bands[3].kind).toBe('wide')
  })

  it('offsets the supporting frame in duos for the irregular baseline', () => {
    const bands = composeEditorial([makeItem(), makeItem()])
    expect(bands[0].frames[0].offset).toBe(false)
    expect(bands[0].frames[1].offset).toBe(true)
  })
})
