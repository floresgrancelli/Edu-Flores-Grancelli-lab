import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {syntheticResponse} from './dual-workspace-fullapp-server.mjs';
import {createProfessionalContextualTransport} from '../pilot/professional-screens-transport.mjs?v=ncc-professional-reconciliation-r1-20261107';
import {IDS} from './professional-screens-fixture.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('full app uses dedicated SDK only in an explicit local professional fixture',()=>{
 const disk=read('../pilot/pilot.js');
 assert.match(disk,/createProfessionalContextualTransport/);assert.match(disk,/navigationTarget:window/);
 assert.doesNotMatch(disk,/professional-screens-fullapp-sdk/);
 const patched=syntheticResponse('/efg-nutrition/pilot/pilot.js',disk,{professionalScreens:true});
 assert.match(patched,/from "\.\.\/tests\/professional-screens-fullapp-sdk.mjs"/);
 assert.match(patched,/bindApp\(syntheticHooks\)/);assert.match(patched,/SUPABASE_URL=new URL\("\/",location.origin\)\.href/);
 assert.doesNotMatch(patched,/https?:\/\/|sb_publishable_/);assert.equal(read('../pilot/pilot.js'),disk);
});
test('all professional gates stay OFF on disk and in ordinary dual fixture responses',()=>{
 for(const [file,flags] of [['candidate',['PROFESSIONAL_SCREENS_RELEASE_ENABLED']],['transport',['PROFESSIONAL_TRANSPORT_ENABLED','PROFESSIONAL_BACKEND_EXECUTION_ENABLED']]]){
  const path='/efg-nutrition/pilot/professional-screens-'+file+'.mjs',disk=read('../pilot/professional-screens-'+file+'.mjs');
  for(const flag of flags){assert.match(disk,new RegExp(flag+' = false'));assert.match(syntheticResponse(path,disk),new RegExp(flag+' = false'));assert.match(syntheticResponse(path,disk,{professionalScreens:true}),new RegExp(flag+' = true'));}
  assert.equal(read('../pilot/professional-screens-'+file+'.mjs'),disk);
 }
});
test('full app SDK is synthetic, uses visible controls and no external transport',()=>{
 const sdk=read('./professional-screens-fullapp-sdk.mjs');assert.match(sdk,/No JWT, RLS or HTTP parity claim/);
 assert.doesNotMatch(sdk,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|refresh_token/);
 for(const label of ['Iniciar alumna dual ficticia','Comprobar vínculo personal','Revocar capacidad ficticia','Cerrar sesión ficticia'])assert.ok(sdk.includes(label));
});
test('integrated SDK fixture covers exact contextual query shapes, writes and revocation',async()=>{
 const previous={document:globalThis.document,location:globalThis.location};
 globalThis.location={hostname:'127.0.0.1',origin:'http://127.0.0.1:12345'};
 const elem=()=>({style:{},append(){},addEventListener(){},setAttribute(){}});
 globalThis.document={createElement:elem,body:{prepend(){}}};
 try{
  const {createClient,bindApp,fixture}=await import('./professional-screens-fullapp-sdk.mjs?contract='+Date.now());
  const state={};bindApp({state,resetPrivateSession(){state.authContextEpoch=(state.authContextEpoch||0)+1;},render:async()=>{},frame:{ready:async()=>{}},today:()=> '2026-11-07'});
  await fixture.loginAs();const sdk=createClient(location.origin+'/');
  const scope={userId:IDS.dual,sessionId:'synthetic-session-one',sessionEpoch:state.authContextEpoch,organizationId:IDS.professional,navigationEpoch:1};
  const transport=createProfessionalContextualTransport({sdk,readContext:()=>scope,enabled:true,executionEnabled:true,environment:()=> 'localhost',backendUrl:location.origin+'/'});
  const contexts=(await sdk.rpc('ncc_dual_workspace_contexts_v1',{})).data;assert.equal(Object.hasOwn(contexts.coach_contexts[0],'payment_alias'),false);
  assert.equal((await transport.perform('workspace',{},scope)).data.organization.payment_alias,'PROFESIONAL.DEMO');
  assert.equal((await transport.perform('setAlias',{p_alias:'INTEGRADO.DEMO'},scope)).data,true);
  assert.equal((await transport.perform('recipes',{p_student:IDS.pupil},scope)).data[0].name,'Receta FICTICIA');
  const pair={student_id:IDS.pupil,coach_id:IDS.dual};const messages=(await transport.perform('messages',pair,scope)).data;assert.equal(messages.length,1);
  assert.equal((await transport.perform('markRead',{...pair,ids:[messages[0].id]},scope)).data[0].sender_id,IDS.pupil);
  const sent=(await transport.perform('sendMessage',{...pair,sender_id:IDS.dual,body:'APP COMPLETA FICTICIA'},scope)).data;assert.equal(sent.body,'APP COMPLETA FICTICIA');
  assert.equal(fixture.preserved(),true);const reads=fixture.calls().filter(c=>c.table==='efg_organizations');
  assert.ok(reads.every(c=>c.selected==='id,coach_id,payment_alias'&&c.filters.some(([k,v])=>k==='id'&&v===IDS.professional)));
  fixture.revoke();await assert.rejects(transport.perform('workspace',{},scope),error=>error.code==='DENIED');assert.equal(fixture.preserved(),true);
 }finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});

test('shared synthetic helper is initialized before bootstrap and frame even with flags OFF',()=>{
 const source=read('../pilot/pilot.js'),declaration=source.indexOf('const professionalSyntheticEnvironment='),bootstrap=source.indexOf('const dualWorkspaceBootstrap='),frame=source.indexOf('const dualWorkspaceFrame=');
 assert.ok(declaration>=0&&declaration<bootstrap&&bootstrap<frame,'No temporal dead zone in OFF app bootstrap');
});
