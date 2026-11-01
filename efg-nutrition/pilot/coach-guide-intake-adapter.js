// Private, synthetic-only bridge. No network, persistence, diagnosis or publication.
import {adaptedScopeKey} from './coach-adapted-workspace.js';
import {parseGutClinicalDraft} from './gut-clinical-workbench.js';
import {proposeAdaptedGuide} from './adapted-guided-day.js';
const fail=(code,message)=>Object.assign(new Error(message),{code});
const revision=x=>Number.isSafeInteger(x)&&x>0;
const id=x=>typeof x==='string'&&x.trim().length>0;
function scopeToken(s){
 if(!adaptedScopeKey(s)||!id(s.sessionId)||!revision(s.sourceEpoch))return null;
 return JSON.stringify([adaptedScopeKey(s),s.sessionId,s.sourceEpoch]);
}
function row(envelope,scope,name){
 if(envelope?.status!=='available')throw fail(envelope?.status||'missing_or_denied','Falta acceso o información: '+name+'.');
 const b=envelope.binding,r=envelope.data;
 if(!b||b.userId!==scope.userId||b.sessionId!==scope.sessionId||b.studentId!==scope.studentId||
  b.organizationId!==scope.organizationId||b.sourceEpoch!==scope.sourceEpoch||
  !r||r.student_id!==scope.studentId||r.organization_id!==scope.organizationId||!revision(r.revision))
  throw fail('scope_mismatch','La información no corresponde al alumno, organización o sesión actuales.');
 return r;
}
export function prepareGuideIntake(bundle,scope){
 if(!scopeToken(scope))throw fail('no_permission','No hay permiso vigente para preparar el borrador.');
 if(bundle?.synthetic!==true)throw fail('real_adapter_pending','El adaptador real todavía no está habilitado.');
 const general=row(bundle.general,scope,'ficha general');
 // Never accept health fields in the general channel, even in a fixture.
 const generalKeys=new Set(['student_id','organization_id','revision','completed_version','shared_at','updated_at',
  'objective','age_years','height_cm','weight_kg','activity_level','dietary_pattern','eating_window',
  'preferred_foods','disliked_foods','meal_routine','notes']);
 if(Object.keys(general).some(k=>!generalKeys.has(k)))throw fail('general_channel','La declaración de salud necesita su canal separado.');
 if(!general.shared_at||!id(general.completed_version))throw fail('missing_or_denied','Ficha general no compartida o sin versión.');
 const health=row(bundle.health,scope,'declaración separada');
 if(health.revoked||health.shared_with_coach!==true||!id(health.document_id))
  throw fail('no_permission','La declaración no está compartida con el coach.');
 const declaration=parseGutClinicalDraft({conditions:Object.keys(health.conditions||{}),statuses:health.conditions,
  siboPhase:health.sibo_phase,explicitHealthDataConsent:true});
 if(!declaration.conditions.length)throw fail('unknown_declaration','La ficha no demuestra ausencia de restricciones.');
 if(declaration.conditions.some(c=>c!=='celiac')||declaration.statuses.celiac==='not_reported')
  throw fail('unsupported_declaration','Esta declaración requiere revisión individual; no hay regla adaptada implementada.');
 // A declared condition requests an exclusion; it never certifies any food.
 const restrictions=['gluten'];
 const goals=row(bundle.goals,scope,'metas calculadas');
 if(goals.confirmed_by!==scope.userId||goals.source_intake_revision!==general.revision)
  throw fail('goals_stale','El coach debe revisar metas de la ficha vigente.');
 const preferences=row(bundle.preferences,scope,'preferencias vinculadas');
 if(preferences.confirmed_by!==scope.userId||preferences.source_intake_revision!==general.revision||
  preferences.preferred_text!==(general.preferred_foods||'')||preferences.disliked_text!==(general.disliked_foods||''))
  throw fail('preferences_stale','Vinculá gustos y alimentos evitados con opciones del catálogo vigente.');
 const catalog=row(bundle.catalog,scope,'catálogo con procedencia');
 if(catalog.origin!=='synthetic_fixture'||!Array.isArray(catalog.foods)||!catalog.foods.length)
  throw fail('evidence_missing','Falta el adaptador de fuentes verificables.');
 if(preferences.catalog_revision!==catalog.revision)throw fail('preferences_stale','Cambió el catálogo: revisá las preferencias.');
 const ids=new Set(catalog.foods.map(f=>f.id));
 for(const list of [preferences.preferred_ids,preferences.disliked_ids])
  if(!Array.isArray(list)||new Set(list).size!==list.length||list.some(x=>!ids.has(x)))
   throw fail('preferences_unknown','Hay preferencias sin alimento identificado.');
 if(preferences.preferred_ids.some(x=>preferences.disliked_ids.includes(x)))
  throw fail('preferences_conflict','Un alimento figura a la vez como preferido y evitado.');
 if(!['omnivore','keto'].includes(general.dietary_pattern))throw fail('unsupported_pattern','Patrón aún no soportado.');
 const pattern=goals.pattern;
 if(pattern?.kind!==(general.dietary_pattern==='keto'?'keto':'general'))
  throw fail('pattern_conflict','El patrón y las metas requieren revisión del coach.');
 if(!Number.isFinite(bundle.now))throw fail('unknown_clock','Falta fecha de evaluación.');
 const input={synthetic:true,catalog:structuredClone(catalog.foods),template:structuredClone(catalog.template),
  goal:structuredClone(goals.goal),preferredIds:[...preferences.preferred_ids],
  context:{now:bundle.now,restrictions,dislikedIds:[...preferences.disliked_ids],pattern:structuredClone(pattern)},
  provenance:{generalRevision:general.revision,healthRevision:health.revision,goalRevision:goals.revision,
   catalogRevision:catalog.revision,preferenceRevision:preferences.revision,declared:true,
   foodEvidence:'synthetic_only',planApproval:'not_approved',publishable:false}};
 const proposal=proposeAdaptedGuide(input);
 if(!proposal.ok)throw fail(proposal.code,proposal.message);
 return input;
}
// readBundle must re-read each separately authorized channel; null is missing OR denied.
// Production subscription, server-bound revisions and source evidence are still required.
export function createGuideIntakeSource({readScope,readBundle}={}){
 let generation=0,accepted=null;const listeners=new Set();
 const invalidate=()=>{generation++;accepted=null;for(const listener of listeners)listener();};
 return {
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  invalidate,
  assertCurrent(){if(!accepted||accepted!==scopeToken(readScope())){invalidate();throw fail('stale','Cambió la ficha o el permiso. Volvé a abrir el borrador.');}},
  async load(){
   generation++;accepted=null;const ticket=generation,scope=structuredClone(readScope()),token=scopeToken(scope);
   if(!token)throw fail('no_permission','No hay permiso vigente.');
   let bundle;
   try{bundle=await readBundle(scope);}catch{throw fail('unavailable','No se pudo leer la ficha autorizada.');}
   if(ticket!==generation||token!==scopeToken(readScope()))throw fail('stale','Cambió el alumno, la ficha o el permiso durante la lectura.');
   const input=prepareGuideIntake(bundle,scope);accepted=token;return input;
  }
 };
}
