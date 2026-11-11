import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('function plannerFoodSignal('),source.indexOf('function plannerCard('));
const catalog=[{id:'blocked',color:'red'},{id:'unknown',color:'yellow'},{id:'reviewed',color:'green'}];
let studentReads=0;
const state={profile:{role:'student'},selectedStudent:'another-person'};
const context={state,selectableFoods:()=>catalog,foodTrafficLight:f=>{studentReads++;return {color:f.color};},describeTrafficLight:(_f,c)=>{assert.equal(c.pattern,'balanced');assert.deepEqual(Array.from(c.restrictions),['health_status_unknown']);return {color:'yellow'};},recipeFoodSignal:()=>({color:'yellow'})};
runInNewContext(helpers+';globalThis.result=plannerSuggestionFoods();',context);
assert.deepEqual(Array.from(context.result,f=>f.id),['unknown','reviewed']);
assert.equal(studentReads,3);
for(const role of ['coach','admin']){
 state.profile.role=role;studentReads=0;
 runInNewContext('globalThis.result=plannerSuggestionFoods();',context);
 assert.equal(studentReads,0,'Personal suggestions must not read selected student context');
 assert.equal(context.result.length,3,'Unknown health status is not a prohibition');
}
console.log('Planner suggestion scope and known-incompatibility checks PASS');
