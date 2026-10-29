-- EFG Nutrition Pro / PR37 - STAGING-ONLY dietary evidence and legal policy.
-- DRAFT DESIGN, NOT A MIGRATION. DO NOT EXECUTE ON PRODUCTION.
-- No reviewed foods or approved patients are seeded by this script.
-- This module is intentionally fail-closed. It cannot certify clinical safety.
-- Prerequisites: isolated/restorable staging, approved/versioned legal schema,
-- volunteer intake and current Coach authorization, independent review.
begin;

do $efg_food_policy_preflight$
begin
  if pg_catalog.to_regclass('public.efg_student_intakes') is null
     or pg_catalog.to_regclass('public.efg_legal_documents') is null
     or pg_catalog.to_regclass('public.efg_legal_acceptances') is null
     or pg_catalog.to_regclass('public.efg_consents') is null
     or pg_catalog.to_regnamespace('efg_private') is null then
    raise exception 'STAGING NOT READY: missing intakes, consent or versioned legal documents'
      using errcode='55000';
  end if;
  -- A browser user must never be able to fake acceptance by direct REST DML.
  if pg_catalog.has_table_privilege('authenticated','public.efg_legal_acceptances','INSERT')
    or pg_catalog.has_table_privilege('authenticated','public.efg_legal_acceptances','UPDATE')
    or pg_catalog.has_table_privilege('authenticated','public.efg_legal_acceptances','DELETE') then
    raise exception 'LEGAL UNSAFE: direct acceptance writes are still permitted'
      using errcode='42501';
  end if;
end
$efg_food_policy_preflight$;

