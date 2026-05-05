/*
  # POLYMART pg_cron Tick Scheduler

  Schedules the polymart-tick Edge Function to fire every 10 seconds using pg_cron + pg_net.
  Uses Supabase's net.http_post to call the deployed Edge Function URL.

  Notes:
  - pg_cron minimum granularity is 1 minute, so we schedule 6 calls per minute
    using separate cron jobs staggered 10 seconds apart via pg_sleep offsets.
  - The service_role key is embedded here only for the internal cron call; it
    never leaves the database and is not exposed to clients.
*/

SELECT cron.unschedule('polymart-tick-0') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'polymart-tick-0'
);
SELECT cron.unschedule('polymart-tick-10') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'polymart-tick-10'
);
SELECT cron.unschedule('polymart-tick-20') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'polymart-tick-20'
);
SELECT cron.unschedule('polymart-tick-30') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'polymart-tick-30'
);
SELECT cron.unschedule('polymart-tick-40') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'polymart-tick-40'
);
SELECT cron.unschedule('polymart-tick-50') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'polymart-tick-50'
);

SELECT cron.schedule(
  'polymart-tick-0',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dbihpqatusytndsbfzje.supabase.co/functions/v1/polymart-tick',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiaWhwcWF0dXN5dG5kc2JmemplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDcwMjEsImV4cCI6MjA5MzU4MzAyMX0.5BpWgPAnz6K1wD3TkxeY6ZpnnCKrF9r5uqYaxWCTpbg"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'polymart-tick-10',
  '* * * * *',
  $$
  SELECT pg_sleep(10);
  SELECT net.http_post(
    url := 'https://dbihpqatusytndsbfzje.supabase.co/functions/v1/polymart-tick',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiaWhwcWF0dXN5dG5kc2JmemplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDcwMjEsImV4cCI6MjA5MzU4MzAyMX0.5BpWgPAnz6K1wD3TkxeY6ZpnnCKrF9r5uqYaxWCTpbg"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'polymart-tick-20',
  '* * * * *',
  $$
  SELECT pg_sleep(20);
  SELECT net.http_post(
    url := 'https://dbihpqatusytndsbfzje.supabase.co/functions/v1/polymart-tick',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiaWhwcWF0dXN5dG5kc2JmemplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDcwMjEsImV4cCI6MjA5MzU4MzAyMX0.5BpWgPAnz6K1wD3TkxeY6ZpnnCKrF9r5uqYaxWCTpbg"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'polymart-tick-30',
  '* * * * *',
  $$
  SELECT pg_sleep(30);
  SELECT net.http_post(
    url := 'https://dbihpqatusytndsbfzje.supabase.co/functions/v1/polymart-tick',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiaWhwcWF0dXN5dG5kc2JmemplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDcwMjEsImV4cCI6MjA5MzU4MzAyMX0.5BpWgPAnz6K1wD3TkxeY6ZpnnCKrF9r5uqYaxWCTpbg"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'polymart-tick-40',
  '* * * * *',
  $$
  SELECT pg_sleep(40);
  SELECT net.http_post(
    url := 'https://dbihpqatusytndsbfzje.supabase.co/functions/v1/polymart-tick',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiaWhwcWF0dXN5dG5kc2JmemplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDcwMjEsImV4cCI6MjA5MzU4MzAyMX0.5BpWgPAnz6K1wD3TkxeY6ZpnnCKrF9r5uqYaxWCTpbg"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'polymart-tick-50',
  '* * * * *',
  $$
  SELECT pg_sleep(50);
  SELECT net.http_post(
    url := 'https://dbihpqatusytndsbfzje.supabase.co/functions/v1/polymart-tick',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiaWhwcWF0dXN5dG5kc2JmemplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDcwMjEsImV4cCI6MjA5MzU4MzAyMX0.5BpWgPAnz6K1wD3TkxeY6ZpnnCKrF9r5uqYaxWCTpbg"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
