// Reconcile uncertain weekly INSERTs against the existing UNIQUE(student_id, week_ending).
// RAM only; no UPDATE/UPSERT, no automatic second INSERT, no new database permissions.
const rejected=new Set(['42501','23502','23503','23514','22001','22P02','42P01','42703','PGRST204','PGRST205']);
export function createWeeklyReportDelivery({sb}){
 const attempts=new Map();let generation=0;
 const uncertain=error=>Object.assign(new Error('No se confirmó el envío. Conservamos el PDF revisado: reintentá la confirmación antes de editar o enviar otro. '+(error?.message||'')),{weeklyWriteOutcome:'uncertain'});
 async function readback(attempt){
  const row=attempt.record;
  const result=await sb.from('efg_weekly_reports').select('id,student_id,coach_id,week_ending,report_text,created_at').eq('student_id',row.student_id).eq('week_ending',row.week_ending).limit(2);
  if(result.error)throw result.error;
  const rows=result.data||[];if(!rows.length)return null;
  if(rows.length!==1||rows[0].coach_id!==row.coach_id||rows[0].report_text!==row.report_text)
   throw Object.assign(new Error('Ya existe un informe distinto para esta semana. No se reemplazó ni se volvió a compartir. Consultá el historial.'),{weeklyExistingRecord:rows.length===1?rows[0]:null,weeklyWriteOutcome:'conflict'});
  return rows[0];
 }
 async function send({key,record,isCurrent=()=>true}){
  const epoch=generation;
  const current=()=>{if(epoch!==generation||!isCurrent())throw Object.assign(new Error('El contexto del envío cambió. Volvé al alumno para confirmar el estado.'),{weeklyWriteOutcome:'stale'});};
  current();
  let attempt=attempts.get(key);
  if(attempt&&JSON.stringify(attempt.record)!==JSON.stringify(record))throw uncertain();
  if(attempt){
   try{const found=await readback(attempt);current();if(found){attempts.delete(key);return found;}}
   catch(error){if(['conflict','stale'].includes(error.weeklyWriteOutcome))throw error;current();throw uncertain(error);}
  }else{attempt={record:Object.freeze(JSON.parse(JSON.stringify(record))),uncertain:false};attempts.set(key,attempt);}
  let explicitRejection=false;
  try{
   current();
   const result=await sb.from('efg_weekly_reports').insert(attempt.record);
   current();
   if(result.error){explicitRejection=rejected.has(result.error.code);throw result.error;}
   attempts.delete(key);return attempt.record;
  }catch(error){
   if(error.weeklyWriteOutcome==='stale')throw error;
   if(explicitRejection&&!attempt.uncertain){attempts.delete(key);throw Object.assign(new Error(error.message||'El servidor rechazó el informe. Podés editarlo y volver a revisarlo.'),{weeklyWriteOutcome:'rejected'});}
   attempt.uncertain=true;
   try{const found=await readback(attempt);current();if(found){attempts.delete(key);return found;}}
   catch(readError){if(['conflict','stale'].includes(readError.weeklyWriteOutcome))throw readError;current();throw uncertain(readError);}
   throw uncertain(error);
  }
 }
 return {send,get:key=>attempts.get(key)||null,clear:()=>{generation++;attempts.clear();},forget:key=>attempts.delete(key)};
}
