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
 if(shared){const data=shared.querySelector('.ncc-intake-data');if(data){group(data,'nccReceivedIntakeSections',[['basic','Datos y objetivo',[...data.querySelectorAll('[data-intake-detail=basic]')]],['food','Comidas y rutina',[...data.querySelectorAll('[data-intake-detail=food]')]]);}}
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
