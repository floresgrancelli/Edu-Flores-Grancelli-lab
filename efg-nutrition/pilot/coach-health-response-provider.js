// Read-only response binding. No endpoint, JWT, storage or UI activation here.
import {adaptedScopeKey} from './coach-adapted-workspace.js';
const token=s=>adaptedScopeKey(s)&&typeof s.sessionId==='string'&&s.sessionId&&
 Number.isSafeInteger(s.sourceEpoch)&&s.sourceEpoch>0?JSON.stringify([adaptedScopeKey(s),s.sessionId,s.sourceEpoch]):null;
const unavailable=status=>({status});
export function createCoachHealthResponseProvider({readScope,readHealth}={}){
 let generation=0;
 return {
  invalidate(){generation++;},
  async read({expectedRevision}={}){
   const ticket=++generation,s=structuredClone(readScope()),before=token(s);
   if(!before)return unavailable('no_permission');
   let row;
   try{row=await readHealth({studentId:s.studentId});}catch{return unavailable('unavailable');}
   if(ticket!==generation||before!==token(readScope()))return unavailable('stale');
   if(!row)return unavailable('missing_or_denied');
   if(row.viewer_id!==s.userId||row.student_id!==s.studentId||row.organization_id!==s.organizationId)
    return unavailable('scope_mismatch');
   if(row.revoked||row.processing_consent!==true||row.followup_consent!==true||row.shared_with_coach!==true)
    return unavailable('no_permission');
   if(!Number.isSafeInteger(row.revision)||row.revision<1||
    (expectedRevision!==undefined&&row.revision!==expectedRevision))return unavailable('stale');
   const binding=Object.fromEntries(['userId','sessionId','studentId','organizationId','sourceEpoch'].map(k=>[k,s[k]]));
   return {status:'available',binding,data:structuredClone(row)};
  }
 };
}
