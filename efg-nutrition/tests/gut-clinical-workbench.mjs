import assert from 'node:assert/strict';
import {GUT_CLINICAL_INTAKE_ENABLED,GUT_CONDITIONS,COACH_HEALTH_CONDITIONS,GUT_RESEARCH,GUT_DIAGNOSTIC_STATUS,SIBO_FODMAP_PHASES,
 parseGutClinicalDraft,renderGutClinicalDraft,buildGutGuideForCoach} from '../pilot/gut-clinical-workbench.js';
import {renderCoachRelaunchEntry,readCoachRelaunchForm} from '../pilot/coach-relaunch-entry-client.js';
assert.equal(GUT_CLINICAL_INTAKE_ENABLED,false,'Sensitive fields must stay disabled before authorized clinical backend');
assert.deepEqual(GUT_CONDITIONS.map(x=>x.id),['lactose_intolerance','sibo']);
assert.ok(GUT_DIAGNOSTIC_STATUS.some(x=>x.id==='suspected'));
assert.ok(SIBO_FODMAP_PHASES.some(x=>x.id==='reintroduction'));
assert.ok(GUT_RESEARCH.sibo.every(x=>x.startsWith('https://')));
const initial=parseGutClinicalDraft();
assert.deepEqual(initial.conditions,[]);
assert.equal(initial.canPersist,false);
const combined=parseGutClinicalDraft({conditions:['lactose_intolerance','sibo'],
 statuses:{lactose_intolerance:'confirmed',sibo:'suspected'},siboPhase:'none',
 explicitHealthDataConsent:true});
assert.equal(combined.statuses.sibo,'suspected');
assert.equal(combined.canPersist,false,'Client consent flag alone cannot authorize clinical persistence');
for(const input of [
 {conditions:['other_condition']},{conditions:['sibo','sibo']},
 {conditions:'sibo'},{conditions:['sibo'],siboPhase:'unknown'},
 {conditions:['lactose_intolerance'],siboPhase:'short_trial'},
 {conditions:['sibo'],statuses:{sibo:'made_up'}},
 {conditions:['sibo'],statuses:{lactose_intolerance:'confirmed'}},
 {conditions:['lactose_intolerance'],statuses:{sibo:'confirmed'}}
]){
 assert.throws(()=>parseGutClinicalDraft(input),/invalid|inválid|coherente|reconocid/i,'Reject invalid clinical input');
}
const ui=renderGutClinicalDraft({conditions:['sibo'],statuses:{sibo:'suspected'}});
assert.match(ui,/Intolerancia a la lactosa/);
assert.match(ui,/SIBO/);
assert.match(ui,/Próxima función en revisión/);
assert.match(ui,/input type="checkbox" name="gutClinicalCondition" value="sibo" checked disabled/);
assert.doesNotMatch(ui,/value="sibo" checked>/,'Must never offer active sensitive field by accident');
const entry=renderCoachRelaunchEntry({route:'intake',status:null,legalStatus:[]});
assert.match(entry,/Condiciones digestivas y restricciones alimentarias/);
assert.match(entry,/value="sibo" disabled/);
assert.match(entry,/value="lactose_intolerance" disabled/);
const fakeDoc={getElementById(id){
 const key=id.replace('coachRelaunch_','');
 if(key==='share')return {checked:false};
 if(key==='eating_window')return {value:'regular'};
 if(['objective','activity_level','dietary_pattern','age_years','height_cm','weight_kg',
 'preferred_foods','disliked_foods','meal_routine','notes'].includes(key))return {value:''};
 if(key.startsWith('gut'))throw Error('General RPC must not read health fields');
 return null;
}};
const normal=readCoachRelaunchForm(fakeDoc);
assert.deepEqual(Object.keys(normal.payload).sort(),[
 'objective','age_years','height_cm','weight_kg','activity_level','dietary_pattern','eating_window',
 'preferred_foods','disliked_foods','meal_routine','notes'].sort());
