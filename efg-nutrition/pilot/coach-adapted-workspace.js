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
 return JSON.stringify([s.userId,s.organizationId,s.studentId,s.sessionId||null,s.sourceEpoch||null]);
}
export function createCoachAdaptedWorkspace({enabled=false,readScope,loadInput=null,inputSource=null,persistedSource=null,publicationClient=null}={}){
 let editor=null,input=null,key=null,mount=null,preferences=[],dirtyPreference=false,notice='',request=0,saving=false,reviewed=false,publishAttempt=null;
 const environment=()=>({catalog:input.catalog,goal:input.goal,context:input.context});
 function close(){request++;reviewed=false;publishAttempt=null;persistedSource?.invalidate();saving=false;editor=null;input=null;key=null;mount?.replaceChildren();mount=null;dirtyPreference=false;notice='';}
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
  if(publishAttempt)mount.querySelectorAll('button,input,select').forEach(n=>n.disabled=true);
  const doc=mount.ownerDocument;
  const note=doc.createElement('p');note.className='pilot-notice';note.textContent=publicationClient&&persistedSource?'Ensayo local: permite revisar y publicar este plan sólo en la base temporal de prueba. No afecta la app publicada ni acredita aptitud clínica.':persistedSource?'Prueba con base temporal: guarda un borrador privado, nunca aprueba ni publica. Sin aptitud clínica acreditada.':'Vista de prueba con datos de alumno ficticios. La composición puede provenir de capturas oficiales de prueba; no acredita compatibilidad clínica. No guarda ni publica planes.';mount.prepend(note);
  const label=doc.createElement('label');label.textContent='Preferido para la próxima propuesta';
  const select=doc.createElement('select');select.dataset.adaptedPreference='';
  for(const [id,name] of [['','Sin preferido'],...input.catalog.map(f=>[f.id,f.name])]){
   const option=doc.createElement('option');option.value=id;option.textContent=name;select.append(option);
  }
  select.disabled=!!persistedSource; // Preferences are bound to the persisted intake, not browser edits.
  select.value=preferences[0]||'';select.onchange=()=>api.preferences(select.value?[select.value]:[]);label.append(select);mount.append(label);
  if(notice){const p=doc.createElement('p');p.className='pilot-notice';p.setAttribute('role','status');p.dataset.adaptedNotice='';p.textContent=notice;mount.append(p);}
  const button=(text,action)=>{const b=doc.createElement('button');b.type='button';b.className='btn small light';b.textContent=text;b.onclick=action;mount.append(b);return b;};
  if(persistedSource){
   const saved=doc.createElement('p');saved.dataset.persistedRevision=String(input.row.draft_revision);
   saved.textContent='Revisión persistida '+input.row.draft_revision;mount.append(saved);
   button(saving?'Guardando…':'Guardar borrador privado',()=>api.persist().catch(()=>{})).disabled=!!publishAttempt;
  }
  if(publicationClient&&persistedSource){
   const label=doc.createElement('label'),check=doc.createElement('input');check.type='checkbox';check.dataset.boundReview='';check.checked=reviewed;
   label.append(check,doc.createTextNode(' Revisé la guía y selecciono sus alimentos para este alumno.'));mount.append(label);
   const publish=doc.createElement('button');publish.type='button';publish.className='btn';publish.dataset.boundPublish='';
   publish.textContent=publishAttempt?'Reintentar la misma publicación':'Aprobar y publicar plan';publish.disabled=!reviewed||editor.mode==='editing';
   check.onchange=()=>{reviewed=check.checked;publish.disabled=!reviewed||editor.mode==='editing';};
   publish.onclick=()=>api.publishReviewed().catch(()=>{});mount.append(publish);
  }
  if(saving)mount.querySelectorAll('button,input,select').forEach(n=>n.disabled=true);
  if(dirtyPreference)button('Regenerar y reemplazar este borrador',()=>api.regenerate({replaceConfirmed:true}));
  button('Cerrar vista de prueba',()=>close());
 }
 const api={
  available:()=>enabled&&(typeof persistedSource?.load==='function'||typeof inputSource?.load==='function'||typeof loadInput==='function')&&!!adaptedScopeKey(readScope()),
  async open(node){
   if(!api.available())throw Error('La vista adaptada aún no tiene un origen de datos habilitado.');
   close();const ticket=request,keyBefore=adaptedScopeKey(readScope());
   const next=await (persistedSource?persistedSource.load():inputSource?inputSource.load():loadInput());
   if(ticket!==request||keyBefore!==adaptedScopeKey(readScope()))throw Error('Cambió el alumno o la sesión durante la apertura.');
   if(persistedSource?(next?.persisted!==true||next?.synthetic===true||next?.publishable!==false):next?.synthetic!==true)throw Error('El adaptador real de ficha y evidencia todavía no está habilitado.');
   input=structuredClone(next);preferences=[...(input.preferredIds||[])];key=keyBefore;mount=node;
   const proposal=persistedSource&&input.row.guide?{ok:true,plan:input.row.guide}:proposeAdaptedGuide({...input,preferredIds:preferences});
   if(!proposal.ok){close();throw Error(proposal.message);}
   editor=createGuideEditor(proposal,environment());if(!editor.review.readyForReview){close();throw Error('El borrador persistido necesita revisión.');}draw();
  },
  action(action){current();if(publishAttempt)throw Error('Resolvé la publicación pendiente antes de editar.');reviewed=false;if(saving)throw Error('Guardado en curso.');editor=updateGuideEditor(editor,action,environment());draw();},
  preferences(ids){
   current();if(persistedSource)throw Error('Actualizá las preferencias en la ficha persistida.');if(!Array.isArray(ids)||ids.some(id=>!input.catalog.some(f=>f.id===id)))throw Error('Preferencia desconocida.');
   preferences=[...new Set(ids)];dirtyPreference=true;
   notice='Preferencias actualizadas. Conservamos tus ediciones; regenerá solo si querés reemplazar este borrador.';draw();
  },
  regenerate({replaceConfirmed=false}={}){
   current();if(!replaceConfirmed)throw Error('Confirmá expresamente reemplazar el borrador.');
   const proposal=proposeAdaptedGuide({...input,preferredIds:preferences});
   if(!proposal.ok){notice=proposal.message;draw();return;}
   editor=createGuideEditor(proposal,environment());dirtyPreference=false;notice='Nuevo borrador automático; pendiente de revisión.';draw();
  },
  async publishReviewed(){
   current();if(!publicationClient||!persistedSource||saving||!reviewed||editor.mode==='editing'||!editor.review.readyForReview)throw Error('Revisión explícita requerida.');
   if(!mount.ownerDocument.defaultView.confirm('¿Aprobar y publicar juntos este objetivo y esta guía?'))return;
   const ticket=request,scopeKey=key,studentId=readScope().studentId;
   saving=true;draw();
   try{
    if(!publishAttempt){
     const plan=structuredClone(editor.committed);
     plan.approvedFoodIds=[...new Set(plan.meals.flatMap(m=>m.items.map(i=>i.id)))];
     const saved=await persistedSource.save(plan); // Preserve bound-source RPC; never generic draft save.
     if(ticket!==request||scopeKey!==adaptedScopeKey(readScope()))throw Error('STALE_PUBLICATION_CONTEXT');
     input=structuredClone(saved);editor=createGuideEditor({ok:true,plan:saved.row.guide},environment());
     publishAttempt={studentId,expectedRevision:saved.row.draft_revision,requestId:crypto.randomUUID(),confirmed:true};
    }
    const result=await publicationClient.publish({...publishAttempt});
    current();if(ticket!==request)throw Error('STALE_PUBLICATION_CONTEXT');
    const node=mount;close();const p=node.ownerDocument.createElement('p');p.dataset.boundPublished=result.goalId;
    p.textContent='Plan publicado por el servidor del entorno de prueba.';node.append(p);return result;
   }catch(error){
    if(ticket!==request||scopeKey!==adaptedScopeKey(readScope())){close();throw error;}
    saving=false;notice='No se confirmó la publicación. Conservamos la misma solicitud para consultar o reintentar.';draw();throw error;
   }
  },
  async persist(){
   current();if(publishAttempt)throw Error('Resolvé la publicación pendiente antes de guardar otra revisión.');if(!persistedSource||saving||editor.mode==='editing'||!editor.review.readyForReview)throw Error('Conservá primero una edición válida.');
   const ticket=request,scope=key,plan=structuredClone(editor.committed);
   saving=true;draw();
   try{
    const result=await persistedSource.save(plan);
    if(ticket!==request||scope!==adaptedScopeKey(readScope()))throw Error('STALE_CONTEXT');
    current();input=structuredClone(result);
    editor=createGuideEditor({ok:true,plan:result.row.guide},environment());
    if(!editor.review.readyForReview)throw Error('READBACK_INVALID');
    notice='Borrador guardado; pendiente de aprobación.';saving=false;draw();
    return result;
   }catch(error){
    const oldMount=mount;close();
    if(oldMount?.isConnected){const p=oldMount.ownerDocument.createElement('p');p.setAttribute('role','alert');p.textContent='No se pudo guardar o cambió el permiso. Volvé a cargar el alumno.';oldMount.append(p);}
    throw error;
   }
  },
  close,
  dispose(){close();unsubscribe?.();},
  snapshot:()=>editor?structuredClone({editor,dirtyPreference,preferences}):null
 };
 return api;
}



