import {DUAL_WORKSPACE_RELEASE_ENABLED,createDualWorkspaceClient,fail} from './dual-workspace-candidate.mjs?v=ncc-dual-workspace-r4-20261106';
import {workspaceIdentity} from './dual-workspace-frame.mjs?v=ncc-professional-reconciliation-r1-20261107';

// The SQL claim derives verified auth.uid()/email itself. This adapter never
// creates Auth accounts, submits OTPs, edits profiles or grants permissions.
// An absent invitation has one exact SQL contract; other denials fail closed.
export const isAbsentCoachInvitation=error=>error?.code==='42501'&&error?.message==='No matching coach invitation';
export function createDualWorkspaceBootstrap({enabled=DUAL_WORKSPACE_RELEASE_ENABLED,
 syntheticEnvironment=()=>false,readSession,readProfile,rpc,requestId}={}){
 let identity=null,client=null,pending=null;
 function invalidate(){identity=null;client=null;pending=null;}
 function check(ticket){
  if(workspaceIdentity(readSession?.())!==ticket)
   fail('STALE_AUTH_CONTEXT','La sesión cambió durante la habilitación candidata.');
 }
 function resolve(user){
  if(!enabled)return Promise.resolve({mode:'legacy',skipLegacyClaim:false});
  if(!syntheticEnvironment()||!user?.email?.endsWith('@example.invalid'))
   return Promise.resolve({mode:'legacy',skipLegacyClaim:false});
  const scope=readSession?.(),ticket=workspaceIdentity(scope);
  if(!ticket||scope.userId!==user.id)return Promise.reject(Object.assign(new Error('Sesión candidata no verificada.'),{code:'STALE_AUTH_CONTEXT'}));
  if(identity!==ticket){invalidate();identity=ticket;
   client=createDualWorkspaceClient({enabled:true,rpc,requestId,readSession:()=>{
    const s=readSession?.();return workspaceIdentity(s)?{userId:s.userId,sessionId:JSON.stringify([s.sessionId,s.epoch])}:null;
   }});
  }
  if(pending)return pending;
  const currentClient=client;
  const read=async()=>{
   check(ticket);const result=await readProfile(user.id);check(ticket);
   if(result?.error)throw result.error;
   const profile=result?.data??null;
   if(profile&&(profile.user_id!==user.id||profile.email?.toLowerCase()!==user.email.toLowerCase()||profile.active!==true))
    fail('BOOTSTRAP_PROFILE_MISMATCH','No se verificó el perfil de esta sesión.');
   return profile;
  };
  const execute=async()=>{
   let profile=await read(),claimed=false;
   if(!profile){
    try{check(ticket);await currentClient.claimPilot();check(ticket);claimed=true;}
    catch(error){check(ticket);if(isAbsentCoachInvitation(error))return {mode:'legacy',skipLegacyClaim:false};throw error;}
    profile=await read();
    if(!profile)fail('BOOTSTRAP_PROFILE_MISSING','El servidor no confirmó el perfil reclamado. No se repetirá por otra vía.');
   }
   // Existing students/admins never run a candidate claim. A student created
   // concurrently is returned exactly as stored; never rewrite role or org.
   if(profile.role!=='coach'){
    if(claimed&&profile.role!=='student')fail('BOOTSTRAP_PROFILE_MISMATCH','El perfil reclamado no coincide.');
    return {mode:'legacy',skipLegacyClaim:claimed,profile:claimed?profile:undefined};
   }
   check(ticket);const snapshot=await currentClient.refresh();check(ticket);
   if(snapshot.contexts.profile_role!==profile.role)fail('BOOTSTRAP_CONTEXT_MISMATCH','El contexto profesional no coincide con el perfil.');
   if(snapshot.contexts.coach_contexts.length)
    return {mode:'candidate_coach',skipLegacyClaim:true,profile,contexts:snapshot.contexts};
   // The current SQL does not distinguish a legacy coach from a revoked candidate.
   // Memory is insufficient after reload; ON/synthetic must never fall into clinical legacy.
   fail('BOOTSTRAP_CONTEXT_UNAVAILABLE','No se pudo verificar el espacio candidato de esta cuenta. No se abrirán herramientas legacy.');
  };
  const task=execute().finally(()=>{if(pending===task)pending=null;});pending=task;return task;
 }
 return Object.freeze({resolve,invalidate});
}
