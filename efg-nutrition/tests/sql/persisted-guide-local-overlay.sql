-- PRIVATE disposable overlay; NOT a migration or hosted deployment.
-- Apply after CURRENT Coach119 + CLIN_GUT_03 + scoped response + nine-food V10 overlay.
begin;
do $guard$ begin
 if current_user<>'postgres' or current_database()<>'postgres'
  or not exists(select 1 from efg_private.nut57_isolated_staging_marker where local_only)
  or exists(select 1 from efg_private.coach_release_switches where enabled)
  or exists(select 1 from public.efg_coach_plan_drafts)
 then raise exception 'Fresh isolated candidate with all switches OFF required'; end if;
end $guard$;
alter table efg_private.efg_coach_health_intakes add column restriction_declaration jsonb;
-- Existing submit/revoke remain unchanged: revision mismatch invalidates this declaration.
create function public.efg_declare_no_restrictions(p_document uuid,p_sha256 text,p_expected_revision integer,p_processing_consent boolean,p_share_with_coach boolean)
returns integer language plpgsql security definer set search_path='' as $f$
declare r integer; begin
 if p_processing_consent is distinct from true or p_share_with_coach is distinct from true then raise exception 'Explicit separate consent required' using errcode='42501'; end if;
 r:=public.efg_submit_coach_health_intake('{}'::jsonb,p_document,p_sha256,p_expected_revision,p_processing_consent,p_share_with_coach);
 update efg_private.efg_coach_health_intakes set restriction_declaration=pg_catalog.jsonb_build_object(
 'version',1,'kind','none_declared','declared_by',auth.uid(),'confirmed_at',pg_catalog.clock_timestamp(),'source_revision',r)
 where student_id=auth.uid() and revision=r;
 return r;
end $f$;
revoke all on function public.efg_declare_no_restrictions(uuid,text,integer,boolean,boolean) from public,anon,authenticated;
grant execute on function public.efg_declare_no_restrictions(uuid,text,integer,boolean,boolean) to authenticated;
create table efg_private.guide_source_bindings(
 student_id uuid primary key references public.efg_profiles(user_id) on delete cascade,
 coach_id uuid not null,organization_id uuid not null,
 intake_revision integer not null,health_revision integer not null,draft_revision bigint not null,
 preferred_ids text[] not null,disliked_ids text[] not null,food_ids text[] not null,
 catalog_digest text not null,created_at timestamptz not null default now()
);
alter table efg_private.guide_source_bindings enable row level security;
revoke all on efg_private.guide_source_bindings from public,anon,authenticated;
create function efg_private.guide_catalog_digest(ids text[]) returns text
language sql stable security invoker set search_path='' as $f$
 select md5(coalesce(jsonb_agg(to_jsonb(source_food) order by source_food.food_id)::text,''))
 from efg_private.coach_reviewed_foods source_food where source_food.food_id=any(ids);
$f$;
revoke all on function efg_private.guide_catalog_digest(text[]) from public,anon,authenticated;
create function efg_private.guide_binding_current(p_student uuid) returns boolean
language plpgsql stable security definer set search_path='' as $f$
declare b efg_private.guide_source_bindings%rowtype; h record; begin
 select * into b from efg_private.guide_source_bindings where student_id=p_student;
 if not found then return true; end if; -- Unrelated legacy drafts keep existing RLS.
 if auth.uid() is distinct from b.coach_id or not efg_private.coach_has_student(p_student)
  or not efg_private.coach_pilot_share_active(p_student,b.organization_id) then return false; end if;
 select * into h from efg_private.efg_coach_health_intakes where student_id=p_student;
 return found and h.organization_id=b.organization_id and h.revision=b.health_revision
  and h.shared_at is not null and h.consent_accepted_at is not null and h.conditions='{}'::jsonb
  and h.restriction_declaration->>'kind'='none_declared'
  and h.restriction_declaration->>'declared_by'=p_student::text
  and (h.restriction_declaration->>'source_revision')::integer=h.revision
  and exists(select 1 from public.efg_coach_relaunch_intakes i where i.student_id=p_student
   and i.completed_version='coach_major_2026_r1' and i.revision=b.intake_revision and i.shared_at is not null)
  and exists(select 1 from public.efg_coach_plan_drafts d where d.student_id=p_student and d.coach_id=b.coach_id and d.draft_revision=b.draft_revision and d.status='draft')
  and b.catalog_digest=efg_private.guide_catalog_digest(b.food_ids)
  and (select count(*) from efg_private.coach_reviewed_foods source_food where source_food.food_id=any(b.food_ids)
   and efg_private.coach_food_evidence_current(source_food))=cardinality(b.food_ids);
