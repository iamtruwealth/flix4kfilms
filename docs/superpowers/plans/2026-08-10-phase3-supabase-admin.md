# Phase 3 — Supabase Content System + Admin Control Room

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporary local content system with a production-ready Supabase-backed content system, and build a private admin control room so the owner can upload/manage photography and videos without touching code.

**Architecture:** The existing `PortfolioRepository` interface stays the UI boundary. A new `SupabasePortfolioRepository` implements the same interface (with extended admin CRUD + a synchronous cache for the LCD), registered alongside `LocalPortfolioRepository` as the offline/dev fallback. A content bootstrap hydrates the LCD cache from Supabase on startup, then swaps the active provider. The admin panel is a separately-routed, lazy-loaded module under `/admin`, protected by Supabase Auth + RLS + an admin allowlist.

**Tech Stack:** `@supabase/supabase-js` v2 (Auth, Postgres, Storage), React 19 + react-router-dom (HashRouter), Vite 8, Vitest.

## Global Constraints

- Do NOT redesign the cinematic camera experience or modify calibrated camera/LCD positioning.
- Do NOT redesign the public navigation.
- Do NOT add unnecessary CMS complexity. YAGNI.
- Existing `PortfolioRepository` abstraction must remain the boundary between UI and content source.
- Public UI must never know whether content came from Local or Supabase.
- LCD must read from a synchronous in-memory cache — never a DB request per scroll frame or per photo change.
- If Supabase is unavailable/fails: fall back to the local placeholder catalog, never a blank page.
- Public home must not download the admin UI (lazy-load `/admin`).
- Continue HashRouter + relative asset paths (`base: './'`) for GitHub Pages. Do NOT switch to BrowserRouter.
- `verbatimModuleSyntax` + `erasableSyntaxOnly` are ON: use `import type` for types, no enums/namespaces, no parameter properties on classes (assign fields explicitly in constructor body).
- No secrets in frontend code. Only `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` in the browser. Never `service_role`.
- Media must NOT live in the Git repo. Everything in Supabase Storage.
- RLS is the real security boundary; frontend route guards are UX only.
- Do NOT build: booking backend, payments, customer accounts, client galleries, comments/likes/social, analytics, AI tagging, editing, transcoding, multi-user teams.

---

## File Structure

```
supabase/
  schema.sql                     # full DB + storage + RLS DDL (applied in Supabase SQL editor)
.env.example
docs/supabase-setup.md           # setup + admin-user creation guide
src/
  lib/
    supabaseClient.ts            # lazy Supabase client singleton (null-safe)
    contentCache.ts              # synchronous LCD cache store (items/categories/videos)
  portfolio/
    types.ts                     # (modify) add categoryId, AdminItemInput/VideoInput types
    repository.ts                # (modify) extend interface w/ admin CRUD + getPortfolioItem/getItemsByCategory; provider registry
    localRepository.ts           # (new) LocalPortfolioRepository moved here, implements extended interface
    supabaseRepository.ts        # (new) SupabasePortfolioRepository (read + admin CRUD + sync cache)
    storage.ts                   # (new) storage path builder + public URL builder (pure)
    bootstrap.ts                 # (new) hydrateContent(): supabase→cache, provider swap, fallback
    hooks.ts                     # (modify) add admin hooks; public hooks unchanged behavior
  admin/
    auth.ts                      # (new) admin identity check + session store + gate logic (pure)
    uploadValidation.ts          # (new) file type/size validation + storage path naming (pure)
    UploadDropzone.tsx           # (new) drag/drop + browse + progress + retry
    ResumableUploader.ts         # (new) supabase TUS upload wrapper w/ progress
    AdminLayout.tsx              # (new) sidebar shell (Overview/Photos/Videos/Categories/Settings/Logout)
    LoginPage.tsx                # (new) /admin/login (email/password, reset, no register)
    ProtectedRoute.tsx           # (new) loading → login → denied → outlet
    AdminRoutes.tsx              # (new) lazy-loaded nested routes
    pages/
      OverviewPage.tsx           # (new)
      PhotosPage.tsx             # (new) list/upload/edit/publish/reorder/delete
      PhotoEditDialog.tsx        # (new)
      ReorderList.tsx            # (new) drag reorder
      VideosPage.tsx             # (new)
      CategoriesPage.tsx         # (new)
      SettingsPage.tsx           # (new) static for now
  App.tsx                        # (modify) add /admin routes (lazy)
  pages/                         # (mostly unchanged; verify they use repository hooks)
tests/  (vitest, colocated *.test.ts)
```

