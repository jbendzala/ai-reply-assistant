-- Update increment_usage to also stamp last_scan_at on every call.
-- This is read by the Edge Function for the burst-rate-limit check.
--
-- Signature unchanged (p_email is an existing optional param added previously).

create or replace function public.increment_usage(
  p_user_id uuid,
  p_month   text,
  p_email   text default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.usage (user_id, month, count, last_scan_at)
  values (p_user_id, p_month, 1, now())
  on conflict (user_id, month)
  do update set
    count        = public.usage.count + 1,
    last_scan_at = now();

  if p_email is not null then
    insert into public.usage_by_email (email, month, count)
    values (p_email, p_month, 1)
    on conflict (email, month)
    do update set count = public.usage_by_email.count + 1;
  end if;
end;
$$;
