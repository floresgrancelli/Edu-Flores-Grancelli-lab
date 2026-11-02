// Private assembly; no invocation at module import. No hosted connection route.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {q,rowSnapshot} from '../runner/snapshot.mjs';
import {capturePermissions} from '../runner/acl-contract.mjs';
import {bridgeFixtures,frame} from './fixtures.mjs';
import {projection} from './tests/bridge-http-contract.mjs';
import {verifyClinicalBridgeRPC,verifyClinicalMutationRejections} from './tests/bridge-rpc-local.mjs';
const signatures=['public.efg_preview_clinical_bound_recipe(uuid,jsonb,jsonb,text)','public.efg_save_clinical_bound_recipe(uuid,jsonb,jsonb,text)'];
export async function runClinicalBridge(context){
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.EFG_QA_INCREMENTAL_INSTALL,'1');assert.equal(process.env.EFG_QA_CLINICAL_BRIDGE,'1');
 const {sql,rpc,users,fresh,intake,allTables,record,out}=context;
 assert.ok(['rpc','rpc-dom'].includes(process.env.EFG_QA_CLINICAL_BRIDGE_MODE),'Explicit reviewed mode required');
 const beforeACL=capturePermissions(sql),snapshot=()=>rowSnapshot(sql,allTables),report={status:'RUNNING',mode:process.env.EFG_QA_CLINICAL_BRIDGE_MODE,results:[],permissionsRestored:false,limits:['TEST_ONLY accounts; general explicit declaration and official composition','No real clinical catalogue, publication or hosted operations']};
 const originalGate=sql("select enabled from efg_private.coach_release_switches where switch_key='pilot_coach_atomic_publication'");let fixtures,installed=false,stage='schema';
 try{
  if(report.mode==='rpc-dom'){
   // Stop BEFORE new DDL/grants if the UI substrate is missing. Never pretend the
   // API-only baseline hydrates the full application or auto-install extra ACL.
   (await import('./browser.mjs')).checkBrowserSchema(sql);
  }
  stage='install';
  sql(readFileSync(new URL('./clinical-preview-save.PROPOSAL.sql',import.meta.url),'utf8'));installed=true;
  for(const signature of signatures){
   for(const role of ['anon','authenticated'])assert.equal(sql(`select has_function_privilege(${q(role)},${q(signature)},'EXECUTE')`),'f');
   // PROPOSED ONLY, requires explicit authorization before this runner is invoked.
   sql(`grant execute on function ${signature} to authenticated;`);
   assert.equal(sql(`select has_function_privilege('authenticated',${q(signature)},'EXECUTE')`),'t');
   assert.equal(sql(`select has_function_privilege('anon',${q(signature)},'EXECUTE')`),'f');
  }
  stage='acl';const afterACL=capturePermissions(sql);
  for(const key of ['tables','columns','policies','defaults'])assert.deepEqual(afterACL[key],beforeACL[key],'No new table grants/RLS/defaults');
  for(const f of beforeACL.functions)assert.deepEqual(afterACL.functions.find(x=>x.signature===f.signature),f,'Existing function permissions unchanged');
  const added=afterACL.functions.filter(x=>!beforeACL.functions.some(b=>b.signature===x.signature));assert.equal(added.length,5);
  for(const f of added)if(!signatures.includes(f.signature.replaceAll(', ',',')))for(const role of ['anon','authenticated'])assert.equal(sql(`select has_function_privilege(${q(role)},${q(f.signature)},'EXECUTE')`),'f');
  writeFileSync(out+'/bridge-acl.json',JSON.stringify({before:beforeACL,after:afterACL},null,2));
  sql("update efg_private.coach_release_switches set enabled=false where switch_key='pilot_coach_atomic_publication';notify pgrst,'reload schema';");
  stage='fresh';fixtures=bridgeFixtures({sql,rpc,fresh,users,snapshot,intake});
  const f=await fixtures.newFixture();
  // Bounded schema-cache wait: only absent-schema result may be retried.
  for(let i=0;i<40;i++){
   const r=await rpc('efg_preview_clinical_bound_recipe',f.coach.token,f.args);
   if(r.ok)break;assert.equal(r.data?.code,'PGRST202');assert.ok(i<39,'RPC cache never refreshed');await new Promise(r=>setTimeout(r,250));
  }
  stage='positive-rpc';report.results.push(await verifyClinicalBridgeRPC({rpc,coach:f.coach,otherCoach:users.coachB,student:f.student,readSnapshot:snapshot,projection:projection(f.row.guide),frame:frame(f.row)}));
  stage='negative-rpc';report.results.push(await verifyClinicalMutationRejections({cases:fixtures.cases,rpc}));
  stage='browser';if(report.mode==='rpc-dom')await (await import('./browser.mjs')).bridgeBrowser({...context,newFixture:fixtures.newFixture});
  record('bridge real RPC save/readback and negative snapshots'+(report.mode==='rpc-dom'?'; DOM edit/save/reload 390/1280':''));
  report.status='PASS';
 }catch(error){report.status='FAIL';report.diagnostic={stage,name:error.name,code:error.code||null,sqlCode:String(error.message).match(/\"code\":\"([A-Z0-9]{5})\"/)?.[1]||null,site:String(error.stack).split('\n').find(x=>/ at .*file:/.test(x))?.trim()||null};console.error('BRIDGE_DIAGNOSTIC '+JSON.stringify(report.diagnostic));throw Error('CLINICAL_BRIDGE_FAILED: sanitized report; no Auth bodies');}
 finally{
  try{
   fixtures?.resetDates();
   sql('drop trigger if exists qa_bridge_save_pause on public.efg_coach_plan_drafts;drop function if exists efg_private.qa_bridge_save_pause();drop sequence if exists efg_private.qa_bridge_mutation_probe;');
   if(installed){
    for(const signature of signatures)sql(`revoke all on function ${signature} from authenticated;`);
    sql(`drop function public.efg_save_clinical_bound_recipe(uuid,jsonb,jsonb,text);drop function public.efg_preview_clinical_bound_recipe(uuid,jsonb,jsonb,text);drop function efg_private.clinical_normalize_recipe(uuid,jsonb);drop function efg_private.clinical_response_frame(jsonb);drop function efg_private.clinical_recipe_projection(jsonb);`);
   }
   assert.deepEqual(capturePermissions(sql),beforeACL,'Exact ACL restoration after removing only new bridge functions');
   sql(`update efg_private.coach_release_switches set enabled=${originalGate==='t'?'true':'false'} where switch_key='pilot_coach_atomic_publication'`);
   assert.equal(sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='efg_private' and p.proname like 'qa_bridge_%'"),'0');
   assert.equal(sql("select count(*) from pg_trigger where tgname like 'qa_bridge_%'"),'0');
   report.permissionsRestored=true;
  }finally{writeFileSync(out+'/bridge-result.json',JSON.stringify(report,null,2));}
 }
}
