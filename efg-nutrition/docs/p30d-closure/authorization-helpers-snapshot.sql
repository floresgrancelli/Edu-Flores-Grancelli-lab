CREATE OR REPLACE FUNCTION efg_private.coach_has_student(p_student uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(
  select 1 from public.efg_profiles student
  join public.efg_organizations org on org.id=student.organization_id
  join public.efg_consents c on c.student_id=student.user_id and c.organization_id=org.id
  join public.efg_profiles coach on coach.user_id=org.coach_id
  where student.user_id=p_student and student.role='student' and student.active
    and org.coach_id=auth.uid() and org.status in ('trial','active','grace')
    and (org.is_test or (org.status='active' and org.paid_through >= (now() at time zone 'America/Argentina/Buenos_Aires')::date))
    and coach.active and (coach.role='coach' or (coach.role='admin' and org.is_test))
    and c.accepted
 );
$function$
;
CREATE OR REPLACE FUNCTION efg_private.coach_pilot_share_active(p_student uuid, p_org uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 return (select efg_private.coach_has_student(p_student) and exists(
  select 1 from public.efg_pilot_participation_receipts r
  join public.efg_profiles p on p.user_id=r.student_id
  join public.efg_consents c on c.student_id=r.student_id
    and c.organization_id=r.organization_id and c.accepted=true
  where r.student_id=p_student and r.organization_id=p_org
   and p.organization_id=p_org and p.role='student' and p.active
   and r.version='coach_pilot_2026_demo1'
   and r.participation_accepted and r.sharing_accepted is true
   and r.revoked_at is null
 ));
end
$function$
;

