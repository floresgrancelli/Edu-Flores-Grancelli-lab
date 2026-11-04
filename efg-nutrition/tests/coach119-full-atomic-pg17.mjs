// Exact COACH119 RPC on disposable PG17. Synthetic identities/claims/data only.
// This verifies SQL transactions, not hosted schema parity or signed JWTs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync,spawn} from 'node:child_process';
import {installSql,preflightSelect} from '../scripts/p28-health-install-bundle.mjs';
import {GUIDE_MEALS} from '../pilot/guided-day.js';
assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.equal(process.env.PGHOST,'127.0.0.1');
assert.equal(process.env.PGPORT,'5432');
assert.equal(process.env.PGDATABASE,'efg_coach119_atomic');
for(const key of ['PGHOSTADDR','PGSERVICE','PGOPTIONS','SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD'])assert.ok(!process.env[key]);
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
function sql(s,deny=false){
 const r=spawnSync('psql',['-X','-Atq','-v','ON_ERROR_STOP=1'],{input:s,encoding:'utf8',timeout:30000});
 if(deny)assert.notEqual(r.status,0,'Expected refusal: '+s.slice(-120));
 else assert.equal(r.status,0,(r.stderr||'PG error').slice(-2000));
 return r.stdout.trim();
}
assert.equal(sql('select current_database()'),'efg_coach119_atomic');
assert.ok(sql('show server_version_num').startsWith('17'));
let bootstrap=read('./sql/coach-staging-bootstrap.sql').split('create table public.efg_legal_documents(')[0];
bootstrap=bootstrap.replace('create role anon nologin;','').replace('create role authenticated nologin;','');
sql(bootstrap);
sql(`create table public.efg_coach_relaunch_intakes(
 student_id uuid primary key references public.efg_profiles(user_id),organization_id uuid,
 completed_version text,revision integer,
  objective text,age_years integer,height_cm numeric(5,1),weight_kg numeric(5,1),
  activity_level text,dietary_pattern text,shared_at timestamptz,updated_at timestamptz);
create table public.efg_pilot_participation_receipts(
 student_id uuid,organization_id uuid,version text,acceptance_method text,
 participation_accepted boolean,sharing_accepted boolean,accepted_at timestamptz,revoked_at timestamptz);
create table efg_private.coach_release_switches(switch_key text primary key,enabled boolean,notes text);
create function public.efg_coach_pilot_entry_status() returns jsonb language sql as $$ select '{"route":"verify"}'::jsonb $$;
create function public.efg_notify_goal() returns trigger language plpgsql as $$begin return new; end$$;
create function public.efg_notify_food_guide() returns trigger language plpgsql as $$begin return new; end$$;
create trigger trg_efg_notify_goal after insert on public.efg_goals for each row execute function public.efg_notify_goal();
create trigger trg_efg_notify_food_guide after insert or update on public.efg_food_plans for each row execute function public.efg_notify_food_guide();
grant usage on schema efg_private to authenticated;
grant select on public.efg_consents,public.efg_coach_relaunch_intakes,public.efg_pilot_participation_receipts to authenticated;`);
for(const f of ['20261030_coach115_versioned_legal_documents_receipts.sql','20261030_coach_versioned_private_plan_drafts.sql','20261030_coach_reviewed_guide_nutrition_source.sql'])sql(read('../migrations/'+f));
// The current candidate repairs Coach draft SELECT using the actual existing
// receipt authorization helper, not public visibility of owner-only receipts.
const sharedIntake=read('../migrations/20261030_coach_relaunch_general_pilot_intake.sql');
const shareHelper=sharedIntake.match(/create or replace function efg_private\.coach_pilot_share_active\([\s\S]*?\$share\$;/);
assert.ok(shareHelper,'Exact current sharing helper required by atomic candidate');
sql(shareHelper[0]);
// Reproduce the installed broken constraint on the empty fixture, then test
// the exact additive repair separately from a clean-schema installation.
sql("alter table efg_private.coach_reviewed_foods drop constraint coach_reviewed_foods_source_url_check; alter table efg_private.coach_reviewed_foods add constraint coach_reviewed_foods_source_url_check check(source_url ~ '^https://[^[:space:]]{8,1990}$')");
sql(read('../migrations/20261031_coach_reviewed_food_url_constraint_fix_NOT_APPLIED.sql'));
sql(read('../docs/COACH119_HOSTED_ATOMIC_RELEASE_CANDIDATE_NOT_APPLIED.sql'));
const guideConstraint=sql("select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.efg_food_plans'::regclass and conname='efg_guided_plan_shape'");
assert.match(guideConstraint,/flexible_meal_guide/);
assert.match(guideConstraint,/five_meal_example/);
assert.match(guideConstraint,/jsonb_array_length/);
assert.equal(sql("select convalidated from pg_constraint where conrelid='public.efg_food_plans'::regclass and conname='efg_guided_plan_shape'"),'t',
 'The expanded constraint must be validated against ALL existing historic food plans');
const coach='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const student='33333333-3333-4333-8333-333333333333',studentB='44444444-4444-4444-8444-444444444444';
const org='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',orgB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const req='55555555-5555-4555-8555-555555555555',req2='66666666-6666-4666-8666-666666666666';
const when='2026-10-31T10:00:00Z';
const asUser=(id,s)=>`begin; set local role authenticated; set local "request.jwt.claim.sub"='${id}'; ${s}; commit;`;
const goal={goal_type:'recomp',kcal:2000,protein_g:130,carb_g:230,fat_g:62,fiber_g:28};
const guide={kind:'five_meal_example',version:1,approvedFoodIds:['food-a','food-b'],meals:['desayuno','media_manana','almuerzo','merienda','cena'].map(slot=>({slot,items:[{id:'food-a',unit:'g',qty:100,k:1,p:.1,c:.1,f:.02,fi:.01}]}))};
sql(`insert into auth.users values('${coach}'),('${other}'),('${student}'),('${studentB}');
insert into public.efg_organizations values('${org}','${coach}'),('${orgB}','${other}');
insert into public.efg_profiles values('${coach}','${org}','coach',true),('${other}','${orgB}','coach',true),('${student}','${org}','student',true),('${studentB}','${orgB}','student',true);
insert into public.efg_consents values('${student}','${org}',true),('${studentB}','${orgB}',true);
insert into public.efg_coach_relaunch_intakes
 (student_id,organization_id,completed_version,revision,objective,age_years,height_cm,weight_kg,activity_level,dietary_pattern,shared_at,updated_at)
 values('${student}','${org}','coach_major_2026_r1',1,'recomp',41,174,80,'moderate','omnivore','${when}','${when}');
insert into public.efg_pilot_participation_receipts values('${student}','${org}','coach_pilot_2026_demo1','two_explicit_checkboxes',true,true,now(),null);
insert into public.efg_student_plan_access(student_id,organization_id,coach_id) values('${student}','${org}','${coach}');`);
const save=(revision='null',g=goal)=>`select public.efg_save_coach_plan_draft('${student}',${quote(JSON.stringify(g))}::jsonb,${quote(JSON.stringify(guide))}::jsonb,'${when}',1,${revision})`;
assert.equal(sql(asUser(coach,save())),'1');
sql(asUser(other,save()),true);
assert.equal(sql(asUser(other,'select count(*) from public.efg_coach_plan_drafts')),'0');
assert.equal(sql(asUser(student,'select count(*) from public.efg_coach_plan_drafts')),'0');
const publish=(revision=1,key=req)=>`select public.efg_publish_coach_plan_draft_atomic('${student}',${revision},'${key}')`;
sql(asUser(coach,publish()),true); // switch OFF
sql("update efg_private.coach_release_switches set enabled=true where switch_key='pilot_coach_atomic_publication'");
sql(asUser(coach,publish()),true); // missing legal
sql(`insert into public.efg_legal_documents(kind,version,body,sha256,is_current,published_at)
 select kind,'synthetic_v1',repeat('SYNTHETIC QA ONLY ',30),encode(sha256(convert_to(repeat('SYNTHETIC QA ONLY ',30),'UTF8')),'hex'),true,now()
 from unnest(array['terms','privacy']) kind;
insert into public.efg_legal_acceptances(user_id,document_id)
 select u.id,d.id from auth.users u cross join public.efg_legal_documents d where u.id in ('${coach}','${student}');`);
sql(asUser(coach,publish()),true); // missing food evidence
sql(`insert into efg_private.coach_reviewed_foods(food_id,catalog_version,unit,k,p,c,f,fi,source_kind,source_url,evidence_id,evidence_status,reviewed_by,reviewed_at,expires_at)
 select id,'synthetic-v1','g',1,.1,.1,.02,.01,'validated_composition','https://example.org/synthetic',id||'_fixture','reviewed','${coach}',now()-interval '1 day',now()+interval '1 day' from unnest(array['food-a','food-b']) id;`);
// Long HTTPS URLs work, whitespace/HTTP/oversized URLs fail without altering rows.
sql("update efg_private.coach_reviewed_foods set source_url='https://example.org/'||repeat('a',500)");
for(const bad of ['http://example.org/source','https://exam ple.org/source','https://example.org/'+ 'a'.repeat(2000)])
 sql('update efg_private.coach_reviewed_foods set source_url='+quote(bad),true);
sql(asUser(other,publish()),true);
sql(asUser(student,publish()),true);
sql("update public.efg_coach_relaunch_intakes set revision=2");
sql(asUser(coach,publish()),true); // stale intake, SAME timestamp
sql("update public.efg_coach_relaunch_intakes set revision=1");
sql('update public.efg_consents set accepted=false');
sql(asUser(coach,publish()),true);
sql('update public.efg_consents set accepted=true');
sql('update public.efg_pilot_participation_receipts set revoked_at=now()');
sql(asUser(coach,publish()),true);
sql('update public.efg_pilot_participation_receipts set revoked_at=null');
// The current SQL RPC must reject incomplete, otherwise previously shared
// legacy rows could bypass the new client-side required-field checks.
sql('update public.efg_coach_relaunch_intakes set age_years=null');
sql(asUser(coach,publish()),true);
sql('update public.efg_coach_relaunch_intakes set age_years=41');
const goalId=sql(asUser(coach,publish()));
assert.match(goalId,/^[a-f0-9-]{36}$/);
assert.equal(sql(asUser(coach,publish())),goalId,'Same request returns same goal');
sql(asUser(coach,publish(1,req2)),true,'Different request cannot republish stale draft');
assert.equal(sql('select count(*) from public.efg_goals'),'1');
assert.equal(sql('select count(*) from public.efg_notifications'),'1','Single unified notice');
assert.equal(sql('select count(*) from public.efg_coach_plan_publish_receipts'),'1');
assert.equal(sql('select count(*) from efg_private.coach119_atomic_transactions'),'0');
assert.equal(sql('select status from public.efg_student_plan_access'),'published');
assert.equal(sql('select cardinality(approved_food_ids) from public.efg_food_plans'),'2');
// A second publication fails at the final draft update: every preceding write,
// including the archive and notification, MUST roll back with it.
assert.equal(sql(asUser(coach,save('1',{...goal,kcal:2100}))),'2');
sql(`create function public.qa_fail_publish() returns trigger language plpgsql as $$begin
 if new.status='published' then raise exception 'INJECTED FINAL WRITE FAILURE'; end if;
 return new; end$$;
create trigger qa_fail_publish before update on public.efg_coach_plan_drafts for each row execute function public.qa_fail_publish();`);
sql(asUser(coach,publish(2,req2)),true);
assert.equal(sql('select count(*) from public.efg_goals'),'1');
assert.equal(sql('select count(*) from public.efg_notifications'),'1');
assert.equal(sql('select count(*) from efg_private.coach_guide_history'),'0');
assert.equal(sql('select count(*) from public.efg_coach_plan_publish_receipts'),'1');
assert.equal(sql('select count(*) from efg_private.coach119_atomic_transactions'),'0');
assert.equal(sql('select published_goal_id from public.efg_student_plan_access'),goalId);
sql('drop trigger qa_fail_publish on public.efg_coach_plan_drafts');
const nextGoal=sql(asUser(coach,publish(2,req2)));
assert.notEqual(nextGoal,goalId);
assert.equal(sql('select count(*) from public.efg_goals'),'2');
assert.equal(sql('select count(*) from public.efg_notifications'),'2');
assert.equal(sql('select count(*) from efg_private.coach_guide_history'),'1');
assert.equal(sql('select guided_goal_id from efg_private.coach_guide_history'),goalId);

// NCC P1 real 17-source coverage against PostgreSQL (ALL QA REVIEWS ARE FICTIONAL).
// The six-slot balanced template is NOT a whitelist for students or Coach.
// This verifies the EXACT installed verifier using final guide items, including
// a recipe ingredient not present in the initial template. Nothing hosted is read or written.
const sixSlotSourceTemplate=[
 ...GUIDE_MEALS.slice(0,3),
 {slot:'media_tarde',items:[['yogurt',150],['banana',85],['cheese',25]]},
 ...GUIDE_MEALS.slice(3)
];
const templateIds=[...new Set(sixSlotSourceTemplate.flatMap(m=>m.items.map(([id])=>id)))].sort();
assert.equal(sixSlotSourceTemplate.length,6);
assert.equal(templateIds.length,17,'All 17 real default IDs must be represented, without limiting the catalog');
const reviewPacket=JSON.parse(read('../docs/NCC_PILOT_17_SOURCE_REVIEW_20261103.json'));
assert.equal(reviewPacket.schemaVersion,1);
assert.deepEqual(reviewPacket.foods.map(f=>f.id).sort(),templateIds,
 'The review packet must track all exact initial six-slot ingredients, never a reduced whitelist');
assert.equal(reviewPacket.dataGovernance.notACatalogWhitelist,true);
assert.equal(reviewPacket.dataGovernance.approvedForPublication,false);
assert.equal(reviewPacket.dataGovernance.approvalReceipt,null);
assert.ok(reviewPacket.foods.every(f=>f.humanReview==='PENDING'&&f.approvedForServer===false),
 'A source capture or synthetic test must never impersonate human approvals');
assert.equal(reviewPacket.foods.find(f=>f.id==='milk_skim').appUnit,'ml');
assert.equal(reviewPacket.foods.find(f=>f.id==='chicken').evidenceState,'BLOCKED_PREPARATION');

const fakeRate={k:1,p:.1,c:.1,f:.02,fi:.01};
const fakeUnit=id=>['milk_skim','coffee_black'].includes(id)?'ml':'g';
const finalSixGuide={kind:'flexible_meal_guide',version:2,meals:sixSlotSourceTemplate.map(m=>({
 slot:m.slot,items:m.items.map(([id,qty])=>({id,unit:fakeUnit(id),qty,...fakeRate}))
}))};
const verifiedNcc=g=>sql('select efg_private.coach_guide_foods_verified('+quote(JSON.stringify(g))+'::jsonb)')==='t';
assert.equal(verifiedNcc(finalSixGuide),false,'Missing evidence must reject all 17 selected ingredients');
sql(`insert into efg_private.coach_reviewed_foods
 (food_id,catalog_version,unit,k,p,c,f,fi,source_kind,source_url,evidence_id,
 evidence_status,reviewed_by,reviewed_at,expires_at)
 select id,'qa-synthetic-v2',case when id in ('milk_skim','coffee_black') then 'ml' else 'g' end,
 1,.1,.1,.02,.01,'validated_composition','https://example.org/ncc-qa-fake',
 id||'_nccqa_fixture','reviewed','${coach}',now()-interval '1 hour',now()+interval '1 day'
 from pg_catalog.jsonb_array_elements_text(${quote(JSON.stringify(templateIds))}::jsonb) as ids(id);`);
assert.equal(verifiedNcc(finalSixGuide),true,
 'Synthetic six-slot guide passes ONLY after every final ingredient has fictional local review');
const alteredUnit=structuredClone(finalSixGuide);
alteredUnit.meals[0].items[0].unit='ml';
assert.equal(verifiedNcc(alteredUnit),false,'Never substitute grams for millilitres');
const alteredEnergy=structuredClone(finalSixGuide);
alteredEnergy.meals[0].items[0].k=1.02;
assert.equal(verifiedNcc(alteredEnergy),false,'Energy drift in one item must block the entire guide');
const alteredFiber=structuredClone(finalSixGuide);
alteredFiber.meals[2].items[0].fi=.014;
assert.equal(verifiedNcc(alteredFiber),false,'Unreviewed fiber change must block the entire guide');
const recipeExpanded=structuredClone(finalSixGuide);
recipeExpanded.meals[0].items.push({id:'raisins',unit:'g',qty:15,...fakeRate});
assert.equal(verifiedNcc(recipeExpanded),false,
 'An added recipe ingredient MUST be checked even if all 17 template foods are locally reviewed');
sql(`insert into efg_private.coach_reviewed_foods
 (food_id,catalog_version,unit,k,p,c,f,fi,source_kind,source_url,evidence_id,
 evidence_status,reviewed_by,reviewed_at,expires_at)
 values('raisins','qa-synthetic-v2','g',1,.1,.1,.02,.01,'validated_composition',
 'https://example.org/ncc-qa-fake','raisins_nccqa_fixture','reviewed',
 '${coach}',now()-interval '1 hour',now()+interval '1 day');`);
assert.equal(verifiedNcc(recipeExpanded),true,'Expanded recipe requires its own source evidence');
sql("update efg_private.coach_reviewed_foods set evidence_status='pending' where food_id='raisins'");
assert.equal(verifiedNcc(recipeExpanded),false,'Pending evidence cannot be published');
sql("update efg_private.coach_reviewed_foods set evidence_status='reviewed',expires_at=now()-interval '30 minutes' where food_id='raisins'");
assert.equal(verifiedNcc(recipeExpanded),false,'Expired review cannot be published');
sql("update efg_private.coach_reviewed_foods set expires_at=now()+interval '1 day' where food_id='raisins'");
assert.equal(verifiedNcc(recipeExpanded),true,'Reactivated fictional local evidence passes again');
console.log('PASS NCC P1 PG17: 17/17 six-slot ingredients + expanded recipe item: missing review, g/ml, energy/fiber drift, pending/expired evidence all fail closed; fictional local reviewer ONLY.');

console.log('PASS exact COACH119 PG17: draft save + cross-org RLS denial + legal/evidence gates + revocation + stale revision + publication + retry + unique notice + injected final-write rollback + replacement history. Synthetic claims only.');

// P28: exact private backend + additive health guard in the SAME disposable DB.
// Test the exact promotion bundle, including guards and single-transaction install.
assert.equal(read('../docs/P28_PRIVATE_HEALTH_INSTALL_NOT_APPLIED.sql'),installSql);
const historicBefore=sql("select md5(string_agg(row_to_json(g)::text,',' order by g.id)) from public.efg_goals g");
function deniedInstall(expected){
 const r=spawnSync('psql',['-X','-Atq','-v','ON_ERROR_STOP=1'],{input:installSql,encoding:'utf8',timeout:30000});
 assert.notEqual(r.status,0);assert.match(r.stderr,expected);
 assert.equal(sql("select to_regclass('efg_private.efg_coach_health_intakes') is null"),'t');
 assert.equal(sql("select count(*) from efg_private.coach_release_switches where switch_key='pilot_health_bound_publication'"),'0');
}
deniedInstall(/P28 INSTALL STOP:.*release switches OFF/);
sql("update efg_private.coach_release_switches set enabled=false where switch_key='pilot_coach_atomic_publication'");
sql('alter table public.efg_profiles rename column active to active_test_missing');
deniedInstall(/P28 INSTALL STOP:.*public.efg_profiles.active/);
sql('alter table public.efg_profiles rename column active_test_missing to active');
assert.ok(sql(preflightSelect).split('\n').every(line=>line.endsWith('|t')));
// A failure AFTER the DDL must roll back every added object.
const aborted=installSql.replace("notify pgrst, 'reload schema';","do $fail$ begin raise exception 'P28 injected installation failure'; end $fail$;");
sql(aborted,true);
assert.equal(sql("select to_regclass('efg_private.efg_coach_health_intakes') is null"),'t');
assert.equal(sql("select to_regprocedure('public.efg_get_coach_health_intake(uuid)') is null"),'t');
assert.equal(sql("select count(*) from efg_private.coach_release_switches where switch_key='pilot_health_bound_publication'"),'0');
sql(installSql);
assert.ok(sql(read('./sql/p28-health-install-readonly-postflight.sql')).split('\n').every(line=>line.endsWith('|t')),'All exact postinstallation checks must pass');
assert.equal(sql("select md5(string_agg(row_to_json(g)::text,',' order by g.id)) from public.efg_goals g"),historicBefore);
assert.equal(sql('select count(*) from efg_private.efg_coach_health_documents'),'0');
assert.equal(sql('select count(*) from efg_private.efg_coach_health_intakes'),'0');
assert.equal(sql("select bool_and(relrowsecurity) from pg_class where oid in ('efg_private.efg_coach_health_intakes'::regclass,'efg_private.efg_coach_health_documents'::regclass,'efg_private.efg_coach_health_revocations'::regclass)"),'t');
assert.equal(sql("select has_function_privilege('anon','public.efg_get_coach_health_intake(uuid)','execute')"),'f');
assert.equal(sql("select has_table_privilege('authenticated','efg_private.efg_coach_health_intakes','select')"),'f');
const repeated=spawnSync('psql',['-X','-Atq','-v','ON_ERROR_STOP=1'],{input:installSql,encoding:'utf8'});
assert.notEqual(repeated.status,0);assert.match(repeated.stderr,/P28 INSTALL STOP:.*absent/);
assert.equal(sql("select enabled from efg_private.coach_release_switches where switch_key='pilot_health_bound_publication'"),'f');
console.log('PASS P28F exact promotion bundle: rejects active switch/missing column/reinstall; injected final failure rolls back DDL; installs empty private RLS tables and RPC with guard OFF, historic goals unchanged.');
sql("update efg_private.coach_release_switches set enabled=true where switch_key='pilot_coach_atomic_publication'");
assert.equal(sql("select enabled from efg_private.coach_release_switches where switch_key='pilot_health_bound_publication'"),'f');
sql("update efg_private.coach_release_switches set enabled=true where switch_key='pilot_health_bound_publication'");
const healthDoc='77777777-7777-4777-8777-777777777777',healthHash='b'.repeat(64);
sql(`insert into efg_private.efg_coach_health_documents(id,version,sha256,content_text,status,published_at)
 values('${healthDoc}','p28_synthetic_only','${healthHash}',repeat('SYNTHETIC QA ONLY ',15),'published',now());`);
const noneHealth=rev=>`select public.efg_declare_no_restrictions('${healthDoc}','${healthHash}',${rev},true,true)`;
const conditionsHealth=(rev,share)=>`select public.efg_submit_coach_health_intake('{"celiac":"confirmed"}'::jsonb,'${healthDoc}','${healthHash}',${rev},true,${share})`;
assert.equal(sql(asUser(student,noneHealth(0))),'1');
let dr=2;
const saveHealth=()=>{const n=Number(sql(asUser(coach,save(String(dr)))));assert.equal(n,dr+1);dr=n;};
let healthKey='88888888-8888-4888-8888-888888888888';
const snapshot=()=>sql(`select jsonb_build_object(
 'goals',(select count(*) from public.efg_goals),
 'notifications',(select count(*) from public.efg_notifications),
 'history',(select count(*) from efg_private.coach_guide_history),
 'receipts',(select count(*) from public.efg_coach_plan_publish_receipts),
 'access',(select published_goal_id from public.efg_student_plan_access where student_id='${student}'),
 'foodPlan',(select guided_goal_id from public.efg_food_plans where student_id='${student}'))`);
const blocked=()=>{const before=snapshot();
 const r=spawnSync('psql',['-X','-Atq','-v','ON_ERROR_STOP=1'],{input:asUser(coach,publish(dr,healthKey)),encoding:'utf8',timeout:30000});
 assert.notEqual(r.status,0);assert.match(r.stderr,/P28:/,'Refusal must come from the health guard, not an unrelated gate');
 assert.equal(snapshot(),before,'Health refusal must rollback ALL publication writes');};
saveHealth();blocked(); // No source binding, despite current explicit none.
guide.restrictionSource={studentId:student,organizationId:org,revision:1,status:'none_declared'};
saveHealth();assert.equal(sql(asUser(student,conditionsHealth(1,true))),'2');blocked(); // same general intake, changed health
assert.equal(sql(asUser(coach,`select (public.efg_get_coach_health_intake('${student}')->>'revision')::integer`)),'2');
guide.restrictionSource={studentId:student,organizationId:org,revision:2,status:'declared'};saveHealth();
assert.equal(sql(asUser(student,conditionsHealth(2,false))),'3');blocked(); // withdrawn sharing
assert.equal(sql(asUser(student,noneHealth(3))),'4');blocked(); // old declaration cannot become current silently
for(const source of [
 {studentId:studentB,organizationId:org,revision:4,status:'none_declared'},
 {studentId:student,organizationId:orgB,revision:4,status:'none_declared'},
 {studentId:student,organizationId:org,revision:4,status:'declared'}
]){guide.restrictionSource=source;saveHealth();blocked();}
guide.restrictionSource={studentId:student,organizationId:org,revision:4,status:'none_declared'};saveHealth();
sql(`update efg_private.efg_coach_health_documents set status='retired' where id='${healthDoc}'`);blocked();
sql(`update efg_private.efg_coach_health_documents set status='published' where id='${healthDoc}'`);
const approvedHealthGoal=sql(asUser(coach,publish(dr,healthKey)));
assert.match(approvedHealthGoal,/^[a-f0-9-]{36}$/);
const afterHealth=snapshot();assert.equal(sql(asUser(coach,publish(dr,healthKey))),approvedHealthGoal);
assert.equal(snapshot(),afterHealth,'Idempotent retry cannot duplicate goals/history/notices');
assert.equal(sql("select count(*) from efg_private.coach_guide_history"),'2','Earlier two published versions retained');
healthKey='99999999-9999-4999-8999-999999999999';
saveHealth();
assert.equal(sql(asUser(student,`select public.efg_revoke_coach_health_intake(4)`)),'t');
blocked(); // Full erasure, not just sharing withdrawal.
console.log('PASS P28 exact private backend + atomic publish: missing/stale/foreign source, withdrawn share, retired document and erasure all roll back goal/guide/access/history/receipt/notice; current explicit none publishes once; previous versions retained. PG17 isolated synthetic claims.');
// Actual competing PG sessions: an in-flight health edit holds the SAME lock.
assert.equal(sql(asUser(student,noneHealth(5))),'6');
guide.restrictionSource={studentId:student,organizationId:org,revision:6,status:'none_declared'};saveHealth();
const competing=spawn('psql',['-X','-Atq','-v','ON_ERROR_STOP=1'],{stdio:['pipe','pipe','pipe']});
const competingDone=new Promise((resolve,reject)=>{competing.on('error',reject);competing.on('exit',code=>code===0?resolve():reject(Error('Concurrent fixture failed')));});
const ready=new Promise((resolve,reject)=>{let text='';competing.stdout.on('data',b=>{text+=b; if(text.includes('HEALTH_LOCK_HELD'))resolve();});competing.on('exit',()=>{if(!text.includes('HEALTH_LOCK_HELD'))reject(Error('Concurrent fixture never locked'));});});
competing.stdin.end(`begin; set local role authenticated; set local "request.jwt.claim.sub"='${student}';
${conditionsHealth(6,true)};select 'HEALTH_LOCK_HELD';select pg_sleep(0.4);commit;`);
await ready;blocked();await competingDone;
assert.equal(sql(asUser(student,`select public.efg_get_coach_health_intake('${student}')->>'revision'`)),'7');
console.log('PASS P28 actual two-session PG race: publication waits for health edit and rejects old revision without partial writes.');
