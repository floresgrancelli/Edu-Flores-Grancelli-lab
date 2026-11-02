// PRIVATE PREPARED TEST. No execution claimed. Synthetic diary values, no health advice.
import assert from 'node:assert/strict';
import {buildLuxuryWeeklyReport as build,reportAsStoredText as store,parseLuxuryWeeklyReport as parse,renderLuxuryWeeklyReport as render,LUXURY_WEEKLY_KIND} from '../pilot/weekly-luxury-report.js';
const from='2026-10-23',to='2026-10-29',friday='2026-10-30';
const day=(i,fi)=>({date:'2026-10-'+(23+i),hasData:true,closed:true,mealCount:2,k:2000,p:100,c:250,f:60,...(fi===undefined?{}:{fi})});
const goal=(start_on,fiber_g)=>({start_on,kcal:2000,protein_g:100,carb_g:250,fat_g:60,fiber_g});
const base={from,to,friday,studentName:'TEST_ONLY',coachName:'TEST_ONLY',days:[day(0),day(1),day(2)],goals:[goal(from,25)]};
const absent=build(base);assert.equal(absent.averages.fi,null);assert.equal(absent.targets.fi,null);assert.equal(absent.fiber.daysMeasured,0);assert.ok(absent.days.every(d=>d.fi===null));assert.match(render(absent),/sin datos medidos/);
const zero=build({...base,days:[day(0,0)]});assert.equal(zero.averages.fi,0);assert.equal(zero.fiber.daysMeasured,1);assert.equal(zero.fiber.comparedAverage,0);assert.equal(zero.targets.fi,25);assert.match(render(zero),/0,0 g de promedio/);
const partial=build({...base,days:[day(0,0),day(1),day(2,20)]});assert.equal(partial.averages.fi,10);assert.equal(partial.fiber.daysMeasured,2);assert.equal(partial.days[1].fi,null);assert.equal(partial.days[6].fi,null);
const changing=build({...base,days:[day(0,0),day(1,10),day(2,20)],goals:[goal(from,20),goal('2026-10-24',30),goal('2026-10-30',999)]});
assert.equal(changing.targets.fi,80/3);assert.deepEqual(changing.days.slice(0,3).map(d=>d.fiberTarget),[20,30,30]);assert.equal(changing.fiber.comparedAverage,10);
const missingGoal=build({...base,days:[day(0,0),day(1,10),day(2,20)],goals:[goal('2026-10-24',30)]});assert.equal(missingGoal.averages.fi,10);assert.equal(missingGoal.targets.fi,null);assert.equal(missingGoal.fiber.daysCompared,2);assert.equal(missingGoal.fiber.comparedAverage,15);assert.equal(missingGoal.fiber.comparedTarget,30);assert.match(render(missingGoal),/2 fechas con dato y meta vigente: 15,0 g registrados \/ 30,0 g/);
const conflictingGoals=build({...base,days:[day(0,10)],goals:[goal(from,20),goal(from,30)]});assert.equal(conflictingGoals.fiber.daysCompared,0);assert.equal(conflictingGoals.targets.fi,null);
for(const fi of [null,undefined,NaN,Infinity,-1,true,'',[],{}])assert.equal(build({...base,days:[day(0,fi)]}).averages.fi,null);
// General reducer's inferred zero cannot override missing source item fiber.
const raw=(items,skipped={})=>[{log_day:from,meals:{desayuno:items},skipped}];
assert.equal(build({...base,days:[day(0,0)],logs:raw([{name:'UNKNOWN'}])}).averages.fi,null);
assert.equal(build({...base,days:[day(0,999)],logs:raw([{name:'ZERO',fi:0}])}).averages.fi,0);
assert.equal(build({...base,days:[day(0,0)],logs:raw([{fi:4},{name:'UNKNOWN'}])}).averages.fi,null);
assert.equal(build({...base,days:[day(0,0)],logs:raw([{fi:4}],{desayuno:true})}).averages.fi,null);
assert.equal(build({...base,days:[day(0,0)],logs:[...raw([{fi:4}]),...raw([{fi:4}])]}).averages.fi,null,'Unresolved duplicate raw diary is not measured');
assert.equal(build({...base,days:[day(0,0)],logs:raw([{fi:4},{fi:7}])}).averages.fi,11);
// dailyTotals source population includes sports/supplements, including zero.
const withSports=sports=>({...base,days:[day(0,4)],logs:[{...raw([{fi:4}])[0],sports}]});
const sportSum=build(withSports([{name:'TEST_ONLY supplement',fi:7}]));
assert.equal(sportSum.averages.fi,11);assert.equal(sportSum.days[0].fi,11);assert.equal(sportSum.fiber.daysMeasured,1);
assert.equal(build(withSports([{fi:0}])).averages.fi,4);
for(const sports of [[{name:'UNKNOWN supplement'}],[{fi:null}],[{fi:undefined}],[{fi:-1}],[{fi:Infinity}],[{fi:true}],[{fi:''}],[null],['malformed'],{},'malformed',0,false]){
 const m=build(withSports(sports));assert.equal(m.averages.fi,null);assert.equal(m.fiber.daysMeasured,0);assert.equal(m.days[0].fi,null);
}
for(const sports of [undefined,null,[]])assert.equal(build(withSports(sports)).averages.fi,4,'Legacy absent sports is empty, not an invented nutrient');
assert.equal(build({...base,days:[day(0,7)],logs:[{log_day:from,sports:[{fi:7}]}]}).averages.fi,7,'Sports-only diary uses the same sources');
assert.equal(build({...base,days:[day(0,7)],logs:[{log_day:from,meals:{desayuno:[{fi:4}]},skipped:{desayuno:true},sports:[{fi:7}]}]}).averages.fi,7,'Omitting a meal does not omit sports');
const sportText=store(sportSum,sportSum.conclusion,sportSum.flexibleNote);
assert.equal(parse(sportText).days[0].fi,11);assert.equal(store(parse(sportText),sportSum.conclusion,sportSum.flexibleNote),sportText);
const serialized=store(changing,changing.conclusion,changing.flexibleNote),parsed=parse(serialized);assert.ok(parsed);assert.deepEqual(parsed.days,changing.days);assert.deepEqual(parsed.fiber,changing.fiber);assert.equal(store(parsed,parsed.conclusion,parsed.flexibleNote),serialized);
for(const mutate of [m=>m.fiber.daysMeasured++,m=>m.days[0].fi=null,m=>m.targets.fi=999,m=>delete m.fiber,m=>m.days[1].fiberTarget=-1]){
 const m=structuredClone(parsed);mutate(m);assert.equal(parse(JSON.stringify(m)),null,'Reject inconsistent stored fiber extension');
}
// Explicit pre-extension shape, not regenerated from today's goals or sources.
const legacy={kind:LUXURY_WEEKLY_KIND,studentName:'TEST_ONLY',coachName:'TEST_ONLY',from,to,friday,daysRecorded:1,daysClosed:1,
 days:Array.from({length:7},(_,i)=>({date:'2026-10-'+(23+i),hasData:i===0,closed:i===0,mealCount:null,k:i===0?2000:null,p:i===0?100:null,c:i===0?250:null,f:i===0?60:null})),
 averages:{k:2000,p:100,c:250,f:60},targets:{k:2000,p:100,c:250,f:60},focus:[],topFoods:[],conclusion:'Conclusión histórica intacta.',flexibleNote:'Nota histórica intacta.',approvedByCoach:true};
const oldText=JSON.stringify(legacy),old=parse(oldText);assert.ok(old);assert.equal(JSON.stringify(old),oldText);assert.equal(store(old,old.conclusion,old.flexibleNote),oldText);assert.match(render(old),/Fibra: sin dato consolidado/);assert.equal(Object.hasOwn(old.averages,'fi'),false);
console.log('PASS prepared fiber absent/partial/zero, aligned historical goals, raw-item coverage and historical serialization');
