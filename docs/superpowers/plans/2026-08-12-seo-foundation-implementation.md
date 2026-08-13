# FLIX 4K SEO Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an honest, crawlable SEO foundation for FLIX 4K targeting Atlanta photographer, Atlanta wedding photographer, and FLIX 4K.

**Architecture:** Add a small route-aware SEO layer that owns titles, descriptions, canonical URLs, social metadata, JSON-LD, and breadcrumbs. Add a crawlable homepage service section between the cinematic handoff and the portfolio grid. Add static crawl files and validate the current hash-router limitation before deciding whether to migrate public routes to clean URLs.

**Tech Stack:** React 19, React Router HashRouter, Vite, TypeScript, Vitest, GitHub Pages.

## Global Constraints

- Preserve the desktop cinematic camera, LCD, and portfolio experience.
- Preserve the existing mobile responsive behavior and performance work.
- Use the approved Metro Atlanta wording and inclusive language from the SEO design spec.
- Do not invent an address, phone number, reviews, awards, ratings, credentials, or exact location claims.
- Keep one primary H1 per public page.
- Do not use keyword stuffing, hidden text, or duplicated page copy.
- Use absolute HTTPS URLs for canonical and social metadata.
- Public admin routes must remain excluded from crawl directives and sitemap output.

---

### Task 1: Create SEO Content Registry and Head Metadata

**Files:**
- Create: `src/seo/seoContent.ts`
- Create: `src/seo/SeoHead.tsx`
- Create: `src/seo/seoContent.test.ts`
- Modify: `src/App.tsx`
- Modify: `index.html`

**Interfaces:**
- `SeoEntry = { title: string; description: string; path: string }`
- `SEO_ENTRIES: Record<string, SeoEntry>` provides metadata for `/`, `/about`, `/portfolio`, `/portfolio/weddings`, `/portfolio/events`, `/portfolio/birthdays`, `/portfolio/portraits`, `/videos`, and `/book`.
- `SeoHead({ entry }: { entry: SeoEntry })` updates `document.title`, the description tag, canonical link, Open Graph tags, and Twitter tags.

- [ ] **Step 1: Write failing metadata tests**

Test `SEO_ENTRIES` contains unique titles, titles no longer than 60 characters, descriptions between 120 and 160 characters, and the approved target phrases on the homepage and wedding category entries.

- [ ] **Step 2: Run the focused test**

Run: `npx vitest run src/seo/seoContent.test.ts`

Expected: FAIL because the SEO registry does not exist.

- [ ] **Step 3: Add the registry**

Use these exact initial titles:

```ts
export const SEO_ENTRIES = {
  '/': {
    title: 'Atlanta Photographer & Wedding Photography | FLIX 4K',
    description: 'FLIX 4K is an Atlanta photographer for weddings, portraits, events, video, and film productions across metro Atlanta. Book a professional photo and video crew.',
    path: '/',
  },
  '/about': {
    title: 'About FLIX 4K | Atlanta Photography & Video Crew',
    description: 'Learn about FLIX 4K Photography, an inclusive Atlanta photo and video crew serving weddings, portraits, events, and film productions across metro Atlanta.',
    path: '/about',
  },
  '/portfolio': {
    title: 'Atlanta Photography Portfolio | FLIX 4K',
    description: 'Explore the FLIX 4K photography portfolio featuring Atlanta weddings, portraits, birthdays, events, and visual stories created across metro Atlanta.',
    path: '/portfolio',
  },
  '/portfolio/weddings': {
    title: 'Atlanta Wedding Photographer | FLIX 4K',
    description: 'View Atlanta wedding photography by FLIX 4K, with thoughtful coverage for ceremonies, celebrations, couples, families, and the moments between them.',
    path: '/portfolio/weddings',
  },
  '/portfolio/events': {
    title: 'Atlanta Event Photographer | FLIX 4K',
    description: 'See event photography from FLIX 4K for Atlanta celebrations, special events, productions, and gatherings captured with an efficient professional crew.',
    path: '/portfolio/events',
  },
  '/portfolio/birthdays': {
    title: 'Atlanta Birthday Event Photography | FLIX 4K',
    description: 'Explore birthday and milestone event photography from FLIX 4K, serving clients across metro Atlanta with polished, friendly, efficient coverage.',
    path: '/portfolio/birthdays',
  },
  '/portfolio/portraits': {
    title: 'Atlanta Portrait Photographer | FLIX 4K',
    description: 'Discover Atlanta portrait photography by FLIX 4K for individuals, couples, families, and personal stories captured with intention.',
    path: '/portfolio/portraits',
  },
  '/videos': {
    title: 'Atlanta Photography & Video Reels | FLIX 4K',
    description: 'Watch FLIX 4K photography and video reels for weddings, events, portraits, social content, and film-friendly productions across metro Atlanta.',
    path: '/videos',
  },
  '/book': {
    title: 'Book an Atlanta Photographer | FLIX 4K',
    description: 'Book FLIX 4K for Atlanta wedding photography, portraits, events, video, or film production. Tell us what you are planning and start a conversation.',
    path: '/book',
  },
} as const
```

