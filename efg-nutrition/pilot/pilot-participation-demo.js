// COACH98 — PROVISIONAL PILOT PARTICIPATION NOTICE / DEMO ONLY.
// NOT legal terms, not a privacy policy, not consent to disclose health data.
// Do not activate for real users before independently verified, server-owned
// persistence and privacy information. No localStorage, no simulated consent rows.
export const PILOT_PARTICIPATION_ENABLED=false;
export const PILOT_PARTICIPATION_VERSION="coach_pilot_2026_demo1";
export const PILOT_PARTICIPATION_TEXT=Object.freeze({
 heading:"Participación en el piloto de Nutrición Con-Ciencia",
 paragraphs:Object.freeze([
  "Esta es una versión de prueba de la aplicación. Algunas funciones pueden contener errores y cambiar durante las evaluaciones.",
  "La información nutricional y los ejemplos de alimentación son orientativos y no reemplazan la atención de profesionales de la salud.",
  "Participar es voluntario. Podés dejar de usar el piloto y solicitar asistencia con tus datos cuando quieras.",
  "No ingreses diagnósticos, resultados médicos, alergias ni otros datos de salud sensibles en esta versión de prueba."
 ]),
 participation:"Quiero participar voluntariamente en las pruebas de Nutrición Con-Ciencia.",
 sharing:"Autorizo que mi coach vea la ficha nutricional que elija compartir para participar en el seguimiento del piloto. Puedo retirar este permiso."
});
const escapeHTML=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export function renderPilotParticipationNotice({version=PILOT_PARTICIPATION_VERSION,serverReceipts=false}={}){
 if(version!==PILOT_PARTICIPATION_VERSION)throw Error("Versión piloto no verificada.");
 return '<section class="card efg-pilot-participation" aria-labelledby="efgPilotHeading">'+
  '<span class="eyebrow">VERSIÓN DE PRUEBA · DOCUMENTO PROVISIONAL</span>'+
  '<h2 id="efgPilotHeading">'+escapeHTML(PILOT_PARTICIPATION_TEXT.heading)+'</h2>'+
  PILOT_PARTICIPATION_TEXT.paragraphs.map(p=>'<p>'+escapeHTML(p)+'</p>').join("")+
  '<p class="pilot-hint">Para continuar confirmá tu participación. Compartir la ficha con tu coach es una decisión independiente y opcional: si no la autorizás, podés guardar la ficha privada y consultar tus datos anteriores, pero el coach no podrá preparar un plan nuevo a partir de ella.</p>'+ 
  '<p class="pilot-hint">'+(serverReceipts?'Tus dos decisiones se guardarán en el servidor con tu cuenta y podrás retirarlas. No equivalen a términos legales definitivos ni a consentimiento para tratar datos de salud.':'Esta pantalla es una simulación para validar la experiencia. No equivale a términos legales definitivos ni autoriza tratamientos médicos.')+'</p>'+
  '<label><input type="checkbox" id="efgPilotParticipate" required>'+escapeHTML(PILOT_PARTICIPATION_TEXT.participation)+'</label>'+
  '<label><input type="checkbox" id="efgPilotShare">'+escapeHTML(PILOT_PARTICIPATION_TEXT.sharing)+'</label>'+
  '<button type="button" class="btn" id="efgPilotContinue" data-act="pilotDemoContinue" disabled>Continuar con la prueba</button>'+
  '</section>';
}
export function readPilotParticipationSelection(doc,{explicitClick=false}={}){
 if(explicitClick!==true||typeof doc?.getElementById!=="function")
  throw Error("La participación requiere una acción expresa.");
 const participate=doc.getElementById("efgPilotParticipate");
 const share=doc.getElementById("efgPilotShare");
 if(!participate||!share||typeof participate.checked!=="boolean"||typeof share.checked!=="boolean")
  throw Error("Faltan las decisiones separadas.");
 if(participate.checked!==true)throw Error("No se confirmó la participación voluntaria.");
 // A selection is NOT an acceptance receipt. The authorized hosted API must
 // record the user, version, timestamp and choice once it is built and tested.
 return Object.freeze({
  version:PILOT_PARTICIPATION_VERSION,
  participationRequested:true,
  sharingRequested:share.checked,
  persisted:false,
  legalAcceptance:false
 });
}

// UI only: no acceptance is saved and no permissions are granted here.
// Controller must call this on each checkbox change and before enabling Continue.
export function syncPilotParticipationContinueButton(doc){
 if(typeof doc?.getElementById!=="function")throw Error("Formulario piloto no disponible.");
 const participation=doc.getElementById("efgPilotParticipate");
 const sharing=doc.getElementById("efgPilotShare");
 const button=doc.getElementById("efgPilotContinue");
 if(!participation||!sharing||!button||
    typeof participation.checked!=="boolean"||typeof sharing.checked!=="boolean")
  throw Error("El formulario piloto está incompleto.");
 const ready=participation.checked===true;
 button.disabled=!ready;
 return ready;
}

// Hook for the isolated pilot preview; a future production route must call the
// server acceptance/permission RPC and verify it before navigating.
export function bindPilotParticipationDemo(doc,{onContinue}={}){
 if(typeof doc?.getElementById!=="function"||typeof onContinue!=="function")
  throw Error("Falta el controlador de la participación piloto.");
 const participate=doc.getElementById("efgPilotParticipate");
 const share=doc.getElementById("efgPilotShare");
 const button=doc.getElementById("efgPilotContinue");
 if(!participate||!share||!button||
    typeof participate.addEventListener!=="function"||
    typeof share.addEventListener!=="function"||
    typeof button.addEventListener!=="function")
  throw Error("No se pueden enlazar los controles del piloto.");
 const sync=()=>syncPilotParticipationContinueButton(doc);
 participate.addEventListener("change",sync);
 share.addEventListener("change",sync);
 button.addEventListener("click",()=>{
  const choice=readPilotParticipationSelection(doc,{explicitClick:true});
  if(!sync())throw Error("Confirmá tu participación antes de continuar.");
  onContinue(choice); // Demo only, NEVER a server acceptance.
 });
 sync();
 return {ready:sync};
}
