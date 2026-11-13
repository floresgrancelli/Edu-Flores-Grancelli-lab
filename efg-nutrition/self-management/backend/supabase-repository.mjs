// Server-only adapter. Inject a private service client; never ship its key.
const uuid=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
function owner(id){if(!uuid(id))fail('invalid_identity','Identidad inválida.');}
function result(response){
 if(response?.error)fail(response.error.code==='PT409'?'conflict':'unavailable',
  response.error.code==='PT409'?'La ficha cambió en otro dispositivo. Volvé a cargarla.':'No pudimos verificar los datos de autogestión.');
 return response?.data;
}
export function createSelfManagementRepository(client){
 if(typeof client?.from!=='function'||typeof client?.rpc!=='function')fail('backend_pending','Falta el servidor de autogestión.');
 const repository={
  async readAccount(userId){
   owner(userId);
   const profile=result(await client.from('efg_profiles').select('user_id,role,active').eq('user_id',userId).maybeSingle());
   if(profile&&(profile.user_id!==userId||!['coach','admin'].includes(profile.role)||!profile.active))fail('mode_mismatch','Tu cuenta conserva el circuito con coach o está inactiva.');
   const account=result(await client.from('ncc_self_accounts').select('user_id,mode,active,legal_version').eq('user_id',userId).maybeSingle());
   if(account&&account.user_id!==userId)fail('ownership','La cuenta no corresponde a tu sesión.');
   return account?{...account,coach_id:account.mode==='coach_linked'?'linked':null}:null;
  },
  async register(userId,verifiedLegalVersion){
   owner(userId);result(await client.rpc('ncc_self_register',{p_user:userId,p_legal_version:verifiedLegalVersion}));
   return repository.readAccount(userId);
  },
  async readIntake(userId){
   owner(userId);
   const row=result(await client.from('ncc_self_intakes').select('user_id,revision,data')
    .eq('user_id',userId).order('revision',{ascending:false}).limit(1).maybeSingle());
   if(row&&row.user_id!==userId)fail('ownership','La ficha no corresponde a tu sesión.');
   return row||null;
  },
  async readGeneralIntake(userId){
   owner(userId);
   const row=result(await client.from('efg_coach_relaunch_intakes')
    .select('student_id,revision,objective,age_years,height_cm,weight_kg,activity_level,dietary_pattern,eating_window,preferred_foods,disliked_foods,meal_routine,notes')
    .eq('student_id',userId).order('updated_at',{ascending:false}).limit(1).maybeSingle());
   if(row&&row.student_id!==userId)fail('ownership','La ficha previa no corresponde a tu sesión.');
   return row||null;
  },
  async saveIntake({userId,requestId,expectedRevision,fields}){
   owner(userId);
   const revision=result(await client.rpc('ncc_self_save_intake',{p_user:userId,p_request_id:requestId,
    p_expected_revision:expectedRevision,p_data:fields}));
   if(revision!==expectedRevision+1)fail('not_saved','No se confirmó la revisión de ficha.');
   const intake=await repository.readIntake(userId);
   if(intake?.revision!==revision)fail('conflict','La ficha cambió mientras se guardaba.');
   return {userId,requestId,persisted:true,intake};
  },
  async saveAtomic({userId,requestId,expectedIntakeRevision,expectedMode,result:plan}){
   owner(userId);if(expectedMode!=='independent')fail('mode_mismatch','Modo incorrecto.');
   const revision=result(await client.rpc('ncc_self_commit_plan',{p_user:userId,p_request_id:requestId,
    p_intake_revision:expectedIntakeRevision,p_result:plan}));
   if(!Number.isSafeInteger(revision)||revision<1)fail('not_saved','No se confirmó el guardado del plan.');
   return {userId,requestId,persisted:true,revision};
  },
  async readSaved(userId,requestId){
   owner(userId);
   const row=result(await client.from('ncc_self_results').select('user_id,request_id,revision,intake_revision,result')
    .eq('user_id',userId).eq('request_id',requestId).maybeSingle());
   if(row&&(row.user_id!==userId||row.request_id!==requestId))fail('ownership','El plan no corresponde a tu sesión.');
   return row?{userId:row.user_id,requestId:row.request_id,intakeRevision:row.intake_revision,
    revision:row.revision,result:row.result}:null;
  },
 };
 return repository;
}
