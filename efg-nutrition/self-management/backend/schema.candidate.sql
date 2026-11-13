-- CANDIDATE ONLY. Do not apply to a hosted project before integration/release QA.
-- Independent space does not mutate efg_profiles, Coach plans or diary records.
begin;
create schema ncc_self_private;
revoke all on schema ncc_self_private from public,anon,authenticated;
grant usage on schema ncc_self_private to service_role;

create table public.ncc_self_accounts(
 user_id uuid primary key references auth.users(id) on delete cascade,
 mode text not null default 'independent' check(mode in ('independent','coach_linked','paused')),
 active boolean not null default true,
 legal_version text not null check(length(legal_version) between 1 and 100),
 created_at timestamptz not null default now()
);
create table public.ncc_self_intakes(
 user_id uuid not null references public.ncc_self_accounts(user_id) on delete cascade,
 revision integer not null check(revision>0),
 request_id text not null check(request_id ~ '^[a-zA-Z0-9_-]{8,100}$'),
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<16000),
 created_at timestamptz not null default now(),
 primary key(user_id,revision),unique(user_id,request_id)
);
create table public.ncc_self_results(
 user_id uuid not null references public.ncc_self_accounts(user_id) on delete cascade,
 revision integer not null check(revision>0),
 request_id text not null check(request_id ~ '^[a-zA-Z0-9_-]{8,100}$'),
 intake_revision integer not null,
 result jsonb not null check(jsonb_typeof(result)='object' and octet_length(result::text)<100000),
 created_at timestamptz not null default now(),
 primary key(user_id,revision),unique(user_id,request_id),
 foreign key(user_id,intake_revision) references public.ncc_self_intakes(user_id,revision)
);
alter table public.ncc_self_accounts enable row level security;
alter table public.ncc_self_intakes enable row level security;
alter table public.ncc_self_results enable row level security;
revoke all on public.ncc_self_accounts,public.ncc_self_intakes,public.ncc_self_results from public,anon,authenticated;
grant select on public.ncc_self_accounts,public.ncc_self_intakes,public.ncc_self_results to authenticated;
grant all on public.ncc_self_accounts,public.ncc_self_intakes,public.ncc_self_results to service_role;
create policy ncc_self_account_owner on public.ncc_self_accounts for select to authenticated using(user_id=(select auth.uid()));
create policy ncc_self_intake_owner on public.ncc_self_intakes for select to authenticated using(user_id=(select auth.uid()));
create policy ncc_self_result_owner on public.ncc_self_results for select to authenticated using(user_id=(select auth.uid()));

