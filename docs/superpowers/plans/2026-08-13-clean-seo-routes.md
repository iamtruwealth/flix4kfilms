# Clean SEO Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve every public SEO route from a clean static URL while preserving React routing, admin protection, and existing visual behavior.

**Architecture:** BrowserRouter handles client navigation. A Vite build plugin reads the built homepage HTML and creates route-specific `dist/<path>/index.html` shells from `SEO_ENTRIES`, with route metadata and BreadcrumbList JSON-LD. Verification scripts test clean URLs, route-specific content, and the protected admin flow.

**Tech Stack:** React Router, Vite 8, TypeScript, Vitest, Python 3, Playwright.

## Global Constraints

- Preserve all existing route paths/components and admin protection.
- Generate only the listed public SEO routes; never generate admin entrypoints.
- Use `SEO_ENTRIES` as the metadata source and preserve `https://flix4kfilms.art` absolute URLs.
- Set Vite `base` to `/` for the custom-domain deployment.
- Do not change desktop/mobile visual calibration or the camera/LCD state machine.

### Task 1: Add tested static HTML transformation

**Files:**
- Create: `src/seo/staticRouteHtml.ts`
- Test: `src/seo/staticRouteHtml.test.ts`
- Modify: `vite.config.ts`

**Interfaces:**
- Produces `transformRouteHtml(html: string, entry: SeoEntry, breadcrumb: object): string` for the Vite plugin and tests.

- [ ] Write failing Vitest cases asserting route title, description, canonical, `og:url`, and one BreadcrumbList are present, while homepage schema markers remain untouched.
- [ ] Run `npx vitest run src/seo/staticRouteHtml.test.ts` and confirm the new tests fail because the helper is absent.
- [ ] Implement deterministic HTML replacement/injection using `SEO_ENTRIES` data passed by the caller, without duplicating title or description strings.
- [ ] Add a Vite plugin that reads `dist/index.html` after build, transforms every non-home `SEO_ENTRIES` route, and writes `dist/<route>/index.html`; use `/` asset URLs and skip `/admin` naturally by iterating only public entries.
- [ ] Run the focused Vitest test and confirm it passes.

### Task 2: Switch application and internal navigation to clean routes

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/admin/pages/OverviewPage.tsx`
- Modify: `src/ui/AppShell.tsx`
- Modify: `vite.config.ts`

- [ ] Replace `HashRouter` with `BrowserRouter` without changing route declarations or protection wrappers.
- [ ] Change raw admin overview hrefs to `/admin/photos`, `/admin/videos`, and `/admin/categories`; leave Router links/NavLinks unchanged.
- [ ] Update only current comments that claim HashRouter is required and set Vite `base: '/'`.
- [ ] Run `npx tsc -b` and `npx oxlint`.

### Task 3: Update static crawl and verification contracts

**Files:**
- Modify: `public/sitemap.xml`
- Modify: `scripts/seo-verify.py`
- Modify: `scripts/test-seo-verify.py`
- Modify: any existing SEO verifier fixtures discovered in the test file

- [ ] Update sitemap entries to exactly `/`, `/about`, `/portfolio`, `/portfolio/weddings`, `/portfolio/events`, `/portfolio/birthdays`, `/portfolio/portraits`, `/videos`, and `/book`.
- [ ] Make verifier route assertions use clean paths and route-specific title/description/canonical/OG URL/schema expectations sourced from the same route list, rejecting homepage fallback bodies.
- [ ] Permit only a trailing-slash redirect when the final URL is the matching route with `/`; reject redirects to another route or homepage.
- [ ] Add/update Python tests and fixtures for direct clean route success, matching trailing slash, wrong redirect, and homepage fallback rejection.
- [ ] Run `python3 scripts/test-seo-verify.py`.

### Task 4: Update browser smoke paths

**Files:**
- Modify: `scripts/smoke-test.py`

- [ ] Replace public hash URLs with clean URLs for homepage, portfolio, category, videos, about, and book checks.
- [ ] Keep admin checks on `/admin/login` and `/admin`; assert unauthenticated `/admin` redirects to `/admin/login`.
- [ ] Keep the camera asset, canvas, LCD, booking, and console-error checks unchanged in behavior.

### Task 5: Run full gates, report, and commit

**Files:**
- Create: `/tmp/clean-seo-routes-report.md`

- [ ] Run `npx tsc -b`, `npx oxlint`, `npx vitest run`, `npx vite build`, `python3 scripts/test-seo-verify.py`, and `python3 scripts/smoke-test.py`.
- [ ] Record exact pass/failure output and known environment/deployment concerns in the report, including generated route files and GitHub Pages custom-domain compatibility.
- [ ] Inspect `git diff` and `git status`, stage only intended files, and commit with a concise SEO route migration message.
- [ ] Verify the commit hash and final worktree state.
