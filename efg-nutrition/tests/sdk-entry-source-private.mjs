import assert from 'node:assert/strict';
// Applied to the HTTP response in a disposable CI server, NEVER the deployed source.
// Keep the application's authentic pinned SDK import and every hydration/form handler.
export function localSdkEntrySource(source,{apiUrl,publishableKey,origin,declarationPanel=false,official=null}){
 assert.ok(['http://127.0.0.1:54321','http://localhost:54321'].includes(apiUrl));
 assert.match(origin,/^http:\/\/127\.0\.0\.1:[0-9]+$/);
 assert.equal(typeof publishableKey,'string');assert.ok(publishableKey.length>20);
 if(!publishableKey.startsWith('sb_publishable_')){
  const parts=publishableKey.split('.');assert.equal(parts.length,3);
  assert.equal(JSON.parse(Buffer.from(parts[1],'base64url')).role,'anon','Never expose service-role credentials in a browser');
 }
 assert.ok(source.includes('https://esm.sh/@supabase/supabase-js@2.118.0'));
 const replace=(pattern,value)=>{assert.equal([...source.matchAll(pattern)].length,1,'Source marker changed');source=source.replace(pattern,value);};
 replace(/^const SUPABASE_URL="[^"]+";/gm,'const SUPABASE_URL='+JSON.stringify(apiUrl)+';');
 replace(/^const SUPABASE_PUBLISHABLE="[^"]+";/gm,'const SUPABASE_PUBLISHABLE='+JSON.stringify(publishableKey)+';');
 replace(/emailRedirectTo:"https:\/\/efg-nutrition.onrender.com\/pilot\/"/g,'emailRedirectTo:'+JSON.stringify(origin+'/efg-nutrition/pilot/'));
 if(official){
  assert.equal(official.ids.length,9);
  replace(/const coachPersistedGuideSource=null;/g,'const coachPersistedGuideSource=createPersistedGuideProvider({client:sb,readScope:adaptedCoachScope,template:'+JSON.stringify(official.template)+'});');
  replace(/const coachBoundPublication=null;/g,'const coachBoundPublication=createBoundGuidePublication({sb,readScope:adaptedCoachScope,enabled:true});');
  source="import {createPersistedGuideProvider} from './persisted-guide-provider.js';\nimport {createBoundGuidePublication} from './bound-guide-publication-client.js';\nimport {createBoundGuidePreparation} from './coach-bound-guide-preparation.js';\n"+source+`
const sdkPreparation=createBoundGuidePreparation({sb,readScope:adaptedCoachScope,readGoal:()=>state.pendingGoal,
 foodIds:${JSON.stringify(official.ids)},onSaved:async id=>{await loadStudentDetail(id);await render();}});
new MutationObserver(()=>{
 const target=document.getElementById('goalPreview');
 if(!target||state.profile?.role!=='coach'||!state.pendingGoal||target.querySelector('[data-sdk-prepare-mount]'))return;
 const host=document.createElement('div');host.dataset.sdkPrepareMount='';target.append(host);sdkPreparation.mount(host);
}).observe(root,{childList:true,subtree:true});
`;
 }
 if(declarationPanel){
  source="import {createStudentRestrictionDeclaration} from './student-restriction-declaration.js';\n"+source+`
let sdkEntryEpoch=0,sdkEntryFingerprint=null,sdkEntryMount=null;
function sdkStudentContext(){
 const value={userId:state.session?.user?.id,sessionId:state.session?.session_id,
  organizationId:state.profile?.organization_id,role:state.profile?.role,active:state.profile?.active};
 const fp=JSON.stringify([value,state.coachPilotIntake?.revision,state.coachPilotIntake?.shared_at]);
 if(fp!==sdkEntryFingerprint){sdkEntryFingerprint=fp;sdkEntryEpoch++;}
 return {...value,epoch:sdkEntryEpoch};
}
const sdkDeclaration=createStudentRestrictionDeclaration({sb,readContext:sdkStudentContext,enabled:true});
new MutationObserver(()=>{
 const c=sdkStudentContext();
 if(sdkEntryMount&&(!sdkEntryMount.isConnected||sdkEntryMount.dataset.epoch!==String(c.epoch))){
  sdkDeclaration.invalidate();sdkEntryMount.remove();sdkEntryMount=null;
 }
 if(c.role!=='student'||!state.coachPilotIntake?.revision||!c.sessionId)return;
 if(root.querySelector('[data-sdk-declaration-open]'))return;
 const button=document.createElement('button');button.className='btn light';button.dataset.sdkDeclarationOpen='';
 button.textContent='Abrir declaración separada (ensayo local)';
 button.addEventListener('click',async()=>{
  if(sdkEntryMount){sdkDeclaration.invalidate();sdkEntryMount.remove();}
  const element=document.createElement('div');element.dataset.epoch=String(sdkStudentContext().epoch);
  root.append(element);sdkEntryMount=element;
  try{await sdkDeclaration.open(element);}catch(error){if(element.isConnected)element.textContent=error.message;}
 });root.append(button);
}).observe(root,{childList:true,subtree:true});
`;
 }
 return source+`\n// TEST-ONLY observability: no writable state, raw session, JWT, or response injection.
window.__SDK_ENTRY_QA__=Object.freeze({
 snapshot:()=>Object.freeze({userId:state.session?.user?.id??null,role:state.profile?.role??null,
  sessionId:state.session?.session_id??null,intakeRevision:state.coachPilotIntake?.revision??null,
  route:state.coachPilotEntry?.route??null,loading:state.loading===true}),
 guide:()=>structuredClone(coachAdaptedWorkspace.snapshot()),
 goal:()=>structuredClone(activeCoachGuideGoal()),
 readGuide:async id=>{const u=await sb.auth.getUser();if(u.error||!u.data?.user)throw Error('No session');
  const r=await sb.from('efg_food_plans').select('student_id,guided_goal_id,guided_plan').eq('student_id',id);
  if(r.error)throw Error('Guide read failed');return r.data;},
 probeForbiddenConsent:async id=>{const u=await sb.auth.getUser();if(u.error||!u.data?.user)throw Error('No session');
  if(id===u.data.user.id)throw Error('Probe only for a foreign row');
  const r=await sb.from('efg_consents').update({accepted:false,email_report_opt_in:false,updated_at:new Date().toISOString()}).eq('student_id',id).select('student_id');
  return {code:r.error?.code??null,rows:r.data?.length??0};},
 refreshSession:async()=>{const r=await sb.auth.refreshSession();return {ok:!r.error};}
});\n`;
}
export function localSdkEntryFlag(path,source){
 const flags={'/efg-nutrition/pilot/coach-student-journey.js':'COACH_STUDENT_JOURNEY_ENABLED',
  '/efg-nutrition/pilot/coach-legal-bridge.js':'COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED',
  '/efg-nutrition/pilot/coach-plan-draft-client.js':'COACH_ATOMIC_PLAN_UI_ENABLED',
  '/efg-nutrition/pilot/coach-release-plan-gate.js':'COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED',
  '/efg-nutrition/pilot/coach-adapted-workspace.js':'COACH_ADAPTED_GUIDE_PREVIEW_ENABLED'};
 const flag=flags[path];if(!flag)return source;
 const pattern=new RegExp('export const '+flag+'\\s*=\\s*false;','g');
 assert.equal([...source.matchAll(pattern)].length,1,'Local flag marker changed');
 return source.replace(pattern,'export const '+flag+'=true;');
}
