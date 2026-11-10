import {PROFESSIONAL_RELEASE_ENABLED} from './professional-release-adapter.mjs?v=ncc-dual-role-release-r5-20261107';
import {mountProfessionalWorkspaceReleasePanel} from './professional-workspace-release-panel.mjs?v=ncc-coach-plan-steps-r1-20261110';
// OFF entry in the existing app; no synthetic guard or account-role substitution.
export function createProfessionalWorkspaceReleaseFrame({enabled=PROFESSIONAL_RELEASE_ENABLED,sdk,config,
 readSession,readLegacyPersonal,hasUnsavedDraft,readAdminLocation=()=>false,navigationTarget,mountPanel=mountProfessionalWorkspaceReleasePanel}={}){
 let identity=null,panel=null,mount=null,frameRoot=null,professional=false;
 const key=()=>{const s=readSession?.();return s?.userId&&s?.sessionId&&Number.isSafeInteger(s.epoch)?JSON.stringify([s.userId,s.sessionId,s.epoch]):null;};
 const apply=()=>{const body=frameRoot?.querySelector('[data-ncc-release-personal]');if(body){body.hidden=professional;body.inert=professional;body.setAttribute('aria-hidden',String(professional));}
  for(const button of frameRoot?.querySelectorAll('.pilot-nav [data-tab]')||[]){button.disabled=professional;button.setAttribute('aria-disabled',String(professional));}};
 function invalidate(){panel?.dispose();panel=null;mount?.remove();mount=null;identity=null;professional=false;apply();}
 function revalidate(){if(enabled!==true)return false;const next=key();if(identity!==next){invalidate();identity=next;}return !!next;}
 function mountFrame(root){if(enabled!==true)return;frameRoot=root;if(!revalidate())return;const slot=root.querySelector('[data-ncc-release-slot]');if(!slot)return;
  if(!mount){mount=root.ownerDocument.createElement('section');mount.setAttribute('data-ncc-professional-release-host','');slot.append(mount);
   panel=mountPanel({root:mount,sdk,config,enabled:true,readLegacyPersonal,hasUnsavedDraft,adminLocation:readAdminLocation()===true,onView(value){professional=!!value;apply();}});
  }else slot.append(mount);panel?.setAdminLocation?.(readAdminLocation()===true);apply();
 }
 // The independent coach space must also be available before student onboarding.
 function mountUnframedRoot(root){
  if(enabled!==true||!revalidate()||root.querySelector('[data-ncc-release-slot]'))return;
  prepareUnframed(root);
 }
 function prepareUnframed(root){
  mount?.remove();const slot=root.ownerDocument.createElement('div'),personal=root.ownerDocument.createElement('div');
  slot.setAttribute('data-ncc-release-slot','');personal.setAttribute('data-ncc-release-personal','');personal.append(...Array.from(root.childNodes));root.replaceChildren(slot,personal);mountFrame(root);
 }
 const history=()=>{invalidate();if(frameRoot)mountFrame(frameRoot);};const hide=()=>invalidate();const show=e=>{if(e?.persisted)history();};
 if(enabled===true){navigationTarget?.addEventListener('popstate',history);navigationTarget?.addEventListener('pagehide',hide);navigationTarget?.addEventListener('pageshow',show);}
 return Object.freeze({wrap:html=>enabled===true?'<div data-ncc-release-slot></div><div data-ncc-release-personal>'+html+'</div>':html,
  prepareFrame(){if(enabled===true){revalidate();mount?.remove();}},mountFrame,mountUnframedRoot,revalidate,invalidate,
  guardEvent(event){if(enabled!==true)return false;revalidate();if(event.target?.closest?.('[data-ncc-professional-release-host]'))return false;if(!professional||event.type==='click'&&event.target?.closest?.('[data-act="logout"]'))return false;event.preventDefault();event.stopImmediatePropagation();return true;},
  isProfessional:()=>enabled===true&&revalidate()&&professional,
  ready:()=>panel?.ready||Promise.resolve({disabled:enabled!==true}),
  dispose(){invalidate();navigationTarget?.removeEventListener('popstate',history);navigationTarget?.removeEventListener('pagehide',hide);navigationTarget?.removeEventListener('pageshow',show);}});
}
