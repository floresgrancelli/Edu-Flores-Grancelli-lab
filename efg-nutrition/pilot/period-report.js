// Independent date-range report. No persistence or automatic sending.
const keys=['k','p','c','f','fi'];
const valid=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export function validateReportPeriod(from,to,today){
 if(!valid(from)||!valid(to)||!valid(today)||from>to||to>today)throw Error('Elegí fechas válidas, ordenadas y no futuras.');
 const days=Math.round((Date.parse(to)-Date.parse(from))/86400000)+1;
 if(days>90)throw Error('Elegí un período de hasta 90 días.');
 return days;
}
export function buildPeriodReport({from,to,today,logs,studentName,totalOf}){
 const days=validateReportPeriod(from,to,today),seen=new Set(),recorded=[];
 for(const log of logs||[]){
  if(!valid(log?.log_day)||log.log_day<from||log.log_day>to)continue;
  if(seen.has(log.log_day))throw Error('Hay registros duplicados en el período. Revisalos antes de generar el informe.');
  seen.add(log.log_day);
  const consumed=Object.entries(log.meals||{}).flatMap(([slot,items])=>log.skipped?.[slot]?[]:Array.isArray(items)?items:[]).concat(log.sports||[]);
  if(!consumed.length)continue;
  const total=totalOf(log);
  const values=Object.fromEntries(keys.map(key=>[key,consumed.every(i=>i[key]!==null&&i[key]!==undefined&&Number.isFinite(Number(i[key])))&&Number.isFinite(total[key])?total[key]:null]));
  recorded.push({date:log.log_day,...values});
 }
 const averages=Object.fromEntries(keys.map(key=>{const rows=recorded.filter(r=>r[key]!==null);return [key,{value:rows.length?rows.reduce((a,r)=>a+r[key],0)/rows.length:null,count:rows.length}];}));
 const fmt=n=>n===null?'sin dato':n.toLocaleString('es-AR',{maximumFractionDigits:1});
 const lines=['NUTRICIÓN CON-CIENCIA | INFORME POR PERÍODO',String(studentName||'Alumno').slice(0,100),`Desde ${from} hasta ${to} · ${days} días (ambas fechas incluidas)`,`${recorded.length} días con registros · ${days-recorded.length} sin consumos registrados`,'PROMEDIOS EN DÍAS CON DATOS',...keys.map((k,i)=>`${['Energía','Proteínas','Hidratos','Grasas','Fibra'][i]}: ${fmt(averages[k].value)} ${k==='k'?'kcal':'g'} (${averages[k].count} días con dato)`),'CONCLUSIÓN PARA REVISAR',recorded.length?'El resumen describe lo registrado en el período. Revisar junto al alumno la regularidad y las comidas que puedan faltar.':'No hay consumos registrados en este período; no es posible evaluar su alimentación.',...(to===today?['El día de hoy sigue en curso y puede estar incompleto.']:[]),'Los días sin datos no cuentan como consumo cero. No se compara todo el período con la meta actual ni se generan diagnósticos.'];
 return {from,to,days,daysRecorded:recorded.length,averages,text:lines.join('\n')};
}
