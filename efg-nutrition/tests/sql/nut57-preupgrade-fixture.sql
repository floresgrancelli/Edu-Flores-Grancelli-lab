-- NUT-57 positive ROLLBACK rehearsal: historical-shape SYNTHETIC fixture.
-- Only apply to an empty disposable PostgreSQL 17 database in GitHub Actions.
-- DOES NOT claim full parity with the production Supabase schema.
-- Roles anon/authenticated are set up by the unrelated isolated PG17 QA job.
create schema auth;
create schema efg_private;
create function auth.uid() returns uuid language sql stable
as $uid$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$uid$;
grant usage on schema auth to authenticated;
create table auth.users (id uuid primary key);
create table public.efg_organizations(
 id uuid primary key default gen_random_uuid(),coach_id uuid references auth.users(id)
);
create table public.efg_profiles(
 user_id uuid primary key references auth.users(id),
 organization_id uuid references public.efg_organizations(id),
 role text not null check(role in ('student','coach','admin')),
 active boolean not null default true
);
create table public.efg_consents(
 student_id uuid primary key references public.efg_profiles(user_id),
 organization_id uuid not null references public.efg_organizations(id),
 accepted boolean not null default false
);
create function efg_private.coach_has_student(p_student uuid) returns boolean
language sql stable security definer set search_path=''
as $coach$
 select exists(
  select 1 from public.efg_profiles p
  join public.efg_organizations org on org.id=p.organization_id
  join public.efg_consents c on c.student_id=p.user_id
  where p.user_id=p_student and p.role='student' and p.active
    and org.coach_id=auth.uid() and c.organization_id=org.id and c.accepted
 )
