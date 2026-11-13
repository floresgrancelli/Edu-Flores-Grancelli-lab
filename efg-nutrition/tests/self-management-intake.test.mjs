import test from 'node:test';
import assert from 'node:assert/strict';
import {reuseOwnSelfIntake,createOwnSelfIntakeClient} from '../pilot/self-management-intake.js';
const general=()=>({student_id:'self_a',revision:3,age_years:41,height_cm:'174',weight_kg:'82',
 objective:'fat_loss',activity_level:'light',dietary_pattern:'omnivore',eating_window:'regular',
 email:'do-not-copy@example.test',organization_id:'org',notes:'Preferencia propia'});
test('reuses own stored weight/height/age/activity/objective and asks only for missing inputs',()=>{
 const r=reuseOwnSelfIntake({userId:'self_a',general:general()});
 assert.equal(r.fields.weight_kg,82);assert.equal(r.fields.height_cm,174);assert.equal(r.fields.age_years,41);
 assert.equal(r.fields.objective,'fat_loss');assert.equal(r.missing.includes('weight_kg'),false);
 assert.ok(r.missing.includes('sex_for_equation'));assert.ok(r.missing.includes('clinicalCareRequired'));
 assert.equal(r.fields.email,undefined);assert.equal(r.fields.organization_id,undefined);
});
test('newer private self intake overrides general intake, including intentionally removed values',()=>{
 const r=reuseOwnSelfIntake({userId:'self_a',general:general(),saved:{user_id:'self_a',revision:2,
  data:{weight_kg:79,sex_for_equation:'male',age_years:null}}});
 assert.equal(r.fields.weight_kg,79);assert.equal(r.fields.height_cm,174);
 assert.equal(r.fields.age_years,null);assert.ok(r.missing.includes('age_years'));
 assert.equal(r.intakeRevision,2);
});
test('does not copy another user or infer absence of restrictions/sex or parse preference text as IDs',()=>{
 assert.throws(()=>reuseOwnSelfIntake({userId:'other',general:general()}),/no corresponde/);
 const r=reuseOwnSelfIntake({userId:'self_a',general:{...general(),disliked_foods:'pescado'}});
 assert.deepEqual(r.unresolvedPreferenceText,['disliked_foods']);assert.equal(r.fields.disliked_food_ids,undefined);
 assert.equal(r.fields.restrictionDeclaration,undefined);assert.equal(r.fields.sex_for_equation,undefined);
});
test('authenticated read sends no target ID and rejects account change or foreign response',async()=>{
 const sent=[];const c=createOwnSelfIntakeClient({verifyIdentity:async()=>({id:'self_a'}),
  transport:async p=>{sent.push(p);return {userId:'self_a',generalIntake:general(),intake:null};}});
 assert.equal((await c.load()).fields.weight_kg,82);assert.deepEqual(sent,[{action:'context'}]);
 const foreign=createOwnSelfIntakeClient({verifyIdentity:async()=>({id:'self_a'}),transport:async()=>({userId:'other'})});
 await assert.rejects(foreign.load(),/no corresponde/);
 let id='self_a';const changed=createOwnSelfIntakeClient({verifyIdentity:async()=>({id}),transport:async()=>{id='other';return {userId:'self_a'};}});
 await assert.rejects(changed.load(),/Cambió la sesión/);
});
test('save rejects role escalation and does not claim success without a matching persisted version',async()=>{
 let calls=0;const c=createOwnSelfIntakeClient({verifyIdentity:async()=>({id:'self_a'}),transport:async()=>{calls++;return {persisted:false};}});
 await assert.rejects(c.save({fields:{role:'admin'},expectedRevision:0,requestId:'request_01'}),/no permitidos/);
 assert.equal(calls,0);
 await assert.rejects(c.save({fields:{weight_kg:82},expectedRevision:0,requestId:'request_01'}),/confirmar/);
});
