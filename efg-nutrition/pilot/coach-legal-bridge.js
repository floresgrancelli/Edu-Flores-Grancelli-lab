// COACH-67 · Versioned legal bridge for Coach re-entry (OFF).
// Reads public published legal docs + server-authenticated status; never manufactures
// acceptance or authorizes health-data sharing. Must be enabled ONLY after counsel GO.
import {LEGAL_ONBOARDING_ENABLED,legalOutstanding,renderLegalOnboarding,
 makeLegalAcceptanceRequest} from "./legal-onboarding.js";
export const COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED=false;
const hash=/^[a-f0-9]{64}$/i;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function assertStatus(rows){
 if(!Array.isArray(rows)||rows.length!==2||new Set(rows.map(r=>r?.kind)).size!==2||
  !["terms","privacy"].every(k=>rows.some(r=>r?.kind===k))||
  rows.some(r=>!uuid.test(r.document_id)||!hash.test(r.sha256)||
   typeof r.version!=="string"||!r.version||typeof r.accepted!=="boolean"))
  throw Error("No se pudieron verificar las versiones vigentes de Términos y Privacidad.");
 return rows;
}
function normalizeDocuments(rows,status){
 if(!Array.isArray(rows)||rows.length!==2)
  throw Error("Faltan versiones legales publicadas.");
 const byId=new Map(rows.map(r=>[r.id,r]));
 return status.map(x=>{
  const row=byId.get(x.document_id);
  if(!row||row.kind!==x.kind||row.version!==x.version||row.sha256!==x.sha256||
    row.status!=="published"||typeof row.content!=="string"||row.content.trim().length<100)
   throw Error("La versión legal publicada no coincide con la versión activa.");
  return {kind:row.kind,id:row.id,version:row.version,sha256:row.sha256,
   status:"published",sections:[{heading:row.kind==="terms"?
    "Términos y Condiciones completos":"Política de Privacidad completa",body:row.content}]};
 });
}
export async function loadCoachLegalOnboarding(sb,{enabled=COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED}={}){
 if(enabled!==true||LEGAL_ONBOARDING_ENABLED!==true)
  throw Error("La aceptación legal nueva no puede activarse sin revisión de textos y permisos.");
 if(typeof sb?.rpc!=="function"||typeof sb?.from!=="function)
  throw Error("Conexión legal no disponible.");
 const answer=await sb.rpc("efg_legal_current_status");
 if(answer.error)throw Error("No se pudo verificar el estado legal.");
 const status=assertStatus(answer.data);
 const current=await sb.from("efg_legal_documents")
  .select("id,kind,version,sha256,content,status")
  .in("id",status.map(x=>x.document_id)).limit(2);
 if(current.error)throw Error("No se pudieron consultar los textos legales completos.");
 const documents=normalizeDocuments(current.data,status);
 const accepted=status.filter(x=>x.accepted===true).map(x=>({
  kind:x.kind,document_id:x.document_id,version:x.version,
  document_hash_sha256:x.sha256
 }));
 return {documents,accepted,missing:legalOutstanding(documents,accepted)};
}
export function renderCoachLegalOnboarding(snapshot){
 if(!snapshot||!Array.isArray(snapshot.documents)||!Array.isArray(snapshot.accepted))
  throw Error("Documentos legales no verificados.");
 return renderLegalOnboarding(snapshot.documents,snapshot.accepted);
}
export async function acceptCoachLegalOnboarding(sb,snapshot,checked,{
 explicitSubmit=false,enabled=COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED
}={}){
 if(explicitSubmit!==true||enabled!==true||LEGAL_ONBOARDING_ENABLED!==true)
  throw Error("No se registró una aceptación legal explícita y habilitada.");
 if(typeof sb?.rpc!=="function)throw Error("No se pudo verificar el servidor.");
 const selections=makeLegalAcceptanceRequest(snapshot.documents,snapshot.accepted,checked);
 if(!selections.length)return loadCoachLegalOnboarding(sb,{enabled:true});
 const ids=selections.map(x=>x.document_id);
 if(ids.some(id=>!uuid.test(id)))throw Error("Identificador legal inválido.");
 const r=await sb.rpc("efg_accept_legal_documents",{p_document_ids:ids});
 if(r.error)throw Error("No se pudo registrar la aceptación legal en el servidor.");
 // Never trust the mutation response alone. Re-read current status + documents,
 // which may have been replaced by a new published version since submission.
 const verified=await loadCoachLegalOnboarding(sb,{enabled:true});
 if(verified.missing.length)throw Error("El servidor no confirmó ambas versiones vigentes; volvé a revisarlas.");
 return verified;
}
