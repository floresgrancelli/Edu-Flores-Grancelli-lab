// Exact COACH119 RPC on disposable PG17. Synthetic identities/claims/data only.
// This verifies SQL transactions, not hosted schema parity or signed JWTs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
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
 completed_version text,revision integer,shared_at timestamptz,updated_at timestamptz);
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
insert into public.efg_coach_relaunch_intakes values('${student}','${org}','coach_major_2026_r1',1,'${when}','${when}');
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
console.log('PASS exact COACH119 PG17: draft save + cross-org RLS denial + legal/evidence gates + revocation + stale revision + publication + retry + unique notice + injected final-write rollback + replacement history. Synthetic claims only.');
