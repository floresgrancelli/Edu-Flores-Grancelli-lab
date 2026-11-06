// Execute actual menu functions; permissions are checked independently of labels.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const funcs=source.slice(source.indexOf('function studentRestrictedNavigation'),source.indexOf('function frame(content)'));
for(const route of ['private','review','ready'])for(const pending of [false,true])for(const enabled of [false,true]){
 const c={state:{coachPilotEntry:{route}},studentPlanPending:()=>pending,COACH_STUDENT_JOURNEY_ENABLED:true,PRIVATE_HEALTH_DECLARATION_UI_ENABLED:enabled};vm.createContext(c);vm.runInContext(funcs,c);
 const primary=JSON.parse(JSON.stringify(c.studentPrimaryNavigation())),secondary=JSON.parse(JSON.stringify(c.studentSecondaryNavigation()));
 const restricted=pending||route!=='ready';const ids=new Set([...primary,...secondary].map(x=>x[0]));
 assert.ok(primary.length<=5);assert.equal(new Set(primary.map(x=>x[0])).size,primary.length);
 for(const id of ['intake','messages','privacy','nutritionScience','studentMore'])assert.ok(ids.has(id),route+' preserves '+id);
 assert.equal(ids.has('privateHealth'),enabled,'Health destination follows feature permission');
 if(restricted){for(const id of ['home','planner','weight','recipes','payments'])assert.ok(!ids.has(id),'Restricted route must not expose '+id);}
 else for(const id of ['home','planner','weight','recipes','supplements','sport','summaries','payments','notifications'])assert.ok(ids.has(id),'Ready route preserves '+id);
 assert.equal(c.studentPendingTabAllowed('planner'),false);assert.equal(c.studentPendingTabAllowed('home'),false);
 for(const id of ['intake','messages','privacy','nutritionScience','studentMore'])assert.equal(c.studentPendingTabAllowed(id),true);
 assert.equal(c.studentPendingTabAllowed('privateHealth'),enabled);
 assert.equal(c.studentPendingTabAllowed('history'),route!=='ready','Private/review history stays reachable');
}
assert.match(source,/if\(studentPlanPending\(\)&&!studentPendingTabAllowed\(state\.tab\)\)state\.tab="intake"/);
assert.match(source,/state\.tab=studentPlanPending\(\)&&!studentPendingTabAllowed\(el\.dataset\.tab\)\?"intake":el\.dataset\.tab/);
assert.match(source,/else if\(state\.tab==="studentMore"\)frame\(studentMoreView\(\)\)/);
console.log('PASS student navigation: 12 role-state/feature scenarios, all destinations and pending gates');
