const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>n===null?'—':n.toLocaleString('es-AR',{maximumFractionDigits:d});
const digits=id=>id==='ala'?2:['iron','zinc','b12'].includes(id)?1:0;
const amount=(n,number)=>fmt(number,digits(n.id))+' '+n.unit;
function bar(n){
 const known=Number.isFinite(n.percent),fill=known?Math.max(0,Math.min(100,n.percent)):0;
 const food=known&&n.total>0?fill*n.food/n.total:0,supp=fill-food;
 // A missing personal reference has no numerical scale. Use a distinct tinted
 // pattern rather than inventing a denominator or displaying a false 0%.
 if(!known&&n.reference.value!==null)return '<div class="ncc-micro-track is-no-data" data-scale="reference" role="img" aria-label="'+esc(n.name+': aporte sin datos; referencia diaria '+amount(n,n.reference.value))+'"></div>';
 if(!known)return '<div class="ncc-micro-track is-unscaled'+(n.total>0?' has-contribution':'')+'" data-scale="unscaled" role="img" aria-label="'+esc(n.name+': sin referencia de cobertura; '+(n.total===null?'sin datos de composición':amount(n,n.total)+' conocidos'))+'"></div>';
 return '<div class="ncc-micro-track'+(n.partial?' is-partial':'')+'" data-scale="reference" role="img" aria-label="'+esc(n.name+': '+(n.partial?'al menos ':'')+fmt(n.percent,1)+'% de la referencia')+'">'+
  '<span class="ncc-micro-food" style="width:'+food.toFixed(2)+'%"></span><span class="ncc-micro-supplement" style="width:'+supp.toFixed(2)+'%"></span></div>';
}
function dailyRows(model){
 return model.nutrients.map(n=>'<article class="ncc-micro-detail" data-micro-detail="'+n.id+'"><div class="ncc-micro-detail-head"><h3>'+esc(n.name)+'</h3><span>'+esc(n.status==='unknown'?'Sin estimación':n.partial?'Datos parciales':'Estimado')+'</span></div>'+
  '<p class="ncc-micro-amount">'+(n.total===null?'Sin datos de composición':(n.partial?'≥ ':'')+amount(n,n.total))+
  (n.reference.value!==null?' <small>/ '+amount(n,n.reference.value)+' al día · '+n.reference.kind+'</small>':'')+'</p>'+bar(n)+
  '<div class="ncc-micro-breakdown"><span>Alimentos: '+(n.foodKnown?amount(n,n.food):'Sin estimación')+'</span><span>Suplementos: '+(n.supplementKnown?amount(n,n.supplements):n.supplementUnknown?'Etiqueta pendiente':'Sin aporte registrado')+'</span></div>'+
  '<p class="ncc-micro-explain">'+(n.difference!==null?'Hasta la referencia: '+amount(n,n.difference)+'. ':n.partial?'No calculamos faltantes con datos incompletos. ':'')+
  (n.reference.value===null||model.referenceMode==='general'?esc(n.reference.note)+' ':'')+
  (n.foodPartial?n.foodPartial+' registro(s) con ingredientes sin datos. ':'')+
  n.foodKnown+' de '+(n.foodKnown+n.foodUnknown)+' registros de alimentos con composición para este nutriente.</p>'+
  (n.upperLimitExceeded?'<p class="ncc-micro-caution">El aporte conocido supera el límite superior de referencia'+(n.reference.upperScope==='supplements'?' para suplementos':'')+'. Revisá la etiqueta y la pertinencia individual con un profesional.</p>':'')+
  (n.contributors.length?'<details class="ncc-micro-sources"><summary>Alimentos que aportaron</summary><ul>'+n.contributors.map(c=>'<li><span>'+esc(c.name)+'</span><strong>'+amount(n,c.value)+'</strong></li>').join('')+'</ul>'+n.contributors.filter(c=>c.mappingNote).map(c=>'<details><summary>Estimación de '+esc(c.name)+'</summary><p>'+esc(c.mappingNote)+'</p></details>').join('')+'</details>':'')+
  '<a class="ncc-micro-reference" href="'+esc(n.reference.sourceUrl||'https://ods.od.nih.gov/factsheets/'+encodeURIComponent(n.source)+'-HealthProfessional/')+'" target="_blank" rel="noopener noreferrer">Referencia '+esc(n.reference.sourceLabel||'NIH/ODS')+' ↗</a></article>').join('');
}
export function renderMicronutrients(model,{expanded=false}={}){
 if(!model?.nutrients)return '';
 const order=['magnesium','calcium','iron','zinc','b12','ala','epa_dha'];
 const preview=order.map(id=>model.nutrients.find(n=>n.id===id)).filter(Boolean);
 const summary='<div class="ncc-micro-rows">'+preview.map(n=>'<div class="ncc-micro-row" data-micronutrient="'+n.id+'" title="'+esc(n.name+(n.partial?' · estimación parcial':''))+'"><span class="ncc-micro-label">'+esc(n.id==='ala'?'Omega-3 ALA':n.id==='epa_dha'?'EPA + DHA':n.name)+'</span>'+bar(n)+'<span class="ncc-micro-value">'+
  (n.total===null?'Sin datos':(n.partial?'≥ ':'')+fmt(n.total,digits(n.id)))+(n.reference.value!==null?' / '+fmt(n.reference.value,digits(n.id)):'')+' '+n.unit+'</span><span class="ncc-micro-progress">'+(Number.isFinite(n.percent)?(n.partial?'≥ ':'')+fmt(n.percent,0)+' %'+(n.partial?' · parcial':''):n.total===null?'Aporte sin datos':'Sin referencia')+'</span></div>').join('')+'</div>';
 const detail=dailyRows(model);
 const referenceLabel=model.referenceMode==='general'?'Referencia diaria general':model.nutrients.some(n=>n.reference.value!==null)?'Estimados':'Estimados · sin referencia';
 return '<section class="ncc-micronutrients" aria-label="Micronutrientes estimados"><header><h2>Micronutrientes</h2><span class="ncc-micro-badge">'+referenceLabel+'</span></header>'+summary+
  '<p class="ncc-micro-scale-note">'+(model.referenceMode==='general'?'Orientativo para adultos. ≥: aporte parcial.':'Rayado: sin referencia. ≥: datos parciales.')+'</p>'+
  (expanded?'<div class="ncc-micro-details">'+detail+'</div>':'<details class="ncc-micro-expand"><summary>Detalle y fuentes <span aria-hidden="true">⌄</span></summary><div class="ncc-micro-details">'+detail+'</div></details>')+
  '<div class="ncc-micro-note">≥ indica aporte conocido cuando faltan datos. '+esc(model.referenceNote)+' Una barra baja de un día no indica que necesites un suplemento.</div></section>';
}
export function renderMicronutrientPeriod(model){
 return '<section class="ncc-micronutrient-period"><h2>Micronutrientes por fecha</h2><p>'+esc(model.from)+' al '+esc(model.to)+' · '+model.daysWithoutRecords+' día(s) sin registros</p>'+
  '<div class="ncc-micro-period-summary">'+model.summary.map(n=>'<article><strong>'+esc(n.name)+'</strong><span>'+amount(n,n.average)+'</span><small>'+n.daysWithComposition+' día(s) con composición completa de lo registrado'+(n.partialDays?' · '+n.partialDays+' parciales excluidos del promedio':'')+'</small></article>').join('')+'</div>'+
  '<p class="ncc-micro-note">Promedios sobre días con datos de composición suficientes para cada nutriente. No representan un diagnóstico ni una recomendación de suplementos.</p>'+
  model.days.map(d=>'<details class="ncc-micro-period-day"><summary>'+esc(d.day.split('-').reverse().join('/'))+' · '+(d.hasEntries?'Ver aportes estimados':'Sin registros')+'</summary>'+renderMicronutrients(d,{expanded:true})+'</details>').join('')+'</section>';
}
