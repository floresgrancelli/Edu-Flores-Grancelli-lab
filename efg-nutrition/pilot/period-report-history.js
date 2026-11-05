import {periodReportAsStoredText,parseLuxuryPeriodReport} from './period-luxury-report.js?v=ncc-pilot-3a40474052be-catalog-android-r9';
// Database RLS decides access. The client retains a request ID across retries.
export function createPeriodReportHistory({sb,context}){
 let pending=false;
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
   const r=await sb.from('efg_period_reports').insert(row);if(r.error&&r.error.code!=='23505')throw r.error;
   const read=await sb.from('efg_period_reports').select('*').eq('id',requestId).single();if(read.error)throw read.error;
   if(read.data?.student_id!==c.studentId||read.data?.coach_id!==c.userId||read.data?.report_text!==text||!parseLuxuryPeriodReport(read.data.report_text))throw Error('No se confirmó exactamente el informe revisado.');
   return same(c)?read.data:null;
  }finally{pending=false;}
 }
 return {list,publish};
}
