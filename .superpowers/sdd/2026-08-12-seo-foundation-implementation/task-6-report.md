# Task 6: SEO QA and Production Verification

## Status

**QA completed with no task-scoped code fixes.** No commit was created for this task. The isolated branch is `seo-foundation` at `52449d0` and is not deployed to production.

The only pre-existing worktree modification remains:

```text
 M docs/superpowers/plans/2026-08-12-seo-foundation-implementation.md
```

## Project Gates

| Gate | Result | Evidence |
|---|---|---|
| `npx tsc -b` | PASS | Exit 0; no output. |
| `npx oxlint` | PASS with warnings | Exit 0; 0 errors and 14 existing warnings. Warnings are hook dependency, fast-refresh export, and unused-variable warnings outside this task. |
| `npx vitest run` | PASS | 17 test files passed; 124 tests passed. The bootstrap fallback test emits its expected `network down` diagnostic to stderr. |
| `npx vite build` | PASS | Exit 0; 697 modules transformed and production assets emitted. Vite reported existing large-chunk warnings. |
| `python3 scripts/smoke-test.py` | FAIL | 12/13 checks passed. The only failure was `8. Admin login page loads`; all public homepage, GLB, canvas, LCD/photo, portfolio, category, videos, admin redirect, about/book, booking widget, reassurance, and console-error checks passed. This is unchanged lazy-route/admin smoke behavior and is unrelated to the added homepage service section. |

The brief's literal command `python3 scripts/seo-verify.py https://flix4kfilms.art` exits with argument-parser error because the current verifier accepts `--base-url` rather than a positional URL. The equivalent command was run as `python3 scripts/seo-verify.py --base-url https://flix4kfilms.art`.

## SEO Verifier

### Production

`python3 scripts/seo-verify.py --base-url https://flix4kfilms.art` failed against the currently deployed site:

- `/` returned 200.
- All clean public routes returned 404: `/about`, `/portfolio`, all four portfolio categories, `/videos`, and `/book`.
- `/robots.txt`, `/sitemap.xml`, and `/camera.ico` returned 404.
- Deployed static title was `FLIX 4K`, not the branch title.
- Deployed static description was `FLIX 4K — a cinematic photography portfolio.`, not the branch description.
- Deployed static canonical, OG image, and JSON-LD were absent.

These are pending deployment findings. They are not claimed as fixed in live production because this isolated branch is not on `main`.

### Local production preview

The verifier was also run against an isolated `vite preview` on port 4174:

```text
PASS  GET / returns 200 without redirect
PASS  clean route status checks (all returned 200)
PASS  robots.txt and sitemap.xml status/content type
PASS  static title and description
PASS  static OG image
FAIL  clean routes are not generic homepage fallbacks
FAIL  static canonical is present
FAIL  static JSON-LD fallback is present
FAIL  camera.ico content type (Vite preview served text/html)
```

The clean-route and client metadata failures are expected for this HashRouter/static-shell architecture: route-specific titles, canonicals, and JSON-LD are applied client-side and are not available from clean-path raw requests. The local `camera.ico` MIME mismatch is a Vite preview serving behavior. No verifier changes were justified by this task.

## Browser QA

A fresh isolated production preview was tested with headless Chromium at:

- Desktop: 1440×900
- Mobile: 390×844

Results for `AtlantaServiceIntro`:

- Section rendered on both viewports.
- Four service links rendered on both viewports.
- No page errors or browser console errors were observed.
- Desktop section bounds: `top=9274.41`, `bottom=9886.48`; featured editorial bounds: `top=9998.48`, leaving 112px separation.
- Mobile section bounds: `top=1864.80`, `bottom=2675.31`; featured editorial bounds: `top=2739.31`, leaving 64px separation.
- The service section is inside the portfolio content layer and does not overlap the featured editorial portfolio. The fixed camera/LCD/handoff stage remains behind the portfolio layer by the existing z-index contract.

The screenshot analysis helper was unavailable because its configured Gemini model returned HTTP 404 (`models/gemini-2.0-flash` no longer available). DOM measurements and browser console/page-error checks were used instead.

