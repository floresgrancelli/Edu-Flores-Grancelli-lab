// Presentation only: existing diary totals and targets; no persistence or nutritional estimates.
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
const fmt=(value,d=0)=>safe(value).toLocaleString('es-AR',{maximumFractionDigits:d});
export function studentDayWelcome(nickname,day){
 const date=String(day||'').split('-').reverse().join('/');
 return '<header class="ncc-day-welcome"><div><div class="ncc-day-eyebrow">HOLA, '+escape(nickname||'')+'</div><h1>Mi Día</h1></div><div class="ncc-day-date"><time datetime="'+escape(day)+'">'+escape(date)+'</time></div></header>';
}
export function compactDaySummary(totals,goal,diary,mealSlots){
 const consumed=safe(totals?.k),target=safe(goal?.k),hasGoal=target>0,over=Math.max(0,consumed-target);
 const count=mealSlots.filter(([key])=>(diary?.meals?.[key]||[]).length&&!diary?.skipped?.[key]).length;
 return '<section class="card efg-pastel-day ncc-focus-summary" aria-label="Resumen de hoy"><div class="ncc-focus-energy"><div><strong>'+fmt(consumed)+' <small>kcal</small></strong><span>consumidas</span></div><div><strong>'+(hasGoal?(over?'+'+fmt(over):fmt(Math.max(0,target-consumed))):'—')+' <small>kcal</small></strong><span>'+(hasGoal?(over?'sobre la meta':'disponibles'):'sin meta de kcal')+'</span></div></div>'+
 '<p class="ncc-focus-target">'+(hasGoal?'Objetivo: '+fmt(target)+' kcal':'Podés registrar sin un objetivo configurado.')+'</p>'+
 [['p','Proteínas'],['c','Hidratos'],['f','Grasas']].map(([key,label])=>{const value=safe(totals?.[key]),g=safe(goal?.[key]),has=hasGoal&&g>0;return '<div class="ncc-focus-macro" data-ncc-macro="'+key+'"><div><strong>'+label+'</strong><span>'+fmt(value,1)+(has?' / '+fmt(g,1)+' g':' g · sin meta')+'</span></div>'+(has?'<div class="ncc-focus-meter" aria-hidden="true"><span style="width:'+Math.min(100,value/g*100)+'%"></span></div>':'')+'</div>';}).join('')+
 '<p class="ncc-focus-foot">'+count+' comidas registradas · '+fmt(totals?.fi,1)+' g de fibra</p></section>';
}
export function studentDayDashboard({totals,goal,diary,mealSlots,hasGuide=false}={}){
 return '<div class="ncc-day-dashboard">'+compactDaySummary(totals,goal,diary,mealSlots)+
 (hasGuide?'':'<div class="ncc-guide-pending"><span>Tu guía, cuando esté lista.</span><button type="button" class="btn small ghost" data-tab="messages">Consultar con mi coach</button></div>')+'</div>';
}
