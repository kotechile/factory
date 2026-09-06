-- Migration: add editorial columns to public.articles (factory-core)
-- Aligns the live table with supabase/schema.sql. Idempotent — safe to re-run.
-- Apply in the factory-core Supabase SQL editor (or via the supabase CLI).
--
-- Background: the live `public.articles` table shipped with only
-- (id, title, content, source_url, tags, metadata, created_at, updated_at).
-- The editorial publisher writes slug/vertical/sources/status/live_urls into the
-- `metadata` jsonb (schema-agnostic). This migration promotes those to real columns
-- and backfills them from the metadata already written, so the software-factory's
-- normalizeArticleRow() can read them directly.
--
-- Safe to apply at any time: columns are ADD COLUMN IF NOT EXISTS; the backfill
-- only touches rows whose metadata carries a 'slug'; existing rows are untouched.

alter table public.articles add column if not exists slug text;
alter table public.articles add column if not exists vertical text;
alter table public.articles add column if not exists headline text;
alter table public.articles add column if not exists body_md text;
alter table public.articles add column if not exists sources jsonb default '[]'::jsonb;
alter table public.articles add column if not exists status text default 'draft';
alter table public.articles add column if not exists live_urls jsonb default '{}'::jsonb;

-- Backfill the new columns from the metadata the editorial publisher already wrote.
update public.articles
set slug     = metadata ->> 'slug',
    vertical = metadata ->> 'vertical',
    headline = metadata ->> 'headline',
    body_md  = coalesce(content, ''),
    sources  = coalesce(metadata -> 'sources', '[]'::jsonb),
    status   = coalesce(metadata ->> 'status', 'draft'),
    live_urls = coalesce(metadata -> 'live_urls', '{}'::jsonb)
where metadata is not null
  and metadata ? 'slug'
  and (slug is null or slug = '');

-- Idempotency key: one row per non-null slug (the publisher's upsert key).
create unique index if not exists articles_slug_unique
  on public.articles (slug) where slug is not null and slug <> '';

-- Accelerate the publisher's metadata->>'slug' lookup while it still writes metadata.
create index if not exists articles_metadata_slug_idx
  on public.articles ((metadata ->> 'slug'));
