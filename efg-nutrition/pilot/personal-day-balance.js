// NUT-63 · Daily progress / "Resolver lo que me falta" arithmetic for future Personal.
// OFF. Pure educational preview from verified local meal drafts; no network or write.
// It suggests nutrient targets only, NEVER food prescriptions or clinical advice.
import {PERSONAL_MEALS} from "./personal-workspace.js";
import {previewPersonalMeal} from "./personal-meal-draft.js";

export const PERSONAL_DAY_BALANCE_ENABLED=false;
const keys=["k","p","c","f","fi"];
const mapping=Object.freeze({k:"kcal",p:"protein_g",c:"carb_g",f:"fat_g",fi:"fiber_g"});
const labels=Object.freeze({k:"Energía",p:"Proteínas",c:"Hidratos",f:"Grasas",fi:"Fibra"});
const slots=PERSONAL_MEALS.map(m=>m.id);
const isNumber=n=>typeof n==="number"&&Number.isFinite(n)&&n>=0;
const one=n=>Math.round((n+Number.EPSILON)*10)/10;
const toTenth=n=>Math.round(n*10);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function dayValid(s){
 if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const date=new Date(s+"T12:00:00Z");
 return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===s;
}
function exactSplitTenths(amount,remainingSlots){
 const result=Object.fromEntries(remainingSlots.map(slot=>[slot,0]));
 if(!remainingSlots.length||!amount)return result;
 if(remainingSlots.length===1){result[remainingSlots[0]]=amount/10;return result;}
 // Exactly 1/3 to afternoon snack, 2/3 to dinner, including odd tenths.
 const third=Math.round(amount/3);
 result.media_tarde=third/10;result.cena=(amount-third)/10;
 return result;
}
export function calculatePersonalDayBalance({day,goalPreview,drafts=[],catalog=[],remainingSlots=["media_tarde","cena"]}={}){
 if(!dayValid(day))throw Error("La fecha del balance diario no es válida.");
 if(goalPreview?.previewOnly!==true||goalPreview.approved!==false||
   goalPreview.persistent!==false||goalPreview.canGenerateFoodGuide!==false||
   !keys.every(k=>isNumber(goalPreview.totals?.[mapping[k]])&&
     Number.isInteger(goalPreview.totals[mapping[k]])))
  throw Error("Se requiere una estimación orientativa de objetivos, nunca un plan aprobado ficticio.");
 if(!Array.isArray(drafts)||drafts.length>5||!Array.isArray(catalog)||
   !Array.isArray(remainingSlots)||remainingSlots.length>2||
   new Set(remainingSlots).size!==remainingSlots.length||
   remainingSlots.some(slot=>!["media_tarde","cena"].includes(slot)))
  throw Error("Comidas restantes o catálogo inválidos.");
 const draftsBySlot={};
 for(const draft of drafts){
  if(!draft||draft.day!==day||!slots.includes(draft.slot)||draftsBySlot[draft.slot])
   throw Error("Hay comidas repetidas, ajenas o de otra fecha.");
  // The catalog is revalidated at this boundary, never trust caller-supplied macros.
  draftsBySlot[draft.slot]=previewPersonalMeal(draft,catalog);
 }
 for(const slot of remainingSlots){
  if(draftsBySlot[slot]?.entries.length)
   throw Error("La comida "+slot+" ya tiene alimentos: no vuelvas a repartirla.");
 }
 const consumed=Object.fromEntries(keys.map(k=>[
  k,one(Object.values(draftsBySlot).reduce((total,m)=>total+m.totals[k],0))
 ]));
 const target=Object.fromEntries(keys.map(k=>[k,goalPreview.totals[mapping[k]]]));
 const lacking={},excess={};
 for(const key of keys){
  const delta=toTenth(target[key])-toTenth(consumed[key]);
  lacking[key]=Math.max(0,delta)/10;
  excess[key]=Math.max(0,-delta)/10;
 }
 const distribution=remainingSlots.map(slot=>({
  slot,label:PERSONAL_MEALS.find(m=>m.id===slot).label,
  targets:Object.fromEntries(keys.map(key=>{
   const parts=exactSplitTenths(toTenth(lacking[key]),remainingSlots);
   return [key,parts[slot]||0];
  }))
 }));
 const summary=slots.map(slot=>({
  slot,label:PERSONAL_MEALS.find(m=>m.id===slot).label,
  registered:!!draftsBySlot[slot],ingredients:draftsBySlot[slot]?.entries.length||0,
  totals:draftsBySlot[slot]?.totals||Object.fromEntries(keys.map(k=>[k,0]))
 }));
 const kcalFraction=target.k>0?consumed.k/target.k:null;
 return {
  previewOnly:true,persistent:false,approved:false,
  day,goalType:goalPreview.goal,summary,consumed,target,lacking,excess,
  remainingSlots:[...remainingSlots],distribution,
  kcalFraction,allMealsEntered:summary.every(m=>m.registered),
  note:"Cálculo aritmético provisional. No genera alimentos ni presupone un estado de salud. Merienda 1/3 y cena 2/3 SOLO si faltan ambas."
 };
}
export function renderPersonalDayBalance(report){
 if(report?.previewOnly!==true||report.persistent!==false||report.approved!==false||
   !dayValid(report.day)||!Array.isArray(report.summary)||report.summary.length!==5||
   !Array.isArray(report.distribution)||report.distribution.length>2||
   !keys.every(k=>isNumber(report.target?.[k])&&isNumber(report.consumed?.[k])&&
    isNumber(report.lacking?.[k])&&isNumber(report.excess?.[k]))||
   report.summary.some((m,i)=>m.slot!==slots[i])||
   report.distribution.some(x=>!["media_tarde","cena"].includes(x.slot)))
  throw Error("Vista previa de balance diario inválida.");
 const format=n=>Number(n).toLocaleString("es-AR",{maximumFractionDigits:1});
 const rows=keys.map(k=>'<tr><th scope="row">'+labels[k]+'</th>'+
  '<td>'+format(report.target[k])+'</td><td>'+format(report.consumed[k])+'</td>'+
  '<td>'+format(report.lacking[k])+'</td><td>'+format(report.excess[k])+'</td></tr>').join("");
 const proposal=report.distribution.length
  ?'<div class="efg-self-balance-suggestions"><h4>Distribución orientativa de lo pendiente</h4>'+
    report.distribution.map(m=>'<p><strong>'+esc(m.label)+':</strong> '+
      format(m.targets.k)+' kcal · '+format(m.targets.p)+' g proteínas · '+
      format(m.targets.c)+' g hidratos · '+format(m.targets.f)+' g grasas</p>').join("")+'</div>'
  :'<p>Sin distribución de comidas restantes: revisá tu registro completo.</p>';
 return '<section class="efg-self-balance" aria-labelledby="efgSelfBalanceHeading">'+
  '<span class="eyebrow">BALANCE ILUSTRATIVO · NO GUARDADO</span>'+
  '<h3 id="efgSelfBalanceHeading">Lo que llevo y lo que falta</h3>'+
  '<p class="efg-self-muted">Los faltantes son diferencias aritméticas, no indicaciones para comer obligatoriamente. Un exceso no se compensa con cantidades negativas.</p>'+
  '<div class="efg-self-plan-scroll"><table><caption>Objetivos de prueba frente a registros de prueba</caption>'+
  '<thead><tr><th>Nutriente</th><th>Objetivo</th><th>Registrado</th><th>Faltante</th><th>Exceso</th></tr></thead>'+
  '<tbody>'+rows+'</tbody></table></div>'+proposal+
  '<p class="efg-self-muted">'+esc(report.note)+'</p></section>';
}
