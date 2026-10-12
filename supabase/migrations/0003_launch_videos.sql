-- Migration: launch-video ledger for the post-ship brag pipeline (factory-core).
-- One row per product slug. Written ONLY by scripts/launch-video/*.mjs with the service role key.
-- Read by scripts/launch-video/detect.mjs, which the "Post-Ship Brag" cron job runs every 30 min.
--
-- Idempotent — safe to re-run. Apply in the factory-core Supabase SQL editor (same procedure as
-- 0002_events_session_id.sql), then verify with: node scripts/launch-video/detect.mjs --probe

create table if not exists public.launch_videos (
  slug               text primary key,
  status             text not null default 'pending'
                     check (status in ('pending','rendering','rendered','voiced','uploaded','failed','grandfathered')),
  youtube_video_id   text,
  youtube_url        text,
  narration_words    integer,
  voiceover_seconds  numeric(6,2),
  video_seconds      numeric(6,2),
  attempts           integer not null default 0,
  last_error         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Service role bypasses RLS. Deliberately NO anon/authenticated policy: this table is internal.
alter table public.launch_videos enable row level security;

-- Products that shipped BEFORE this pipeline existed stay grandfathered (owner standard:
-- new standards apply to future work; published output is never bulk retro-processed).
-- spendproof (2026-10-09) is deliberately NOT seeded — it is the single acceptance run.
insert into public.launch_videos (slug, status) values
  ('ledgerlink','grandfathered'),
  ('facturgate','grandfathered'),
  ('parcelproof','grandfathered'),
  ('caseproof','grandfathered')
on conflict (slug) do nothing;
