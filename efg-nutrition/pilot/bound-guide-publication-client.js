// Dormant adapter. Uses existing COACH119 publisher, never a direct table write.
import {createCoachPlanDraftClient} from './coach-plan-draft-client.js';
import {adaptedScopeKey} from './coach-adapted-workspace.js';
export function createBoundGuidePublication({sb,readScope,enabled=false}={}){
 return {async publish(options){
  if(enabled!==true||options?.confirmed!==true)throw Error('Publicación no habilitada o no confirmada.');
  const scope=readScope(),key=adaptedScopeKey(scope);
  if(!key||!scope.sessionId||!Number.isSafeInteger(scope.sourceEpoch)||scope.sourceEpoch<1||options.studentId!==scope.studentId)throw Error('STALE_PUBLICATION_CONTEXT');
  const guard=()=>{if(adaptedScopeKey(readScope())!==key)throw Error('STALE_PUBLICATION_CONTEXT');};
  const checked={...sb,from:(...args)=>{guard();return sb.from(...args);},
   auth:{...sb.auth,getUser:async()=>{guard();const r=await sb.auth.getUser();guard();return r;}},
   rpc:async(name,args)=>{guard();if(name!=='efg_publish_coach_plan_draft_atomic'||args.p_student!==scope.studentId)throw Error('PUBLICATION_ENDPOINT_REJECTED');
    const r=await sb.rpc(name,args);guard();return r;}};
  const client=createCoachPlanDraftClient({sb:checked,enabled:true,relaunchEnabled:true,versionedBackendVerified:true});
  const result=await client.publish(options);guard();return result;
 }};
}
