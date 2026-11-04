// Prepared; not executed. Overlay proposed files on a private copy of PR42 first.
// Mock transport contract tests, explicitly not HTTP/JWT/SQL integration evidence.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
assert.ok(process.env.EFG_BRIDGE_PILOT_ROOT,'Existing private PR42 overlay root required');
const {createPersistedGuideProvider}=await import(pathToFileURL(resolve(process.env.EFG_BRIDGE_PILOT_ROOT,'persisted-guide-provider.js')));
const {serverCompatibilityFrame,recipeProjection}=await import(pathToFileURL(resolve(process.env.EFG_BRIDGE_PILOT_ROOT,'server-compatibility-client.js')));
const initial={role:'coach',active:true,userId:'coach',profileId:'coach',sessionId:'session',organizationId:'org',studentId:'student',studentActive:true,ownerId:'coach',studentOrganizationId:'org',consent:true,consentStudentId:'student',consentOrganizationId:'org',sourceEpoch:1};
let scope={...initial},authHook=null,rpcHook=null,calls=[];
const plan={meals:['desayuno','media_manana','almuerzo','merienda','cena'].map(slot=>({slot,items:[{id:'TEST_ONLY',qty:150,unit:'g'}]}))};
let row={viewer_id:'coach',session_id:'session',student_id:'student',organization_id:'org',publishable:false,draft_revision:1,intake_revision:1,health_revision:1,catalog_digest:'TEST_ONLY',goal:{kcal:2100,protein_g:190,carb_g:240,fat_g:45,fiber_g:32},restriction_declaration:'clinical_declared',guide:plan,preferred_ids:[],disliked_ids:[],general:{dietary_pattern:'omnivore'},evaluated_at:'2026-11-02T00:00:00Z',compatibility:{pattern:{kind:'general'}},foods:[{id:'TEST_ONLY',unit:'g',k:1,p:.1,c:.1,f:.01,fi:.01,validated_at:'2026-11-01T23:00:00Z',expires_at:'2026-11-02T01:00:00Z',provenance:{foodId:'TEST_ONLY',unit:'g',provider:'usda_fdc',test_only:false,description:'TEST_ONLY transport fixture, not official',preparation:'raw',rawDigest:'TEST_ONLY',sourceUrl:'https://example.invalid/TEST_ONLY',perUnit:{k:1,p:.1,c:.1,f:.01,fi:.01}}}]};
const client={auth:{async getUser(){await authHook?.();return{data:{user:{id:'coach'}}};}},async rpc(name,args){calls.push({name,args});await rpcHook?.(name,args);
 if(name==='efg_get_coach_health_intake')return {data:{viewer_id:'coach',student_id:'student',organization_id:'org',revision:row.health_revision,processing_consent:true,followup_consent:true,shared_with_coach:true,conditions:{celiac:'confirmed'}}};
 if(name==='efg_read_bound_guide')return {data:structuredClone(row)};
 if(name==='efg_preview_clinical_bound_recipe')return {data:{...structuredClone(row),request_key:args.p_request_key,recipe_projection:args.p_recipe}};
 if(name==='efg_save_clinical_bound_recipe'){row={...row,draft_revision:row.draft_revision+1,guide:args.p_recipe};return{data:{...structuredClone(row),request_key:args.p_request_key,recipe_projection:args.p_recipe}};}
 throw Error('Unexpected transport operation '+name);
}};
const provider=createPersistedGuideProvider({client,readScope:()=>scope,template:[],clinical:true});
const input=await provider.load();assert.deepEqual(input.context.restrictions,['gluten']);assert.equal(input.catalog[0].glutenEvidence,null);
await provider.preview({expected:serverCompatibilityFrame(row),recipe:plan,requestKey:'TEST_ONLY',context:{sessionId:'session',sourceEpoch:1,organizationId:'org'}});
assert.deepEqual(calls.at(-1).args.p_recipe,recipeProjection(plan));
const readback=await provider.save(plan);assert.equal(readback.row.draft_revision,2);
assert.equal(calls.filter(c=>c.name==='efg_save_clinical_bound_recipe').length,1);
// Session/student change during Auth must prevent any subsequent RPC write.
authHook=()=>{scope={...scope,sourceEpoch:2,studentId:'other'};};const before=calls.filter(c=>c.name==='efg_save_clinical_bound_recipe').length;
await assert.rejects(()=>provider.save(plan));assert.equal(calls.filter(c=>c.name==='efg_save_clinical_bound_recipe').length,before);
authHook=null;scope={...initial};provider.invalidate();await provider.load();
rpcHook=name=>{if(name==='efg_preview_clinical_bound_recipe')scope={...scope,sourceEpoch:3};};
await assert.rejects(()=>provider.preview({expected:serverCompatibilityFrame(row),recipe:plan,requestKey:'TEST_ONLY',context:{sessionId:'session',sourceEpoch:1,organizationId:'org'}}),/STALE_RESPONSE/);
provider.invalidate();console.log('PASS provider transport fixture: load/preview/save/readback and stale Auth/response guards; NOT SQL');
