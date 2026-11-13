const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>n===null?'—':n.toLocaleString('es-AR',{maximumFractionDigits:d});
const digits=id=>id==='ala'?2:['iron','zinc','b12'].includes(id)?1:0;
const amount=(n,number)=>fmt(number,digits(n.id))+' '+n.unit;
function bar(n){
 const known=n.percent!==null,fill=known?Math.min(100,n.percent):0;
 const food=known&&n.total>0?fill*n.food/n.total:0,supp=fill-food;
 return '<div class="ncc-micro-track '+(known?'':'is-unknown')+'" aria-hidden="true">'+
  '<span class="ncc-micro-food" style="width:'+food.toFixed(2)+'%"></span><span class="ncc-micro-supplement" style="width:'+supp.toFixed(2)+'%"></span></div>';
}
function dailyRows(model){
 return model.nutrients.map(n=>'<article class="ncc-micro-detail" data-micro-detail="'+n.id+'"><div class="ncc-micro-detail-head"><h3>'+esc(n.name)+'</h3><span>'+esc(n.status==='unknown'?'Sin estimación':n.partial?'Datos parciales':'Estimado')+'</span></div>'+
  '<p class="ncc-micro-amount">'+(n.total===null?'Sin datos de composición':(n.partial?'≥ ':'')+amount(n,n.total))+
  (n.reference.value!==null?' <small>/ '+amount(n,n.reference.value)+' · '+n.reference.kind+'</small>':'')+'</p>'+bar(n)+
  '<div class="ncc-micro-breakdown"><span>Alimentos: '+(n.foodKnown?amount(n,n.food):'Sin estimación')+'</span><span>Suplementos: '+(n.supplementKnown?amount(n,n.supplements):n.supplementUnknown?'Etiqueta pendiente':'Sin aporte registrado')+'</span></div>'+
  '<p class="ncc-micro-explain">'+(n.difference!==null?'Hasta la referencia: '+amount(n,n.difference)+'. ':n.partial?'No calculamos faltantes con datos incompletos. ':'')+
  (n.reference.value===null?esc(n.reference.note)+' ':'')+
  n.foodKnown+' de '+(n.foodKnown+n.foodUnknown)+' registros de alimentos con composición para este nutriente.</p>'+
  (n.upperLimitExceeded?'<p class="ncc-micro-caution">El aporte conocido supera el límite superior de referencia'+(n.reference.upperScope==='supplements'?' para suplementos':'')+'. Revisá la etiqueta y la pertinencia individual con un profesional.</p>':'')+
  (n.contributors.length?'<details class="ncc-micro-sources"><summary>Alimentos que aportaron</summary><ul>'+n.contributors.map(c=>'<li><span>'+esc(c.name)+'</span><strong>'+amount(n,c.value)+'</strong></li>').join('')+'</ul></details>':'')+
  '<a class="ncc-micro-reference" href="https://ods.od.nih.gov/factsheets/'+encodeURIComponent(n.source)+'-HealthProfessional/" target="_blank" rel="noopener noreferrer">Referencia NIH/ODS ↗</a></article>').join('');
}
export function renderMicronutrients(model,{expanded=false}={}){
 if(!model?.nutrients)return '';
 const partial=model.nutrients.some(n=>n.status!=='estimated'),preview=model.nutrients.slice(0,3);
 const summary='<div class="ncc-micro-mini-grid">'+preview.map(n=>'<div class="ncc-micro-mini" data-micronutrient="'+n.id+'"><span>'+esc(n.name)+'</span><strong>'+
  (n.total===null?'—':(n.partial?'≥ ':'')+amount(n,n.total))+'</strong><small>'+(n.reference.value!==null?'de '+amount(n,n.reference.value):'Referencia pendiente')+'</small>'+bar(n)+
  '<small class="ncc-micro-status">'+(n.status==='unknown'?'Sin datos':n.percent!==null?(n.partial?'≥ ':'')+fmt(n.percent)+'%'+(n.partial?' · parcial':''):'Estimación disponible')+'</small></div>').join('')+'</div>';
 const detail=dailyRows(model);
 return '<section class="ncc-micronutrients" aria-label="Micronutrientes estimados"><header><div><h2>Micronutrientes</h2><p>Vitaminas, minerales y grasas esenciales</p></div><span class="ncc-micro-badge">Estimados</span></header>'+summary+
  '<p class="ncc-micro-coverage">'+(!model.hasEntries?'Todavía no hay consumos registrados.':partial?'Datos parciales: ≥ indica el aporte conocido.':'Según las cantidades que registraste.')+'</p>'+
  (expanded?'<div class="ncc-micro-details">'+detail+'</div>':'<details class="ncc-micro-expand"><summary>Ver detalle y fuentes <span aria-hidden="true">⌄</span></summary><div class="ncc-micro-details">'+detail+'</div></details>')+
  '<div class="ncc-micro-note">'+esc(model.referenceNote)+' Una barra baja de un día no indica que necesites un suplemento.</div></section>';
}
export function renderMicronutrientPeriod(model){
 return '<section class="ncc-micronutrient-period"><h2>Micronutrientes por fecha</h2><p>'+esc(model.from)+' al '+esc(model.to)+' · '+model.daysWithoutRecords+' día(s) sin registros</p>'+
  '<div class="ncc-micro-period-summary">'+model.summary.map(n=>'<article><strong>'+esc(n.name)+'</strong><span>'+amount(n,n.average)+'</span><small>'+n.daysWithComposition+' día(s) con composición completa de lo registrado'+(n.partialDays?' · '+n.partialDays+' parciales excluidos del promedio':'')+'</small></article>').join('')+'</div>'+
  '<p class="ncc-micro-note">Promedios sobre días con datos de composición suficientes para cada nutriente. No representan un diagnóstico ni una recomendación de suplementos.</p>'+
  model.days.map(d=>'<details class="ncc-micro-period-day"><summary>'+esc(d.day.split('-').reverse().join('/'))+' · '+(d.hasEntries?'Ver aportes estimados':'Sin registros')+'</summary>'+renderMicronutrients(d,{expanded:true})+'</details>').join('')+'</section>';
}
