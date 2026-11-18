create function public.efg_meal_reminder_config()
returns jsonb language sql security definer set search_path = ''
as $$
 select jsonb_object_agg(name, decrypted_secret) from vault.decrypted_secrets
 where name in ('ncc_reminder_job_secret','ncc_reminder_vapid_public','ncc_reminder_vapid_private')
$$;
revoke all on function public.efg_meal_reminder_config() from public, anon, authenticated;
grant execute on function public.efg_meal_reminder_config() to service_role;
