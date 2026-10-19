-- Internal-traffic marker (queue item `traffic-marker`, approved by the owner 2026-10-19).
--
-- WHY: our own browser suites, post-deploy probes and smoke scripts write into the same `events`
-- table as real visitors, so every traffic figure was ambiguous — a gate run inflated the count and
-- "did a real person visit" could not be answered from the store (see
-- skills/marketing_engineering_playbook.md, the 2026-09-17 and 2026-09-18 edge cases).
--
-- WHAT: one classifier decides the class at the write boundary (src/lib/traffic-class.ts) and every
-- producer carries it (browser telemetry, the metered /api/agent/calculate route, the Playwright
-- suite through an extra HTTP header). Rows written BEFORE this marker keep NULL: we cannot
-- attribute them and backfilling would fabricate the answer the marker exists to give.
--
-- Apply in the Supabase SQL editor (no DB password in the repo, same as 0002). Until it is applied
-- the class still lands in `payload.traffic_class` (src/lib/telemetry.ts mirrors it and logs the
-- pending migration loudly), so no traffic data is lost by deploying this code first.

alter table public.events
  add column if not exists traffic_class text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_traffic_class_check'
  ) then
    alter table public.events
      add constraint events_traffic_class_check
      check (traffic_class is null or traffic_class in ('internal', 'visitor'));
  end if;
end $$;

comment on column public.events.traffic_class is
  'internal = our own suites/probes/owner browser; visitor = a real outside request; NULL = written before the marker (unattributable, never backfilled).';

create index if not exists events_traffic_class_created_at_idx
  on public.events (traffic_class, created_at);
