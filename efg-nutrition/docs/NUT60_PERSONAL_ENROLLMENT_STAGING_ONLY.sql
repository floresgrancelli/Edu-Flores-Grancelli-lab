-- NUT-60 / EXPERIMENTAL ISOLATED STAGING ONLY. NO HOSTED APPLY.
-- Authenticated OTP/GoTrue caller may create ONLY their own 'personal' profile,
-- after current terms/privacy acceptances. No organization is invented.
-- Do not bundle with the production NUT-57 transaction or legal onboarding yet.
begin;

do $preflight$
begin
 if pg_catalog.to_regclass('efg_private.nut57_isolated_staging_marker') is null
    or (select count(*) from efg_private.nut57_isolated_staging_marker)<>1 then
  raise exception 'NUT60 STOP: not a dedicated, disposable isolated staging database'
    using errcode='55000';
 end if;
 if pg_catalog.to_regclass('public.efg_profiles') is null
    or pg_catalog.to_regclass('public.efg_legal_acceptances') is null
    or pg_catalog.to_regclass('public.efg_legal_documents') is null then
  raise exception 'NUT60 STOP: prerequisite profile/LEGAL-07 tables absent';
 end if;
 if not exists(select 1 from pg_catalog.pg_constraint
   where conrelid='public.efg_profiles'::regclass
     and conname='efg_profiles_role_check' and contype='c')
    or not exists(select 1 from pg_catalog.pg_constraint
   where conrelid='public.efg_profiles'::regclass
     and conname='profile_org_role' and contype='c') then
  raise exception 'NUT60 STOP: preexisting role/organization constraints differ from tested fixture';
 end if;
 if pg_catalog.to_regclass('public.efg_personal_accounts') is not null
   or pg_catalog.to_regclass('public.efg_personal_goals') is not null
   or pg_catalog.to_regclass('public.efg_personal_daily_logs') is not null
   or pg_catalog.to_regclass('public.efg_personal_habitual_meals') is not null
   or pg_catalog.to_regprocedure('public.efg_register_personal(text)') is not null then
  raise exception 'NUT60 STOP: personal migration already exists; never overwrite';
 end if;
end
$preflight$;

alter table public.efg_profiles drop constraint efg_profiles_role_check;
alter table public.efg_profiles add constraint efg_profiles_role_check
 check(role=any(array['admin'::text,'coach'::text,'student'::text,'personal'::text]));
-- Existing profile_org_role remains in force: personal must NOT have an org.

create table public.efg_personal_accounts(
 user_id uuid primary key references public.efg_profiles(user_id) on delete restrict,
 created_at timestamptz not null default now(),
 constraint personal_account_owner_profile check(user_id is not null)
);
alter table public.efg_personal_accounts enable row level security;
revoke all on public.efg_personal_accounts from public,anon,authenticated;
grant select on public.efg_personal_accounts to authenticated;
create policy personal_account_read_self on public.efg_personal_accounts
 for select to authenticated using(user_id=(select auth.uid()));

create table public.efg_personal_goals(
 user_id uuid not null references public.efg_personal_accounts(user_id) on delete restrict,
 revision integer not null check(revision>=1),
 goal_type text not null check(goal_type in ('fat_loss','recomp','muscle_gain','maintenance')),
 kcal integer not null check(kcal between 1200 and 10000),
 protein_g integer not null check(protein_g between 0 and 1000),
 carb_g integer not null check(carb_g between 0 and 2000),
 fat_g integer not null check(fat_g between 0 and 1000),
 fiber_g integer not null check(fiber_g between 0 and 150),
 created_at timestamptz not null default now(),
 primary key(user_id,revision)
);
alter table public.efg_personal_goals enable row level security;
revoke all on public.efg_personal_goals from public,anon,authenticated;
grant select on public.efg_personal_goals to authenticated;
create policy personal_goal_read_self on public.efg_personal_goals
 for select to authenticated using(user_id=(select auth.uid()));

-- Personal diary and reusable meal presets have NO coach organization ID.
-- They are kept distinct from the legacy efg_daily_logs / efg_habitual_meals.
create table public.efg_personal_daily_logs(
 user_id uuid not null references public.efg_personal_accounts(user_id) on delete restrict,
 log_day date not null,
 meals jsonb not null default '{}'::jsonb,
 sports jsonb not null default '[]'::jsonb,
 skipped jsonb not null default '{}'::jsonb,
 totals jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 primary key(user_id,log_day),
 constraint personal_meals_object check(jsonb_typeof(meals)='object' and octet_length(meals::text)<60000),
 constraint personal_sports_array check(jsonb_typeof(sports)='array'),
 constraint personal_skipped_object check(jsonb_typeof(skipped)='object'),
 constraint personal_totals_object check(jsonb_typeof(totals)='object')
);
alter table public.efg_personal_daily_logs enable row level security;
revoke all on public.efg_personal_daily_logs from public,anon,authenticated;
grant select,insert,update,delete on public.efg_personal_daily_logs to authenticated;
create policy personal_diary_owner on public.efg_personal_daily_logs
 for all to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()));

create table public.efg_personal_habitual_meals(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.efg_personal_accounts(user_id) on delete restrict,
 meal_slot text not null check(meal_slot in
  ('desayuno','media_manana','almuerzo','media_tarde','merienda','cena')),
 name text not null check(length(name) between 2 and 60),
 items jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint personal_habitual_items_array check(jsonb_typeof(items)='array'
   and jsonb_array_length(items)<=80 and octet_length(items::text)<30000)
);
create index efg_personal_habitual_owner_slot_idx
 on public.efg_personal_habitual_meals(user_id,meal_slot);
