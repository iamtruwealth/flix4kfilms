# Task 3 Report: Add JSON-LD Structured Data

## Implementation

- Added `src/seo/JsonLd.tsx` with the requested `{ data }` interface.
- Added escaped JSON serialization that replaces every `<` with `\\u003c` before setting JSON-LD markup.
- Added `WebSite`, `Organization`, and route-aware `BreadcrumbList` builders in `src/seo/schema.ts`.
- Mounted `WebSite` and `Organization` only on `/`.
- Mounted `BreadcrumbList` on public non-home routes.
- Kept `/admin/*` outside `PublicShell`, so admin routes receive no public JSON-LD schemas.
- Added no telephone, address, rating, review, award, or unverified social fields.

## Commands And Output

### TDD RED

```text
$ npx vitest run src/seo/schema.test.ts
FAIL: Failed to resolve import "./JsonLd" from "src/seo/schema.test.ts". Does the file exist?
```

This was the expected failure before implementing the requested modules.

### Focused tests

```text
$ npx vitest run src/seo/schema.test.ts
✓ src/seo/schema.test.ts (3 tests)
Test Files  1 passed (1)
Tests       3 passed (3)
```

### Full test suite

```text
$ npx vitest run
Test Files  17 passed (17)
Tests       124 passed (124)
```

The suite emitted the existing expected Supabase fallback `stderr` output from `src/portfolio/bootstrap.test.ts`.

### Build

```text
$ npm run build
> tsc -b && vite build
✓ built in 427ms
```

The build also emitted the existing Vite warning about chunks larger than 500 kB.

### Lint

```text
$ npm run lint
Found 14 warnings and 0 errors.
Finished in 75ms on 101 files with 104 rules using 8 threads.
```

The warnings are pre-existing and outside the Task 3 files, including unused variables in `glb-calb.mjs`/`glb-faces2.mjs`, hook dependency warnings, and a Fast Refresh warning.

## Concerns

- The app uses `HashRouter`; schema URLs intentionally use the canonical path URLs without hash fragments.
- No verified social URLs were present in the project, so `sameAs` was omitted.
- Unknown public paths receive a breadcrumb based on their pathname and the existing fallback page behavior; admin paths return no breadcrumb.
- Existing lint warnings and the existing large-chunk build warning remain unchanged.
