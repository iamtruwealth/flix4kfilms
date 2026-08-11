import { describe, expect, it } from 'vitest'
import { dotFieldStatic } from './HeroDotField'

describe('dotFieldStatic', () => {
  it('is static under reduced motion', () => {
    expect(dotFieldStatic(true, false)).toBe(true)
  })

  it('is static on coarse (touch) pointers', () => {
    expect(dotFieldStatic(false, true)).toBe(true)
  })

  it('is interactive on fine pointers without reduced motion', () => {
    expect(dotFieldStatic(false, false)).toBe(false)
  })
})
