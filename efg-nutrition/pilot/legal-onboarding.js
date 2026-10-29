// EFG Nutrition Pro · versioned legal onboarding UI contract (DRAFT, OFF by default).
// Server-authenticated RPC/RLS remains the authority; this module stores NOTHING.
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const allowed=new Set(["terms","privacy"]);
function asDocs(documents){
 if(!Array.isArray(documents)||documents.length!==2)throw Error("Documentos legales no disponibles.");
 const seen=new Set();
 for(const d of documents){
  if(!d||!allowed.has(d.kind)||seen.has(d.kind)||d.status!=="published"||
     !/^[A-Za-z0-9._-]{1,32}$/.test(d.version||"")||
     !/^[a-f0-9]{64}$/i.test(d.sha256||"")||
     !/^[A-Za-z0-9_-]{6,128}$/.test(d.id||"")||
     !Array.isArray(d.sections)||!d.sections.length||
     d.sections.some(s=>!s||typeof s.heading!=="string"||typeof s.body!=="string"||
       !s.heading.trim()||!s.body.trim()))throw Error("Documento legal incompleto o sin publicar.");
  seen.add(d.kind);
 }
 if(!seen.has("terms")||!seen.has("privacy"))throw Error("Faltan los documentos obligatorios.");
 return Object.fromEntries(documents.map(x=>[x.kind,x]));
}
export const LEGAL_ONBOARDING_ENABLED=false; // May change ONLY after approved text, staging and gated backend.
export function legalOutstanding(documents,accepted=[]){
 const docs=asDocs(documents);
 return ["terms","privacy"].filter(kind=>!accepted.some(a=>a&&a.kind===kind&&a.document_id===docs[kind].id&&
  a.document_hash_sha256===docs[kind].sha256&&a.version===docs[kind].version));
}
export function renderLegalOnboarding(documents,accepted=[]){
 const docs=asDocs(documents),missing=legalOutstanding(documents,accepted);
 if(!missing.length)return "";
 const headings={terms:"Términos y Condiciones",privacy:"Política de Privacidad"};
 const msg={terms:"Leí y acepto expresamente los Términos y Condiciones indicados.",
  privacy:"Leí y tomé conocimiento de la Política de Privacidad indicada. Esto no autoriza compartir mis datos de salud."};
 return '<section class="card efg-legal-entry" aria-labelledby="efgLegalHeading">'+
 '<span class="eyebrow">EFG NUTRITION · TU INFORMACIÓN</span><h2 id="efgLegalHeading">Antes de empezar</h2>'+
 '<p>Revisá cada documento completo. Tus permisos de seguimiento y los datos de salud se gestionan por separado.</p>'+
 missing.map(kind=>{
  const d=docs[kind];return '<details class="efg-legal-document" data-legaldoc="'+kind+'"><summary>'+
   headings[kind]+' · versión '+esc(d.version)+'</summary>'+
   '<div class="efg-legal-readable">'+d.sections.map(s=>'<h3>'+esc(s.heading)+'</h3><p>'+esc(s.body)+'</p>').join("")+'</div></details>'+
   '<label class="efg-legal-check"><input type="checkbox" id="efgLegalCheck_'+kind+'" value="'+esc(d.id)+'" required>'+
   esc(msg[kind])+'</label>';
 }).join("")+
 '<p class="pilot-hint">Si no estás de acuerdo, podés cerrar sesión y consultar tus derechos o pedir ayuda sin compartir información adicional.</p>'+
 '<button class="btn" type="button" data-act="confirmLegalAcceptance">Confirmar y continuar</button>'+
 '<button class="btn small ghost" type="button" data-act="logout">Cerrar sesión</button></section>';
}
export function makeLegalAcceptanceRequest(documents,accepted,checked){
 const docs=asDocs(documents),missing=legalOutstanding(documents,accepted);
 if(!checked||missing.some(k=>checked[k]!==true))throw Error("Revisá y confirmá por separado los documentos pendientes.");
 // Identifiers ONLY; the server verifies publication/version/hash and supplies its own user/time.
 return missing.map(kind=>({document_id:docs[kind].id,acceptance_method:"explicit_checkbox"}));
}
