-- Trigger: send a welcome email whenever a new user is created.
-- Works for all sign-up methods (email/password, Google OAuth, etc.).
--
-- Requires:
--   • pg_net extension (enabled by default on all Supabase projects)
--   • RESEND_API_KEY set as a Supabase secret
--   • send-welcome-email Edge Function deployed with --no-verify-jwt

create extension if not exists pg_net;

create or replace function public.handle_new_user_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Fire-and-forget — errors are caught so they never block sign-up
  perform net.http_post(
    url     := 'https://jcujviegtkwqbybyrrqt.supabase.co/functions/v1/send-welcome-email',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := jsonb_build_object('email', new.email)::text
  );
  return new;
exception when others then
  raise warning '[handle_new_user_welcome_email] pg_net error: %', sqlerrm;
  return new;
end;
$$;

-- Safe to re-run
drop trigger if exists on_auth_user_created_welcome_email on auth.users;

create trigger on_auth_user_created_welcome_email
  after insert on auth.users
  for each row
  execute function public.handle_new_user_welcome_email();
