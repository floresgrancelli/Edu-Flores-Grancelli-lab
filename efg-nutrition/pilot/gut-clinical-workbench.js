// CLIN-GUT-01: Lactose intolerance and SIBO nutrition coach DRAFT, OFF.
// Scientific review: NIDDK lactose intolerance; AGA SIBO and Monash low FODMAP.
// No diagnoses, no automatic diets, no medical guarantees, no server writes.
// Clinical data require a distinct server-owned RLS table + explicit consent
// before this draft can become an active Coach intake or food compatibility UI.
import {assessDietarySignal} from './dietary-traffic-light.js';
export const GUT_CLINICAL_INTAKE_ENABLED=false;
export const GUT_CONDITIONS=Object.freeze([
 Object.freeze({id:'lactose_intolerance',label:'Intolerancia a la lactosa',
   note:'La tolerancia depende de cada persona; no equivale a alergia a la proteína de la leche.'}),
 Object.freeze({id:'sibo',label:'SIBO · sobrecrecimiento bacteriano del intestino delgado',
   note:'No presupone que una dieta baja en FODMAP cure el sobrecrecimiento.'})
]);
export const GUT_DIAGNOSTIC_STATUS=Object.freeze([
 Object.freeze({id:'not_reported',label:'Prefiero no informarlo'}),
 Object.freeze({id:'suspected',label:'Lo sospecho / estoy en estudio'}),
 Object.freeze({id:'confirmed',label:'Diagnóstico confirmado por un profesional'})
]);
export const SIBO_FODMAP_PHASES=Object.freeze([
 Object.freeze({id:'none',label:'Sin fase restrictiva indicada'}),
 Object.freeze({id:'short_trial',label:'Prueba breve baja en FODMAP, supervisada'}),
 Object.freeze({id:'reintroduction',label:'Reintroducción dirigida'}),
 Object.freeze({id:'personalized',label:'Alimentación individualizada según tolerancia'})
]);
export const GUT_RESEARCH=Object.freeze({
 lactose_intolerance:Object.freeze([
  'https://www.niddk.nih.gov/health-information/digestive-diseases/lactose-intolerance/eating-diet-nutrition',
  'https://www.niddk.nih.gov/health-information/digestive-diseases/lactose-intolerance/treatment'
 ]),
 sibo:Object.freeze([
  'https://patient.gastro.org/small-intestinal-bacterial-overgrowth-sibo-managing-with-diet/',
  'https://monashfodmap.com/ibs-central/diets/'
 ])
});
const allowed=new Set(GUT_CONDITIONS.map(c=>c.id));
const diagnostic=new Set(GUT_DIAGNOSTIC_STATUS.map(c=>c.id));
const phases=new Set(SIBO_FODMAP_PHASES.map(c=>c.id));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const meal=(slot,protein,carbohydrates,notes='')=>Object.freeze({
 slot,protein,carbohydrates,notes
});
const guides=Object.freeze({
 lactose_intolerance:Object.freeze({
  title:'Guía base adaptable · control de lactosa',
  evidenceType:'symptom_management',
  nutrients:['Calcio','Vitamina D','Proteína y energía suficientes para los objetivos del coach'],
  notes:[
   'No es necesario eliminar automáticamente todos los lácteos. Ajustar la cantidad según tolerancia y antecedentes.',
   'Considerar leche deslactosada y otros productos cuya etiqueta se haya verificado; la ausencia de lactosa NO descarta alergia a la proteína de leche.',
   'Yogur y quesos madurados pueden tolerarse según porción; revisar la composición real del producto.',
   'Verificar ingredientes de preparados, barras y proteína whey. Consultar al profesional si considera lactasa.'
  ],
  meals:[
   meal('desayuno','Huevos o proteína aprobada','Tostada o avena según preferencias','Leche deslactosada solo si la etiqueta y tolerancia fueron revisadas'),
   meal('media_mañana','Yogur sin lactosa verificado o alternativa aprobada','Fruta elegida según tolerancia'),
   meal('almuerzo','Pollo, pescado o alternativa vegetal adecuada','Arroz, papa u otro cereal','Verduras y aceite de oliva según plan'),
   meal('media_tarde','Opción proteica individualizada','Fruta o cereal según guía del coach','Revisar lactosa oculta en batidos y barras'),
   meal('cena','Carne magra, pescado, huevo o alternativa adecuada','Papa o arroz','Acompañar con vegetales; ajustar por objetivos y preferencias')
  ]
 }),
 sibo:Object.freeze({
  title:'Guía base digestiva · individualizable por profesional',
  evidenceType:'symptom_management_only',
  nutrients:['Suficiencia energética','Proteína','Fibra y micronutrientes según tolerancia'],
  notes:[
   'La alimentación NO cura SIBO. Una dieta baja en FODMAP puede aliviar síntomas, con evidencia obtenida principalmente en síndrome de intestino irritable.',
   'No activar una fase restrictiva solo por sospecha. Si el profesional la indica, debe ser temporal y seguida de reintroducción e individualización.',
   'Las cantidades, los ingredientes preparados y la tolerancia personal importan: ningún alimento es verde por nombre genérico.',
   'No imponer ausencia de gluten o lácteos por SIBO sin indicación independiente. Revisar pérdida de peso, deficiencias y riesgos de restricción.'
  ],
  meals:[
   meal('desayuno','Huevos o proteína elegida','Avena/arroz de porción evaluada','Fruta o bebida verificada según tolerancia'),
   meal('media_mañana','Opción proteica individualizada','Fruta en porción verificada'),
   meal('almuerzo','Pescado, pollo, tofu firme u otra proteína adecuada','Arroz o papa en cantidad individualizada','Verdura seleccionada y preparación simple; no asumir compatibilidad de salsas'),
   meal('media_tarde','Opción elegida con el profesional','Cereal o fruta de porción verificada'),
   meal('cena','Carne magra, pescado, huevo o alternativa','Arroz, papa u otro acompañamiento revisado','Reevaluar síntomas y tolerancias')
  ]
 })
});
export function parseGutClinicalDraft(values={}){
 if(!values||typeof values!=='object'||Array.isArray(values))throw Error('Ficha digestiva inválida.');
 const raw=values.conditions??[];
 if(!Array.isArray(raw)||raw.length>GUT_CONDITIONS.length||new Set(raw).size!==raw.length||
    !raw.every(x=>allowed.has(x)))throw Error('Condiciones digestivas no reconocidas.');
 const statuses=values.statuses??{};
 if(!statuses||typeof statuses!=='object'||Array.isArray(statuses)||
    Object.keys(statuses).some(x=>!allowed.has(x)))throw Error('Estado diagnóstico inválido.');
 for(const key of Object.keys(statuses)){
  if(!raw.includes(key)||!diagnostic.has(statuses[key]))throw Error('Estado diagnóstico no coherente con la condición.');
 }
 const status={};
 for(const id of raw)status[id]=statuses[id]??'not_reported';
 const phase=values.siboPhase??'none';
 if(!phases.has(phase)||(!raw.includes('sibo')&&phase!=='none'))throw Error('Fase SIBO inválida.');
 const consent=values.explicitHealthDataConsent===true;
 return Object.freeze({conditions:Object.freeze([...raw]),statuses:Object.freeze(status),
  siboPhase:phase,explicitHealthDataConsent:consent,
  canPersist:false,requiresSecureClinicalEndpoint:raw.length>0,
  needsIndividualReview:raw.length>0});
}
export function renderGutClinicalDraft(draft={}, {backendApproved=false}={}){
 const selected=parseGutClinicalDraft(draft);
 // Never allow an interactive health data collection with an unapproved backend.
 // The options stay visible for design review, but cannot be submitted to the
 // general intake endpoint which forbids health_flags.
 const disabled=backendApproved===true&&GUT_CLINICAL_INTAKE_ENABLED===true?'':' disabled';
 return '<fieldset class="efg-gut-intake" aria-describedby="efgGutSafetyNote"><legend>Condiciones digestivas y restricciones alimentarias</legend>'+
 GUT_CONDITIONS.map(c=>'<label class="efg-gut-choice"><input type="checkbox" name="gutClinicalCondition" value="'+c.id+'"'+
  (selected.conditions.includes(c.id)?' checked':'')+disabled+'><span><strong>'+esc(c.label)+'</strong><small>'+esc(c.note)+'</small></span></label>').join('')+
 '<p id="efgGutSafetyNote" class="pilot-hint" role="note">Próxima función en revisión. Aún no ingreses diagnósticos: falta autorización separada para datos de salud, almacenamiento protegido y revisión profesional. Estas opciones no se guardan.</p>'+
 '<p class="pilot-hint">Cuando se habilite se consultará si el diagnóstico fue confirmado o está en estudio. SIBO no activará por sí solo una dieta restrictiva.</p></fieldset>';
}
export function buildGutGuideForCoach({condition,diagnosticStatus='not_reported',
 siboPhase='none',coachReviewed=false,restrictions=[],reviewedRows=[],asOf=new Date(),
 foodId=null}={}){
 if(!allowed.has(condition)||!diagnostic.has(diagnosticStatus)||!phases.has(siboPhase)||
   !Array.isArray(restrictions)||!Array.isArray(reviewedRows))
  throw Error('Guía digestiva inválida.');
 if(condition==='lactose_intolerance'&&siboPhase!=='none')
  throw Error('La fase baja en FODMAP no corresponde a intolerancia a lactosa.');
 const requiresConfirmation=condition==='sibo'&&diagnosticStatus!=='confirmed';
 const requiresSupervision=condition==='sibo'&&siboPhase!=='none'&&coachReviewed!==true;
 const guide=guides[condition];
 // This is a COACH preview and not an automatically publishable/approved diet.
 let signal=null;
 if(typeof foodId==='string'&&foodId){
  signal=assessDietarySignal({foodId,restrictions:[...new Set([...restrictions,condition])],
   reviewedRows,asOf});
 }
 return Object.freeze({
  condition,diagnosticStatus,siboPhase,approvedForStudent:false,
  state:requiresConfirmation?'needs_diagnostic_review':
    requiresSupervision?'needs_professional_review':'coach_draft_only',
  ...guide,
  sources:GUT_RESEARCH[condition],
  meals:guide.meals,
  reviewChecklist:Object.freeze([
   'Confirmar diagnóstico y síntomas con el profesional tratante.',
   'Revisar alergias, celiaquía, medicamentos, riesgos nutricionales y preferencias.',
   'Ajustar porciones y metas energéticas/macros de cada alumno.',
   'Verificar marca, ingredientes y cantidad de cada alimento antes de asignar verde.',
   ...(condition==='sibo'?
    ['Si se indicó fase baja en FODMAP, documentar el seguimiento y una estrategia de reintroducción.']:[])
  ]),
  foodSignal:signal,
  message:condition==='sibo'
   ?'Guía digestiva orientativa. Baja en FODMAP NO equivale a tratamiento comprobado de SIBO.'
   :'Guía orientativa de tolerancia a la lactosa. No se equipara con alergia láctea.'
 });
}
