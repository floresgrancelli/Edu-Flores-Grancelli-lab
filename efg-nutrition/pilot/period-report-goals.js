// Read the baseline plus every change in the requested window. Never use the
// detail panel's latest-20 cache for historical report comparisons.
export async function loadPeriodReportGoals(sb,studentId,from,to){
 const fields='id,start_on,approved_at,kcal,protein_g,carb_g,fat_g,fiber_g';
 const baseline=await sb.from('efg_goals').select(fields).eq('student_id',studentId).lte('start_on',from).order('start_on',{ascending:false}).order('approved_at',{ascending:false}).limit(1);
 if(baseline.error)throw baseline.error;
 const rows=[...(baseline.data||[])];
 for(let offset=0;offset<10000;offset+=100){
  const result=await sb.from('efg_goals').select(fields).eq('student_id',studentId).gt('start_on',from).lte('start_on',to).order('start_on').order('approved_at').order('id').range(offset,offset+99);
  if(result.error)throw result.error;
  rows.push(...(result.data||[]));
  if((result.data||[]).length<100)return rows;
 }
 throw Error('El historial de objetivos requiere revisión antes de generar el informe.');
}
