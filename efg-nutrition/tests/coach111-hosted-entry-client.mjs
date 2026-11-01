import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fetchCoachPilotEntry,validateCoachPilotEntryResponse} from '../pilot/coach-pilot-entry-client.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const org='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const profile={user_id:uid,organization_id:org,role:'student',active:true};
const base={route:'participation',can_log_meals:false,
 required_pilot_version:'coach_pilot_2026_demo1',
 required_intake_version:'coach_major_2026_r1',
 participation_confirmed:false,general_intake_shared:false,
 requires_separate_health_consent:true,legal_current_accepted:true};
const check=(parts,route,canLog=false)=>{
 const got=validateCoachPilotEntryResponse({...base,...parts});
 assert.equal(got.route,route);assert.equal(got.canLogMeals,canLog);
 assert.equal(got.medicalPermission===false||got.route==='verify',true);
};
check({},'participation');
check({route:'legal',participation_confirmed:false,general_intake_shared:false,
 legal_current_accepted:false},'legal');
check({route:'intake',participation_confirmed:true},'intake');
check({route:'private',participation_confirmed:true,general_intake_shared:false},'private');
check({route:'review',participation_confirmed:true,general_intake_shared:true},'review');
check({route:'ready',participation_confirmed:true,general_intake_shared:true,can_log_meals:true},'ready',true);
for(const bad of [
 {route:'ready',can_log_meals:false,participation_confirmed:true,general_intake_shared:true},
 {route:'ready',can_log_meals:true,general_intake_shared:true},
 {route:'ready',can_log_meals:true,participation_confirmed:true},
 {route:'review',can_log_meals:true,participation_confirmed:true,general_intake_shared:true},
 {route:'private',can_log_meals:true,participation_confirmed:true},
 {route:'private',general_intake_shared:true,participation_confirmed:true},
 {route:'intake',participation_confirmed:false},
 {route:'intake',participation_confirmed:true,general_intake_shared:true},
 {route:'participation',general_intake_shared:true},
 {route:'participation',can_log_meals:true},
 {route:'bad',can_log_meals:true},
 {requires_separate_health_consent:false},
 {required_intake_version:'old'},
 {required_pilot_version:'old'},
 {can_log_meals:'true'},
 {legal_current_accepted:false},
 {legal_current_accepted:undefined}
])assert.equal(validateCoachPilotEntryResponse({...base,...bad}).canLogMeals,false,
 'Invalid or stale server data never unlocks.');
let calls=0;
const client=(user,server,error=null)=>({auth:{getUser:async()=>({data:{user:{id:user}},error:null})},
 rpc:async fn=>{calls++;assert.equal(fn,'efg_coach_pilot_entry_status');return {data:server,error};}});
const ready={...base,route:'ready',can_log_meals:true,participation_confirmed:true,general_intake_shared:true};
assert.equal((await fetchCoachPilotEntry(client(uid,ready),{profile})).canLogMeals,true);
calls=0;
assert.equal((await fetchCoachPilotEntry(client(org,ready),{profile})).canLogMeals,false);
assert.equal(calls,0,'Wrong signed user must not read private status.');
assert.equal((await fetchCoachPilotEntry(client(uid,ready),{profile:{...profile,role:'coach'}})).canLogMeals,false);
assert.equal((await fetchCoachPilotEntry(client(uid,ready,'timeout'),{profile})).canLogMeals,false);
// The RPC started under A but the shared device signed in as B before readback.
const switched=client(uid,ready);
let who=0;
switched.auth.getUser=async()=>({data:{user:{id:++who===1?uid:org}},error:null});
assert.equal((await fetchCoachPilotEntry(switched,{profile})).canLogMeals,false);
assert.equal(who,2,'Recheck actual signed user AFTER the readiness RPC');
const sql=readFileSync(new URL('../migrations/20261030_coach_pilot_student_entry_status.sql',import.meta.url),'utf8');
const legalSql=readFileSync(new URL('../migrations/20261030_coach116_legal_first_student_status.sql',import.meta.url),'utf8');
assert.match(legalSql,/v_current_legal_count<>2/);
assert.match(legalSql,/efg_legal_current_status\(\)/);
assert.match(legalSql,/'legal_current_accepted',true/);
assert.match(sql,/v_uid uuid := auth\.uid\(\)/);
assert.match(sql,/p\.user_id=v_uid and p\.role='student' and p\.active=true/);
assert.match(sql,/r\.revoked_at is null/);
assert.match(sql,/v_route:='private'/);
assert.match(sql,/not v_sharing/);
assert.match(sql,/v_intake.shared_at is not null and v_follow_up and v_sharing/);
assert.doesNotMatch(sql,/r\.participation_accepted=true and r\.sharing_accepted=true/);
assert.match(sql,/v_plan\.published_at >= v_intake\.updated_at/);
assert.match(sql,/v_guide_goal=v_plan\.published_goal_id/);
assert.match(sql,/revoke all on function public\.efg_coach_pilot_entry_status\(\) from public,anon,authenticated/);
assert.doesNotMatch(sql,/\b(insert|update|delete|truncate)\s+(into|from|public\.)\s+public\.efg_(?:goals|food_plans|daily_logs)/i);
console.log('PASS COACH111: server-only authenticated Coach status, fail-closed clients, no health consent inferred; no legacy writes.');
