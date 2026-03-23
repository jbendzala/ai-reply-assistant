-- Fix: add Authorization + apikey headers to the pg_net call.
-- Without them, Supabase's API gateway rejects the request before it
-- reaches the Edge Function, even when deployed with --no-verify-jwt.

create or replace function public.handle_new_user_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url     := 'https://jcujviegtkwqbybyrrqt.supabase.co/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'apikey',        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjdWp2aWVndGt3cWJ5YnlycnF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTc1MzIsImV4cCI6MjA4NzUzMzUzMn0.wyMbnnmNuS0ZjudKAtd3lHAqiWAX_w0JaPULjonfMg0',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjdWp2aWVndGt3cWJ5YnlycnF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTc1MzIsImV4cCI6MjA4NzUzMzUzMn0.wyMbnnmNuS0ZjudKAtd3lHAqiWAX_w0JaPULjonfMg0'
    ),
    body    := jsonb_build_object('email', new.email)::text
  );
  return new;
exception when others then
  raise warning '[handle_new_user_welcome_email] pg_net error: %', sqlerrm;
  return new;
end;
$$;
