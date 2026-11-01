-- NUT-57: fake historical rows before migration, no real user information.
-- Requires nut57-preupgrade-fixture.sql + nut56-prodshape-local-overlay.sql.
create table efg_private.nut57_isolated_staging_marker(
  test_only boolean not null default true check(test_only=true)
);
insert into efg_private.nut57_isolated_staging_marker default values;
insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333'),
 ('44444444-4444-4444-8444-444444444444'),
 ('55555555-5555-4555-8555-555555555555');
insert into public.efg_organizations(id,coach_id,name) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','11111111-1111-4111-8111-111111111111','Historical fictitious A'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','33333333-3333-4333-8333-333333333333','Historical fictitious B');
insert into public.efg_profiles(user_id,role,organization_id,email,nickname) values
 ('11111111-1111-4111-8111-111111111111','coach',null,'coach-a@example.invalid','Coach A'),
 ('33333333-3333-4333-8333-333333333333','coach',null,'coach-b@example.invalid','Coach B'),
 ('22222222-2222-4222-8222-222222222222','student','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','student-a@example.invalid','Alumno A'),
 ('44444444-4444-4444-8444-444444444444','student','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','student-b@example.invalid','Alumno B');
insert into public.efg_consents(student_id,organization_id,accepted) values
 ('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',true),
 ('44444444-4444-4444-8444-444444444444','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',true);
insert into public.efg_goals(
 id,student_id,approved_by,goal_type,kcal,protein_g,carb_g,fat_g,fiber_g
) values (
 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
 '22222222-2222-4222-8222-222222222222',
 '11111111-1111-4111-8111-111111111111',
 'maintenance',2100,125,240,70,29
);
insert into public.efg_food_plans(student_id,coach_id,approved_food_ids) values
 ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',array['rice','egg']);
insert into public.efg_daily_logs(student_id,log_day,meals) values
 ('22222222-2222-4222-8222-222222222222','2026-10-28','{"desayuno":[{"id":"egg","qty":2}]}'::jsonb);
insert into public.efg_weights(student_id,measured_on,kg) values
 ('22222222-2222-4222-8222-222222222222','2026-10-28',81.2);
insert into public.efg_activities(student_id,activity_day,steps) values
 ('22222222-2222-4222-8222-222222222222','2026-10-28',8000);
insert into public.efg_habitual_meals(student_id,meal_slot,name,items) values
 ('22222222-2222-4222-8222-222222222222','desayuno','Desayuno ficticio','[{"id":"egg","qty":2}]'::jsonb);
insert into public.efg_personal_recipes(student_id,name,ingredients,portions,totals) values
 ('22222222-2222-4222-8222-222222222222','Receta ficticia','[{"id":"rice","qty":70}]'::jsonb,1,'{}'::jsonb);
-- COACH70: preserve four additional kinds of fictional legacy records too.
insert into public.efg_invitations(email,nickname,role,organization_id,invited_by) values
 ('future-a@example.invalid','Invitation Ficticia','student',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '11111111-1111-4111-8111-111111111111');
insert into public.efg_messages(student_id,coach_id,sender_id,body) values
 ('22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'Mensaje ficticio previo a la actualización');
insert into public.efg_payments(
 payer_id,recipient_id,organization_id,payment_kind,
 amount_ars,period_label,alias_snapshot,receipt_path
) values
 ('22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'student_coach',12000,'2026-10','coach.demo',
  '22222222-2222-4222-8222-222222222222/cccccccc-cccc-4ccc-8ccc-ccccccccccc1.png');
insert into public.efg_weekly_reports(student_id,coach_id,week_ending,report_text) values
 ('22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  '2026-10-23','Informe semanal ficticio previo al relanzamiento');
do $fixture_validate$
begin
 if (select count(*) from public.efg_profiles where role='student')<>2
    or (select count(*) from public.efg_daily_logs)<>1
    or (select count(*) from public.efg_goals)<>1
    or (select count(*) from public.efg_food_plans)<>1
    or (select count(*) from public.efg_notifications)<>1
    or (select count(*) from public.efg_invitations)<>1
    or (select count(*) from public.efg_messages)<>1
    or (select count(*) from public.efg_payments)<>1
    or (select count(*) from public.efg_weekly_reports)<>1
    or pg_catalog.to_regclass('public.efg_student_plan_access') is not null then
  raise exception 'Preupgrade historical fixture is not valid';
 end if;
end
$fixture_validate$;
