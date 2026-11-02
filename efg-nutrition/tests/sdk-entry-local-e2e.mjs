import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {localContext,literal as q,yes} from './helpers/coach119-local.mjs';
import {importNine} from './persisted-guide-nine-import.mjs';
import {runSdkEntryBrowser} from './sdk-entry-runner-private.mjs';
assert.equal(process.env.EFG_QA_SDK_ENTRY,'1');
const {sql,request}=localContext(),read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
assert.equal(sql('select count(*) from auth.users'),'0');
assert.equal(sql('select count(*) from efg_private.coach_release_switches where enabled'),'0');
sql(read('../docs/CLIN_GUT_03_PRIVATE_HEALTH_INTAKE_STAGING_ONLY.sql'));
sql(read('../docs/CLIN_GUT_03_SCOPE_RESPONSE_LOCAL_OPT_IN.sql'));
const official=importNine(sql);
sql(read('./sql/persisted-guide-local-overlay.sql'));
sql(read('./sql/sdk-entry-declaration-readback-local.sql'));
sql(read('./sql/bound-publication-local-overlay.sql'));
await import('./sdk-entry-preflight-private.mjs');
const users={},orgs={A:randomUUID(),B:randomUUID()},suffix=randomBytes(5).toString('hex');
// Provision fictional Auth accounts only. No session token is passed to the browser.
for(const label of ['coachA','coachB','studentA','studentB']){
 const r=yes(await request('/auth/v1/signup',{method:'POST',body:{email:`sdk-${label.toLowerCase()}-${suffix}@example.invalid`,password:randomBytes(24).toString('hex')+'!Ab3'}}),'fictional account');
 assert.ok(r.user?.id);users[label]={id:r.user.id,email:r.user.email};
}
for(const side of ['A','B']){
 const c=users['coach'+side],s=users['student'+side],org=orgs[side];
 sql(`insert into public.efg_organizations(id,coach_id,name,is_test) values(${q(org)},${q(c.id)},'SDK fictional organization',true);
 insert into public.efg_profiles(user_id,email,nickname,role,active) values(${q(c.id)},${q(c.email)},'SDK fictional coach','coach',true);
 insert into public.efg_invitations(email,nickname,role,organization_id,invited_by) values(${q(s.email)},'SDK fictional student','student',${q(org)},${q(c.id)});`);
}
const text='FICTIONAL LOCAL TEST DOCUMENT. No acceptance for real people. '.repeat(10),digest=createHash('sha256').update(text).digest('hex');
sql(`insert into public.efg_legal_documents(kind,version,body,sha256,is_current,published_at)
 select kind,'sdk_local_test_v1',${q(text)},${q(digest)},true,now() from unnest(array['terms','privacy']) kind;
 insert into efg_private.efg_coach_health_documents(id,version,sha256,content_text,status,published_at)
 values(${q(randomUUID())},'sdk_local_test_v1',${q(digest)},${q(text)},'published',now());
 notify pgrst,'reload schema';`);
assert.equal(sql('select count(*) from public.efg_coach_relaunch_intakes'),'0');
assert.equal(sql('select count(*) from efg_private.efg_coach_health_intakes'),'0');
// Later, after real OTP claims, this scoped fixture callback creates pending access/gates only.
const enableLocalPublication=side=>{
 const s=users['student'+side],c=users['coach'+side];
 sql(`insert into public.efg_student_plan_access(student_id,organization_id,coach_id) values(${q(s.id)},${q(orgs[side])},${q(c.id)}) on conflict(student_id) do nothing;
 insert into efg_private.bound_publication_local_gate(student_id,coach_id,organization_id,enabled) values(${q(s.id)},${q(c.id)},${q(orgs[side])},true);
 update efg_private.coach_release_switches set enabled=true where switch_key in ('pilot_coach_atomic_publication','pilot_student_diary_write_gate');`);
};
try{
 await runSdkEntryBrowser({users,orgs,official,enableLocalPublication,sql});
 assert.equal(sql('select count(*) from public.efg_goals'),'2');
}finally{
 sql(read('./sql/bound-publication-local-restore.sql'));
 assert.equal(sql("select count(*) from efg_private.coach_release_switches where enabled and switch_key in ('pilot_coach_atomic_publication','pilot_student_diary_write_gate')"),'0');
 console.log('PASS SDK local publication switches restored; stack deletion is a separate required cleanup step.');
}
