import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {generateFlexibleGuidedDay,removeFlexibleMeal} from '../pilot/guided-day-v2.js';
import {rebalanceGuidedDay,guidedPortionBounds} from '../pilot/guided-day.js';
import {resolveCoachGuideWindow,coachGuideWindowControl,guideWindowLabel,validGuideWindow,assertGuideWindowApplied} from '../pilot/coach-guide-schedule.js';
const nutrients={egg:[1.48,.124,.0096,.0996],egg_white:[.55,.107,.0236,0],
 bread:[2.47,.13,.41,.042],milk_skim:[.35,.034,.05,.001],
 banana:[.89,.011,.23,.003],yogurt:[.50,.042,.081,.0009],apple:[.52,.003,.138,.002],
 chicken:[1.65,.31,0,.036],brownrice:[1.23,.027,.256,.01],pumpkin:[.34,.01,.08,.001],
 oil:[8.84,0,0,1],cheese:[2.17,.27,.017,.12],mandarin:[.53,.008,.133,.003],
 fish_hake:[.82,.178,0,.007],potato:[.86,.0171,.2001,.001],rocket:[.25,.026,.037,.007],
 oats_raw:[3.89,.169,.663,.069],coffee_black:[.001,0,0,0],tofu_firm:[1.19,.12,.02,.07],
 tempeh:[2.15,.19,.09,.11],walnuts:[6.54,.15,.14,.65],rice:[1.29,.0267,.2799,.0028],
 chickpeas_cooked:[1.64,.09,.27,.026],zucchini:[.2,.012,.03,.001],
 avocado:[1.6,.02,.085,.147],strawberry:[.32,.007,.077,.003],
 broccoli_cooked:[.35,.024,.07,.004],lentils_cooked:[1.16,.09,.20,.004],
 peanut_butter:[5.8,.25,.20,.5],bread_glutenfree:[2.5,.04,.46,.06],milk_lactosefree:[.4,.034,.05,.001]
};
const catalog=Object.entries(nutrients).map(([id,[k,p,c,f]])=>({id,name:id,unit:id.startsWith('milk')?'ml':'g',k,p,c,f,fi:0}));
const goal={goal_type:'recomp',kcal:2250,protein_g:155,carb_g:250,fat_g:70,fiber_g:24};

const originalGoal=structuredClone(goal);
for(const [windowId,count] of [['regular',6],['12_12',6],['14_10',5],['16_8',4]]){
 const plan=generateFlexibleGuidedDay(catalog,goal,{windowId});
 assert.equal(plan.windowId,windowId);
 assert.equal(plan.meals.length,count);
 assert.equal(plan.meals.some(m=>m.slot==='desayuno'),['regular','12_12'].includes(windowId));
 const saved=JSON.parse(JSON.stringify(plan));
 assert.equal(resolveCoachGuideWindow({plan:saved,intakeWindow:'regular'}),windowId);
 assert.equal(rebalanceGuidedDay(saved,goal).windowId,windowId);
 assert.equal(removeFlexibleMeal(saved,'cena',goal).windowId,windowId);
 assert.deepEqual(goal,originalGoal,'Fasting must not rewrite daily targets');
 for(const item of plan.meals.flatMap(m=>m.items)){
  const [min,max]=guidedPortionBounds(item.id);
  assert.ok(item.qty>=min&&item.qty<=max,`${item.id} remains within catalog limits`);
 }
 assert.ok(coachGuideWindowControl(windowId).includes('value="'+windowId+'" selected'));
 assert.ok(guideWindowLabel(windowId));
 assert.doesNotThrow(()=>assertGuideWindowApplied(saved,windowId,'regular'));
 assert.throws(()=>assertGuideWindowApplied(saved,windowId==='regular'?'16_8':'regular','regular'),/Regenerá/);
}
assert.throws(()=>generateFlexibleGuidedDay(catalog,goal,{windowId:'20_4'}),/perfil|Perfil/);
assert.equal(validGuideWindow('20_4'),false);
assert.equal(resolveCoachGuideWindow({plan:{},intakeWindow:'14_10'}),'14_10');
assert.equal(resolveCoachGuideWindow({plan:{},intakeWindow:'unknown'}),'regular');
const scope='coach/org/student/session';
assert.equal(resolveCoachGuideWindow({selection:{scope,windowId:'16_8'},scope,plan:{windowId:'regular'}}),'16_8');
assert.equal(resolveCoachGuideWindow({selection:{scope,windowId:'16_8'},scope:'other',plan:{windowId:'12_12'}}),'12_12');
assert.equal(resolveCoachGuideWindow({selection:{scope,windowId:'regular'},scope,plan:{windowId:'16_8'}}),'regular');
// Execute real UI resolver and rendered guide controls with fictional scoped state.
const src=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const helpers=src.slice(src.indexOf('function coachGuideWindowScope(){'),src.indexOf('function currentCoachGuideProfile(){'));
const state={session:{user:{id:'coach'},session_id:'session'},org:{id:'org'},selectedStudent:'student',coachIntakeForms:{student:{eating_window:'regular'}},coachGuidedDraft:{windowId:'16_8'}};
const context={state,resolveCoachGuideWindow,assertGuideWindowApplied,activeCoachGuideGoal:()=>({id:'goal'})};vm.createContext(context);vm.runInContext(helpers,context);
assert.equal(context.currentCoachGuideWindow(),'16_8');
state.coachGuideWindowSelection={scope:context.coachGuideWindowScope(),windowId:'14_10'};
assert.equal(context.currentCoachGuideWindow(),'14_10');
assert.throws(()=>context.assertCurrentGuideWindow(state.coachGuidedDraft),/Regenerá/);
state.coachGuidedDraft={windowId:'14_10'};
assert.doesNotThrow(()=>context.assertCurrentGuideWindow(state.coachGuidedDraft));
state.selectedStudent='other';state.coachGuidedDraft=null;
assert.equal(context.currentCoachGuideWindow(),'regular','Never reuse choice across students');
assert.ok(src.includes('coachGuideWindowControl(currentCoachGuideWindow())'));
assert.ok(src.includes("guideWindowLabel(plan.windowId)"),'Preview must display persisted selection, not newer intake');
assert.ok(src.includes('state.coachGuideWindowSelection=null;'));
const section=src.slice(src.indexOf('function coachGuidedSection(){'),src.indexOf('function studentGuidedSection(){'));
Object.assign(context,{coachGuideWindowControl,coachAdaptedWorkspace:{available:()=>false},COACH_ATOMIC_PLAN_UI_ENABLED:true,
 guidedDayContents:()=>'<div>synthetic guide</div>',qaReviewedSourcesAllowed:()=>false});
vm.runInContext(section,context);
state.selectedStudent='student';state.coachGuidedDraft={windowId:'16_8',meals:[]};state.coachGuideWindowSelection=null;
const html=context.coachGuidedSection();
assert.ok(html.includes('value="16_8" selected'));
assert.ok(html.includes('comidas según la ventana'));
assert.ok(!html.includes('seis comidas</button>'));
console.log('Coach guide schedule: selection, generation, persistence, scope, pending-change guard and catalog bounds PASS');