---

### Task 1: Supabase client + env + cache

**Files:**
- Create: `src/lib/supabaseClient.ts`, `src/lib/contentCache.ts`, `.env.example`, `.gitignore` (modify), `src/vite-env.d.ts` (create if missing)

**Interfaces:**
- Consumes: existing `createStore` from `src/lib/store.ts`.
- Produces: `getSupabaseClient(): SupabaseClient | null`; `contentCache` external store with `items`, `categories`, `videos`, `source: 'local' | 'supabase'`, `hydrated: boolean`.

- [ ] **Step 1:** Create `.env.example`:
```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-publishable-key
```

- [ ] **Step 2:** Update `.gitignore` — ensure these are ignored:
```gitignore
.env
.env.*
!.env.example
*.local
```

- [ ] **Step 3:** Create `src/vite-env.d.ts` if absent:
```ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 4:** Install dependency and create the lazy client:
```bash
npm install @supabase/supabase-js
```
```ts
// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null
let initError: Error | null = null

/** Lazily creates the browser Supabase client. Returns null if unconfigured.
 *  Publishable (anon) key only — RLS enforces authorization. */
export function getSupabaseClient(): SupabaseClient | null {
  if (initError) return null
  if (client) return client
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    initError = new Error('Supabase env vars missing — using local content.')
    return null
  }
  try {
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
    return client
  } catch (err) {
    initError = err as Error
    return null
  }
}
```

- [ ] **Step 5:** Create the synchronous content cache (LCD-safe):
```ts
// src/lib/contentCache.ts
import { createStore } from './store'
import type { PortfolioCategory, PortfolioItem, VideoItem } from '../portfolio/types'

export interface ContentCacheState {
  items: PortfolioItem[]
  categories: PortfolioCategory[]
  videos: VideoItem[]
  source: 'local' | 'supabase'
  hydrated: boolean
}

export const contentCache = createStore<ContentCacheState>({
  items: [],
  categories: [],
  videos: [],
  source: 'local',
  hydrated: false,
})

