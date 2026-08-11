# Phase 4 — Cal.com Booking Embed (Hosted Free Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder booking form on the FLIX 4K FILMS Book page with the hosted Cal.com free-plan booking experience, embedded inline at `https://flix4kfilms.com/#/book`, styled to match the black/white editorial identity, with a graceful offline fallback.

**Architecture:** The Cal.com embed loader (`https://app.cal.com/embed/embed.js`) is injected once at runtime from a small typed wrapper (`src/lib/calEmbed.ts`). A `CalBookingWidget` React component mounts an inline booking widget into a slot on `BookPage`, applies the FLIX monochrome theme via `Cal("ui", { cssVarsPerTheme })`, listens for `linkFailed`/`bookingSuccessfulV2` events, and renders the FLIX fallback copy if the embed cannot load. BookPage keeps its editorial header plus a reassurance section; no other part of the app is touched.

**Tech Stack:** React 19 + react-router-dom (HashRouter), Vite 8, Vitest, oxlint, Playwright smoke test (Python). Cal.com embed-core vanilla loader — **no new npm dependencies**.

## Global Constraints

- Domain is `https://flix4kfilms.com` ONLY. Never use `flix4k.com`, `booking.flix4k.com`, or `booking.flix4kfilms.com`. No DNS records.
- $0/month target. Do NOT add a payment method, create Google Cloud resources, create a VPS, deploy Docker, self-host Cal.diy, or configure Stripe.
- NO online payment. No Stripe keys, no payment fields. A completed booking is a booking REQUEST; FLIX contacts the client manually afterwards.
- The FLIX site keeps working if the booking service is down. Fallback copy: "ONLINE BOOKING IS TEMPORARILY UNAVAILABLE. Please contact FLIX 4K FILMS directly to schedule your session."
- Do NOT touch: 3D camera experience, LCD experience, scroll state machine, portfolio system, photography admin, Supabase, or existing routes — unless the booking integration genuinely requires it (it does not).
- Do not introduce SaaS-y visuals: no colorful gradients, generic dashboard UI, excessive cards, glassmorphism, or neon effects. Keep black/white/editorial/cinematic/minimal/premium.
- Booking page structure: BOOK ONLINE kicker → headline "Let's create something worth remembering." → `[CAL.COM BOOKING EXPERIENCE]` → reassurance section (BOOKING REQUEST / CONFIRMATION / PERSONAL CONTACT).
- Continue HashRouter + relative asset paths (`base: './'`). Do NOT switch to BrowserRouter.
- `verbatimModuleSyntax` + `erasableSyntaxOnly` are ON: use `import type` for types, no enums, no namespaces.
- No secrets in frontend code. The Cal.com booking link is public by design; never embed an API key or webhook secret.
- Booking types are managed in the Cal.com dashboard (WEDDINGS, EVENTS, BIRTHDAYS, PORTRAITS) — not hard-coded in the FLIX frontend. The FLIX widget embeds the Cal.com booking page so event types are the single source of truth.
- Existing smoke test must keep passing; add booking-widget checks.

---

## Pre-flight: Manual Cal.com account setup (user-driven, NOT automated)

This is the exact setup the FLIX owner performs in the Cal.com dashboard. The FLIX code tasks below depend only on the resulting `calLink` (the booking-page slug) and the Google Calendar connection.

### 1. Account

1. Sign up at `https://app.cal.com/signup` with the studio email (e.g. `hello@flix4kfilms.com` — confirm exact address). Free plan, no credit card.
2. Pick a username in Settings → Profile. Recommended: `flix4kfilms`. **This username is the embed `calLink`.** (Confirm exact spelling before coding; it becomes a constant in `src/lib/calEmbed.ts`.)
3. Settings → Profile → set Name = "FLIX 4K FILMS", short bio, and time zone.

### 2. Google Calendar connection (free plan, no GCP project needed)

1. Go to App Store (Integrations) → **Google Calendar** → Connect.
2. Authorize with the studio's Google account. Cal.com hosts the OAuth client — the studio does NOT create any Google Cloud project, so the "no GCP" constraint is preserved.
3. In Settings → Calendars, set the connected Google Calendar as the default event destination and enable two-way sync (blocks double bookings and mirrors confirmed sessions to the studio calendar).

### 3. Event types — create four, all with payment OFF

Create each under Event Types with payment and Cal Video disabled, destination = the connected Google Calendar, and a default schedule (e.g. weekdays 09:00–18:00, 30–60 min buffer). Each event type carries the SAME custom questions (see §4).

