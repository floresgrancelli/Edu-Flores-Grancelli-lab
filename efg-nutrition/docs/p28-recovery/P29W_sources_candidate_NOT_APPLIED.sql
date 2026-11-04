-- P29W candidate: EMPTY production reference registry. No approval or activation.
begin;
create table efg_private.coach_pilot_reviewed_foods(
 approval_id text primary key check(approval_id ~ '^[a-zA-Z0-9_-]{8,120}$'),
 food_name text not null check(length(food_name) between 3 and 200),
 approval_quote text not null check(length(approval_quote)>0),
 review_scope text not null check(review_scope='pilot_real'),
 revoked_at timestamptz,
 food_id text not null check(food_id ~ '^[a-zA-Z0-9_-]{1,100}$'),
 catalog_version text not null check(catalog_version ~ '^[a-zA-Z0-9._-]{3,80}$'),
 unit text not null check(unit in ('g','ml')),
 k numeric(10,6) not null check(k between 0 and 12),
 p numeric(10,6) not null check(p between 0 and 1),
 c numeric(10,6) not null check(c between 0 and 1),
 f numeric(10,6) not null check(f between 0 and 1),
 fi numeric(10,6) not null check(fi between 0 and 1),
 source_kind text not null check(source_kind in
   ('manufacturer_label','official_product','validated_composition')),
 -- PostgreSQL bounds regex repetitions at 255; check long URL length separately.
 source_url text not null check(source_url ~ '^https://[^[:space:]]+$'
   and pg_catalog.char_length(source_url) between 16 and 1998),
 evidence_id text not null unique check(evidence_id ~ '^[a-zA-Z0-9_-]{8,120}$'),
 evidence_status text not null default 'pending' check(evidence_status in ('pending','reviewed','rejected')),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 expires_at timestamptz,
 check(evidence_status<>'reviewed' or
   (reviewed_by is not null and reviewed_at is not null and expires_at is not null
    and expires_at>reviewed_at))
);
alter table efg_private.coach_pilot_reviewed_foods enable row level security;
revoke all on efg_private.coach_pilot_reviewed_foods from public,anon,authenticated;

create or replace function efg_private.coach_pilot_guide_foods_verified(p_guide jsonb)
returns boolean language plpgsql stable security invoker set search_path=''
as $verify$
declare
 v_meal jsonb;
 v_item jsonb;
 v_food efg_private.coach_pilot_reviewed_foods%rowtype;
 v_food_id text;
 v_units text;
 v_value numeric;
 v_key text;
 v_source numeric;
 v_slots text[] := '{}';
 v_items_count integer;
 v_count integer := 0;
