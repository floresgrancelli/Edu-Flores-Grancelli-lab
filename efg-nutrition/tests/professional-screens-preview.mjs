import {createProfessionalFixture} from './professional-screens-fixture.mjs';
import {mountProfessionalScreens} from '../pilot/professional-screens-panel.mjs?v=ncc-professional-screens-r1-20261107';
const fixture=createProfessionalFixture(),root=document.querySelector('#screens'),notice=document.querySelector('#notice');
let panel=null;
function close(){panel?.dispose();panel=null;root.replaceChildren();}
async function open(){
 try{panel?.adapter.assertCanLeave();}catch(error){notice.textContent=error.message;return;}
 notice.textContent='';close();fixture.navigate(true);
 panel=mountProfessionalScreens({root,enabled:true,syntheticEnvironment:()=>true,
  transport:fixture.transport,mutationGuard:fixture.mutationGuard,readSession:fixture.readSession,readWorkspace:fixture.readWorkspace});
 await panel.ready;
}
document.querySelector('#professional').addEventListener('click',open);
document.querySelector('#personal').addEventListener('click',()=>{
 try{panel?.adapter.assertCanLeave();}catch(error){notice.textContent=error.message;return;}
 close();fixture.navigate(false);notice.textContent='Volviste al seguimiento personal ficticio. Nada se copió del espacio profesional.';
});
document.querySelector('#logout').addEventListener('click',()=>{
 close();fixture.session.epoch++;fixture.session.sessionId='synthetic-session-'+fixture.session.epoch;
 fixture.navigate(false);notice.textContent='Sesión ficticia cerrada. Borradores y respuestas anteriores descartados.';
});
document.querySelector('#revoke').addEventListener('click',()=>{
 fixture.db.capability=false;panel?.adapter.open({discard:true}).catch(()=>{}).finally(()=>panel?.revalidate());
 notice.textContent='Revocación ficticia. El servidor simulado vuelve a comprobar cada operación.';
});
// The host must invalidate on history/dismissal, not infer that a same-looking view is the same generation.
for(const event of ['popstate','pagehide'])window.addEventListener(event,()=>{close();fixture.navigate(false);});
// Browser QA imports this test-only module; nothing is exposed by the application.
export {fixture};
export const getPanel=()=>panel;
