-- Fix: student cannot see the coach's private efg_profiles row under RLS.
-- Keep strict coach existence checks inside a non-exposed, caller-verified helper.
create or replace function efg_private.student_can_message_coach(p_student uuid,p_coach uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
 select (select auth.uid())=p_student and exists(
  select 1 from public.efg_profiles p
  join public.efg_organizations o on o.id=p.organization_id
  join public.efg_consents c on c.student_id=p.user_id and c.organization_id=o.id
  join public.efg_profiles coach on coach.user_id=o.coach_id
  where p.user_id=p_student and p.role='student' and p.active
    and c.accepted and o.coach_id=p_coach and o.status in ('trial','active','grace')
    and coach.active and (coach.role='coach' or (coach.role='admin' and o.is_test))
 );
$$;
revoke all on function efg_private.student_can_message_coach(uuid,uuid) from public,anon,authenticated;
grant execute on function efg_private.student_can_message_coach(uuid,uuid) to authenticated;
drop policy if exists "efg messages party write" on public.efg_messages;
create policy "efg messages party write" on public.efg_messages for insert to authenticated
with check (
 sender_id=(select auth.uid()) and
 (
   (coach_id=(select auth.uid()) and efg_private.coach_has_student(student_id))
   or
   (student_id=(select auth.uid()) and efg_private.student_can_message_coach(student_id,coach_id))
 )
);
