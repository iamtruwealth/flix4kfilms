export const CAL_EMBED_SCRIPT_URL = 'https://app.cal.com/embed/embed.js'

/**
 * Canonical Cal.com embed loader (hosted app.cal.com). The queue pattern lets
 * us call Cal("init") / Cal("inline") immediately; embed-core replays the queue.
 * Appends the embed.js script to document.head, never to document itself.
 */
export const CAL_EMBED_SNIPPET = `(function (C, A, L) {
  var p = function (a, ar) { a.q.push(ar); };
  var d = C.document;
  C.Cal = C.Cal || function () {
    var cal = C.Cal;
    var ar = arguments;
    if (!cal.loaded) {
      cal.ns = {};
      cal.q = cal.q || [];
      d.head.appendChild(d.createElement("script")).src = A;
      cal.loaded = true;
    }
    if (ar[0] === L) {
      var api = function () { p(api, arguments); };
      var namespace = ar[1];
      api.q = api.q || [];
      if (typeof namespace === "string") {
        cal.ns[namespace] = cal.ns[namespace] || api;
        p(cal.ns[namespace], ar);
        p(cal, ["initNamespace", namespace]);
      } else p(cal, ar);
      return;
    }
    p(cal, ar);
  };
})(window, "${CAL_EMBED_SCRIPT_URL}", "init");`

export interface CalUiConfig {
  theme?: 'dark' | 'light' | 'auto'
  styles?: { branding?: { brandColor?: string } }
  hideEventTypeDetails?: boolean
  cssVarsPerTheme?: Record<string, Record<string, string>>
}

export interface CalInlineParams {
  elementOrSelector: string | HTMLElement
  calLink: string
  config?: Record<string, unknown>
}

export type CalEventAction =
  | 'bookingSuccessfulV2'
  | 'bookingCancelled'
  | 'linkReady'
  | 'linkFailed'
  | 'linkPrerendered'
  | 'bookerReady'

export interface CalCallbackEvent {
  detail?: { type?: string; data?: Record<string, unknown> }
}

export interface Cal {
  (action: 'init', opts?: { origin?: string; debug?: boolean }): void
  (action: 'ui', opts?: CalUiConfig): void
  (action: 'inline', opts: CalInlineParams): void
  (
    action: 'on',
    opts: { action: CalEventAction | '*'; callback: (e: CalCallbackEvent) => void },
  ): void
  (action: 'off', opts: { action: CalEventAction; callback: (e: CalCallbackEvent) => void }): void
  (action: string, ...args: unknown[]): void
}

export function getCal(): Cal | null {
  const maybe = (globalThis as { Cal?: Cal }).Cal
  return maybe ?? null
}

export function waitForCal(timeoutMs = 15000): Promise<Cal> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const tick = () => {
      const cal = getCal()
      if (cal) return resolve(cal)
      if (Date.now() >= deadline) return reject(new Error('Cal embed script did not load in time'))
      globalThis.setTimeout(tick, 100)
    }
    tick()
  })
}

let scriptPromise: Promise<Cal> | null = null

/** Inject the Cal.com loader once and resolve with the Cal API when ready. */
export function ensureCalScript(): Promise<Cal> {
  const existing = getCal()
  if (existing) return Promise.resolve(existing)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    try {
      const script = document.createElement('script')
      script.id = 'cal-embed-loader'
      script.async = true
      script.text = CAL_EMBED_SNIPPET
      script.addEventListener('error', () => {
        scriptPromise = null
        reject(new Error('Failed to load Cal embed script'))
      })
      document.head.appendChild(script)
      waitForCal()
        .then(resolve)
        .catch((err: unknown) => {
          scriptPromise = null
          reject(err)
        })
    } catch (err) {
      scriptPromise = null
      reject(err instanceof Error ? err : new Error('Failed to inject Cal embed script'))
    }
  })
  return scriptPromise
}

/** Test-only: clear the cached loader promise so the next call re-injects. */
export function resetCalEmbedState(): void {
  scriptPromise = null
}

/** FLIX monochrome theme mapped onto the Cal.com booker CSS variables. */
export function buildUiConfig(): CalUiConfig {
  return {
    theme: 'dark',
    hideEventTypeDetails: true,
    cssVarsPerTheme: {
      dark: {
        'cal-brand': '#f5f5f4',
        'cal-brand-emphasis': '#e0e0df',
        'cal-brand-text': '#000000',
        'cal-brand-subtle': '#a1a1a1',
        'cal-brand-accent': '#000000',
        'cal-text': '#a1a1a1',
        'cal-text-emphasis': '#f5f5f4',
        'cal-text-subtle': '#6b6b6b',
        'cal-text-muted': '#6b6b6b',
        'cal-border-booker': 'rgba(255, 255, 255, 0.14)',
      },
    },
  }
}

export function buildInlineParams(
  elementOrSelector: string | HTMLElement,
  calLink: string,
): CalInlineParams {
  return {
    elementOrSelector,
    calLink,
    config: {
      layout: 'month_view',
      useSlotsViewOnSmallScreen: true,
    },
  }
}