export function setCacheItems(items: PortfolioItem[], source: 'local' | 'supabase'): void {
  contentCache.update((s) => ({ ...s, items, source, hydrated: true }))
}
export function setCacheCategories(categories: PortfolioCategory[]): void {
  contentCache.update((s) => ({ ...s, categories }))
}
export function setCacheVideos(videos: VideoItem[]): void {
  contentCache.update((s) => ({ ...s, videos }))
}
```

- [ ] **Step 6:** Verify: `npx tsc -b` passes; `npm run lint` passes.
- [ ] **Step 7:** Commit:
```bash
git add src/lib/supabaseClient.ts src/lib/contentCache.ts .env.example .gitignore src/vite-env.d.ts package.json package-lock.json
git commit -m "feat: add Supabase client + content cache + env scaffolding"
```

---

### Task 2: Types + repository interface extension + LocalPortfolioRepository extraction

**Files:**
- Modify: `src/portfolio/types.ts`
- Create: `src/portfolio/localRepository.ts`
- Modify: `src/portfolio/repository.ts`

**Interfaces:**
- Produces (types):
```ts
export interface AdminItemInput {
  title: string
  categoryId: string
  slug: string
  description: string
  imagePath: string | null
  thumbnailPath: string | null
  year: string
  sortOrder: number
  published: boolean
  featured: boolean
}
export interface AdminVideoInput {
  title: string
  slug: string
  description: string
  videoPath: string | null
  thumbnailPath: string | null
  year: string
  sortOrder: number
  published: boolean
  featured: boolean
}
```
- Extend `PortfolioItem` with `categoryId: string` (needed by Supabase join + admin).
- Produces (interface additions):
```ts
getPortfolioItem(id: string): Promise<PortfolioItem | null>
getItemsByCategory(slug: string): Promise<PortfolioItem[]>
createItem(input: AdminItemInput): Promise<PortfolioItem>
updateItem(id: string, patch: Partial<AdminItemInput>): Promise<PortfolioItem>
deleteItem(id: string): Promise<void>
reorderItems(orderedIds: string[]): Promise<void>
createVideo(input: AdminVideoInput): Promise<VideoItem>
updateVideo(id: string, patch: Partial<AdminVideoInput>): Promise<VideoItem>
deleteVideo(id: string): Promise<void>
createCategory(input: { name: string; slug: string; description: string; sortOrder: number; published: boolean }): Promise<PortfolioCategory>
updateCategory(id: string, patch: Partial<...>): Promise<PortfolioCategory>
deleteCategory(id: string): Promise<void>
```

- [ ] **Step 1:** Modify `src/portfolio/types.ts`: add `categoryId: string` to `PortfolioItem`, and add `AdminItemInput`, `AdminVideoInput`, `CategoryInput` interfaces (as above). Keep `FramePhoto` unchanged.
- [ ] **Step 2:** Extract Local repository into `src/portfolio/localRepository.ts`, moving the class from `repository.ts` verbatim but extending it to implement the new interface methods (in-memory CRUD, getPortfolioItem, getItemsByCategory, reorder by re-indexing sortOrder, category CRUD guarded against orphaned items).
- [ ] **Step 3:** Rewrite `src/portfolio/repository.ts` to: keep the `PortfolioRepository` interface (now extended), keep `getPortfolioRepository()` singleton + `setPortfolioRepository()` and `getCachedPortfolioItems()`, import the local repo as the default provider, and add `resetPortfolioRepository()` for tests.
- [ ] **Step 4:** Update any existing imports of `LocalPortfolioRepository` to the new path.
- [ ] **Step 5:** Verify `npx tsc -b` and `npm run lint`; run `npx vitest run` (existing 18 tests must still pass — they don't import repository directly, but confirm).
- [ ] **Step 6:** Commit.

---

### Task 3: Storage helpers (pure) + SupabasePortfolioRepository

**Files:**
- Create: `src/portfolio/storage.ts`, `src/portfolio/supabaseRepository.ts`

**Interfaces:**
- `storage.ts` produces:
```ts
export type BucketName = 'portfolio-images' | 'portfolio-thumbnails' | 'portfolio-videos'
export function bucketFor(kind: 'image' | 'thumbnail' | 'video'): BucketName
export function buildStoragePath(kind: 'image' | 'thumbnail' | 'video', categorySlug: string, year: string, fileName: string): string
export function safeStorageName(originalName: string, prefix?: string): string  // uuid + sanitized ext
export function publicObjectUrl(bucket: BucketName, path: string): string      // `${url}/storage/v1/object/public/${bucket}/${path}`
export function transformedImageUrl(bucket: 'portfolio-images' | 'portfolio-thumbnails', path: string, width?: number, height?: number): string
```
- `supabaseRepository.ts` produces class `SupabasePortfolioRepository implements PortfolioRepository` (read + admin + sync cache using `contentCache`).

- [ ] **Step 1:** Write `src/portfolio/storage.ts`. Path convention: `portfolio-images/{categorySlug}/{year}/{safeName}`; thumbnails mirror under `portfolio-thumbnails`; videos under `portfolio-videos/{categorySlug}/{year}/{safeName}`. `safeStorageName` uses `crypto.randomUUID()` (fallback to `Date.now()+Math.random()` if unavailable) + lowercase sanitized extension (jpg/png/webp/mp4/webm/mov).
- [ ] **Step 2:** Write `SupabasePortfolioRepository`. Row→domain mapping: `category_id` → `categoryId`, join `portfolio_categories` for `category` slug; `image_path` → `imageUrl` (full size) and `thumbnail_path` → `thumbnailUrl`; published/unpublished returned with a private `includeUnpublished` flag for admin methods.
- [ ] **Step 3:** Public reads (`getPortfolioItems`, `getItemsByCategory`, `getFeaturedItems`, `getPortfolioCategories`, `getVideos`, `getPortfolioItem`) all filter `published = true` server-side.
- [ ] **Step 4:** Admin CRUD: `createItem/updateItem/deleteItem/reorderItems` (+ video + category equivalents) using `.from('portfolio_items')` etc. On success of a read, hydrate `contentCache` (`setCacheItems` for public views).
- [ ] **Step 5:** `getCachedPortfolioItems()` returns `contentCache.get().items` (never queries).
- [ ] **Step 6:** Tests: `src/portfolio/supabaseRepository.test.ts` with a **fake** supabase client (a `{ from: () => ({ select/insert/update/delete/eq/order/single }) }` stub returning canned rows) — verify published filtering, category slug join, mapping, cache hydration, admin create/update/delete, reorder.
- [ ] **Step 7:** `npx tsc -b`, `npm run lint`, `npx vitest run` (all green).
- [ ] **Step 8:** Commit.

---

### Task 4: Content bootstrap (hydration + provider swap + fallback)

**Files:**
- Create: `src/portfolio/bootstrap.ts`

**Interfaces:**
- Consumes: `getSupabaseClient`, `contentCache`, `SupabasePortfolioRepository`, `setPortfolioRepository`, local data.
- Produces: `hydrateContent(): Promise<ContentHydrationResult>` with `{ ok: boolean; source: 'local' | 'supabase' }`.

- [ ] **Step 1:** Write `hydrateContent()`:
  - If no Supabase client → seed cache with local catalog, `source: 'local'`, return `{ ok: true, source: 'local' }`.
  - Else create `SupabasePortfolioRepository`, fetch items/categories/videos; on success `setCacheItems/...`, swap active provider via `setPortfolioRepository`, return supabase.
  - On any error: log in dev (`import.meta.env.DEV`), keep local provider + local cache seeded, return `{ ok: false, source: 'local' }`.
- [ ] **Step 2:** Ensure the local fallback is always seeded (so LCD never shows 0 photos). Seed `contentCache` with the local catalog in the same function.
- [ ] **Step 3:** Call `hydrateContent()` in `src/main.tsx` (fire-and-forget, non-blocking) OR a `useContentBootstrap()` hook invoked in `HomePage` (preferred — keeps main.tsx clean and makes it testable).
- [ ] **Step 4:** Test `src/portfolio/bootstrap.test.ts`: mock supabase client to fail → fallback local; mock to succeed → source supabase + cache populated.
- [ ] **Step 5:** `npx tsc -b`, `npm run lint`, `npx vitest run`.
- [ ] **Step 6:** Commit.

---

### Task 5: Admin auth (identity + gate)

**Files:**
- Create: `src/admin/auth.ts`, `src/admin/ProtectedRoute.tsx`, `src/admin/LoginPage.tsx`

**Interfaces:**
- `auth.ts` produces:
```ts
export type AdminGate = { status: 'loading' } | { status: 'signedOut' } | { status: 'denied' } | { status: 'ready'; user: User }
export async function getAdminGate(session: Session | null): Promise<AdminGate>
export async function isAdminUser(userId: string): Promise<boolean>   // admin_users allowlist lookup
export async function signInAdmin(email: string, password: string): Promise<{ error?: string }>
export async function signOutAdmin(): Promise<void>
export async function sendPasswordReset(email: string): Promise<{ error?: string }>
```

- [ ] **Step 1:** Write `src/admin/auth.ts`:
  - `isAdminUser(userId)`: `select('*').from('admin_users').eq('user_id', userId).maybeSingle()` → boolean.
  - `getAdminGate(session)`: no session → signedOut; else `isAdminUser` → ready / denied.
  - `signInAdmin` uses `supabase.auth.signInWithPassword`; returns friendly error message on failure.
  - `signOutAdmin` → `supabase.auth.signOut()`.
  - `sendPasswordReset` → `supabase.auth.resetPasswordForEmail(email)`.
- [ ] **Step 2:** Write `ProtectedRoute.tsx`: subscribes to `supabase.auth.getSession()` + `onAuthStateChange`; while resolving renders a loading state; signedOut → `<Navigate to="/admin/login" />`; denied → access-denied page; ready → `<Outlet />`. Never flashes protected content before auth resolves.
- [ ] **Step 3:** Write `LoginPage.tsx`: minimal black/white form (email, password, submit, error line, "reset password" link). NO create-account. On success `navigate('/admin')`.
- [ ] **Step 4:** Tests `src/admin/auth.test.ts` (pure logic, fake client): unauthenticated → signedOut; authenticated non-admin → denied; authenticated admin → ready; sign-in failure surfaces error.
- [ ] **Step 5:** `npx tsc -b`, `npm run lint`, `npx vitest run`.
- [ ] **Step 6:** Commit.

---

### Task 6: Admin uploads (validation + resumable uploader + dropzone)

**Files:**
- Create: `src/admin/uploadValidation.ts`, `src/admin/ResumableUploader.ts`, `src/admin/UploadDropzone.tsx`

**Interfaces:**
- `uploadValidation.ts`:
```ts
export const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const
export const VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime'] as const
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024
export type UploadFileKind = 'image' | 'video'
export function detectKind(file: File): UploadFileKind | null
export function validateUpload(file: File): { ok: true } | { ok: false; error: string }
export function thumbFor(file: File): Promise<string | null>  // object URL preview
```
- `ResumableUploader.ts`:
```ts
export interface UploadProgress { state: 'uploading' | 'success' | 'error'; progress: number; error?: string }
export async function uploadToBucket(opts: {
  bucket: BucketName; path: string; file: File; kind: UploadFileKind;
  onProgress?: (pct: number) => void;
}): Promise<{ path: string }>
```
  Uses standard `upload()` for small files (<6MB) and resumable `uploadToSignedUrl()` (TUS) for larger/video, with `onProgress`. Signed upload requires the `create_signed_upload_url` RPC (documented in schema.sql / supabase-setup.md).
- [ ] **Step 1:** Write validation + detection (type allowlist, size caps). Reject anything else incl. RAW (`.arw/.cr2/.nef/.raw`) and return a clear message.
- [ ] **Step 2:** Write `ResumableUploader.ts`. Small: `storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false })`. Large: `createSignedUploadUrl` → `uploadToSignedUrl(path, uploadId, file, { onProgress, retryCount: 3 })`. Map tus `progress` (0..1) → pct.
- [ ] **Step 3:** Write `UploadDropzone.tsx`: drag-over state, `input[type=file]` browse, multiple files, per-file `validateUpload` → inline errors, progress bars, success/failure/retry buttons. Disabled while uploading. Styled minimal black/white.
- [ ] **Step 4:** Tests `src/admin/uploadValidation.test.ts`: correct/incorrect MIME, size boundaries, RAW rejection, kind detection.
- [ ] **Step 5:** `npx tsc -b`, `npm run lint`, `npx vitest run`.
- [ ] **Step 6:** Commit.

---

### Task 7: Admin routes + layout + shell wiring

**Files:**
- Create: `src/admin/AdminLayout.tsx`, `src/admin/AdminRoutes.tsx`, `src/admin/pages/OverviewPage.tsx`, `src/admin/pages/PhotosPage.tsx`, `src/admin/pages/VideosPage.tsx`, `src/admin/pages/CategoriesPage.tsx`, `src/admin/pages/SettingsPage.tsx`, `src/admin/PhotoEditDialog.tsx`, `src/admin/ReorderList.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- `AdminRoutes` lazy-exports the admin sub-route tree. App mounts:
```tsx
<Route path="/admin/login" element={<LoginPage />} />
<Route path="/admin" element={<ProtectedRoute />}>
  <Route element={<AdminLayout />}>
    <Route index element={<OverviewPage />} />
    <Route path="photos" element={<PhotosPage />} />
    <Route path="videos" element={<VideosPage />} />
    <Route path="categories" element={<CategoriesPage />} />
    <Route path="settings" element={<SettingsPage />} />
  </Route>
</Route>
```

