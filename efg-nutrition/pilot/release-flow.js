// DRAFT orchestration adapter. Not mounted by pilot.js; no real backend configured.
// Server must independently enforce release enablement, identity and legal access.
import {releaseAcknowledgment,seenVersionRequest} from './release-communications.js';
export function createReleaseFlow({enabled=false,backend,hasUnsavedChanges=()=>true,signOut}={}){
 let busy=false;
 async function run(action){
  if(!enabled)throw Error('Experiencia de lanzamiento desactivada.');
  if(busy)throw Error('Hay una operación en curso.');
  busy=true;
  try{
   const status=await backend.current();
   const {manifest,role,userId}=status||{};
   if(!userId||status.ownerEnabled!==true)throw Error('Lanzamiento no autorizado por el servidor.');
   if(action==='preview'){
    if(manifest?.phase!=='preview')throw Error('El aviso previo no está disponible.');
    return await backend.acknowledge(releaseAcknowledgment(manifest,role));
   }
   if(action==='reauth'){
    if(manifest?.phase!=='reauth_required'||status.backendReady!==true)throw Error('Reingreso todavía no habilitado.');
    if(await hasUnsavedChanges())return {state:'save_required'};
    const request=releaseAcknowledgment(manifest,role);
    const receipt=await backend.acknowledge(request);
    // Failed/lost receipt never triggers a logout. Retry is server-idempotent.
    if(receipt?.userId!==userId||receipt?.releaseId!==manifest.id||receipt?.kind!==request.acknowledgment_kind||!Number.isFinite(Date.parse(receipt?.recordedAt)))throw Error('No se confirmó la lectura en el servidor.');
    if(await hasUnsavedChanges())return {state:'save_required'};
    const fresh=await backend.current();
    if(fresh.userId!==userId||fresh.manifest?.id!==manifest.id||fresh.manifest?.phase!=='reauth_required'||fresh.ownerEnabled!==true||fresh.backendReady!==true)throw Error('Cambió la sesión o el lanzamiento. Volvé a revisar el aviso.');
    await signOut();
    return {state:'signed_out'};
   }
   if(action==='begin'){
    if(status.legalSatisfied!==true)throw Error('Falta revisar los documentos vigentes.');
    // Server, not a device-local list, owns the once-per-person/version receipt.
    return await backend.markSeen(seenVersionRequest(manifest,role));
   }
   throw Error('Acción desconocida.');
  }finally{busy=false;}
 }
 return {acknowledgePreview:()=>run('preview'),acknowledgeAndSignOut:()=>run('reauth'),begin:()=>run('begin')};
}
