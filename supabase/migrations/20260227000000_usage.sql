-- Usage metering table for tracking scans per user per month
create table if not exists public.usage (
  user_id  uuid references auth.users(id) on delete cascade,
  month    text not null,  -- e.g. "2026-02"
  count    integer not null default 0,
  primary key (user_id, month)
);

alter table public.usage enable row level security;

-- Users can read their own usage (e.g. for a future "You've used X/50 scans" UI)
create policy "Users can read their own usage"
  on public.usage for select
  using (auth.uid() = user_id);

-- Service role bypasses RLS — used by the Edge Function
create policy "Service role can upsert usage"
  on public.usage for all
  using (true);
