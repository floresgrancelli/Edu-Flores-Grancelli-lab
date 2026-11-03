// COACH105: diet and fasting catalog must match real Coach intake selector, server SQL
// and shared engine. All mock examples; no automatic therapeutic diet.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DIET_PATTERNS,EATING_WINDOWS,distributeDailyTargets,evaluatePattern,evaluateEatingWindow} from '../pilot/diet-pattern-workbench.js';
const form=readFileSync(new URL('../pilot/coach-relaunch-entry-client.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../docs/COACH_RELAUNCH_REONBOARDING_STAGING_ONLY.sql',import.meta.url),'utf8');
const onboarding=readFileSync(new URL('../pilot/coach-relaunch-onboarding.js',import.meta.url),'utf8');
const patterns=['mediterranean','dash','vegetarian','vegan','pescatarian','flexitarian','portfolio','low_carb','keto'];
for(const key of patterns){
 assert.ok(DIET_PATTERNS.some(x=>x.id===key),'Engine missing '+key);
 assert.ok(form.includes('["'+key+'",'),'UI missing '+key);
 assert.ok(sql.includes("'"+key+"'"),'Server missing '+key);
}
for(const key of ['regular','12_12','14_10','16_8']){
 assert.ok(EATING_WINDOWS.some(x=>x.id===key));
 assert.ok(form.includes('["'+key+'",'),'UI window missing '+key);
 assert.ok(sql.includes("'"+key+"'"),'Server window missing '+key);
}
assert.match(form,/select\("dietary_pattern","Patrón alimentario"/);
assert.match(form,/select\("eating_window","Organización horaria/);
assert.match(form,/eating_window:choice\("eating_window"\)/);
assert.match(form,/eating_window:"regular"/);
assert.match(form,/\.select\("student_id,organization_id,completed_version,revision,[^"]*eating_window/);
assert.match(sql,/eating_window text not null default 'regular'/);
assert.match(sql,/p_payload->>'eating_window'/);
assert.match(sql,/eating_window=excluded\.eating_window/);
assert.match(onboarding,/eating_window:"regular"/);
const goal={k:2200,p:150,c:245,f:65};
for(const id of ['regular','12_12','14_10','16_8']){
 const res=distributeDailyTargets({targets:goal,windowId:id,startTime:'08:00',mealCount:3});
 assert.equal(res.preserved,true);
 for(const key of ['k','p','c','f']){
  const calculated=Math.round(res.meals.reduce((a,x)=>a+x.targets[key],0)*10)/10;
  assert.equal(calculated,goal[key],'Window '+id+' must not change '+key);
 }
 assert.equal(res.dailyTargets.k,2200);
}
assert.equal(evaluatePattern({patternId:'keto'}).requiresReview,true);
assert.equal(evaluateEatingWindow({windowId:'16_8',healthFlags:['pregnancy']}).requiresReview,true);
assert.equal(evaluateEatingWindow({windowId:'14_10',healthFlags:['diabetes']}).requiresReview,true);
assert.match(form,/Keto y ayuno no se aplican automáticamente ni reducen por sí solos tus calorías/);
console.log('PASS COACH105: keto, DASH, Portfolio, 5+ patterns, 12/12 14/10 16/8 form and staged SQL aligned; 2200 kcal and P/HC/G conserved across eating windows. No clinical auto-prescription.');
