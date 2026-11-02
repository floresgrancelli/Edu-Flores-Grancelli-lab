-- PRIVATE NOT APPLIED: exact existing function bodies plus reviewed hooks. Gates remain OFF.
BEGIN;
CREATE OR REPLACE FUNCTION efg_private.guide_binding_current(p_student uuid) returns boolean
language plpgsql stable security definer set search_path='' as $f$
declare b efg_private.guide_source_bindings%rowtype; h record; begin
 select * into b from efg_private.guide_source_bindings where student_id=p_student;
 if not found then return true; end if; -- Unrelated legacy drafts keep existing RLS.
 if auth.uid() is distinct from b.coach_id or not efg_private.coach_has_student(p_student)
  or not efg_private.coach_pilot_share_active(p_student,b.organization_id) then return false; end if;
 select * into h from efg_private.efg_coach_health_intakes where student_id=p_student;
 return found and h.organization_id=b.organization_id and h.revision=b.health_revision
  and h.shared_at is not null and h.consent_accepted_at is not null and efg_private.clinical_declaration_supported(h::efg_private.efg_coach_health_intakes)
  and exists(select 1 from public.efg_coach_relaunch_intakes i where i.student_id=p_student
   and i.completed_version='coach_major_2026_r1' and i.revision=b.intake_revision and i.shared_at is not null)
  and exists(select 1 from public.efg_coach_plan_drafts d where d.student_id=p_student and d.coach_id=b.coach_id and d.draft_revision=b.draft_revision and d.status='draft')
  and b.catalog_digest=efg_private.guide_catalog_digest(b.food_ids)
  and (select count(*) from efg_private.coach_reviewed_foods source_food where source_food.food_id=any(b.food_ids)
   and efg_private.coach_food_evidence_current(source_food))=cardinality(b.food_ids);
end $f$;

CREATE OR REPLACE FUNCTION public.efg_prepare_bound_guide(p_student uuid,p_goal jsonb,p_intake_revision integer,
 p_health_revision integer,p_preferred text[],p_disliked text[],p_food_ids text[],p_expected_draft bigint)
returns bigint language plpgsql security definer set search_path='' as $f$
declare i record; h record; r bigint; d record; b record; expected bigint:=p_expected_draft; begin
 if auth.uid() is null or not efg_private.coach_has_student(p_student) then
  raise exception 'Denied' using errcode='42501'; end if;
 perform efg_private.clinical_lock_context(p_student);
 select * into i from public.efg_coach_relaunch_intakes where student_id=p_student
  and completed_version='coach_major_2026_r1' for update;
 if not found or i.revision is distinct from p_intake_revision or i.shared_at is null
  or i.dietary_pattern not in ('omnivore','keto') then raise exception 'Stale intake or unsupported pattern' using errcode='PT409'; end if;
 select * into h from efg_private.efg_coach_health_intakes where student_id=p_student for update;
 if not found or h.revision is distinct from p_health_revision or h.organization_id<>i.organization_id
  or h.shared_at is null or h.consent_accepted_at is null
  or efg_private.clinical_declaration_supported(h::efg_private.efg_coach_health_intakes) is distinct from true then
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
 -- PRIVATE REVIEW PROPOSAL, NOT EXECUTED: RLS deliberately hides stale drafts.
 -- Rebind only after the explicit prepare operation verified NEW current sources.
 -- Never expose the stale body, overwrite a current draft, or relax its read policy.
 if expected is null then
  select * into d from public.efg_coach_plan_drafts where student_id=p_student for update;
  if found then
   select * into b from efg_private.guide_source_bindings where student_id=p_student for update;
   if b.student_id is null or d.coach_id is distinct from auth.uid()
    or b.coach_id is distinct from auth.uid() or d.organization_id is distinct from i.organization_id
    or b.organization_id is distinct from i.organization_id or d.status is distinct from 'draft'
    or b.draft_revision is distinct from d.draft_revision
    or (b.intake_revision is not distinct from i.revision and b.health_revision is not distinct from h.revision)
   then raise exception 'Draft already exists or version changed; reload before editing' using errcode='PT409'; end if;
   expected:=d.draft_revision;
  end if;
 end if;
 r:=public.efg_save_coach_plan_draft(p_student,p_goal,null,i.updated_at,i.revision,expected);
 insert into efg_private.guide_source_bindings values(p_student,auth.uid(),i.organization_id,i.revision,h.revision,r,
  p_preferred,p_disliked,p_food_ids,efg_private.guide_catalog_digest(p_food_ids),clock_timestamp())
 on conflict(student_id) do update set coach_id=excluded.coach_id,organization_id=excluded.organization_id,
 intake_revision=excluded.intake_revision,health_revision=excluded.health_revision,draft_revision=excluded.draft_revision,
 preferred_ids=excluded.preferred_ids,disliked_ids=excluded.disliked_ids,food_ids=excluded.food_ids,
 catalog_digest=excluded.catalog_digest,created_at=excluded.created_at;
 delete from efg_private.clinical_compatibility_receipts where student_id=p_student;
 return r;
