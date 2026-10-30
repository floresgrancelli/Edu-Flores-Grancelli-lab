// NUT-60 Personal read-only workspace synthetic QA. NO user data or network.
import assert from "node:assert/strict";
import {PERSONAL_WORKSPACE_ENABLED,PERSONAL_MEALS,assertPersonalAccess,
 loadPersonalWorkspace,guideMeals,renderPersonalWorkspace} from "../pilot/personal-workspace.js";
assert.equal(PERSONAL_WORKSPACE_ENABLED,false,"A real release cannot enable staging-only backend.");
assert.deepEqual(PERSONAL_MEALS.map(x=>x.id),["desayuno","media_manana","almuerzo","media_tarde","cena"]);
const a="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const b="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const day="2026-10-30";
const profile={user_id:a,nickname:'Ana <img src=x onerror="alert(1)">',role:"personal",active:true,organization_id:null};
const account={user_id:a},legalStatus=[{document_id:"terms",accepted:true},{document_id:"privacy",accepted:true}];
const goal={user_id:a,revision:2,goal_type:"recomp",kcal:2200,protein_g:125,carb_g:260,fat_g:70,fiber_g:30};
const guide={user_id:a,revision:2,goal_revision:2,guide:{kind:"five_meal_example",meals:PERSONAL_MEALS.map(s=>({
 slot:s.id,items:[{id:"synthetic",name:'Pollo <svg onload="bad()">',grams:120}]
}))}};
const diary={user_id:a,log_day:day,meals:{desayuno:[{id:"egg",label:"Huevos",grams:100}]},
 totals:{k:490,p:34,c:50,f:13}};
const habituals=[{id:"h1",user_id:a,meal_slot:"desayuno",name:"Tostadas & huevos <script>bad()</script>",items:[]}];
assert.equal(assertPersonalAccess({profile,userId:a,account,legalStatus}),true);
for(const changed of [
 {profile:{...profile,role:"student"}},{profile:{...profile,role:"coach"}},
 {profile:{...profile,role:"admin"}},{profile:{...profile,active:false}},
 {profile:{...profile,organization_id:b}},{profile:{...profile,user_id:b}},
 {account:{user_id:b}},{legalStatus:[{document_id:"terms",accepted:true}]},
 {legalStatus:[{document_id:"terms",accepted:true},{document_id:"terms",accepted:true}]},
 {legalStatus:[{document_id:"terms",accepted:true},{document_id:"privacy",accepted:false}]}
]){
 assert.throws(()=>assertPersonalAccess({profile,userId:a,account,legalStatus,...changed}),
  /verificad|cuenta|legales/,JSON.stringify(changed));
}
const fetched=[];
function client({override={},failure=null}={}){
 const data={efg_personal_accounts:account,efg_personal_goals:[goal],
  efg_personal_guides:[guide],efg_personal_daily_logs:diary,efg_personal_habitual_meals:habituals,...override};
 return {
  rpc(name){assert.equal(name,"efg_legal_current_status");fetched.push(name);return Promise.resolve({data:override.legalStatus??legalStatus,error:failure==="legal"?new Error("fail"):null});},
  from(table){
   fetched.push(table);
   assert.ok(Object.hasOwn(data,table),"Only Personal tables can be requested");
   const chained={
    select(){return chained;},
    eq(key,value){assert.ok(key==="user_id"&&value===a||key==="log_day"&&value===day);return chained;},
    order(){return chained;},
    limit(){return chained;},
    maybeSingle(){return Promise.resolve({data:data[table],error:failure===table?new Error("fail"):null});},
    then(resolve,reject){return Promise.resolve({data:data[table],error:failure===table?new Error("fail"):null}).then(resolve,reject);}
   };
   return chained;
  }
 };
}
async function rejected(input,regexp){await assert.rejects(()=>loadPersonalWorkspace(client(),input),regexp);}
await rejected({profile:{...profile,role:"student"},userId:a,day},/perfil Autogestión/);
assert.equal(fetched.length,0,"An unverified role must NEVER query even account existence.");
await rejected({profile,userId:b,day},/perfil Autogestión/);
await rejected({profile,userId:a,day:"2026-11-31"},/fecha|perfil Autogestión/);
const snap=await loadPersonalWorkspace(client(),{profile,userId:a,day});
assert.equal(snap.verified,true);
assert.equal(snap.goal.kcal,2200);
assert.equal(snap.guide.goal_revision,2);
assert.ok(fetched.every(t=>t==="efg_legal_current_status"||t.startsWith("efg_personal_")),
 "Read-only Personal may not query legacy Coach/Student tables.");
const html=renderPersonalWorkspace(snap);
for(const label of ["Mis objetivos","Mis cinco comidas","Desayuno","Media mañana","Almuerzo","Media tarde","Cena","2.200","490"]){
 assert.ok(html.includes(label),label);
}
assert.ok(html.includes("&lt;svg"),"Food names are escaped");
assert.ok(html.includes("&lt;script&gt;"),"Habitual names are escaped");
assert.ok(html.includes("&lt;img"),"Nickname is escaped");
assert.doesNotMatch(html,/<script|<img src=x|<svg onload/i,"Untrusted HTML must never render as elements");
assert.doesNotMatch(html,/data-act="(?:save|approve|grant|send|register)/,"Read-only view cannot forge writes.");
assert.doesNotMatch(html,/data-tab="admin"|data-tab="coach"/);
assert.ok(html.includes('data-act="logout"'));
assert.equal(guideMeals({...guide,goal_revision:1},goal),null,"No stale goal-mismatched guide.");
assert.equal(guideMeals({...guide,guide:{...guide.guide,meals:guide.guide.meals.slice(1)}},goal),null);
assert.equal(guideMeals({...guide,guide:{...guide.guide,meals:[guide.guide.meals[0],...guide.guide.meals.slice(0,4)]}},goal),null);
assert.equal(guideMeals(guide,goal).length,5);
await assert.rejects(()=>loadPersonalWorkspace(client({override:{legalStatus:[...legalStatus.slice(0,1)]}}),
 {profile,userId:a,day}),/legales/);
await assert.rejects(()=>loadPersonalWorkspace(client({override:{efg_personal_accounts:{user_id:b}}}),
 {profile,userId:a,day}),/cuenta independiente/);
await assert.rejects(()=>loadPersonalWorkspace(client({override:{efg_personal_daily_logs:{...diary,user_id:b}}}),
 {profile,userId:a,day}),/no corresponde/);
await assert.rejects(()=>loadPersonalWorkspace(client({failure:"efg_personal_guides"}),
 {profile,userId:a,day}),/verificar/);
assert.throws(()=>renderPersonalWorkspace({...snap,verified:false}),/verificado/);
assert.throws(()=>renderPersonalWorkspace({...snap,diary:{...diary,user_id:b}}),/verificado/);
console.log("PASS NUT-60 read-only Personal: signed server data contract, role/org/legal gates, owner isolation, five slots, goal revision, escaped content and no Coach/Student access or writable UI.");
