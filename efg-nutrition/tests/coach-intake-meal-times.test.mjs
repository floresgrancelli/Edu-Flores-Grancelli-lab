import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeCoachIntakeMealTimes,parseCoachIntakeMealTimes,renderCoachRelaunchEntry,readCoachRelaunchForm} from '../pilot/coach-relaunch-entry-client.js';
import {COACH_RELEASE_INTAKE_VERSION} from '../pilot/coach-relaunch-onboarding.js';

const makeDoc=(first='08:00',last='20:00',notes='Almuerzo a las 12:30')=>({
 getElementById(id){
  const values={
   objective:'recomp',age_years:'36',height_cm:'160',weight_kg:'56',
   activity_level:'low',dietary_pattern:'omnivore',eating_window:'12_12',
   preferred_foods:'',disliked_foods:'',meal_routine:notes,notes:'',
   meal_start:first,meal_end:last
  };
  const key=id.replace(/^coachRelaunch_/,'');
  return Object.hasOwn(values,key)?{type:'text',value:values[key]}:null;
 }
});
test('eight-to-twenty 12:12 window is saved in human-readable existing coach field',()=>{
 const value=encodeCoachIntakeMealTimes({first:'08:00',last:'20:00',notes:'Almuerzo a las 12:30'});
 assert.equal(value,'Primera comida: 08:00 · Última comida: 20:00\nAlmuerzo a las 12:30');
 assert.deepEqual(parseCoachIntakeMealTimes(value),{first:'08:00',last:'20:00',notes:'Almuerzo a las 12:30'});
 const result=readCoachRelaunchForm(makeDoc(),{sendOnSave:true});
 assert.equal(result.payload.eating_window,'12_12');
 assert.equal(result.payload.meal_routine,value);
 assert.equal(result.shareWithCoach,true,'No regression in explicit send action');
 assert.equal(Object.hasOwn(result.payload,'meal_start'),false,'No unsupported schema fields');
});
test('historical free text without times is never discarded',()=>{
 assert.deepEqual(parseCoachIntakeMealTimes('Desayuno cuando puedo\nCena con mi familia'),
  {first:'',last:'',notes:'Desayuno cuando puedo\nCena con mi familia'});
 assert.equal(encodeCoachIntakeMealTimes({notes:'Cena con mi familia'}),'Cena con mi familia');
});
test('one time can be supplied without inventing the other',()=>{
 const value=encodeCoachIntakeMealTimes({first:'12:00'});
 assert.deepEqual(parseCoachIntakeMealTimes(value),{first:'12:00',last:'',notes:''});
 assert.equal(value,'Primera comida: 12:00 · Última comida: sin indicar');
 const end=encodeCoachIntakeMealTimes({last:'20:00'});
 assert.deepEqual(parseCoachIntakeMealTimes(end),{first:'',last:'20:00',notes:''});
});
test('invalid HH:MM, identical times and overflow fail visibly',()=>{
 for(const first of ['24:00','8:00','18:99','12.00'])
  assert.throws(()=>encodeCoachIntakeMealTimes({first}),/HH:MM/);
 assert.throws(()=>encodeCoachIntakeMealTimes({first:'08:00',last:'08:00'}),/horarios diferentes/);
 assert.throws(()=>encodeCoachIntakeMealTimes({first:'08:00',last:'20:00',notes:'x'.repeat(380)}),/400 caracteres/);
});
test('4-step guided form shows two editable time inputs from saved intake, no automatic defaults',()=>{
 const saved={route:'ready',status:{
  completed_version:COACH_RELEASE_INTAKE_VERSION,revision:2,shared_at:'2026-11-15T12:00:00Z',
  objective:'recomp',age_years:36,height_cm:160,weight_kg:56,
  activity_level:'low',dietary_pattern:'omnivore',eating_window:'12_12',
  meal_routine:encodeCoachIntakeMealTimes({first:'08:00',last:'20:00',notes:'Cena con mi familia'})
 }};
 const html=renderCoachRelaunchEntry(saved,{editing:true,guided:true,sendOnSave:true,privateHealthEnabled:true});
 assert.match(html,/Hora de la primera comida \(opcional\)/);
 assert.match(html,/Hora de la última comida \(opcional\)/);
 assert.match(html,/id="coachRelaunch_meal_start" value="08:00"/);
 assert.match(html,/id="coachRelaunch_meal_end" value="20:00"/);
 assert.match(html,/Cena con mi familia/);
 assert.equal((html.match(/Primera comida: 08:00 · Última comida: 20:00/g)||[]).length,0,
  'Split saved times from notes instead of duplicating the encoded line');
 assert.match(html,/Guardar y enviar mi ficha al coach/);
 const fresh=renderCoachRelaunchEntry({route:'intake',status:null},
  {guided:true,sendOnSave:true,privateHealthEnabled:true});
 assert.match(fresh,/id="coachRelaunch_meal_start" value=""/);
 assert.match(fresh,/id="coachRelaunch_meal_end" value=""/);
});
