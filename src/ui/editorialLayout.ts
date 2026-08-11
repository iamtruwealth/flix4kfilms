import type { PortfolioItem, PortfolioLayout } from '../portfolio/types'

/**
 * Editorial composition engine — pure, deterministic, fully testable.
 *
 * Turns an ordered list of portfolio items into a set of art-directed
 * "bands" (grid rows). Each band carries frames with a layout role
 * (`hero` / `large` / `standard` / `portrait` / `wide`) plus a boolean
 * `offset` that staggers the frame downward for an irregular vertical rhythm.
 *
 * It is deliberately NOT a CSS-columns masonry: every band is a composed
 * 12-column editorial spread with intentional whitespace columns, and the
 * rhythm rotates through templates with controlled variation (never an
 * obvious 1-2-3 repeat). Explicit `layout` metadata wins; everything else
 * falls back to a tasteful deterministic role assignment, so existing records
 * with no layout still compose correctly.
 */

export type BandKind =
  | 'heroDuo'
  | 'heroSolo'
  | 'duoLarge'
  | 'duoMirror'
  | 'duoEven'
  | 'trio'
  | 'trioAlt'
  | 'wide'
  | 'soloPortrait'
  | 'soloLarge'

export interface EditorialFrame {
  item: PortfolioItem
  role: PortfolioLayout
  /** Stagger the frame down to break the row baseline. */
  offset: boolean
}

export interface EditorialBand {
  kind: BandKind
  frames: EditorialFrame[]
}

const VALID_ROLES: readonly PortfolioLayout[] = [
  'hero',
  'large',
  'standard',
  'portrait',
  'wide',
]

export function isPortfolioLayout(value: unknown): value is PortfolioLayout {
  return typeof value === 'string' && (VALID_ROLES as readonly string[]).includes(value)
}

/**
 * Fallback role rhythm for photos without an explicit layout. Long enough
 * that no obvious 1-2-3 repeat emerges; wide stays sparse (a cinematic
 * break roughly every eighth frame).
 */
const FALLBACK_ROLES: readonly PortfolioLayout[] = [
  'portrait',
  'large',
  'standard',
  'portrait',
  'large',
  'portrait',
  'wide',
  'standard',
  'portrait',
  'large',
  'standard',
  'portrait',
  'large',
  'standard',
  'wide',
  'portrait',
]

/** Band templates for the non-special flow, rotated with variation. */
const RHYTHM: readonly BandKind[] = [
  'duoLarge',
  'trio',
  'duoMirror',
  'wide',
  'duoEven',
  'trioAlt',
  'duoLarge',
  'trio',
  'duoMirror',
  'wide',
  'duoLarge',
  'trioAlt',
]

interface Assigned {
  item: PortfolioItem
  role: PortfolioLayout
}

function frame(a: Assigned, offset: boolean): EditorialFrame {
  return { item: a.item, role: a.role, offset }
}

function pickTwoKind(a: Assigned, b: Assigned, cycle: number): BandKind {
  const roles = [a.role, b.role]
  if (roles.includes('portrait') && roles.includes('large')) {
    return a.role === 'large' ? 'duoLarge' : 'duoMirror'
  }
  if (roles[0] === 'portrait' && roles[1] === 'portrait') {
    return cycle % 2 === 0 ? 'duoLarge' : 'duoMirror'
  }
  return 'duoEven'
}

function assignRoles(items: PortfolioItem[]): Assigned[] {
  const heroIndex = items.findIndex((i) => i.layout === 'hero')
  const featuredIndex = items.findIndex((i) => i.featured)
  const hero = heroIndex !== -1 ? heroIndex : featuredIndex

  const assigned = items.map((item, idx) => {
    if (idx === hero) return { item, role: 'hero' as const }
    if (item.layout && item.layout !== 'hero' && isPortfolioLayout(item.layout)) {
      return { item, role: item.layout }
    }
    let role: PortfolioLayout = FALLBACK_ROLES[idx % FALLBACK_ROLES.length]
    // Featured work reads larger than normal content (standard → large).
    if (item.featured && role === 'standard') role = 'large'
    // With no featured/hero lead, open the gallery with a large frame.
    if (hero === -1 && idx === 0) role = 'large'
    return { item, role }
  })

  // The lead photo must open the gallery, wherever it sits in the catalog.
  if (hero > 0) {
    const [lead] = assigned.splice(hero, 1)
    assigned.unshift(lead)
  }

  return assigned
}

/** Compose items into editorial bands. Returns [] for an empty list. */
export function composeEditorial(items: PortfolioItem[]): EditorialBand[] {
  if (items.length === 0) return []

  const assigned = assignRoles(items)
  const bands: EditorialBand[] = []
  let i = 0
  let cycle = 0

  while (i < assigned.length) {
    const cur = assigned[i]
    const next = i + 1 < assigned.length ? assigned[i + 1] : null

    // Cinematic full-width frame — always its own band.
    if (cur.role === 'wide') {
      bands.push({ kind: 'wide', frames: [frame(cur, false)] })
      i++
      cycle++
      continue
    }

    // The lead photograph opens the gallery, paired with a supporting frame.
    if (cur.role === 'hero') {
      if (next && next.role !== 'wide') {
        bands.push({
          kind: 'heroDuo',
          frames: [frame(cur, false), frame(next, true)],
        })
        i += 2
      } else {
        bands.push({ kind: 'heroSolo', frames: [frame(cur, false)] })
        i++
      }
      cycle++
      continue
    }

    const remaining = assigned.length - i

    // A wide break must own its band — never pair it into this one.
    if (next && next.role === 'wide') {
      bands.push({
        kind: cur.role === 'portrait' ? 'soloPortrait' : 'soloLarge',
        frames: [frame(cur, false)],
      })
      i++
      cycle++
      continue
    }

    if (remaining === 1) {
      bands.push({
        kind: cur.role === 'portrait' ? 'soloPortrait' : 'soloLarge',
        frames: [frame(cur, false)],
      })
      i++
      cycle++
      continue
    }

    if (remaining === 2) {
      bands.push({
        kind: pickTwoKind(cur, next as Assigned, cycle),
        frames: [frame(cur, false), frame(next as Assigned, true)],
      })
      i += 2
      cycle++
      continue
    }

    // remaining >= 3 — rotate templates for controlled variation.
    let kind = RHYTHM[cycle % RHYTHM.length]
    if (kind === 'wide') kind = 'duoLarge'
    const consume = kind === 'trio' || kind === 'trioAlt' ? 3 : 2
    const slice = assigned.slice(i, i + consume)
    bands.push({
      kind,
      frames: slice.map((a, si) => frame(a, si === 1)),
    })
    i += consume
    cycle++
  }

  return bands
}
