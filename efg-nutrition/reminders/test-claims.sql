set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
insert into public.efg_meal_reminder_preferences(meal,remind_at,time_zone,enabled)
 values ('cena','21:00','America/Argentina/Buenos_Aires',true);
insert into public.efg_meal_reminder_devices(endpoint,p256dh,auth_key)
 values ('https://fcm.googleapis.com/test',repeat('a',87),repeat('b',22));

set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
do $$ begin
 if exists (select 1 from public.efg_meal_reminder_preferences) or
    exists (select 1 from public.efg_meal_reminder_devices) then
  raise exception 'cross-account visibility';
 end if;
 begin
  insert into public.efg_meal_reminder_preferences(user_id,meal,remind_at,time_zone)
   values ('00000000-0000-4000-8000-000000000001','almuerzo','12:00','UTC');
  raise exception 'cross-account insert succeeded';
 exception when insufficient_privilege then null;
 end;
end $$;

reset role;
insert into public.efg_daily_logs values
 ('00000000-0000-4000-8000-000000000001','2026-11-18','{"cena":[{}]}','{}'),
 ('00000000-0000-4000-8000-000000000001','2026-11-19','{}','{"cena":true}');
set role service_role;
do $$
declare
 uid uuid := '00000000-0000-4000-8000-000000000001';
 endpoint text := 'https://fcm.googleapis.com/test';
begin
 if public.efg_claim_meal_reminder(uid,endpoint,'2026-11-18','cena') or
    public.efg_claim_meal_reminder(uid,endpoint,'2026-11-19','cena') then
  raise exception 'claim succeeded for consumed or skipped meal';
 end if;
 if not public.efg_claim_meal_reminder(uid,endpoint,'2026-11-20','cena') then
  raise exception 'first claim failed';
 end if;
 if public.efg_claim_meal_reminder(uid,endpoint,'2026-11-20','cena') then
  raise exception 'duplicate claim succeeded';
 end if;
end $$;
