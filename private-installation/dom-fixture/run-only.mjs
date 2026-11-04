// Fixture-only execution; does not load clinical preview/save or browser modules.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {randomBytes,randomUUID} from 'node:crypto';
import {localContext,yes} from '../runner/local-context.mjs';
import {reviewedDependencies} from '../runner/prerequisites.mjs';
import {attestDatabase} from '../runner/isolation.mjs';
import {q,aclSnapshot,verifyObserved} from '../runner/snapshot.mjs';
import {installDomFixture} from './install.mjs';
import {verifyDomFixtureAccess} from './access-cases.mjs';
assert.equal(process.env.EFG_QA_DOM_FIXTURE_ONLY,'1');
assert.equal(process.env.EFG_QA_DOM_FIXTURE,'1');
for(const flag of ['EFG_QA_CLINICAL_BRIDGE','EFG_QA_CLINICAL_COMPATIBILITY'])assert.notEqual(process.env[flag],'1','Clinical execution is not authorized in fixture-only mode');
assert.ok(!process.env.EFG_QA_CLINICAL_BRIDGE_MODE);
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const deps=reviewedDependencies(import.meta.url);
const {sql,rpc,request}=localContext();attestDatabase(sql);
assert.equal(sql('select count(*) from auth.users'),'0');
assert.equal(sql("select to_regclass('public.efg_profiles') is null"),'t');
const out='artifacts/incremental-install';mkdirSync(out,{recursive:true});
const result={status:'RUNNING',sha:process.env.GITHUB_SHA,groups:[],limits:['Fixture-only HTTP/JWT; no browser/SDK hydration claim','No clinical preview/save RPC, bridge, clinical or product migrations executed','Four synthetic accounts; eight fixture tables and existing organizations read-only']};
const record=x=>result.groups.push(x);
try{
 const baseline=read('runner/baseline-generated.sql');
 for(const dep of deps)assert.ok(baseline.includes(dep.definition.trim()),'Exact dependency body must be generated');
 sql(baseline);
 for(const dep of deps){
  const got=JSON.parse(sql(`select jsonb_build_object('md5',md5(pg_get_functiondef(p.oid)),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl,'proconfig',p.proconfig,'prosecdef',p.prosecdef) from pg_proc p where p.oid=${q(dep.signature)}::regprocedure`));
  assert.equal(got.md5,dep.md5);assert.equal(got.owner,dep.owner);assert.deepEqual([...got.acl].sort(),[...dep.acl].sort());assert.deepEqual(got.proconfig,dep.proconfig);assert.equal(got.prosecdef,dep.prosecdef);
 }

 const metadata=JSON.parse(read('evidence/hosted-metadata-20261101-2212.json'));
 verifyObserved(sql,metadata);record('baseline observed columns/constraints/function digests');
 const exactTypes=JSON.parse(read('runner/confirmed-types.json'));
 for(const c of exactTypes.columns){const actual=JSON.parse(sql(`select jsonb_build_object('type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull) from pg_attribute a where a.attrelid=${q(c.schema_name+'.'+c.table_name)}::regclass and a.attname=${q(c.column_name)} and a.attnum>0 and not a.attisdropped`));assert.deepEqual(actual,{type:c.exact_type,not_null:c.not_null});}
 record('ten confirmed exact types and nullability');
 writeFileSync(out+'/acl-before.json',JSON.stringify(aclSnapshot(sql),null,2));
 installDomFixture({sql,out});
 const password=randomBytes(24).toString('hex')+'!Aa9',suffix=randomBytes(6).toString('hex'),users={};
 for(const label of ['coachA','coachB','studentA','studentB']){
  const u=yes(await request('/auth/v1/signup',{method:'POST',body:{email:`install-${label}-${suffix}@example.invalid`,password}}),'local signup');
  assert.ok(u.access_token&&u.user.id);assert.equal(yes(await request('/auth/v1/user',{token:u.access_token}),'signed user').id,u.user.id);
  users[label]={id:u.user.id,email:u.user.email,token:u.access_token};
 }
 const orgs={A:randomUUID(),B:randomUUID()};
 for(const side of ['A','B']){const c=users['coach'+side],s=users['student'+side];
  sql(`insert into public.efg_organizations(id,coach_id,name,is_test) values(${q(orgs[side])},${q(c.id)},'FICTIONAL incremental',true);
   insert into public.efg_profiles(user_id,email,nickname,role,active,organization_id) values
   (${q(c.id)},${q(c.email)},'Test coach','coach',true,null),(${q(s.id)},${q(s.email)},'Test student','student',true,${q(orgs[side])});
   insert into public.efg_consents(student_id,organization_id,accepted) values(${q(s.id)},${q(orgs[side])},true);
   insert into public.efg_student_plan_access(student_id,organization_id,coach_id) values(${q(s.id)},${q(orgs[side])},${q(c.id)});`);
 }
 result.groups.push(await verifyDomFixtureAccess({sql,rpc,request,users,orgs}));
 assert.equal(sql("select count(*) from pg_proc where proname in ('efg_preview_clinical_bound_recipe','efg_save_clinical_bound_recipe')"),'0');
 record('No preview/save RPC installed or invoked; fixture seed removed');
 result.status='PASS';
}catch(e){result.status='FAIL';result.error={name:e.name,message:String(e.message).replace(/eyJ[A-Za-z0-9_.-]+/g,'[REDACTED]').slice(0,1600)};throw e;}
finally{writeFileSync(out+'/dom-fixture-result.json',JSON.stringify(result,null,2));}
