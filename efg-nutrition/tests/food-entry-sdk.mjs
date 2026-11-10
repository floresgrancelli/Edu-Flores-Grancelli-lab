// Synthetic-only transport for EV-03. Never imported in the production graph.
import {createClient as baseClient,bindApp,fixture} from './student-day-visual-sdk.mjs';
export {bindApp,fixture};
const control={writes:0,hold:false,fail:false,release:null};
globalThis.__NCC_FOOD_ENTRY_FIXTURE__=control;
export function createClient(url){
 const sdk=baseClient(url),from=sdk.from;
 sdk.from=table=>{
  if(table!=='efg_daily_logs')return from(table);
  let payload;
  const q=from(table),upsert=q.upsert;
  q.upsert=row=>{payload=structuredClone(row);return q;};
  const single=q.single;
  q.single=async()=>{
   if(!payload)return single();
   control.writes++;
   if(control.hold)await new Promise(resolve=>{control.release=resolve;});
   if(control.fail)return {data:null,error:{message:'EV-03 synthetic rejected write',code:'42501'}};
   upsert(payload);return single();
  };return q;
 };return sdk;
}
