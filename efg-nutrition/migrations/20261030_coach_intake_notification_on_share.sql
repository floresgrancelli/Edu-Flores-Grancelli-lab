-- COACH110: notify the linked Coach when a new versioned general intake
-- is explicitly shared. No clinical details in inbox and no legacy modification.
do $check$
begin
 if to_regclass('public.efg_coach_relaunch_intakes') is null
 or to_regclass('public.efg_pilot_participation_receipts') is null
 or to_regclass('public.efg_notifications') is null then
   raise exception 'COACH110: required current pilot tables absent';
 end if;
 if to_regprocedure('efg_private.coach_notify_shared_relaunch_intake()') is not null then
   raise exception 'COACH110: notification function already exists';
 end if;
end $check$;
create function efg_private.coach_notify_shared_relaunch_intake()
returns trigger language plpgsql security definer set search_path='' as $notify$
declare
 v_coach uuid;
 v_key text;
begin
 if new.shared_at is null then return new; end if;
 if tg_op='UPDATE' and old.revision=new.revision then return new; end if;
 -- A plain draft/revoked share must never notify.
 if not exists (
  select 1 from public.efg_pilot_participation_receipts r
  where r.student_id=new.student_id and r.organization_id=new.organization_id
   and r.version='coach_pilot_2026_demo1'
   and r.participation_accepted and r.sharing_accepted and r.revoked_at is null
 ) or not exists(
  select 1 from public.efg_consents c
  where c.student_id=new.student_id and c.organization_id=new.organization_id and c.accepted
 ) then return new; end if;
 select o.coach_id into v_coach from public.efg_profiles p
 join public.efg_organizations o on o.id=p.organization_id
 where p.user_id=new.student_id and p.role='student' and p.active
   and p.organization_id=new.organization_id;
 if v_coach is null then return new; end if;
 v_key:='pilot_intake:'||new.student_id::text||':'||new.completed_version||':'||new.revision::text;
 insert into public.efg_notifications(
   recipient_id,actor_id,kind,event_key,title,body,target_tab,target_student
 ) values(
   v_coach,new.student_id,'message',v_key,
   'Ficha nutricional recibida',
   'Un alumno compartió o actualizó su ficha inicial para que prepares su plan.',
   'coachIntake',new.student_id
 ) on conflict(recipient_id,event_key) do nothing;
 return new;
end
$notify$;
revoke all on function efg_private.coach_notify_shared_relaunch_intake() from public,anon,authenticated;
create trigger efg_coach_relaunch_shared_notice
after insert or update of shared_at,revision on public.efg_coach_relaunch_intakes
for each row execute function efg_private.coach_notify_shared_relaunch_intake();
-- No data rows or old accounts touched. No message sent until a signed
-- student explicitly shares new intake after COACH106 acknowledgement.