-- No SECURITY DEFINER functions. Only verified server requests may call these
-- RPCs using service_role. The browser must never receive this credential.
create function ncc_self_private.assert_eligible(p_user uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare v_profile public.efg_profiles%rowtype;
begin
 if current_user<>'service_role' then raise exception 'Server only' using errcode='42501'; end if;
 -- service_role has no SELECT on auth.users in the hosted project. Keep that
 -- restriction: Auth is verified by the server, and the account FK enforces
 -- existence/cascade erasure without broadening access to the Auth schema.
 if p_user is null then
  raise exception 'Auth identity required' using errcode='42501';
 end if;
 select * into v_profile from public.efg_profiles where user_id=p_user for update;
 if found and (v_profile.role not in ('coach','admin') or not v_profile.active) then
  raise exception 'Existing coached or inactive profile cannot use independent generation' using errcode='42501';
 end if;
end $$;
revoke all on function ncc_self_private.assert_eligible(uuid) from public,anon,authenticated;
grant execute on function ncc_self_private.assert_eligible(uuid) to service_role;

create function public.ncc_self_register(p_user uuid,p_legal_version text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform ncc_self_private.assert_eligible(p_user);
 if p_legal_version is null or length(p_legal_version) not between 1 and 100 then
  raise exception 'Verified legal receipt required' using errcode='22023';
 end if;
 -- Server must verify current legal acceptance before calling; clients cannot.
 insert into public.ncc_self_accounts(user_id,legal_version) values(p_user,p_legal_version)
 on conflict(user_id) do nothing;
end $$;
revoke all on function public.ncc_self_register(uuid,text) from public,anon,authenticated;
grant execute on function public.ncc_self_register(uuid,text) to service_role;

create function public.ncc_self_save_intake(p_user uuid,p_request_id text,p_expected_revision integer,p_data jsonb)
returns integer language plpgsql security invoker set search_path='' as $$
declare v_latest integer;v_old public.ncc_self_intakes%rowtype;v_key text;v_base jsonb;v_data jsonb;
 v_allowed text[]:=array['objective','age_years','height_cm','weight_kg','activity_level',
 'dietary_pattern','eating_window','preferred_foods','disliked_foods','meal_routine','notes',
 'sex_for_equation','disliked_food_ids','processingConsent','pregnantOrBreastfeeding',
 'clinicalCareRequired','eatingDisorderHistory','restrictionDeclaration','health_flags'];
begin
 perform ncc_self_private.assert_eligible(p_user);
 perform 1 from public.ncc_self_accounts where user_id=p_user and active and mode='independent' for update;
 if not found then raise exception 'Independent active space required' using errcode='42501'; end if;
 if p_request_id is null or p_request_id !~ '^[a-zA-Z0-9_-]{8,100}$' or
  p_expected_revision is null or p_expected_revision<0 or p_data is null or
  jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>=16000 or
  p_data->'processingConsent' is distinct from 'true'::jsonb then
  raise exception 'Invalid or unconsented intake' using errcode='22023';
 end if;
 for v_key in select jsonb_object_keys(p_data) loop
  if not(v_key=any(v_allowed)) then raise exception 'Unexpected intake field' using errcode='22023'; end if;
 end loop;
 select coalesce(max(revision),0) into v_latest from public.ncc_self_intakes where user_id=p_user;
 select data into v_base from public.ncc_self_intakes where user_id=p_user and revision=p_expected_revision;
 -- Missing fields are a patch, explicit JSON null is an intentional removal.
 -- Preserve the previous private form instead of asking for unchanged data again.
 v_data:=coalesce(v_base,'{}'::jsonb)||p_data;
 if octet_length(v_data::text)>=16000 then raise exception 'Intake too large' using errcode='22023'; end if;
 select * into v_old from public.ncc_self_intakes where user_id=p_user and request_id=p_request_id;
 if found then
  if v_old.revision<>p_expected_revision+1 or v_old.data<>v_data or v_old.revision<>v_latest then
   raise exception 'Request ID reused with different data' using errcode='PT409';
  end if;
  return v_old.revision;
 end if;
 if v_latest<>p_expected_revision then raise exception 'Intake changed on another device' using errcode='PT409'; end if;
 insert into public.ncc_self_intakes(user_id,revision,request_id,data)
 values(p_user,v_latest+1,p_request_id,v_data);
 return v_latest+1;
end $$;
revoke all on function public.ncc_self_save_intake(uuid,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.ncc_self_save_intake(uuid,text,integer,jsonb) to service_role;

create function public.ncc_self_commit_plan(p_user uuid,p_request_id text,p_intake_revision integer,p_result jsonb)
returns integer language plpgsql security invoker set search_path='' as $$
declare v_latest integer;v_revision integer;v_old public.ncc_self_results%rowtype;
 v_meals integer;v_distinct integer;v_valid integer;v_key text;v_goal jsonb;
begin
 perform ncc_self_private.assert_eligible(p_user);
 perform 1 from public.ncc_self_accounts where user_id=p_user and active and mode='independent' for update;
 if not found then raise exception 'Independent active space required' using errcode='42501'; end if;
 select coalesce(max(revision),0) into v_latest from public.ncc_self_intakes where user_id=p_user;
 if p_intake_revision is distinct from v_latest or v_latest=0 then
  raise exception 'Intake changed during generation' using errcode='PT409';
 end if;
 if p_request_id is null or p_request_id !~ '^[a-zA-Z0-9_-]{8,100}$' or
  p_result is null or jsonb_typeof(p_result)<>'object' or octet_length(p_result::text)>=100000 or
  p_result->>'version' is distinct from 'self-management-r1-20261113' or
  jsonb_typeof(p_result->'goal') is distinct from 'object' or
  p_result#>>'{guide,kind}' is distinct from 'flexible_meal_guide' or
  p_result#>>'{guide,createdFrom}' is distinct from 'self_managed_estimate' or
  p_result#>'{guide,coachReviewed}' is distinct from 'false'::jsonb or
  jsonb_typeof(p_result#>'{guide,meals}') is distinct from 'array' then
  raise exception 'Invalid automatic guide envelope' using errcode='22023';
 end if;
 v_goal:=p_result->'goal';
 if v_goal->>'goal_type' is null or v_goal->>'goal_type' not in('fat_loss','recomp','muscle_gain','maintenance') then
  raise exception 'Invalid goal type' using errcode='22023';
 end if;
 foreach v_key in array array['kcal','protein_g','carb_g','fat_g','fiber_g'] loop
  if jsonb_typeof(v_goal->v_key) is distinct from 'number' or (v_goal->>v_key)::numeric<=0 then
   raise exception 'Invalid numeric goal' using errcode='22023';
  end if;
 end loop;
 select count(*),count(distinct m->>'slot'),count(*) filter(where
  m->>'slot' in ('desayuno','media_manana','almuerzo','media_tarde','merienda','cena') and
  case when jsonb_typeof(m->'items')='array' then jsonb_array_length(m->'items') between 1 and 15 else false end)
 into v_meals,v_distinct,v_valid from jsonb_array_elements(p_result#>'{guide,meals}') m;
 if v_meals<>6 or v_distinct<>6 or v_valid<>6 then raise exception 'Six distinct meals required' using errcode='22023'; end if;
 -- This is a structural persistence gate, not a nutrition calculation. The
 -- trusted server engine must validate catalog, quantities, eligibility and fit.
 select * into v_old from public.ncc_self_results where user_id=p_user and request_id=p_request_id;
 if found then
  if v_old.intake_revision<>p_intake_revision or v_old.result<>p_result then
   raise exception 'Request ID reused with different result' using errcode='PT409';
  end if;
  return v_old.revision;
 end if;
 select coalesce(max(revision),0)+1 into v_revision from public.ncc_self_results where user_id=p_user;
 -- One row, one transaction: goal and guide cannot be persisted separately.
 insert into public.ncc_self_results(user_id,revision,request_id,intake_revision,result)
 values(p_user,v_revision,p_request_id,p_intake_revision,p_result);
 return v_revision;
end $$;
revoke all on function public.ncc_self_commit_plan(uuid,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.ncc_self_commit_plan(uuid,text,integer,jsonb) to service_role;
commit;