begin
 if pg_catalog.jsonb_typeof(p_guide) is distinct from 'object'
  or pg_catalog.jsonb_typeof(p_guide->'meals') is distinct from 'array'
  or not (
   (p_guide->>'kind'='five_meal_example' and p_guide->>'version'='1'
    and pg_catalog.jsonb_array_length(p_guide->'meals')=5)
   or
   (p_guide->>'kind'='flexible_meal_guide' and p_guide->>'version'='2'
    and pg_catalog.jsonb_array_length(p_guide->'meals') between 2 and 6)
  ) then
   return false;
 end if;
 for v_meal in select value from pg_catalog.jsonb_array_elements(p_guide->'meals') loop
  if pg_catalog.jsonb_typeof(v_meal) is distinct from 'object'
   or v_meal->>'slot' is null or v_meal->>'slot' not in
    ('desayuno','media_manana','almuerzo','media_tarde','merienda','cena')
   or v_meal->>'slot'=any(v_slots)
   or pg_catalog.jsonb_typeof(v_meal->'items') is distinct from 'array' then
   return false;
  end if;
  v_slots:=pg_catalog.array_append(v_slots,v_meal->>'slot');
  v_items_count:=pg_catalog.jsonb_array_length(v_meal->'items');
  if v_items_count not between 1 and 15 then return false; end if;
  for v_item in select value from pg_catalog.jsonb_array_elements(v_meal->'items') loop
   v_count:=v_count+1;
   if v_count>90 or pg_catalog.jsonb_typeof(v_item) is distinct from 'object'
    or v_item->>'id' is null or v_item->>'unit' is null
    or v_item->>'id' !~ '^[a-zA-Z0-9_-]{1,100}$'
    or v_item->>'unit' not in ('g','ml')
    or pg_catalog.jsonb_typeof(v_item->'qty') is distinct from 'number' then
     return false;
   end if;
   if (v_item->>'qty')::numeric<=0 or (v_item->>'qty')::numeric>1000 then
    return false;
   end if;
   v_food_id:=v_item->>'id';
   v_units:=v_item->>'unit';
   select * into v_food from efg_private.coach_pilot_reviewed_foods
    where food_id=v_food_id and unit=v_units
      and approval_id=v_item->>'sourceApprovalId' and revoked_at is null
      and source_url=v_item->>'sourceUrl' and food_name=v_item->>'name'
      and evidence_status='reviewed'
      and reviewed_by is not null and reviewed_at is not null
      and expires_at>pg_catalog.now() and reviewed_at<=pg_catalog.now();
   if not found then return false; end if;
   foreach v_key in array array['k','p','c','f','fi'] loop
    if pg_catalog.jsonb_typeof(v_item->v_key) is distinct from 'number' then
     return false;
    end if;
    v_value:=(v_item->>v_key)::numeric;
    v_source:=(case v_key
      when 'k' then v_food.k when 'p' then v_food.p
      when 'c' then v_food.c when 'f' then v_food.f else v_food.fi end);
    if v_value<0 or abs(v_value-v_source) >
      (case when v_key='k' then 0.01 else 0.003 end) then
     return false;
    end if;
   end loop;
  end loop;
 end loop;
 return pg_catalog.cardinality(v_slots)=pg_catalog.jsonb_array_length(p_guide->'meals')
    and v_count>=pg_catalog.jsonb_array_length(p_guide->'meals');
end
$verify$;
revoke all on function efg_private.coach_pilot_guide_foods_verified(jsonb)
 from public,anon,authenticated;

create function public.efg_coach_pilot_food_sources(p_student uuid,p_food_ids text[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not efg_private.coach_has_student(p_student) then
  raise exception 'Unauthorized source request' using errcode='42501'; end if;
 if p_food_ids is null or cardinality(p_food_ids) not between 1 and 90
 or exists(select 1 from unnest(p_food_ids) id where id is null or id !~ '^[a-zA-Z0-9_-]{1,100}$') then
  raise exception 'Invalid source ids' using errcode='22023'; end if;
 -- Never repurpose a QA enrollment, including an expired one, for real pilot sources.
 if exists(select 1 from efg_private.p29_qa_release_scope where student_id=p_student) then
  raise exception 'QA enrollment cannot use real pilot source approval' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',food_id,'name',food_name,'unit',unit,'k',k,'p',p,'c',c,'f',f,'fi',fi,
  'sourceType',source_kind,'sourceUrl',source_url,'sourceApprovalId',approval_id,'scope',review_scope,
  'reviewedAt',reviewed_at,'expiresAt',expires_at) order by food_id),'[]'::jsonb)
 into result from (
  select distinct on(food_id) * from efg_private.coach_pilot_reviewed_foods
  where food_id=any(p_food_ids) and evidence_status='reviewed' and revoked_at is null
   and reviewed_by is not null and reviewed_at<=now() and expires_at>now()
  order by food_id,reviewed_at desc,approval_id desc
 ) sources;
 return result;
