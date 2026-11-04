-- Ephemeral PostgreSQL CI only. Synthetic users/claims, NEVER a real JWT.
-- Expected success and denial tests for atomic Coach publication and policy.
-- Requires bootstrap -> Coach draft -> food policy -> atomic scripts.

insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000011'),
 ('00000000-0000-4000-8000-000000000022'),
 ('00000000-0000-4000-8000-000000000099');
insert into public.efg_organizations(id,coach_id,name) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Synthetic organization A'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Synthetic organization B');
insert into public.efg_profiles(user_id,email,nickname,organization_id,role) values
 ('00000000-0000-4000-8000-000000000001','coach-a@example.invalid','Coach A',null,'coach'),
 ('00000000-0000-4000-8000-000000000002','coach-b@example.invalid','Coach B',null,'coach'),
 ('00000000-0000-4000-8000-000000000011','student-a@example.invalid','Student A','10000000-0000-4000-8000-000000000001','student'),
 ('00000000-0000-4000-8000-000000000022','student-b@example.invalid','Student B','10000000-0000-4000-8000-000000000002','student');
insert into public.efg_consents(student_id,organization_id,accepted) values
 ('00000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001',true),
 ('00000000-0000-4000-8000-000000000022','10000000-0000-4000-8000-000000000002',true);
insert into public.efg_student_plan_access(student_id,organization_id,coach_id,status) values
 ('00000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','pending'),
 ('00000000-0000-4000-8000-000000000022','10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','pending');
insert into public.efg_student_intakes(student_id,organization_id,dietary_pattern,shared_at)
values
 ('00000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001','vegetarian',now()),
 ('00000000-0000-4000-8000-000000000022','10000000-0000-4000-8000-000000000002','omnivore',now());

-- The client payload is NOT evidence. This single food is synthetic.
-- No clinical green/medical certification is claimed from these fixtures.
create table public.efg_test_payload(
 student_id uuid primary key, expected_intake_updated timestamptz,
 goal jsonb not null, guide jsonb not null
);
insert into public.efg_test_payload(student_id,expected_intake_updated,goal,guide)
select i.student_id,i.updated_at,
 '{"goal_type":"maintenance","kcal":2000,"protein_g":120,"carb_g":250,"fat_g":70,"fiber_g":30}'::jsonb,
 jsonb_build_object('kind','five_meal_example','version',1,
 'meals',(
   select jsonb_agg(jsonb_build_object(
     'slot',slot,'items',jsonb_build_array(jsonb_build_object(
       'id','tofu_firm','unit','g','qty',100,
       'k',0.8,'p',0.1,'c',0.03,'f',0.04,'fi',0.02))
   ))
   from unnest(array['desayuno','media_manana','almuerzo','merienda','cena']) slot
 ))
from public.efg_student_intakes i;
grant select on public.efg_test_payload to authenticated;

-- Auth user is simulated only via custom GUC; this is NOT a signed JWT.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';

do $test_draft$
declare v_revision bigint;
begin
 select public.efg_save_coach_plan_draft(
   f.student_id,f.goal,f.guide,f.expected_intake_updated,null
 ) into v_revision
 from public.efg_test_payload f
 where f.student_id='00000000-0000-4000-8000-000000000011';
 if v_revision<>1 then raise exception 'Draft save revision expected 1'; end if;
end
$test_draft$;

-- Unknown/unchecked evidence & missing legal acceptance must STOP publication.
do $test_denial$
declare v_failed boolean:=false;
begin
 begin
  perform public.efg_publish_coach_plan_draft(
    '00000000-0000-4000-8000-000000000011',1,
    '30000000-0000-4000-8000-000000000001');
 exception when others then v_failed:=true;
 end;
 if not v_failed then raise exception 'Unsafe draft unexpectedly published'; end if;
end
$test_denial$;

-- Coach A must NEVER write student B.
do $test_crossorg$
declare v_failed boolean:=false;
begin
 begin
  perform public.efg_save_coach_plan_draft(
    f.student_id,f.goal,f.guide,f.expected_intake_updated,null
  ) from public.efg_test_payload f
  where f.student_id='00000000-0000-4000-8000-000000000022';
 exception when others then v_failed:=true;
 end;
 if not v_failed then raise exception 'Cross-organization draft write succeeded'; end if;
end
$test_crossorg$;

-- Direct REST-style INSERT in published goals must be impossible.
do $test_directwrite$
declare v_failed boolean:=false;
begin
 begin
  insert into public.efg_goals(student_id,approved_by,goal_type,kcal,protein_g,carb_g,fat_g,fiber_g)
  values ('00000000-0000-4000-8000-000000000011',
          '00000000-0000-4000-8000-000000000001',
          'maintenance',2000,120,250,70,30);
 exception when insufficient_privilege then v_failed:=true;
 end;
 if not v_failed then raise exception 'Direct goal INSERT bypass succeeded'; end if;
end
$test_directwrite$;

reset role;