| Event type slug | Title shown | Duration | Notes |
|---|---|---|---|
| `weddings` | WEDDINGS | 8 h (480 min) | Flagship; longer notice window |
| `events` | EVENTS | 4 h (240 min) | |
| `birthdays` | BIRTHDAYS | 2 h (120 min) | |
| `portraits` | PORTRAITS | 1 h (60 min) | |

### 4. Custom questions (configured identically on each event type)

The attendee's Name + Email are Cal.com's built-in fields. Everything else is a custom question in Event Types → Booking Questions:

| # | Question | Type | Required | Maps to |
|---|---|---|---|---|
| 1 | PHONE NUMBER | Text | Yes | client contact |
| 2 | EVENT / SESSION LOCATION | Text | Yes | location |
| 3 | APPROXIMATE GUEST COUNT | Number (or Select: 0–50 / 50–150 / 150+) | No | scale |
| 4 | SESSION DURATION | Select: 1h / 2h / 4h / 8h | No | confirms the booked slot |
| 5 | SPECIAL REQUESTS | Text (multiline) | No | notes |
| 6 | ADDITIONAL INFORMATION | Text (multiline) | No | notes |

Service type and event date are handled by the event type itself and the selected slot — not duplicate form fields.

### 5. Notifications

- Settings → Workflows (free plan): leave default booking-confirmation email to the attendee ON (built-in, free). Optionally add a "Booking made" notification to the studio email.
- Note: Cal.com auto-confirms bookings on submission (its native behavior). The "request" framing lives in FLIX's reassurance copy and in the manual follow-up call — this is a product decision to confirm with the owner before launch; no code change is required for either framing.

### 6. Embed snippet

- Use the app's Embed Snippet Generator (Event Types → ⋯ → Embed) to confirm the canonical snippet served from `https://app.cal.com/embed/embed.js`. The constant `CAL_EMBED_SNIPPET` in `src/lib/calEmbed.ts` uses this canonical loader; if the generator ever emits a different loader, update the constant.

### 7. Webhooks (deferred, not in this phase)

- Cal.com free supports webhooks (Settings → Webhooks). Not consumed in Phase 4. A future phase may add a webhook → Supabase Edge Function to record booking requests inside the existing FLIX Supabase project. Skipping now per YAGNI.

---

## File Structure

```
src/
  lib/
    calEmbed.ts                # (new) typed Cal() wrapper: loader injection, init, inline, ui, events
    calEmbed.test.ts           # (new) unit tests: buildUiConfig, waitForCal, ensureCalScript
  ui/
    CalBookingWidget.tsx       # (new) inline embed mount + status + fallback copy
  pages/
    BookPage.tsx               # (modify) replace placeholder form with editorial hero + widget + reassurance
  styles.css                   # (modify) book embed slot, fallback, reassurance, responsive rules
  App.tsx                      # UNCHANGED (route /book already exists)
scripts/
  smoke-test.py                # (modify) extend #/book checks: widget mounts OR fallback shows, reassurance present
docs/superpowers/plans/2026-08-10-phase4-calcom-booking-embed.md  # this plan
```

---

### Task 1: `src/lib/calEmbed.ts` — typed Cal() wrapper + FLIX theme config

**Files:**
- Create: `src/lib/calEmbed.ts`
- Test: `src/lib/calEmbed.test.ts`

**Interfaces:**
- Produces: `CAL_EMBED_SCRIPT_URL: string`; `CAL_EMBED_SNIPPET: string`; `type CalUiConfig`; `type CalInlineParams`; `type CalEventAction`; `type CalCallbackEvent`; `type Cal`; `getCal(): Cal | null`; `ensureCalScript(): Promise<Cal>`; `waitForCal(timeoutMs?: number): Promise<Cal>`; `buildUiConfig(): CalUiConfig`; `buildInlineParams(element: HTMLElement | string, calLink: string): CalInlineParams`.

- [ ] **Step 1: Write the failing tests**

