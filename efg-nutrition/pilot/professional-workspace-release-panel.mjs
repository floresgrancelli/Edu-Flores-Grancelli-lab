import {mountProfessionalCoachTools} from './professional-coach-tools-panel.mjs?v=ncc-achuras-r1-20261113';
import {createProfessionalReleaseAdapter,PROFESSIONAL_RELEASE_ENABLED} from './professional-release-adapter.mjs?v=ncc-dual-role-release-r5-20261107';
import {createProfessionalWorkspaceReleaseClient} from './professional-workspace-release-client.mjs?v=ncc-dual-role-release-r5-20261107';
import {createProfessionalTermsSdkTransport} from './professional-terms-sdk-transport.mjs?v=ncc-dual-role-release-r5-20261107';
import {createProfessionalTermsReleaseFlow} from './professional-terms-release-flow.mjs?v=ncc-dual-role-release-r5-20261107';
import {mountProfessionalTermsReleasePanel} from './professional-terms-release-panel.mjs?v=ncc-dual-role-release-r5-20261107';
// An owned professional capability remains independent of the original student's profile.
export function mountProfessionalWorkspaceReleasePanel({root,sdk,config,enabled=PROFESSIONAL_RELEASE_ENABLED,
 readLegacyPersonal,hasUnsavedDraft=()=>false,adminLocation=false,onView=()=>{},crypto=globalThis.crypto}={}){
 if(enabled!==true)return Object.freeze({ready:Promise.resolve({disabled:true}),dispose(){},assertCanLeave(){}});
 const doc=root.ownerDocument,reader=createProfessionalReleaseAdapter({sdk,config,enabled:true}),
 client=createProfessionalWorkspaceReleaseClient({sdk,config,enabled:true}),terms=createProfessionalTermsSdkTransport({sdk,config,enabled:true});
 let aliasPending=false,adminArea=null,adminHeading=null,statusNode=null;
 let inAdministration=adminLocation===true;
 // This is a presentation boundary only; server authorization remains unchanged.
 function applyLocation(){
  const showAdmin=inAdministration&&snapshot?.profile.role==='admin'&&!selected;
  if(adminArea){if(showAdmin&&!adminArea.parentNode)root.append(adminArea);else if(!showAdmin)adminArea.remove();}
  if(adminHeading)adminHeading.hidden=!showAdmin;
  root.hidden=!!snapshot&&!selected&&!snapshot.contexts.coach_contexts.length&&!showAdmin;
  root.setAttribute('data-ncc-workspace-mode',selected?'professional':showAdmin?'admin':'chooser');
  if(statusNode)statusNode.hidden=!notice||(!selected&&!showAdmin&&notice==='Consulta confirmada.');
 }
 function setAdminLocation(value){inAdministration=value===true;applyLocation();}
 const disclosure=(parent,label)=>{const details=node('details'),summary=node('summary',label);details.append(summary);parent.append(details);return details;};
 let readerOrganization=null,toolsPanel=null,toolsMount=null,toolsStudent=null;
 const disposeTools=()=>{toolsPanel?.dispose();toolsPanel=null;toolsMount=null;toolsStudent=null;};
 let snapshot=null,selected=null,workspace=null,studentId=null,messages=[],pending=[],termsPanel=null,busy=false,disposed=false,epoch=0,notice='',messageDraft='';
 const node=(tag,text='')=>{const e=doc.createElement(tag);e.textContent=text;return e;};
 const stop=e=>e.stopPropagation();for(const type of ['click','input','change','submit'])root.addEventListener(type,stop);
 function personalMatches(next){const old=readLegacyPersonal?.();if(!old?.profile||old.profile.user_id!==next.profile.user_id||old.profile.role!==next.profile.role||
  old.profile.role==='student'&&(old.profile.organization_id!==next.profile.organization_id||old.organization!=null&&old.organization.id!==next.profile.organization_id))throw Error('PERSONAL_CONTEXT_MISMATCH');}
 function check(t){if(disposed||t!==epoch)throw Error('STALE_CONTEXT');}
 function assertCanLeave(){toolsPanel?.assertCanLeave();if(messageDraft.trim())throw Error('Guardá o cancelá tu mensaje antes de cambiar de espacio.');}
 const button=(parent,text,action,disabled=false)=>{const e=node('button',text);e.type='button';e.disabled=busy||disabled;e.addEventListener('click',()=>run(action));parent.append(e);return e;};
 function input(parent,label,type='text',value=''){const wrap=node('label',label),e=node('input');e.type=type;e.value=value;e.required=true;e.setAttribute('aria-label',label);e.disabled=busy;wrap.append(e);parent.append(wrap);return e;}
 function form(parent,fields,text,submit){const f=node('form'),controls=fields.map(([label,type,value])=>input(f,label,type,value));const b=node('button',text);b.type='submit';b.disabled=busy;f.append(b);f.addEventListener('submit',e=>{e.preventDefault();const values=controls.map(c=>c.value);run(()=>submit(values));});parent.append(f);}
 async function refresh(){const t=epoch,next=await client.bootstrap();check(t);personalMatches(next);snapshot=next;
  if(selected){const org=next.contexts.coach_contexts.find(o=>o.id===selected);if(!org)throw Error('WORKSPACE_UNAVAILABLE');
   if(org.legal_ready){if(readerOrganization!==selected){await reader.selectOrganization(selected);readerOrganization=selected;}check(t);workspace=(await reader.perform('workspace')).data;check(t);aliasPending=await reader.paymentAliasPending();check(t);}
   else workspace=null;
  }
 }
 async function run(action){if(disposed||busy)return;const t=epoch;busy=true;
  for(const control of root.querySelectorAll('button,input,textarea,select'))if(!control.closest('[data-ncc-coach-tools]'))control.disabled=true;
  try{await action();check(t);notice='Consulta confirmada.';}
  catch(e){if(t===epoch)notice=e.outcome==='uncertain'?'Resultado incierto. Se conservó la operación; verificá su recibo antes de volver a enviar.':({PROFESSIONAL_BINDING_UNBOUND:'Falta publicar los documentos profesionales revisados.',OPERATION_ALREADY_RECORDED:'Hay una operación registrada. Consultá su recibo con los mismos datos.',ADMIN_REQUIRED:'Esta acción corresponde al administrador.'}[e.code]||'No se pudo verificar la operación. Volvé a consultar.');}
  finally{if(t===epoch){busy=false;render();}}
 }
 async function choose(id){assertCanLeave();if(hasUnsavedDraft())throw Error('UNSAVED_PERSONAL_DRAFT');disposeTools();readerOrganization=null;selected=id||null;studentId=null;messages=[];pending=[];workspace=null;
  termsPanel?.dispose();termsPanel=null;reader.invalidate();terms.invalidate();onView(!!selected);await refresh();
 }
 async function loadMessages(){if(!studentId)return;const t=epoch;messages=(await reader.perform('messages',{student_id:studentId})).data;check(t);pending=(await reader.perform('pendingMutations',{student_id:studentId})).data;check(t);}
 function render(){if(disposed)return;termsPanel?.dispose();termsPanel=null;root.replaceChildren();adminArea=null;adminHeading=null;statusNode=null;root.setAttribute('data-ncc-professional-release-panel','');
  if(snapshot&&snapshot.profile.role!=='admin'&&snapshot.contexts.coach_contexts.length===0){root.hidden=true;onView(false);return;}root.hidden=false;
  const style=node('style',`[data-ncc-professional-release-panel]{max-width:960px;margin:0 auto;padding:16px;box-sizing:border-box;color:#17343e;overflow-wrap:anywhere}
[data-ncc-professional-release-panel] form,[data-ncc-professional-release-panel]>section{margin:16px 0}
[data-ncc-professional-release-panel] label{display:block;margin:10px 0;font-weight:500}
[data-ncc-professional-release-panel] input:not([type=checkbox]),[data-ncc-professional-release-panel] select,[data-ncc-professional-release-panel] textarea{display:block;width:100%;max-width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #b5c9c9;border-radius:10px;background:#fff;color:#17343e;font:inherit;margin:6px 0}
[data-ncc-professional-release-panel] input[type=checkbox]{margin-right:8px}
[data-ncc-professional-release-panel] button{max-width:100%;box-sizing:border-box;padding:10px 14px;margin:6px 6px 6px 0;border:1px solid #bad5d0;border-radius:10px;background:#e5f4ef;color:#006d6b;font:600 15px system-ui;cursor:pointer}
[data-ncc-professional-release-panel] button:disabled{opacity:.55;cursor:default}
[data-ncc-professional-release-panel] h2,[data-ncc-professional-release-panel] h3{margin:12px 0}
[data-ncc-professional-release-panel] [data-ncc-coach-tools] section{padding:16px;margin:14px 0;border-radius:16px;background:white}
[data-ncc-professional-release-panel] pre{white-space:pre-wrap}
[data-ncc-professional-release-panel] [hidden]{display:none!important}
[data-ncc-professional-release-panel][hidden]{display:none!important}
[data-ncc-professional-release-panel] [data-ncc-admin-controls]{border:1px solid #d4dedb;border-radius:12px;padding:10px 14px;margin:8px 0}
[data-ncc-professional-release-panel] summary{min-height:44px;display:list-item;align-content:center;cursor:pointer;font-weight:600;font-size:16px}
[data-ncc-professional-release-panel] [data-ncc-admin-controls] form{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:8px 12px;margin:10px 0}
[data-ncc-professional-release-panel] [data-ncc-admin-controls] label{font-size:15px;margin:4px 0}
[data-ncc-professional-release-panel] [data-ncc-admin-controls] input{min-height:44px;font-size:16px;padding:8px 10px;margin:4px 0}
[data-ncc-professional-release-panel] [data-ncc-admin-controls] button{min-height:44px;align-self:end;font-size:14px;margin:4px 0}
[data-ncc-professional-release-panel][data-ncc-workspace-mode=chooser]{padding:6px 16px}
[data-ncc-professional-release-panel][data-ncc-workspace-mode=chooser] select{min-height:44px;font-size:16px;padding:8px 10px;margin:0}
[data-ncc-professional-release-panel]>h2{font-size:18px;margin:4px 0 8px}
[data-ncc-professional-release-panel]>[role=status]{font-size:14px;margin:4px 0 8px}`);root.append(style);
  adminHeading=node('h2','Administración de espacios');root.append(adminHeading);const status=node('p',notice);statusNode=status;status.setAttribute('role','status');status.setAttribute('aria-live','polite');root.append(status);
  if(!snapshot){onView(false);button(root,'Volver a consultar',refresh);applyLocation();return;}
  const select=node('select');select.setAttribute('aria-label','Elegí tu espacio');const personal=node('option','Mi espacio personal');personal.value='';personal.selected=!selected;select.append(personal);
  for(const org of snapshot.contexts.coach_contexts){const option=node('option','Coach · '+org.name);option.value=org.id;option.selected=selected===org.id;select.append(option);}select.disabled=busy;
  select.addEventListener('change',()=>run(()=>choose(select.value)));if(snapshot.contexts.coach_contexts.length)root.append(select);
  if(snapshot.profile.role==='admin'){
   adminArea=disclosure(root,'Administrar coaches y cupos');adminArea.setAttribute('data-ncc-admin-controls','');
   form(adminArea,[['Correo del coach','email',''],['Nombre profesional','text',''],['Cupo inicial','number','10']],'Crear espacio de coach',async([email,name,seats])=>{await client.mutate('create',{email:email.trim().toLowerCase(),name:name.trim(),seats:Number(seats)});await refresh();});
   form(disclosure(adminArea,'Verificar una creación anterior'),[['Mismo correo a verificar','email',''],['Mismo nombre a verificar','text',''],['Mismo cupo a verificar','number','10']],'Verificar creación anterior',async([email,name,seats])=>{await client.reconcile('create',{email:email.trim().toLowerCase(),name:name.trim(),seats:Number(seats)});await refresh();});
   for(const org of snapshot.contexts.managed_coaches||[]){adminArea.append(node('h3',org.name),node('p',`${org.active_students} activos + ${org.pending_invitations} invitados de ${org.seat_limit} cupos`));
    form(adminArea,[['Cupo para '+org.name,'number',String(org.seat_limit)]],'Guardar cupo',async([seats])=>{await client.mutate('seats',{organizationId:org.id,seats:Number(seats)});await refresh();});
    form(disclosure(adminArea,'Verificar un cambio de cupo anterior'),[['Cupo anterior para verificar '+org.name,'number',String(org.seat_limit)]],'Verificar cambio de cupo',async([seats])=>{await client.reconcile('seats',{organizationId:org.id,seats:Number(seats)});await refresh();});
   }
  }
  applyLocation();
  if(!selected){onView(false);return;}
  onView(true);const org=snapshot.contexts.coach_contexts.find(o=>o.id===selected);if(!org){root.replaceChildren(node('p','Espacio no disponible.'));return;}
  root.append(node('h3',org.name),node('p',`${org.active_students} alumnos activos · ${org.pending_invitations} invitaciones pendientes · ${org.seat_limit} cupos`));
  if(!org.legal_ready){const section=node('section');root.append(section);
   // Selection is verified asynchronously before the acceptance controller reads the bundle.
   const t=epoch;terms.selectOrganization(selected).then(()=>{check(t);if(disposed||!section.isConnected)return;
    termsPanel=mountProfessionalTermsReleasePanel({root:section,enabled:true,transport:terms,backendOrigin:config.backendOrigin,readContext:()=>terms.currentContext(),onAccepted:async()=>{await refresh();check(t);render();}});
   }).catch(()=>{if(t===epoch&&!disposed)section.replaceChildren(node('p','No se pudo verificar la aceptación profesional.'));});return;
  }
  if(!workspace){button(root,'Consultar alumnos',refresh);return;}
  root.append(node('p','Alias de cobro: '+(workspace.organization.payment_alias||'Sin alias configurado')));
  const aliasForm=node('section');root.append(aliasForm);
  const aliasInput=input(aliasForm,'Alias de cobro de este espacio','text',workspace.organization.payment_alias||'');aliasInput.maxLength=100;
  const aliasLabel=node('label','Revisé el alias de cobro de este espacio'),aliasCheck=node('input');aliasCheck.type='checkbox';aliasCheck.disabled=busy||aliasPending;aliasLabel.prepend(aliasCheck);aliasForm.append(aliasLabel);
  const aliasSave=button(aliasForm,'Guardar alias de este espacio',async()=>{if(!aliasCheck.checked)throw Error('ALIAS_REVIEW_REQUIRED');await reader.setPaymentAlias(aliasInput.value.trim());await refresh();},true);
  const aliasValidity=()=>{aliasSave.disabled=busy||aliasPending||!aliasCheck.checked||aliasInput.value.trim().length<3||aliasInput.value.trim().length>100;};aliasInput.addEventListener('input',aliasValidity);aliasCheck.addEventListener('change',aliasValidity);
  if(aliasPending)aliasForm.append(node('p','Hay un cambio de alias pendiente de revisión. No se reenviará automáticamente.'));

  const invite=async(values,reconcile=false)=>{const [email,name]=values;const args={organizationId:selected,email:email.trim().toLowerCase(),name:name.trim()};await client[reconcile?'reconcile':'mutate']('invite',args);await refresh();};
  form(root,[['Correo del alumno','email',''],['Nombre del alumno','text','']],'Invitar alumno',values=>invite(values));
  form(root,[['Mismo correo invitado','email',''],['Mismo nombre invitado','text','']],'Verificar invitación anterior',values=>invite(values,true));
  const pupils=node('select');pupils.setAttribute('aria-label','Alumno del espacio profesional');const blank=node('option','Elegí un alumno');blank.value='';pupils.append(blank);
  for(const student of workspace.students){const option=node('option',student.nickname+(student.active?'':' · Inactivo')+(student.consent_accepted?'':' · Sin seguimiento compartido'));option.value=student.user_id;option.disabled=!student.active||!student.consent_accepted;option.selected=studentId===student.user_id;pupils.append(option);}pupils.disabled=busy;
  pupils.addEventListener('change',()=>run(async()=>{assertCanLeave();disposeTools();studentId=pupils.value||null;messages=[];pending=[];await loadMessages();}));root.append(pupils);
  if(studentId){const log=node('section');log.setAttribute('role','log');for(const row of messages)log.append(node('p',(row.sender_id===snapshot.who.userId?'Vos: ':'Alumno: ')+row.body));root.append(log);
   if(toolsStudent!==studentId)disposeTools();
   if(!toolsPanel){toolsMount=node('section');toolsStudent=studentId;root.append(toolsMount);toolsPanel=mountProfessionalCoachTools({root:toolsMount,reader,enabled:true,studentId,studentName:workspace.students.find(x=>x.user_id===studentId)?.nickname||'Alumno',coachName:snapshot.profile.nickname||'Tu coach'});}else root.append(toolsMount);
   const draft=node('textarea');draft.value=messageDraft;draft.maxLength=2000;draft.setAttribute('aria-label','Mensaje profesional');draft.disabled=busy;let sendButton;draft.addEventListener('input',()=>{messageDraft=draft.value;if(sendButton)sendButton.disabled=busy||!messageDraft.trim()||pending.some(p=>p.operation==='sendMessage');});root.append(draft);
   sendButton=button(root,'Enviar mensaje',async()=>{await reader.perform('sendMessage',{id:crypto.randomUUID(),student_id:studentId,body:messageDraft.trim()});messageDraft='';await loadMessages();},!messageDraft.trim()||pending.some(p=>p.operation==='sendMessage'));
   button(root,'Consultar conversación',loadMessages);
   for(const operation of pending){if(operation.operation==='sendMessage')button(root,'Verificar envío pendiente',async()=>{await reader.perform('reconcileMessage',{student_id:studentId,id:operation.id});await loadMessages();});else root.append(node('p','Hay lecturas anteriores pendientes de revisión.'));}
  }
  button(root,'Actualizar espacio',refresh);
 }
 const subscription=sdk.auth.onAuthStateChange(event=>{if(event==='INITIAL_SESSION')return;epoch++;disposeTools();readerOrganization=null;snapshot=null;selected=null;workspace=null;messages=[];messageDraft='';termsPanel?.dispose();termsPanel=null;reader.invalidate();client.invalidate();terms.invalidate();root.replaceChildren();onView(false);});
 const ready=run(refresh).then(()=>({disabled:false}));
 return Object.freeze({ready,assertCanLeave,setAdminLocation,dispose(){if(disposed)return;disposed=true;epoch++;disposeTools();readerOrganization=null;termsPanel?.dispose();reader.dispose();client.dispose();terms.dispose();subscription?.data?.subscription?.unsubscribe?.();for(const type of ['click','input','change','submit'])root.removeEventListener(type,stop);root.replaceChildren();onView(false);}});
}
