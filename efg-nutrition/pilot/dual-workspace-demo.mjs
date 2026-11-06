// Local demo uses only an in-memory fixture, never a Supabase/browser-auth client.
import {createDualWorkspaceClient} from './dual-workspace-candidate.mjs';
import {createWorkspaceGateway} from './dual-workspace-integration.mjs';
import {createSyntheticService} from '../tests/dual-workspace-fixture.mjs';
const service=createSyntheticService();
let identity='admin', sessionVersion=0, busy=false;
const element=id=>document.getElementById(id);
const client=createDualWorkspaceClient({enabled:true,
  readSession:()=>({userId:identity,sessionId:String(sessionVersion)}),
  rpc:(name,args)=>service.call(identity,name,args)});
const gateway=createWorkspaceGateway({client,readLegacyPersonal:()=>{
 const profile=service.inspect().profiles.find(p=>p.user_id===identity);
 return {profile,organization:profile?.organization_id?{id:profile.organization_id}:null};
}});
const message=(text,error=false)=>{element('status').textContent=text;element('status').className='status'+(error?' error':'');};
function node(tag,text,className){const n=document.createElement(tag);n.textContent=text;if(className)n.className=className;return n;}
async function refresh(){await gateway.refresh();render();}
function render(){
 const {contexts,selected,choices}=client.snapshot();
 if(!contexts)return;
 const picker=element('workspace');picker.replaceChildren();
 for(const choice of choices){const option=node('option',choice.label);option.value=choice.key;option.selected=choice.key===selected;picker.append(option);}
 for(const panel of ['admin','student','coach','personal'])element(panel).classList.add('hidden');
 if(contexts.profile_role==='admin'){
  element('admin').classList.remove('hidden');const managed=element('managed');managed.replaceChildren();
  if(!contexts.managed_coaches.length)managed.append(node('p','Todavía no agregaste coaches ficticios.','hint'));
  for(const org of contexts.managed_coaches){
   const row=node('div','','org');row.append(node('strong',org.name));
   row.append(node('small',`${org.active_students+org.pending_invitations} ocupados de ${org.seat_limit} · ${org.coach_id?'Cuenta existente habilitada en la simulación':'Pendiente de cuenta verificada'}`));
   const form=document.createElement('form'),label=node('label','Nuevo cupo para '+org.name),input=document.createElement('input');
   input.id='seats-'+org.id;label.htmlFor=input.id;input.type='number';input.min='1';input.max='10000';input.step='1';input.required=true;input.value=String(org.seat_limit);
   const button=node('button','Guardar cupo ficticio');button.type='submit';form.append(label,input,button);
   form.addEventListener('submit',event=>{event.preventDefault();run(()=>client.setSeats({organizationId:org.id,seats:input.value}),'Cupo ficticio actualizado.');});
   row.append(form);managed.append(row);
  }
 }
 if(selected==='student'){
  element('student').classList.remove('hidden');element('relationship').textContent=`Organización original: ${contexts.student_context.organization_id}. Seguimiento ${contexts.student_context.consent_accepted?'autorizado':'no autorizado'}.`;
  element('revoke').disabled=!contexts.student_context.consent_accepted;
 }else if(selected?.startsWith('coach:')){
  const org=contexts.coach_contexts.find(o=>'coach:'+o.id===selected);element('coach').classList.remove('hidden');
  element('coach-title').textContent=org.name;element('quota').textContent=`${org.seat_limit-org.active_students-org.pending_invitations} de ${org.seat_limit} cupos disponibles`;
  element('terms-form').classList.toggle('hidden',org.legal_ready===true);
  element('invite-form').classList.toggle('hidden',org.legal_ready!==true);
 }else element('personal').classList.remove('hidden');
}
async function run(action,success){
 if(busy)return;busy=true;
 element('identity').disabled=true;element('workspace').disabled=true;
 for(const button of document.querySelectorAll('button'))button.disabled=true;
 try{await action();await refresh();message(success);}catch(error){message(error.message,true);}
 finally{busy=false;for(const button of document.querySelectorAll('button'))button.disabled=false;
  element('identity').disabled=false;element('workspace').disabled=false;render();}
}
element('create-form').addEventListener('submit',event=>{event.preventDefault();run(()=>client.createPilot({email:element('coach-email').value,name:element('coach-name').value,seats:element('coach-seats').value}),'Coach ficticio agregado. Cambiá a Alumna DEMO para revisar ambos espacios.');});
element('invite-form').addEventListener('submit',event=>{event.preventDefault();run(()=>client.inviteStudent({email:element('student-email').value,name:element('student-name').value}),'Invitación ficticia registrada. No se envió ningún correo.');});
element('terms-form').addEventListener('submit',event=>{event.preventDefault();run(()=>client.acceptSyntheticTerms({accepted:element('accept-terms').checked,termsVersion:'synthetic-terms-v1',privacyVersion:'synthetic-privacy-v1'}),'Aceptación profesional ficticia registrada. Sin efectos legales reales.');});
element('identity').addEventListener('change',async event=>{identity=event.target.value;sessionVersion++;await run(async()=>{},'Identidad ficticia cambiada.');});
element('workspace').addEventListener('change',event=>{try{gateway.enter(event.target.value);render();message('Espacio cambiado sin modificar roles ni consentimiento.');}catch(error){message(error.message,true);}});
element('revoke').addEventListener('click',()=>run(async()=>{service.arrange(db=>{const consent=db.consents.find(c=>c.student_id===identity);if(consent)consent.accepted=false;});},'Consentimiento retirado solo en la simulación.'));
await refresh();message('Simulación preparada. No hay conexión a servicios reales.');