end $$;
revoke all on function public.efg_coach_pilot_food_sources(uuid,text[]) from public,anon,authenticated;
grant execute on function public.efg_coach_pilot_food_sources(uuid,text[]) to authenticated;
do $$ begin if md5(pg_get_functiondef('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)'::regprocedure))<>'c49d9e2557a9dcdcecd1e812cc2bd54f' then raise exception 'P29W atomic function drift'; end if; end $$;
CREATE OR REPLACE FUNCTION public.efg_publish_coach_plan_draft_atomic(p_student uuid, p_expected_revision bigint, p_request_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_coach uuid:=auth.uid();
 v_org uuid;
 v_enabled boolean:=false;
 v_is_qa boolean:=false;
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
 v_is_qa:=efg_private.p29_qa_scope_required(p_student,'coach');
 if v_is_qa then v_enabled:=true; end if;
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
 -- The signed atomic RPC also enforces required nutrition fields. Neither a
 -- legacy shared_at timestamp nor a previously valid browser is sufficient.
 if v_intake.objective is null or v_intake.age_years is null
  or v_intake.height_cm is null or v_intake.weight_kg is null
  or v_intake.activity_level is null or v_intake.dietary_pattern is null then
  raise exception 'NCC: current shared nutrition intake incomplete'
   using errcode='42501';
 end if;

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

 v_goal:=v_draft.goal_proposal;
 v_guide:=v_draft.guide_proposal;
 if pg_catalog.jsonb_typeof(v_goal) is distinct from 'object'
  or v_goal->>'goal_type' not in ('fat_loss','recomp','muscle_gain','maintenance')
  or pg_catalog.jsonb_typeof(v_guide) is distinct from 'object'
  or pg_catalog.jsonb_typeof(v_guide->'meals') is distinct from 'array'
  or not (
    (v_guide->>'kind'='five_meal_example' and v_guide->>'version'='1'
      and pg_catalog.jsonb_array_length(v_guide->'meals')=5)
    or
    (v_guide->>'kind'='flexible_meal_guide' and v_guide->>'version'='2'
      and pg_catalog.jsonb_array_length(v_guide->'meals') between 2 and 6)
  ) then
  raise exception 'Goal or versioned Dieta Guia missing or invalid' using errcode='22023';
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
 if not v_is_qa then
  perform 1 from efg_private.coach_pilot_reviewed_foods where approval_id in (
   select item.value->>'sourceApprovalId' from jsonb_array_elements(v_guide->'meals') meal(value)
   cross join lateral jsonb_array_elements(meal.value->'items') item(value)) for share;
 end if;
 select count(*),count(distinct meal.value->>'slot')
  into v_slot_count,v_distinct_slots
 from pg_catalog.jsonb_array_elements(v_guide->'meals') as meal(value);
 if v_slot_count<>pg_catalog.jsonb_array_length(v_guide->'meals')
   or v_distinct_slots<>v_slot_count or
   (case when v_is_qa then efg_private.coach_guide_foods_verified(v_guide)
     else efg_private.coach_pilot_guide_foods_verified(v_guide) end) is distinct from true then
  raise exception 'Guide foods are not independently reviewed and current'
   using errcode='42501';
 end if;
 -- Verify the guide's nutrient references only. The food catalog for a
 -- student's diary is unchanged and never restricted by this reference set.
 if v_is_qa then
  v_food_ids:=efg_private.coach119_reviewed_food_ids(v_guide);
 else
  select array_agg(distinct item.value->>'id' order by item.value->>'id') into v_food_ids
  from jsonb_array_elements(v_guide->'meals') meal(value)
  cross join lateral jsonb_array_elements(meal.value->'items') item(value);
  if jsonb_typeof(v_guide->'approvedFoodIds') is distinct from 'array' or
     (select array_agg(value #>> '{}' order by value #>> '{}') from jsonb_array_elements(v_guide->'approvedFoodIds'))
      is distinct from v_food_ids then
   raise exception 'Flexible guide references differ from its ingredients' using errcode='22023'; end if;
 end if;

 -- The private transaction marker, not the client-settable GUC alone,
 -- authorizes suppression. Verify spoofing and rollback in isolated staging.
 -- Only after every check do legacy notices suppress, for this transaction ONLY.
 insert into efg_private.coach119_atomic_transactions(txid,coach_id)
 values(pg_catalog.txid_current(),v_coach);
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
  -- Store the versioned guide's nutrient reference IDs for source audit.
  -- This is not a per-student catalog filter. The BEFORE UPDATE trigger
  -- archives the previous guide and reference set for history.
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
 return v_goal_id;
end;
$function$;

commit;
