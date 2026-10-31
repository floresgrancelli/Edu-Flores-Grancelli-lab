-- NUT-56 / LOCAL ONLY / FICTIONAL production-shaped compatibility fixture.
-- Apply to disposable Supabase CLI PostgreSQL *after* coach-auth-local-bootstrap.sql
-- and *before* staging-only Coach draft/publication scripts.
-- This is NOT a migration nor a dump of customer records.
-- Actual production includes MORE schema, RLS, triggers, functions and sessions.

begin;
alter table public.efg_organizations
  alter column coach_id drop not null,
  add column name text not null,
  add column seat_limit integer not null default 5 check(seat_limit between 1 and 10000),
  add column payment_alias text,
  add column status text not null default 'trial'
    check(status in ('trial','active','grace','suspended')),
  add column created_at timestamptz not null default now(),
  add column is_test boolean not null default false,
  add column license_fee_ars numeric(12,2)
    check(license_fee_ars is null or license_fee_ars between 0.01 and 10000000),
  add column paid_through date,
  add column plan_updated_at timestamptz not null default now(),
  add constraint efg_organizations_coach_id_key unique(coach_id);

alter table public.efg_profiles
  add column email text not null unique,
  add column nickname text not null check(length(nickname) between 2 and 70),
  add column created_at timestamptz not null default now(),
  add constraint profile_org_role check(
    (role='student' and organization_id is not null)
    or (role<>'student' and organization_id is null)
  );

alter table public.efg_consents
  add column updated_at timestamptz not null default now(),
  add column email_report_opt_in boolean not null default false;

alter table public.efg_goals
  add column estimation_method text check(estimation_method is null or estimation_method in ('mifflin','tenhaaf')),
  add column activity_factor numeric(4,2),
  add column protein_per_kg numeric(4,2),
  add column fat_per_kg numeric(4,2);

alter table public.efg_notifications
  add column read_at timestamptz,
  add constraint efg_notifications_title_check check(char_length(title) between 1 and 140),
  add constraint efg_notifications_body_check check(char_length(body)<=600);

-- Verify historical goal/guide relationships, as production does.
create function efg_private.verify_guide_goal() returns trigger
language plpgsql security definer set search_path=''
as $f$
begin
 if new.guided_plan is not null and (
   auth.uid() is null
   or new.coach_id is distinct from auth.uid()
   or not exists(select 1 from public.efg_goals g
     where g.id=new.guided_goal_id and g.student_id=new.student_id
       and g.approved_by=new.coach_id)
 ) then raise exception 'Guide goal must belong to this student and coach'; end if;
 return new;
end $f$;

create trigger efg_verify_guide_goal
before insert or update on public.efg_food_plans
for each row execute function efg_private.verify_guide_goal();

create function efg_private.food_plan_immutable_owner() returns trigger
language plpgsql set search_path=''
as $f$
begin
 if new.student_id is distinct from old.student_id
    or new.coach_id is distinct from old.coach_id then
   raise exception 'Cannot change the student or coach of a food plan'; end if;
 new.updated_at=now();
 return new;
end $f$;

create trigger efg_food_plan_lock_owner
before update on public.efg_food_plans
for each row execute function efg_private.food_plan_immutable_owner();

create function efg_private.protect_consent_identity() returns trigger
language plpgsql set search_path=''
as $f$
begin
 if new.student_id is distinct from old.student_id
    or new.organization_id is distinct from old.organization_id then
   raise exception 'Consent student or organization identity cannot change'; end if;
 new.updated_at=now();
 return new;
end $f$;

create trigger efg_consent_identity_immutable
before update on public.efg_consents
for each row execute function efg_private.protect_consent_identity();

-- Two production-like notification triggers: unchanged legacy behaviour
-- MUST be preserved for legacy operations outside the atomic RPC.
create function public.efg_notify_goal() returns trigger
language plpgsql security definer set search_path=''
as $f$
begin
 insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab)
 values(new.student_id,new.approved_by,'plan_update','goal:'||new.id::text,
   'Objetivo nutricional actualizado','Tu coach aprobó un objetivo de alimentación.','home')
 on conflict(recipient_id,event_key) do nothing;
 return new;
end $f$;

create trigger trg_efg_notify_goal
after insert on public.efg_goals
for each row execute function public.efg_notify_goal();

create function public.efg_notify_food_guide() returns trigger
language plpgsql security definer set search_path=''
as $f$
begin
 if tg_op='INSERT' then
   if new.guided_plan is null or new.guided_plan_approved_at is null then return new; end if;
 elsif new.guided_plan_approved_at is not distinct from old.guided_plan_approved_at then
   if new.approved_food_ids is distinct from old.approved_food_ids then
     insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab)
     values(new.student_id,new.coach_id,'plan_update','foods:'||new.updated_at::text,
       'Cambios en tu alimentación','Tu coach actualizó las opciones de alimentos de tu plan.','home')
     on conflict(recipient_id,event_key) do nothing;
   end if;
   return new;
 end if;
 if new.guided_plan is not null and new.guided_plan_approved_at is not null then
   insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab)
   values(new.student_id,new.coach_id,'guide','guide:'||new.guided_plan_approved_at::text,
     'Nueva guía de alimentación','Tu coach aprobó una guía alimentaria. Podés verla en Mi día.','home')
   on conflict(recipient_id,event_key) do nothing;
 end if;
 return new;
end $f$;

create trigger trg_efg_notify_food_guide
after insert or update on public.efg_food_plans
for each row execute function public.efg_notify_food_guide();

-- Production authenticated-role policies allow legacy goal/guide writes.
-- Enforced only in this local facsimile; staged atomic SQL revokes these grants.
alter table public.efg_goals enable row level security;
alter table public.efg_food_plans enable row level security;
grant insert,update,delete on public.efg_goals,public.efg_food_plans to authenticated;
create policy goals_coach_insert on public.efg_goals for insert to authenticated
 with check(approved_by=auth.uid() and efg_private.coach_has_student(student_id));
create policy goals_private_read on public.efg_goals for select to authenticated
 using(student_id=auth.uid() or efg_private.coach_has_student(student_id));
create policy efg_food_plan_coach_insert on public.efg_food_plans for insert to authenticated
 with check(coach_id=auth.uid() and efg_private.coach_has_student(student_id));
create policy efg_food_plan_coach_update on public.efg_food_plans for update to authenticated
 using(coach_id=auth.uid() and efg_private.coach_has_student(student_id))
 with check(coach_id=auth.uid() and efg_private.coach_has_student(student_id));
create policy efg_food_plan_read_owned on public.efg_food_plans for select to authenticated
 using(student_id=auth.uid() or (coach_id=auth.uid() and efg_private.coach_has_student(student_id)));
commit;