alter table public.efg_personal_habitual_meals enable row level security;
revoke all on public.efg_personal_habitual_meals from public,anon,authenticated;
grant select,insert,update,delete on public.efg_personal_habitual_meals to authenticated;
create policy personal_habitual_owner on public.efg_personal_habitual_meals
 for all to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()));

create function public.efg_register_personal(p_nickname text)
returns uuid language plpgsql security definer set search_path=''
as $register$
declare
 v_uid uuid:=auth.uid();
 v_email text;
 v_has_legal boolean:=false;
 v_invited boolean:=false;
begin
 if v_uid is null then
  raise exception 'Log in first' using errcode='42501';
 end if;
 if p_nickname is null or length(trim(p_nickname)) not between 2 and 70 then
  raise exception 'Invalid personal nickname' using errcode='22023';
 end if;
 select lower(u.email) into v_email from auth.users u
 where u.id=v_uid and u.email_confirmed_at is not null;
 if v_email is null then
  raise exception 'Verified email required' using errcode='42501';
 end if;
 if exists(select 1 from public.efg_profiles where user_id=v_uid) then
  raise exception 'Existing coach/student/admin/personal profile cannot change roles'
   using errcode='42501';
 end if;
 -- A previously invited user must follow the original invitation/coach flow.
 -- This condition also protects a previously invited coach address.
 if pg_catalog.to_regclass('public.efg_invitations') is not null then
  execute 'select exists(select 1 from public.efg_invitations
    where lower(email)=$1 and claimed_by is null and revoked_at is null)'
    into v_invited using v_email;
  if v_invited then
   raise exception 'Pending invitation must be resolved before personal signup'
    using errcode='42501';
  end if;
 end if;
 select count(*)=2 and coalesce(bool_and(s.accepted),false)
 into v_has_legal from public.efg_legal_current_status() s;
 if not v_has_legal then
  raise exception 'Current terms and privacy must be accepted separately'
   using errcode='42501';
 end if;
 insert into public.efg_profiles(user_id,email,nickname,role,organization_id)
 values(v_uid,v_email,trim(p_nickname),'personal',null);
 insert into public.efg_personal_accounts(user_id) values(v_uid);
 return v_uid;
end
$register$;
revoke all on function public.efg_register_personal(text) from public,anon,authenticated;
grant execute on function public.efg_register_personal(text) to authenticated;

-- Owner-controlled separate revisions, no approved_by/coach/organization shortcut.
create function public.efg_save_personal_goal(p_goal jsonb,p_expected_revision integer)
returns integer language plpgsql security definer set search_path=''
as $goal$
declare
 v_uid uuid:=auth.uid();
 v_last integer;
 v_legal boolean:=false;
 v_allowed jsonb:='["goal_type","kcal","protein_g","carb_g","fat_g","fiber_g"]'::jsonb;
 v_key text;
 v_revision integer;
begin
 if v_uid is null then raise exception 'Sign in' using errcode='42501'; end if;
 perform 1 from public.efg_personal_accounts a
 join public.efg_profiles p on p.user_id=a.user_id
 where a.user_id=v_uid and p.role='personal' and p.active and p.organization_id is null
 for update of a;
 if not found then raise exception 'Personal role required' using errcode='42501'; end if;
 select count(*)=2 and coalesce(bool_and(s.accepted),false) into v_legal
 from public.efg_legal_current_status() s;
 if not v_legal then raise exception 'Current legal documents not accepted' using errcode='42501'; end if;
 if p_goal is null or jsonb_typeof(p_goal)<>'object'
   or (select count(*) from jsonb_object_keys(p_goal))<>6 then
  raise exception 'Exactly six objective fields required' using errcode='22023';
 end if;
 for v_key in select jsonb_array_elements_text(v_allowed) loop
  if not p_goal ? v_key then raise exception 'Missing objective field %',v_key using errcode='22023'; end if;
  if v_key<>'goal_type' then
   if jsonb_typeof(p_goal->v_key)<>'number' then
    raise exception 'Numeric objective field required: %',v_key using errcode='22023';
   end if;
   if mod((p_goal->>v_key)::numeric,1)<>0 then
    raise exception 'Integer objective quantity required: %',v_key using errcode='22023';
   end if;
  end if;
 end loop;
 if p_goal->>'goal_type' not in ('fat_loss','recomp','muscle_gain','maintenance')
   or (p_goal->>'kcal')::numeric not between 1200 and 10000
   or (p_goal->>'protein_g')::numeric not between 0 and 1000
   or (p_goal->>'carb_g')::numeric not between 0 and 2000
   or (p_goal->>'fat_g')::numeric not between 0 and 1000
   or (p_goal->>'fiber_g')::numeric not between 0 and 150 then
  raise exception 'Objective outside permitted range' using errcode='22023';
 end if;
 select max(revision) into v_last from public.efg_personal_goals where user_id=v_uid;
 if p_expected_revision is distinct from v_last then
  raise exception 'Personal goal was modified by another session' using errcode='PT409';
 end if;
 v_revision:=coalesce(v_last,0)+1;
 insert into public.efg_personal_goals(
  user_id,revision,goal_type,kcal,protein_g,carb_g,fat_g,fiber_g)
 values(v_uid,v_revision,p_goal->>'goal_type',
  (p_goal->>'kcal')::integer,(p_goal->>'protein_g')::integer,
  (p_goal->>'carb_g')::integer,(p_goal->>'fat_g')::integer,
  (p_goal->>'fiber_g')::integer);
 return v_revision;
end
$goal$;
revoke all on function public.efg_save_personal_goal(jsonb,integer)
 from public,anon,authenticated;
grant execute on function public.efg_save_personal_goal(jsonb,integer) to authenticated;
commit;
-- NEVER APPLY to real Supabase. LEGAL 07 text still fictitious; no personal guide.
