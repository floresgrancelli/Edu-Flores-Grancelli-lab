// Test-only HTTP source transform, never deployed. Does not populate application state.
import assert from 'node:assert/strict';
import {localSdkEntrySource,localSdkEntryFlag} from '../../efg-nutrition/tests/sdk-entry-source-private.mjs';
export {localSdkEntryFlag};
export function bridgeBrowserSource(source,options){
 let s=localSdkEntrySource(source,{...options,declarationPanel:true});
 const pattern=/const coachAdaptedWorkspace=coachPersistedGuideSource\?createCoachAdaptedWorkspace\([\s\S]*?\n\}\);\nconst pilotGuideLifecycle=/g;
 assert.equal([...s.matchAll(pattern)].length,1,'Exact existing workspace entry required');
 s=s.replace(pattern,"const coachAdaptedWorkspace=createClinicalGuideConnection({enabled:true,client:sb,readScope:adaptedCoachScope,template:PILOT_GUIDE_INSTALL.template});\nconst pilotGuideLifecycle=");
 const config=/const PILOT_GUIDE_INSTALL=Object\.freeze\(([^\n]+)\);/g;
 assert.equal([...s.matchAll(config)].length,1);
 s=s.replace(config,(_,json)=>'const PILOT_GUIDE_INSTALL=Object.freeze('+JSON.stringify({...JSON.parse(json),publicationEnabled:false})+');');
 return "import {createClinicalGuideConnection} from './clinical-guide-connection.js';\n"+s;
}
