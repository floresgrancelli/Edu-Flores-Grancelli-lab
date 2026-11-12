// Local navigation fixture only. Never imported by production; no hosted I/O.
import {createClient as base,bindApp as baseBind,fixture} from './workspace-tabs-sdk.mjs';
export {fixture};
let app;
const model={roster:[],grants:{},access:[],reads:[],writes:[],signedChecks:0};
globalThis.__NCC_COACH_ACTIONS_FIXTURE__=model;
export function bindApp(hooks){app=hooks;baseBind(hooks);}
export function createClient(url){
 const sdk=base(url),from=sdk.from,getUser=sdk.auth.getUser;
 sdk.auth.getUser=async()=>{model.signedChecks++;return getUser();};
 sdk.from=table=>{
  const supported=['efg_profiles','efg_invitations','efg_consents','efg_student_plan_access','efg_coach_relaunch_intakes','efg_goals','efg_coach_plan_drafts','efg_daily_logs','efg_weights','efg_activities','efg_food_plans','efg_weekly_reports'];
  let q;
  if(!supported.includes(table))q=from(table);
  else{
   const filters=[];
   const rows=()=>{
    model.reads.push({table,filters:structuredClone(filters)});
    let data=table==='efg_profiles'?[...(model.roster||[]),app?.state.profile].filter(Boolean):table==='efg_consents'?Object.entries(model.grants).map(([student_id,accepted])=>({student_id,accepted,organization_id:app?.state.org?.id})):table==='efg_student_plan_access'?model.access:[];
    return structuredClone(data.filter(row=>filters.every(([op,k,v])=>op==='eq'?row[k]===v:op==='in'?v.includes(row[k]):op==='not'?row[k]!==v:true)));
   };
   q={select(){return q},eq(k,v){filters.push(['eq',k,v]);return q},in(k,v){filters.push(['in',k,v]);return q},not(k,op,v){filters.push(['not',k,v]);return q},gte(){return q},lte(){return q},order(){return q},limit(){return q},range(){return q},single:async()=>({data:rows()[0]||null,error:null}),maybeSingle:async()=>({data:rows()[0]||null,error:null}),then(resolve){resolve({data:rows(),error:null})}};
  }
  for(const op of ['insert','upsert','update','delete'])q[op]=()=>{model.writes.push({table,operation:op});throw Error('Navigation fixture forbids writes');};
  return q;
 };
 return sdk;
}