-- Reviewers must audit the identity of each food (including preparation,
-- product/brand as relevant) and nutrients per g/ml, never copy client JSON
-- as proof. No assumption of gluten/allergy certification from macros.
create table efg_private.coach_reviewed_foods (
  food_id text primary key
    check(food_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  catalog_version text not null
    check(catalog_version ~ '^[A-Za-z0-9._-]{3,60}$'),
  unit text not null check(unit in ('g','ml')),
  k numeric(10,6) not null check(k between 0 and 12),
  p numeric(10,6) not null check(p between 0 and 1),
  c numeric(10,6) not null check(c between 0 and 1),
  f numeric(10,6) not null check(f between 0 and 1),
  fi numeric(10,6) not null check(fi between 0 and 1),
  source_kind text not null check(source_kind in
    ('manufacturer_label','official_product','validated_composition')),
  source_url text not null check(source_url ~ '^https://[^[:space:]]{5,1900}$'),
  evidence_id text not null unique
    check(evidence_id ~ '^[A-Za-z0-9_-]{8,120}$'),
  evidence_status text not null default 'pending'
    check(evidence_status in ('pending','reviewed','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  expires_at timestamptz,
  check(
    evidence_status <> 'reviewed' or
    (reviewed_by is not null and reviewed_at is not null
     and expires_at is not null and expires_at>reviewed_at)
  )
);
alter table efg_private.coach_reviewed_foods enable row level security;
revoke all on efg_private.coach_reviewed_foods from public,anon,authenticated;
-- Neither coach nor student can create "reviewed" evidence from their JWT.

-- Explicit dietary-pattern evidence is separate from energy/macros.
-- "allowed" is a reviewed compatibility claim for that particular
-- food formulation/pattern, NOT an allergy/celiac medical clearance.
create table efg_private.coach_food_pattern_reviews (
  food_id text not null references efg_private.coach_reviewed_foods(food_id),
  dietary_pattern text not null check(dietary_pattern in
    ('vegan','vegetarian','pescatarian')),
  verdict text not null default 'unknown'
    check(verdict in ('allowed','excluded','unknown')),
  catalog_version text not null,
  evidence_id text not null,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  expires_at timestamptz,
  primary key(food_id,dietary_pattern),
  check(verdict <> 'allowed' or
    (reviewed_by is not null and reviewed_at is not null
     and expires_at is not null and expires_at>reviewed_at
     and char_length(evidence_id)>=8))
);
alter table efg_private.coach_food_pattern_reviews enable row level security;
revoke all on efg_private.coach_food_pattern_reviews from public,anon,authenticated;

-- This is an administrative review of general nutrition suitability,
-- NOT a clinical diagnosis and NOT a patient's inferred absence of illness.
-- Default pending blocks all publication. Never store medical details here.
-- An approved review is invalidated by any new intake version.
create table efg_private.coach_publication_scope_reviews (
  student_id uuid primary key references public.efg_profiles(user_id) on delete cascade,
  organization_id uuid not null references public.efg_organizations(id),
  coach_id uuid not null references auth.users(id),
  intake_updated_at timestamptz not null,
  status text not null default 'pending'
    check(status in ('pending','general_guidance_reviewed','medical_review_required')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  check(status <> 'general_guidance_reviewed' or
    (reviewed_by is not null and reviewed_at is not null))
);
alter table efg_private.coach_publication_scope_reviews enable row level security;
revoke all on efg_private.coach_publication_scope_reviews from public,anon,authenticated;

-- Internal function called from the owner-controlled atomic publication RPC.
-- No GRANT EXECUTE to authenticated/anon and no direct REST exposure.
-- Never derive pattern, legal status, review IDs or macro composition from
-- the browser's p_goal/p_guide alone.
create function efg_private.coach_publication_policy_valid(
  p_student uuid,
  p_goal jsonb,
  p_guide jsonb,
  p_coach uuid
) returns boolean
language plpgsql volatile security invoker
set search_path=''
as $efg_food_policy$
declare
  v_org uuid;
  v_pattern text;
  v_intake_updated timestamptz;
  v_meal jsonb;
  v_item jsonb;
  v_food efg_private.coach_reviewed_foods%rowtype;
  v_rule efg_private.coach_food_pattern_reviews%rowtype;
  v_current_legal_count integer;
  v_accepted_count integer;
  v_key text;
  v_value numeric;
  v_expected numeric;
  v_items_count integer;
begin
  if p_student is null or p_coach is null or p_coach is distinct from auth.uid()
     or not efg_private.coach_has_student(p_student)
     or pg_catalog.jsonb_typeof(p_goal) is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_guide) is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_guide->'meals') is distinct from 'array' then
    return false;
  end if;

  -- Source-of-truth: intake pattern, sharing and server timestamp. Never use
  -- a client-provided list of medical exclusions to declare a food safe.
  select i.organization_id,i.dietary_pattern,i.updated_at
    into v_org,v_pattern,v_intake_updated
  from public.efg_student_intakes i
  join public.efg_profiles p on p.user_id=i.student_id
  join public.efg_organizations o on o.id=i.organization_id
  where i.student_id=p_student and i.shared_at is not null
    and p.organization_id=i.organization_id and p.role='student'
    and p.active and o.coach_id=p_coach;
  if not found or v_pattern is null or
      v_pattern not in ('omnivore','vegetarian','vegan','pescatarian') then
    return false;
  end if;

  -- Every student must have a real, current server-owned scope review.
  -- Pending, changed intake, undisclosed/complex needs => do not publish.
  perform 1 from efg_private.coach_publication_scope_reviews s
  where s.student_id=p_student and s.organization_id=v_org
    and s.coach_id=p_coach and s.intake_updated_at=v_intake_updated
    and s.status='general_guidance_reviewed'
    and s.reviewed_by is not null and s.reviewed_at is not null;
  if not found then return false; end if;

  -- Exactly the current published es-AR terms and privacy versions,
  -- not any older document. Require actual server-registered acceptance by
  -- BOTH coach and student; following and sharing permissions remain separate.
  with current_docs as (
    select distinct on (d.kind)
      d.id,d.kind,d.version,d.sha256,d.published_at
    from public.efg_legal_documents d
    where d.kind in ('terms','privacy') and d.locale='es-AR'
      and d.status='published' and d.published_at<=now()
      and d.effective_at<=now()
      and (d.retired_at is null or d.retired_at>now())
    order by d.kind,d.effective_at desc,d.published_at desc,d.id desc
  )
  select count(*),
     count(*) filter(
       where exists (
         select 1 from public.efg_legal_acceptances a
         where a.document_id=current_docs.id
           and a.user_id=p_student
           and a.document_hash_sha256=current_docs.sha256
           and a.version=current_docs.version and a.kind=current_docs.kind
           and a.acceptance_method='explicit_checkbox'
           and a.accepted_at>=current_docs.published_at
       ) and exists (
         select 1 from public.efg_legal_acceptances a
         where a.document_id=current_docs.id
           and a.user_id=p_coach
           and a.document_hash_sha256=current_docs.sha256
           and a.version=current_docs.version and a.kind=current_docs.kind
           and a.acceptance_method='explicit_checkbox'
           and a.accepted_at>=current_docs.published_at
       )
     )
    into v_current_legal_count,v_accepted_count
  from current_docs;
  if v_current_legal_count<>2 or v_accepted_count<>2 then
    return false;
  end if;

  -- Every item in all five meals needs a CURRENT reviewed food entry, genuine
  -- per-unit nutrients and (for excluding patterns) a matching reviewed rule.
  -- "unknown" is NEVER a green/allowed decision and blocks publishing.
  for v_meal in
    select value from pg_catalog.jsonb_array_elements(p_guide->'meals')
  loop
    if pg_catalog.jsonb_typeof(v_meal->'items') is distinct from 'array'
      then return false; end if;
    v_items_count := pg_catalog.jsonb_array_length(v_meal->'items');
    if v_items_count<1 or v_items_count>15 then return false; end if;

    for v_item in
      select value from pg_catalog.jsonb_array_elements(v_meal->'items')
    loop
      if pg_catalog.jsonb_typeof(v_item) is distinct from 'object'
        or pg_catalog.jsonb_typeof(v_item->'id') is distinct from 'string'
        or pg_catalog.jsonb_typeof(v_item->'unit') is distinct from 'string'
        or pg_catalog.jsonb_typeof(v_item->'qty') is distinct from 'number'
        then return false; end if;
      if (v_item->>'id') !~ '^[A-Za-z0-9_-]{1,100}$'
        or (v_item->>'qty')::numeric<=0
        or (v_item->>'qty')::numeric>1000 then return false; end if;

      select food.* into v_food from efg_private.coach_reviewed_foods food
      where food.food_id=v_item->>'id'
        and food.evidence_status='reviewed'
        and food.reviewed_by is not null
        and food.reviewed_at<=now()
        and food.expires_at>now()
        and food.unit=v_item->>'unit';
      if not found then return false; end if;

      foreach v_key in array array['k','p','c','f','fi'] loop
        if pg_catalog.jsonb_typeof(v_item->v_key) is distinct from 'number'
          then return false; end if;
        v_value := (v_item->>v_key)::numeric;
        v_expected := case v_key
          when 'k' then v_food.k when 'p' then v_food.p
          when 'c' then v_food.c when 'f' then v_food.f
          else v_food.fi end;
        -- 0.001 per g/ml tolerance accommodates rounding, not substitutions.
        if pg_catalog.abs(v_value-v_expected)>0.001 then
          return false;
        end if;
      end loop;

      if v_pattern<>'omnivore' then
        select rule.* into v_rule
        from efg_private.coach_food_pattern_reviews rule
        where rule.food_id=v_food.food_id
          and rule.dietary_pattern=v_pattern
          and rule.catalog_version=v_food.catalog_version
          and rule.verdict='allowed'
          and rule.reviewed_by is not null
          and rule.reviewed_at<=now()
          and rule.expires_at>now();
        if not found then return false; end if;
      end if;
    end loop;
  end loop;
  return true;
end
$efg_food_policy$;

revoke all on function efg_private.coach_publication_policy_valid(
  uuid,jsonb,jsonb,uuid) from public,anon,authenticated;
commit;

-- Staging acceptance required BEFORE production:
-- * Fill only reviewed test fixtures with verified sources and reviewer ids;
--   no automatic bulk-catalog import, no assumption of product certification.
-- * Test expired evidence, forged client JSON, unknown rule, vegan vs animal,
--   changed intake/consent, old legal version, missing coach acceptance.
-- * No clinical/medical clearance is granted by a pattern assessment.
-- * Confirm efg_legal_documents/efg_legal_acceptances API policies prevent
--   inserts or spoofing from JWT, and content/hash/version are immutable.
-- * No Personal/Autogestión enablement, no diagnosis, no semaforo "green"
--   until source review, clinical/legal sign-off and whole-app QA.
-- * Run genuine JWT A/B and parse/execute SQL in isolated PostgreSQL first.
