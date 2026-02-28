-- RPC function to atomically upsert the scan count for a user+month.
-- Called by the generate-replies Edge Function (service role, SECURITY DEFINER).
create or replace function public.increment_usage(p_user_id uuid, p_month text)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.usage (user_id, month, count)
  values (p_user_id, p_month, 1)
  on conflict (user_id, month)
  do update set count = public.usage.count + 1;
end;
$$;