- [ ] **Step 4: Implement `SeoHead`**

The component must upsert, rather than duplicate, these head elements:

```ts
document.title = entry.title
setMeta('description', entry.description)
setMeta('og:title', entry.title, 'property')
setMeta('og:description', entry.description, 'property')
setMeta('og:url', absoluteUrl(entry.path), 'property')
setMeta('twitter:card', 'summary_large_image', 'name')
setMeta('twitter:title', entry.title, 'name')
setMeta('twitter:description', entry.description, 'name')
setCanonical(absoluteUrl(entry.path))
```

Use `https://flix4kfilms.art` as the canonical base. Preserve static fallback title and description in `index.html` using the homepage values.

- [ ] **Step 5: Mount route metadata**

Add a route-aware `SeoHead` inside the app shell using `location.pathname`, with a safe homepage fallback for unknown paths. Keep `/admin/*` out of public SEO metadata and use `noindex` for admin routes.

- [ ] **Step 6: Run focused tests**

Run: `npx vitest run src/seo/seoContent.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/seo src/App.tsx index.html
git commit -m "feat(seo): add route-aware metadata registry"
```

---

### Task 2: Add the Homepage Atlanta Service Section

**Files:**
- Create: `src/ui/AtlantaServiceIntro.tsx`
- Create: `src/ui/AtlantaServiceIntro.test.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- `AtlantaServiceIntro()` renders one H2, three paragraphs, and descriptive internal links.

- [ ] **Step 1: Write the content test**

Assert the component exposes the phrases `Atlanta Photography`, `wedding photography`, `metro Atlanta`, `Atlanta wedding photographer`, and `non-discriminatory` in rendered text.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npx vitest run src/ui/AtlantaServiceIntro.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the approved copy**

Render:

```tsx
<section className="atlanta-service-intro" aria-labelledby="atlanta-service-title">
  <p className="kicker">METRO ATLANTA PHOTOGRAPHY</p>
  <h2 id="atlanta-service-title">Atlanta Photography for Weddings, Events &amp; Life in Motion</h2>
  <p>Just a few miles from Atlanta, FLIX 4K Photography provides an excellent and affordable crew for wedding photography, portraits, video, special events, and film productions across metro Atlanta. Our film-friendly locations include industrial exteriors, downtown views, botanical settings, and landscaped spaces.</p>
  <p>Our staff is highly trained, professional, friendly, and focused on getting the job done quickly and beautifully. From an Atlanta wedding photographer documenting the day as it unfolds to family portraits and event photography built to last, we create images that preserve the people, places, love, and memories that matter.</p>
  <p>FLIX 4K Photography welcomes clients of every background, identity, culture, family structure, and ability. We are committed to providing a respectful, inclusive, and non-discriminatory experience for everyone.</p>
  <nav aria-label="Atlanta photography services">
    <Link to="/portfolio/weddings">Atlanta wedding photography</Link>
    <Link to="/portfolio/events">Atlanta event photography</Link>
    <Link to="/portfolio/portraits">Atlanta portrait photography</Link>
    <Link to="/book">Book an Atlanta photographer</Link>
  </nav>
