// EFG Nutrition · Luxury Pro weekly report (nutrition-coach only).
// Deterministic educational summaries. No AI, diagnosis, automatic publication or moral food grading.
export const LUXURY_WEEKLY_KIND='efg_luxury_weekly_v1';
const finite=x=>Number.isFinite(Number(x))?Number(x):null;
const money=x=>Number.isFinite(x)?Math.round(x):null;
const date=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))?String(s):null;
const clean=(s,max=300)=>String(s??'').replace(/[\x00-\x08\x0b-\x1f]/g,' ').trim().slice(0,max);
const escape=s=>clean(s,9000).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(x,dec=0)=>Number.isFinite(x)?x.toLocaleString('es-AR',{minimumFractionDigits:dec,maximumFractionDigits:dec}):'—';
const dailyGoal=(goals,day)=>{
 const active=(goals||[]).filter(g=>date(g?.start_on)&&g.start_on<=day).sort((a,b)=>b.start_on.localeCompare(a.start_on))[0];
 return active||null;
};
const goalKey={k:'kcal',p:'protein_g',c:'carb_g',f:'fat_g'};
const safeEnergy=(d)=>['k','p','c','f'].every(key=>Number.isFinite(Number(d?.[key]))&&Number(d[key])>=0);
function foodsFromLogs(logs,from,to,days){
 const byDay=new Map();
 for(const log of logs||[]){
  if(!date(log?.log_day)||log.log_day<from||log.log_day>to||!days.has(log.log_day))continue;
  const set=byDay.get(log.log_day)||new Map();
  for(const items of Object.values(log.meals||{})){
   if(!Array.isArray(items))continue;
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
function recommendations(model){
 const {daysRecorded,daysClosed,averages,targets}=model;
 const focus=[];
 if(daysRecorded<4||daysClosed<3){
  focus.push('Completar más días de registro antes de interpretar diferencias energéticas.');
  focus.push('Registrar las comidas que falten sin intentar compensarlas.');
  focus.push('Consultar al coach para revisar el contexto de la semana.');
  return {focus,conclusion:'Hay registros insuficientes o parciales para interpretar con confianza tu consumo semanal. Los días sin información no equivalen a cero calorías. Revisemos juntos cómo facilitar el registro.'};
 }
 const p=targets.p&&averages.p!==null?averages.p/targets.p:null;
 const k=targets.k&&averages.k!==null?averages.k/targets.k:null;
 const f=targets.f&&averages.f!==null?averages.f/targets.f:null;
 const carb=targets.c&&averages.c!==null?averages.c/targets.c:null;
 if(p!==null&&p<.9)focus.push('Priorizar fuentes de proteína dentro de la guía aprobada por el coach.');
 else if(p!==null)focus.push('Mantener la proteína próxima al objetivo aprobado; no aumentarla por inercia.');
 if(k!==null&&k<.95){
  if(f!==null&&f<.85)focus.push('Revisar grasas y energía con el coach antes de añadir alimentos.');
  else if(carb!==null&&carb<.95)focus.push('Revisar las porciones de carbohidratos según el entrenamiento y las metas del plan.');
  else focus.push('Revisar cómo distribuir el aporte de energía entre las comidas.');
 }else if(k!==null&&k>1.05)focus.push('Revisar la distribución del plan sin convertir una semana en un diagnóstico.');
 else focus.push('Mantener hábitos y analizar la tendencia en varias semanas.');
 focus.push('Intentar registrar más días de la próxima semana, sin penalizaciones por días faltantes.');
 const first='En los '+daysRecorded+' días registrados, tu energía media fue '+(averages.k===null?'no estimable':fmt(averages.k)+' kcal')+
  (targets.k?' frente a '+fmt(targets.k)+' kcal del objetivo vigente estimado':' (sin meta energética comparable)')+'. ';
 const second=p===null?'No hay objetivo proteico comparable para esta semana. ':
  p<.9?'La proteína registrada quedó por debajo de la meta del coach. ':
  'La proteína registrada estuvo cerca de la meta del coach. ';
 const caveat='Los días sin registro no se interpretan como consumo cero y los datos autodeclarados pueden estar incompletos.';
 return {focus:focus.slice(0,3),conclusion:first+second+caveat};
}
export function buildLuxuryWeeklyReport({from,to,friday,studentName,coachName,days=[],goals=[],logs=[]}={}){
 if(!date(from)||!date(to)||!date(friday)||from>to||to>=friday)throw Error('Período semanal no válido');
 const all=Array.from({length:7},(_,i)=>{
  const d=new Date(from+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);
 });
 if(all[6]!==to)throw Error('La ventana debe abarcar siete días');
 const recorded=(days||[]).filter(d=>date(d?.date)&&d.date>=from&&d.date<=to&&d.hasData&&safeEnergy(d));
 const byDate=new Map(recorded.map(d=>[d.date,d]));
 const cleanDays=all.map(key=>{
  const d=byDate.get(key);
  return d?{date:key,hasData:true,closed:!!d.closed,k:Number(d.k),p:Number(d.p),c:Number(d.c),f:Number(d.f)}:
   {date:key,hasData:false,closed:false,k:null,p:null,c:null,f:null};
 });
 const valid=cleanDays.filter(d=>d.hasData);
 const mean=key=>valid.length?valid.reduce((a,d)=>a+d[key],0)/valid.length:null;
 const eligible=valid.map(d=>({d,g:dailyGoal(goals,d.date)}));
 const meanTarget=key=>{
  const selected=eligible.map(x=>finite(x.g?.[goalKey[key]])).filter(x=>x!==null&&x>0);
  return selected.length===valid.length&&selected.length?selected.reduce((a,b)=>a+b,0)/selected.length:null;
 };
 const averages={k:mean('k'),p:mean('p'),c:mean('c'),f:mean('f')};
 const targets={k:meanTarget('k'),p:meanTarget('p'),c:meanTarget('c'),f:meanTarget('f')};
 const model={kind:LUXURY_WEEKLY_KIND,studentName:clean(studentName,70)||'Alumno',coachName:clean(coachName,70)||'Entrenador',
  from,to,friday,daysRecorded:valid.length,daysClosed:valid.filter(d=>d.closed).length,
  days:cleanDays,averages,targets,topFoods:foodsFromLogs(logs,from,to,new Set(valid.map(d=>d.date))),focus:[],conclusion:'',flexibleNote:''};
 const advice=recommendations(model);model.focus=advice.focus;model.conclusion=advice.conclusion;
 // A flexible eating idea is never an earned reward, prescription or clinical approval.
 model.flexibleNote='Podés planificar una comida que disfrutes según tus preferencias y restricciones conocidas. No necesitás ganártela ni compensarla. Revisalo con tu coach.';
 return model;
}
export function reportAsStoredText(model,editedConclusion,editedFlexibleNote){
 if(model?.kind!==LUXURY_WEEKLY_KIND)throw Error('Informe de formato desconocido');
 const conclusion=clean(editedConclusion,2200),flexibleNote=clean(editedFlexibleNote,750);
 if(!conclusion)throw Error('El coach debe revisar la conclusión antes de publicar.');
 const payload={...model,conclusion,flexibleNote,approvedByCoach:true};
 const serialized=JSON.stringify(payload);
 if(serialized.length>8000)throw Error('El informe excede la capacidad del registro semanal.');
 return serialized;
}
export function parseLuxuryWeeklyReport(value){
 if(typeof value!=='string'||value.length>8000||!value.startsWith('{"kind":"'+LUXURY_WEEKLY_KIND+'"'))return null;
 try{
  const m=JSON.parse(value);
  if(m.kind!==LUXURY_WEEKLY_KIND||m.approvedByCoach!==true||!date(m.from)||!date(m.to)||
    !Array.isArray(m.days)||m.days.length!==7||!Array.isArray(m.focus)||m.focus.length>3||
    !Array.isArray(m.topFoods)||m.topFoods.length>5||typeof m.conclusion!=='string')return null;
  return m;
 }catch{return null;}
}
export function renderLuxuryWeeklyReport(model,{demo=false}={}){
 if(!model||model.kind!==LUXURY_WEEKLY_KIND)return '';
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
 return '<article class="lux-report" aria-label="Informe semanal del alumno">'+
  '<div class="lux-report-cover"><div class="lux-report-kicker">EFG NUTRITION PRO <span>LUXURY PRO</span></div>'+
  (demo?'<p class="lux-report-demo">MODELO · DATOS FICTICIOS</p>':'')+
  '<h2>Tu semana,<br><em>en perspectiva.</em></h2><p>Una mirada clara a tus registros, tus hábitos y tu próximo paso.</p>'+
  '<div class="lux-report-identity"><span>'+escape(model.studentName)+'</span><span>'+escape(model.from)+' / '+escape(model.to)+'</span></div></div>'+
  '<div class="lux-report-main"><div class="lux-report-kpis">'+
  '<div><b>'+fmt(model.daysRecorded)+' / 7</b><small>Días registrados</small></div>'+
  '<div><b>'+average('k','kcal')+'</b><small>Media de días registrados</small></div>'+
  '<div><b>'+average('p','g')+'</b><small>Proteína media</small></div></div>'+
  '<section class="lux-report-section"><h3>Cómo se repartieron tus macros</h3><p>Promedios comparados con las metas vigentes de cada día registrado.</p>'+
  '<div class="lux-report-macros">'+bar('p','Proteínas','#288278','g')+bar('c','Carbohidratos','#b99459','g')+bar('f','Grasas','#8991b5','g')+'</div></section>'+
  '<section class="lux-report-section"><h3>Tu energía, día por día</h3><div class="lux-report-days">'+tick+'</div>'+
  '<p>Los días sin datos se muestran vacíos; nunca cuentan como cero calorías.</p></section>'+
  '<section class="lux-report-section"><h3>Tus alimentos más elegidos</h3>'+
  (top?'<ol class="lux-report-top">'+top+'</ol>':'<p>Necesitamos más registros de comidas para construir tu top.</p>')+'</section>'+
  '<section class="lux-report-conclusion"><h3>Conclusión revisada por tu coach</h3><p>'+escape(model.conclusion)+'</p></section>'+
  '<section class="lux-report-section"><h3>Tus tres focos para la próxima semana</h3><ol class="lux-report-focus">'+focus+'</ol></section>'+
  (model.flexibleNote?'<section class="lux-report-flex"><h3>Un espacio para disfrutar</h3><p>'+escape(model.flexibleNote)+'</p></section>':'')+
  '<footer>REVISADO POR '+escape(model.coachName).toUpperCase()+
  ' · Los datos de alimentación son autodeclarados. Este informe no sustituye asesoramiento médico o nutricional personalizado.</footer></div></article>';
}
