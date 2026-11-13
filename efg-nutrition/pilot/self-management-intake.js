// Reuses the current owner's saved intake. Never infers clinical clearance.
const GENERAL = ['objective','age_years','height_cm','weight_kg','activity_level',
  'dietary_pattern','eating_window','preferred_foods','disliked_foods','meal_routine','notes'];
const SELF = [...GENERAL,'sex_for_equation','disliked_food_ids','processingConsent',
  'pregnantOrBreastfeeding','clinicalCareRequired','eatingDisorderHistory',
  'restrictionDeclaration','health_flags'];
const REQUIRED = ['objective','age_years','height_cm','weight_kg','activity_level',
  'sex_for_equation','dietary_pattern','eating_window','processingConsent',
  'pregnantOrBreastfeeding','clinicalCareRequired','eatingDisorderHistory',
  'restrictionDeclaration','health_flags','disliked_food_ids'];
const numeric=new Set(['age_years','height_cm','weight_kg']);
const present=value=>value!==null&&value!==undefined&&value!=='';
function owner(row,userId,key){
  if(row&&row[key]!==userId)throw Error('La ficha no corresponde a tu cuenta.');
}
export function reuseOwnSelfIntake({userId,saved=null,general=null}={}){
  if(typeof userId!=='string'||!userId)throw Error('Falta una identidad verificada.');
  owner(saved,userId,'user_id');owner(general,userId,'student_id');
  const fields={},sources={};
  for(const key of GENERAL)if(present(general?.[key])){
    fields[key]=structuredClone(general[key]);sources[key]='general_intake';
  }
  for(const key of SELF)if(saved?.data&&Object.hasOwn(saved.data,key)){
    // An explicit empty/null answer in the newer private form must not resurrect
    // an old value from a general Coach intake.
    fields[key]=structuredClone(saved.data[key]);sources[key]='self_intake';
  }
  for(const key of numeric)if(present(fields[key])){
    const value=fields[key];
    if(typeof value!=='number'&&!(typeof value==='string'&&/^\d+(?:\.\d+)?$/.test(value)))
      throw Error('Dato numérico guardado inválido: '+key);
    const n=Number(value);if(!Number.isFinite(n))throw Error('Dato numérico guardado inválido.');
    fields[key]=n;
  }
  // Do not parse arbitrary text as health status, sex, preferences or food IDs.
  // Keep unmatched free text visible to the user instead of claiming it was applied.
  const unresolvedPreferenceText = ['preferred_foods','disliked_foods'].filter(k=>present(fields[k]));
  const missing=REQUIRED.filter(key=>!present(fields[key]));
  if(saved?.data?.processingConsent!==true&&!missing.includes('processingConsent'))missing.push('processingConsent');
  return {fields,sources,missing,unresolvedPreferenceText,
    intakeRevision:saved?.revision??0,generalRevision:general?.revision??null};
}

// Auth adapter must use getUser/server verification, never trust a user ID
// supplied in a URL/body. transport only calls the owner's authenticated endpoint.
export function createOwnSelfIntakeClient({verifyIdentity,transport}={}){
  if(typeof verifyIdentity!=='function'||typeof transport!=='function')throw Error('Falta conectar la cuenta privada.');
  let epoch=0;
  return {
    invalidate(){epoch++;},
    async load(){
      const ticket=++epoch,identity=await verifyIdentity();
      if(!identity?.id)throw Error('Ingresá a tu cuenta.');
      const context=await transport({action:'context'});
      const current=await verifyIdentity();
      if(ticket!==epoch||current?.id!==identity.id)throw Error('Cambió la sesión durante la lectura de la ficha.');
      if(context?.userId!==identity.id)throw Error('La respuesta no corresponde a tu cuenta.');
      return reuseOwnSelfIntake({userId:identity.id,saved:context.intake,general:context.generalIntake});
    },
    async save({fields,expectedRevision,requestId}){
      const ticket=++epoch,identity=await verifyIdentity();
      if(!identity?.id||!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw Error('Sesión o revisión inválida.');
      if(!fields||Object.keys(fields).some(key=>!SELF.includes(key)))throw Error('La ficha contiene campos no permitidos.');
      const response=await transport({action:'save_intake',fields:structuredClone(fields),expectedRevision,requestId});
      const current=await verifyIdentity();
      if(ticket!==epoch||current?.id!==identity.id)throw Error('Cambió la sesión durante el guardado.');
      if(response?.userId!==identity.id||response.requestId!==requestId||response.persisted!==true||
        response.intake?.user_id!==identity.id||response.intake?.revision!==expectedRevision+1)
        throw Error('No se pudo confirmar la ficha guardada.');
      return response.intake;
    },
  };
}