- [ ] **Step 1:** Write `AdminLayout.tsx`: fixed left sidebar (OVERVIEW / PHOTOS / VIDEOS / CATEGORIES / SETTINGS) + top bar with sign-out button; `<Outlet />` content area; responsive (sidebar collapses to top bar under 720px). Uses `NavLink`; black/white tool styling (no cinematic spectacle).
- [ ] **Step 2:** Write `AdminRoutes.tsx` as the lazy-loaded entry (`export function AdminRoutes()` returning the nested `<Routes>`). In `App.tsx` add `const AdminApp = lazy(() => import('./admin/AdminRoutes').then(m => ({ default: m.AdminRoutes })))` and wrap the `/admin` subtree in `<Suspense fallback={<AdminLoading />}>`. Admin imports are thus code-split from the public bundle.
- [ ] **Step 3:** Write placeholder-but-functional pages: `OverviewPage` (counts via repo hooks), `PhotosPage` (table: thumb, title, category, year, published, featured, actions), `VideosPage`, `CategoriesPage`, `SettingsPage` (static "coming in a later phase" for now). `PhotoEditDialog` (edit metadata form), `ReorderList` (HTML5 drag reorder emitting ordered ids).
- [ ] **Step 4:** Wire `PhotosPage` to repo: list via `getPortfolioItems` + admin variant (include unpublished), upload via `UploadDropzone` + `uploadToBucket` + `createItem` (two-step: upload file → create record → edit metadata → publish), publish/unpublish toggle, delete (with confirm), reorder → `reorderItems`.
- [ ] **Step 5:** Verify `npx tsc -b`, `npm run lint`, `npx vitest run`, `npm run build` — confirm admin lands in a separate chunk (`dist/assets/Admin*`).
- [ ] **Step 6:** Commit.

