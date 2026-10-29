// EFG Nutrition Pro / Fase 3. Solo presentación; no dependencias de Supabase.
// Todos los datos vienen de dailyTotals() y activeGoal() de la app existente.
// No se fabrican valores de agua, pasos, comidas ni calorías. Sin persistencia propia.
const safe=n=>Number.isFinite(Number(n))?Math.max(0,Number(n)):0;
const fmt=(n,d=0)=>safe(n).toLocaleString("es-AR",{maximumFractionDigits:d});
const pct=(v,goal)=>goal>0?Math.max(0,Math.min(100,safe(v)/safe(goal)*100)):0;
// Una palta y aceituna unidas, estilo relleno, no confundir con agua.
export const FILLED_FATS_ICON='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" role="img" aria-label="Palta y aceituna"><path fill="#56835c" d="M21 4C13 4 11 13 8 19c-3 7-3 15 6 18 7 3 17 0 20-9 3-7-3-22-13-24Z"/><path fill="#f0e8bc" d="M21 9c-5 0-7 8-10 14-3 7 1 12 8 12 6 0 11-4 11-10S26 9 21 9Z"/><ellipse cx="22" cy="25" rx="5.5" ry="7.4" fill="#b88451"/><path fill="#689a66" d="M9 22C4 19 2 12 4 7c6 1 10 6 11 11Z"/><circle cx="10" cy="29" r="8" fill="#7e4fb5" stroke="#fff" stroke-width="2.2"/><ellipse cx="7.3" cy="26" rx="1.7" ry="2.7" fill="#fff" opacity=".75"/></svg>';
const defs=[
 {key:"p",name:"Proteínas",icon:'<span aria-hidden="true">💪</span>',color:"#f67796"},
 {key:"c",name:"Hidratos",icon:'<span aria-hidden="true">🌾</span>',color:"#f7b34c"},
 {key:"f",name:"Grasas",icon:FILLED_FATS_ICON,color:"#a876e9"}
];
// El anillo representa avance calórico; segmentos cromáticos DECORATIVOS.
// Las barras de macros muestran la proporción correcta de cada macro respecto a su meta.
export function pastelDaySummary(tot,goal,diary,mealSlots){
 const consumed=safe(tot?.k),target=safe(goal?.k),hasGoal=target>0;
 const progress=hasGoal?pct(consumed,target):0;
 const remainder=Math.max(0,target-consumed);
 const over=Math.max(0,consumed-target);
 const used=Math.min(100,progress);
 const degrees=[used*.36*3.6,used*.72*3.6,used*3.6].map(n=>n.toFixed(2)+"deg");
 const mealCount=mealSlots.filter(([key])=>(diary?.meals?.[key]||[]).length>0&&!diary?.skipped?.[key]).length;
 const label=hasGoal?fmt(target)+" kcal de objetivo":"Objetivo pendiente del coach";
 const macroInfo=defs.map(d=>{
  const val=safe(tot?.[d.key]),g=safe(goal?.[d.key]),progress=hasGoal&&g>0?pct(val,g):0;
  return '<div class="efg-pastel-macro"><span class="efg-pastel-macro-icon '+d.key+'" aria-hidden="true" style="--macro-color:'+d.color+';--macro-progress:'+progress.toFixed(2)+'%"><span class="efg-pastel-macro-glyph">'+d.icon+'</span></span>'+
   '<div class="efg-pastel-macro-info"><span>'+d.name+'</span><strong>'+fmt(val,1)+' g</strong>'+
   (hasGoal&&g>0?'<small>de '+fmt(g,1)+' g</small>':'<small>sin meta</small>')+
   '<div class="efg-pastel-meter" aria-hidden="true" style="--macro-color:'+d.color+';--macro-progress:'+progress.toFixed(2)+'%"><span></span></div></div></div>';
 }).join("");
 const ringDesc=hasGoal?"Calorías registradas: "+fmt(consumed)+" de "+fmt(target)+". Avance "+fmt(progress)+" por ciento.":"Calorías registradas: "+fmt(consumed)+". No hay objetivo aprobado.";
 return '<section class="card efg-pastel-day" aria-labelledby="efgPastelDayTitle">'+
  '<div class="efg-pastel-day-head"><strong id="efgPastelDayTitle">Resumen de hoy</strong><small>Datos registrados · no un plan estimado</small></div>'+
  '<div class="efg-pastel-day-grid"><div class="efg-pastel-ring" role="img" aria-label="'+ringDesc+
  '" style="--ring-a:'+degrees[0]+';--ring-b:'+degrees[1]+';--ring-c:'+degrees[2]+'">'+
  '<div class="efg-pastel-ring-inner"><strong>'+fmt(consumed)+'</strong><span>kcal registradas</span><small>'+label+'</small></div></div>'+
  '<div class="efg-pastel-macros" aria-label="Macronutrientes registrados">'+macroInfo+'</div></div>'+
  '<div class="efg-pastel-day-stats">'+
   '<div class="efg-pastel-stat" style="--tile-bg:#fff3e8"><strong>'+
   (hasGoal?(over>0?'+'+fmt(over):fmt(remainder)):'—')+'</strong><small>'+
   (hasGoal?(over>0?'kcal sobre meta':'kcal restantes'):'sin meta de kcal')+'</small></div>'+
   '<div class="efg-pastel-stat" style="--tile-bg:#f5eeff"><strong>'+mealCount+'</strong><small>comidas registradas</small></div>'+
   '<div class="efg-pastel-stat" style="--tile-bg:#edf4ff"><strong>'+fmt(tot?.fi,1)+' g</strong><small>fibra registrada</small></div>'+
  '</div>'+
  // El registro se realiza directamente en cada tarjeta de «Mis comidas de hoy».

  '<p class="efg-pastel-day-note">'+(hasGoal?"El anillo indica el avance calórico; los colores son decorativos. Las barras comparan cada macro con su objetivo.":"Sin objetivo aprobado, podés registrar alimentos sin porcentajes inventados.")+'</p>'+
 '</section>';
}
