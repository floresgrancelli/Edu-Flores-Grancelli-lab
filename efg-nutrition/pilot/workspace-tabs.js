// Presentation only: keep original fields, listeners and data in the same DOM.
const selections=new Map();
let ownerKey='';
export function mountWorkspaceTabs(root,{key,tab,role}){
 const owner=key.split('|').slice(0,3).join('|');
 if(owner!==ownerKey){selections.clear();ownerKey=owner;}
 function group(host,id,items){
  if(!host||host.querySelector('#'+id))return;
  const available=items.map(([name,label,nodes])=>[name,label,nodes.filter(Boolean)]).filter(x=>x[2].length);
  if(!available.length)return;
  const nav=document.createElement('nav');nav.id=id;nav.className='ncc-workspace-tabs';nav.setAttribute('aria-label',id==='nccGuideSections'?'Secciones de mi guía':id==='nccAdminSections'?'Administración':'Secciones del espacio');
  const anchor=available[0][2][0];anchor.before(nav);
  const panels=available.map(([name,label,nodes])=>{
   const panel=document.createElement('section');panel.id=id+'-'+name;panel.dataset.workspacePanel=id;panel.className='ncc-workspace-panel';
   nav.parentNode.insertBefore(panel,nav.nextSibling);nodes.forEach(node=>panel.append(node));
   const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.workspaceTab=name;button.setAttribute('aria-controls',panel.id);nav.append(button);
   button.addEventListener('click',()=>show(name));return {name,panel,button};
  });
  function show(name){selections.set(key+'|'+id,name);panels.forEach(p=>{p.panel.hidden=p.name!==name;p.button.setAttribute('aria-pressed',String(p.name===name));});}
  const chosen=selections.get(key+'|'+id);show(panels.some(p=>p.name===chosen)?chosen:panels[0].name);
 }
 const main=root.querySelector('.pilot-main');if(!main)return;
 const shared=main.querySelector('.coach-intake-shared');
 if(shared){const data=shared.querySelector('.ncc-intake-data');if(data){group(data,'nccReceivedIntakeSections',[['basic','Datos y objetivo',[...data.querySelectorAll('[data-intake-detail=basic]')]],['food','Comidas y rutina',[...data.querySelectorAll('[data-intake-detail=food]')]]]);}}
 const personal=main.querySelector('.ncc-personal-menu');
 if(personal){
  const cards=[...personal.children], tools=['home','planner','recipes','supplements','sport'];
  const tracking=['weight','summaries','reports','nutritionScience'];
  const take=ids=>cards.filter(n=>ids.includes(n.dataset.tab));
  const sections=[['tools','Herramientas',take(tools)],['tracking','Seguimiento',take(tracking)],['account','Cuenta',cards.filter(n=>!tools.concat(tracking).includes(n.dataset.tab))]];
  for(const item of sections){if(!item[2].length)continue;const grid=document.createElement('div');grid.className='efg-menu-grid';item[2].forEach(n=>grid.append(n));personal.append(grid);item[2]=[grid];}
  const goals=main.querySelector('.ncc-space-goals');if(goals)sections[0][2].push(goals);
  personal.classList.remove('efg-menu-grid');group(personal,'nccPersonalSections',sections);
 }
 if(tab==='supplements'){
  const host=main.querySelector('#supplementsToday');
  if(host){
   const entries=host.querySelector('.supplement-entries,.meal-food-empty'),form=host.querySelector('.pilot-form');
   group(host,'nccSupplementSections',[['register','Registrar',[form]],['today','Consumidos hoy',[entries]]]);
  }
 }
 if(tab==='planner'){
  const host=main.querySelector('#planSuggestionCard');
  if(host&&host.querySelector('.planner-balance-compare')){
   for(const meal of host.querySelectorAll('[data-suggestionpanel]')){
    const rows=[...meal.querySelectorAll(':scope > .planner-item')];
    group(meal,'nccPlannerFood-'+meal.dataset.suggestionpanel,[['protein','Proteína',[rows[0]]],['carbs','Hidratos',[rows[1]]],['extras','Extras',[meal.querySelector(':scope > .ncc-planner-extras')]]]);
   }
   const balance=host.querySelector('.planner-balance-compare'),last=balance.nextElementSibling;
   const nodes=[...host.children].filter(n=>n!==balance&&n!==last&& !n.matches('.eyebrow,h2'));
   group(host,'nccPlannerSections',[['choose','Preparar comida',nodes],['balance','Revisar balance',[balance,last]]]);
   const steps=document.createElement('p');steps.className='ncc-planner-path';steps.textContent='1. Elegí alimentos → 2. Revisá la cantidad → 3. Registrá lo que comiste';host.querySelector('#nccPlannerSections').before(steps);
  }
 }
 const payments=main.querySelector('.ncc-payments-workspace');
 if(payments){
  group(payments,'nccPaymentSections',[...payments.querySelectorAll(':scope > [data-payment-section]')].map(p=>[p.dataset.paymentSection,p.dataset.paymentLabel,[p]]));
  for(const scope of payments.querySelectorAll('[data-payment-section]')){
   const buttons=[...scope.querySelectorAll('[data-payment-filter]')];
   for(const button of buttons)button.addEventListener('click',()=>{
    const filter=button.dataset.paymentFilter;let visible=0;
    for(const card of scope.querySelectorAll('[data-payment-status]')){card.hidden=filter!=='all'&&card.dataset.paymentStatus!==filter;if(!card.hidden)visible++;}
    buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    const empty=scope.querySelector('.ncc-payment-filter-empty');if(empty)empty.hidden=visible>0||filter==='all';
   });
  }
 }
 if(tab==='planner'){
  const host=main.querySelector('.ncc-plan-workspace');
  if(host){
   const id='nccPlanDestinationSections';
   if(host.dataset.noGuide==='true'&&!selections.has(key+'|'+id))selections.set(key+'|'+id,'planning');
   group(host,id,[['guide','Dieta Guía',[host.querySelector(':scope > .ncc-plan,:scope > .ncc-plan-guide-empty')]],['planning','Planificar',[host.querySelector(':scope > .ncc-plan-planning')]]]);
   const nav=host.querySelector('#'+id);if(nav)nav.setAttribute('aria-label','Dieta Guía y planificación');
  }
 }
 if(tab==='planner'&&role==='student'){
  const plan=main.querySelector('.ncc-plan');if(!plan)return;
  const notes=[...plan.querySelectorAll(':scope > .ncc-plan-notes')].map(n=>{const section=document.createElement('section');section.className=n.className;const summary=n.querySelector(':scope > summary');if(summary){const h=document.createElement('h2');h.textContent=summary.textContent;summary.replaceWith(h);}n.replaceWith(section);section.append(...n.childNodes);return section;});
  group(plan,'nccGuideSections',[
   ['meals','Comidas',[plan.querySelector(':scope > h2'),plan.querySelector('.ncc-plan-tabs'),plan.querySelector('.ncc-plan-meal'),plan.querySelector('[data-studentguideregister]')]],
   ['notes','Indicaciones',[notes[0]]],['balance','Mi balance',[notes[1]]]
  ]);
 }
 if(['coach','testCoach'].includes(tab)&&main.querySelector('.ncc-coach-next')){
  group(main,'nccCoachHomeSections',[
   ['pending','Prioridades',[main.querySelector('.ncc-coach-next'),main.querySelector('#nccCoachHomeFollowup')]],
   ['students','Alumnos',[main.querySelector('#nccCoachHomeStudents')]],
   ['tools','Accesos',[main.querySelector('.efg-coach-tiles')]]
  ]);
 }
 if(tab==='adminManage'&&role==='admin'){
  const metrics=main.querySelector('#nccAdminMetrics');
  if(metrics){const d=document.createElement('details');d.className='ncc-workspace-metrics';d.innerHTML='<summary>Resumen de licencias y cupos</summary>';metrics.before(d);d.append(metrics);}
  group(main,'nccAdminSections',[
   ['coaches','Coaches',[main.querySelector('.ncc-workspace-metrics'),main.querySelector('#nccAdminCoaches'),main.querySelector('#nccAdminInvites')]],
   ['new','Altas',[main.querySelector('#nccAdminNew'),main.querySelector('.efg-pilot-coach-activation')]],
   ['payments','Pagos',[main.querySelector('#nccAdminPayments')]],
   ['settings','Configuración',[main.querySelector('#nccAdminAliases'),main.querySelector('#nccAdminPersonal')]]
  ]);
  group(main,'nccAdminCoachSections',[
   ['list','Habilitados',[main.querySelector('#nccAdminCoaches')]],['invitations','Invitaciones',[main.querySelector('#nccAdminInvites')]]
  ]);
  group(main,'nccAdminNewSections',[
   ['commercial','Comercial',[main.querySelector('#nccAdminNew')]],['pilot','Piloto',[main.querySelector('.efg-pilot-coach-activation')]]
  ]);
  main.querySelectorAll('#nccAdminPayments [data-tab=adminManage]').forEach(b=>{b.removeAttribute('data-tab');b.addEventListener('click',()=>main.querySelector('#nccAdminSections [data-workspace-tab=settings]').click());});
  main.querySelectorAll('.pilot-stack,.pilot-two').forEach(n=>{if(!n.children.length)n.remove();});
 }
}
