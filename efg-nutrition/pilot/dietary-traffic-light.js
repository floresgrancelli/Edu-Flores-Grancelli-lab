// EFG Nutrition Pro — dietary restriction presentation helper (PREVIEW ONLY).
// NO food safety claims are embedded in this module. Never treat client-side
// colours as medical authorization or as a replacement for server-side checks.
// Future backend must deliver server-verified, clinician-reviewed provenance.
const VERDICTS=new Set(["allowed","verify","avoid"]);
const HEX=/^[a-z0-9][a-z0-9_-]{1,99}$/i;
const safeCode=s=>typeof s==="string"&&HEX.test(s);
const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}T/.test(s)&&Number.isFinite(Date.parse(s));
export const DIETARY_COLORS=Object.freeze({
 neutral:"neutral",green:"green",yellow:"yellow",red:"red"
});
export const DIETARY_LABELS=Object.freeze({
 neutral:"Sin restricciones configuradas",
 green:"Compatible según la revisión disponible",
 yellow:"Verificar composición y restricciones",
 red:"Incompatible con una restricción declarada según revisión"
});
function validEvidence(record,foodId,restriction,at){
 return !!record&&record.food_id===foodId&&record.restriction===restriction&&
  VERDICTS.has(record.verdict)&&record.status==="reviewed"&&
  typeof record.reviewed_by==="string"&&record.reviewed_by.length>=3&&
  validDate(record.reviewed_at)&&Date.parse(record.reviewed_at)<=at&&
  validDate(record.expires_at)&&Date.parse(record.expires_at)>at&&
  typeof record.evidence_id==="string"&&record.evidence_id.length>=4&&
  typeof record.source_url==="string"&&/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(record.source_url);
}
/**
 * Return a conservative UI-only signal. Inputs must be from a trusted
 * server-owned reviewed evidence table, not editable client food metadata.
 * Unknown, stale, malformed or conflicting records NEVER produce green.
 * When no restriction is declared, return neutral: never colour foods by
 * calories, fat, carbohydrate amount or an aesthetic diet score.
 */
export function assessDietarySignal({foodId,restrictions=[],reviewedRows=[],asOf=new Date()}={}){
 if(!Array.isArray(restrictions)||!Array.isArray(reviewedRows)||!safeCode(foodId))
  throw new Error("No se pudo verificar la compatibilidad de este alimento.");
 const active=[...new Set(restrictions)];
 if(!active.every(safeCode))throw new Error("Restricciones no válidas.");
 if(!active.length)return {color:"neutral",label:DIETARY_LABELS.neutral,reasons:[],verified:false};
 const at=asOf instanceof Date?asOf.getTime():Date.parse(asOf);
 if(!Number.isFinite(at))throw new Error("Fecha de revisión inválida.");
 const reasons=[];let hasUnknown=false,hasAvoid=false;
 for(const restriction of active){
  const matches=reviewedRows.filter(x=>x?.food_id===foodId&&x?.restriction===restriction);
  const valid=matches.filter(x=>validEvidence(x,foodId,restriction,at));
  const verdicts=new Set(valid.map(x=>x.verdict));
  if(matches.length!==1||valid.length!==1||verdicts.size!==1){
   hasUnknown=true;reasons.push({restriction,reason:"missing_or_unverified_evidence"});
   continue;
  }
  const verdict=valid[0].verdict;
  if(verdict==="avoid")hasAvoid=true;
  if(verdict==="verify")hasUnknown=true;
  reasons.push({restriction,reason:verdict});
 }
 const color=hasAvoid?"red":hasUnknown?"yellow":"green";
 return {color,label:DIETARY_LABELS[color],reasons,verified:color==="green"||color==="red"};
}
