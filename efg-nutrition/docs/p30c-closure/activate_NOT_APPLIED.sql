-- NOT APPLIED. Attestations are operator prerequisites, NOT automatic proof.
begin;
set local lock_timeout='5s';
lock table efg_private.major_release_manifests,efg_private.coach_release_switches in exclusive mode;
do $gate$ begin
if current_setting('ncc.owner_go',true) is distinct from 'ncc-pilot-1223936995da' or current_setting('ncc.live_build_verified',true) is distinct from 'ncc-pilot-1223936995da' or current_setting('ncc.production_food_review',true) is distinct from 'ncc-pilot-1223936995da' then raise exception 'NCC explicit GO, live build and production food review attestations required'; end if;
if exists(select 1 from efg_private.major_release_manifests where current_release or active or release_id='major_ncc_1223936995da') then raise exception 'NCC release drift'; end if;
if (select count(*) from efg_private.coach_release_switches where switch_key in ('pilot_coach_atomic_publication','pilot_health_bound_publication','pilot_student_diary_write_gate') and not enabled)<>3 then raise exception 'NCC switch drift'; end if;
end $gate$;
insert into efg_private.major_release_manifests(release_id,version,title,highlights,phase,active,current_release,roles,activated_at,build,reauth_required_at) values('major_ncc_1223936995da','20261104','Nutrición Con-Ciencia: nueva experiencia','["Ficha y restricciones privadas","Objetivos y Dieta Guía aprobados juntos","Mi Día con seis horarios y Balance restante","Informes e historial"]','live',true,true,array['student','coach','admin','personal'],transaction_timestamp(),'ncc-pilot-1223936995da',transaction_timestamp());
update efg_private.coach_release_switches set enabled=true,updated_at=transaction_timestamp() where switch_key in ('pilot_coach_atomic_publication','pilot_health_bound_publication','pilot_student_diary_write_gate');
commit;
