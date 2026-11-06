import {periodReportAsStoredText,parseLuxuryPeriodReport} from './period-luxury-report.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
// Only explicit server rejection of INSERT proves this request did not write.
// Transport failures, unknown codes and every readback failure remain uncertain.
const rejectedInsertCodes=new Set(['42501','23502','23503','23514','22001','22P02','42P01','42703','PGRST204','PGRST205']);
function insertFailure(error){
 if(!rejectedInsertCodes.has(error?.code))return error;
 return Object.assign(new Error(error.message||'El servidor rechazó el informe.'),{code:error.code,periodWriteOutcome:'rejected'});
}
// Database RLS decides access. The client retains a request ID across retries.
export function createPeriodReportHistory({sb,context}){
 let pending=false;
 // A later rejected INSERT cannot prove that an earlier attempt never committed.
 // Keep uncertainty attached to its request ID until exact readback succeeds.
 const uncertainRequests=new Set();
 const valid=()=>{const c=context();if(!c.userId||!c.studentId||!c.allowed)throw Error('Acceso al informe no autorizado.');return c;};
 const same=c=>{const n=context();return n.userId===c.userId&&n.studentId===c.studentId&&n.epoch===c.epoch&&n.allowed;};
 async function list(){const c=valid();const r=await sb.from('efg_period_reports').select('id,student_id,coach_id,period_from,period_to,report_text,created_at').eq('student_id',c.studentId).order('created_at',{ascending:false}).limit(100);if(r.error)throw r.error;if(!same(c))return null;return r.data||[];}
 async function publish({model,requestId,confirmed=false}){
  const c=valid();if(c.role!=='coach'||!confirmed||!requestId)throw Error('Revisá y confirmá el informe antes de compartir.');
  if(pending)throw Error('Ya hay un envío en curso.');
  const text=periodReportAsStoredText(model,model.conclusion,model.flexibleNote);
  if(!model.daysRecorded)throw Error('No hay registros para publicar.');
  pending=true;
  try{
   const row={id:requestId,student_id:c.studentId,coach_id:c.userId,period_from:model.from,period_to:model.to,report_text:text};
   const r=await sb.from('efg_period_reports').insert(row);if(r.error&&r.error.code!=='23505')throw insertFailure(r.error);
   const read=await sb.from('efg_period_reports').select('*').eq('id',requestId).single();if(read.error)throw read.error;
   if(read.data?.student_id!==c.studentId||read.data?.coach_id!==c.userId||read.data?.report_text!==text||!parseLuxuryPeriodReport(read.data.report_text))throw Error('No se confirmó exactamente el informe revisado.');
   uncertainRequests.delete(requestId);
   return same(c)?read.data:null;
  }catch(error){
   if(error?.periodWriteOutcome==='rejected'&&!uncertainRequests.has(requestId))throw error;
   uncertainRequests.add(requestId);
   if(error?.periodWriteOutcome==='rejected')
    throw Object.assign(new Error(error.message),{code:error.code,periodWriteOutcome:'uncertain'});
   throw error;
  }finally{pending=false;}
 }
 return {list,publish};
}
