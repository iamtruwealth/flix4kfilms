import { describe, expect, it } from 'vitest'
import { computeDotPositions, dotFade } from './dotField'

describe('computeDotPositions', () => {
  it('returns [] for a viewport smaller than the gap', () => {
    expect(computeDotPositions(10, 10, 32)).toEqual([])
  })

  it('lays out a centered grid at the requested spacing', () => {
    const dots = computeDotPositions(320, 200, 32)
    expect(dots.length).toBeGreaterThan(0)
    const xs = dots.map((d) => d.x)
    const ys = dots.map((d) => d.y)
    expect(Math.min(...xs)).toBeCloseTo(16, 5)
    expect(Math.min(...ys)).toBeCloseTo(16, 5)
    expect(Math.max(...xs)).toBeLessThanOrEqual(320 - 16 + 1e-6)
    expect(Math.max(...ys)).toBeLessThanOrEqual(200 - 16 + 1e-6)
    // rows/columns are gap apart
    const rowXs = [...new Set(xs)].sort((a, b) => a - b)
    for (let i = 1; i < rowXs.length; i++) {
      expect(rowXs[i] - rowXs[i - 1]).toBeCloseTo(32, 5)
    }
  })

  it('returns the exact expected count for a 320x160 grid with gap 32', () => {
    const dots = computeDotPositions(320, 160, 32)
    const cols = Math.floor((320 - 16) / 32) + 1
    const rows = Math.floor((160 - 16) / 32) + 1
    expect(dots).toHaveLength(cols * rows)
  })
})

describe('dotFade', () => {
  it('is 1 at the pointer and 0 beyond the hover radius', () => {
    expect(dotFade(0, 90)).toBe(1)
    expect(dotFade(90, 90)).toBe(0)
    expect(dotFade(200, 90)).toBe(0)
  })

  it('is monotonic decreasing between 0 and the radius', () => {
    const values = [10, 30, 50, 70].map((d) => dotFade(d, 90))
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1])
    }
  })
})
