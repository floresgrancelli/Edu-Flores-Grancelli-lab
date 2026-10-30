import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WALKING_PACES,estimateWalkingSteps,estimateStoredWalkingActivity}
 from '../pilot/walking-steps-estimator.js';
import {renderWalkingActivityCard,readWalkingActivityForm,walkingEstimateMarkup,
 refreshWalkingActivityPreview,renderWalkingActivityHistory}
 from '../pilot/walking-activity-ui.js';
assert.deepEqual(Object.keys(WALKING_PACES),['slow','moderate','brisk']);
assert.deepEqual(Object.values(WALKING_PACES).map(x=>x.met),[2.8,3.8,4.8],
 '2024 Adult Compendium MET values on level ground');
const baseline=estimateWalkingSteps({steps:8000,pace:'moderate',heightCm:174,weightKg:78});
assert.equal(baseline.distanceKm,5.78);
assert.equal(baseline.durationMinutes,69);
assert.equal(baseline.activeKcal,252);
assert.equal(baseline.usedDefaultStepLength,false);
assert.equal(baseline.noAutomaticDietCredit,true);
const fast=estimateWalkingSteps({steps:8000,pace:'brisk',heightCm:174,weightKg:78});
const slow=estimateWalkingSteps({steps:8000,pace:'slow',heightCm:174,weightKg:78});
assert.equal(fast.distanceKm,baseline.distanceKm);
assert.equal(slow.distanceKm,baseline.distanceKm);
assert.ok(fast.durationMinutes<baseline.durationMinutes&&baseline.durationMinutes<slow.durationMinutes);
assert.ok(fast.activeKcal>baseline.activeKcal&&baseline.activeKcal>slow.activeKcal);
const missingWeight=estimateWalkingSteps({steps:8000,pace:'moderate'});
assert.equal(missingWeight.distanceKm,5.6);
assert.equal(missingWeight.activeKcal,null,'Never fabricate calories without weight');
assert.equal(missingWeight.usedDefaultStepLength,true);
assert.equal(estimateWalkingSteps({steps:0,pace:'moderate',weightKg:75}).activeKcal,null);
const unknown=estimateWalkingSteps({steps:8000});
assert.equal(unknown.distanceKm,5.6);
assert.equal(unknown.durationMinutes,null);
assert.equal(unknown.activeKcal,null);
for(const attrs of [{steps:-1},{steps:100001},{steps:4.2},{steps:8000,pace:'running'},
 {steps:8000,heightCm:90},{steps:8000,weightKg:0}])
 assert.throws(()=>estimateWalkingSteps(attrs));
const legacy={activity_day:'2026-10-28',steps:6000,exercise_minutes:60,kind:'Caminata'};
assert.equal(estimateStoredWalkingActivity(legacy).distanceKm,4.2);
assert.equal(estimateStoredWalkingActivity(legacy).activeKcal,null);
const fields={activitySteps:'8000',activityPace:'moderate',activityHeightCm:'174',
 activityWeightKg:'78',activityMinutes:'60',activityKind:'Entrenamiento de fuerza'};
const get=id=>({value:fields[id]});
const doc={getElementById:get};
const entry=readWalkingActivityForm(doc);
assert.equal(entry.steps,8000);assert.equal(entry.walking_height_cm,174);
assert.equal(entry.walking_weight_kg,78);assert.equal(entry.walking_pace,'moderate');
assert.equal(entry.exercise_minutes,60,'Exercise minutes are preserved separately.');
assert.equal(entry.estimate.activeKcal,252);
fields.activityWeightKg='';
assert.equal(readWalkingActivityForm(doc).estimate.activeKcal,null);
fields.activityWeightKg='78';fields.activitySteps='abc';
assert.throws(()=>readWalkingActivityForm(doc),/pasos/);
fields.activitySteps='8000';fields.activityMinutes='';
assert.equal(readWalkingActivityForm(doc).exercise_minutes,0);
const html=renderWalkingActivityCard({todayActivity:legacy,lastWeightKg:78});
for(const token of ['id="activitySteps"','id="activityPace"','id="activityHeightCm"',
 'id="activityWeightKg"','id="activityMinutes"','id="activityKind"',
 'id="walkingActivityPreview"','data-act="saveActivity"','no una medición GPS'])
 assert.ok(html.includes(token),token);
assert.match(walkingEstimateMarkup(baseline),/5,78/);
assert.match(walkingEstimateMarkup(baseline),/252/);
assert.match(renderWalkingActivityHistory({...legacy,walking_pace:'moderate',walking_weight_kg:78}),/kcal activas aprox/);
assert.match(renderWalkingActivityHistory(legacy),/ritmo sin registrar/);
const preview={innerHTML:'',textContent:''};
const doc2={getElementById:id=>id==='walkingActivityPreview'?preview:{value:fields[id]}};
refreshWalkingActivityPreview(doc2);
assert.match(preview.innerHTML,/5,78/);
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
assert.match(app,/function sportView\(\)[\s\S]*?movementCard\(\)/);
assert.match(app,/function progressView\(\)[\s\S]*?movementCard\(\)/);
assert.match(app,/const \{estimate,\.\.\.entry\}=readWalkingActivityForm\(document\)/);
assert.match(app,/walking_pace/);
assert.match(app,/refreshWalkingActivityPreview\(document\)/);
assert.match(app,/renderWalkingActivityHistory\(a\)/);
assert.doesNotMatch(app,/const dailyTotals=.*walking_/, 'Walking kcal must not be a food/supplement macro.');
const migration=readFileSync(new URL('../migrations/20261030_sport_steps_pace_and_calorie_context.sql',import.meta.url),'utf8');
assert.match(migration,/add column walking_pace text/);
assert.match(migration,/add column walking_weight_kg numeric/);
assert.doesNotMatch(migration,/update public\.efg_activities/i,'No backfill changes existing records.');
const index=readFileSync(new URL('../pilot/index.html',import.meta.url),'utf8');
assert.match(index,/walking-activity\.css\?v=/);
console.log('PASS SPORT-STEP: 2024 MET, 8000-step distance and active kcal, pace differences, missing weight/legacy safe, Deportes+Mi progreso, no diet deductions, additive migration.');
