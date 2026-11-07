import {assertApiRequest, mutationAction, requireThat, metadataOnly} from './policy.mjs';
// This is an interceptor, NOT an SDK or service emulator. nativeFetch must be the
// browser's original fetch. It never manufactures success/receipt rows.
export function createLossFetch({nativeFetch,backendOrigin,readReservations,digest}) {
  let armed=null, consumed=false, dispatches=0, injected=0, callbacks=0,blockedReplays=0;
  const dispatchedOperations=new Set(), lockedRoutes=new Set();
  const actions={sendMessage:0,setAlias:0,markRead:0}; let last=null;
  const fetch=async(input,init)=>{
    callbacks++;
    // Require the raw string supplied by the published SDK. Request/URL objects
    // have already normalized paths and are deliberately unsupported.
    requireThat(typeof input==='string','RAW_URL_REQUIRED');
    requireThat(new URL(input).href===input&&!/[\s\\]/.test(input),'RAW_URL_REJECTED');
    const {path,method}=assertApiRequest(input,init?.method||'GET',backendOrigin);
    const action=mutationAction(method,path);
    if(action) {
      const lane=method+' '+path;
      if(lockedRoutes.has(lane)){blockedReplays++;requireThat(false,'REPLAY_BLOCKED');}
      // Synchronous, before the first await, across different bodies/auth/query.
      lockedRoutes.add(lane);
    }
    const request=new Request(input,init);
    let match=null;
    if(action) {
      const body=await request.clone().json();
      const records=await readReservations(); metadataOnly(records);
      const reservations=records.filter(r=>r.action===action&&r.backendNamespace===backendOrigin&&(action!=='sendMessage'||r.operationId===body.id));
      // Every dispatched mutation must already own one durable reservation.
      requireThat(reservations.length===1,'RESERVATION_REQUIRED');
      const r=reservations[0];
      if(dispatchedOperations.has(r.operationId)){blockedReplays++;requireThat(false,'REPLAY_BLOCKED');}
      if(action==='sendMessage') {
        requireThat(body&&Object.keys(body).sort().join(',')==='body,coach_id,id,sender_id,student_id','MESSAGE_SCHEMA_MISMATCH');
        requireThat(body.id===r.operationId&&body.student_id===r.studentId&&body.coach_id===r.scope.userId&&body.sender_id===r.scope.userId,'RESERVATION_MISMATCH');
        requireThat(await digest(['ncc-message-v1',body.student_id,body.coach_id,body.sender_id,body.body])===r.payloadDigest,'DIGEST_MISMATCH');
      }
      if(action==='setAlias'){
        requireThat(Object.keys(body).join(',')==='p_alias'&&typeof body.p_alias==='string'&&body.p_alias===body.p_alias.trim()&&Array.from(body.p_alias).length>=3&&Array.from(body.p_alias).length<=100,'ALIAS_SCHEMA_MISMATCH');
        // Exact candidate digest does not bind alias text. Never infer an alias receipt.
        requireThat(await digest(['ncc-mutation-v1','setAlias',[]])===r.payloadDigest,'DIGEST_MISMATCH');
      }
      if(action==='markRead'){
        const query=new URL(input).searchParams;
        requireThat(query.get('student_id')==='eq.'+r.studentId&&query.get('coach_id')==='eq.'+r.scope.userId&&query.get('sender_id')==='eq.'+r.studentId&&query.get('read_at')==='is.null','READ_FILTER_MISMATCH');
        requireThat(query.get('id')==='in.('+r.readIds.join(',')+')','READ_IDS_MISMATCH');
        requireThat(Object.keys(body).join(',')==='read_at'&&typeof body.read_at==='string'&&Number.isFinite(Date.parse(body.read_at)),'READ_BODY_MISMATCH');
        requireThat(await digest(['ncc-mutation-v1','markRead',r.readIds])===r.payloadDigest,'DIGEST_MISMATCH');
      }
      if(armed && armed.action===action && armed.operationId===null) {
        requireThat(armed.studentId===r.studentId,'LOSS_TARGET_MISMATCH');
        armed.operationId=r.operationId; match=r;
      }
      // Latch synchronously before the next await or network call. Never reset.
      dispatchedOperations.add(r.operationId);dispatches++;actions[action]++;
    }
    // SDK redirects may not change destination, even to another loopback port.
    const response=await nativeFetch(new Request(request,{redirect:'error',credentials:'omit',cache:'no-store'}));
    requireThat(!response.redirected&&(response.status<300||response.status>=400),'REDIRECT_REJECTED');
    if(match) {
      requireThat(!consumed && response.ok,'LOSS_REQUIRES_SUCCESSFUL_RESPONSE');
      // Consume the REAL successful response fully before hiding it from the SDK.
      // Do not use abort(), route.fulfill(), a timeout, or a synthetic receipt.
      await response.arrayBuffer();
      consumed=true;injected++;
      last={action,operationId:match.operationId,status:response.status,responseConsumed:true};
      throw Object.assign(new TypeError('RESPONSE_LOST_AFTER_CONSUMPTION'),{code:'RESPONSE_LOST_AFTER_CONSUMPTION'});
    }
    return response;
  };
  return Object.freeze({fetch,
    arm({action,studentId}) {
      requireThat(!armed&&!consumed&&['sendMessage','setAlias','markRead'].includes(action),'LOSS_ALREADY_ARMED');
      armed={action,studentId,operationId:null};
    },
    stats:()=>({callbacks,dispatches,blockedReplays,actions:{...actions},injected,last:last?{...last}:null})
  });
}