## Production Raw HTML

Command run:

```bash
curl -s https://flix4kfilms.art/ | grep -Ei 'title|description|canonical|og:|twitter:|application/ld\\+json'
```

Current production output only contained:

```html
<meta name="description" content="FLIX 4K — a cinematic photography portfolio." />
<title>FLIX 4K</title>
```

The branch's canonical, social metadata, and JSON-LD are therefore pending deployment.

## Remaining Deployment Concerns

- Deploy the SEO foundation branch changes to the production branch before expecting production raw HTML, robots, sitemap, route responses, or metadata verifier checks to pass.
- Re-run the production verifier after deployment, using `--base-url`.
- Re-run raw HTML inspection after deployment and confirm canonical, OG/Twitter metadata, and JSON-LD are present in the initial shell.
- Investigate the existing smoke failure for the admin login route separately; it was not changed because it is outside the added homepage service section.
- Consider a future architecture task if clean, non-hash URLs must be server-rendered and independently indexable; this QA task did not change the HashRouter architecture.

## Round 1 Fix Report

### Reviewer Finding 1: SEO Verifier CLI

Implemented in `scripts/seo-verify.py`:

- Added the positional URL form required by the brief.
- Retained `--base-url` and `SEO_BASE_URL` support.
- Added a conflict error when both URL forms are supplied with different values.
- Updated the usage docstring.

Added `scripts/test-seo-verify.py` covering both accepted forms. Verification:

```text
$ python3 scripts/test-seo-verify.py
..
----------------------------------------------------------------------
Ran 2 tests in 0.000s

OK

$ python3 -m py_compile scripts/seo-verify.py scripts/test-seo-verify.py scripts/homepage-layout-qa.py
# exit 0

$ python3 scripts/seo-verify.py https://flix4kfilms.art
PASS  GET / returns 200 without redirect — status=200 final=https://flix4kfilms.art/
...
FAIL  Static JSON-LD fallback is present — 0 valid object(s)
INFO  Clean public routes are not served by the origin: /about, /portfolio, /portfolio/weddings, /portfolio/events, /portfolio/birthdays, /portfolio/portraits, /videos, /book
```

The positional invocation now reaches the actual production checks instead of exiting with `unrecognized arguments`; the listed failures remain live deployment findings.

### Reviewer Finding 2: Direct Browser Bounds Evidence

Added `scripts/homepage-layout-qa.py`. It runs headless Chromium against `QA_BASE_URL` and checks desktop `1440x900` plus mobile `390x844` at these scroll checkpoints:

- `camera`: progress 0.00
- `lcd`: progress 0.66
- `handoff`: progress 0.84
- `portfolio`: progress 1.00

For every viewport/checkpoint it emits JSON bounds for `.stage`, `.stage-3d canvas`, `.intro`, `.look-again`, `.hint`, `.brand`, `.portfolio`, `.atlanta-service-intro`, and `.editorial`, plus scroll position, viewport size, `inViewport`, opacity/visibility, horizontal-overflow state, and browser console errors. Assertions cover service-to-featured separation, stage/service overlap only when both are visibly in the viewport, final stage visibility over portfolio, horizontal overflow, and page/console errors.

Command:

```bash
python3 /Users/wealthent/.config/opencode/skills/webapp-testing/scripts/with_server.py \
  --server "npx vite preview --host 127.0.0.1" --port 4174 -- \
  env QA_BASE_URL=http://127.0.0.1:4174 python3 scripts/homepage-layout-qa.py
```

Result:

```text
desktop: consoleErrors=[]; horizontalOverflow=false at camera, lcd, handoff, portfolio
mobile: consoleErrors=[]; horizontalOverflow=false at camera, lcd, handoff, portfolio
PASS  homepage layout bounds, overlap, overflow, and console checks
```

Key emitted bounds:

