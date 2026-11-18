-- Run after the guarded client and the two candidate migrations plus guard are live.
select cron.schedule(
 'ncc-habitual-automation',
 '* * * * *',
 $job$select public.efg_run_habitual_automation();$job$
);