$coach$;
create table public.efg_goals(
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.efg_profiles(user_id),
 approved_by uuid not null references auth.users(id),
 goal_type text not null check(goal_type in ('fat_loss','recomp','muscle_gain','maintenance')),
 kcal integer not null check(kcal between 1200 and 10000),
 protein_g integer not null check(protein_g between 0 and 1000),
 carb_g integer not null check(carb_g between 0 and 2000),
 fat_g integer not null check(fat_g between 0 and 1000),
 fiber_g integer not null check(fiber_g between 0 and 150),
 start_on date not null default current_date,
 approved_at timestamptz not null default now()
);
create table public.efg_food_plans(
 student_id uuid primary key references public.efg_profiles(user_id),
 coach_id uuid not null references auth.users(id),
 approved_food_ids text[] not null default '{}'::text[],
 updated_at timestamptz not null default now(),
 guided_plan jsonb,
 guided_goal_id uuid references public.efg_goals(id),
 guided_plan_approved_at timestamptz,
 constraint approved_food_ids_limit check(cardinality(approved_food_ids) between 1 and 300),
 constraint efg_guided_plan_shape check(guided_plan is null or (
   jsonb_typeof(guided_plan)='object' and guided_plan->>'kind'='five_meal_example'
   and jsonb_typeof(guided_plan->'meals')='array'
   and jsonb_array_length(guided_plan->'meals')=5
   and octet_length(guided_plan::text)<30000
   and guided_goal_id is not null and guided_plan_approved_at is not null
 ))
);
create table public.efg_notifications(
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id),
 actor_id uuid references auth.users(id),
 kind text not null check(kind in
  ('guide','plan_update','weekly_report','weekly_ready','missing_diary','payment','payment_status','message')),
 event_key text not null,title text not null,body text not null default '',
 target_tab text not null default 'home',target_student uuid,
 is_read boolean not null default false,created_at timestamptz not null default now(),
 unique(recipient_id,event_key)
);
-- Historic nutrition tables: preserve data, add restrictive write-only policies
-- during migration. The five core nutrition tables now mirror the documented
-- column shapes needed by the app, but this remains a PARTIAL synthetic fixture.
create table public.efg_daily_logs(
 student_id uuid not null references public.efg_profiles(user_id),log_day date not null,
 meals jsonb not null default '{}'::jsonb,
 sports jsonb not null default '[]'::jsonb,
 skipped jsonb not null default '{}'::jsonb,
 totals jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 primary key(student_id,log_day),
 constraint meals_object check(jsonb_typeof(meals)='object'),
 constraint sports_array check(jsonb_typeof(sports)='array')
);
create table public.efg_weights(
 student_id uuid not null references public.efg_profiles(user_id),measured_on date not null,
 kg numeric(5,1) not null,
 created_at timestamptz not null default now(),
 measured_time time,
 primary key(student_id,measured_on)
);
create table public.efg_activities(
 student_id uuid not null references public.efg_profiles(user_id),activity_day date not null,
 steps integer,exercise_minutes integer,kind text,
 primary key(student_id,activity_day)
);
create table public.efg_habitual_meals(
 student_id uuid not null references public.efg_profiles(user_id),id uuid primary key default gen_random_uuid(),
 meal_slot text not null,name text not null,
 items jsonb not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.efg_personal_recipes(
 student_id uuid not null references public.efg_profiles(user_id),id uuid primary key default gen_random_uuid(),
 name text not null,ingredients jsonb not null,
 portions integer not null,
 totals jsonb not null,
 created_at timestamptz not null default now()
);
-- COACH70: Four additional production-column-shaped historical tables.
-- This is a SYNTHETIC base. Constraints and policies approximate production,
-- but are NOT a dump of hosted permissions, clinical records or customer data.
create table public.efg_invitations(
 id uuid primary key default gen_random_uuid(),
 email text not null,nickname text not null,role text not null,
 organization_id uuid references public.efg_organizations(id),
 invited_by uuid references auth.users(id),
 claimed_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 revoked_at timestamptz
);
create table public.efg_messages(
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.efg_profiles(user_id),
 coach_id uuid not null references auth.users(id),
 sender_id uuid not null references auth.users(id),
 body text not null,
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create table public.efg_payments(
 id uuid primary key default gen_random_uuid(),
 payer_id uuid not null references auth.users(id),
 recipient_id uuid not null references auth.users(id),
 organization_id uuid references public.efg_organizations(id),
 payment_kind text not null,
 amount_ars numeric not null,
 period_label text not null,
 alias_snapshot text not null,
 receipt_path text not null,
 status text not null default 'pending',
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.efg_weekly_reports(
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.efg_profiles(user_id),
 coach_id uuid not null references auth.users(id),
 week_ending date not null,
 report_text text not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.efg_invitations enable row level security;
alter table public.efg_messages enable row level security;
alter table public.efg_payments enable row level security;
alter table public.efg_weekly_reports enable row level security;
grant select on public.efg_invitations,public.efg_messages,
 public.efg_payments,public.efg_weekly_reports to authenticated;
grant insert,update on public.efg_messages,public.efg_weekly_reports to authenticated;
create policy synthetic_invitations_read on public.efg_invitations
 for select to authenticated using(
   exists(select 1 from public.efg_organizations o
    where o.id=organization_id and o.coach_id=auth.uid())
   or exists(select 1 from public.efg_profiles p
    where p.user_id=auth.uid() and p.role='admin' and p.active)
 );
create policy synthetic_message_party_read on public.efg_messages
 for select to authenticated using(student_id=auth.uid()
 or (coach_id=auth.uid() and efg_private.coach_has_student(student_id)));
create policy synthetic_message_party_insert on public.efg_messages
 for insert to authenticated with check(sender_id=auth.uid()
 and (student_id=auth.uid()
 or (coach_id=auth.uid() and efg_private.coach_has_student(student_id))));
create policy synthetic_message_party_receipt on public.efg_messages
 for update to authenticated using(
  (student_id=auth.uid() and sender_id<>auth.uid())
  or (coach_id=auth.uid() and sender_id<>auth.uid()
    and efg_private.coach_has_student(student_id)))
 with check(
  (student_id=auth.uid() and sender_id<>auth.uid())
  or (coach_id=auth.uid() and sender_id<>auth.uid()
    and efg_private.coach_has_student(student_id)));
create policy synthetic_payment_party_read on public.efg_payments
 for select to authenticated using(payer_id=auth.uid() or recipient_id=auth.uid());
create policy synthetic_weekly_party_read on public.efg_weekly_reports
 for select to authenticated using(student_id=auth.uid()
 or (coach_id=auth.uid() and efg_private.coach_has_student(student_id)));
create policy synthetic_weekly_coach_insert on public.efg_weekly_reports
 for insert to authenticated with check(coach_id=auth.uid()
 and efg_private.coach_has_student(student_id));
create policy synthetic_weekly_coach_update on public.efg_weekly_reports
 for update to authenticated using(coach_id=auth.uid()
 and efg_private.coach_has_student(student_id))
 with check(coach_id=auth.uid()
 and efg_private.coach_has_student(student_id));

-- Pre-upgrade log tables already have identity-based RLS in the hosted app.
-- Recreate ONLY a limited synthetic ownership policy for this test.
do $old_rls$
declare t text;
begin
 foreach t in array array['efg_daily_logs','efg_weights','efg_activities','efg_habitual_meals','efg_personal_recipes'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('create policy %I on public.%I for all to authenticated using(student_id=auth.uid()) with check(student_id=auth.uid())',t||'_legacy_owner',t);
 end loop;
end
$old_rls$;
-- COACH70: All 15 hosted baseline tables have RLS enabled; align fixture
-- flags without pretending these limited synthetic policies equal production.
alter table public.efg_organizations enable row level security;
alter table public.efg_profiles enable row level security;
alter table public.efg_consents enable row level security;
alter table public.efg_notifications enable row level security;
grant select on public.efg_organizations,public.efg_profiles,
 public.efg_consents,public.efg_notifications to authenticated;
create policy synthetic_organizations_owner on public.efg_organizations
 for select to authenticated using(coach_id=auth.uid());
create policy synthetic_profiles_owner on public.efg_profiles
 for select to authenticated using(user_id=auth.uid());
create policy synthetic_consents_owner on public.efg_consents
 for select to authenticated using(student_id=auth.uid());
create policy synthetic_notifications_owner on public.efg_notifications
 for select to authenticated using(recipient_id=auth.uid());

do $preflight$
begin
 if pg_catalog.to_regclass('public.efg_student_plan_access') is not null
    or pg_catalog.to_regclass('public.efg_student_intakes') is not null
    or pg_catalog.to_regclass('public.efg_coach_plan_drafts') is not null then
  raise exception 'NUT57 fixture was NOT pre-upgrade';
 end if;
end
$preflight$;