end $f$;

CREATE OR REPLACE FUNCTION public.efg_read_bound_guide(p_student uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $f$
declare b record; d record; foods jsonb; general jsonb; begin
 if auth.uid() is null or not efg_private.coach_has_student(p_student) then raise exception 'Denied' using errcode='42501'; end if;
 perform efg_private.clinical_lock_context(p_student);
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
  'compatibility',efg_private.clinical_snapshot(p_student),'restriction_declaration',case when (select conditions from efg_private.efg_coach_health_intakes where student_id=p_student)='{}'::jsonb then 'none_declared' else 'clinical_declared' end,'declaration',(select restriction_declaration from efg_private.efg_coach_health_intakes where student_id=p_student),'publishable',false);
end $f$;

CREATE OR REPLACE FUNCTION public.efg_save_bound_guide(p_student uuid,p_expected_draft bigint,p_catalog_digest text,p_guide jsonb)
returns bigint language plpgsql security definer set search_path='' as $f$
declare b record; d record; c jsonb; i record; r bigint; key text; target numeric; actual numeric; begin
 if auth.uid() is null or not efg_private.coach_has_student(p_student) then raise exception 'Denied' using errcode='42501'; end if;
 -- All writers lock intake -> health -> draft/binding in the same order.
 perform efg_private.clinical_lock_context(p_student);
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
 perform efg_private.clinical_bind_saved(p_student);
 return r;
end $f$;

CREATE OR REPLACE FUNCTION public.efg_publish_coach_plan_draft_atomic(
 p_student uuid,p_expected_revision bigint,p_request_id uuid)
returns uuid
language plpgsql security definer set search_path=''
as $coach119_publish$
declare
 v_coach uuid:=auth.uid();
 v_org uuid;
 v_enabled boolean:=false;
 v_intake public.efg_coach_relaunch_intakes%rowtype;
 v_draft public.efg_coach_plan_drafts%rowtype;
 v_goal jsonb;
 v_guide jsonb;
 v_goal_id uuid;
 v_existing public.efg_coach_plan_publish_receipts%rowtype;
 v_food_ids text[];
 v_legal_count integer:=0;
 v_key text;
 v_value numeric;
 v_slot_count integer;
 v_distinct_slots integer;