- Desktop service `top=9274.41`, `bottom=9886.48`; featured portfolio `top=9998.48`, `bottom=11420.55`; 112px separation.
- Mobile service `top=1864.80`, `bottom=2675.31`; featured portfolio `top=2739.31`, `bottom=3218.73`; 64px separation.
- At handoff, desktop stage opacity was `0` and mobile stage opacity was `0`; `.look-again` was visible, with service bounds recorded directly.
- At final portfolio, stage opacity was `0` on both viewports and no stage/service overlap assertion fired.

### Round 1 Scope

Only QA/tooling files changed: `scripts/seo-verify.py`, `scripts/test-seo-verify.py`, and `scripts/homepage-layout-qa.py`. No application UI or production assets were changed. Live production metadata/assets remain pending deployment from this isolated branch.

Round 1 commit: `65c844945083732f783d73f90844cf67c86ffd8b` (`test(seo): add verifier and layout QA coverage`).

## Final Review Fix Report

### Status

Implemented the four requested review fixes on the isolated `seo-foundation` branch. The pre-existing modification to `docs/superpowers/plans/2026-08-12-seo-foundation-implementation.md` was not changed or staged.

### Fixes

- Added the homepage canonical, absolute Twitter image, and escaped static `WebSite` and `Organization` JSON-LD directly to `index.html`.
- Added the absolute `twitter:image` assertion to `SeoHead.test.tsx` and the static verifier contract.
- Added `NoIndexSeoHead` and changed `PublicShell` so unknown public hash routes do not inherit homepage metadata or schemas. Valid registry routes and admin noindex behavior remain unchanged.
- Expanded `scripts/test-seo-verify.py` with HTML fixtures and eight tests for metadata/schema parsing, missing canonical/schema failures, route fallback detection, redirects, and content types. Shared assertions are used by `scripts/seo-verify.py`.

### Verification

| Check | Result |
|---|---|
| `npx tsc -b` | PASS; exit 0 |
| `npx oxlint` | PASS; 0 errors, 14 pre-existing warnings |
| `npx vitest run` | PASS; 17 files, 125 tests |
| `npx vite build` | PASS; 697 modules transformed |
| `python3 scripts/test-seo-verify.py` | PASS; 8 tests |
| `python3 -m py_compile scripts/seo-verify.py scripts/test-seo-verify.py` | PASS |
| `homepage-layout-qa.py` via Vite preview | PASS; desktop/mobile bounds, overlap, overflow, and console checks |

The built verifier's static checks pass, including canonical, OG image, Twitter image, and both required JSON-LD schema types. Its full local preview run still reports the documented HashRouter clean-route fallback and Vite preview `camera.ico` MIME limitation; those are not introduced by these fixes and remain deployment/route-architecture concerns.

### Commit

Commit: generated for this fix set; the final hash is recorded in the task response.

## Scoped Schema Leakage Fix

### Status

Resolved the remaining scoped finding. Static homepage `WebSite` and `Organization` JSON-LD scripts are now marked with `data-homepage-schema` in `index.html`. `NoIndexSeoHead`, used by both unknown public hash routes and admin routes, removes those scripts with the existing noindex metadata cleanup. Public `SeoHead` leaves them intact for the homepage fallback.

### Regression Coverage

Extended `src/seo/SeoHead.test.tsx` to assert that:

- homepage/public metadata retains both static homepage schema scripts;
- admin noindex cleanup removes both schema scripts;
- unknown public noindex cleanup removes both schema scripts.

The focused suite first failed with two noindex-route failures and then passed after the cleanup change.

### Verification

| Check | Result |
|---|---|
| `npx vitest run src/seo/SeoHead.test.tsx` | PASS; 3 tests |
| `npx vitest run` | PASS; 17 files, 125 tests |
| `npx tsc -b` | PASS; exit 0 |
| `npx vite build` | PASS; 697 modules transformed |
| `npx oxlint` | PASS; 0 errors, 14 pre-existing warnings |
| `python3 scripts/test-seo-verify.py` | PASS; 8 tests |

The existing clean-route HashRouter fallback and Vite preview `camera.ico` MIME behavior remain unchanged concerns.
