# FLIX 4K SEO Foundation Design

## Goal

Improve qualified organic visibility for FLIX 4K around:

- Atlanta photographer
- Atlanta wedding photographer
- FLIX 4K

The plan prioritizes useful, truthful local-service content over keyword repetition. Ranking cannot be guaranteed by on-page changes alone; Google Business Profile, reviews, local links, and Search Console data remain important external factors.

## Approved Homepage Copy

### SEO title

`Atlanta Photographer & Wedding Photography | FLIX 4K`

### Meta description

`FLIX 4K is an Atlanta photographer for weddings, portraits, events, video, and film productions across metro Atlanta. Book a professional photo and video crew.`

### Crawlable service section

Place this section after the camera handoff and before the homepage portfolio grid:

#### Heading

`Atlanta Photography for Weddings, Events & Life in Motion`

#### Copy

> Just a few miles from Atlanta, FLIX 4K Photography provides an excellent and affordable crew for wedding photography, portraits, video, special events, and film productions across metro Atlanta. Our film-friendly locations include industrial exteriors, downtown views, botanical settings, and landscaped spaces.
>
> Our staff is highly trained, professional, friendly, and focused on getting the job done quickly and beautifully. From an Atlanta wedding photographer documenting the day as it unfolds to family portraits and event photography built to last, we create images that preserve the people, places, love, and memories that matter.
>
> FLIX 4K Photography welcomes clients of every background, identity, culture, family structure, and ability. We are committed to providing a respectful, inclusive, and non-discriminatory experience for everyone.

## Route Metadata

Use unique titles and descriptions for every public route. Initial title proposals:

| Route | Title |
|---|---|
| `/` | Atlanta Photographer & Wedding Photography \| FLIX 4K |
| `/about` | About FLIX 4K \| Atlanta Photography & Video Crew |
| `/portfolio` | Atlanta Photography Portfolio \| FLIX 4K |
| `/portfolio/weddings` | Atlanta Wedding Photographer \| FLIX 4K |
| `/portfolio/events` | Atlanta Event Photographer \| FLIX 4K |
| `/portfolio/birthdays` | Atlanta Birthday Event Photography \| FLIX 4K |
| `/portfolio/portraits` | Atlanta Portrait Photographer \| FLIX 4K |
| `/videos` | Atlanta Photography & Video Reels \| FLIX 4K |
| `/book` | Book an Atlanta Photographer \| FLIX 4K |

Descriptions will be unique, factual, action-oriented, and approximately 120–160 characters. Category descriptions will come from the category content rather than a repeated template.

## Technical SEO Scope

### Head metadata

- Add route-aware title and description handling for the React application.
- Add canonical URL handling using the public `https://flix4kfilms.art` domain.
- Add `og:title`, `og:description`, `og:url`, `og:image`, `og:image:alt`, and `twitter:card=summary_large_image`.
- Add a stable 1200×630 social preview asset or use an existing verified asset after checking its dimensions.
- Keep the static `index.html` metadata useful as the crawler fallback before client-side route metadata executes.

### Structured data

Add truthful JSON-LD without inventing an address, phone number, reviews, awards, or service claims:

- Homepage: `WebSite` and `Organization`.
- About/contact context: `ProfessionalService` or `LocalBusiness` only when required business fields are available.
- Public portfolio/category pages: `BreadcrumbList`.
- Homepage service section: no FAQ schema unless visible FAQ content is added; structured data must match visible content.

### Crawl and discovery

- Add `robots.txt` allowing public pages and excluding `/admin`.
- Add a sitemap containing public, indexable URLs.
- Audit whether hash URLs can be reliably indexed. The current `HashRouter` produces URLs such as `/#/portfolio/weddings`; fragments are not strong SEO URLs.
- Recommended follow-up: migrate public routes to clean paths with a GitHub Pages fallback strategy before relying on category pages for search traffic. Preserve existing hash links during transition where practical.

### Internal linking

- Homepage service section links to Weddings, Events, Portraits, Videos, About, and Booking.
- Portfolio and category pages link across related categories.
- About and service copy link to Booking and relevant portfolio categories.
- Keep navigation labels descriptive and human-readable.

### On-page accessibility and media

- Preserve one primary H1 per public page.
- Ensure headings follow H1 → H2 → H3 order.
- Generate meaningful image alt text from available portfolio titles/category context; do not use keyword-stuffed alt text.
- Keep lazy loading for below-fold media and preserve the existing performance work.

## Content Strategy

The homepage targets the broad Atlanta photographer intent. Dedicated category pages target narrower service intent. Future content should address informational local searches with genuinely useful pages, such as:

- Atlanta wedding photography planning guide
- Atlanta portrait session locations
- Event photography in metro Atlanta
- Choosing a photography and video crew for an Atlanta event

These should only be created when FLIX 4K can provide original experience, examples, and accurate local details.

## Verification

Before completion:

- Validate title length, description length, uniqueness, canonical URLs, and absolute social image URLs.
- Confirm raw production HTML contains the static fallback metadata.
- Verify JSON-LD parses and matches visible content.
- Verify `robots.txt`, sitemap, favicon, and public routes return 200.
- Run existing typecheck, lint, unit, build, and smoke gates.
- Check desktop and mobile layouts after adding the service section.
- Submit the sitemap and request indexing in Google Search Console after deployment.

## Explicit Non-Goals

- No keyword stuffing or invisible text.
- No fake reviews, ratings, awards, exact location claims, or business facts not supplied by FLIX 4K.
- No desktop visual redesign.
- No promise of a specific Google ranking position.
