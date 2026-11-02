// Uses text nodes: fixture/user strings cannot become markup. No persistence.
export function renderAdaptedGuidePreview(root,{proposal,foods=[]}){
 const doc=root.ownerDocument;root.replaceChildren();
 const el=(tag,text)=>{const n=doc.createElement(tag);n.textContent=text;return n;};
 root.append(el('h2','Dieta guía · propuesta para revisar'));
 root.append(el('p','Revisá ingredientes y preparación.'));
 for(const {name,assessment} of foods){
  const row=el('p',`${({green:'●',yellow:'▲',red:'■',neutral:'○'})[assessment.color]} ${name} · ${assessment.reason}`);
  row.dataset.compatibility=assessment.color;
  if(assessment.conditions.length){const details=doc.createElement('details');details.append(el('summary','Condiciones'),el('p',assessment.conditions.join(' ')));root.append(row,details);}
  else root.append(row);
 }
 const status=el('p',proposal.ok?proposal.notice:proposal.message);status.setAttribute('role','status');root.append(status);
 if(!proposal.ok)return;
 if(proposal.totals){
  const t=proposal.totals,g=proposal.goal;
  root.append(el('p',`Total diario: ${t.k.toFixed(1)} kcal · P ${t.p.toFixed(1)} g · C ${t.c.toFixed(1)} g · G ${t.f.toFixed(1)} g · Fibra ${t.fi.toFixed(1)} g`));
  if(g)root.append(el('p',`Metas: ${g.kcal} kcal · P ${g.protein_g} g · C ${g.carb_g} g · G ${g.fat_g} g · Fibra ${g.fiber_g} g`));
 }
 for(const meal of proposal.plan.meals){const section=doc.createElement('section');section.append(el('h3',meal.label));
  for(const item of meal.items)section.append(el('p',`${item.name}: ${item.qty} ${item.unit}`));root.append(section);}
 root.append(el('p','La aprobación se realiza en el circuito del coach; esta vista no publica el plan.'));
}
export function renderGuideEditor(root,{state,catalog,onAction}){
 const review=state.review;
 renderAdaptedGuidePreview(root,{proposal:review.readyForReview?{
  ok:true,notice:'Borrador pendiente de aprobación del coach.',plan:review.normalizedPlan
 }:{ok:false,message:review.issues.map(x=>x.message).join(' ')}});
 const doc=root.ownerDocument;
 const add=(tag,text,parent=root)=>{const n=doc.createElement(tag);n.textContent=text;parent.append(n);return n;};
 add('p',state.origin==='edited_draft'?'Borrador editado':'Borrador automático').dataset.draftOrigin=state.origin;
 const totals=review.totals;
 add('p',totals?`Total: ${totals.k.toFixed(1)} kcal · P ${totals.p.toFixed(1)} g · C ${totals.c.toFixed(1)} g · G ${totals.f.toFixed(1)} g · Fibra ${totals.fi.toFixed(1)} g`:
  'Total no disponible: corregí cantidad, unidad o fuente.').dataset.guideTotals='';
 if(review.targets){
  const names={k:'kcal',p:'P',c:'C',f:'G',fi:'Fibra'};
  for(const key of Object.keys(names)){
   const target=review.targets[key],actual=totals?.[key];
   add('p',`${names[key]}: meta ${target??'sin definir'}${Number.isFinite(actual)&&Number.isFinite(target)?` · diferencia ${(actual-target).toFixed(1)}`:''}`);
  }
 }
 for(const meal of review.perMeal||[]){const t=meal.totals;
  add('p',`${meal.label}: ${t.k.toFixed(1)} kcal · P ${t.p.toFixed(1)} g · C ${t.c.toFixed(1)} g · G ${t.f.toFixed(1)} g · Fibra ${t.fi.toFixed(1)} g`);}
 add('p','Las metas y el presupuesto de hidratos se comprueban por día; no hay una asignación obligatoria por comida.');
 if(state.message)add('p',state.message);
 if(state.mode!=='editing')for(const decision of review.decisions){
  if(!decision.conditions.length)continue;
  const details=add('details','');
  add('summary',(catalog.find(f=>f.id===decision.id)?.name||decision.id)+' · condiciones',details);
  add('p',decision.conditions.join(' '),details);
 }
 const button=(text,type)=>{const b=add('button',text);b.type='button';b.onclick=()=>onAction({type});return b;};
 if(state.mode!=='editing')button('Editar borrador','begin');
 else{
  for(const meal of state.working.meals)for(let index=0;index<meal.items.length;index++){
   const item=meal.items[index],row=add('div','');row.dataset.editRow=meal.slot+':'+index;
   const label=add('label',meal.label+' · ingrediente '+(index+1),row);
   const select=doc.createElement('select');select.setAttribute('aria-label',meal.label+' ingrediente '+(index+1));
   for(const food of catalog){const option=doc.createElement('option');option.value=food.id;option.textContent=food.name;select.append(option);}
   select.value=item.id;label.append(select);
   const input=doc.createElement('input');input.type='number';input.step='any';input.value=Number.isFinite(item.qty)?String(item.qty):'';
   input.setAttribute('aria-label',meal.label+' cantidad '+(index+1));row.append(input);
   add('span',' '+item.unit,row);
   const send=(id,qty,unit)=>onAction({type:'replace',slot:meal.slot,index,id,qty,unit});
   input.onchange=()=>send(item.id,input.value===''?null:Number(input.value),item.unit);
   // New unit is explicit from the new source; no hidden g↔ml conversion.
   select.onchange=()=>{const f=catalog.find(x=>x.id===select.value);send(f.id,item.qty,f.unit);};
   const decision=review.decisions.find(d=>d.slot===meal.slot&&d.index===index);
   if(decision){const msg=add('p',decision.reason,row);msg.dataset.compatibility=decision.color;
    if(decision.conditions.length){const details=add('details','',row);add('summary','Condiciones',details);add('p',decision.conditions.join(' '),details);}}
  }
  button('Conservar borrador editado','save');button('Cancelar edición','cancel');
 }
 button('Restaurar borrador automático','restore');
 add('p','Ninguna edición aprueba ni envía el plan.');
}
