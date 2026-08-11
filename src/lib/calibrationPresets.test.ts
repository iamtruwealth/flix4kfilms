import { describe, expect, it } from 'vitest'
import { DEFAULT_CALIBRATION } from './calibrationPresets'

describe('calibrationPresets — environment + dotField', () => {
  it('adds an environment block with the studio defaults', () => {
    const env = DEFAULT_CALIBRATION.environment
    expect(env.enabled).toBe(true)
    expect(env.radius).toBeGreaterThanOrEqual(4)
    expect(env.radius).toBeLessThanOrEqual(12)
    expect(env.scale).toBeGreaterThanOrEqual(0.1)
    expect(env.scale).toBeLessThanOrEqual(1)
    expect(env.shade).toBeGreaterThan(0)
    expect(env.shade).toBeLessThan(0.5)
    expect(env.keepNodes).toHaveLength(5)
  })

  it('selects exactly the five intended studio objects', () => {
    expect(DEFAULT_CALIBRATION.environment.keepNodes).toEqual([
      'Um.Flash.01_16',
      'SoftBox.01_15',
      'Ladder_17',
      'Flash.04_12',
      'Mic.01_8',
    ])
  })

  it('adds a dotField block with subtle defaults', () => {
    const df = DEFAULT_CALIBRATION.dotField
    expect(df.enabled).toBe(true)
    expect(df.gap).toBeGreaterThanOrEqual(24)
    expect(df.gap).toBeLessThanOrEqual(40)
    expect(df.radius).toBeGreaterThanOrEqual(0.5)
    expect(df.radius).toBeLessThanOrEqual(3)
    expect(df.baseAlpha).toBeGreaterThan(0)
    expect(df.baseAlpha).toBeLessThanOrEqual(1)
    expect(df.maxDpr).toBeGreaterThan(0)
  })
})