end $f$;
revoke all on function efg_private.guide_binding_current(uuid) from public,anon,authenticated;
grant execute on function efg_private.guide_binding_current(uuid) to authenticated;
create policy guide_bound_draft_current on public.efg_coach_plan_drafts as restrictive
 for select to authenticated using(efg_private.guide_binding_current(student_id));
create function public.efg_prepare_bound_guide(p_student uuid,p_goal jsonb,p_intake_revision integer,
 p_health_revision integer,p_preferred text[],p_disliked text[],p_food_ids text[],p_expected_draft bigint)
returns bigint language plpgsql security definer set search_path='' as $f$
declare i record; h record; r bigint; begin
 if auth.uid() is null or not efg_private.coach_has_student(p_student) then
  raise exception 'Denied' using errcode='42501'; end if;
 select * into i from public.efg_coach_relaunch_intakes where student_id=p_student
  and completed_version='coach_major_2026_r1' for update;
 if not found or i.revision is distinct from p_intake_revision or i.shared_at is null
  or i.dietary_pattern<>'omnivore' then raise exception 'Stale intake or unsupported pattern' using errcode='PT409'; end if;
 select * into h from efg_private.efg_coach_health_intakes where student_id=p_student for update;
 if not found or h.revision is distinct from p_health_revision or h.organization_id<>i.organization_id
  or h.shared_at is null or h.conditions<>'{}'::jsonb or h.consent_accepted_at is null
  or h.restriction_declaration->>'kind' is distinct from 'none_declared'
  or h.restriction_declaration->>'declared_by' is distinct from p_student::text
  or (h.restriction_declaration->>'source_revision')::integer is distinct from h.revision then
  raise exception 'Explicit current declaration required' using errcode='42501'; end if;
 if p_food_ids is null or cardinality(p_food_ids) not between 1 and 30
  or array_position(p_food_ids,null) is not null
  or cardinality(p_food_ids)<>(select count(distinct x) from unnest(p_food_ids) x)
  or p_preferred is null or p_disliked is null or array_position(p_preferred,null) is not null
  or array_position(p_disliked,null) is not null or not(p_preferred<@p_food_ids) or not(p_disliked<@p_food_ids)
  or p_preferred&&p_disliked then raise exception 'Invalid identified preferences' using errcode='22023'; end if;
 if (select count(*) from efg_private.coach_reviewed_foods source_food where source_food.food_id=any(p_food_ids)
  and efg_private.coach_food_evidence_current(source_food))<>cardinality(p_food_ids) then
  raise exception 'Source evidence unavailable' using errcode='42501'; end if;
 r:=public.efg_save_coach_plan_draft(p_student,p_goal,null,i.updated_at,i.revision,p_expected_draft);
 insert into efg_private.guide_source_bindings values(p_student,auth.uid(),i.organization_id,i.revision,h.revision,r,
  p_preferred,p_disliked,p_food_ids,efg_private.guide_catalog_digest(p_food_ids),clock_timestamp())
 on conflict(student_id) do update set coach_id=excluded.coach_id,organization_id=excluded.organization_id,
 intake_revision=excluded.intake_revision,health_revision=excluded.health_revision,draft_revision=excluded.draft_revision,
 preferred_ids=excluded.preferred_ids,disliked_ids=excluded.disliked_ids,food_ids=excluded.food_ids,
 catalog_digest=excluded.catalog_digest,created_at=excluded.created_at;
 return r;
