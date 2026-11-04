-- Corrective candidate for an existing COACH114 installation. NOT APPLIED.
-- Stage/restore rehearsal first. No food evidence seeded or approval inferred.
-- Original expression {8,1990} is invalid in PostgreSQL (repetition max 255).
begin;
do $guard$
begin
 if to_regclass('efg_private.coach_reviewed_foods') is null then
  raise exception 'COACH114 URL fix requires existing reviewed-food schema';
 end if;
 if not exists(select 1 from pg_constraint where
  conrelid='efg_private.coach_reviewed_foods'::regclass
  and conname='coach_reviewed_foods_source_url_check'
  and pg_get_constraintdef(oid) like '%{8,1990}%') then
  raise exception 'COACH114 URL constraint differs; inspect before replacing';
 end if;
end $guard$;
alter table efg_private.coach_reviewed_foods
 drop constraint coach_reviewed_foods_source_url_check;
alter table efg_private.coach_reviewed_foods
 add constraint coach_reviewed_foods_source_url_check
 check(source_url ~ '^https://[^[:space:]]+$'
  and pg_catalog.char_length(source_url) between 16 and 1998);
commit;
-- Restore previous schema only from the reviewed pre-upgrade snapshot in an
-- isolated environment. Do not reinstate the broken expression in a live release.