---

### Task 8: Schema.sql + supabase-setup.md documentation

**Files:**
- Create: `supabase/schema.sql`, `docs/supabase-setup.md`

- [ ] **Step 1:** Write `supabase/schema.sql`:
  - Tables: `portfolio_categories` (id uuid pk default gen_random_uuid(), name, slug unique, description, sort_order int, published bool, created_at/updated_at timestamptz default now()).
  - `portfolio_items` (id, category_id fk → portfolio_categories on delete restrict, title, slug unique, description, image_path, thumbnail_path, year, sort_order, published, featured, created_at/updated_at).
  - `videos` (id, title, slug unique, description, video_path, thumbnail_path, year, sort_order, published, featured, created_at/updated_at).
  - `admin_users` (user_id uuid pk references auth.users on delete cascade, created_at).
  - `updated_at` trigger function.
  - Seed 4 categories (weddings/events/birthdays/portraits) with `INSERT ... ON CONFLICT (slug) DO NOTHING`.
  - Enable RLS on all 4 tables.
  - Policies: public `SELECT` only where `published = true`; admin `ALL` gated by `(select auth.uid() in (select user_id from admin_users))` — write a `is_admin()` helper function.
  - Storage buckets + policies: buckets `portfolio-images`, `portfolio-thumbnails`, `portfolio-videos` (public read for images/thumbnails via path; videos readable by anon), upload/update/delete only via admin check (storage policies use `(select is_admin())`).
  - The `create_signed_upload_url` RPC (from Supabase docs) for resumable uploads, gated by admin.
