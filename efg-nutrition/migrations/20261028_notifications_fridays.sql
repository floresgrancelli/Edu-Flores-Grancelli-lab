-- EFG Nutrition Pro 28/10/2026: private in-app notifications; additive, no user data rewrite.
-- Require production QA + RLS isolation checks before applying.
create table if not exists public.efg_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid,
 kind text not null check (kind in ('guide','plan_update','weekly_report','weekly_ready','missing_diary','payment','payment_status','message')),
 event_key text not null,
 title text not null check (char_length(title) between 1 and 140),
 body text not null default '' check (char_length(body) <= 600),
 target_tab text not null default 'home',
 target_student uuid,
 is_read boolean not null default false,
 read_at timestamptz,
 created_at timestamptz not null default now(),
 unique(recipient_id,event_key)
);
create index if not exists efg_notifications_inbox_idx on public.efg_notifications(recipient_id,created_at desc);
alter table public.efg_notifications enable row level security;
revoke all on public.efg_notifications from public,anon,authenticated;
grant select on public.efg_notifications to authenticated;
grant update (is_read,read_at) on public.efg_notifications to authenticated;
drop policy if exists "read own notifications" on public.efg_notifications;
drop policy if exists "mark own notifications read" on public.efg_notifications;
create policy "read own notifications" on public.efg_notifications
 for select to authenticated using (recipient_id = (select auth.uid()));
create policy "mark own notifications read" on public.efg_notifications
 for update to authenticated
 using (recipient_id = (select auth.uid()))
 with check (recipient_id = (select auth.uid()));

-- Only already-authorized mutations emit inbox entries. No client INSERT grant.
create or replace function public.efg_notify_food_guide() returns trigger
 language plpgsql security definer set search_path = ''
 as $$
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
end $$;
revoke all on function public.efg_notify_food_guide() from public,anon,authenticated;
drop trigger if exists trg_efg_notify_food_guide on public.efg_food_plans;
create trigger trg_efg_notify_food_guide after insert or update on public.efg_food_plans
 for each row execute function public.efg_notify_food_guide();

create or replace function public.efg_notify_goal() returns trigger
 language plpgsql security definer set search_path = ''
 as $$
begin
 insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab)
 values (new.student_id,new.approved_by,'plan_update','goal:'||new.id::text,
         'Objetivo nutricional actualizado','Tu coach aprobó un objetivo de alimentación.','home')
 on conflict(recipient_id,event_key) do nothing;
 return new;
end $$;
revoke all on function public.efg_notify_goal() from public,anon,authenticated;
drop trigger if exists trg_efg_notify_goal on public.efg_goals;
create trigger trg_efg_notify_goal after insert on public.efg_goals
 for each row execute function public.efg_notify_goal();

create or replace function public.efg_notify_weekly_report() returns trigger
 language plpgsql security definer set search_path = ''
 as $$
begin
 insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab)
 values(new.student_id,new.coach_id,'weekly_report','weekly:'||new.week_ending::text||':'||new.updated_at::text,
        'Nuevo informe semanal','Tu coach compartió el informe semanal revisado.','summaries')
 on conflict(recipient_id,event_key) do nothing;
 return new;
end $$;
revoke all on function public.efg_notify_weekly_report() from public,anon,authenticated;
drop trigger if exists trg_efg_notify_weekly_report on public.efg_weekly_reports;
create trigger trg_efg_notify_weekly_report after insert or update on public.efg_weekly_reports
 for each row execute function public.efg_notify_weekly_report();

create or replace function public.efg_notify_payment() returns trigger
 language plpgsql security definer set search_path = ''
 as $$
begin
 if tg_op='INSERT' and new.payment_kind='student_coach' then
  insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab)
  values(new.recipient_id,new.payer_id,'payment','receipt:'||new.id::text,
        'Nuevo comprobante','Recibiste un comprobante de transferencia para revisar.','payments')
  on conflict(recipient_id,event_key) do nothing;
 elsif tg_op='UPDATE' and new.status is distinct from old.status then
  insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab)
  values(new.payer_id,new.recipient_id,'payment_status','receipt-status:'||new.id::text||':'||new.status,
        'Estado de tu comprobante','Se actualizó el estado de tu transferencia.','payments')
  on conflict(recipient_id,event_key) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.efg_notify_payment() from public,anon,authenticated;
drop trigger if exists trg_efg_notify_payment on public.efg_payments;
create trigger trg_efg_notify_payment after insert or update on public.efg_payments
 for each row execute function public.efg_notify_payment();

-- Scheduled inbox messages. A missing day is *missing information*, never interpreted as eating zero.
create or replace function public.efg_daily_coach_reminders() returns void
 language plpgsql security invoker set search_path = '' as $$
declare prev_day date := (now() at time zone 'America/Argentina/Buenos_Aires')::date-1;
begin
 insert into public.efg_notifications(recipient_id,kind,event_key,title,body,target_tab,target_student)
 select o.coach_id,'missing_diary','missing:'||p.user_id::text||':'||prev_day::text,
        'Alumno sin registro de ayer','Falta información del diario de ayer. Consultá si necesitó ayuda para cargarlo.','coachStudents',p.user_id
 from public.efg_profiles p
 join public.efg_organizations o on o.id=p.organization_id
 join public.efg_consents c on c.student_id=p.user_id and c.organization_id=p.organization_id
 where p.role='student' and p.active and c.accepted
   and (p.created_at at time zone 'America/Argentina/Buenos_Aires')::date<prev_day
   and (c.updated_at at time zone 'America/Argentina/Buenos_Aires')::date<prev_day
   and not exists (
     select 1 from public.efg_daily_logs d where d.student_id=p.user_id and d.log_day=prev_day
       and exists (select 1 from jsonb_each(coalesce(d.meals,'{}'::jsonb)) m
             where jsonb_typeof(m.value)='array' and m.value<>'[]'::jsonb)
   )
 on conflict(recipient_id,event_key) do nothing;
end $$;
revoke all on function public.efg_daily_coach_reminders() from public,anon,authenticated;

create or replace function public.efg_friday_report_reminders() returns void
 language plpgsql security invoker set search_path = '' as $$
declare local_day date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
 if extract(isodow from local_day)<>5 then return; end if;
 insert into public.efg_notifications(recipient_id,kind,event_key,title,body,target_tab,target_student)
 select o.coach_id,'weekly_ready','friday:'||p.user_id::text||':'||local_day::text,
        'Informe de viernes para revisar','El borrador semanal está disponible en Informes. Revisalo antes de enviarlo.','reports',p.user_id
 from public.efg_profiles p
 join public.efg_organizations o on o.id=p.organization_id
 join public.efg_consents c on c.student_id=p.user_id and c.organization_id=p.organization_id
 where p.role='student' and p.active and c.accepted
 on conflict(recipient_id,event_key) do nothing;
end $$;
revoke all on function public.efg_friday_report_reminders() from public,anon,authenticated;

-- pg_cron uses UTC schedules: 09:00 and Friday 09:15 Argentina (UTC-3).
select cron.schedule('efg-nutrition-diary-reminders-v1','0 12 * * *','select public.efg_daily_coach_reminders()');
select cron.schedule('efg-nutrition-friday-report-v1','15 12 * * 5','select public.efg_friday_report_reminders()');
