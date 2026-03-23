-- Security hardening additions.
--
-- 1. Burst-rate-limit column on usage
--    Tracks when the user last scanned so the Edge Function can reject
--    requests fired faster than BURST_INTERVAL_SECONDS (3 s).
--
-- 2. Welcome-email dedup table
--    Prevents the send-welcome-email function from sending more than one
--    email per address per 24 hours, even if the endpoint is called repeatedly
--    (e.g. by the DB trigger AND the app in quick succession).

-- ── 1. Burst tracking ────────────────────────────────────────────────────────
alter table public.usage add column if not exists last_scan_at timestamptz;

-- ── 2. Welcome-email dedup ───────────────────────────────────────────────────
create table if not exists public.welcome_emails_sent (
  email   text        primary key,
  sent_at timestamptz not null default now()
);

alter table public.welcome_emails_sent enable row level security;

-- No authenticated user should be able to read or write this table directly.
-- The Edge Function uses the service role, which bypasses RLS.
create policy "deny_public"
  on public.welcome_emails_sent
  for all
  to authenticated
  using (false);
