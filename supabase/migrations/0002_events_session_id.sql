-- Migration: add unique-session/visitor tracking to public.events (factory-core)
-- Enables the Day 7/14/30 growth gates to be evaluated on DISTINCT sessions/visitors
-- instead of raw page_view event counts (the measurement gap in context/pending_approval.md).
-- Idempotent — safe to re-run. Apply in the factory-core Supabase SQL editor (or supabase CLI).
--
-- Background: scripts/growth-check.mjs used to count raw `page_view` rows, which cannot answer
-- the ">= 50 unique sessions" gate. src/lib/telemetry.ts now records a per-visitor session_id
-- (a cookie `ql_session_id` generated client-side by src/lib/telemetry-client.ts) attached to
-- every event's `payload` jsonb. This migration promotes that identifier to a real, indexed
-- column so the watchdog can run `SELECT count(distinct session_id) ...` cheaply.
--
-- Safe to apply at any time: ADD COLUMN IF NOT EXISTS; the backfill only touches rows whose
-- payload already carries a session_id; existing rows are otherwise untouched. Insert paths
-- keep working before AND after this migration (telemetry.ts degrades to payload-only if the
-- column is absent), so there is no deploy-order hazard.

alter table public.events add column if not exists session_id text;

create index if not exists events_session_id_idx
  on public.events (session_id, created_at desc);

-- Backfill the dedicated column from any session_id already embedded in payload jsonb
-- (idempotent: only fills nulls, and keeps the column in sync for rows written via payload).
update public.events
set session_id = payload ->> 'session_id'
where session_id is null
  and payload ? 'session_id';