-- Server-owned professional/source review and legal acceptance: FIXTURES ONLY.
insert into efg_private.coach_reviewed_foods(
 food_id,catalog_version,unit,k,p,c,f,fi,source_kind,source_url,
 evidence_id,evidence_status,reviewed_by,reviewed_at,expires_at
) values('tofu_firm','staging1','g',0.8,0.1,0.03,0.04,0.02,
 'validated_composition','https://example.org/testing-only-evidence',
 'stageTofu01','reviewed','00000000-0000-4000-8000-000000000099',
 now()-interval '1 day',now()+interval '2 days');
insert into efg_private.coach_food_pattern_reviews(
 food_id,dietary_pattern,verdict,catalog_version,evidence_id,reviewed_by,reviewed_at,expires_at
) values('tofu_firm','vegetarian','allowed','staging1','stageTofu01',
 '00000000-0000-4000-8000-000000000099',
 now()-interval '1 day',now()+interval '2 days');
insert into efg_private.coach_publication_scope_reviews(
 student_id,organization_id,coach_id,intake_updated_at,status,reviewed_by,reviewed_at
)
select i.student_id,i.organization_id,'00000000-0000-4000-8000-000000000001',
 i.updated_at,'general_guidance_reviewed',
 '00000000-0000-4000-8000-000000000099',now()
from public.efg_student_intakes i
where i.student_id='00000000-0000-4000-8000-000000000011';
insert into public.efg_legal_documents(
 id,kind,version,sha256,locale,published_at,effective_at,status
) values
 ('20000000-0000-4000-8000-000000000001','terms','v1','synthetic_terms_hash','es-AR',now()-interval '2 days',now()-interval '1 day','published'),
 ('20000000-0000-4000-8000-000000000002','privacy','v1','synthetic_privacy_hash','es-AR',now()-interval '2 days',now()-interval '1 day','published');
insert into public.efg_legal_acceptances(user_id,document_id,acceptance_method,document_hash_sha256,version,kind)
select user_id,d.id,'explicit_checkbox',d.sha256,d.version,d.kind
from (
 select '00000000-0000-4000-8000-000000000001'::uuid user_id
 union all select '00000000-0000-4000-8000-000000000011'::uuid
) u cross join public.efg_legal_documents d;

set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
-- Atomic publication: exactly one goal + guide + access + notification + receipt.
select public.efg_publish_coach_plan_draft(
 '00000000-0000-4000-8000-000000000011',1,
 '30000000-0000-4000-8000-000000000001') as first_goal_id;
-- Idempotent same-key retry: no duplicate goal or second notification.
select public.efg_publish_coach_plan_draft(
 '00000000-0000-4000-8000-000000000011',1,
 '30000000-0000-4000-8000-000000000001') as same_goal_id;
reset role;

do $assert_publish$
declare v_total integer;
begin
 select count(*) into v_total from public.efg_goals;
 if v_total<>1 then raise exception 'Expected 1 goal, found %',v_total; end if;
 select count(*) into v_total from public.efg_notifications;
 if v_total<>1 then raise exception 'Expected 1 notification, found %',v_total; end if;
 select count(*) into v_total from public.efg_coach_plan_publish_receipts;
 if v_total<>1 then raise exception 'Expected 1 receipt, found %',v_total; end if;
 select count(*) into v_total
 from public.efg_student_plan_access a
 join public.efg_food_plans p on p.student_id=a.student_id
 where a.status='published' and a.published_goal_id=p.guided_goal_id
   and p.guided_plan is not null and p.guided_plan_approved_at is not null;
 if v_total<>1 then raise exception 'Plan access/guide/goal not published atomically'; end if;
end
$assert_publish$;

-- Reopen a private revision; the old approved goal remains visible.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $test_reopen$
declare v_revision bigint;
begin
 select public.efg_save_coach_plan_draft(
   f.student_id,f.goal,f.guide,f.expected_intake_updated,1
 ) into v_revision
 from public.efg_test_payload f
 where f.student_id='00000000-0000-4000-8000-000000000011';
 if v_revision<>2 then raise exception 'Expected next draft revision 2'; end if;
end
$test_reopen$;
reset role;
update public.efg_consents set accepted=false
where student_id='00000000-0000-4000-8000-000000000011';

set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $test_revoke$
declare v_failed boolean:=false;
begin
 begin
  perform public.efg_publish_coach_plan_draft(
   '00000000-0000-4000-8000-000000000011',2,
   '30000000-0000-4000-8000-000000000002');
 exception when others then v_failed:=true;
 end;
 if not v_failed then raise exception 'Revoked Coach consent allowed publication'; end if;
end
$test_revoke$;
reset role;

do $assert_final$
begin
 if (select count(*) from public.efg_goals)<>1
 or (select count(*) from public.efg_notifications)<>1
 or (select count(*) from public.efg_coach_plan_publish_receipts)<>1
 or (select status from public.efg_coach_plan_drafts
     where student_id='00000000-0000-4000-8000-000000000011')<>'draft' then
    raise exception 'Failure path mutated active plan or notification';
 end if;
end
$assert_final$;
select 'PASS: ephemeral PostgreSQL 2-org synthetic claim, fail-closed policy, atomic publish, idempotency, direct write denial, revoked consent' as result;
