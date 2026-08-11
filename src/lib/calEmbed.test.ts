import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  buildUiConfig,
  buildInlineParams,
  ensureCalScript,
  waitForCal,
  getCal,
  resetCalEmbedState,
} from './calEmbed'

const calStub = vi.fn()

type ScriptStub = {
  id: string
  async: boolean
  text: string
  src: string
  addEventListener: (type: string, cb: () => void) => void
  listeners: Map<string, () => void>
}

function installDocumentStub(): { scripts: ScriptStub[]; heads: unknown[] } {
  const scripts: ScriptStub[] = []
  const heads: unknown[] = []
  const script = (): ScriptStub => {
    const listeners = new Map<string, () => void>()
    return {
      id: '',
      async: false,
      text: '',
      src: '',
      listeners,
      addEventListener: (type, cb) => {
        listeners.set(type, cb)
      },
    }
  }
  ;(globalThis as { document?: unknown }).document = {
    head: {
      appendChild: (el: unknown) => {
        heads.push(el)
      },
    },
    createElement: (tag: string) => {
      if (tag === 'script') {
        const s = script()
        scripts.push(s)
        return s
      }
      return {}
    },
  } as never
  return { scripts, heads }
}

beforeEach(() => {
  calStub.mockReset()
  resetCalEmbedState()
  delete (globalThis as { Cal?: unknown }).Cal
  delete (globalThis as { document?: unknown }).document
})

describe('buildUiConfig — FLIX monochrome theme', () => {
  it('forces the dark theme', () => {
    expect(buildUiConfig().theme).toBe('dark')
  })

  it('hides event-type details for a minimal card list', () => {
    expect(buildUiConfig().hideEventTypeDetails).toBe(true)
  })

  it('maps the FLIX palette onto the booker CSS variables', () => {
    const dark = buildUiConfig().cssVarsPerTheme?.dark
    expect(dark?.['cal-brand']).toBe('#f5f5f4')
    expect(dark?.['cal-brand-text']).toBe('#000000')
    expect(dark?.['cal-text-emphasis']).toBe('#f5f5f4')
    expect(dark?.['cal-border-booker']).toContain('rgba')
  })
})

describe('buildInlineParams', () => {
  it('passes the element and calLink through to the inline call', () => {
    const el = {}
    const params = buildInlineParams(el as never, 'flix4kfilms')
    expect(params.elementOrSelector).toBe(el)
    expect(params.calLink).toBe('flix4kfilms')
    expect(params.config).toEqual({
      layout: 'month_view',
      useSlotsViewOnSmallScreen: true,
    })
  })
})

describe('waitForCal / ensureCalScript', () => {
  it('resolves once window.Cal becomes defined', async () => {
    setTimeout(() => {
      ;(globalThis as { Cal?: unknown }).Cal = calStub
    }, 20)
    const cal = await waitForCal(500)
    expect(cal).toBe(calStub)
  })

  it('rejects when window.Cal never appears before the timeout', async () => {
    await expect(waitForCal(30)).rejects.toThrow(/cal/i)
  })

  it('injects the loader script exactly once and resolves once Cal is ready', async () => {
    const { scripts, heads } = installDocumentStub()
    const first = ensureCalScript()
    const second = ensureCalScript()
    expect(scripts).toHaveLength(1)
    expect(heads).toHaveLength(1)
    expect(scripts[0].id).toBe('cal-embed-loader')
    ;(globalThis as { Cal?: unknown }).Cal = calStub
    const [calA, calB] = await Promise.all([first, second])
    expect(calA).toBe(calB)
  })

  it('returns the existing Cal immediately when already loaded', async () => {
    ;(globalThis as { Cal?: unknown }).Cal = calStub
    await expect(ensureCalScript()).resolves.toBe(calStub)
    expect(getCal()).toBe(calStub)
  })

  it('rejects when the loader script errors', async () => {
    const { scripts } = installDocumentStub()
    const p = ensureCalScript()
    scripts.forEach((s) => s.listeners.get('error')?.())
    await expect(p).rejects.toThrow(/failed to load/i)
  })
})
