import assert from 'node:assert/strict';
import {createReleaseFlow} from '../pilot/release-flow.js';
const manifest={id:'major_2026_01',version:'2026.11.1',phase:'preview',title:'Nueva versión',roles:['admin','coach','student','personal'],highlights:['Novedades verificadas']};
for(const role of manifest.roles){
 let state={manifest:{...manifest},role,userId:'fixture-A',ownerEnabled:true,backendReady:true,legalSatisfied:false};
 let dirty=false,log=[],badReceipt=false,changeDuringAck=false,throwAck=false;
 const backend={current:async()=>structuredClone(state),acknowledge:async req=>{log.push('ack');if(throwAck)throw Error('offline');if(changeDuringAck)dirty=true;return {userId:badReceipt?'fixture-B':'fixture-A',releaseId:manifest.id,kind:req.acknowledgment_kind,recordedAt:'2026-10-29T00:00:00Z'}},markSeen:async req=>{log.push('seen');return req;}};
 const options={backend,hasUnsavedChanges:()=>dirty,signOut:async()=>{log.push('logout')}};
 await assert.rejects(createReleaseFlow(options).acknowledgePreview(),/desactivada/);
 const flow=createReleaseFlow({...options,enabled:true});
 await flow.acknowledgePreview();assert.deepEqual(log,['ack']);
 await assert.rejects(flow.acknowledgeAndSignOut(),/habilitado/);
 state.manifest.phase='reauth_required';dirty=true;log=[];
 assert.equal((await flow.acknowledgeAndSignOut()).state,'save_required');assert.deepEqual(log,[]);
 dirty=false;throwAck=true;await assert.rejects(flow.acknowledgeAndSignOut(),/offline/);assert.ok(!log.includes('logout'));throwAck=false;
 badReceipt=true;await assert.rejects(flow.acknowledgeAndSignOut(),/confirmó/);assert.ok(!log.includes('logout'));badReceipt=false;
 changeDuringAck=true;assert.equal((await flow.acknowledgeAndSignOut()).state,'save_required');assert.ok(!log.includes('logout'));
 dirty=false;changeDuringAck=false;log=[];await flow.acknowledgeAndSignOut();assert.deepEqual(log,['ack','logout']);
 state.manifest.phase='live';await assert.rejects(flow.begin(),/documentos/);
 state.legalSatisfied=true;assert.deepEqual(await flow.begin(),{release_id:manifest.id,view_kind:'whats_new_seen'});
 state.ownerEnabled=false;await assert.rejects(flow.begin(),/autorizado/);
}
console.log('PASS: four-role offline orchestration; disabled default, separate preview, save guard, verified ACK before logout, legal-before-welcome. No live backend validation.');
