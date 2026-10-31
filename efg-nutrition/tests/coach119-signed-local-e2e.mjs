// Current Coach release circuit over HTTP with REAL LOCAL GoTrue JWTs.
// All accounts, legal text, nutrition evidence and history below are fictional.
// This is integration coverage, NOT physical UAT or production-restore parity.
import assert from 'node:assert/strict';
import {randomBytes, randomUUID} from 'node:crypto';
import {localContext, literal as q, yes, denied} from './helpers/coach119-local.mjs';

const {sql, request, rpc} = localContext();
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
const diaryWrite = user => request('/rest/v1/efg_daily_logs', {method: 'POST', token: user.token,
  body: {student_id: user.id, log_day: '2026-11-01', meals: {}, totals: {}}});
for (const user of [users.newA, users.returningA, users.studentB]) {
  assert.equal((await status(user)).route, 'legal');
  denied(await diaryWrite(user), 'pending student REST diary denied');
}
const forged = users.newA.token.split('.');
forged[2] = (forged[2][0] === 'A' ? 'B' : 'A') + forged[2].slice(1);
assert.equal((await rpc('efg_coach_pilot_entry_status', forged.join('.'))).status, 401,
  'PostgREST must reject a forged signature, not trust decoded claims');

const text = 'SYNTHETIC LOCAL INTEGRATION FIXTURE. NOT A LEGAL DOCUMENT. '.repeat(8);
sql(`insert into public.efg_legal_documents(kind,version,body,sha256,is_current,published_at)
 select kind,'synthetic_qa_v1',${q(text)},encode(sha256(convert_to(${q(text)},'UTF8')),'hex'),true,now()
 from unnest(array['terms','privacy']) kind;`);
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
  await acceptLegal(user);
  assert.equal((await status(user)).route, 'participation');
  yes(await receipt(user), 'explicit participation and sharing receipt');
  assert.equal((await status(user)).route, 'intake');
  // Educational receipt is genuinely user-scoped, persistent and idempotent.
  yes(await rpc('efg_ack_science_intro', user.token,
    {p_version: 'con_ciencia_2026_r1', p_action: 'completed'}), 'educational introduction acknowledgement');
  yes(await rpc('efg_ack_science_intro', user.token,
    {p_version: 'con_ciencia_2026_r1', p_action: 'completed'}), 'repeat educational acknowledgement');
  assert.equal(yes(await read('efg_science_intro_receipts', user), 'own intro receipt').length, 1);
  assert.equal(Number(yes(await rpc('efg_submit_coach_relaunch_intake', user.token, intakeBody(0)),
    'new version shared intake')), 1);
  assert.equal((await status(user)).route, 'review');
  denied(await diaryWrite(user), 'shared intake alone never unlocks diary');
}
for (const coach of [users.coachA, users.coachB]) await acceptLegal(coach);
console.log('PASS current legal -> participation -> intro receipt -> new/returning intake -> review; diary denied; real local JWT signatures verified.');

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
const intakeA = await selectIntake(users.newA);
const draftBody = (student, intake, expected = null, g = goal, menu = guide()) => ({
  p_student: student.id, p_goal: g, p_guide: menu,
  p_intake_updated_at: intake.updated_at, p_intake_revision: intake.revision,
  p_expected_revision: expected
});
const save = (actor, body) => rpc('efg_save_coach_plan_draft', actor.token, body);
assert.equal(Number(yes(await save(users.coachA, draftBody(users.newA, intakeA)), 'Coach A saves current draft')), 1);
denied(await save(users.coachB, draftBody(users.newA, intakeA)), 'other organization cannot save draft');
denied(await save(users.newA, draftBody(users.newA, intakeA)), 'student cannot save coach draft');
assert.deepEqual(yes(await read('efg_coach_plan_drafts', users.newA), 'student draft privacy'), []);
assert.deepEqual(yes(await read('efg_coach_plan_drafts', users.coachB), 'other Coach draft privacy'), []);
const ownDraft = yes(await read('efg_coach_plan_drafts', users.coachA), 'assigned Coach reads its current draft');
assert.equal(ownDraft.length, 1, 'A valid Coach must see its draft through REAL receipt/intake RLS');
assert.equal(ownDraft[0].student_id, users.newA.id);
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
sql("update efg_private.coach_reviewed_foods set expires_at=now()-interval '1 minute' where food_id='qa_food_b'");
denied(await publish(users.coachA, body), 'expired selected food outside guide still blocks publication');
sql("update efg_private.coach_reviewed_foods set expires_at=now()+interval '1 day' where food_id='qa_food_b'");
sql(`update public.efg_profiles set active=false where user_id=${q(users.coachA.id)}`);
denied(await publish(users.coachA, body), 'inactive Coach JWT cannot publish');
sql(`update public.efg_profiles set active=true where user_id=${q(users.coachA.id)}`);
sql(`update public.efg_organizations set is_test=false,status='active',paid_through=current_date-1 where id=${q(orgA)}`);
denied(await publish(users.coachA, body), 'expired Coach license cannot publish');
sql(`update public.efg_organizations set is_test=true,status='trial',paid_through=null where id=${q(orgA)}`);

const first = await Promise.all([publish(users.coachA, body), publish(users.coachA, body)]);
const firstGoal = yes(first[0], 'first concurrent publication');
assert.equal(yes(first[1], 'same-key concurrent retry'), firstGoal);
assert.match(firstGoal, /^[a-f0-9-]{36}$/i);
assert.equal(sql(`select count(*) from public.efg_goals where student_id=${q(users.newA.id)}`), '1');
assert.equal(sql(`select count(*) from public.efg_notifications where recipient_id=${q(users.newA.id)} and kind='plan_update'`), '1');
assert.equal((await status(users.newA)).route, 'ready');
assert.equal((await status(users.newA)).can_log_meals, true);
yes(await diaryWrite(users.newA), 'published student REST diary now allowed');
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
const replacement = draftBody(users.newA, intakeA, 2, replacementGoal, guide(420, ['qa_food_a', 'qa_food_c']));
assert.equal(Number(yes(await save(users.coachA, replacement), 'replacement draft')), 3);
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
assert.equal(sql(`select array_to_string(approved_food_ids,',') from public.efg_food_plans where student_id=${q(users.newA.id)}`), 'qa_food_a,qa_food_c');
assert.equal(sql(`select array_to_string(approved_food_ids,',') from efg_private.coach_guide_history where student_id=${q(users.newA.id)}`), 'qa_food_a,qa_food_b');

// Both organizations and returning students must also have a positive path.
for (const [student, coach] of [[users.returningA, users.coachA], [users.studentB, users.coachB]]) {
  const intake = await selectIntake(student);
  assert.equal(Number(yes(await save(coach, draftBody(student, intake)), 'independent valid draft')), 1);
  yes(await publish(coach, publishBody(student, 1, randomUUID())), 'independent valid publication');
  assert.equal((await status(student)).route, 'ready');
}
assert.deepEqual(yes(await read('efg_daily_logs', users.returningA), 'old meal after full release circuit'), originalHistory);
yes(await receipt(users.newA, false), 'withdraw sharing');
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
console.log('PASS rollback/history: all resources restored after injected failure; authoritative new food list; previous guide archived; new and returning students in BOTH orgs; opt-out and new intake revoke diary eligibility.');
console.log('PASS COACH119 CURRENT LOCAL INTEGRATION. Signed fictional GoTrue accounts only; not hosted parity, external legal/nutrition review, OTP email or physical device UAT.');
