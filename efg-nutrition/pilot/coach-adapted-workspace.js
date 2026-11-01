// Preview integration only. No import of test fixtures, persistence or publishing.
import {proposeAdaptedGuide} from './adapted-guided-day.js';
import {createGuideEditor,updateGuideEditor} from './adapted-guide-editor.js';
import {renderGuideEditor} from './adapted-guide-view.js';
export const COACH_ADAPTED_GUIDE_PREVIEW_ENABLED=false;
export function adaptedScopeKey(s){
 if(!s||s.role!=='coach'||s.active!==true||!s.userId||s.userId!==s.profileId||
  !s.organizationId||s.ownerId!==s.userId||!s.studentId||s.studentActive!==true||
  s.studentOrganizationId!==s.organizationId||s.consent!==true||
  s.consentStudentId!==s.studentId||s.consentOrganizationId!==s.organizationId)return null;
 return JSON.stringify([s.userId,s.organizationId,s.studentId]);
}
export function createCoachAdaptedWorkspace({enabled=false,readScope,loadInput=null,inputSource=null}={}){
 let editor=null,input=null,key=null,mount=null,preferences=[],dirtyPreference=false,notice='',request=0;
 const environment=()=>({catalog:input.catalog,goal:input.goal,context:input.context});
 function close(){request++;editor=null;input=null;key=null;mount?.replaceChildren();mount=null;dirtyPreference=false;notice='';}
 const unsubscribe=inputSource?.subscribe(()=>close());
 function current(){try{inputSource?.assertCurrent();}catch(error){close();throw error;}if(!enabled||!key||adaptedScopeKey(readScope())!==key){close();throw Error('Cambió el contexto del coach. Volvé a abrir el borrador.');}}
 function draw(){
  current();renderGuideEditor(mount,{state:editor,catalog:input.catalog,onAction:action=>api.action(action)});
  mount.classList.add('card','efg-guide-shell');
  mount.querySelectorAll('button').forEach(b=>b.classList.add('btn','small','light'));
  mount.querySelectorAll('section').forEach(s=>s.classList.add('efg-guide-meal'));
  // The legacy food row is a single flex line; editor controls and conditions need wrapping.
  mount.querySelectorAll('[data-edit-row]').forEach(row=>{
   row.classList.add('efg-guide-food');
   Object.assign(row.style,{display:'grid',gridTemplateColumns:'minmax(0, 1fr)',gap:'8px'});
   row.querySelectorAll('label,select,p,details').forEach(node=>{
    Object.assign(node.style,{minWidth:'0',maxWidth:'100%',whiteSpace:'normal',overflowWrap:'anywhere'});
   });
   row.querySelectorAll('select').forEach(node=>{node.style.width='100%';});
  });
  const doc=mount.ownerDocument;
  const note=doc.createElement('p');note.className='pilot-notice';note.textContent='Vista de prueba con datos de alumno ficticios. La composición puede provenir de capturas oficiales de prueba; no acredita compatibilidad clínica. No guarda ni publica planes.';mount.prepend(note);
  const label=doc.createElement('label');label.textContent='Preferido para la próxima propuesta';
  const select=doc.createElement('select');select.dataset.adaptedPreference='';
  for(const [id,name] of [['','Sin preferido'],...input.catalog.map(f=>[f.id,f.name])]){
   const option=doc.createElement('option');option.value=id;option.textContent=name;select.append(option);
  }
  select.value=preferences[0]||'';select.onchange=()=>api.preferences(select.value?[select.value]:[]);label.append(select);mount.append(label);
  if(notice){const p=doc.createElement('p');p.className='pilot-notice';p.setAttribute('role','status');p.dataset.adaptedNotice='';p.textContent=notice;mount.append(p);}
  const button=(text,action)=>{const b=doc.createElement('button');b.type='button';b.className='btn small light';b.textContent=text;b.onclick=action;mount.append(b);};
  if(dirtyPreference)button('Regenerar y reemplazar este borrador',()=>api.regenerate({replaceConfirmed:true}));
  button('Cerrar vista de prueba',()=>close());
 }
 const api={
  available:()=>enabled&&(typeof inputSource?.load==='function'||typeof loadInput==='function')&&!!adaptedScopeKey(readScope()),
  async open(node){
   if(!api.available())throw Error('La vista adaptada aún no tiene un origen de datos habilitado.');
   close();const ticket=request,keyBefore=adaptedScopeKey(readScope());
   const next=await (inputSource?inputSource.load():loadInput());
   if(ticket!==request||keyBefore!==adaptedScopeKey(readScope()))throw Error('Cambió el alumno o la sesión durante la apertura.');
   if(next?.synthetic!==true)throw Error('El adaptador real de ficha y evidencia todavía no está habilitado.');
   input=structuredClone(next);preferences=[...(input.preferredIds||[])];key=keyBefore;mount=node;
   const proposal=proposeAdaptedGuide({...input,preferredIds:preferences});
   if(!proposal.ok){close();throw Error(proposal.message);}
   editor=createGuideEditor(proposal,environment());draw();
  },
  action(action){current();editor=updateGuideEditor(editor,action,environment());draw();},
  preferences(ids){
   current();if(!Array.isArray(ids)||ids.some(id=>!input.catalog.some(f=>f.id===id)))throw Error('Preferencia desconocida.');
   preferences=[...new Set(ids)];dirtyPreference=true;
   notice='Preferencias actualizadas. Conservamos tus ediciones; regenerá solo si querés reemplazar este borrador.';draw();
  },
  regenerate({replaceConfirmed=false}={}){
   current();if(!replaceConfirmed)throw Error('Confirmá expresamente reemplazar el borrador.');
   const proposal=proposeAdaptedGuide({...input,preferredIds:preferences});
   if(!proposal.ok){notice=proposal.message;draw();return;}
   editor=createGuideEditor(proposal,environment());dirtyPreference=false;notice='Nuevo borrador automático; pendiente de revisión.';draw();
  },
  close,
  dispose(){close();unsubscribe?.();},
  snapshot:()=>editor?structuredClone({editor,dirtyPreference,preferences}):null
 };
 return api;
}


