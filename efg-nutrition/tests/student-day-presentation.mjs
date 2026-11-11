import assert from 'node:assert/strict';
import {studentDayWelcome,studentDayDashboard,compactDaySummary} from '../pilot/student-day-presentation-b13c52657593.js';
import {pastelDaySummary} from '../pilot/pastel-day.js';

const slots=[['desayuno','Desayuno'],['media_manana','Media mañana'],['almuerzo','Almuerzo'],['media_tarde','Media tarde'],['merienda','Merienda'],['cena','Cena']];
const diary={meals:Object.fromEntries(slots.map(([id])=>[id,[]])),skipped:{}};
const totals={k:2480,p:182,c:294,f:64,fi:30},goal={k:2200,p:150,c:250,f:66,fi:30};
const original=structuredClone({diary,totals,goal});
const page=studentDayDashboard({totals,goal,diary,mealSlots:slots,hasGuide:true});
assert.match(page,/2.480/);assert.match(page,/182 \/ 150 g/);assert.match(page,/ncc-focus-summary/);assert.doesNotMatch(page,/efg-pastel-ring|registerDayFood/);
assert.match(page,/\+280/,'Over-goal amount remains visible');
assert.doesNotMatch(page,/ncc-day-guide-card/,'Guide is the existing compact disclosure in homeView');
assert.doesNotMatch(page,/data-setmeal=/,'Overview CTA must not pick a meal or register automatically');
assert.deepEqual({diary,totals,goal},original,'Presentation does not mutate records or targets');
const pending=studentDayDashboard({totals,goal:null,diary,mealSlots:slots,hasGuide:false});
assert.match(pending,/sin meta de kcal/);
assert.match(pending,/data-tab="messages"/);
assert.doesNotMatch(pending,/data-student-day-guide=/,'Unavailable guide has no active opener');
const welcome=studentDayWelcome('<img src=x onerror=alert(1)>','2026-11-10');
assert.match(welcome,/&lt;img/);assert.doesNotMatch(welcome,/<img/);
assert.match(welcome,/datetime="2026-11-10"/);assert.match(welcome,/10\/11\/2026/);
console.log('PASS student day presentation: existing totals, over-goal, no goal/guide, no mutation, escaped identity.');

for(const [k,target,label] of [[1250,2000,'750'],[2300,2000,'+300'],[2000,2000,'0']]){const out=compactDaySummary({...totals,k},{...goal,k:target},diary,slots);assert.ok(out.includes(label));assert.doesNotMatch(out,/NaN|Infinity/);}
const missing=compactDaySummary({k:100,p:0,c:0,f:0,fi:0},null,diary,slots);assert.match(missing,/sin meta de kcal/);assert.doesNotMatch(missing,/width:|\/ 0 g/);

// The new export must never be requested from the previously cached module URL.
const {readFileSync}=await import('node:fs');
const {createHash}=await import('node:crypto');
const source=readFileSync(new URL('../pilot/student-day-presentation-b13c52657593.js',import.meta.url));
assert.equal(createHash('sha256').update(source).digest('hex').slice(0,12),'b13c52657593');
const entry=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
assert.match(entry,/from \"\.\/student-day-presentation-b13c52657593\.js\?v=/);
assert.doesNotMatch(entry,/from \"\.\/student-day-presentation\.js/);
