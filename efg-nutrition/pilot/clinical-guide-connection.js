// Private connection proposal. No RPC, listener, timer or UI created unless explicitly enabled.
import {createPersistedGuideProvider} from './persisted-guide-provider.js?v=ncc-guide-return-20261105-r6';
import {createServerCompatibilityClient} from './server-compatibility-client.js?v=ncc-guide-return-20261105-r6';
import {createCoachAdaptedWorkspace} from './coach-adapted-workspace.js?v=ncc-guide-return-20261105-r6';
export const CLINICAL_GUIDE_CONNECTION_ENABLED=false;
export function createClinicalGuideConnection({enabled=false,client,readScope,template,clock={}}={}){
 if(!enabled)return {available:()=>false,open:async()=>{throw Error('CLINICAL_CONNECTION_OFF');},dispose(){}};
 const source=createPersistedGuideProvider({client,readScope,template,clinical:true});
 const compatibility=createServerCompatibilityClient({enabled:true,readScope,
  readSaved:async()=> (await source.load()).row,evaluateProposal:request=>source.preview(request),
  ...Object.fromEntries(['monotonicNow','wallNow','schedule','cancel'].filter(k=>typeof clock[k]==='function').map(k=>[k,clock[k]]))});
 const workspace=createCoachAdaptedWorkspace({enabled:true,readScope,persistedSource:source,serverCompatibility:compatibility,publicationClient:null});
 return {...workspace,dispose(){workspace.dispose();source.invalidate();compatibility.dispose();}};
}
