// Current Coach release circuit over HTTP with REAL LOCAL GoTrue JWTs.
// All identities and nutrition evidence are local fiction; the exact two proposed pilot notices are NOT yet approved or hosted.
// This is integration coverage, NOT physical UAT or production-restore parity.
import assert from 'node:assert/strict';
import {randomBytes, randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {localContext, literal as q, yes, denied} from './helpers/coach119-local.mjs';
import {createCoachPlanDraftClient} from '../pilot/coach-plan-draft-client.js';
import {loadCoachSharedStudentRecipes} from '../pilot/coach-shared-recipes-read-client.js';
import {preparePilotNoticePublication} from '../tools/prepare-pilot-notices-release.mjs';
import {renderCoachPilotLegal} from '../pilot/coach-pilot-legal-client.js';
import {createLocalMailReader} from './sdk-entry-mail-local.mjs';

const {sql, request, rpc, asClient} = localContext();
assert.equal(sql("select local_only from efg_private.nut57_isolated_staging_marker"), 't');
assert.equal(sql('select count(*) from auth.users'), '0', 'Run only after fresh current-candidate setup');
const suffix = randomBytes(5).toString('hex');
const password = randomBytes(20).toString('hex') + '!Ab3';
async function signup(role) {
  const result = yes(await request('/auth/v1/signup', {method: 'POST', body: {
    email: `coach119-${role}-${suffix}@example.invalid`, password
  }}), role + ' local signup');
  assert.ok(result.access_token && result.user?.id);
  const user = yes(await request('/auth/v1/user', {token: result.access_token}), role + ' verified identity');
  assert.equal(user.id, result.user.id);
  return {id: user.id, email: user.email, token: result.access_token};
}
const users = {};
for (const role of ['coachA', 'coachB', 'newA', 'returningA', 'studentB', 'admin']) users[role] = await signup(role);

// NCC P2 real LOCAL OTP → JWT → the SAME actual signed Coach119 journey.
// Mailpit is loopback-only and accounts use the reserved example.invalid domain.
// This is not hosted OTP, an email delivery acceptance test, or a real person's consent.
const statusEnv=Object.fromEntries(readFileSync(process.env.EFG_LOCAL_STATUS_ENV||'','utf8')
 .split(/\r?\n/).filter(x=>x.includes('=')).map(x=>{
  const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1).trim().replace(/^['"]|['"]$/g,'')];
 }));
const readLocalOtp=createLocalMailReader({origin:statusEnv.MAILPIT_URL||statusEnv.INBUCKET_URL});
for(const role of ['newA','returningA']){
 const identity=users[role],requestedAfter=Date.now()-1000;
 yes(await request('/auth/v1/otp',{method:'POST',body:{email:identity.email,create_user:false}}),
  role+' fictional OTP request to local GoTrue');
 const code=await readLocalOtp({email:identity.email,after:requestedAfter});
 assert.match(code,/^\d{6,10}$/);
 const verified=yes(await request('/auth/v1/verify',{method:'POST',body:{
  type:'email',email:identity.email,token:code
 }}),role+' real local OTP verification');
 assert.ok(verified.access_token?.split('.').length===3);
 assert.equal(verified.user?.id,identity.id,'OTP must authenticate the existing fictional account');
 const signed=yes(await request('/auth/v1/user',{token:verified.access_token}),
  role+' post-OTP signed user');
 assert.equal(signed.id,identity.id);
 identity.token=verified.access_token; // All subsequent legal/intake/diary tests use OTP-signed claims.
}
console.log('PASS NCC P2 LOCAL ONLY: two email OTPs delivered to Mailpit, verified by GoTrue and reused as signed JWTs for the full Coach119 circuit (new and returning).');

const orgA = randomUUID(), orgB = randomUUID();
sql(`insert into public.efg_organizations(id,coach_id,name,is_test) values
 (${q(orgA)},${q(users.coachA.id)},'COACH119 SYNTHETIC A',true),
 (${q(orgB)},${q(users.coachB.id)},'COACH119 SYNTHETIC B',true);`);
for (const [name, user] of Object.entries(users)) {
  const role = name.startsWith('coach') ? 'coach' : name === 'admin' ? 'admin' : 'student';
  const org = role !== 'student' ? 'null' : q(name === 'studentB' ? orgB : orgA);
  sql(`insert into public.efg_profiles(user_id,email,nickname,role,organization_id)
   values(${q(user.id)},${q(user.email)},${q('Synthetic ' + name)},${q(role)},${org});`);
  if (role === 'student') {
    sql(`insert into public.efg_consents(student_id,organization_id,accepted) values(${q(user.id)},${org},true);
      insert into public.efg_student_plan_access(student_id,organization_id,coach_id)
      values(${q(user.id)},${org},${q(name === 'studentB' ? users.coachB.id : users.coachA.id)});`);
  }
}
const read = (table, user, select = '*') => request(`/rest/v1/${table}?select=${select}`, {token: user.token});
const recipeA=randomUUID(),recipeB=randomUUID();
const syntheticParts=JSON.stringify([{foodId:'qa_food_a',grams:200}]);
const syntheticTotals=JSON.stringify({k:200,p:20,c:20,f:4,fi:2});
sql(`insert into public.efg_personal_recipes(id,student_id,name,ingredients,portions,totals)
 values(${q(recipeA)},${q(users.newA.id)},'Receta propia A',${q(syntheticParts)}::jsonb,2,${q(syntheticTotals)}::jsonb),
       (${q(recipeB)},${q(users.studentB.id)},'Receta propia B',${q(syntheticParts)}::jsonb,2,${q(syntheticTotals)}::jsonb)`);
assert.equal(yes(await read('efg_personal_recipes',users.newA),'Owner reads own personal recipes').length,1);
assert.deepEqual(yes(await read('efg_personal_recipes',users.coachA),'Coach may NOT directly read owner recipe table'),[]);
assert.deepEqual(yes(await rpc('efg_coach_shared_student_recipes',users.coachA.token,{p_student:users.newA.id}),
 'No Coach recipe sharing before independent permissions'),[]);

const status = async user => yes(await rpc('efg_coach_pilot_entry_status', user.token), 'signed entry ' + user.id);
const day = '2026-10-31';
const diary = {student_id: users.returningA.id, log_day: day,
  meals: {desayuno: {fixture: 'HISTORICAL_MEAL_MUST_SURVIVE'}}, totals: {kcal: 321}};
yes(await request('/rest/v1/efg_daily_logs', {method: 'POST', token: users.returningA.token, body: diary}),
  'legacy PWA diary remains writable while release gate is OFF');
const originalHistory = yes(await read('efg_daily_logs', users.returningA), 'returning student own history');
assert.equal(originalHistory.length, 1);

// Activate ONLY this disposable database's diary gate. The public API cannot
// write the private switch, and all other environments remain untouched.
sql("update efg_private.coach_release_switches set enabled=true where switch_key='pilot_student_diary_write_gate'");
const diaryWrite = (user,meals={}) => request('/rest/v1/efg_daily_logs', {method: 'POST', token: user.token,
  body: {student_id: user.id, log_day: '2026-11-01', meals, totals: {}}});
for (const user of [users.newA, users.returningA, users.studentB]) {
  assert.equal((await status(user)).route, 'legal');
  denied(await diaryWrite(user), 'pending student REST diary denied');
}
const forged = users.newA.token.split('.');
forged[2] = (forged[2][0] === 'A' ? 'B' : 'A') + forged[2].slice(1);
assert.equal((await rpc('efg_coach_pilot_entry_status', forged.join('.'))).status, 401,
  'PostgREST must reject a forged signature, not trust decoded claims');

// Rehearse the EXACT TWO current PILOT notice proposals in the disposable
// local stack. This does not approve them, publish them on hosted Supabase,
 // or activate any production feature. The real bytes/hashes must survive SQL.
const pilotNotices=preparePilotNoticePublication();
assert.equal(pilotNotices.status,'PREPARED_NOT_APPLIED');
assert.equal(pilotNotices.productionWrites,0);
sql(pilotNotices.sql);
const localNoticeRows=yes(await read('efg_legal_documents',users.newA),'two proposed notices read via student JWT');
assert.equal(localNoticeRows.length,2,'Two separate versioned pilot notices must be readable by signed student');
for(const metadata of pilotNotices.documents){
 const document=localNoticeRows.find(x=>x.kind===metadata.kind);
 assert.equal(document?.version,metadata.version);
 assert.equal(document?.sha256,metadata.sha256,'Exact proposal hash must match the local server receipt source');
 assert.ok(document?.is_current&&document?.published_at,'Local fixture notices require version+timestamp');
 assert.equal(document?.body.trim().length,metadata.characters);
}
const localNoticeHtml=renderCoachPilotLegal({ready:true,documents:
 localNoticeRows.map(x=>({...x,accepted:false}))});
assert.match(localNoticeHtml,/Condiciones de participación en el piloto/);
assert.match(localNoticeHtml,/Información de privacidad del piloto/);
assert.match(localNoticeHtml,/<p>Nutrición Con-Ciencia/);
assert.doesNotMatch(localNoticeHtml,/<input[^>]*\\bchecked\\b/i,'Pilot checkbox must never be preselected');
const text=localNoticeRows.find(x=>x.kind==='privacy').body;
console.log('PASS 01-03 local only: exact simple pilot notices, two hashes, safe readable HTML, separate unchecked acceptance; no hosted publication.');
async function acceptLegal(user) {
  const documents = yes(await rpc('efg_legal_current_status', user.token), 'read current legal kinds');
  assert.deepEqual(documents.map(d => d.kind).sort(), ['privacy', 'terms']);
  const body = {p_terms_id: documents.find(d => d.kind === 'terms').document_id,
    p_privacy_id: documents.find(d => d.kind === 'privacy').document_id,
    p_terms_checked: true, p_privacy_checked: true};
  denied(await rpc('efg_accept_current_legal', user.token, {...body, p_privacy_checked: false}),
    'one legal checkbox cannot accept both documents');
  assert.equal(yes(await rpc('efg_accept_current_legal', user.token, body), 'explicit two-document acceptance'), true);
}
const receipt = (user, sharing = true) => rpc('efg_accept_pilot_participation', user.token, {
  p_version: 'coach_pilot_2026_demo1', p_participation: true, p_sharing: sharing
});
const intakeBody = revision => ({p_completed_version: 'coach_major_2026_r1',
  p_payload: {objective: 'recomp', age_years: 41, height_cm: 174, weight_kg: 80,
    activity_level: 'moderate', dietary_pattern: 'omnivore', eating_window: 'regular', notes: ''},
  p_expected_revision: revision, p_share_with_coach: true});
for (const user of [users.newA, users.returningA, users.studentB]) {
  denied(await rpc('efg_submit_coach_relaunch_intake', user.token, intakeBody(0)),
    'intake cannot precede legal acceptance');
  // Educational receipt is genuinely user-scoped, persistent and idempotent.
  yes(await rpc('efg_ack_science_intro', user.token,
    {p_version: 'con_ciencia_2026_r1', p_action: 'completed'}), 'educational introduction acknowledgement');
  yes(await rpc('efg_ack_science_intro', user.token,
    {p_version: 'con_ciencia_2026_r1', p_action: 'completed'}), 'repeat educational acknowledgement');
  assert.equal(yes(await read('efg_science_intro_receipts', user), 'own intro receipt').length, 1);
  assert.equal((await status(user)).route,'legal','Education acknowledgement is not legal acceptance');
  await acceptLegal(user);
  assert.equal((await status(user)).route, 'participation');
  yes(await receipt(user), 'explicit participation and sharing receipt');
  assert.equal((await status(user)).route, 'intake');
  const incomplete={...intakeBody(0),p_payload:{...intakeBody(0).p_payload,age_years:null}};
  denied(await rpc('efg_submit_coach_relaunch_intake',user.token,incomplete),
   'SQL rejects a shared intake missing mandatory nutrition data');
  assert.equal(Number(yes(await rpc('efg_submit_coach_relaunch_intake', user.token, intakeBody(0)),
    'new version shared intake')), 1);
  assert.equal((await status(user)).route, 'review');
  denied(await diaryWrite(user), 'shared intake alone never unlocks diary');
}
// Even after student consent, a Coach must accept BOTH current notices before
// a private recipe is disclosed. A sign-in alone is never sufficient.
assert.deepEqual(yes(await rpc('efg_coach_shared_student_recipes',users.coachA.token,{p_student:users.newA.id}),
 'Coach has not accepted current Terms/Privacy'),[]);
for (const coach of [users.coachA, users.coachB]) await acceptLegal(coach);
const ownScoped=await loadCoachSharedStudentRecipes(asClient(users.coachA),{
 profile:{user_id:users.coachA.id,role:'coach',active:true},
 studentId:users.newA.id,organizationId:orgA
});
assert.equal(ownScoped.recipes.length,1);
assert.equal(ownScoped.recipes[0].id,recipeA);
assert.equal(ownScoped.recipes[0].name,'Receta propia A');
assert.deepEqual(yes(await rpc('efg_coach_shared_student_recipes',users.coachB.token,{p_student:users.newA.id}),
 'Coach B never reads Coach A student recipes'),[]);
assert.deepEqual(yes(await rpc('efg_coach_shared_student_recipes',users.newA.token,{p_student:users.newA.id}),
 'Student cannot impersonate Coach RPC'),[]);
assert.equal(yes(await rpc('efg_coach_shared_student_recipes',users.coachB.token,{p_student:users.studentB.id}),
 'Coach B can access only its shared student recipes').length,1);
assert.deepEqual(yes(await read('efg_personal_recipes',users.coachA),
 'Owner RLS still denies direct Coach REST SELECT'),[]);
console.log('PASS GU-06 signed LOCAL: owner-only recipe table, two orgs, independent Terms/Privacy + student sharing and Coach-scoped read; no hosted changes.');
console.log('PASS educational intro -> independent legal -> participation -> mandatory intake -> review; signed local JWT and diary deny.');

const selectIntake = async user => {
  const rows = yes(await read('efg_coach_relaunch_intakes', user), 'read own current intake');
  assert.equal(rows.length, 1);
  return rows[0];
};
assert.equal(yes(await read('efg_coach_relaunch_intakes', users.coachA), 'Coach A shared intakes').length, 2);
assert.equal(yes(await read('efg_coach_relaunch_intakes', users.coachB), 'Coach B shared intakes').length, 1);
const goal = {goal_type: 'recomp', kcal: 2000, protein_g: 200, carb_g: 200, fat_g: 40, fiber_g: 20};
function guide(qty = 400, approvedFoodIds = ['qa_food_a', 'qa_food_b']) {
  return {kind: 'five_meal_example', version: 1, approvedFoodIds,
    meals: ['desayuno', 'media_manana', 'almuerzo', 'merienda', 'cena'].map(slot => ({slot,
      items: [{id: 'qa_food_a', unit: 'g', qty, k: 1, p: .1, c: .1, f: .02, fi: .01}]}))};
}
function flexibleSixMealGuide(qty=250,foodId='qa_food_a') {
 assert.ok(['qa_food_a','qa_food_b','qa_food_c'].includes(foodId),'Synthetic fixture only');
 return {kind:'flexible_meal_guide',version:2,approvedFoodIds:[foodId],
  meals:['desayuno','media_manana','almuerzo','media_tarde','merienda','cena'].map(slot=>({slot,
   items:[{id:foodId,unit:'g',qty,k:1,p:.1,c:.1,f:.02,fi:.01}]}))};
}
const intakeA = await selectIntake(users.newA);
const draftBody = (student, intake, expected = null, g = goal, menu = flexibleSixMealGuide()) => ({
  p_student: student.id, p_goal: g, p_guide: menu,
  p_intake_updated_at: intake.updated_at, p_intake_revision: intake.revision,
  p_expected_revision: expected
});
const save = (actor, body) => rpc('efg_save_coach_plan_draft', actor.token, body);
const clientA = createCoachPlanDraftClient({sb: asClient(users.coachA), enabled: true,
  relaunchEnabled: true, versionedBackendVerified: true});
const initialSave = await clientA.save({studentId: users.newA.id, sourceUpdatedAt: intakeA.updated_at,
  sourceRevision: intakeA.revision, goal, guide: flexibleSixMealGuide()});
assert.equal(initialSave.revision, 1, 'Actual application client saves through signed RPC');
denied(await save(users.coachB, draftBody(users.newA, intakeA)), 'other organization cannot save draft');
denied(await save(users.newA, draftBody(users.newA, intakeA)), 'student cannot save coach draft');
assert.deepEqual(yes(await read('efg_coach_plan_drafts', users.newA), 'student draft privacy'), []);
assert.deepEqual(yes(await read('efg_coach_plan_drafts', users.coachB), 'other Coach draft privacy'), []);
const ownDraft = yes(await read('efg_coach_plan_drafts', users.coachA), 'assigned Coach reads its current draft');
assert.equal(ownDraft.length, 1, 'A valid Coach must see its draft through REAL receipt/intake RLS');
assert.equal(ownDraft[0].student_id, users.newA.id);
assert.equal((await clientA.load(users.newA.id)).draft_revision, 1,
  'Actual application client can recover the Coach draft');
assert.deepEqual(yes(await read('efg_pilot_participation_receipts', users.coachA),
  'draft visibility must not expose private participation receipts'), []);
denied(await request('/rest/v1/efg_coach_plan_drafts', {method: 'POST', token: users.coachA.token,
  body: {student_id: users.returningA.id, organization_id: orgA, coach_id: users.coachA.id,
    source_intake_updated_at: intakeA.updated_at, source_intake_revision: 1, goal_proposal: goal}}),
  'direct draft insert denied');
const concurrentSaves = await Promise.all([1, 2].map(() => save(users.coachA, draftBody(users.newA, intakeA, 1))));
assert.equal(concurrentSaves.filter(r => r.ok).length, 1, 'only one competing draft revision wins');
denied(concurrentSaves.find(r => !r.ok), 'stale competing save', ['PT409']);
console.log('PASS current draft: Coach-only RLS read, cross-org/student denial, direct write denied and two-device revision conflict.');

const publishBody = (student, revision, key) => ({p_student: student.id,
  p_expected_revision: revision, p_request_id: key});
const publish = (actor, body) => rpc('efg_publish_coach_plan_draft_atomic', actor.token, body);
const key = randomUUID();
const body = publishBody(users.newA, 2, key);
denied(await publish(users.coachA, body), 'atomic publication defaults OFF');
sql("update efg_private.coach_release_switches set enabled=true where switch_key='pilot_coach_atomic_publication'");
denied(await publish(users.coachA, body), 'no reviewed food corpus: publication refused');
sql(`insert into efg_private.coach_reviewed_foods(food_id,catalog_version,unit,k,p,c,f,fi,
 source_kind,source_url,evidence_id,evidence_status,reviewed_by,reviewed_at,expires_at)
 select id,'synthetic_qa_v1','g',1,.1,.1,.02,.01,'validated_composition',
 'https://example.org/synthetic-qa-only',id||'_fixture','reviewed',${q(users.coachA.id)},
 now()-interval '1 day',now()+interval '1 day'
 from unnest(array['qa_food_a','qa_food_b','qa_food_c']) id;`);
denied(await publish(users.coachB, body), 'cross-organization publication denied');
denied(await publish(users.newA, body), 'student cannot publish plan');
denied(await publish(users.admin, body), 'unassigned admin cannot publish plan');
sql("update public.efg_legal_documents set is_current=false where kind='privacy'");
denied(await publish(users.coachA, body), 'missing Privacy is not replaced by Terms');
sql("update public.efg_legal_documents set is_current=true where kind='privacy'");
sql("update public.efg_legal_documents set body=body||'TAMPERED' where kind='privacy'");
denied(await publish(users.coachA, body), 'changed legal body hash refused');
sql(`update public.efg_legal_documents set body=${q(text)} where kind='privacy'`);
// A v2 Dieta Guía reviews ONLY its actual ingredients. A source for an
// unrelated catalog food must not become a hidden whitelist/gate.
sql("update efg_private.coach_reviewed_foods set expires_at=now()-interval '1 minute' where food_id='qa_food_a'");
denied(await publish(users.coachA, body), 'expired selected v2 guide ingredient blocks publication');
sql("update efg_private.coach_reviewed_foods set expires_at=now()+interval '1 day' where food_id='qa_food_a'");
sql("update efg_private.coach_reviewed_foods set expires_at=now()-interval '1 minute' where food_id='qa_food_b'");
sql(`update public.efg_coach_relaunch_intakes set age_years=null where student_id=${q(users.newA.id)}`);
denied(await publish(users.coachA,body),'incomplete signed nutrition intake cannot publish',['42501']);
sql(`update public.efg_coach_relaunch_intakes set age_years=41 where student_id=${q(users.newA.id)}`);
sql(`update public.efg_profiles set active=false where user_id=${q(users.coachA.id)}`);
denied(await publish(users.coachA, body), 'inactive Coach JWT cannot publish');
sql(`update public.efg_profiles set active=true where user_id=${q(users.coachA.id)}`);
sql(`update public.efg_organizations set is_test=false,status='active',
 paid_through=(now() at time zone 'America/Argentina/Buenos_Aires')::date-1 where id=${q(orgA)}`);
denied(await publish(users.coachA, body), 'expired Coach license cannot publish');
sql(`update public.efg_organizations set is_test=true,status='trial',paid_through=null where id=${q(orgA)}`);

const first = await Promise.all([
  clientA.publish({studentId: users.newA.id, expectedRevision: 2, requestId: key, confirmed: true}),
  publish(users.coachA, body)
]);
const firstGoal = first[0].goalId;
assert.equal(yes(first[1], 'same-key concurrent retry'), firstGoal);
assert.match(firstGoal, /^[a-f0-9-]{36}$/i);
assert.equal(sql(`select count(*) from public.efg_goals where student_id=${q(users.newA.id)}`), '1');
assert.equal(sql(`select count(*) from public.efg_notifications where recipient_id=${q(users.newA.id)} and kind='plan_update'`), '1');
assert.equal((await status(users.newA)).route, 'ready');
assert.equal((await status(users.newA)).can_log_meals, true);
const studentSix=yes(await read('efg_food_plans',users.newA),'new student published guide readback')[0]?.guided_plan;
assert.equal(studentSix?.kind,'flexible_meal_guide','New student must receive the v2 coach guide');
assert.deepEqual(studentSix.meals.map(m=>m.slot),
 ['desayuno','media_manana','almuerzo','media_tarde','merienda','cena'],
 'All six default Coach-guide slots must survive an atomic publish');
assert.deepEqual(studentSix.approvedFoodIds,['qa_food_a'],
 'Unselected catalog IDs must NOT become a publication whitelist');
const diarySlots=['desayuno','media_manana','almuerzo','media_tarde','merienda','cena'];
yes(await diaryWrite(users.newA,Object.fromEntries(diarySlots.map(slot=>[slot,{}]))),
 'published student REST diary now allowed with all six fixed MI DIA slots');
// Restore unrelated fictional legacy source only AFTER the v2 publication
// demonstrated that its expiration could not block a selected 6-slot guide.
sql("update efg_private.coach_reviewed_foods set expires_at=now()+interval '1 day' where food_id='qa_food_b'");
denied(await request('/rest/v1/efg_daily_logs', {method: 'POST', token: users.studentB.token,
  body: {student_id: users.newA.id, log_day: '2026-11-02', meals: {}, totals: {}}}), 'other student cannot write diary');
assert.deepEqual(yes(await read('efg_food_plans', users.studentB), 'other student cannot read guide'), []);
denied(await publish(users.coachA, {...body, p_request_id: randomUUID()}), 'different key cannot republish stale draft', ['PT409']);
sql(`update public.efg_coach_plan_publish_receipts set organization_id=${q(orgB)} where request_id=${q(key)}`);
denied(await publish(users.coachA, body), 'receipt retry organization must match', ['23505']);
sql(`update public.efg_coach_plan_publish_receipts set organization_id=${q(orgA)} where request_id=${q(key)}`);
console.log('PASS publication: exact current RPC, legal/hash/evidence/license gates, concurrent idempotency, one notification, signed ready state and REST diary enforcement.');

// A failed final write must roll back goal, guide, archive, access and notice.
const replacementGoal = {...goal, kcal: 2100, protein_g: 210, carb_g: 210, fat_g: 42, fiber_g: 21};
const fourSlotReplacement=flexibleSixMealGuide(300,'qa_food_c');
fourSlotReplacement.meals=fourSlotReplacement.meals.filter(m=>!['media_manana','media_tarde'].includes(m.slot));
assert.deepEqual(fourSlotReplacement.meals.map(m=>m.slot),
 ['desayuno','almuerzo','merienda','cena']);
const replacement = draftBody(users.newA, intakeA, 2, replacementGoal, fourSlotReplacement);
assert.equal(Number(yes(await save(users.coachA, replacement), 'replacement draft 6 to 4 slots')), 3);
function snapshot(student) {
  const sid = q(student.id);
  return sql(`select jsonb_build_object(
   'goals',(select jsonb_agg(to_jsonb(t) order by id) from public.efg_goals t where student_id=${sid}),
   'guide',(select to_jsonb(t) from public.efg_food_plans t where student_id=${sid}),
   'access',(select to_jsonb(t) from public.efg_student_plan_access t where student_id=${sid}),
   'draft',(select to_jsonb(t) from public.efg_coach_plan_drafts t where student_id=${sid}),
   'archive',(select jsonb_agg(to_jsonb(t) order by id) from efg_private.coach_guide_history t where student_id=${sid}),
   'receipts',(select jsonb_agg(to_jsonb(t) order by request_id) from public.efg_coach_plan_publish_receipts t where student_id=${sid}),
   'notices',(select jsonb_agg(to_jsonb(t) order by id) from public.efg_notifications t where recipient_id=${sid}));`);
}
const beforeFailure = snapshot(users.newA);
sql(`create function public.coach119_qa_fail_last_write() returns trigger language plpgsql as $$begin
 if new.student_id=${q(users.newA.id)} and new.status='published' then
  raise exception 'COACH119_QA_INJECTED_FINAL_WRITE';
 end if; return new; end$$;
 create trigger coach119_qa_fail_last_write before update on public.efg_coach_plan_drafts
 for each row execute function public.coach119_qa_fail_last_write();`);
const replacementBody = publishBody(users.newA, 3, randomUUID());
denied(await publish(users.coachA, replacementBody), 'injected last-write failure', ['P0001']);
assert.equal(snapshot(users.newA), beforeFailure, 'All seven publication resources roll back together');
assert.equal(sql('select count(*) from efg_private.coach119_atomic_transactions'), '0');
sql('drop trigger coach119_qa_fail_last_write on public.efg_coach_plan_drafts; drop function public.coach119_qa_fail_last_write()');
const secondGoal = yes(await publish(users.coachA, replacementBody), 'replacement succeeds after rollback');
assert.notEqual(secondGoal, firstGoal);
assert.equal(sql(`select guided_goal_id from efg_private.coach_guide_history where student_id=${q(users.newA.id)}`), firstGoal);
assert.equal(sql(`select array_to_string(approved_food_ids,',') from public.efg_food_plans where student_id=${q(users.newA.id)}`), 'qa_food_c');
assert.equal(sql(`select array_to_string(approved_food_ids,',') from efg_private.coach_guide_history where student_id=${q(users.newA.id)}`), 'qa_food_a');
const fourSlotReadback=yes(await read('efg_food_plans',users.newA),'Coach-reduced guide readback')[0].guided_plan;
assert.deepEqual(fourSlotReadback.meals.map(m=>m.slot),['desayuno','almuerzo','merienda','cena'],
 'Coach can remove two guide slots without reintroducing them');
assert.equal(sql(`select jsonb_array_length(guided_plan->'meals') from efg_private.coach_guide_history where student_id=${q(users.newA.id)}`),'6',
 'Previous 6-slot approved plan must remain in the private history');
const preservedDiary=yes(await read('efg_daily_logs',users.newA),
 'four-slot guide cannot delete or reduce the six-slot diary');
assert.equal(preservedDiary.length,1,'Guide edits must not create extra consumed meals');
assert.deepEqual(Object.keys(preservedDiary[0].meals||{}).sort(),[...diarySlots].sort(),
 'Removing meals from Coach guide must NEVER remove any of the six MI DIA slots');
assert.equal(preservedDiary[0].log_day,'2026-11-01',
 'The Coach replacement must not change the saved diary day');
assert.equal((await status(users.newA)).route,'ready','Coach removes guide slots, not MI DIA access');

// Both organizations and returning students must also have a positive path.
for (const [student, coach] of [[users.returningA, users.coachA], [users.studentB, users.coachB]]) {
  const intake = await selectIntake(student);
  const sixMeals=student===users.studentB;
  // Legacy v1 stays readable for returning students; all new guides use v2.
  const menu=sixMeals?flexibleSixMealGuide():guide();
  assert.equal(Number(yes(await save(coach, draftBody(student, intake,null,goal,menu)), 'independent valid draft')), 1);
  yes(await publish(coach, publishBody(student, 1, randomUUID())), 'independent valid publication');
  assert.equal((await status(student)).route, 'ready',
   'New flexible six-meal and historic five-meal guides both unlock only after publishing');
  const actualGuide=yes(await read('efg_food_plans',student),'published guide readback')[0]?.guided_plan;
  assert.equal(actualGuide?.meals?.length,sixMeals?6:5,
   'Sixth guide meal must survive server publication and client readback');
  if(sixMeals){
   // Even an assigned Coach with existing table UPDATE grants must not
   // bypass the atomic RPC to mutate or erase a newly published V2 guide.
   const direct=await request('/rest/v1/efg_food_plans?student_id=eq.'+student.id,{
    method:'PATCH',token:coach.token,body:{guided_plan:null}
   });
   denied(direct,'Direct legacy write cannot erase a six-meal guide',['42501']);
   assert.match(String(direct.data?.message||''),/Flexible Coach guides require signed atomic publication/);
  }
}
assert.deepEqual(yes(await read('efg_daily_logs', users.returningA), 'old meal after full release circuit'), originalHistory);
yes(await receipt(users.newA, false), 'withdraw sharing');
assert.deepEqual(yes(await rpc('efg_coach_shared_student_recipes',users.coachA.token,{p_student:users.newA.id}),
 'Revoked sharing must immediately hide previously accessible personal recipes'),[]);
assert.equal((await status(users.newA)).route, 'private');
denied(await request(`/rest/v1/efg_daily_logs?student_id=eq.${users.newA.id}`, {
  method: 'PATCH', token: users.newA.token, body: {totals: {kcal: 999}}}), 'opt-out prevents new diary writes');
assert.equal(yes(await read('efg_daily_logs', users.newA), 'opt-out preserves own history').length, 1);
assert.equal(yes(await read('efg_coach_plan_drafts', users.coachA), 'withdrawn student draft hidden').some(x => x.student_id === users.newA.id), false);
yes(await receipt(users.newA), 'restore explicit sharing');
assert.equal(Number(yes(await rpc('efg_submit_coach_relaunch_intake', users.newA.token, {
  ...intakeBody(1), p_payload: {...intakeBody(1).p_payload, weight_kg: 79}
}), 'new intake revision')), 2);
assert.equal((await status(users.newA)).route, 'review');
denied(await diaryWrite(users.newA), 'old published plan cannot authorize a newer intake');
denied(await publish(users.coachA, replacementBody), 'old draft cannot bypass newer intake', ['PT409']);
console.log('PASS rollback/history: initial 6-slot v2, Coach 6-to-4 edits, old six-slot history intact, legacy five-slot readback, two orgs, opt-out and new intake revoke diary eligibility.');
console.log('PASS COACH119 CURRENT LOCAL INTEGRATION. Signed fictional GoTrue accounts only; not hosted parity, external legal/nutrition review, OTP email or physical device UAT.');
