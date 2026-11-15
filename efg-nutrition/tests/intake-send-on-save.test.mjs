import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderCoachRelaunchEntry,readCoachRelaunchForm} from '../pilot/coach-relaunch-entry-client.js';
import {COACH_RELEASE_INTAKE_VERSION} from '../pilot/coach-relaunch-onboarding.js';

const intake={route:'ready',status:{
 completed_version:COACH_RELEASE_INTAKE_VERSION,revision:1,shared_at:null,
 objective:'recomp',age_years:36,height_cm:160,weight_kg:56,
 activity_level:'low',dietary_pattern:'omnivore',eating_window:'12_12',
 preferred_foods:'',disliked_foods:'',meal_routine:'',notes:''
}};
const mockDoc=(withCheckbox=false)=>({
 getElementById(id){
  const raw={
   coachRelaunch_objective:'recomp',coachRelaunch_age_years:'36',
   coachRelaunch_height_cm:'160',coachRelaunch_weight_kg:'56',
   coachRelaunch_activity_level:'low',coachRelaunch_dietary_pattern:'omnivore',
   coachRelaunch_eating_window:'12_12',coachRelaunch_preferred_foods:'',
   coachRelaunch_disliked_foods:'',coachRelaunch_meal_routine:'',
   coachRelaunch_notes:''
  };
  return id==='coachRelaunch_share'?(withCheckbox?{checked:false}:null):
    Object.hasOwn(raw,id)?{value:raw[id],type:'text'}:null;
 }
});
test('one-step coach send has no extra sharing checkbox and explicit notice',()=>{
 const html=renderCoachRelaunchEntry(intake,{
  editing:true,guided:true,privateHealthEnabled:true,sendOnSave:true
 });
 assert.match(html,/Guardar y enviar mi ficha al coach/);
 assert.match(html,/Tu ficha se enviará a tu coach asignado/);
 assert.match(html,/podés dejar de compartir la ficha desde Privacidad/);
 assert.doesNotMatch(html,/id="coachRelaunch_share"/);
 assert.doesNotMatch(html,/Retirar permiso de compartir/);
 assert.doesNotMatch(html,/Borrar solo los datos de esta ficha/);
 assert.doesNotMatch(html,/Revisar permiso del piloto/);
 assert.match(html,/data-intakereview/);
 assert.match(html,/data-intakepanel="3"/);
});
test('explicit final send sets sharing intent, never reading an old checkbox',()=>{
 const payload=readCoachRelaunchForm(mockDoc(),{sendOnSave:true});
 assert.equal(payload.shareWithCoach,true);
 assert.equal(payload.payload.objective,'recomp');
 assert.equal(payload.payload.weight_kg,56);
 assert.equal(payload.payload.eating_window,'12_12');
 assert.equal(Object.hasOwn(payload.payload,'health_flags'),false);
});
test('legacy optional-share flow keeps its distinct explicit checkbox contract',()=>{
 assert.throws(()=>readCoachRelaunchForm(mockDoc()),/Falta la opción/);
 assert.equal(readCoachRelaunchForm(mockDoc(true)).shareWithCoach,false);
 const html=renderCoachRelaunchEntry(intake,{editing:true,privateHealthEnabled:true});
 assert.match(html,/id="coachRelaunch_share"/);
});
test('published student journey uses send-on-save only for pilot path',()=>{
 const pilot=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
 assert.match(pilot,/readCoachRelaunchForm\(document,\{sendOnSave:true\}\)/);
 assert.match(pilot,/shareWithCoach:data\.shareWithCoach/);
 assert.match(pilot,/sendOnSave:true/);
 assert.match(pilot,/Ficha aún no enviada/);
 assert.doesNotMatch(pilot,/Ficha inicial y permiso para compartir/);
 assert.doesNotMatch(pilot,/Permiso de compartir en el piloto/);
 const client=readFileSync(new URL('../pilot/coach-pilot-intake-client.js',import.meta.url),'utf8');
 assert.match(client,/pilot\.participation\?\.sharing_accepted!==true/);
 assert.match(client,/followup\.data\?\.accepted!==true/);
 assert.match(client,/p_share_with_coach:shareWithCoach/);
 assert.match(client,/after\.shared_at/);
});
