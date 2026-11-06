// Read-only, scoped history for report graphs. Unlike the latest-20 detail cache,
// this captures every baseline tie and every change in the selected window.
export async function loadReportTrendGoals(sb,studentId,from,to,assertCurrent=()=>{}){
 const read=async query=>{assertCurrent();try{return await query;}finally{assertCurrent();}};
 const fields='id,start_on,approved_at,kcal,protein_g,carb_g,fat_g,fiber_g';
 const first=await read(sb.from('efg_goals').select(fields).eq('student_id',studentId).lte('start_on',from).order('start_on',{ascending:false}).order('approved_at',{ascending:false}).limit(1));
 if(first.error)throw first.error;
 const rows=[];
 async function pages(query){
  for(let offset=0;offset<10000;offset+=100){
   const result=await read(query().order('start_on').order('approved_at',{ascending:false}).order('id').range(offset,offset+99));
   if(result.error)throw result.error;
   rows.push(...(result.data||[]));
   if((result.data||[]).length<100)return;
  }
  throw Error('El historial de objetivos requiere revisión antes de generar los gráficos.');
 }
 const baseline=first.data?.[0]?.start_on;
 if(baseline)await pages(()=>sb.from('efg_goals').select(fields).eq('student_id',studentId).eq('start_on',baseline));
 await pages(()=>sb.from('efg_goals').select(fields).eq('student_id',studentId).gt('start_on',from).lte('start_on',to));
 return rows;
}
