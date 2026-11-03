// Direct application lifecycle connection; no HTTP rewriting or state injection.
import {createStudentRestrictionDeclaration} from './student-restriction-declaration.js';
import {createBoundGuidePreparation} from './coach-bound-guide-preparation.js';
export function createPilotGuideLifecycle({sb,enabled,readStudent,readScope,readGoal,foodIds,onSaved}){
 let epoch=0,fingerprint=null,mount=null;
 function context(){
  const s=readStudent(),{intakeRevision,sharedAt,...identity}=s;
  const next=JSON.stringify([identity,intakeRevision,sharedAt]);
  if(next!==fingerprint){fingerprint=next;epoch++;}
  return {...identity,epoch};
 }
 const declaration=createStudentRestrictionDeclaration({sb,readContext:context,enabled});
 const preparation=createBoundGuidePreparation({sb,readScope,readGoal,foodIds,onSaved});
 function invalidate(){epoch++;preparation.invalidate();declaration.invalidate();mount?.remove();mount=null;}
 function mountStudent(root){
  if(!enabled)return;
  const s=readStudent(),c=context(),main=root.querySelector('.pilot-main');
  if(!main||c.role!=='student'||!c.active||!c.sessionId||!s.intakeRevision)return;
  if(main.querySelector('[data-pilot-declaration-open]'))return;
  const button=main.ownerDocument.createElement('button');button.type='button';button.className='btn light';
  button.dataset.pilotDeclarationOpen='';button.textContent='Abrir declaración separada de restricciones';
  button.onclick=async()=>{
   invalidate();const node=main.ownerDocument.createElement('div');mount=node;main.append(node);
   try{await declaration.open(node);}catch(error){if(mount===node&&node.isConnected)node.textContent=error.message;}
  };main.append(button);
 }
 function mountPreparation(target){
  if(!enabled||!target||!readGoal())return;
  // A recalculation requires a fresh explicit review, even in the same screen.
  preparation.invalidate();
  target.querySelector('[data-pilot-preparation]')?.remove();
  const host=target.ownerDocument.createElement('div');host.dataset.pilotPreparation='';target.append(host);
  preparation.mount(host);
 }
 return {invalidate,mountStudent,mountPreparation};
}
