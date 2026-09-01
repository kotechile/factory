-- Factory runtime configuration — modifiable without a redeploy.
-- The visual-QA step (and other runtime tools) read secrets/config from here
-- at execution time, so changing a key or prompt does NOT require a code change,
-- commit, push, or redeploy.

create table if not exists public.factory_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.factory_config enable row level security;

-- Reads happen server-side with the service-role key (which bypasses RLS), so no
-- RLS policies are defined — the anon key must never be able to read these values.

-- Seed (set real values via the Supabase dashboard or the SQL editor):
--
--   insert into public.factory_config (key, value) values
--     ('gemini_api_key',    '<your-gemini-api-key>'),
--     ('visual_qa_model',   'gemini-2.5-pro'),
--     ('visual_qa_prompt',  '');  -- optional custom prompt; empty = default
--
-- Keys used by scripts/visual-qa.mjs:
--   gemini_api_key     — Gemini (Google AI Studio) API key for vision review
--   visual_qa_model    — Gemini model name (default gemini-2.5-pro)
--   visual_qa_prompt   — optional override for the default UI-review prompt

-- Growth / kill-scale telemetry — written by src/lib/telemetry.ts (server-side).
create table if not exists public.events (
  id bigint generated always as identity primary key,
  event text not null,
  product text not null default 'quarterline',
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

-- Inserts happen server-side via the service-role key (bypasses RLS).
-- No anon read/write — the growth-watchdog reads via the service role too.
create index if not exists events_event_created_idx on public.events (event, created_at desc);
