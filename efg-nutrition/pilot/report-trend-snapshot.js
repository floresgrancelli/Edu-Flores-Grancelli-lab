// Compact historical goals for vector PDF graphs. The persisted days already hold
// values, missing dates and closed/partial state; never duplicate or backfill them.
export const REPORT_TREND_KEYS=Object.freeze(['k','p','c','f']);
const fields=['kcal','protein_g','carb_g','fat_g'];
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const numeric=value=>{if(value===null||value===undefined||typeof value==='boolean'||typeof value==='string'&&!value.trim())return null;const n=Number(value);return Number.isFinite(n)&&n>0&&n<=999999?n:null;};
// Resolve once for every section of a NEW snapshot. Conflicts are tombstones,
// not removal: an older target must not silently fill an unknown revision.
export function normalizeReportTrendGoals(history){
 if(!Array.isArray(history))throw Error('Historial de metas no válido.');
 const dates=[...new Set(history.filter(g=>validDate(g?.start_on)).map(g=>g.start_on))].sort();
 return dates.map(start_on=>{
  const candidates=history.filter(g=>g.start_on===start_on),stamps=candidates.map(g=>Date.parse(g.approved_at));
  let selected=candidates;
  if(stamps.every(Number.isFinite)){const latest=Math.max(...stamps);selected=candidates.filter((g,i)=>stamps[i]===latest);}
  const row={start_on,approved_at:stamps.every(Number.isFinite)?new Date(Math.max(...stamps)).toISOString():null};
  for(const field of [...fields,'fiber_g']){const values=selected.map(g=>numeric(g[field]));row[field]=values.every(v=>v===values[0])?values[0]:null;}
  return row;
 });
}
function goalAt(history,day){
 const active=history.filter(g=>validDate(g?.start_on)&&g.start_on<=day).sort((a,b)=>b.start_on.localeCompare(a.start_on))[0];
 return fields.map(field=>numeric(active?.[field]));
}
export function withReportTrendGoals(model,history){
 if(!model||!Array.isArray(model.days)||!model.days.length)throw Error('No hay fechas para preparar los gráficos.');
 // null means this session did not verify the complete historical goal window.
 if(history===null||history===undefined)return {...model,trendGoals:{v:1,from:model.from,to:model.to,rows:null}};
 if(!Array.isArray(history))throw Error('Historial de metas no válido.');
 const normalized=normalizeReportTrendGoals(history);
 const rows=[];let previous=null;
 model.days.forEach((day,i)=>{const values=goalAt(normalized,day.date),key=JSON.stringify(values);if(key!==previous){rows.push([i,...values]);previous=key;}});
 return {...model,trendGoals:{v:1,from:model.from,to:model.to,rows}};
}
export function reportTrendGoals(model){
 const ext=model?.trendGoals;
 if(ext===undefined)return {available:false,reason:'Este informe no conserva metas históricas. Se muestran solo los registros.',days:model.days.map(()=>[null,null,null,null])};
 if(!ext||Object.keys(ext).sort().join(',')!=='from,rows,to,v'||ext.v!==1||ext.from!==model.from||ext.to!==model.to||!Object.hasOwn(ext,'rows'))throw Error('Las metas guardadas para el gráfico no coinciden con el informe.');
 if(ext.rows===null)return {available:false,reason:'No se verificó el historial completo de metas al generar este informe. Se muestran solo los registros.',days:model.days.map(()=>[null,null,null,null])};
 if(!Array.isArray(ext.rows)||!ext.rows.length||ext.rows.length>model.days.length)throw Error('Las metas guardadas para el gráfico no son válidas.');
 let last=-1,previous=null;
 for(const row of ext.rows){
  if(!Array.isArray(row)||row.length!==5||!Number.isInteger(row[0])||row[0]<=last||row[0]>=model.days.length||last===-1&&row[0]!==0||row.slice(1).some(x=>x!==null&&(typeof x!=='number'||!Number.isFinite(x)||x<=0||x>999999)))throw Error('La secuencia de metas del gráfico no es válida.');
  const key=JSON.stringify(row.slice(1));if(key===previous)throw Error('La secuencia de metas del gráfico está duplicada.');
  last=row[0];previous=key;
 }
 const days=[];let cursor=0;
 for(let i=0;i<model.days.length;i++){while(cursor+1<ext.rows.length&&ext.rows[cursor+1][0]<=i)cursor++;days.push(ext.rows[cursor].slice(1));}
 return {available:true,reason:'Metas vigentes según el historial capturado al generar el informe. Sin línea donde no hay una meta verificable.',days};
}
