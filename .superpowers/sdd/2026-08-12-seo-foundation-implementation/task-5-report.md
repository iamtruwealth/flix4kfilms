# Task 5 Report: Audit Public URL Indexability and Choose Route Strategy

Date: 2026-08-13

## Status

Implemented the route verification tooling. No routing migration was made.

## Production Evidence

Commands run:

```bash
curl -I https://flix4kfilms.art/
curl -I https://flix4kfilms.art/#/portfolio/weddings
curl -I https://flix4kfilms.art/portfolio/weddings
```

Observed results:

| Request | Status | Result |
| --- | ---: | --- |
| `/` | 200 | GitHub Pages serves the homepage shell |
| `/#/portfolio/weddings` | 200 | The fragment is not sent to GitHub Pages; the same homepage shell is served |
| `/portfolio/weddings` | 404 | GitHub Pages does not serve the clean public route |

The raw HTML for `/` and `/#/portfolio/weddings` is identical from the server's perspective. The fragment is client-only, so it cannot select route-specific HTML metadata during a raw HTTP crawl. The current production shell also does not contain the route-specific canonical, OG image, or JSON-LD fallback required by the verifier.

## Route Decision

Clean public routes do not currently work on GitHub Pages. The existing `HashRouter` was therefore preserved, and no canonical or sitemap migration to clean paths was made in this task.

A BrowserRouter plus GitHub Pages fallback migration remains a separate approved change. It should only be implemented with a generated `404.html` equivalent to the built shell, followed by direct-load verification of every public route before canonical URLs and sitemap entries are changed.

## Tooling Added

Added `scripts/seo-verify.py`.

The script:

- Checks `200` status for the homepage and all configured public clean routes.
- Checks `200` status and expected content types for `robots.txt`, `sitemap.xml`, and `camera.ico`.
- Downloads homepage HTML.
- Verifies the static title and description.
- Verifies the static canonical, OG image, and valid JSON-LD fallback.
- Prints clean-route failures explicitly so a static-host `404` is not mistaken for indexable SPA content.
- Accepts `--base-url` or `SEO_BASE_URL` for local preview and deployed checks.

## Verification

`npm run build`

Result: passed. TypeScript compilation and Vite production build completed successfully.

`python3 -m py_compile scripts/seo-verify.py`

Result: passed.

`python3 scripts/seo-verify.py`

Result: expected failure against the current live deployment:

- Homepage: `200`
- Public clean routes: `404` for `/about`, `/portfolio`, `/portfolio/weddings`, `/portfolio/events`, `/portfolio/birthdays`, `/portfolio/portraits`, `/videos`, and `/book`
- `robots.txt`, `sitemap.xml`, and `camera.ico`: `404`
- Static title/description/canonical/OG image/JSON-LD fallback: absent from the deployed shell

Local preview verification was also run through the webapp testing server helper. Vite returned `200` for clean routes through its development history fallback, but returned the SPA shell content type for missing static assets and failed the static metadata assertions. This confirms that local preview status codes alone cannot establish GitHub Pages indexability.

## Concerns

- The current deployed site appears to be behind the SEO foundation work in this worktree; production HTML is the older `FLIX 4K` shell.
- `robots.txt`, `sitemap.xml`, and `camera.ico` need to be present in the deployed artifact before the verifier can pass.
- Static fallback metadata must be added by the relevant SEO implementation task before route-specific canonical and sitemap work can be considered crawlable.
- The verifier intentionally fails until those deployment prerequisites exist; this is a signal, not a suppressed warning.

## Round 1 Fix

Reviewer finding: the previous implementation allowed `urllib.request.urlopen`
to follow redirects and treated any final `200` as proof that a clean route was
served. It also did not inspect the route response body.

Fixed in `scripts/seo-verify.py` by:

- Disabling automatic redirect following and retaining the requested URL, final
  URL, status, and `Location` header for every request.
- Requiring clean routes and required assets to return `200` without a final URL
  change.
- Checking clean-route HTML against the expected route title and canonical, and
  rejecting a response identical to the homepage shell.
- Keeping the existing asset content-type checks so a local static-host
  fallback returning `text/html` cannot masquerade as `robots.txt`,
  `sitemap.xml`, or `camera.ico`.

Round 1 verification:

- `python3 -m py_compile scripts/seo-verify.py`: passed.
- Live `python3 scripts/seo-verify.py`: expected failure; `/about` and all
  other clean routes remain `404`, with no redirect-following false positives.
- Local Vite preview verifier: clean routes return `200` from Vite's fallback,
  but each fails the generic-homepage check; the three missing assets fail
  their content-type checks; static metadata assertions fail as expected.
- Synthetic HTTP-server test: a `302 Location: /` response remains observable
  as `302` with `Location=/` instead of becoming a false `200` pass.

The current deployment remains unindexable at clean public paths. No routing or
canonical migration was made as part of this fix.