</section>
```

- [ ] **Step 4: Place it after the handoff and before the portfolio grid**

Insert `<AtlantaServiceIntro />` between the existing `Portfolio` header and `<PortfolioGrid items={featured} />` so the copy is in the post-camera, pre-gallery crawlable region requested by the approved design.

- [ ] **Step 5: Add responsive editorial styling**

Use the existing typography and spacing tokens. Keep the section readable on mobile with a maximum measure, no keyword-stuffed repeated headings, and no desktop layout changes outside this section.

- [ ] **Step 6: Run the focused test**

Run: `npx vitest run src/ui/AtlantaServiceIntro.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ui/AtlantaServiceIntro.tsx src/ui/AtlantaServiceIntro.test.tsx src/pages/HomePage.tsx src/styles.css
git commit -m "feat(seo): add crawlable Atlanta service introduction"
```

---

### Task 3: Add JSON-LD Structured Data

**Files:**
- Create: `src/seo/JsonLd.tsx`
- Create: `src/seo/schema.ts`
- Create: `src/seo/schema.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- `JsonLd({ data }: { data: Record<string, unknown> })`
- `buildWebSiteSchema(): Record<string, unknown>`
- `buildOrganizationSchema(): Record<string, unknown>`
- `buildBreadcrumbSchema(pathname: string): Record<string, unknown> | null`

- [ ] **Step 1: Write schema tests**

Assert homepage schemas contain `WebSite` and `Organization`, breadcrumbs contain absolute `https://flix4kfilms.art` URLs, and no schema contains invented telephone, address, rating, review, or award fields.

- [ ] **Step 2: Implement escaped JSON-LD**

Serialize JSON after replacing `<` with `\\u003c` to prevent markup injection. Use only verified values:

```ts
const base = 'https://flix4kfilms.art'

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FLIX 4K',
    url: base,
    description: 'Atlanta photography, wedding photography, portraits, events, video, and film production by FLIX 4K.',
  }
}
```

Use an `Organization` schema with name, URL, description, and `sameAs` only when verified social URLs are present in the project. Do not add a street address or phone number without confirmed data.

- [ ] **Step 3: Mount schemas by route**

Render Website + Organization on `/`; render BreadcrumbList on public non-home routes. Do not mount public schemas on `/admin` routes.

- [ ] **Step 4: Validate focused tests**

Run: `npx vitest run src/seo/schema.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/seo src/App.tsx
git commit -m "feat(seo): add truthful JSON-LD business schemas"
```

---

### Task 4: Add Crawl Files and Social Preview Asset

**Files:**
- Create: `public/robots.txt`
- Create: `public/sitemap.xml`
- Create or verify: `public/og-image.jpg`
- Modify: `index.html`

- [ ] **Step 1: Verify the existing image dimensions**

Run:

```bash
file public/flix4k-logo.jpg
```

If it is not a suitable 1200×630 social image, create a dedicated 1200×630 JPEG using the FLIX 4K brand/camera imagery. Do not use a relative or authenticated image URL in metadata.

- [ ] **Step 2: Add robots.txt**

Use:

```txt
User-agent: *
Allow: /
Disallow: /admin

Sitemap: https://flix4kfilms.art/sitemap.xml
```

- [ ] **Step 3: Add sitemap.xml**

Include only public URLs that exist in the current app:

```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://flix4kfilms.art/</loc></url>
  <url><loc>https://flix4kfilms.art/about</loc></url>
  <url><loc>https://flix4kfilms.art/portfolio</loc></url>
  <url><loc>https://flix4kfilms.art/portfolio/weddings</loc></url>
  <url><loc>https://flix4kfilms.art/portfolio/events</loc></url>
  <url><loc>https://flix4kfilms.art/portfolio/birthdays</loc></url>
  <url><loc>https://flix4kfilms.art/portfolio/portraits</loc></url>
  <url><loc>https://flix4kfilms.art/videos</loc></url>
  <url><loc>https://flix4kfilms.art/book</loc></url>
</urlset>
```

Do not claim these clean URLs are indexable until the route architecture is verified in production.

- [ ] **Step 4: Add static OG fallback tags**

Add homepage fallback tags in `index.html`:

