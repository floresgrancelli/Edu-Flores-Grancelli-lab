-- Apply explicitly after a successful one-off delivery in the test environment.
-- The URL is the full Edge Function URL. The secret matches NCC_REMINDER_CRON_SECRET.
do $$
begin
 if not exists (select 1 from vault.decrypted_secrets where name = 'ncc_reminder_job_url')
    or not exists (select 1 from vault.decrypted_secrets where name = 'ncc_reminder_job_secret') then
  raise exception 'Meal reminder scheduler requires its URL and secret in Vault';
 end if;
end $$;

select cron.schedule(
 'ncc-meal-reminders',
 '* * * * *',
 $job$
 select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'ncc_reminder_job_url'),
  headers := jsonb_build_object(
   'Content-Type', 'application/json',
   'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'ncc_reminder_job_secret')
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 15000
 );
 $job$
);
