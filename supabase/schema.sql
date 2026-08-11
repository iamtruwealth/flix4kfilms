-- ============================================================================
-- FLIX4K portfolio schema
-- Tables map 1:1 to the row types in src/portfolio/supabaseRepository.ts.
--
-- Security model:
--   * Anonymous users can read *published* rows only.
--   * Authenticated users who appear in `admin_users` can read/write everything.
--   * Storage is public-read; writes require an authenticated admin session.
--   * The `admin_users` allowlist is the admin gate (see src/admin/auth.ts).
--
-- Run this file once in the Supabase SQL Editor (or `psql` / CLI).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- portfolio_categories
-- ----------------------------------------------------------------------------
create table if not exists public.portfolio_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text not null default '',
  sort_order  integer not null default 0,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- portfolio_items
-- ----------------------------------------------------------------------------
create table if not exists public.portfolio_items (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  slug           text not null unique,
  category_id    uuid references public.portfolio_categories (id) on delete cascade,
  description    text not null default '',
  image_path     text,
  thumbnail_path text,
  year           text not null default '',
  sort_order     integer not null default 0,
  published      boolean not null default false,
  featured       boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists portfolio_items_category_id_idx
  on public.portfolio_items (category_id);

create index if not exists portfolio_items_sort_order_idx
  on public.portfolio_items (sort_order);

-- ----------------------------------------------------------------------------
-- videos
-- ----------------------------------------------------------------------------
create table if not exists public.videos (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  slug           text not null unique,
  description    text not null default '',
  video_path     text,
  thumbnail_path text,
  youtube_url    text,
  category_id    uuid references public.portfolio_categories (id) on delete set null,
  year           text not null default '',
  sort_order     integer not null default 0,
  published      boolean not null default false,
  featured       boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists videos_sort_order_idx
  on public.videos (sort_order);

-- ----------------------------------------------------------------------------
-- admin_users — the admin allowlist gate (user id → role)
-- ----------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'admin',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Admin gate helper
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- RLS enablement
-- ----------------------------------------------------------------------------
alter table public.portfolio_categories enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.videos enable row level security;
alter table public.admin_users enable row level security;

-- ----------------------------------------------------------------------------
-- portfolio_categories policies
-- ----------------------------------------------------------------------------
drop policy if exists "categories_public_read" on public.portfolio_categories;
create policy "categories_public_read"
  on public.portfolio_categories for select
  using (published = true);

drop policy if exists "categories_admin_read_all" on public.portfolio_categories;
create policy "categories_admin_read_all"
  on public.portfolio_categories for select
  using (public.is_admin());

drop policy if exists "categories_admin_insert" on public.portfolio_categories;
create policy "categories_admin_insert"
  on public.portfolio_categories for insert
  with check (public.is_admin());

drop policy if exists "categories_admin_update" on public.portfolio_categories;
create policy "categories_admin_update"
  on public.portfolio_categories for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "categories_admin_delete" on public.portfolio_categories;
create policy "categories_admin_delete"
  on public.portfolio_categories for delete
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- portfolio_items policies
-- ----------------------------------------------------------------------------
drop policy if exists "items_public_read" on public.portfolio_items;
create policy "items_public_read"
  on public.portfolio_items for select
  using (published = true);

drop policy if exists "items_admin_read_all" on public.portfolio_items;
create policy "items_admin_read_all"
  on public.portfolio_items for select
  using (public.is_admin());

drop policy if exists "items_admin_insert" on public.portfolio_items;
create policy "items_admin_insert"
  on public.portfolio_items for insert
  with check (public.is_admin());

drop policy if exists "items_admin_update" on public.portfolio_items;
create policy "items_admin_update"
  on public.portfolio_items for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "items_admin_delete" on public.portfolio_items;
create policy "items_admin_delete"
  on public.portfolio_items for delete
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- videos policies
-- ----------------------------------------------------------------------------
drop policy if exists "videos_public_read" on public.videos;
create policy "videos_public_read"
  on public.videos for select
  using (published = true);

drop policy if exists "videos_admin_read_all" on public.videos;
create policy "videos_admin_read_all"
  on public.videos for select
  using (public.is_admin());

drop policy if exists "videos_admin_insert" on public.videos;
create policy "videos_admin_insert"
  on public.videos for insert
  with check (public.is_admin());

drop policy if exists "videos_admin_update" on public.videos;
create policy "videos_admin_update"
  on public.videos for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "videos_admin_delete" on public.videos;
create policy "videos_admin_delete"
  on public.videos for delete
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- admin_users policies — only the gate read is exposed to authenticated users;
-- membership changes happen via SQL editor / service role only.
-- ----------------------------------------------------------------------------
drop policy if exists "admin_users_self_read" on public.admin_users;
create policy "admin_users_self_read"
  on public.admin_users for select
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Storage buckets (public-read; admin-authenticated write)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('portfolio-images',      'portfolio-images',      true),
  ('portfolio-thumbnails',  'portfolio-thumbnails',  true),
  ('portfolio-videos',      'portfolio-videos',      true)
on conflict (id) do update set public = true;

-- NOTE: extension checks use split_part(name, '.', -1) to extract the suffix
-- WITHOUT the leading dot. The previous `right(name, 5)` form never matched a
-- real filename (5-char extensions came back as ".webp", 4-char as "x.jpg"),
-- so every upload was rejected by RLS. If you already applied the old file,
-- re-run the three storage policies below to fix the live database.
drop policy if exists "storage_admin_upload_images" on storage.objects;
create policy "storage_admin_upload_images"
  on storage.objects for insert
  with check (
    bucket_id = 'portfolio-images'
    and public.is_admin()
    and lower(split_part(name, '.', -1)) in ('jpg', 'jpeg', 'png', 'webp')
  );

drop policy if exists "storage_admin_upload_videos" on storage.objects;
create policy "storage_admin_upload_videos"
  on storage.objects for insert
  with check (
    bucket_id = 'portfolio-videos'
    and public.is_admin()
    and lower(split_part(name, '.', -1)) in ('mp4', 'webm', 'mov')
  );

drop policy if exists "storage_admin_upload_thumbs" on storage.objects;
create policy "storage_admin_upload_thumbs"
  on storage.objects for insert
  with check (
    bucket_id = 'portfolio-thumbnails'
    and public.is_admin()
    and lower(split_part(name, '.', -1)) in ('jpg', 'jpeg', 'png', 'webp')
  );

-- SELECT is required for admin management flows: the Storage API does a lookup
-- on storage.objects before delete/update, and without a select policy RLS
-- hides every row (deletes returned AccessDenied even with delete policies).
drop policy if exists "storage_admin_select_images" on storage.objects;
create policy "storage_admin_select_images"
  on storage.objects for select
  using ( bucket_id = 'portfolio-images' and public.is_admin() );

drop policy if exists "storage_admin_select_videos" on storage.objects;
create policy "storage_admin_select_videos"
  on storage.objects for select
  using ( bucket_id = 'portfolio-videos' and public.is_admin() );

drop policy if exists "storage_admin_select_thumbs" on storage.objects;
create policy "storage_admin_select_thumbs"
  on storage.objects for select
  using ( bucket_id = 'portfolio-thumbnails' and public.is_admin() );

drop policy if exists "storage_admin_delete_images" on storage.objects;
create policy "storage_admin_delete_images"
  on storage.objects for delete
  using ( bucket_id = 'portfolio-images' and public.is_admin() );

drop policy if exists "storage_admin_delete_videos" on storage.objects;
create policy "storage_admin_delete_videos"
  on storage.objects for delete
  using ( bucket_id = 'portfolio-videos' and public.is_admin() );

drop policy if exists "storage_admin_delete_thumbs" on storage.objects;
create policy "storage_admin_delete_thumbs"
  on storage.objects for delete
  using ( bucket_id = 'portfolio-thumbnails' and public.is_admin() );