`src/lib/calEmbed.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  CAL_EMBED_SCRIPT_URL,
  buildUiConfig,
  buildInlineParams,
  ensureCalScript,
  waitForCal,
  getCal,
} from './calEmbed'

const calStub = vi.fn()

beforeEach(() => {
  calStub.mockReset()
  delete (globalThis as { Cal?: unknown }).Cal
  document.head.innerHTML = ''
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
    const el = document.createElement('div')
    const params = buildInlineParams(el, 'flix4kfilms')
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

  it('injects the loader script exactly once and resolves on load', async () => {
    const scripts: HTMLScriptElement[] = []
    const original = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(
      (tag: string, options?: ElementCreationOptions) => {
        const el = original(tag, options)
        if (tag === 'script') scripts.push(el as HTMLScriptElement)
        return el
      },
    )
    const first = ensureCalScript()
    const second = ensureCalScript()
    scripts.forEach((s) => s.dispatchEvent(new Event('load')))
    const [calA, calB] = await Promise.all([first, second])
    expect(scripts).toHaveLength(1)
    expect(calA).toBe(calB)
  })

  it('returns the existing Cal immediately when already loaded', () => {
    ;(globalThis as { Cal?: unknown }).Cal = calStub
    expect(ensureCalScript()).resolves.toBe(calStub)
    expect(getCal()).toBe(calStub)
  })

  it('rejects when the loader script errors', async () => {
    const scripts: HTMLScriptElement[] = []
    const original = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(
      (tag: string, options?: ElementCreationOptions) => {
        const el = original(tag, options)
        if (tag === 'script') scripts.push(el as HTMLScriptElement)
        return el
      },
    )
    const p = ensureCalScript()
    scripts.forEach((s) => s.dispatchEvent(new Event('error')))
    await expect(p).rejects.toThrow(/failed to load/i)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/calEmbed.test.ts`
Expected: FAIL — `./calEmbed` module does not exist yet.

- [ ] **Step 3: Write the implementation**

`src/lib/calEmbed.ts`:

```ts
export const CAL_EMBED_SCRIPT_URL = 'https://app.cal.com/embed/embed.js'

/**
 * Canonical Cal.com embed loader. The queue pattern lets us call
 * Cal("init") / Cal("inline") immediately; embed-core replays the queue.
 */
export const CAL_EMBED_SNIPPET = `(function (C, A, L) {
  let p = function (a, ar) { a.q = a.q || []; a.q.push(ar); };
  let Cal = function (a, ar) { p(Cal, ar); };
  Cal.q = Cal.q || [];
  window.Cal = Cal;
  window.cal = Cal;
  let d = document.createElement("script");
  d.async = true;
  d.src = C;
  A.appendChild(d);
})(window, document, "${CAL_EMBED_SCRIPT_URL}");`

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
      window.setTimeout(tick, 100)
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/calEmbed.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/calEmbed.ts src/lib/calEmbed.test.ts
git commit -m "feat(booking): add Cal.com embed loader and FLIX theme config"
```

---

### Task 2: `src/ui/CalBookingWidget.tsx` — inline embed mount + fallback

**Files:**
- Create: `src/ui/CalBookingWidget.tsx`

**Interfaces:**
- Consumes: `ensureCalScript`, `buildUiConfig`, `buildInlineParams`, `type CalCallbackEvent` from `src/lib/calEmbed.ts`.
- Produces: `CalBookingWidget({ calLink?: string; onBookingSuccess?: (e: CalCallbackEvent) => void })` — a self-contained component that renders either the embed slot (with a "loading" state) or the FLIX fallback copy.

- [ ] **Step 1: Write the component**

`src/ui/CalBookingWidget.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import {
  buildInlineParams,
  buildUiConfig,
  ensureCalScript,
  type CalCallbackEvent,
} from '../lib/calEmbed'

export interface CalBookingWidgetProps {
  calLink?: string
  onBookingSuccess?: (e: CalCallbackEvent) => void
}

const FALLBACK_COPY =
  'ONLINE BOOKING IS TEMPORARILY UNAVAILABLE. Please contact FLIX 4K FILMS directly to schedule your session.'

export function CalBookingWidget({
  calLink = 'flix4kfilms',
  onBookingSuccess,
}: CalBookingWidgetProps) {
  const slotRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const cal = await ensureCalScript()
        if (cancelled) return
        const slot = slotRef.current
        if (!slot) return

        slot.replaceChildren()
        cal('init', { origin: 'https://app.cal.com' })
        cal('ui', buildUiConfig())
        cal('on', {
          action: 'linkFailed',
          callback: () => {
            if (!cancelled) setStatus('failed')
          },
        })
        if (onBookingSuccess) {
          cal('on', {
            action: 'bookingSuccessfulV2',
            callback: (e) => onBookingSuccess(e),
          })
        }
        cal('inline', buildInlineParams(slot, calLink))
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('failed')
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [calLink, onBookingSuccess])

  if (status === 'failed') {
    return <p className="book-fallback">{FALLBACK_COPY}</p>
  }

  return (
    <div className={`book-embed${status === 'loading' ? ' book-embed-loading' : ''}`}>
      <div ref={slotRef} className="book-embed-slot" aria-busy={status === 'loading'} />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: clean. (No unit test for the component — the repo has no component-test harness; behavior is covered by the Playwright smoke test in Task 5.)

- [ ] **Step 3: Commit**

```bash
git add src/ui/CalBookingWidget.tsx
git commit -m "feat(booking): add inline Cal.com booking widget with fallback"
```

---

### Task 3: `src/pages/BookPage.tsx` — editorial hero + widget + reassurance

**Files:**
- Modify: `src/pages/BookPage.tsx` (replace entire file body)

**Interfaces:**
- Consumes: `CalBookingWidget` from `src/ui/CalBookingWidget`.
- Produces: the public `/book` page with the approved structure and exact copy.

- [ ] **Step 1: Rewrite BookPage**

`src/pages/BookPage.tsx`:

```tsx
import { CalBookingWidget } from '../ui/CalBookingWidget'

