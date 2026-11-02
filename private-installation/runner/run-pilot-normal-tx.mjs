// Disposable PostgreSQL 17 execution of EXACT four-script NORMAL pilot bundle.
// Does not connect to hosted Supabase. Always ROLLBACK; never promote flags.
// Existing six-migration clinical fixture is NOT used in this focused test.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {localContext} from './local-context.mjs';
import {attestDatabase} from './isolation.mjs';
import {aclSnapshot,verifyObserved} from './snapshot.mjs';
import {reviewedDependencies} from './prerequisites.mjs';
import {buildPilotCoach119Transaction} from '../../efg-nutrition/tools/prepare-pilot-coach119-release.mjs';

assert.equal(process.env.EFG_QA_INCREMENTAL_INSTALL,'1');
assert.equal(process.env.EFG_QA_PILOT_TX_DRYRUN,'1');
assert.equal(process.env.GITHUB_ACTIONS,'true');
const {sql}=localContext();
const beforeIdentity=attestDatabase(sql);
assert.equal(sql('select count(*) from auth.users'),'0','Never use a populated Auth stack');
assert.equal(sql("select to_regclass('public.efg_profiles') is null"),'t');
const result={status:'RUNNING',sha:process.env.GITHUB_SHA,sourceSha256:null,
 synthetic:true,hostedWrites:0,flagsEnabled:0,ddlCommitted:false,
 successfulRollback:false,errorRollback:false,fixtureRestored:false,
 checks:[],limitations:['Local reconstructed production-shaped schema, not a hosted backup',
 'No signed user/coach device E2E in this job; prior isolated JWT A/B suites are separate',
 'A successful ROLLBACK is not proof of a recoverable post-COMMIT backup']};
const dir='artifacts/incremental-install';mkdirSync(dir,{recursive:true});
function record(x){result.checks.push(x);}
try {
 const root=new URL('../',import.meta.url);
 const deps=reviewedDependencies(import.meta.url);
 const baseline=readFileSync(new URL('runner/baseline-generated.sql',root),'utf8');
 for(const dep of deps)assert.ok(baseline.includes(dep.definition.trim()));
 sql(baseline);
 assert.equal(sql('select count(*) from auth.users'),'0');
 verifyObserved(sql,JSON.parse(readFileSync(new URL('evidence/hosted-metadata-20261101-2212.json',root),'utf8')));
 record('Synthetic production-shaped baseline installed and verified');
 const initial=aclSnapshot(sql);
 const requireAbsent=()=> {
  assert.equal(sql("select to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)') is null"),'t');
  assert.equal(sql("select to_regclass('public.efg_coach_plan_publish_receipts') is null"),'t');
  assert.equal(sql("select to_regprocedure('efg_private.coach_pilot_share_active(uuid,uuid)') is null"),'t');
  assert.equal(sql("select enabled from efg_private.coach_release_switches where switch_key='pilot_coach_atomic_publication'"),'');
 };
 requireAbsent();record('Pre-install target objects absent, all release switches OFF');
 const pack=buildPilotCoach119Transaction();result.sourceSha256=pack.sha256;
 assert.deepEqual(pack.blocks,['SEC09','OPT01','FOOD_URL','COACH119']);
 assert.equal((pack.sql.match(/^commit;\s*$/gm)||[]).length,1);
 assert.ok(pack.sql.endsWith('commit;\n'));
 // The *entire generated script* executes in ONE connection and ONE
 // transaction. Replace only terminal COMMIT with ROLLBACK to keep fixture
 // at initial schema for a repeatable and auditable rehearsal.
 const good=pack.sql.slice(0,-'commit;\n'.length)+'rollback;\n';
 sql(good);
 requireAbsent();
 assert.deepEqual(aclSnapshot(sql),initial,'All DDL must revert after successful rehearsal');
 record('Exact 4-phase SQL executed including its postchecks, then ROLLBACK, no ACL drift');
 result.successfulRollback=true;
 // A deliberately thrown last-step error must leave no partial SEC09/OPT01
 // or atomic objects. This exercises PostgreSQL's transaction abort path.
 const abort=pack.sql.slice(0,-'commit;\n'.length)+
  "do $qa_expected_abort$ begin raise exception 'QA_EXPECTED_ROLLBACK'; end $qa_expected_abort$;\ncommit;\n";
 assert.throws(()=>sql(abort),/QA_EXPECTED_ROLLBACK/);
 requireAbsent();
 assert.deepEqual(aclSnapshot(sql),initial,'Failure rollback must preserve all ACL');
 record('Injected last-step SQL error rolls back all four phases');
 result.errorRollback=true;
 result.fixtureRestored=true;
 result.status='PASS';
 console.log('PASS: normal pilot four-script transaction executed and fully rolled back in disposable PG17; no hosted writes');
}catch(e){
 result.status='FAIL';result.error={name:e.name,message:String(e.message).slice(0,600)};
 throw e;
}finally{
 writeFileSync(dir+'/pilot-normal-tx-dryrun.json',JSON.stringify(result,null,2));
}
