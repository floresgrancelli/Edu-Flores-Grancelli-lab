import {createDualWorkspaceClient} from './dual-workspace-candidate.mjs?v=ncc-dual-workspace-r4-20261106';
import {createWorkspaceGateway} from './dual-workspace-integration.mjs?v=ncc-professional-screens-r1-20261107';

import {mountProfessionalScreens} from './professional-screens-panel.mjs?v=ncc-professional-screens-r1-20261107';
import {professionalScreenScope} from './professional-screens-candidate.mjs?v=ncc-professional-screens-r1-20261107';

// Candidate integration in the real app frame. OFF unless explicitly supplied.
export function mountDualWorkspacePanel({root,rpc,readSession,readLegacyPersonal,hasUnsavedDraft,enabled=false,onView=()=>{},onUnavailable=()=>{},professionalScreens={}}={}){
 if(!enabled)return Object.freeze({dispose(){},ready:Promise.resolve({disabled:true})});
 const document=root.ownerDocument,client=createDualWorkspaceClient({rpc,readSession,enabled});
 const gateway=createWorkspaceGateway({client,readLegacyPersonal,hasUnsavedDraft});
 let screens=null,screensMount=null,screensGeneration=null;
 function disposeScreens(){screens?.dispose();screens=null;screensMount=null;screensGeneration=null;}
 function assertScreenDrafts(){screens?.adapter?.assertCanLeave();}
 let disposed=false,busy=false,notice='Solo ensayo sintético. No cambia el rol personal ni abre fichas privadas.';
 const alive=()=>!disposed&&root.isConnected;
 function unavailable(error){
  if(!alive())return;
  disposeScreens();root.replaceChildren(node('p','Panel candidato no disponible: '+error.message));onUnavailable(error);
 }
 function safeRender(){try{render();}catch(error){unavailable(error);}}
 const node=(tag,text)=>{const element=document.createElement(tag);if(text)element.textContent=text;return element;};
 function field(form,labelText,name,type,value,min,max){
  const label=node('label',labelText),input=node('input');input.name=name;input.type=type;input.value=value||'';input.required=true;
  if(min!==undefined)input.min=String(min);if(max!==undefined)input.max=String(max);
  if(type==='number')input.step='1';else input.maxLength=type==='email'?254:70;
  label.append(input);form.append(label);return input;
 }
 function submit(form,label,handler){
  const button=node('button',label);button.type='submit';button.className='btn';form.append(button);
  form.addEventListener('submit',event=>{
   event.preventDefault();event.stopPropagation();
   // Capture before run disables controls: disabled inputs are excluded from FormData.
   const values=new FormData(form);run(()=>handler(values));
  });
 }
 async function run(action){
  if(busy||!alive())return;
  try{assertScreenDrafts();}catch(error){notice=error.message;safeRender();return;}
  busy=true;
  for(const control of root.querySelectorAll('button,input,select'))control.disabled=true;
  try{await action();if(!alive())return;await gateway.refresh();notice='Cambio verificado en la candidata sintética.';}
  catch(error){notice=error.message;}
  finally{busy=false;if(alive())safeRender();}
 }
 function render(){
  if(!alive())return;
  const snapshot=client.snapshot(),state=gateway.view(),contexts=snapshot.contexts;
  onView(state);
  root.replaceChildren();root.className='card ncc-dual-workspace-candidate';
  root.append(node('h2','Espacios de la cuenta · candidata local'));
  const status=node('p',notice);status.setAttribute('role','status');root.append(status);
  if(contexts.profile_role==='admin'){
   const form=node('form');form.className='pilot-form';
   field(form,'Correo ficticio','email','email','learner@example.invalid');
   field(form,'Nombre profesional','name','text','Coach DEMO');
   field(form,'Cupo de alumnos (1–10.000)','seats','number','3',1,10000);
   submit(form,'Agregar coach ficticio',values=>client.createPilot({email:values.get('email'),name:values.get('name'),seats:values.get('seats')}));root.append(form);
   for(const org of contexts.managed_coaches||[]){
    const row=node('section');row.append(node('h3',org.name));
    row.append(node('p',`${org.active_students+org.pending_invitations} ocupados de ${org.seat_limit} cupos`));
    const edit=node('form');field(edit,'Nuevo cupo','seats','number',String(org.seat_limit),1,10000);
    submit(edit,'Guardar cupo ficticio',values=>client.setSeats({organizationId:org.id,seats:values.get('seats')}));row.append(edit);root.append(row);
   }
  }
  const label=node('label','Elegí tu espacio'),select=node('select');select.setAttribute('aria-label','Espacio personal o profesional');
  for(const choice of state.choices){const option=node('option',choice.label);option.value=choice.key;option.selected=choice.key===state.selected;select.append(option);}
  select.addEventListener('change',()=>{try{assertScreenDrafts();gateway.enter(select.value);notice='Espacio cambiado. El vínculo personal sigue intacto.';}catch(error){notice=error.message;}safeRender();});label.append(select);root.append(label);
  if(!state.professional){
   disposeScreens();
   root.append(node('p',state.originalProfile.role==='student'?`Seguimiento personal conservado en ${state.originalProfile.organization_id}.`:'Mi día personal permanece sin cambios.'));return;
  }
  root.append(node('h3',state.professional.name));
  if(state.professionalState==='professional_terms'){
   disposeScreens();
   root.append(node('p','La aceptación como alumna/o no reemplaza la aceptación profesional. Esta prueba usa documentos ficticios sin efectos legales.'));
   const form=node('form'),label=node('label','Acepto ambas versiones ficticias para este ensayo'),checkbox=node('input');
   checkbox.type='checkbox';checkbox.name='accepted';checkbox.required=true;label.prepend(checkbox);form.append(label);
   submit(form,'Aceptar condiciones ficticias',values=>client.acceptSyntheticTerms({accepted:values.get('accepted')==='on',termsVersion:'synthetic-terms-v1',privacyVersion:'synthetic-privacy-v1'}));root.append(form);return;
  }
  const invite=node('form');field(invite,'Correo ficticio del alumno','email','email','pupil@example.invalid');field(invite,'Nombre del alumno','name','text','Alumno DEMO');
  submit(invite,'Invitar alumno ficticio',values=>client.inviteStudent({email:values.get('email'),name:values.get('name')}));root.append(invite);
  const list=node('button','Consultar lista básica');list.type='button';list.className='btn light';
  list.addEventListener('click',async()=>{
   if(busy)return;busy=true;list.disabled=true;
   try{await gateway.roster();notice='Lista básica verificada; no incluye datos de salud.';}
   catch(error){notice=error.message;}finally{busy=false;if(alive())safeRender();}
  });root.append(list);
  for(const student of state.roster||[])root.append(node('p',`${student.nickname} · ${student.consent_accepted?'Seguimiento autorizado':'Sin consentimiento de seguimiento'}`));
  if(professionalScreens.enabled===true){
   const generation=JSON.stringify([state.selected,state.navigationEpoch]);
   if(screensGeneration!==generation)disposeScreens();
   if(!screens){
    screensMount=node('section');root.append(screensMount);screensGeneration=generation;
    const readWorkspace=()=>{const view=gateway.view();return {view,navigationEpoch:view.navigationEpoch};};
    const readContext=()=>professionalScreenScope(professionalScreens.readSession?.(),readWorkspace());
    screens=mountProfessionalScreens({root:screensMount,enabled:true,
     syntheticEnvironment:professionalScreens.syntheticEnvironment,mutationGuard:professionalScreens.mutationGuard,
     readSession:professionalScreens.readSession,readWorkspace,
     transport:professionalScreens.createTransport?.({readContext})});
   }else{root.append(screensMount);screens.revalidate();}
   root.append(node('p','Fichas clínicas, guías, informes y pagos siguen cerrados. Alias, recetas y mensajes usan el panel candidato separado.'));
  }else{
   disposeScreens();
   root.append(node('p','Las fichas, guías, mensajes y pagos profesionales siguen cerrados hasta integrar y validar el servidor.'));
  }
 }
 const ready=gateway.refresh().then(()=>{if(alive())safeRender();return {disabled:false};}).catch(error=>{
  unavailable(error);return {error:error.message};
 });
 return Object.freeze({ready,screensReady:()=>screens?.ready||Promise.resolve({disabled:true}),dispose(){disposed=true;disposeScreens();gateway.clear();if(root.isConnected)root.replaceChildren();}});
}
