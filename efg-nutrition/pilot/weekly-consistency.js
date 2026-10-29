// EFG Nutrition Pro · constancia semanal sin persistencia adicional.
// Basado en ingestas registradas, metas vigentes el día evaluado y horario argentino.
// ±5% / ±10% son convenciones de esta aplicación: NO umbrales clínicos universales.
const labels=["L","M","X","J","V","S"];
export const WEEKLY_RANGES=Object.freeze({ideal:0.05,acceptable:0.10,minProtein:0.90});
const n=x=>{const v=Number(x);return Number.isFinite(v)?v:0;};
const iso=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||""))?String(x):null;
const move=(day,offset)=>{const d=new Date(day+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);};
const pct=x=>Math.round(x*10)/10;
const escape=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function validIntake(log){return Object.values(log?.meals||{}).some(items=>Array.isArray(items)&&items.length)||
 Array.isArray(log?.sports)&&log.sports.length>0;}
export function classifyNutritionDay(totals,goal){
 const energy=n(totals?.k),protein=n(totals?.p);
 const kcalGoal=n(goal?.kcal??goal?.k),proteinGoal=n(goal?.protein_g??goal?.p);
 if(!(kcalGoal>0&&proteinGoal>0&&energy>0))return {status:"unavailable"};
 const energyPct=energy/kcalGoal,proteinPct=protein/proteinGoal;
 const dev=Math.abs(1-energyPct);
 const proteinOK=proteinPct>=WEEKLY_RANGES.minProtein-1e-10;
 const ideal=proteinOK&&dev<=WEEKLY_RANGES.ideal+1e-10;
 const acceptable=proteinOK&&dev<=WEEKLY_RANGES.acceptable+1e-10;
 return {status:ideal?"ideal":acceptable?"achieved":"outside",
  ideal,acceptable,energyPct:pct(energyPct*100),proteinPct:pct(proteinPct*100)};
}
export function calculateWeeklyConsistency({today,logs,goals,totalOf,goalForDate}){
 const date=iso(today);
 if(!date||typeof totalOf!=="function"||typeof goalForDate!=="function")throw Error("Parámetros semanales inválidos");
 const ref=new Date(date+"T12:00:00Z");
 const monday=move(date,-((ref.getUTCDay()+6)%7));
 const byDay=new Map((logs||[]).filter(x=>iso(x?.log_day)).map(x=>[x.log_day,x]));
 const days=labels.map((label,i)=>{
  const d=move(monday,i);
  if(d>date)return {date:d,label,status:"future",ideal:false,acceptable:false};
  const log=byDay.get(d);
  if(!log||!validIntake(log))return {date:d,label,status:d===date?"today-empty":"no-data",ideal:false,acceptable:false};
  const goal=goalForDate(goals,d);
  const score=classifyNutritionDay(totalOf(log),goal);
  if(d===date)return {date:d,label,status:"today",ideal:false,acceptable:false,todayScore:score.status,
   energyPct:score.energyPct,proteinPct:score.proteinPct};
  return {date:d,label,...score};
 });
 const valid=days.filter(x=>["ideal","achieved","outside"].includes(x.status));
 return {days,monday,ideal:valid.filter(x=>x.ideal).length,
  acceptable:valid.filter(x=>x.acceptable).length,
  evaluated:valid.length,hasTodaySunday:ref.getUTCDay()===0};
}
function slotCell(d,track){
 const active=track==="ideal"?d.ideal:d.acceptable;
 const icon=active?"✓":d.status==="today"?"•":d.status==="future"?"·":"–";
 const title=d.status==="future"?"Todavía no llegó ese día":
 d.status==="today"?"Hoy: en curso, sin premio definitivo":
 d.status==="no-data"?"Sin registro":
 d.status==="unavailable"?"Sin meta o registro evaluable":
 active?"Meta alcanzada":
 d.status==="outside"?"No alcanzó el margen o el mínimo de proteína":"No alcanzó esta franja";
 const dayText=escape(d.date+" · "+title);
 return '<span class="efg-streak-day'+(active?' is-earned':'')+(d.status==="today"?' is-today':'')+
  '" title="'+dayText+'" aria-label="'+dayText+'"><span class="efg-streak-daylabel">'+escape(d.label)+
  '</span><span class="efg-streak-dot" aria-hidden="true">'+icon+'</span></span>';
}
export function weeklyConsistencyPanel(report){
 const ideal=report?.ideal||0,acceptable=report?.acceptable||0;
 const draw=(type,name,detail,count)=>'<div class="efg-streak-track efg-streak-'+type+'">'+
  '<div class="efg-streak-trackhead"><span><strong>'+name+'</strong><small>'+detail+
  '</small></span><b>'+count+'/6</b></div>'+
  '<div class="efg-streak-days" role="group" aria-label="'+name+', lunes a sábado">'+
  report.days.map(d=>slotCell(d,type)).join("")+'</div></div>';
 return '<section class="card efg-weekly-streak" aria-labelledby="weeklyStreakTitle">'+
  '<div class="efg-weekly-streak-title"><span class="efg-streak-star" aria-hidden="true">✦</span><div>'+
   '<h2 id="weeklyStreakTitle">MIS LOGROS DE LA SEMANA</h2>'+
   '<p>Lunes a sábado · Cada día cuenta</p></div></div>'+
  draw("ideal","ZONA IDEAL · ±5%","Calorías en rango y proteína ≥90%",ideal)+
  draw("acceptable","OBJETIVO CUMPLIDO · ±10%","También suma los días de ±5%",acceptable)+
  '<p class="efg-weekly-streak-sunday"><span aria-hidden="true">☀️</span> Domingo: alimentación flexible según las indicaciones de tu coach. No suma ni resta.</p>'+
  (report.hasTodaySunday?'<p class="efg-weekly-streak-today">Hoy es domingo: disfrutá según las pautas de tu coach.</p>':
   '<p class="efg-weekly-streak-today">El día de hoy se evalúa al terminar; nunca se premia de forma anticipada.</p>')+
  '<details class="efg-weekly-streak-science"><summary>¿Por qué hay un margen?</summary><p>El registro de alimentos tiene variabilidad y errores de estimación. Los estudios respaldan evaluar hábitos y tendencias, no exigir el 100% exacto todos los días. Los rangos ±5% y ±10% son criterios prácticos de EFG, no valores clínicos universales.</p>'+
  '<small>Referencias: <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC6928130/" target="_blank" rel="noopener noreferrer">Revisión sistemática de registros nutricionales (2019)</a> · <a href="https://onlinelibrary.wiley.com/doi/10.1111/obr.70066" target="_blank" rel="noopener noreferrer">Revisión sobre adherencia (2026)</a>.</small></details>'+
  '<p class="efg-weekly-streak-note">Premio visual por constancia, sin diagnóstico ni penalización por días sin datos. Las calorías y la proteína se evalúan respecto de las metas aprobadas para cada fecha.</p>'+
 '</section>';
}
