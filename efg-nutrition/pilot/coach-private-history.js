// COACH-OPT-05: owner-only historical READS during a voluntary private/review
// Coach relaunch. Never unlock diary writes, plans, medical intake or sharing.
// OFF until the signed Coach pilot entry backend and release gates are approved.
const uuid=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const numeric=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))?new Intl.NumberFormat('es-AR',{maximumFractionDigits:1}).format(Number(x)):null;
const cleanDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}/.test(x)?x.slice(0,10):'Fecha no disponible';
const list=(items,empty)=>items.length?'<ul>'+items.join('')+'</ul>':'<p class="pilot-hint">'+empty+'</p>';

export async function loadCoachPrivateHistory(sb,{profile,userId,entry}={}){
 if(!uuid(userId)||profile?.user_id!==userId||profile?.role!=='student'||
    profile?.active!==true||!uuid(profile?.organization_id)||
    !['private','review'].includes(entry?.route)||entry?.currentLegalAccepted!==true||
    entry?.participationConfirmed!==true||entry?.canLogMeals!==false)
  throw Error('No se pudo verificar el permiso de lectura histórica.');
 if(typeof sb?.from!=='function')throw Error('No se pudo consultar el historial.');
 const own=(table,fields,key='student_id')=>sb.from(table).select(fields).eq(key,userId);
 // Every query is read-only and scoped to the signed owner. RLS is still
 // authoritative. No service role, raw Storage URL, clinical or cross-org data.
 const results=await Promise.all([
  own('efg_daily_logs','student_id,log_day,meals,skipped').order('log_day',{ascending:false}).limit(90),
  own('efg_weights','student_id,measured_on,kg').order('measured_on',{ascending:false}).limit(40),
  own('efg_goals','student_id,id,approved_at,kcal,protein_g,carb_g,fat_g,fiber_g').order('approved_at',{ascending:false}).limit(20),
  own('efg_food_plans','student_id,guided_goal_id,guided_plan,guided_plan_approved_at').maybeSingle(),
  own('efg_weekly_reports','student_id,week_ending,report_text').order('week_ending',{ascending:false}).limit(12),
  own('efg_payments','payer_id,created_at,amount_ars,status,payment_kind','payer_id').order('created_at',{ascending:false}).limit(30)
 ]);
 const labels=['diarios','pesajes','objetivos','guía','informes','pagos'];
 const data=results.map((result,i)=>{
  if(result?.error)throw Error('No se pudo verificar el historial de '+labels[i]+'.');
  const rows=i===3?(result?.data?[result.data]:[]):result?.data;
  if(!Array.isArray(rows))throw Error('Respuesta de historial incompleta.');
  const key=i===5?'payer_id':'student_id';
  if(rows.some(row=>!row||row[key]!==userId))throw Error('Historial no autorizado.');
  return rows;
 });
 return {userId,logs:data[0],weights:data[1],goals:data[2],plan:data[3][0]||null,
  reports:data[4],payments:data[5]};
}

export function renderCoachPrivateHistory(history,{userId}={}){
 if(!uuid(userId)||history?.userId!==userId||
   !['logs','weights','goals','reports','payments'].every(k=>Array.isArray(history[k])))
  throw Error('Historial no verificado para esta sesión.');
 const diary=history.logs.slice(0,30).map(day=>{
  const meals=day.meals&&typeof day.meals==='object'&&!Array.isArray(day.meals)?day.meals:{};
  const rows=Object.entries(meals).filter(([slot,items])=>Array.isArray(items)&&!day.skipped?.[slot])
   .map(([slot,items])=>'<li><strong>'+esc(slot.replace(/_/g,' '))+'</strong>: '+
    (items.length?items.slice(0,30).map(food=>esc(food?.name||'Alimento')+
     (numeric(food?.qty)!==null?' · '+numeric(food.qty)+' '+esc(food?.unit||''):'')).join(', '):'Sin alimentos')+'</li>');
  return '<details class="pilot-record"><summary>'+esc(cleanDate(day.log_day))+'</summary>'+list(rows,'Sin comidas registradas')+'</details>';
 });
 const weights=history.weights.slice(0,20).map(w=>'<li>'+esc(cleanDate(w.measured_on))+
  ' · '+esc(numeric(w.kg)??'—')+' kg</li>');
 const goal=history.goals[0];
 const goalLine=goal?'<p>Objetivo aprobado: '+esc(numeric(goal.kcal)??'—')+' kcal · Proteínas '+
  esc(numeric(goal.protein_g)??'—')+' g · Hidratos '+esc(numeric(goal.carb_g)??'—')+
  ' g · Grasas '+esc(numeric(goal.fat_g)??'—')+' g</p>':
  '<p class="pilot-hint">Todavía no hay objetivos aprobados.</p>';
 const guide=history.plan?.guided_plan;
 const meals=guide&&typeof guide==='object'&&Array.isArray(guide.meals)?guide.meals:[];
 const guideRows=meals.slice(0,5).map(meal=>'<li><strong>'+esc(meal.label||meal.slot||'Comida')+'</strong>: '+
  (Array.isArray(meal.items)?meal.items.slice(0,30).map(f=>esc(f?.name||'Alimento')+
    (numeric(f?.qty)!==null?' · '+numeric(f.qty)+' '+esc(f?.unit||''):'')).join(', '):'Sin detalle')+'</li>');
 const reports=history.reports.map(r=>'<details class="pilot-record"><summary>Semana hasta '+
  esc(cleanDate(r.week_ending))+'</summary><p style="white-space:pre-wrap">'+
  esc(r.report_text||'Sin texto')+'</p></details>');
 const payments=history.payments.map(p=>'<li>'+esc(cleanDate(p.created_at))+' · '+
  esc(numeric(p.amount_ars)??'—')+' ARS · '+esc(p.status||'Sin estado')+'</li>');
 return '<section class="card efg-coach-private-history" aria-label="Mi historial nutricional de solo lectura">'+
  '<span class="eyebrow">MIS DATOS CONSERVADOS</span><h2>Mi historial, sin compartir la ficha</h2>'+
  '<p>Podés consultar tus registros anteriores aunque decidas no compartir la nueva ficha. '+
  'Esta vista es de solo lectura: no agrega comidas, cambia objetivos ni autoriza al coach.</p>'+
  '<div class="pilot-two"><section><h3>Comidas anteriores</h3>'+list(diary,'Todavía no hay diarios anteriores.')+
  '</section><section><h3>Pesajes</h3>'+list(weights,'Todavía no hay pesajes.')+'</section></div>'+
  '<section><h3>Mi objetivo y guía anterior</h3>'+goalLine+
  list(guideRows,'Todavía no hay una guía de cinco comidas aprobada.')+'</section>'+
  '<section><h3>Informes semanales</h3>'+(reports.join('')||'<p class="pilot-hint">Sin informes previos.</p>')+'</section>'+
  '<section><h3>Comprobantes enviados</h3>'+list(payments,'Sin comprobantes previos.')+'</section>'+
  '<p class="pilot-hint">No se muestran diagnósticos ni archivos privados de comprobantes. '+
  'Podés volver a tu ficha para decidir si querés compartirla.</p></section>';
}