/**
 * Booking page — hosts the hosted Cal.com booking experience inline.
 * The four services (WEDDINGS / EVENTS / BIRTHDAYS / PORTRAITS) and their
 * availability live in the Cal.com dashboard, not here. Submission is a
 * booking REQUEST; FLIX contacts the client directly afterwards.
 */
export function BookPage() {
  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">BOOK ONLINE</p>
        <h1>Let&rsquo;s create something worth remembering.</h1>
        <p className="page-lede">
          Choose your session and preferred time. We&rsquo;ll receive your
          request immediately and contact you directly to confirm the details.
        </p>
      </header>

      <CalBookingWidget calLink="flix4kfilms" />

      <section className="book-reassure" aria-label="How booking works">
        <h2 className="book-reassure-title">HOW BOOKING WORKS</h2>
        <dl className="book-steps">
          <div className="book-step">
            <dt>BOOKING REQUEST</dt>
            <dd>Choose your session and preferred time.</dd>
          </div>
          <div className="book-step">
            <dt>CONFIRMATION</dt>
            <dd>We&rsquo;ll receive your request immediately.</dd>
          </div>
          <div className="book-step">
            <dt>PERSONAL CONTACT</dt>
            <dd>
              We&rsquo;ll contact you directly to confirm the details and
              discuss the required deposit.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/pages/BookPage.tsx
git commit -m "feat(booking): replace placeholder form with Cal.com embed page"
```

---

### Task 4: `src/styles.css` — embed slot, fallback, reassurance, responsive

**Files:**
- Modify: `src/styles.css` (append a "booking embed" section before the mobile media query, and add responsive rules inside the existing `@media (max-width: 720px)` block)

**Interfaces:**
- Consumes: class names emitted by `CalBookingWidget` (`.book-embed`, `.book-embed-slot`, `.book-embed-loading`, `.book-fallback`) and `BookPage` (`.book-reassure`, `.book-reassure-title`, `.book-steps`, `.book-step`).

- [ ] **Step 1: Add the booking embed styles**

Append before the `/* --- mobile */` section (after the `.about-cta` rule around line 698):

```css
/* booking embed (Cal.com hosted) */
.book-embed {
  max-width: 46rem;
  margin-bottom: 3rem;
}
.book-embed-slot {
  min-height: 560px;
  width: 100%;
}
.book-embed-slot iframe {
  width: 100%;
  height: 100%;
  min-height: 560px;
  border: 0;
  background: transparent;
}
.book-embed-loading .book-embed-slot {
  border: 1px solid var(--line);
  background: #050505;
}
.book-fallback {
  max-width: 46rem;
  border: 1px solid var(--line);
  padding: 1.6rem 1.4rem;
  color: var(--dim);
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 3rem;
}

/* booking reassurance */
.book-reassure {
  max-width: 46rem;
  padding-top: 2.5rem;
  border-top: 1px solid var(--line);
}
.book-reassure-title {
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.24em;
  color: var(--faint);
  margin: 0 0 1.6rem;
}
.book-steps { margin: 0; }
.book-step {
  display: grid;
  grid-template-columns: 10rem 1fr;
  gap: 1rem 2rem;
  padding: 1.1rem 0;
  border-bottom: 1px solid var(--line);
}
.book-step:last-child { border-bottom: 0; }
.book-step dt {
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.2em;
  color: var(--dim);
}
.book-step dd {
  margin: 0;
  color: var(--dim);
  font-size: 0.98rem;
  line-height: 1.6;
}
```

- [ ] **Step 2: Add responsive rules**

Inside the existing `@media (max-width: 720px)` block (around line 763):

```css
  .book-embed-slot,
  .book-embed-slot iframe { min-height: 520px; }
  .book-step { grid-template-columns: 1fr; gap: 0.35rem; }
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/styles.css
git commit -m "style(booking): add embed slot, fallback and reassurance styles"
```

---

### Task 5: `scripts/smoke-test.py` — booking page checks

**Files:**
- Modify: `scripts/smoke-test.py` (extend the `/book` check)

**Interfaces:**
- Consumes: the live `/book` page (widget mounts an `iframe` from `app.cal.com` OR renders `.book-fallback`).

- [ ] **Step 1: Extend the book-page check**

Replace the check-10 block (around lines 207–212) with:

```python
            # 10. About + Book pages load (remainder of public shell)
            page.goto(f"{base}/#/about", timeout=45000)
            about_ok = "about" in page.url and has_text(page, "ABOUT")
            page.goto(f"{base}/#/book", timeout=45000)
            book_ok = "book" in page.url and has_text(page, "BOOK")
            record("10. About + Book pages load", about_ok and book_ok)

            # 10b. Booking page mounts the Cal.com embed OR shows the fallback
            page.goto(f"{base}/#/book", timeout=45000)
            page.wait_for_timeout(2500)
            iframe_ok = page.locator(".book-embed-slot iframe").count() >= 1
            fallback_ok = page.locator(".book-fallback").count() >= 1
            record(
                "10b. Booking widget mounts (iframe) or shows fallback",
                iframe_ok or fallback_ok,
                "iframe" if iframe_ok else "fallback",
            )

            # 10c. Booking reassurance copy present
            page.goto(f"{base}/#/book", timeout=45000)
            record("10c. Booking reassurance present", has_text(page, "BOOKING REQUEST"))
```

- [ ] **Step 2: Run the smoke test**

Run: `npm run smoke`
Expected: PASS across all checks (10b passes via iframe when `app.cal.com` is reachable, via fallback when offline).

- [ ] **Step 3: Commit**

```bash
git add scripts/smoke-test.py
git commit -m "test(booking): smoke-test embed mount/fallback and reassurance copy"
```

---

## Self-Review

**Spec coverage:**
- Setup checklist / event types / questions / Google Calendar → Pre-flight manual setup section (§1–§5).
- Exact embed approach → Task 2 (`Cal("inline")`), loader in Task 1.
- HashRouter compatibility → Global Constraints (iframe is a separate document; the parent URL and hash never change), verified against embed docs.
- Responsive strategy → Task 4 (min-height slots, `useSlotsViewOnSmallScreen: true`, mobile rules).
- Styling strategy → Task 1 `buildUiConfig` + Task 4 CSS (monochrome CSS vars, editorial reassurance).
- Minimize Cal.com branding on free plan → dark theme, `hideEventTypeDetails`, brand colors; branding itself is not removable on free (documented limitation).
- Confirmation / email / cancel-reschedule behavior → Pre-flight §5 + note; booking emails handled by Cal.com free workflows; cancel/reschedule managed in Cal.com (attendee link) — no FLIX code needed.
- Embed failure behavior → Task 2 `linkFailed` + loader error → `.book-fallback` with exact approved copy.
- Webhooks later → Pre-flight §7 (deferred).
- Testing → Task 1 unit tests, Task 5 smoke tests.
- Security → no secrets; public booking link only; documented.

**Free-plan limitations (verified July–Aug 2026):** 1 user; Cal.com branding on booking pages cannot be removed on free (paid Teams removes it); custom subdomain is paid (unneeded — we embed inline); unlimited event types/calendars, workflows, custom questions, inline embed, webhooks, and Google Calendar sync are all included free.

**Deferred / open decisions to confirm with the owner before launch:**
1. Exact Cal.com username (used as `calLink` default in `CalBookingWidget` and `buildInlineParams` test).
2. Studio contact email for the fallback mailto (currently the fallback copy has no link; a `mailto:` can be added once confirmed).
3. Whether auto-confirmed Cal.com bookings are acceptable vs. an explicit "request approval" framing (see Pre-flight §5 note).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-10-phase4-calcom-booking-embed.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

Per the Phase 2 instruction, implementation does NOT start until the owner approves Phase 3 execution. Which approach?