begin
 select enabled into v_enabled from efg_private.coach_release_switches
 where switch_key='pilot_coach_atomic_publication';
 if v_enabled is distinct from true then
  raise exception 'Coach atomic publication has not been activated'
   using errcode='42501';
 end if;
 if v_coach is null or p_student is null or p_request_id is null or
  p_expected_revision is null or p_expected_revision<1 or
  not efg_private.coach_has_student(p_student) then
  raise exception 'Invalid or unauthorized Coach publication'
   using errcode='42501';
 end if;

 perform efg_private.clinical_lock_context(p_student);
 -- Student-scoped lock makes two devices and retries serialize.
 select a.organization_id into v_org
 from public.efg_student_plan_access a
 join public.efg_profiles p on p.user_id=a.student_id
 join public.efg_organizations o on o.id=p.organization_id
 where a.student_id=p_student and a.coach_id=v_coach
  and p.organization_id=a.organization_id and p.active and p.role='student'
  and o.coach_id=v_coach
 for update of a;
 if not found then
  raise exception 'Student is no longer assigned to this Coach'
   using errcode='42501';
 end if;

 -- The student's two unsigned-inferable pilot checkboxes and follow-up consent
 -- must still be valid. No acceptance is inferred from historical data.
 perform 1 from public.efg_pilot_participation_receipts r
 where r.student_id=p_student and r.organization_id=v_org
  and r.version='coach_pilot_2026_demo1'
  and r.acceptance_method='two_explicit_checkboxes'
  and r.participation_accepted and r.sharing_accepted
  and r.accepted_at is not null and r.revoked_at is null
 for share;
 if not found then raise exception 'Pilot participation/sharing missing or revoked'
   using errcode='42501'; end if;
 perform 1 from public.efg_consents c
 where c.student_id=p_student and c.organization_id=v_org and c.accepted
 for share;
 if not found then raise exception 'Coach follow-up consent missing or revoked'
   using errcode='42501'; end if;

 select i.* into v_intake from public.efg_coach_relaunch_intakes i
 where i.student_id=p_student and i.organization_id=v_org
  and i.completed_version='coach_major_2026_r1' and i.shared_at is not null
 for update of i;
 if not found then raise exception 'Current general intake not shared'
  using errcode='42501'; end if;

 -- Health before draft/binding: same ordering as prepare/save/recovery.
 perform 1 from efg_private.efg_coach_health_intakes where student_id=p_student for update;
 perform 1 from efg_private.efg_coach_health_documents where status='published' order by id for share;
 perform 1 from public.efg_legal_documents where is_current and kind in ('terms','privacy') order by id for share;
 perform 1 from public.efg_legal_acceptances where user_id in (p_student,v_coach) order by document_id,user_id for share;

 -- Require BOTH distinct document kinds (not two accepted copies of Terms).
 -- ALL CURRENT text versions must be cryptographically verifiable and accepted
 -- separately by both student and Coach. Never mistake these for medical consent.
 select pg_catalog.count(distinct d.kind) into v_legal_count
 from public.efg_legal_documents d
 join public.efg_legal_acceptances student_rec
  on student_rec.document_id=d.id and student_rec.user_id=p_student
 join public.efg_legal_acceptances coach_rec
  on coach_rec.document_id=d.id and coach_rec.user_id=v_coach
 where d.is_current and d.published_at is not null
  and d.kind in ('terms','privacy')
  and d.sha256=pg_catalog.encode(
   pg_catalog.sha256(pg_catalog.convert_to(d.body,'UTF8')),'hex');
 if v_legal_count<>2 then
  raise exception 'Current Terms and Privacy not explicitly accepted by both parties'
   using errcode='42501'; end if;

 -- Only a matching Coach-owned draft at the latest intake revision can publish.
 select draft.* into v_draft
 from public.efg_coach_plan_drafts draft
 where draft.student_id=p_student and draft.coach_id=v_coach
  and draft.organization_id=v_org
 for update of draft;
 if not found or v_draft.source_intake_updated_at is distinct from v_intake.updated_at
  or v_draft.source_intake_revision is distinct from v_intake.revision then
  raise exception 'Draft based on old or missing intake'
   using errcode='PT409'; end if;

 -- Idempotent retries with same signed Coach/Student/revision are harmless.
 select receipt.* into v_existing from public.efg_coach_plan_publish_receipts receipt
 where receipt.request_id=p_request_id;
 if found then
  if v_existing.student_id is distinct from p_student or
    v_existing.coach_id is distinct from v_coach or
    v_existing.organization_id is distinct from v_org or
    v_existing.draft_revision is distinct from p_expected_revision then
   raise exception 'Publication key reused with different owner/revision'
    using errcode='23505'; end if;
  return v_existing.goal_id;
 end if;
 if v_draft.status<>'draft' or v_draft.draft_revision<>p_expected_revision then
  raise exception 'Draft revision no longer publishable'
   using errcode='PT409'; end if;

 -- No replay path mutates: receipt return above remains idempotent. New writes
 -- revalidate the binding under row locks, and prevent a source/policy edit midflight.
 perform 1 from efg_private.guide_source_bindings where student_id=p_student for update;
 perform 1 from efg_private.coach_reviewed_foods food
  where food.food_id in (select jsonb_array_elements_text(v_draft.guide_proposal->'approvedFoodIds'))
   or exists(select 1 from efg_private.guide_source_bindings b where b.student_id=p_student and food.food_id=any(b.food_ids))
  order by food.food_id for share;
 perform 1 from efg_private.nutrition_import_policies where active order by policy_version for share;
 perform efg_private.coach119_validate_bound(p_student);
 if exists(select 1 from efg_private.guide_source_bindings where student_id=p_student) then
  perform efg_private.clinical_assert_publication(p_student);
 end if;

 v_goal:=v_draft.goal_proposal;
 v_guide:=v_draft.guide_proposal;
 if pg_catalog.jsonb_typeof(v_goal) is distinct from 'object'
  or v_goal->>'goal_type' not in ('fat_loss','recomp','muscle_gain','maintenance')
  or pg_catalog.jsonb_typeof(v_guide) is distinct from 'object'
  or v_guide->>'kind' is distinct from 'five_meal_example'
  or v_guide->>'version' is distinct from '1'
  or pg_catalog.jsonb_typeof(v_guide->'meals') is distinct from 'array'
  or pg_catalog.jsonb_array_length(v_guide->'meals')<>5 then
  raise exception 'Goal or five-meal guide missing or invalid' using errcode='22023';
 end if;
 foreach v_key in array array['kcal','protein_g','carb_g','fat_g','fiber_g'] loop
  if pg_catalog.jsonb_typeof(v_goal->v_key) is distinct from 'number' then
   raise exception 'Missing numeric goal field %',v_key using errcode='22023'; end if;
  v_value:=(v_goal->>v_key)::numeric;
  if v_value<>pg_catalog.trunc(v_value) or
   v_value < (case when v_key='kcal' then 1200 else 0 end) or
   v_value > (case v_key when 'kcal' then 10000 when 'carb_g' then 2000
      when 'fiber_g' then 150 else 1000 end) then
   raise exception 'Goal field out of range %',v_key using errcode='22023';
  end if;
 end loop;
 select count(*),count(distinct meal.value->>'slot')
  into v_slot_count,v_distinct_slots
 from pg_catalog.jsonb_array_elements(v_guide->'meals') as meal(value);
 if v_slot_count<>5 or v_distinct_slots<>5 or
  efg_private.coach_guide_foods_verified(v_guide) is distinct from true then
  raise exception 'Guide foods are not independently reviewed and current'
   using errcode='42501';
 end if;
 -- Require a reviewed, explicitly Coach-selected catalog (not just the
 -- five guide ingredients) before granting food-planning access.
 v_food_ids:=efg_private.coach119_reviewed_food_ids(v_guide);

 -- The private transaction marker, not the client-settable GUC alone,
 -- authorizes suppression. Verify spoofing and rollback in isolated staging.
 -- Only after every check do legacy notices suppress, for this transaction ONLY.
 insert into efg_private.coach119_atomic_transactions(txid,coach_id,student_id,draft_revision)
 values(pg_catalog.txid_current(),v_coach,p_student,p_expected_revision);
 perform pg_catalog.set_config('efg.coach_atomic_publish','on',true);
 insert into public.efg_goals(
  student_id,approved_by,goal_type,kcal,protein_g,carb_g,fat_g,fiber_g,
  start_on,approved_at
 ) values(
  p_student,v_coach,v_goal->>'goal_type',
  (v_goal->>'kcal')::integer,(v_goal->>'protein_g')::integer,
  (v_goal->>'carb_g')::integer,(v_goal->>'fat_g')::integer,
  (v_goal->>'fiber_g')::integer,
  (pg_catalog.now() at time zone 'America/Argentina/Buenos_Aires')::date,
  pg_catalog.clock_timestamp()
 ) returning id into v_goal_id;

 insert into public.efg_food_plans(
  student_id,coach_id,approved_food_ids,updated_at,
  guided_plan,guided_goal_id,guided_plan_approved_at
 ) values(
  p_student,v_coach,v_food_ids,pg_catalog.clock_timestamp(),
  v_guide,v_goal_id,pg_catalog.clock_timestamp()
 )
 on conflict(student_id) do update set
  coach_id=excluded.coach_id,
  -- The new, explicitly Coach-selected and currently reviewed catalog
  -- is authoritative. Never carry legacy IDs forward implicitly: an old
  -- selection may be expired, unreviewed, or no longer suitable for the
  -- student's current intake. The BEFORE UPDATE trigger archives the prior
  -- approved list together with the previous guide for audit/history.
  -- Re-approve any desired legacy item explicitly in approvedFoodIds.
  approved_food_ids=excluded.approved_food_ids,
  guided_plan=excluded.guided_plan,guided_goal_id=excluded.guided_goal_id,
  guided_plan_approved_at=excluded.guided_plan_approved_at,
  updated_at=excluded.updated_at;

 update public.efg_student_plan_access
 set status='published',published_goal_id=v_goal_id,
  published_at=pg_catalog.clock_timestamp(),published_by=v_coach,
  updated_at=pg_catalog.clock_timestamp()
 where student_id=p_student and organization_id=v_org and coach_id=v_coach;
 if not found then raise exception 'Student access changed mid-publication'
  using errcode='PT409'; end if;

 insert into public.efg_notifications(
  recipient_id,actor_id,kind,event_key,title,body,target_tab,target_student
 ) values(
  p_student,v_coach,'plan_update','coach_plan:'||v_goal_id::text,
  'Tu guía está lista','Tu coach aprobó tu nuevo objetivo y guía de alimentación.','home',p_student
 ) on conflict(recipient_id,event_key) do nothing;

 insert into public.efg_coach_plan_publish_receipts(
  request_id,student_id,organization_id,coach_id,draft_revision,goal_id
 ) values(p_request_id,p_student,v_org,v_coach,p_expected_revision,v_goal_id);

 update public.efg_coach_plan_drafts
 set status='published',updated_at=pg_catalog.clock_timestamp()
 where student_id=p_student and coach_id=v_coach and organization_id=v_org
  and draft_revision=p_expected_revision and status='draft';
 if not found then raise exception 'Concurrent draft change' using errcode='PT409'; end if;
 delete from efg_private.coach119_atomic_transactions
 where txid=pg_catalog.txid_current() and coach_id=v_coach;
 perform pg_catalog.set_config('efg.coach_atomic_publish','off',true);
 if exists(select 1 from efg_private.guide_source_bindings where student_id=p_student) then
  perform efg_private.clinical_assert_final_deadline(p_student,p_expected_revision);
 end if;
 return v_goal_id;
end;
$coach119_publish$;
COMMIT;
