// Composes existing scope-bound intake source with existing coach workspace.
// Providers are injected by an authorized environment. No RPC, storage or publish.
import {createGuideIntakeSource} from './coach-guide-intake-adapter.js';
import {createCoachAdaptedWorkspace,adaptedScopeKey} from './coach-adapted-workspace.js';
export function createCoachGuideConnection({enabled=false,readScope,providers=null}={}){
 if(!providers)return null;
 for(const method of ['readBinding','readBundle','subscribe'])
  if(typeof providers[method]!=='function')throw Error('Proveedor de ficha incompleto.');
 // Binding may supply only session/version; never override coach/student/org permissions.
 const scoped=()=>{
  const s=readScope(),b=providers.readBinding();
  if(!adaptedScopeKey(s)||!b||typeof b.sessionId!=='string'||!b.sessionId||
   !Number.isSafeInteger(b.sourceEpoch)||b.sourceEpoch<1)return null;
  return {...s,sessionId:b.sessionId,sourceEpoch:b.sourceEpoch};
 };
 const source=createGuideIntakeSource({readScope:scoped,readBundle:s=>providers.readBundle(s)});
 const workspace=createCoachAdaptedWorkspace({enabled,readScope:scoped,inputSource:source});
 const unsubscribe=providers.subscribe(()=>source.invalidate());
 if(typeof unsubscribe!=='function'){workspace.dispose();throw Error('Falta cancelación del proveedor de ficha.');}
 return {workspace,invalidate:()=>source.invalidate(),dispose(){unsubscribe();workspace.dispose();}};
}