end $f$;
revoke all on function public.efg_prepare_bound_guide(uuid,jsonb,integer,integer,text[],text[],text[],bigint) from public,anon,authenticated;
grant execute on function public.efg_prepare_bound_guide(uuid,jsonb,integer,integer,text[],text[],text[],bigint) to authenticated;
create function public.efg_read_bound_guide(p_student uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $f$
declare b record; d record; foods jsonb; general jsonb; begin
 if auth.uid() is null or not efg_private.coach_has_student(p_student) then raise exception 'Denied' using errcode='42501'; end if;
 select * into b from efg_private.guide_source_bindings where student_id=p_student and coach_id=auth.uid();
 if not found or efg_private.guide_binding_current(p_student) is distinct from true then raise exception 'Stale source' using errcode='PT409'; end if;
 select * into d from public.efg_coach_plan_drafts where student_id=p_student and coach_id=auth.uid();
 if d.draft_revision is distinct from b.draft_revision or d.status<>'draft' then raise exception 'Stale draft' using errcode='PT409'; end if;
 select to_jsonb(i) into general from public.efg_coach_relaunch_intakes i where i.student_id=p_student and i.completed_version='coach_major_2026_r1';
 select jsonb_agg(jsonb_build_object('id',source_food.food_id,'unit',source_food.unit,'k',source_food.k,'p',source_food.p,'c',source_food.c,'f',source_food.f,'fi',source_food.fi,
  'provenance',source_food.automatic_provenance,'validated_at',source_food.automated_validated_at,'expires_at',source_food.expires_at) order by source_food.food_id)
 into foods from efg_private.coach_reviewed_foods source_food where source_food.food_id=any(b.food_ids);
 return jsonb_build_object('viewer_id',auth.uid(),'session_id',auth.jwt()->>'session_id','student_id',p_student,'organization_id',b.organization_id,
  'intake_revision',b.intake_revision,'health_revision',b.health_revision,'draft_revision',d.draft_revision,
  'catalog_digest',b.catalog_digest,'preferred_ids',b.preferred_ids,'disliked_ids',b.disliked_ids,
  'general',general,'goal',d.goal_proposal,'guide',d.guide_proposal,'foods',foods,'evaluated_at',clock_timestamp(),
  'restriction_declaration','none_declared','declaration',(select restriction_declaration from efg_private.efg_coach_health_intakes where student_id=p_student),'publishable',false);
end $f$;
revoke all on function public.efg_read_bound_guide(uuid) from public,anon,authenticated;
grant execute on function public.efg_read_bound_guide(uuid) to authenticated;
create function public.efg_save_bound_guide(p_student uuid,p_expected_draft bigint,p_catalog_digest text,p_guide jsonb)
returns bigint language plpgsql security definer set search_path='' as $f$
declare b record; d record; c jsonb; i record; r bigint; key text; target numeric; actual numeric; begin
 if auth.uid() is null or not efg_private.coach_has_student(p_student) then raise exception 'Denied' using errcode='42501'; end if;
 -- All writers lock intake -> health -> draft/binding in the same order.
 select * into i from public.efg_coach_relaunch_intakes where student_id=p_student
  and completed_version='coach_major_2026_r1' for update;
 perform 1 from efg_private.efg_coach_health_intakes where student_id=p_student for update;
 select * into d from public.efg_coach_plan_drafts where student_id=p_student for update;
 select * into b from efg_private.guide_source_bindings where student_id=p_student for update;
 c:=public.efg_read_bound_guide(p_student);
 if d.draft_revision is distinct from p_expected_draft or b.catalog_digest is distinct from p_catalog_digest then
  raise exception 'Revision conflict' using errcode='PT409'; end if;
 if not efg_private.coach_guide_foods_verified(p_guide) then raise exception 'Invalid source composition' using errcode='42501'; end if;
 if exists(select 1 from jsonb_array_elements(p_guide->'meals') m,
  lateral jsonb_array_elements(m->'items') item where not(item->>'id'=any(b.food_ids)) or item->>'id'=any(b.disliked_ids)) then
  raise exception 'Food outside bound selection' using errcode='22023'; end if;
 foreach key in array array['k','p','c','f','fi'] loop
  target:=(d.goal_proposal->>(case key when 'k' then 'kcal' when 'p' then 'protein_g' when 'c' then 'carb_g' when 'f' then 'fat_g' else 'fiber_g' end))::numeric;
  select sum((item->>key)::numeric*(item->>'qty')::numeric) into actual
   from jsonb_array_elements(p_guide->'meals') m,lateral jsonb_array_elements(m->'items') item;
  if actual is null or abs(actual-target)>greatest(target,0.000001)*0.05 then
   raise exception 'Daily target outside five percent' using errcode='22023'; end if;
 end loop;
 r:=public.efg_save_coach_plan_draft(p_student,d.goal_proposal,p_guide,i.updated_at,i.revision,d.draft_revision);
 update efg_private.guide_source_bindings set draft_revision=r where student_id=p_student;
 return r;
end $f$;
revoke all on function public.efg_save_bound_guide(uuid,bigint,text,jsonb) from public,anon,authenticated;
grant execute on function public.efg_save_bound_guide(uuid,bigint,text,jsonb) to authenticated;
-- Persisted prototypes cannot cross into publication even if another fixture toggles a switch.
create function efg_private.block_bound_guide_publication() returns trigger
language plpgsql security definer set search_path='' as $f$ begin
 if new.status='published' and exists(select 1 from efg_private.guide_source_bindings where student_id=new.student_id)
 then raise exception 'Bound guide publication not enabled' using errcode='42501'; end if;
 return new;
end $f$;
revoke all on function efg_private.block_bound_guide_publication() from public,anon,authenticated;
create trigger bound_guide_publication_off before update of status on public.efg_coach_plan_drafts
 for each row execute function efg_private.block_bound_guide_publication();
notify pgrst,'reload schema';
commit;
