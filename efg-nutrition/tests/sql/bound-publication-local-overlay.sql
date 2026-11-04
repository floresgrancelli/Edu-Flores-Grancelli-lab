-- PRIVATE proposal. Only disposable CURRENT + nine-source + persisted overlay. Does NOT enable any gate.
begin;
do $guard$ begin
 if current_user<>'postgres' or current_database()<>'postgres'
  or not exists(select 1 from efg_private.nut57_isolated_staging_marker where local_only)
  or exists(select 1 from efg_private.coach_release_switches where enabled)
  or exists(select 1 from public.efg_coach_plan_publish_receipts)
 then raise exception 'Fresh isolated OFF-gate runner required';end if;
end $guard$;
create table efg_private.bound_publication_local_gate(
 student_id uuid primary key,coach_id uuid not null,organization_id uuid not null,
 enabled boolean not null default false,fail_final_write boolean not null default false
);
alter table efg_private.bound_publication_local_gate enable row level security;
revoke all on efg_private.bound_publication_local_gate from public,anon,authenticated;
create table efg_private.bound_publication_local_originals(name text primary key,definition text not null);
revoke all on efg_private.bound_publication_local_originals from public,anon,authenticated;
alter table efg_private.bound_publication_local_originals enable row level security;
insert into efg_private.bound_publication_local_originals values
 ('publisher',pg_get_functiondef('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)'::regprocedure)),
 ('trigger',pg_get_functiondef('efg_private.block_bound_guide_publication()'::regprocedure));
create function efg_private.assert_bound_publication_local(p_student uuid,p_revision bigint,p_request uuid)
returns void language plpgsql security definer set search_path='' as $f$
declare b record;h record;d record;ids text[];begin
 if not exists(select 1 from efg_private.nut57_isolated_staging_marker where local_only)
  or not exists(select 1 from efg_private.bound_publication_local_gate g
   where g.student_id=p_student and g.coach_id=auth.uid() and g.enabled)
 then raise exception 'Local bound publication gate OFF' using errcode='42501';end if;
 -- COACH119 has already locked access, consent/participation and current general intake.
 -- Same remaining writer order as save_bound: health -> draft -> binding. Catalog rows locked too.
 select * into h from efg_private.efg_coach_health_intakes where student_id=p_student for update;
 select * into d from public.efg_coach_plan_drafts where student_id=p_student for update;
 select * into b from efg_private.guide_source_bindings where student_id=p_student for update;
 if b.student_id is null or b.coach_id is distinct from auth.uid() or d.coach_id is distinct from auth.uid()
  or b.organization_id is distinct from d.organization_id or h.organization_id is distinct from b.organization_id
  or not exists(select 1 from efg_private.bound_publication_local_gate g where g.student_id=p_student and g.organization_id=b.organization_id)
  or b.draft_revision is distinct from p_revision or d.draft_revision is distinct from p_revision
  or h.revision is distinct from b.health_revision or h.shared_at is null or h.consent_accepted_at is null
  or h.conditions is distinct from '{}'::jsonb
  or h.restriction_declaration->>'kind' is distinct from 'none_declared'
  or h.restriction_declaration->>'declared_by' is distinct from p_student::text
  or (h.restriction_declaration->>'source_revision')::integer is distinct from h.revision
  or not exists(select 1 from public.efg_coach_relaunch_intakes i where i.student_id=p_student
    and i.organization_id=b.organization_id and i.revision=b.intake_revision and i.shared_at is not null
    and i.completed_version='coach_major_2026_r1')
 then raise exception 'Stale bound publication source' using errcode='PT409';end if;
 if d.status<>'draft' and not(d.status='published' and exists(
  select 1 from public.efg_coach_plan_publish_receipts r where r.request_id=p_request
   and r.student_id=p_student and r.coach_id=auth.uid() and r.organization_id=b.organization_id and r.draft_revision=p_revision))
 then raise exception 'Publication retry does not match receipt' using errcode='PT409';end if;
 perform 1 from efg_private.coach_reviewed_foods source_food where source_food.food_id=any(b.food_ids) for share;
 if b.catalog_digest is distinct from efg_private.guide_catalog_digest(b.food_ids)
  or (select count(*) from efg_private.coach_reviewed_foods source_food where source_food.food_id=any(b.food_ids)
   and efg_private.coach_food_evidence_current(source_food))<>cardinality(b.food_ids)
  or efg_private.coach_guide_foods_verified(d.guide_proposal) is distinct from true
 then raise exception 'Bound evidence changed or expired' using errcode='42501';end if;
 ids:=efg_private.coach119_reviewed_food_ids(d.guide_proposal);
 if not(ids<@b.food_ids) or ids&&b.disliked_ids then
  raise exception 'Explicit plan selection outside bound foods' using errcode='22023';end if;
end $f$;
revoke all on function efg_private.assert_bound_publication_local(uuid,bigint,uuid) from public,anon,authenticated;
-- Reuse the actual COACH119 body, adding one binding check before legal/draft publication work.
do $patch$ declare definition text;needle text:=' -- Require BOTH distinct document kinds';begin
 select o.definition into definition from efg_private.bound_publication_local_originals o where name='publisher';
 if (length(definition)-length(replace(definition,needle,'')))/length(needle)<>1 then
  raise exception 'Exact COACH119 insertion point missing';end if;
 execute replace(definition,needle,E' if exists(select 1 from efg_private.guide_source_bindings where student_id=p_student) then\n  perform efg_private.assert_bound_publication_local(p_student,p_expected_revision,p_request_id);\n end if;\n'||needle);
end $patch$;
-- Preserve the original trigger, with a LOCAL exception requiring the real private COACH119 transaction marker.
create or replace function efg_private.block_bound_guide_publication() returns trigger
language plpgsql security definer set search_path='' as $f$ begin
 if new.status='published' and exists(select 1 from efg_private.guide_source_bindings where student_id=new.student_id) then
  if not exists(select 1 from efg_private.nut57_isolated_staging_marker where local_only)
   or efg_private.coach119_is_atomic_transaction() is distinct from true
   or efg_private.guide_binding_current(new.student_id) is distinct from true
   or not exists(select 1 from efg_private.bound_publication_local_gate g
    where g.student_id=new.student_id and g.coach_id=auth.uid() and g.organization_id=new.organization_id and g.enabled)
  then raise exception 'Bound guide publication not enabled' using errcode='42501';end if;
  if exists(select 1 from efg_private.bound_publication_local_gate where student_id=new.student_id and fail_final_write) then
   raise exception 'LOCAL_BOUND_FINAL_WRITE_FAILURE' using errcode='P0001';end if;
 end if;return new;
end $f$;
revoke all on function efg_private.block_bound_guide_publication() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
