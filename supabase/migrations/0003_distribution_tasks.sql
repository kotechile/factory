-- ==============================================================================
-- PressFlow: Weekly Multi-Platform Distribution & To-Do Queue
-- ==============================================================================

create table if not exists public.distribution_tasks (
  id text primary key,
  source_type text not null default 'article', -- 'software', 'article', 'manual'
  source_id text,
  source_title text not null,
  platform text not null default 'reddit', -- 'reddit', 'linkedin', 'x', 'producthunt'
  channel text not null, -- e.g. 'r/tax', 'r/SaaS', 'Feed'
  post_title text not null,
  post_content text not null,
  submit_url text,
  status text not null default 'ready_to_publish', -- 'ready_to_publish', 'done', 'deleted'
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.distribution_tasks enable row level security;

create index if not exists distribution_tasks_status_idx on public.distribution_tasks (status, created_at desc);
create index if not exists distribution_tasks_source_idx on public.distribution_tasks (source_type, source_id);

-- Default RLS policy
create policy "Allow anon all operations on distribution_tasks" on public.distribution_tasks
  for all using (true) with check (true);
