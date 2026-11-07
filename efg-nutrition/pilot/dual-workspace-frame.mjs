import {PROFESSIONAL_RECONCILIATION_ENABLED} from './professional-mutation-journal.mjs?v=ncc-professional-reconciliation-r1-20261107';
import {DUAL_WORKSPACE_RELEASE_ENABLED} from './dual-workspace-candidate.mjs?v=ncc-dual-workspace-r4-20261106';
import {mountDualWorkspacePanel} from './dual-workspace-panel.mjs?v=ncc-professional-reconciliation-r1-20261107';

import {PROFESSIONAL_SCREENS_RELEASE_ENABLED,createProfessionalMutationGuard} from './professional-screens-candidate.mjs?v=ncc-professional-reconciliation-r1-20261107';

// Presentation boundary only. RPCs remain responsible for authorization.
// Selection and pending operations live in RAM and are never copied between identities.
export function workspaceIdentity(session) {
 if(!session?.userId || !session?.sessionId || !Number.isSafeInteger(session.epoch))return null;
 return JSON.stringify([session.userId, session.sessionId, session.epoch]);
}
export const isDualWorkspaceField = element => !!element?.closest?.('[data-ncc-dual-panel]');
export function createDualWorkspaceFrame({enabled=DUAL_WORKSPACE_RELEASE_ENABLED,
 rpc,readSession,readLegacyPersonal,hasUnsavedDraft,mountPanel=mountDualWorkspacePanel,
 professionalScreensEnabled=PROFESSIONAL_SCREENS_RELEASE_ENABLED,professionalReconciliationEnabled=PROFESSIONAL_RECONCILIATION_ENABLED,mutationJournal,createScreenTransport,syntheticEnvironment=()=>false,navigationTarget=null}={}) {
 let identity=null, panel=null, mount=null, frameRoot=null, professional=false;
 let generation=0;
 const screenMutationGuard=createProfessionalMutationGuard({journal:mutationJournal}); // Survives panel unmount/session invalidation in this host.
 const session=()=>{const value=readSession?.();return workspaceIdentity(value)?
  {userId:value.userId,sessionId:JSON.stringify([value.sessionId,value.epoch])}:null;};
 function apply(){
  if(!frameRoot)return;
  frameRoot.dataset.nccWorkspace=professional?'professional':'personal';
  const content=frameRoot.querySelector('[data-ncc-personal-content]');
  if(content){content.hidden=professional;content.inert=professional;content.setAttribute('aria-hidden',String(professional));}
  for(const button of frameRoot.querySelectorAll('.pilot-nav [data-tab]')){
   button.disabled=professional;button.setAttribute('aria-disabled',String(professional));
  }
 }
 function invalidate(){
  generation++;panel?.dispose();panel=null;mount?.remove();mount=null;
  identity=null;professional=false;apply();
 }
 function revalidate(){
  if(!enabled)return false;
  const next=workspaceIdentity(readSession?.());
  if(next!==identity){invalidate();identity=next;}
  return !!next;
 }
 function prepareFrame(){if(!enabled)return;revalidate();mount?.remove();}
 function wrap(content){return enabled?'<div data-ncc-dual-slot></div><div data-ncc-personal-content>'+content+'</div>':content;}
 function mountFrame(root){
  if(!enabled)return;
  frameRoot=root;
  if(!revalidate())return;
  const slot=root.querySelector('[data-ncc-dual-slot]');if(!slot)return;
  if(!mount){
   mount=root.ownerDocument.createElement('section');mount.setAttribute('data-ncc-dual-panel','');
   mount.setAttribute('aria-label','Espacios de la cuenta · candidata');slot.append(mount);
   // Target listeners inside the panel still run; legacy delegated handlers do not.
   for(const event of ['click','input','change','submit'])mount.addEventListener(event,e=>e.stopPropagation());
   const ticket=generation;
   panel=mountPanel({root:mount,rpc,readSession:session,readLegacyPersonal,hasUnsavedDraft,enabled:true,
    professionalScreens:{enabled:professionalScreensEnabled,reconciliationEnabled:professionalReconciliationEnabled,readSession,syntheticEnvironment,
     mutationGuard:screenMutationGuard,createTransport:createScreenTransport},
    onView(view){if(ticket!==generation||!revalidate())return;professional=!!view.professional;apply();},
    onUnavailable(){if(ticket!==generation)return;professional=false;apply();}});
  }else slot.append(mount);
  apply();
 }
 function guardEvent(event){
  if(!enabled)return false;
  revalidate();
  if(isDualWorkspaceField(event.target))return false;
  if(!professional)return false;
  if(event.type==='click'&&event.target?.closest?.('[data-act="logout"]'))return false;
  event.preventDefault();event.stopImmediatePropagation();return true;
 }
 const onHistory=()=>{invalidate();if(frameRoot)mountFrame(frameRoot);};
 const onHide=()=>invalidate();
 // A bfcache restore need not emit popstate. Fetch a fresh personal chooser, never cached professional data.
 const onShow=event=>{if(event?.persisted)onHistory();};
 if(enabled){navigationTarget?.addEventListener?.('popstate',onHistory);navigationTarget?.addEventListener?.('pagehide',onHide);navigationTarget?.addEventListener?.('pageshow',onShow);}
 return Object.freeze({prepareFrame,wrap,mountFrame,guardEvent,revalidate,invalidate,
  isProfessional:()=>enabled&&revalidate()&&professional,
  ready:()=>{const current=panel;return current?current.ready.then(async result=>{await current.screensReady?.();return result;}):Promise.resolve({disabled:!enabled});}});
}
