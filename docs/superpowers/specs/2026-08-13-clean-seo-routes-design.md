# Clean SEO Routes Design

## Goal

Serve FLIX4K public SEO routes from clean static URLs while preserving the existing React route components, admin protection, and visual/camera behavior.

## Architecture

The application uses `BrowserRouter` for client-side navigation. Vite builds the normal homepage bundle, then a small post-build plugin reads the generated `dist/index.html` and writes route-specific shells for every non-home entry in `SEO_ENTRIES`. Each shell keeps root-relative assets, replaces public metadata, removes homepage-only schemas, and adds a static `BreadcrumbList`.

The homepage remains the only static shell with `WebSite` and `Organization` schemas. Admin routes are not included in generation, sitemap output, or public SEO verification. GitHub Pages custom-domain deployment is compatible with `base: '/'` because the domain serves the site at `/`.

## Verification

Vitest covers the pure HTML transformation. The Python verifier checks clean route metadata, canonical and OG URLs, BreadcrumbList schema, exact-route trailing-slash redirects, and rejection of homepage fallback content. The Playwright smoke test exercises clean public paths and verifies unauthenticated `/admin` redirects to `/admin/login`.

## Constraints

- Preserve all route paths/components and admin protection.
- Preserve `https://flix4kfilms.art` absolute URLs.
- Do not change desktop/mobile visual calibration or camera/LCD state behavior.