```html
<meta property="og:title" content="Atlanta Photographer &amp; Wedding Photography | FLIX 4K" />
<meta property="og:description" content="FLIX 4K is an Atlanta photographer for weddings, portraits, events, video, and film productions across metro Atlanta." />
<meta property="og:url" content="https://flix4kfilms.art/" />
<meta property="og:image" content="https://flix4kfilms.art/og-image.jpg" />
<meta property="og:image:alt" content="FLIX 4K camera for Atlanta photography and wedding photography" />
<meta name="twitter:card" content="summary_large_image" />
```

- [ ] **Step 5: Commit**

```bash
git add public/robots.txt public/sitemap.xml public/og-image.jpg index.html
git commit -m "feat(seo): add crawl files and social metadata fallback"
```

---

### Task 5: Audit Public URL Indexability and Choose Route Strategy

**Files:**
- Inspect/modify: `src/App.tsx`
- Inspect/modify: `src/main.tsx`
- Modify if needed: `public/404.html`
- Modify if needed: `vite.config.ts`
- Test: `scripts/seo-verify.py`

- [ ] **Step 1: Verify current production URL behavior**

Run:

```bash
curl -I https://flix4kfilms.art/
curl -I https://flix4kfilms.art/#/portfolio/weddings
curl -I https://flix4kfilms.art/portfolio/weddings
```

Document whether clean route requests return the SPA shell and whether the current hash route is represented in crawlable raw HTML.

- [ ] **Step 2: Add an automated SEO verification script**

`scripts/seo-verify.py` must check status codes for the homepage, public routes, `robots.txt`, `sitemap.xml`, and `camera.ico`; download homepage HTML; assert the static title, description, canonical, OG image, and JSON-LD fallback are present.

- [ ] **Step 3: Decide route migration based on evidence**

If clean public routes are not served by GitHub Pages, do not pretend the sitemap makes them indexable. Prepare a separate approved migration using BrowserRouter plus a GitHub Pages fallback (`404.html` equivalent to the built shell), preserve existing hash links, and verify direct loads before changing canonical URLs.

If clean routes already work, switch the sitemap and canonical paths to them and keep hash links only as legacy navigation targets.

- [ ] **Step 4: Commit the verification or route fix**

```bash
git add scripts/seo-verify.py src/App.tsx src/main.tsx public/404.html vite.config.ts
git commit -m "chore(seo): verify public route indexability"
```

---

### Task 6: SEO QA and Production Verification

**Files:**
- Modify: `src/seo/seoContent.test.ts` if validation rules need refinement
- Modify: `scripts/seo-verify.py` if production checks require fixes

- [ ] **Step 1: Run all project gates**

```bash
npx tsc -b
npx oxlint
npx vitest run
npx vite build
python3 scripts/smoke-test.py
```

Expected: zero TypeScript errors, zero lint errors, all Vitest tests passing, successful production build, and smoke checks passing. Existing smoke-test lazy-route flakiness must be reported separately if unchanged.

- [ ] **Step 2: Run SEO validation**

```bash
python3 scripts/seo-verify.py https://flix4kfilms.art
```

Expected: public status checks pass; admin is excluded from robots/sitemap; metadata lengths and JSON-LD checks pass.

- [ ] **Step 3: Run browser QA**

Verify desktop and mobile homepage layouts after the service section is inserted. Confirm the section does not cover the camera, LCD, handoff, or featured portfolio grid.

- [ ] **Step 4: Inspect production raw HTML**

```bash
curl -s https://flix4kfilms.art/ | grep -Ei 'title|description|canonical|og:|twitter:|application/ld\+json'
```

- [ ] **Step 5: Commit final QA tooling/fixes**

```bash
git add .
git commit -m "test(seo): add production metadata verification"
```

---

## Self-Review Checklist

- Spec coverage: homepage copy, unique titles, canonical/social metadata, JSON-LD, robots, sitemap, internal links, accessibility, route indexability, and verification all have explicit tasks.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: `SeoEntry`, `SEO_ENTRIES`, `SeoHead`, `JsonLd`, and schema builder names are defined before use.
- Scope: clean URL migration is explicitly evidence-driven because the current HashRouter/GitHub Pages architecture may not support indexable route paths without a separate fallback change.
