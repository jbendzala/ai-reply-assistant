-- Stores processed RevenueCat webhook transaction IDs to prevent double-processing.
-- Pro status itself lives in auth.users.app_metadata (written via service role).
create table if not exists public.revenuecat_webhooks (
  transaction_id  text        primary key,
  user_id         uuid        references auth.users(id) on delete set null,
  event_type      text        not null,
  processed_at    timestamptz not null default now()
);

alter table public.revenuecat_webhooks enable row level security;

-- Only service role can access this table
create policy "deny_public_revenuecat_webhooks"
  on public.revenuecat_webhooks
  for all
  to authenticated
  using (false);
