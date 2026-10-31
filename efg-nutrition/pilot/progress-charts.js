// EFG Nutrition Premium 3.3 — visualization-only helpers. No network, no writes.
// Historical averages exclude days with no records; blank periods are not zero kcal.
const slots=[["desayuno","Desayuno","#5abda3"],["media_manana","Media mañana","#83a3e5"],["almuerzo","Almuerzo","#e8b66d"],["media_tarde","Media tarde","#b7a0e5"],["merienda","Merienda","#e99fa3"],["cena","Cena","#638e9b"]];
const nutrients=[["p","Proteínas","#37a984",4],["c","Hidratos","#748fe2",4],["f","Grasas","#e5a65d",9]];
const safe=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const n=(v,d=0)=>Number(v||0).toLocaleString("es-AR",{maximumFractionDigits:d});
const dateUTC=(s)=>new Date(s+"T12:00:00Z");
const plusDays=(s,delta)=>{const d=dateUTC(s);d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);};
const datesBack=(end,days)=>Array.from({length:days},(_,i)=>plusDays(end,i-days+1));
function itemSum(items){
 const result={k:0,p:0,c:0,f:0,fi:0};
 for(const x of Array.isArray(items)?items:[])for(const key of Object.keys(result))result[key]+=Number(x?.[key])||0;
 return result;
}
export function summarizeLog(log){
 const skipped=log?.skipped||{},meals=log?.meals||{};
 const slotTotals=slots.map(([id,label,color])=>{
  const items=skipped[id]?[]:meals[id]||[];
  const sum=itemSum(items);
  return {id,label,color,...sum,hasFood:items.length>0};
 });
 const sports=itemSum(log?.sports||[]);
 const totals={...sports};
 for(const meal of slotTotals)for(const key of ["k","p","c","f","fi"])totals[key]=(totals[key]||0)+meal[key];
 const hasData=slotTotals.some(m=>m.hasFood)||(log?.sports||[]).length>0;
 return {date:log?.log_day,totals,slotTotals,hasData};
}
function filterDays(logs,days,end){
 const start=plusDays(end,-days+1);
 const byDate=new Map();
 for(const log of logs||[])if(log?.log_day>=start&&log.log_day<=end)byDate.set(log.log_day,summarizeLog(log));
 return {start,days:datesBack(end,days),byDate};
}
const empty=(message)=>'<div class="efg-chart-empty">'+safe(message)+'</div>';
const title=(heading,subtitle)=>'<div class="efg-chart-heading"><h3>'+heading+'</h3><p>'+subtitle+'</p></div>';
function barChart(window){
 const groups=[],period=window.days.length===7?1:window.days.length===30?5:7;
 for(let i=0;i<window.days.length;i+=period){
  const dates=window.days.slice(i,i+period);
  const records=dates.map(d=>window.byDate.get(d)).filter(x=>x?.hasData);
  const averages=nutrients.map(([key,, ,factor])=>records.length?records.reduce((sum,r)=>sum+r.totals[key]*factor,0)/records.length:0);
  groups.push({label:dates[0].slice(8)+"/"+dates[0].slice(5,7),averages,count:records.length});
 }
 if(!groups.some(g=>g.count))return empty("Todavía no hay comidas registradas en este período.");
 const max=Math.max(1200,...groups.map(g=>g.averages.reduce((a,b)=>a+b,0)))*1.15;
 const W=700,H=248,left=45,right=12,top=18,bottom=47,plot=H-top-bottom;
 const barWidth=Math.min(48,(W-left-right)/groups.length*.59);
 const step=(W-left-right)/groups.length;
 const bars=groups.map((g,i)=>{
  const x=left+step*i+(step-barWidth)/2;
  let y=top+plot;
  const rects=g.averages.map((v,j)=>{const h=v/max*plot;y-=h;return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barWidth.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="2" fill="'+nutrients[j][2]+'"><title>'+safe(nutrients[j][1])+' · '+n(v)+' kcal promedio</title></rect>';}).join("");
  return rects+'<text x="'+(x+barWidth/2).toFixed(1)+'" y="'+(H-25)+'" text-anchor="middle" class="efg-chart-tick">'+g.label+'</text>'+(g.count?'<text x="'+(x+barWidth/2).toFixed(1)+'" y="'+Math.max(12,y-6).toFixed(1)+'" text-anchor="middle" class="efg-chart-tick">'+n(g.averages.reduce((a,b)=>a+b,0))+'</text>':'');
 }).join("");
 const grid=[0,.5,1].map(f=>'<line x1="'+left+'" x2="'+(W-right)+'" y1="'+(top+plot*(1-f))+'" y2="'+(top+plot*(1-f))+'" stroke="#e4eeeb" stroke-dasharray="3 5"/><text x="'+(left-6)+'" y="'+(top+plot*(1-f)+4)+'" text-anchor="end" class="efg-chart-tick">'+n(max*f)+'</text>').join("");
 return '<svg class="efg-chart-svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Energía media diaria registrada por período, desglosada por macronutriente">'+grid+bars+'</svg><div class="efg-chart-legend">'+nutrients.map((x,i)=>'<span><i style="background:'+x[2]+'"></i>'+x[1]+' (kcal)</span>').join("")+'</div><p class="efg-chart-footnote">Cada barra representa el promedio de los días con consumo del intervalo. No se asignan calorías a días sin registros. La energía de macros puede diferir de las kcal de etiquetas.</p>';
}
function goalBars(window,goalForDate){
 const last=[...window.days].reverse().map(d=>window.byDate.get(d)).find(x=>x?.hasData);
 if(!last)return empty("Todavía no hay consumos registrados para comparar.");
 const goal=goalForDate?.(last.date)||null;
 if(!goal)return empty("El coach todavía no estableció un objetivo nutricional para este período.");
 const targets=[["k","Energía","kcal",goal.kcal],["p","Proteínas","g",goal.protein_g],["c","Hidratos","g",goal.carb_g],["f","Grasas","g",goal.fat_g],["fi","Fibra","g",goal.fiber_g]];
 return '<p class="efg-chart-subdate">Último día registrado: '+last.date.split("-").reverse().join("/")+'</p><div class="efg-goal-bars">'+targets.map(([key,label,unit,target],i)=>{
  const actual=last.totals[key],pct=target>0?actual/target*100:0;
  const color=["#218b7b","#37a984","#748fe2","#e5a65d","#b7a0e5"][i];
  return '<div class="efg-goal-row"><div class="efg-goal-caption"><strong>'+label+'</strong><span>'+n(actual,1)+' / '+n(target,1)+' '+unit+' · '+(target>0?n(pct)+'%':'Sin meta')+'</span></div><div class="efg-goal-track"><span style="width:'+Math.min(100,Math.max(0,pct))+'%;background:'+color+'"></span></div></div>';
 }).join("")+'</div><p class="efg-chart-footnote">Los objetivos son referencias del coach, no límites máximos ni calificaciones.</p>';
}
function consistency(window){
 const total=window.days.length,week=7,groups=[];
 for(let i=0;i<total;i+=week){
  const slice=window.days.slice(i,i+week),registered=slice.filter(d=>window.byDate.get(d)?.hasData).length;
  groups.push({start:slice[0],registered,total:slice.length});
 }
 const recorded=window.days.filter(d=>window.byDate.get(d)?.hasData).length;
 const pct=recorded/total*100;
 const maxH=115;
 return '<div class="efg-consistency-head"><strong>'+n(pct)+'%</strong><span>'+recorded+' de '+total+' días con registros</span></div>'+
 '<div class="efg-consistency-columns" role="img" aria-label="Días con registros nutricionales por semana">'+groups.map((g,i)=>{
  const height=Math.max(2,g.registered/g.total*maxH);
  return '<div class="efg-consistency-week"><span class="efg-consistency-column"><i style="height:'+height+'px"></i></span><strong>'+g.registered+'/'+g.total+'</strong><small>'+(total===7?"Esta semana":"Sem "+(i+1))+'</small></div>';
 }).join("")+'</div><p class="efg-chart-footnote">Mide la constancia de registro, no la calidad de la alimentación. Los días sin registros no se consideran días de incumplimiento nutricional.</p>';
}
function mealDonut(window){
 const last=[...window.days].reverse().map(d=>window.byDate.get(d)).find(x=>x?.slotTotals.some(m=>m.hasFood));
 if(!last)return empty("Todavía no hay comidas registradas para mostrar su distribución.");
 const data=last.slotTotals.filter(x=>x.k>0);
 const total=data.reduce((a,x)=>a+x.k,0);
 if(!total)return empty("No hay calorías registradas en las comidas de este período.");
 let offset=0;
 const arcs=data.map(m=>{
  const part=m.k/total*100;
  const markup='<circle cx="90" cy="90" r="63" fill="none" stroke="'+m.color+'" stroke-width="23" stroke-dasharray="'+part.toFixed(4)+' '+(100-part).toFixed(4)+'" stroke-dashoffset="'+(-offset).toFixed(4)+'" pathLength="100" transform="rotate(-90 90 90)"><title>'+safe(m.label)+': '+n(m.k)+' kcal</title></circle>';
  offset+=part;return markup;
 }).join("");
 return '<div class="efg-meal-donut-layout"><svg viewBox="0 0 180 180" role="img" aria-label="Distribución de calorías entre las comidas del último día registrado" class="efg-meal-donut">'+arcs+'<text x="90" y="86" text-anchor="middle" class="efg-donut-number">'+n(total)+'</text><text x="90" y="105" text-anchor="middle" class="efg-donut-unit">kcal comidas</text></svg>'+
 '<div class="efg-meal-legend">'+slots.map(([id,label,color])=>{
  const m=last.slotTotals.find(x=>x.id===id);
  return '<div><i style="background:'+color+'"></i><span>'+label+'</span><b>'+(m?.hasFood?n(m.k)+' kcal':'Sin cargar')+'</b></div>';
 }).join("")+'</div></div><p class="efg-chart-footnote">Distribución del '+last.date.split("-").reverse().join("/")+'. No incluye suplementos registrados por separado.</p>';
}
export function progressDashboard(logs,goals,range,end,goalForDate,context="student"){
 const days=[7,30,90].includes(Number(range))?Number(range):7;
 const window=filterDays(logs,days,end);
 const choices=[7,30,90].map(x=>'<button type="button" data-progress-range="'+x+'" class="'+(x===days?'selected':'')+'" aria-pressed="'+(x===days?'true':'false')+'">'+x+' días</button>').join("");
 return '<section class="efg-progress-dashboard" aria-label="Panel de análisis nutricional">'+
 '<div class="efg-progress-header"><div><span class="eyebrow">NUTRICIÓN CON-CIENCIA · EVOLUCIÓN</span><h2>'+(context==="coach"?"Evolución nutricional del alumno":"Mi nutrición en números")+'</h2><p>Datos de los registros guardados · '+days+' días</p></div><div class="efg-progress-range" role="group" aria-label="Período del análisis">'+choices+'</div></div>'+
 '<div class="efg-progress-grid">'+
 '<article class="efg-progress-panel efg-progress-wide">'+title("Energía y macronutrientes","Promedio de energía por macronutriente en cada intervalo.")+barChart(window)+'</article>'+
 '<article class="efg-progress-panel">'+title("Objetivos nutricionales","Comparación del último día registrado con la meta vigente.")+goalBars(window,goalForDate)+'</article>'+
 '<article class="efg-progress-panel">'+title("Constancia de registro","Días con información registrada en el período.")+consistency(window)+'</article>'+
 '<article class="efg-progress-panel efg-progress-wide">'+title("Energía por comida","Cómo se distribuyeron las calorías del último día con comidas.")+mealDonut(window)+'</article>'+
 '</div></section>';
}
