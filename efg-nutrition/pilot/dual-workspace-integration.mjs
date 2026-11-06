// Isolated integration boundary. Never rewrites legacy state.profile or state.org.
import {fail} from './dual-workspace-candidate.mjs?v=ncc-dual-workspace-r4-20261106';
export function createWorkspaceGateway({client,readLegacyPersonal,hasUnsavedDraft=()=>false}={}){
 let revision=0,rosterCache=null;
 const reset=()=>{revision++;rosterCache=null;};
 function verify(){
  const {contexts}=client.snapshot(),legacy=readLegacyPersonal();
  if(!contexts||!legacy?.profile||legacy.profile.user_id!==contexts.user_id||
     legacy.profile.role!==contexts.profile_role)fail('LEGACY_CONTEXT_MISMATCH','La cuenta personal cambió. Revalidá la sesión.');
  if(contexts.profile_role==='student'&&(legacy.profile.organization_id!==contexts.student_context.organization_id||
     legacy.organization?.id!==contexts.student_context.organization_id))
    fail('LEGACY_CONTEXT_MISMATCH','El vínculo personal no coincide. No se abre el espacio profesional.');
  return {contexts,legacy};
 }
 async function refresh(){reset();await client.refresh();verify();return view();}
 function view(){
  const {contexts,legacy}=verify(),snapshot=client.snapshot();
  const professional=contexts.coach_contexts.find(o=>'coach:'+o.id===snapshot.selected)||null;
  return structuredClone({selected:snapshot.selected,choices:snapshot.choices,
   originalProfile:legacy.profile,originalOrganization:legacy.organization,
   professional,professionalState:professional?(professional.legal_ready===true?'candidate_roster':'professional_terms'):'personal',
   roster:rosterCache});
 }
 function enter(key){
  verify();
  if(hasUnsavedDraft())fail('UNSAVED_PERSONAL_DRAFT','Guardá o cancelá tu edición actual antes de cambiar de espacio.');
  reset();client.select(key);return view();
 }
 async function roster(){
  verify();const ticket=revision;rosterCache=null;
  const data=await client.roster();
  if(ticket!==revision)fail('STALE_WORKSPACE','La vista cambió; la respuesta anterior se descartó.');
  verify();rosterCache=structuredClone(data);return structuredClone(data);
 }
 function privateStudentData(){
  // Do not route the new capability through legacy role='coach' handlers.
  fail('PROFESSIONAL_DATA_NOT_INTEGRATED','Las fichas, guías, mensajes y pagos profesionales requieren integración de servidor revisada.');
 }
 return Object.freeze({refresh,view,enter,roster,privateStudentData,clear:reset});
}
