// New coach-direct presentation. Historical model/HTML modules remain immutable.
// Candidate period model. Weekly v1 persistence remains unchanged.
// Nutrición Con-Ciencia · Luxury Pro weekly report (nutrition-coach only).
// Deterministic educational summaries. No AI, diagnosis, automatic publication or moral food grading.
export const LUXURY_PERIOD_KIND='efg_luxury_period_v1';
const finite=x=>{
 // Missing metrics are unknown, never silently interpreted as zero intake.
 if(x===null||x===undefined||typeof x==='boolean'||(typeof x==='string'&&!x.trim()))return null;
 const n=Number(x);return Number.isFinite(n)?n:null;
};
const money=x=>Number.isFinite(x)?Math.round(x):null;
const date=s=>{
 const value=String(s??'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const actual=new Date(value+'T12:00:00Z');
 return !Number.isNaN(actual.getTime())&&actual.toISOString().slice(0,10)===value?value:null;
};
const clean=(s,max=300)=>String(s??'').replace(/[\x00-\x08\x0b-\x1f]/g,' ').trim().slice(0,max);
const escape=s=>clean(s,9000).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(x,dec=0)=>Number.isFinite(x)?x.toLocaleString('es-AR',{minimumFractionDigits:dec,maximumFractionDigits:dec}):'—';
const dailyGoal=(goals,day)=>{
 const active=(goals||[]).filter(g=>date(g?.start_on)&&g.start_on<=day).sort((a,b)=>b.start_on.localeCompare(a.start_on))[0];
 return active||null;
};
const goalKey={k:'kcal',p:'protein_g',c:'carb_g',f:'fat_g'};
const safeEnergy=(d)=>['k','p','c','f'].every(key=>{
 const value=finite(d?.[key]);return value!==null&&value>=0;
});
// Optional fiber extension. Raw recorded-item fiber is already a total in grams.
// Never use the general daily reducer's fallback zero when source items lack fi.
const measuredFiber=x=>{if(!['number','string'].includes(typeof x))return null;const n=finite(x);return n!==null&&n>=0?n:null;};
function fiberFromLogs(logs,day){
 const rows=logs.filter(l=>l?.log_day===day);
 if(rows.length!==1)return null;
 const log=rows[0],meals=log.meals??{},sports=log.sports??[];
 if(typeof meals!=='object'||Array.isArray(meals)||!Array.isArray(sports))return null;
 const values=[];
 for(const [slot,items]of Object.entries(meals)){
  if(log.skipped?.[slot])continue; // Same consumed slots as dailyTotals.
  if(!Array.isArray(items))return null;
  for(const item of items){const value=measuredFiber(item?.fi);if(value===null)return null;values.push(value);}
 }
 // dailyTotals also includes sports: supplements/training consumptions are
 // recorded nutrient totals, not exercise expenditure. No fallback zero.
 for(const item of sports){const value=measuredFiber(item?.fi);if(value===null)return null;values.push(value);}
 return values.length?values.reduce((a,b)=>a+b,0):null;
}
function fiberGoalAt(goals,day){
 const rows=(goals||[]).filter(g=>date(g?.start_on)&&g.start_on<=day);
 if(!rows.length)return null;
 const latest=rows.map(g=>g.start_on).sort().at(-1);
 const values=rows.filter(g=>g.start_on===latest).map(g=>measuredFiber(g.fiber_g));
 return values.every(v=>v!==null&&v>0&&v===values[0])?values[0]:null;
}
function fiberSummary(days){
 const measured=days.filter(d=>d.hasData&&d.fi!==null),paired=measured.filter(d=>d.fiberTarget!==null);
 const mean=(rows,k)=>rows.length?rows.reduce((sum,d)=>sum+d[k],0)/rows.length:null;
 return {version:1,daysMeasured:measured.length,daysCompared:paired.length,
  comparedAverage:mean(paired,'fi'),comparedTarget:mean(paired,'fiberTarget')};
}
function validFiberShape(m){
 const extended=Object.hasOwn(m,'fiber')||Object.hasOwn(m.averages,'fi')||Object.hasOwn(m.targets,'fi')||m.days.some(d=>d&&(Object.hasOwn(d,'fi')||Object.hasOwn(d,'fiberTarget')));
 if(!extended)return true; // Old serialized reports remain unchanged, not backfilled.
 if(!m.fiber||m.fiber.version!==1||!Number.isSafeInteger(m.fiber.daysMeasured)||!Number.isSafeInteger(m.fiber.daysCompared)||!validMetric(m.averages.fi)||!validMetric(m.targets.fi)||
  !m.days.every(d=>d&&validMetric(d.fi)&&validMetric(d.fiberTarget)&&
   (d.hasData||d.fi===null)&&(d.fi!==null||d.fiberTarget===null)&&
   (d.fiberTarget===null||d.fiberTarget>0)))return false;
 const expected=fiberSummary(m.days),measured=m.days.filter(d=>d.hasData&&d.fi!==null);
 const mean=measured.length?measured.reduce((sum,d)=>sum+d.fi,0)/measured.length:null;
 const target=expected.daysMeasured>0&&expected.daysCompared===expected.daysMeasured?expected.comparedTarget:null;
 const equal=(a,b)=>a===b||(typeof a==='number'&&typeof b==='number'&&Number.isFinite(a)&&Math.abs(a-b)<=1e-9);
 return Object.keys(expected).every(k=>equal(m.fiber[k],expected[k]))&&equal(m.averages.fi,mean)&&equal(m.targets.fi,target);
}
function fiberText(model){
 if(!model.fiber)return 'Fibra: sin dato consolidado en este informe. No se interpreta como cero.';
 const f=model.fiber;
 if(!f.daysMeasured)return 'Fibra: sin dato consolidado; sin datos medidos en el período. No se interpreta como cero.';
 const coverage='Fibra: '+fmt(model.averages.fi,1)+' g de promedio en '+f.daysMeasured+' de '+model.days.length+' días con dato medido ('+model.daysRecorded+' días registrados).';
 return coverage+(f.daysCompared?' Comparación en '+f.daysCompared+' fechas con dato y meta vigente: '+fmt(f.comparedAverage,1)+' g registrados / '+fmt(f.comparedTarget,1)+' g de meta media.':' Sin metas históricas comparables para esas fechas.')+' Los datos ausentes no cuentan como cero.';
}
function foodsFromLogs(logs,from,to,days){
 const byDay=new Map();
 for(const log of logs||[]){
  if(!date(log?.log_day)||log.log_day<from||log.log_day>to||!days.has(log.log_day))continue;
  const set=byDay.get(log.log_day)||new Map();
  for(const [slot,items] of Object.entries(log.meals||{})){
   // Historical meals may retain foods after a slot was marked Omitir.
   // Omitted foods must not appear in the student's weekly favourites.
   if(log.skipped?.[slot]===true||!Array.isArray(items))continue;
   for(const food of items){
    const name=clean(food?.name||food?.label||'',70);
    const key=clean(food?.id||name.toLowerCase(),90);
    if(!name||!key)continue;
    if(!set.has(key))set.set(key,name);
   }
  }
  byDay.set(log.log_day,set);
 }
 const rank=new Map();
 for(const foods of byDay.values())for(const [id,label] of foods){
  const row=rank.get(id)||{name:label,days:0};
  row.days+=1;rank.set(id,row);
 }
 return [...rank.values()].sort((a,b)=>b.days-a.days||a.name.localeCompare(b.name,'es')).slice(0,5);
}
// These are external scientific position statements, not evidence of universal app-specific thresholds.
// EFG 90% protein, 95% energy/carb and 85% fat are conservative UI review prompts,
// NOT diagnostic, clinical or population-normal reference cutoffs.
export const LUXURY_EVIDENCE_SOURCES=Object.freeze([
 {id:'ACSM-2016',title:'Nutrition and Athletic Performance · Academy/DC/ACSM (2016)',
  doi:'10.1249/MSS.0000000000000852',url:'https://doi.org/10.1249/MSS.0000000000000852',
  supports:'Individualizar aporte energético y de macronutrientes según entrenamiento, contexto y profesional.'},
 {id:'ISSN-PROTEIN-2017',title:'ISSN Position Stand: Protein and Exercise (2017)',
  doi:'10.1186/s12970-017-0177-8',url:'https://doi.org/10.1186/s12970-017-0177-8',
  supports:'La proteína se evalúa según actividad, masa corporal, objetivo y contexto; no subirla sin motivo.'}
]);
export const LUXURY_REVIEW_RULES=Object.freeze({
 minRecorded:4,minClosed:3,minDaysWithTwoMeals:3,proteinBelow:.90,energyBelow:.95,energyAbove:1.05,carbBelow:.95,fatBelow:.85
});
function recommendations(model){
 const {daysRecorded,daysClosed,daysWithMeasuredMeals,daysWithMultipleMeals,averages,targets}=model;
 const r=LUXURY_REVIEW_RULES;
 const ratio=key=>targets[key]>0&&averages[key]!==null?averages[key]/targets[key]:null;
 const p=ratio('p'),k=ratio('k'),f=ratio('f'),carb=ratio('c');
 // These are record-coverage checks, NOT diagnostic, performance or moral thresholds.
 const enough=daysRecorded>=r.minRecorded&&daysClosed>=r.minClosed&&
  (daysWithMeasuredMeals===0||daysWithMultipleMeals>=r.minDaysWithTwoMeals);
 const comparisons={energyPct:k===null?null:Math.round(k*100),proteinPct:p===null?null:Math.round(p*100),
  carbsPct:carb===null?null:Math.round(carb*100),fatsPct:f===null?null:Math.round(f*100)};
 const evidence={
  grade:enough?'orientativa':'insuficiente',
  dataBasis:daysRecorded+' de '+model.days.length+' días con ingestas autodeclaradas; '+daysClosed+' días cerrados por fecha (no significa comidas completas). '+
   (daysWithMeasuredMeals>0?daysWithMultipleMeals+' días con al menos dos comidas cargadas.':'Cantidad de comidas no verificada.'),
  dailyGoals:'Comparación con objetivos aprobados que estaban vigentes en cada fecha; sin objetivo verificable, no se interpreta un faltante.',
  rule:'Para orientar esta devolución, uso criterios internos de revisión (90 % proteína; 95 % energía/HC; 85 % grasas). NO son umbrales clínicos ni permiten diagnosticar.',
  scientificSources:LUXURY_EVIDENCE_SOURCES.map(s=>s.id),
  comparisons
 };
 const firstName=clean(model.studentName,70).split(/\s+/).find(Boolean)||'';
 const hello=firstName&&firstName.toLowerCase()!=='alumno'?'¡Hola, '+firstName+'! ':'¡Hola! ';
 if(!enough){
  return {focus:[
   'Te propongo registrar los días que faltan y las comidas que hayas podido hacer.',
   'Contame si hubo comidas que no llegaste a cargar.',
   'Elegí un momento cómodo del día para llevar tu registro, sin presión.'
  ],conclusion:hello+'Gracias por registrar tu alimentación este período. Tenemos '+daysRecorded+
   ' de '+model.days.length+' días con alimentos registrados, así que todavía nos falta información para interpretar el período con confianza. '+
   'No pasa nada si quedó algo sin cargar: un día vacío no significa que no hayas comido. '+
   'Te propongo que empecemos por completar el registro y elijamos un hábito que te resulte fácil de sostener.',
   evidence};
 }
 const focus=[];
 if(p!==null&&p<r.proteinBelow)
  focus.push('Conversemos sobre cómo acercar las proteínas registradas a tu meta personal, sin aumentar cantidades automáticamente.');
 else if(p!==null)
  focus.push('Seguí incluyendo fuentes de proteína que disfrutes, en las porciones de tu plan.');
 if(k!==null&&k<r.energyBelow){
  if(f!==null&&f<r.fatBelow)
   focus.push('Revisemos juntos si las comidas y las grasas que registraste acompañan la energía prevista en tu plan.');
  else if(carb!==null&&carb<r.carbBelow)
   focus.push('Miremos juntos las porciones de carbohidratos según tu rutina y entrenamiento.');
  else focus.push('Revisá la distribución de las comidas para acercarte a la energía prevista en tu plan.');
 }else if(k!==null&&k>r.energyAbove)
  focus.push('Miremos juntos la diferencia con tu plan, sin compensaciones ni culpabilidad.');
 else focus.push('Conservá los hábitos que te resultan cómodos y observá la tendencia antes de cambiar cantidades.');
 focus.push('Si faltó cargar alguna comida, completá el registro para que la próxima revisión sea más útil.');
 const kcalText=averages.k===null?'no pudimos calcular la energía media':'la energía media registrada fue '+fmt(averages.k)+' kcal';
 const targetText=targets.k>0?' frente a '+fmt(targets.k)+' kcal de la meta media vigente.':'.';
 const parts=[
  hello+'¡Ya tenemos una buena base para conversar sobre tu período! Registraste comidas en '+daysRecorded+' de '+model.days.length+' días.',
  'En esos días, '+kcalText+targetText,
  p===null?'No hay una meta proteica comparable para sacar conclusiones sobre las proteínas.':
   p<r.proteinBelow?'Las proteínas registradas quedaron por debajo de tu objetivo individual; podemos revisar juntos opciones que se adapten a tu rutina.':
   'Las proteínas registradas estuvieron cerca o por encima de tu referencia personal; no hace falta aumentarlas porque sí.',
  k===null?'Todavía no podemos comparar la energía con un objetivo válido.':
   k<r.energyBelow?'La energía registrada quedó por debajo de la referencia del plan; también podría haber comidas sin anotar.':
   k>r.energyAbove?'El promedio declarado superó la referencia acordada; sirve para conversar y ajustar, no para juzgar.':
   'La energía anotada estuvo cerca del objetivo acordado.',
  'Te propongo que elijamos un cambio pequeño y sostenible para la próxima revisión. Estos números describen lo registrado: no miden por sí solos todo lo que comiste ni tu estado de salud.'
 ];
 return {focus:focus.slice(0,3),conclusion:parts.join(' '),evidence};
}
export function buildLuxuryPeriodReport({from,to,friday,studentName,coachName,days=[],goals=[],logs=null}={}){
 if(!date(from)||!date(to)||!date(friday)||from>to||to>=friday)throw Error('Período semanal no válido');
 const count=Math.round((Date.parse(to)-Date.parse(from))/86400000)+1;
 if(count<1||count>90)throw Error('Elegí entre 1 y 90 días.');
 const all=Array.from({length:count},(_,i)=>{
  const d=new Date(from+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);
 });

 const next=new Date(to+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);
 if(next.toISOString().slice(0,10)!==friday)
  throw Error('El informe semanal debe corresponder al viernes inmediatamente posterior.');
 // Identify duplicates BEFORE filtering incomplete values: an incomplete
 // second row must not silently conceal a conflicting diary record.
 const candidates=(days||[]).filter(d=>date(d?.date)&&d.date>=from&&d.date<=to&&d.hasData===true);
 if(new Set(candidates.map(d=>d.date)).size!==candidates.length)throw Error('Hay registros diarios duplicados; revisá el período antes de publicar.');
 const recorded=candidates.filter(safeEnergy);
 const byDate=new Map(recorded.map(d=>[d.date,d]));
 const cleanDays=all.map(key=>{
  const d=byDate.get(key);
  return d?{date:key,hasData:true,closed:!!d.closed,mealCount:finite(d.mealCount),k:Number(d.k),p:Number(d.p),c:Number(d.c),f:Number(d.f),fi:Array.isArray(logs)?fiberFromLogs(logs,key):measuredFiber(d.fi)}:
   {date:key,hasData:false,closed:false,mealCount:null,k:null,p:null,c:null,f:null,fi:null};
 });
 for(const d of cleanDays)d.fiberTarget=d.fi!==null?fiberGoalAt(goals,d.date):null;
 const fiber=fiberSummary(cleanDays);
 const valid=cleanDays.filter(d=>d.hasData);
 const mean=key=>valid.length?valid.reduce((a,d)=>a+d[key],0)/valid.length:null;
 const eligible=valid.map(d=>({d,g:dailyGoal(goals,d.date)}));
 const meanTarget=key=>{
  const selected=eligible.map(x=>finite(x.g?.[goalKey[key]])).filter(x=>x!==null&&x>0);
  return selected.length===valid.length&&selected.length?selected.reduce((a,b)=>a+b,0)/selected.length:null;
 };
 const measured=valid.filter(d=>d.fi!==null);
 const averages={k:mean('k'),p:mean('p'),c:mean('c'),f:mean('f'),fi:measured.length?measured.reduce((sum,d)=>sum+d.fi,0)/measured.length:null};
 const targets={k:meanTarget('k'),p:meanTarget('p'),c:meanTarget('c'),f:meanTarget('f'),fi:fiber.daysMeasured>0&&fiber.daysCompared===fiber.daysMeasured?fiber.comparedTarget:null};
 const model={kind:LUXURY_PERIOD_KIND,coachVoiceVersion:'coach-direct-v1',studentName:clean(studentName,70)||'Alumno',coachName:clean(coachName,70)||'Tu coach',
  from,to,friday,daysRecorded:valid.length,daysClosed:valid.filter(d=>d.closed).length,
  daysWithMeasuredMeals:valid.filter(d=>d.mealCount!==null).length,
  daysWithMultipleMeals:valid.filter(d=>d.mealCount!==null&&d.mealCount>=2).length,
  days:cleanDays,averages,targets,fiber,topFoods:foodsFromLogs(logs,from,to,new Set(valid.map(d=>d.date))),focus:[],conclusion:'',flexibleNote:''};
 const advice=recommendations(model);model.focus=advice.focus;model.conclusion=advice.conclusion;model.evidence=advice.evidence;
 // A flexible eating idea is never an earned reward, prescription or clinical approval.
 model.flexibleNote='Comer también es compartir, elegir y disfrutar. Si te gusta un helado o una comida especial, podemos conversar sobre cómo incluirlos en tu período, teniendo en cuenta tus preferencias y necesidades. No hace falta ganárselos ni compensarlos.';
 return model;
}
// A historical report is untrusted stored text. Validate all fields used by
// the renderer so one damaged JSON row cannot crash alumno/coach history.
const validMetric=x=>x===null||(typeof x==='number'&&Number.isFinite(x)&&x>=0);
function validReportShape(m){
 if(!m||typeof m!=='object'||m.kind!==LUXURY_PERIOD_KIND||m.coachVoiceVersion!=='coach-direct-v1'||
   !date(m.from)||!date(m.to)||!date(m.friday)||
   typeof m.studentName!=='string'||typeof m.coachName!=='string'||
   !Number.isSafeInteger(m.daysRecorded)||m.daysRecorded<0||m.daysRecorded>90||
   !Number.isSafeInteger(m.daysClosed)||m.daysClosed<0||m.daysClosed>m.daysRecorded||
   (m.daysWithMeasuredMeals!==undefined&&(!Number.isSafeInteger(m.daysWithMeasuredMeals)||
     m.daysWithMeasuredMeals<0||m.daysWithMeasuredMeals>m.daysRecorded))||
   (m.daysWithMultipleMeals!==undefined&&(!Number.isSafeInteger(m.daysWithMultipleMeals)||
     m.daysWithMultipleMeals<0||m.daysWithMultipleMeals>(m.daysWithMeasuredMeals??m.daysRecorded)))||
   !Array.isArray(m.days)||(m.days.length<1||m.days.length>90)||!m.averages||!m.targets||
   !['k','p','c','f'].every(k=>validMetric(m.averages[k])&&validMetric(m.targets[k]))||
   !Array.isArray(m.focus)||m.focus.length>3||m.focus.some(x=>typeof x!=='string')||
   !Array.isArray(m.topFoods)||m.topFoods.length>5||
   m.topFoods.some(x=>!x||typeof x.name!=='string'||!Number.isInteger(x.days)||x.days<1||x.days>m.days.length)||
   typeof m.conclusion!=='string'||!m.conclusion.trim()||m.conclusion.length>2200||
   typeof m.flexibleNote!=='string'||m.flexibleNote.length>750)return false;
 const expected=Array.from({length:m.days.length},(_,i)=>{
  const d=new Date(m.from+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);
 });
 if(expected.at(-1)!==m.to)return false;
 const next=new Date(m.to+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);
 if(next.toISOString().slice(0,10)!==m.friday)return false;
 const observed=m.days.filter(d=>d?.hasData===true);
 if(observed.length!==m.daysRecorded||
    observed.filter(d=>d.closed===true).length!==m.daysClosed)return false;
 const measuredMeals=observed.filter(d=>d.mealCount!==null&&d.mealCount!==undefined).length;
 const multipleMeals=observed.filter(d=>Number.isFinite(d.mealCount)&&d.mealCount>=2).length;
 if(m.daysWithMeasuredMeals!==undefined&&m.daysWithMeasuredMeals!==measuredMeals)return false;
 if(m.daysWithMultipleMeals!==undefined&&m.daysWithMultipleMeals!==multipleMeals)return false;
 return validFiberShape(m)&&m.days.every((d,i)=>d&&typeof d==='object'&&d.date===expected[i]&&
  (d.hasData||d.closed===false)&&
  (d.mealCount===undefined||d.mealCount===null||
   (Number.isSafeInteger(d.mealCount)&&d.mealCount>=0))&&
  typeof d.hasData==='boolean'&&typeof d.closed==='boolean'&&
  ['k','p','c','f'].every(k=>d.hasData?
   (typeof d[k]==='number'&&Number.isFinite(d[k])&&d[k]>=0):d[k]===null));
}
export function periodReportAsStoredText(model,editedConclusion,editedFlexibleNote){
 if(!validReportShape(model))throw Error('Informe semanal con datos inválidos; volvé a generar la vista previa.');
 // Never silently clip the text the coach reviewed and explicitly approved.
 // The preview contract must use exactly the submitted conclusion and note.
 if(String(editedConclusion??'').length>2200||String(editedFlexibleNote??'').length>750)
  throw Error('El texto del informe supera el límite permitido; revisalo antes de publicarlo.');
 const conclusion=clean(editedConclusion,2200),flexibleNote=clean(editedFlexibleNote,750);
 if(!conclusion)throw Error('El coach debe revisar la conclusión antes de publicar.');
 const payload={...model,conclusion,flexibleNote,approvedByCoach:true};
 const serialized=JSON.stringify(payload);
 if(serialized.length>64000)throw Error('El informe excede la capacidad del registro semanal.');
 return serialized;
}
export function parseLuxuryPeriodReport(value){
 if(typeof value!=='string'||value.length>64000||!value.startsWith('{"kind":"'+LUXURY_PERIOD_KIND+'"'))return null;
 try{
  const m=JSON.parse(value);
  if(m.approvedByCoach!==true||!validReportShape(m))return null;
  return m;
 }catch{return null;}
}
export function renderLuxuryPeriodReport(model,{demo=false}={}){
 if(!validReportShape(model))return '';
 const average=(key,unit)=>fmt(model.averages?.[key],key==='k'?0:1)+' '+unit;
 const bar=(key,label,color,unit)=>{const a=model.averages?.[key],t=model.targets?.[key];
  const usable=Number.isFinite(a)&&Number.isFinite(t)&&t>0;
  const portion=usable?Math.min(100,Math.max(0,a/t*100)):0;
  return '<div class="lux-report-macro"><div><b>'+label+'</b><span>'+average(key,unit)+(usable?' / '+fmt(t)+' '+unit:'')+'</span></div>'+
   '<div class="lux-report-bar"><i style="width:'+portion.toFixed(1)+'%;background:'+color+'"></i></div>'+
   '<small>'+(usable?fmt(a/t*100)+' % de la meta':'Sin meta comparable')+'</small></div>';
 };
 const tick=model.days.map(d=>{
  const height=d.hasData?Math.min(100,Math.max(4,d.k/Math.max(model.targets.k||2300,2300)*100)):0;
  return '<div class="lux-report-day"><div class="lux-report-column">'+(d.hasData?'<i style="height:'+height.toFixed(1)+'%"></i>':'<span>—</span>')+'</div><b>'+escape(d.date.slice(8))+'/'+escape(d.date.slice(5,7))+'</b></div>';
 }).join('');
 const top=(model.topFoods||[]).map((f,i)=>'<li><b>'+String(i+1).padStart(2,'0')+'</b><span>'+escape(f.name)+'</span><strong>'+fmt(f.days)+' día(s)</strong></li>').join('');
 const focus=(model.focus||[]).slice(0,3).map((f,i)=>'<li><b>'+String(i+1).padStart(2,'0')+'</b><span>'+escape(f)+'</span></li>').join('');
 return '<article class="lux-report" aria-label="Informe por período del alumno">'+
  '<div class="lux-report-cover"><div class="lux-report-kicker"><img class="lux-report-serotonin" src="./assets/serotonina-acuarela.avif" width="43" height="32" alt="" decoding="async">Nutrición Con-Ciencia <span>LUXURY PRO</span></div>'+
  (demo?'<p class="lux-report-demo">MODELO · DATOS FICTICIOS</p>':'')+
  '<h2>Tu período,<br><em>en perspectiva.</em></h2><p>Una mirada clara a tus registros, tus hábitos y tu próximo paso.</p>'+
  '<div class="lux-report-identity"><span>'+escape(model.studentName)+'</span><span>'+escape(model.from)+' / '+escape(model.to)+'</span><span>'+escape(model.coachName)+(model.coachName==='Tu coach'?'':' · Tu coach')+'</span></div></div>'+
  '<div class="lux-report-main"><div class="lux-report-kpis">'+
  '<div><b>'+fmt(model.daysRecorded)+' / '+model.days.length+'</b><small>Días registrados</small></div>'+
  '<div><b>'+average('k','kcal')+'</b><small>Media de días registrados</small></div>'+
  '<div><b>'+average('p','g')+'</b><small>Proteína media</small></div></div>'+
  '<section class="lux-report-section"><h3>Cómo se repartieron tus macros</h3><p>Promedios comparados con las metas vigentes de cada día registrado.</p>'+
  '<div class="lux-report-macros">'+bar('p','Proteínas','#288278','g')+bar('c','Carbohidratos','#b99459','g')+bar('f','Grasas','#8991b5','g')+'</div></section>'+
  '<section class="lux-report-section"><h3>Tu energía, día por día</h3><div class="lux-report-days" style="grid-template-columns:repeat(auto-fit,minmax(48px,1fr))">'+tick+'</div>'+
  '<p>Los días sin datos se muestran vacíos; nunca cuentan como cero calorías.</p>' +
  '<p class="lux-report-fiber-status">'+escape(fiberText(model))+'</p></section>'+
  '<section class="lux-report-section"><h3>Tus alimentos más elegidos</h3>'+
  (top?'<ol class="lux-report-top">'+top+'</ol>':'<p>Necesitamos más registros de comidas para construir tu top.</p>')+'</section>'+
  '<section class="lux-report-conclusion"><h3>'+'Mi devolución para vos'+'</h3><p>'+escape(model.conclusion)+'</p></section>'+
  '<section class="lux-report-evidence"><details><summary>En qué me baso para esta devolución · Datos y evidencia</summary>'+
  '<p><strong>Datos de este período:</strong> '+escape(model.evidence?.dataBasis||'No hay datos suficientes')+'</p>'+
  '<p><strong>Comparación:</strong> '+escape(model.evidence?.dailyGoals||'No comparable')+'</p>'+
  '<p><strong>Criterio:</strong> '+escape(model.evidence?.rule||'Interpretación orientativa')+'</p>'+
  '<p><strong>Marco científico:</strong> Nutrition and Athletic Performance (Academy/DC/ACSM, 2016; DOI 10.1249/MSS.0000000000000852) e ISSN Protein and Exercise (2017; DOI 10.1186/s12970-017-0177-8).</p>'+
  '<p>Las recomendaciones generales requieren contextualización profesional. Los criterios de revisión son orientativos y no constituyen un diagnóstico.</p>'+
  '</details></section>'+

  '<section class="lux-report-section"><h3>Lo que te propongo para la próxima revisión</h3><ol class="lux-report-focus">'+focus+'</ol></section>'+
  (model.flexibleNote?'<section class="lux-report-flex"><h3><span aria-hidden="true">✦</span> Espacio para disfrutar</h3><p>'+escape(model.flexibleNote)+'</p></section>':'')+
  '<footer>'+escape(model.coachName)+(model.coachName==='Tu coach'?'':' · Tu coach')+
  ' · Los datos de alimentación son autodeclarados. Este informe no sustituye asesoramiento médico o nutricional personalizado.</footer></div></article>';
}