- [ ] **Step 2:** Write `docs/supabase-setup.md` covering: create project, get URL + publishable key, `.env.local`, run schema.sql, create first admin user:
```sql
insert into admin_users (user_id)
values ('<auth-user-uuid>');
```
  plus local dev + GH Pages deploy notes.
- [ ] **Step 3:** Commit.

---

### Task 9: Public pages verify + final verification

**Files:**
- Modify: none required unless verification exposes gaps (`src/pages/*`, `src/ui/PortfolioGrid.tsx` read via repository hooks already).

- [ ] **Step 1:** Confirm public pages (`PortfolioPage`, `CategoryPage`, `VideosPage`) use repository hooks only (they do) and that `PortfolioGrid`/`FrameTile` render `imageUrl` when present (it does). No changes expected.
- [ ] **Step 2:** Run full gate: `npx tsc -b` · `npm run lint` · `npx vitest run` · `npm run build`.
- [ ] **Step 3:** Local smoke test with `npm run preview` + curl: `/`, `/portfolio`, `/admin/login`, and confirm no admin JS in the public entry chunk.
- [ ] **Step 4:** Commit any remaining changes.

---

## Testing

- Vitest only (colocated `*.test.ts`). New tests: supabaseRepository (fake client), bootstrap fallback, auth gate, upload validation. Existing scrollState tests must remain green.
- Gate commands: `npx tsc -b`, `npm run lint`, `npx vitest run`, `npm run build`.

## Out of scope

Booking, payments, customer accounts, client galleries, comments/likes/social, analytics, AI tagging, image editing, video transcoding, multi-user teams, BrowserRouter migration.