assert.ok(!('health_flags' in normal.payload),'Medical data cannot enter nonmedical intake RPC');
const lactose=buildGutGuideForCoach({condition:'lactose_intolerance',diagnosticStatus:'confirmed'});
assert.equal(lactose.approvedForStudent,false);
assert.equal(lactose.meals.length,5);
assert.equal(lactose.foodSignal,null);
assert.match(lactose.notes.join(' '),/Calcio|yogur|lácteos|etiqueta/i);
assert.ok(lactose.nutrients.includes('Vitamina D'));
const suspicion=buildGutGuideForCoach({condition:'sibo',diagnosticStatus:'suspected',siboPhase:'short_trial'});
assert.equal(suspicion.state,'needs_diagnostic_review');
assert.equal(suspicion.approvedForStudent,false);
const confirmed=buildGutGuideForCoach({condition:'sibo',diagnosticStatus:'confirmed',siboPhase:'short_trial'});
assert.equal(confirmed.state,'needs_professional_review');
assert.equal(buildGutGuideForCoach({condition:'sibo',diagnosticStatus:'confirmed',siboPhase:'reintroduction',coachReviewed:true}).state,'coach_draft_only');
assert.equal(buildGutGuideForCoach({condition:'sibo',diagnosticStatus:'confirmed',siboPhase:'personalized',coachReviewed:true}).approvedForStudent,false);
assert.match(confirmed.message,/NO equivale a tratamiento/i);
assert.ok(confirmed.reviewChecklist.some(s=>s.includes('reintroducción')));
assert.throws(()=>buildGutGuideForCoach({condition:'lactose_intolerance',siboPhase:'short_trial'}),/no corresponde/i);
const time=new Date('2026-10-30T12:00:00Z');
const guess=buildGutGuideForCoach({condition:'sibo',diagnosticStatus:'confirmed',foodId:'rice',
 restrictions:['celiac'],asOf:time});
assert.equal(guess.foodSignal.color,'yellow','SIBO+c eliac can never receive green from a generic rice name');
const fake=(restriction,verdict='allowed')=>({food_id:'test_food',restriction,verdict,status:'reviewed',
 evidence_id:'SYNTHETIC_001',source_url:'https://example.invalid/not-clinical',
 reviewed_by:'SYNTHETIC_REVIEWER',reviewed_at:'2026-10-01T00:00:00Z',expires_at:'2026-11-30T00:00:00Z'});
const preGreen=buildGutGuideForCoach({condition:'lactose_intolerance',diagnosticStatus:'confirmed',
 foodId:'test_food',asOf:time,reviewedRows:[fake('lactose_intolerance')]});
assert.equal(preGreen.foodSignal.color,'green','Only a complete synthetic externally reviewed verdict can be green');
assert.equal(preGreen.approvedForStudent,false,'Green food cannot become a published diet without coach approval');
const multi=buildGutGuideForCoach({condition:'lactose_intolerance',diagnosticStatus:'confirmed',
 foodId:'test_food',restrictions:['celiac'],asOf:time,reviewedRows:[fake('lactose_intolerance')]});
assert.equal(multi.foodSignal.color,'yellow','Unreviewed second restriction wins over lactose green');
const adverse=buildGutGuideForCoach({condition:'lactose_intolerance',diagnosticStatus:'confirmed',
 foodId:'test_food',restrictions:['celiac'],asOf:time,reviewedRows:[fake('lactose_intolerance'),fake('celiac','avoid')]});
assert.equal(adverse.foodSignal.color,'red','Explicit reviewed incompatibility takes precedence over a green');
console.log('PASS CLIN-GUT-01: lactose/SIBO intake options isolated and OFF; no health data sent to general RPC; 5-meal coach drafts, diagnostics gate, SIBO reintroduction, multirestriction red/yellow/green evidence precedence.');

assert.deepEqual(COACH_HEALTH_CONDITIONS.map(c=>c.id),[
 'lactose_intolerance','sibo','diabetes','celiac','food_allergy','hypertension','dyslipidemia','fatty_liver']);
const full=parseGutClinicalDraft({conditions:COACH_HEALTH_CONDITIONS.map(c=>c.id)});
assert.equal(full.canPersist,false);
for(const c of COACH_HEALTH_CONDITIONS){
 assert.match(renderGutClinicalDraft(),new RegExp('value="'+c.id+'" disabled'));
 assert.equal(full.statuses[c.id],'not_reported','No diagnosis preselected');
}
for(const id of ['diabetes','celiac','food_allergy','hypertension','dyslipidemia','fatty_liver'])
 assert.throws(()=>buildGutGuideForCoach({condition:id}),/inválida/,'Declaring health data must not invent a diet template');
console.log('PASS 01-05: all eight optional health codes visible but disabled, no inferred diagnosis or automatic diet; excluded from general intake.');
