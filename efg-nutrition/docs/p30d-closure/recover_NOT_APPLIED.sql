-- NOT APPLIED. Restore only this release configuration; retain user data and receipts.
begin;
set local lock_timeout='5s';
lock table efg_private.major_release_manifests,efg_private.coach_release_switches in exclusive mode;
do $gate$ begin
if current_setting('ncc.recovery_authorized',true) is distinct from 'ncc-pilot-f47cad0f7cb3' then raise exception 'NCC recovery authorization required'; end if;
if not exists(select 1 from efg_private.major_release_manifests where release_id='major_ncc_f47cad0f7cb3' and build='ncc-pilot-f47cad0f7cb3' and active and current_release) or exists(select 1 from efg_private.major_release_manifests where (active or current_release) and release_id<>'major_ncc_f47cad0f7cb3') then raise exception 'NCC recovery release drift'; end if;
if (select count(*) from efg_private.coach_release_switches where switch_key in ('pilot_coach_atomic_publication','pilot_health_bound_publication','pilot_student_diary_write_gate') and enabled)<>3 then raise exception 'NCC recovery switch drift'; end if;
end $gate$;
update efg_private.major_release_manifests set active=false,current_release=false where release_id='major_ncc_f47cad0f7cb3' and build='ncc-pilot-f47cad0f7cb3';
update efg_private.coach_release_switches set enabled=false,updated_at=transaction_timestamp() where switch_key in ('pilot_coach_atomic_publication','pilot_health_bound_publication','pilot_student_diary_write_gate');
commit;
