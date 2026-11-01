import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCoachPrivateHistory,renderCoachPrivateHistory} from '../pilot/coach-private-history.js';
const id='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const org='33333333-3333-4333-8333-333333333333';
const profile={user_id:id,role:'student',active:true,organization_id:org};
const entry={route:'private',currentLegalAccepted:true,participationConfirmed:true,canLogMeals:false};
const rows={
 efg_profiles:{...profile},
 efg_daily_logs:[{student_id:id,log_day:'2026-10-30',meals:{desayuno:[{name:'<img src=x onerror=alert(1)>',qty:2,unit:'unidades'}]},skipped:{}}],
 efg_weights:[{student_id:id,measured_on:'2026-10-29',kg:78.5}],
 efg_goals:[{student_id:id,id:other,kcal:2200,protein_g:140,carb_g:240,fat_g:75}],
 efg_food_plans:{student_id:id,guided_goal_id:other,guided_plan:{meals:[{label:'Desayuno',items:[{name:'Huevos',qty:2,unit:'u'}]}]}},
 efg_weekly_reports:[{student_id:id,week_ending:'2026-10-30',report_text:'<script>alert(1)</script>'}],
 efg_payments:[{payer_id:id,created_at:'2026-10-30',amount_ars:5000,status:'pending'}]
};
const seen=[];
let authId=id;
let authReads=0;
const sb={auth:{async getUser(){authReads++;return {data:{user:{id:authId}},error:null};}},from(table){
 const query={select(fields){seen.push({table,fields});return query},eq(key,value){assert.equal(value,id);assert.equal(key,table==='efg_payments'?'payer_id':table==='efg_profiles'?'user_id':'student_id');return query},
 order(){return query},limit(){return Promise.resolve({data:rows[table],error:null})},maybeSingle(){return Promise.resolve({data:rows[table],error:null})}};
 return query;
}};
const h=await loadCoachPrivateHistory(sb,{profile,userId:id,entry});
assert.equal(seen.length,8,"Profile role/organization is checked before AND after historical SELECTs.");
assert.equal(authReads,2,'Auth identity must be verified before and after the six SELECTs');
assert.equal(seen[0].table,'efg_profiles');
assert.equal(h.logs.length,1);
const html=renderCoachPrivateHistory(h,{userId:id});
assert.match(html,/Mi historial, sin compartir la ficha/);
assert.match(html,/Huevos/);
assert.doesNotMatch(html,/corresponde a un objetivo anterior/);
assert.match(renderCoachPrivateHistory({...h,plan:{...h.plan,guided_goal_id:org}},{userId:id}),/corresponde a un objetivo anterior/);
assert.match(html,/5\.000/);
assert.match(html,/&lt;script&gt;/);
assert.doesNotMatch(html,/<script>|<img src=x|data-act=|data-tab=|type="file"/);
await assert.rejects(()=>loadCoachPrivateHistory(sb,{profile,userId:id,entry:{...entry,route:'legal'}}),/permiso/);
await assert.rejects(()=>loadCoachPrivateHistory(sb,{profile,userId:id,entry:{...entry,canLogMeals:true}}),/permiso/);
await assert.rejects(()=>loadCoachPrivateHistory(sb,{profile:{...profile,role:'coach'},userId:id,entry}),/permiso/);
await assert.rejects(()=>loadCoachPrivateHistory(sb,{profile,userId:id,entry:{...entry,currentLegalAccepted:false}}),/permiso/);
assert.throws(()=>renderCoachPrivateHistory(h,{userId:other}),/verificado/);
rows.efg_profiles={...profile,active:false};
await assert.rejects(()=>loadCoachPrivateHistory(sb,{profile,userId:id,entry}),/perfil vigente/);
rows.efg_profiles={...profile,organization_id:other};
await assert.rejects(()=>loadCoachPrivateHistory(sb,{profile,userId:id,entry}),/perfil vigente/);
rows.efg_profiles={...profile,role:'coach'};
await assert.rejects(()=>loadCoachPrivateHistory(sb,{profile,userId:id,entry}),/perfil vigente/);
rows.efg_profiles={...profile};
authId=other;
await assert.rejects(()=>loadCoachPrivateHistory(sb,{profile,userId:id,entry}),/sesión cambió/);
authId=id;
const switched={
 ...sb,
 from(table){
  const query=sb.from(table);
  if(table==='efg_payments')authId=other;
  return query;
 }
};
await assert.rejects(()=>loadCoachPrivateHistory(switched,{profile,userId:id,entry}),/sesión cambió/);
authId=id;
rows.efg_weights=[{student_id:other,kg:75}];
await assert.rejects(()=>loadCoachPrivateHistory(sb,{profile,userId:id,entry}),/no autorizado/);
// Revocation/transfer during in-flight reads cannot return an old-org snapshot.
rows.efg_weights=[{student_id:id,measured_on:'2026-10-29',kg:78.5}];
rows.efg_profiles={...profile};
let lateProfileReads=0;
const transferredDuringRead={...sb,from(table){
 if(table==='efg_profiles'&&++lateProfileReads===2)
  rows.efg_profiles={...profile,organization_id:other};
 return sb.from(table);
}};
await assert.rejects(()=>loadCoachPrivateHistory(transferredDuringRead,{profile,userId:id,entry}),
 /perfil vigente/);
assert.equal(lateProfileReads,2,"Second server profile read detects in-flight org transfer.");
rows.efg_profiles={...profile};
// The pilot route must not accidentally expose editable diary or payment actions.
const ui=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
assert.match(ui,/loadCoachPrivateHistory\(sb,\{profile:state\.profile,userId:id,entry:state\.coachPilotEntry\}\)/);
assert.match(ui,/renderCoachPrivateHistory\(state\.coachPrivateHistory,\{userId:state\.session\.user\.id\}\)/);
assert.match(ui,/\["private","review"\]\.includes\(state\.coachPilotEntry\?\.route\)/);
assert.match(ui,/\["history","⌂","Mi historial"\]/);
assert.match(ui,/if\(state\.coachPilotEntry\.route!=="ready"\)return render\(\)/);
console.log('PASS COACH-OPT-05: read-only private/review history, fresh Auth identity pre/post reads and server profile (inactive/transfer/role) checks, owner checks, escaped content and signed route integration');
