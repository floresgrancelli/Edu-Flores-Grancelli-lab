import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStudentFoodRestrictionReader,readStudentFoodRestrictions} from '../pilot/student-food-restrictions.js';
import {describeTrafficLight} from '../pilot/food-compatibility-adapter.js';
const user='11111111-1111-4111-8111-111111111111',org='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333';
const context={userId:user,organizationId:org,epoch:1,intakeRevision:1,allowed:true};
const base={student_id:user,viewer_id:user,organization_id:org,revision:2,processing_consent:true,
 shared_with_coach:false,followup_consent:false,conditions:{celiac:'confirmed',lactose_intolerance:'suspected'}};
const read=r=>readStudentFoodRestrictions(r,context);
assert.deepEqual(read(base).restrictions,['celiac','lactose_intolerance']);
for(const row of [null,{...base,student_id:other},{...base,viewer_id:other},{...base,organization_id:other},
 {...base,processing_consent:false},{...base,revoked:true},{...base,revision:0},{...base,conditions:[]},
 {...base,conditions:{}},{...base,conditions:{celiac:'not_reported'}},{...base,conditions:{fake:'confirmed'}}])
 assert.equal(read(row).status,'unknown');
const none={...base,conditions:{},restriction_declaration:{kind:'none_declared',version:1,
 declared_by:user,source_revision:2,confirmed_at:new Date(Date.now()-1000).toISOString()}};
assert.equal(read(none).status,'none_declared');
for(const delta of [{source_revision:1},{declared_by:other},{confirmed_at:'2999-01-01T00:00:00Z'}])
 assert.equal(read({...none,restriction_declaration:{...none.restriction_declaration,...delta}}).status,'unknown');
function fixture(enabled=true){
 let c={...context},row=base,afterAuth=null,afterRpc=null;const calls=[];
 const sb={auth:{getUser:async()=>{calls.push('auth');await afterAuth?.();return {data:{user:{id:user}}};}},
  rpc:async(name,args)=>{calls.push(name);assert.equal(args.p_student,user);await afterRpc?.();return {data:row};}};
 const reader=createStudentFoodRestrictionReader({sb,readContext:()=>c,enabled});
 return {reader,calls,row:r=>row=r,change:d=>c={...c,...d},auth:f=>afterAuth=f,rpc:f=>afterRpc=f};
}
{
 const f=fixture(false);await f.reader.refresh();assert.deepEqual(f.calls,[]);
}
{
 const f=fixture();f.change({allowed:false});await f.reader.refresh();assert.deepEqual(f.calls,[]);
}
{
 const f=fixture();await f.reader.refresh();assert.equal(f.reader.current().status,'declared');
 const value=f.reader.current();value.restrictions.length=0;assert.equal(f.reader.current().restrictions.length,2);
 f.row(none);await f.reader.refresh();assert.equal(f.reader.current().status,'none_declared');
 f.row({revision:3,revoked:true,conditions:{}});await f.reader.refresh();assert.equal(f.reader.current().status,'unknown');
 f.row(base);await f.reader.refresh();f.change({organizationId:other});assert.equal(f.reader.current().status,'unknown');
 f.reader.invalidate();assert.equal(f.reader.current().status,'unknown');
}
for(const phase of ['auth','rpc']){
 const f=fixture();f[phase](()=>f.change({userId:other,epoch:2}));
 await f.reader.refresh();assert.equal(f.reader.current().status,'unknown');
 if(phase==='auth')assert.deepEqual(f.calls,['auth'],'No RPC after changed identity');
}
{
 const f=fixture();await f.reader.refresh();f.rpc(()=>{throw Error('offline');});
 await f.reader.refresh();assert.equal(f.reader.current().status,'unknown','Failed refresh cannot retain old declaration');
}
// Execute actual shared food and recipe rendering functions, not a duplicate.
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const shared=app.slice(app.indexOf('function foodCompatibilityRestrictions(){'),app.indexOf('async function refreshFoodCompatibilityEvidence(){'));
const recipe=app.slice(app.indexOf('function recipeFoodSignal('),app.indexOf('// Recipes remain visible as history;'));
const factory=new Function('env',`const {state,foods,PRIVATE_HEALTH_DECLARATION_UI_ENABLED,describeTrafficLight}=env;
 const FOOD_COMPATIBILITY_ENABLED=true,compatibilityPattern=()=> 'balanced';
 ${shared}\n${recipe}\nreturn foodTrafficLight;`);
{
 const f=fixture();const state={profile:{role:'student'},foodRestrictionReader:f.reader,foodCompatEvidence:[]};
 const food={id:'banana'},recipeFood={id:'recipe',recipeIngredients:[{foodId:'banana',grams:100}]};
 const signal=factory({state,foods:[food],PRIVATE_HEALTH_DECLARATION_UI_ENABLED:true,describeTrafficLight});
 assert.equal(signal(food).color,'yellow','Unknown must not masquerade as no restrictions');
 await f.reader.refresh();assert.equal(signal(food).color,'yellow');assert.equal(signal(recipeFood).color,'yellow');
 assert.equal(signal(food).canRecord,true);assert.equal(signal(recipeFood).canRecord,true);
 f.row(none);await f.reader.refresh();assert.equal(signal(food).color,'neutral');assert.equal(signal(recipeFood).color,'neutral');
 f.row(null);await f.reader.refresh();assert.equal(signal(recipeFood).color,'yellow');
 const off=factory({state,foods:[food],PRIVATE_HEALTH_DECLARATION_UI_ENABLED:false,describeTrafficLight});
 assert.equal(off(food).color,'neutral','OFF does not enable private health flow');
}
assert.match(app,/await state\.foodRestrictionReader\.refresh\(\);\s*if\(\(state\.authContextEpoch\|\|0\)!==renderEpoch\)return;/);
assert.match(app,/function resetPrivateSession\(\)\{\s*state\.foodRestrictionReader\?\.invalidate\?\.\(\);/);
assert.match(app,/function allowedFoods\(\)\{\s*return selectableFoods\(\)\.map/,'Never filter catalog by traffic light');
console.log('PASS actual food/recipe signals + private read-only scope: OFF, missing vs none, consent, revoke, refresh failure, identity/tenant race; no catalog filtering. Synthetic transport, not hosted.');
