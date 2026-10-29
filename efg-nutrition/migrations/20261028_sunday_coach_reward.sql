-- EFG Nutrition Pro · permiso de comida libre de domingo (PREPARACION, NO APLICADA).
-- No cambia datos existentes. Aplicar sólo como parte de una publicación validada.
-- Un logro 6/6 NUNCA otorga permiso por sí solo: un coach lo aprueba explícitamente.
create table if not exists public.efg_sunday_rewards(
 student_id uuid not null references public.efg_profiles(user_id) on delete cascade,
 week_monday date not null,
 coach_id uuid not null references auth.users(id),
 approved boolean not null default false,
 approved_at timestamptz,
 updated_at timestamptz not null default now(),
 primary key (student_id,week_monday),
 constraint efg_sunday_rewards_monday check (extract(isodow from week_monday)=1),
 constraint efg_sunday_rewards_approved_timestamp check (not approved or approved_at is not null)
);
alter table public.efg_sunday_rewards enable row level security;
-- El proyecto puede heredar GRANT amplios: retirar todos y volver a otorgar
-- sólo lectura y escritura necesaria para autenticados sujetos a RLS.
revoke all on table public.efg_sunday_rewards from public,anon,authenticated;
grant select,insert,update on table public.efg_sunday_rewards to authenticated;

-- Alumno sólo consulta sus propias autorizaciones; nunca las edita.
create policy "sunday_reward_student_read"
on public.efg_sunday_rewards for select to authenticated
using (student_id=(select auth.uid()));

-- Coach sólo consulta/edita alumnos activos, de su propia organización
-- y con consentimiento vigente. Admin no recibe permisos universales.
create policy "sunday_reward_coach_read"
on public.efg_sunday_rewards for select to authenticated
using (
 and coach_id=(select auth.uid()) and exists (
  select 1 from public.efg_profiles p
  join public.efg_organizations o on o.id=p.organization_id
  join public.efg_consents c on c.student_id=p.user_id and c.organization_id=o.id
  where p.user_id=efg_sunday_rewards.student_id and p.role='student' and p.active
    and o.coach_id=(select auth.uid()) and c.accepted=true
    and o.status in ('active','trial','grace')
    and exists (select 1 from public.efg_profiles coach where coach.user_id=o.coach_id and coach.active and coach.role in ('coach','admin'))
 )
);
create policy "sunday_reward_coach_insert"
on public.efg_sunday_rewards for insert to authenticated
with check (
 and extract(isodow from (now() at time zone 'America/Argentina/Buenos_Aires'))=7
 and week_monday=((now() at time zone 'America/Argentina/Buenos_Aires')::date - 6)
 and coach_id=(select auth.uid()) and exists (
  select 1 from public.efg_profiles p
  join public.efg_organizations o on o.id=p.organization_id
  join public.efg_consents c on c.student_id=p.user_id and c.organization_id=o.id
  where p.user_id=efg_sunday_rewards.student_id and p.role='student' and p.active
    and o.coach_id=(select auth.uid()) and c.accepted=true
    and o.status in ('active','trial','grace')
    and exists (select 1 from public.efg_profiles coach where coach.user_id=o.coach_id and coach.active and coach.role in ('coach','admin'))
 )
);
create policy "sunday_reward_coach_update"
on public.efg_sunday_rewards for update to authenticated
using (
 extract(isodow from (now() at time zone 'America/Argentina/Buenos_Aires'))=7
 and week_monday=((now() at time zone 'America/Argentina/Buenos_Aires')::date - 6)
 and coach_id=(select auth.uid()) and exists (
  select 1 from public.efg_profiles p
  join public.efg_organizations o on o.id=p.organization_id
  join public.efg_consents c on c.student_id=p.user_id and c.organization_id=o.id
  where p.user_id=efg_sunday_rewards.student_id and p.role='student' and p.active
    and o.coach_id=(select auth.uid()) and c.accepted=true
    and o.status in ('active','trial','grace')
    and exists (select 1 from public.efg_profiles coach where coach.user_id=o.coach_id and coach.active and coach.role in ('coach','admin'))
 )
)
with check (
 extract(isodow from (now() at time zone 'America/Argentina/Buenos_Aires'))=7
 and week_monday=((now() at time zone 'America/Argentina/Buenos_Aires')::date - 6)
 and coach_id=(select auth.uid()) and exists (
  select 1 from public.efg_profiles p
  join public.efg_organizations o on o.id=p.organization_id
  join public.efg_consents c on c.student_id=p.user_id and c.organization_id=o.id
  where p.user_id=efg_sunday_rewards.student_id and p.role='student' and p.active
    and o.coach_id=(select auth.uid()) and c.accepted=true
    and o.status in ('active','trial','grace')
    and exists (select 1 from public.efg_profiles coach where coach.user_id=o.coach_id and coach.active and coach.role in ('coach','admin'))
 )
);
comment on table public.efg_sunday_rewards is 'Autorización explícita de coach para comida libre el domingo; no sustituye criterio nutricional.';
