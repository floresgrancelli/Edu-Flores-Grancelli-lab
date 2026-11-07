import {createProfessionalCoachTools,PROFESSIONAL_COACH_TOOLS_ENABLED} from './professional-coach-tools.mjs?v=ncc-dual-role-release-r4-20261107';
import {guidedCountablePortion} from './guided-countable-portions.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
import {guideTotals} from './guided-day.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
import {COACH_GUIDE_WINDOWS} from './coach-guide-schedule.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
import {createWeeklyPdfReview} from './weekly-pdf-review.js?v=ncc-report-share-return-r12-20261106';
import {buildPeriodReportPdf} from './period-report-pdf.js?v=ncc-report-share-return-r12-20261106';
import {parseLuxuryPeriodReport,renderLuxuryPeriodReport} from './coach-report-models.js?v=ncc-report-share-return-r12-20261106';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function mountProfessionalCoachTools({root,reader,studentId,studentName,coachName,enabled=PROFESSIONAL_COACH_TOOLS_ENABLED,...options}={}){
 if(enabled!==true)return Object.freeze({ready:Promise.resolve({disabled:true}),dispose(){},assertCanLeave(){}});
 const doc=root.ownerDocument,tools=createProfessionalCoachTools({reader,enabled:true,...options});let disposed=false,busy=false,notice='',activeView=null;const receiptLinks=new Map();
 const viewer=createWeeklyPdfReview({root:doc.body,mode:'period',buildPdf:buildPeriodReportPdf});
 const node=(tag,text='')=>{const e=doc.createElement(tag);e.textContent=text;return e;};
 const messages={UNSAVED_COACH_PLAN:'Guardá o descartá el borrador local antes de cambiar de alumno o espacio.',SHARED_INTAKE_REQUIRED:'El alumno aún no compartió una ficha general vigente.',INTAKE_CHANGED:'La ficha cambió. Volvé a consultar antes de preparar el plan.',FOOD_REVIEW_REQUIRED:'Revisá la compatibilidad del alimento y confirmá la revisión para sustituirlo.',COACH_OPERATION_PENDING:'Hay una operación pendiente. Consultá su recibo; no se vuelve a enviar automáticamente.',PLAN_REVIEW_REQUIRED:'Revisá el objetivo y la Dieta Guía antes de guardar o publicar.',STALE_COACH_TOOLS:'Cambió el espacio o la sesión. Se descartó la respuesta anterior.'};
 async function run(action){if(disposed||busy)return;busy=true;for(const e of root.querySelectorAll('button,input,select,textarea'))e.disabled=true;
  try{await action();notice='Operación confirmada.';}catch(e){notice=e.outcome==='uncertain'?'Resultado incierto. Conservamos la operación pendiente y no se reenviará automáticamente.':messages[e.code]||'No se pudo completar la operación. Revisá los datos y volvé a consultar.';}
  finally{busy=false;if(!disposed)render();}
 }
 const button=(parent,label,action,disabled=false)=>{const e=node('button',label);e.type='button';e.className='btn light';e.disabled=busy||disabled;e.addEventListener('click',()=>run(action));parent.append(e);return e;};
 function field(parent,label,type,value){const wrap=node('label',label),e=node('input');e.type=type;e.value=value??'';e.setAttribute('aria-label',label);e.disabled=busy;wrap.append(e);parent.append(wrap);return e;}
 function select(parent,label,choices,value){const wrap=node('label',label),e=node('select');e.setAttribute('aria-label',label);e.disabled=busy;for(const [id,title]of choices){const o=node('option',title);o.value=id;o.selected=String(id)===String(value??'');e.append(o);}wrap.append(e);parent.append(wrap);return e;}
 const section=(title)=>{const s=node('section');s.className='card';s.append(node('h3',title));root.append(s);return s;};
 function clearViewer(){viewer.close(true);activeView=null;}
 async function reviewPdf(model,serialized=null,editable=false,opener){clearViewer();await reader.studentClient(studentId);if(disposed)return;
  const origin=tools.snapshot().scope;const current=()=>{try{return !disposed&&root.isConnected&&JSON.stringify(tools.snapshot().scope)===JSON.stringify(origin);}catch{return false;}};
  const view=viewer.open({snapshot:model,...(serialized?{serialized}:{}),isCurrent:current,isOriginCurrent:current,editable,opener,onClose:()=>{activeView=null;},
   onSend:async()=>{viewer.requireReviewed(serialized);viewer.setSubmitting(view,true);try{await tools.shareReport(serialized,{reviewed:true});viewer.complete(view,()=>{render();return root.querySelector('button');});notice='Informe compartido con el alumno.';}catch(e){viewer.setSubmitting(view,false);throw e;}}});activeView=view;await view.prepared;
 }
 function render(){if(disposed)return;let state;try{state=tools.snapshot();}catch{clearViewer();root.replaceChildren();return;}root.replaceChildren();root.setAttribute('data-ncc-coach-tools','');
  const status=node('p',notice);status.setAttribute('role','status');root.append(status);
  if(state.status!=='ready'){button(root,'Consultar ficha del alumno',()=>tools.open(studentId,{studentName,coachName}));return;}
  const intake=section('Ficha de '+studentName),i=state.intake;
  if(i){for(const [label,key]of [['Objetivo','objective'],['Edad','age_years'],['Altura (cm)','height_cm'],['Peso (kg)','weight_kg'],['Actividad','activity_level'],['Patrón alimentario','dietary_pattern'],['Preferencias','preferred_foods'],['Alimentos que prefiere evitar','disliked_foods'],['Horarios','meal_routine']])intake.append(node('p',label+': '+(i[key]??'Sin dato')));}
  else intake.append(node('p','La ficha general todavía no está compartida.'));
  intake.append(node('p','Compartir restricciones de salud es independiente. Un dato no compartido no significa ausencia de restricciones.'));
  const calc=section('Calculadora de objetivos');let initial={};try{initial=tools.prefill().fields;}catch{}
  const sex=select(calc,'Parámetro de la ecuación',[['','Elegir explícitamente'],['male','Hombre'],['female','Mujer']],''),objective=select(calc,'Objetivo de la propuesta',[['fat_loss','Reducir grasa'],['recomp','Recomposición'],['muscle_gain','Aumentar masa muscular']],initial.targetGoal);
  const age=field(calc,'Edad para calcular','number',initial.targetAge),height=field(calc,'Altura para calcular (cm)','number',initial.targetHeight),weight=field(calc,'Peso para calcular (kg)','number',initial.targetWeight),activity=select(calc,'Actividad para calcular',[['1.2','Baja (1,20)'],['1.35','Ligera (1,35)'],['1.5','Moderada (1,50)']],initial.targetActivity);
  button(calc,'Calcular propuesta',()=>tools.calculate({age:Number(age.value),height:Number(height.value),weight:Number(weight.value),activity:Number(activity.value),sex:sex.value,goal:objective.value}),!i);
  if(state.goal){const targets=section('Objetivos para revisar');const g=state.goal,inputs=Object.fromEntries([['kcal','Energía (kcal)'],['protein_g','Proteínas (g)'],['carb_g','Hidratos (g)'],['fat_g','Grasas (g)'],['fiber_g','Fibra (g)']].map(([key,label])=>[key,field(targets,label,'number',g[key])]));
   button(targets,'Aplicar estos objetivos',()=>tools.setGoal({goal_type:g.goal_type,...Object.fromEntries(Object.entries(inputs).map(([k,e])=>[k,Number(e.value)]))}));
   const window=select(targets,'Organización de horarios',COACH_GUIDE_WINDOWS,state.guide?.windowId||i?.eating_window||'regular');button(targets,'Generar Dieta Guía de seis horarios',()=>tools.generate({windowId:window.value}));
  }
  if(state.guide){const guide=section('Dieta Guía para revisar'),t=guideTotals(state.guide).totals;guide.append(node('p',`${Math.round(t.k)} kcal · P ${Math.round(t.p)} g · HC ${Math.round(t.c)} g · G ${Math.round(t.f)} g`));
   for(const note of state.guide.profileReviewNotes||[])guide.append(node('p',note));
   for(const meal of state.guide.meals){const row=node('section');row.append(node('h4',meal.label));
    button(row,'Quitar horario '+meal.label,()=>tools.edit({kind:'removeMeal',slot:meal.slot}),state.guide.meals.length<=2);
    meal.items.forEach((item,index)=>{const rule=guidedCountablePortion(item.id),qty=field(row,item.name+(rule?' · unidades':' · '+item.unit),'number',rule?item.qty/rule.grams:item.qty);qty.step=rule?'1':'0.1';
     button(row,'Recalcular '+item.name,()=>tools.edit({kind:'quantity',slot:meal.slot,index,qty:Number(qty.value)*(rule?.grams||1)}));
     if(state.catalog.length){const alt=select(row,'Sustituir '+item.name,state.catalog.map(f=>[f.id,f.name]),item.id),label=node('label','Revisé la compatibilidad del sustituto'),check=node('input');check.type='checkbox';label.prepend(check);row.append(label);button(row,'Sustituir alimento '+item.name,()=>tools.edit({kind:'replace',slot:meal.slot,index,foodId:alt.value,reviewed:check.checked===true}));}
    });guide.append(row);
   }
   const reviewLabel=node('label','Revisé cantidades, alimentos y objetivos de este borrador'),review=node('input');review.type='checkbox';reviewLabel.prepend(review);guide.append(reviewLabel);
   button(guide,'Guardar borrador revisado',()=>tools.save({reviewed:review.checked===true}),!state.dirty||state.pending.some(p=>p.operation==='savePlan'));
   const publishLabel=node('label','Apruebo enviar este objetivo y esta guía al alumno'),confirm=node('input');confirm.type='checkbox';publishLabel.prepend(confirm);guide.append(publishLabel);
   button(guide,'Publicar objetivo y Dieta Guía',()=>tools.publish({confirmed:confirm.checked===true}),state.dirty||state.draft?.status!=='draft'||state.pending.some(p=>p.operation==='publishPlan'));
  }
  if(state.pending.some(p=>p.operation==='publishPlan'))button(root,'Verificar publicación pendiente',()=>tools.reconcilePublication());
  const reports=section('Informe Luxury Pro por fechas'),end=today(),start=new Date(end+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-6);
  const from=field(reports,'Informe desde','date',state.report?.from||start.toISOString().slice(0,10)),to=field(reports,'Informe hasta','date',state.report?.to||end);button(reports,'Generar informe Luxury Pro',()=>tools.report({from:from.value,to:to.value,today:today()}));
  if(state.report){const conclusion=node('textarea');conclusion.value=state.report.conclusion;conclusion.maxLength=2200;conclusion.setAttribute('aria-label','Devolución del coach');reports.append(conclusion);const flexible=node('textarea');flexible.value=state.report.flexibleNote;flexible.maxLength=750;flexible.setAttribute('aria-label','Espacio para disfrutar');reports.append(flexible);
   const pdf=button(reports,'Revisar PDF y compartir',()=>{const reviewed=tools.reviewedReport({conclusion:conclusion.value,flexibleNote:flexible.value});return reviewPdf(reviewed.model,reviewed.text,true,pdf);},!state.report.daysRecorded||state.pending.some(p=>p.operation==='sendReport'));
   const preview=node('details');preview.append(node('summary','Versión accesible del informe'));const html=node('div');html.innerHTML=renderLuxuryPeriodReport(state.report);preview.append(html);reports.append(preview);
  }
  if(state.pending.some(p=>p.operation==='sendReport'))button(reports,'Verificar informe pendiente',()=>tools.reconcileReport());
  for(const record of state.reports){const model=parseLuxuryPeriodReport(record.report_text);if(model){const b=button(reports,'Abrir informe '+record.period_from+' a '+record.period_to,()=>reviewPdf(model,null,false,b));}}
  const payments=section('Pagos del alumno');for(const p of state.payments){payments.append(node('p',`${p.amount_ars} ARS · ${p.period_label} · ${p.status}`));
   button(payments,'Ver comprobante '+p.period_label,async()=>{const url=await tools.receiptUrl(p.id);if(disposed)return;receiptLinks.set(p.id,{url,expires:Date.now()+60000});});
   const signed=receiptLinks.get(p.id);if(signed&&signed.expires>Date.now()){const a=node('a','Abrir comprobante verificado (60 segundos)');a.href=signed.url;a.target='_blank';a.rel='noopener noreferrer';payments.append(a);}
   if(p.status==='pending')for(const [status,label]of [['approved','Aprobar'],['rejected','Rechazar']])button(payments,label+' pago '+p.period_label,()=>tools.confirmPayment(p.id,status),state.pending.some(x=>x.operation==='reviewPayment'));
  }
  if(!state.payments.length)payments.append(node('p','Sin comprobantes para este alumno.'));
  button(root,'Descartar cambios locales y volver a consultar',()=>{clearViewer();return tools.open(studentId,{studentName,coachName});});
  for(const p of state.pending)if(['savePlan','reviewPayment'].includes(p.operation))root.append(node('p','Hay una operación '+(p.operation==='savePlan'?'de borrador':'de pago')+' pendiente de revisión. Leer el valor actual no confirma su autoría; no se reenviará.'));
 }
 const ready=run(()=>tools.open(studentId,{studentName,coachName})).then(()=>({disabled:false}));
 return Object.freeze({ready,tools,assertCanLeave:()=>tools.assertCanLeave(),dispose(){if(disposed)return;disposed=true;receiptLinks.clear();clearViewer();tools.dispose();root.replaceChildren();}});
}
