// Coach 01-05 — private health declaration mapping, client-side defense in depth.
// The server must independently enforce identity, relationship, legal/health
// processing consent, organization and RLS. Clinical module remains OFF.
import {guideFoodSignal} from './guided-day-v2.js?v=ncc-quinoa-r1-20261114';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODES=new Set(['celiac','lactose_intolerance','food_allergy','sibo','diabetes','hypertension','dyslipidemia','fatty_liver']);
const STATUSES=new Set(['confirmed','suspected','not_reported']);
export const UNVERIFIED_RESTRICTIONS_NOTICE='Restricciones sin verificar: no presupongas ausencia de celiaquía, intolerancias o alergias. Revisá el perfil antes de aprobar alimentos.';
const unknown=()=>({verified:false,restrictionStatus:'unknown',restrictions:[],reviewNotes:[UNVERIFIED_RESTRICTIONS_NOTICE]});
export function readVerifiedCoachRestrictionScope(row,{studentId,coachId,organizationId,now=Date.now()}={}){
 if(!UUID.test(studentId||'')||!UUID.test(coachId||'')||!UUID.test(organizationId||'')||
  !row||row.student_id!==studentId||row.viewer_id!==coachId||
  row.organization_id!==organizationId||row.revoked===true||
  row.shared_with_coach!==true||row.processing_consent!==true||
  row.followup_consent!==true||!Number.isSafeInteger(row.revision)||row.revision<1||
  !Number.isFinite(now)||!row.conditions||typeof row.conditions!=='object'||
  Array.isArray(row.conditions))return unknown();
 const entries=Object.entries(row.conditions);
 if(entries.length>8||entries.some(([code,status])=>!CODES.has(code)||!STATUSES.has(status)))
  return unknown();
 const active=entries.filter(([,status])=>status!=='not_reported');
 if(active.length){
  const restrictions=active.map(([code])=>code).sort();
  const reviewNotes=['Restricciones autodeclaradas: comprobar preparación, trazas y rótulos antes de sugerir alimentos.'];
  if(active.some(([,status])=>status==='suspected'))
   reviewNotes.push('Hay condiciones declaradas como sospechadas: requieren revisión individual.');
  if(restrictions.some(code=>!['celiac','lactose_intolerance'].includes(code)))
   reviewNotes.push('Alguna condición no tiene sustitución automática verificada: revisar individualmente.');
  return {verified:true,restrictionStatus:'declared',restrictions,reviewNotes};
 }
 // An empty object or not_reported means UNKNOWN. Only a distinct current
 // owner-confirmed declaration at this exact revision may mean "none".
 const none=row.restriction_declaration;
 const ok=entries.length===0&&none?.kind==='none_declared'&&none.version===1&&
  none.declared_by===studentId&&none.source_revision===row.revision&&
  typeof none.confirmed_at==='string'&&Number.isFinite(Date.parse(none.confirmed_at))&&
  Date.parse(none.confirmed_at)<=now;
 return ok?{verified:true,restrictionStatus:'none_declared',restrictions:[],reviewNotes:[]}:unknown();
}
export function reviewCoachGuideFoodChange(food,profile={}){
 const signal=guideFoodSignal(food,profile);
 return {needsReview:signal.status!=='possible',status:signal.status,reason:signal.reason,
  message:(signal.status==='avoid'?'Este alimento no coincide con el perfil. ':'No se verificó la compatibilidad de este alimento. ')+signal.reason+'. ¿Continuar bajo revisión expresa del coach?'};
}
