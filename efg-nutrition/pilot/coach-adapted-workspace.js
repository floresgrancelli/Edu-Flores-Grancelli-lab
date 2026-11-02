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
export function createCoachAdaptedWorkspace({enabled=false,readScope,loadInput=null,inputSource=null,persistedSource=null,publicationClient=null,serverCompatibility=null}={}){
 let editor=null,input=null,key=null,mount=null,preferences=[],dirtyPreference=false,notice='',request=0,saving=false,reviewed=false,publishAttempt=null;
 let assessmentRequest=0;
 const displayedReview=()=>serverCompatibility?serverCompatibility.review(editor.review,editor.working):editor.review;
 async function assessCurrent({saved=false}={}){
  if(!serverCompatibility)return;
  const ticket=++assessmentRequest,opening=request,scope=key;
  reviewed=false;
  try{
   await (saved?serverCompatibility.refreshSaved(editor.working):serverCompatibility.assessEdit(editor.working));
   if(ticket!==assessmentRequest||opening!==request||scope!==adaptedScopeKey(readScope()))return;
   current();
   if(!serverCompatibility.matchesInput(input.row))throw Error('SOURCE_REVISION_CHANGED');
   notice='Decisión del servidor recibida; revisá motivos y condiciones.';
  }catch{
   if(ticket!==assessmentRequest||opening!==request||scope!==adaptedScopeKey(readScope()))return;
   serverCompatibility.invalidate();
   notice='Compatibilidad pendiente. Volvé a abrir el borrador para cargar el contexto vigente.';
  }
  draw();
 }
 const environment=()=>({catalog:input.catalog,goal:input.goal,context:input.context});
 function close(){stopWake?.();stopWake=null;request++;assessmentRequest++;serverCompatibility?.invalidate();reviewed=false;publishAttempt=null;persistedSource?.invalidate();saving=false;editor=null;input=null;key=null;mount?.replaceChildren();mount=null;dirtyPreference=false;notice='';}
 const unsubscribe=inputSource?.subscribe(()=>close());
 const unsubscribeCompatibility=serverCompatibility?.subscribe(()=>{if(editor&&mount&&key){reviewed=false;try{draw();}catch{close();}}});
 let stopWake=null;
 function watchWake(doc){stopWake?.();if(!serverCompatibility)return;const wake=()=>{serverCompatibility.checkFreshness();if(editor&&mount){try{draw();}catch{close();}}};doc.addEventListener('visibilitychange',wake);doc.defaultView?.addEventListener('pageshow',wake);doc.defaultView?.addEventListener('focus',wake);stopWake=()=>{doc.removeEventListener('visibilitychange',wake);doc.defaultView?.removeEventListener('pageshow',wake);doc.defaultView?.removeEventListener('focus',wake);};}
 function current(){try{inputSource?.assertCurrent();}catch(error){close();throw error;}if(!enabled||!key||adaptedScopeKey(readScope())!==key){close();throw Error('Cambió el contexto del coach. Volvé a abrir el borrador.');}}
 function draw(){
  current();const visibleReview=displayedReview();renderGuideEditor(mount,{state:{...editor,review:visibleReview},catalog:input.catalog,onAction:action=>api.action(action)});
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
  const note=doc.createElement('p');note.className='pilot-notice';note.textContent=serverCompatibility?'Conexión clínica privada preparada, sin activar. Revisión informativa; publicación aún bloqueada.':publicationClient&&persistedSource?'Ensayo local: permite revisar y publicar este plan sólo en la base temporal de prueba. No afecta la app publicada ni acredita aptitud clínica.':persistedSource?'Prueba con base temporal: guarda un borrador privado, nunca aprueba ni publica. Sin aptitud clínica acreditada.':'Vista de prueba con datos de alumno ficticios. La composición puede provenir de capturas oficiales de prueba; no acredita compatibilidad clínica. No guarda ni publica planes.';mount.prepend(note);
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
   button(saving?'Guardando…':'Guardar borrador privado',()=>api.persist().catch(()=>{})).disabled=!!publishAttempt||(!!serverCompatibility&&!visibleReview.readyForReview);
  }
  if(publicationClient&&persistedSource&&!serverCompatibility){
   const label=doc.createElement('label'),check=doc.createElement('input');check.type='checkbox';check.dataset.boundReview='';check.checked=reviewed;
   label.append(check,doc.createTextNode(' Revisé la guía y selecciono sus alimentos para este alumno.'));mount.append(label);
   const publish=doc.createElement('button');publish.type='button';publish.className='btn';publish.dataset.boundPublish='';
   publish.textContent=publishAttempt?'Reintentar la misma publicación':'Aprobar y publicar plan';publish.disabled=!reviewed||editor.mode==='editing';
   check.onchange=()=>{reviewed=check.checked;publish.disabled=!reviewed||editor.mode==='editing';};
   publish.onclick=()=>api.publishReviewed().catch(()=>{});mount.append(publish);
  }
  if(serverCompatibility){
   const status=doc.createElement('p');status.dataset.serverCompatibility='';
   status.textContent=serverCompatibility.status()==='available'?'Decisión del servidor para esta receta y revisión. Las opciones sin evaluar siguen pendientes. Publicación clínica sin conectar.':'Compatibilidad pendiente de respuesta vigente del servidor. Publicación clínica sin conectar.';mount.append(status);
   if(editor.mode!=='editing')for(const decision of visibleReview.decisions){
    const line=doc.createElement('p');line.dataset.compatibility=decision.color;
    line.textContent=(input.catalog.find(f=>f.id===decision.id)?.name||decision.id)+' · '+decision.reason;
    if(decision.conditions?.length){const details=doc.createElement('details'),summary=doc.createElement('summary'),body=doc.createElement('p');summary.textContent='Condiciones';body.textContent=decision.conditions.join(' ');details.append(summary,body);line.append(details);}mount.append(line);
   }
   button('Volver a verificar con el servidor',()=>{void assessCurrent();});
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
   input=structuredClone(next);preferences=[...(input.preferredIds||[])];key=keyBefore;mount=node;watchWake(node.ownerDocument);
   if(serverCompatibility&&(!persistedSource||!input.row?.guide)){close();throw Error('La propuesta clínica requiere generación autorizada del servidor; aún sin conectar.');}
   const proposal=persistedSource&&input.row.guide?{ok:true,plan:input.row.guide}:proposeAdaptedGuide({...input,preferredIds:preferences});
   if(!proposal.ok){close();throw Error(proposal.message);}
   editor=createGuideEditor(proposal,environment());if(!serverCompatibility&&!editor.review.readyForReview){close();throw Error('El borrador persistido necesita revisión.');}draw();if(serverCompatibility)await assessCurrent({saved:true});
  },
  action(action){current();if(publishAttempt)throw Error('Resolvé la publicación pendiente antes de editar.');reviewed=false;if(saving)throw Error('Guardado en curso.');editor=serverCompatibility&&action.type==='save'?serverCompatibility.commitEdit(updateGuideEditor(editor,{type:'refresh'},environment())):updateGuideEditor(editor,action,environment());if(serverCompatibility){void assessCurrent();}draw();},
  preferences(ids){
   current();if(persistedSource)throw Error('Actualizá las preferencias en la ficha persistida.');if(!Array.isArray(ids)||ids.some(id=>!input.catalog.some(f=>f.id===id)))throw Error('Preferencia desconocida.');
   preferences=[...new Set(ids)];dirtyPreference=true;
   notice='Preferencias actualizadas. Conservamos tus ediciones; regenerá solo si querés reemplazar este borrador.';draw();
  },
  regenerate({replaceConfirmed=false}={}){
   current();if(serverCompatibility)throw Error('La regeneración clínica autorizada aún no está conectada.');if(!replaceConfirmed)throw Error('Confirmá expresamente reemplazar el borrador.');
   const proposal=proposeAdaptedGuide({...input,preferredIds:preferences});
   if(!proposal.ok){notice=proposal.message;draw();return;}
   editor=createGuideEditor(proposal,environment());dirtyPreference=false;notice='Nuevo borrador automático; pendiente de revisión.';draw();
  },
  async publishReviewed(){
   current();if(serverCompatibility)throw Error('La publicación clínica requiere conexión servidor revisada; permanece bloqueada.');if(!publicationClient||!persistedSource||saving||!reviewed||editor.mode==='editing'||!editor.review.readyForReview)throw Error('Revisión explícita requerida.');
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
   current();if(publishAttempt)throw Error('Resolvé la publicación pendiente antes de guardar otra revisión.');if(!persistedSource||saving||editor.mode==='editing'||!displayedReview().readyForReview)throw Error('Conservá primero una edición válida.');
   const ticket=request,scope=key,plan=structuredClone(editor.committed);
   saving=true;draw();
   try{
    const result=await persistedSource.save(plan);
    if(ticket!==request||scope!==adaptedScopeKey(readScope()))throw Error('STALE_CONTEXT');
    current();input=structuredClone(result);
    editor=createGuideEditor({ok:true,plan:result.row.guide},environment());
    if(serverCompatibility){serverCompatibility.invalidate();await assessCurrent({saved:true});current();if(ticket!==request||scope!==adaptedScopeKey(readScope()))throw Error('STALE_CONTEXT');}
    if(!displayedReview().readyForReview)throw Error('READBACK_INVALID');
    notice='Borrador guardado; pendiente de aprobación.';saving=false;draw();
    return result;
   }catch(error){
    const oldMount=mount;close();
    if(oldMount?.isConnected){const p=oldMount.ownerDocument.createElement('p');p.setAttribute('role','alert');p.textContent='No se pudo guardar o cambió el permiso. Volvé a cargar el alumno.';oldMount.append(p);}
    throw error;
   }
  },
  close,
  dispose(){close();unsubscribe?.();unsubscribeCompatibility?.();},
  snapshot:()=>editor?structuredClone({editor,dirtyPreference,preferences}):null
 };
 return api;
}



