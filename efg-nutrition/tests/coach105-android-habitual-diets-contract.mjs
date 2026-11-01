// COACH105 pilot release gate: real previously reported Android + habitual defects,
// keto/fasting options and their nonautomatic nutrition behavior. Offline contract,
// NOT proof of physical Android or hosted persistence.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DIET_PATTERNS,EATING_WINDOWS,evaluatePattern,evaluateEatingWindow,distributeDailyTargets} from "../pilot/diet-pattern-workbench.js";
const src=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
const pull=readFileSync(new URL("../pilot/pull-refresh.js",import.meta.url),"utf8");
assert.match(src,/data-habitualsave/,'The meal accordion must retain Save habitual');
assert.match(src,/\+habitualPickerHTML\(key\)\+/, 'Existing habitual picker must render under each meal');
assert.match(src,/const choice=selectedIndex>=0\?selectedIndex:0;/, 'Saved habitual must be previewed by default, including multiple saved variants');
assert.match(src,/getHabitualList\(slot\)/,'Pick only the current meal slot');
assert.match(src,/cloudHabituales=data\|\|\[\]/,'Previously saved meals must be fetched');
assert.match(src,/\.eq\("student_id",state\.session\.user\.id\)\.order\("created_at"/,'Habitual fetch must use signed account');
assert.match(src,/state\.habitualSelection\[slot\]=String\(data\.id\);[\s\S]*?state\.lastEditedMeal=slot;[\s\S]*?await render\(\)/,'Saving a habitual keeps its meal open, shows the newly chosen option and repaints after server confirmation');
assert.match(src,/data-habitualchoice/,'User can choose each habitual');
assert.match(src,/data-habitualapply/,'User can apply selected habitual');
assert.match(src,/data-habitualdelete/,'User can delete habitual without deleting history');
assert.match(src,/try\{await saveDiary\(\);\}[\s\S]*?notify\('Habitual/,'Only explicit Apply saves into diary');
assert.match(src,/if\(d\.meals\[slot\]\.length&&!confirm/,'Do not silently overwrite current meal');
assert.match(pull,/Math\.min\(110,Math\.round\(window\.innerHeight\*\.18\)\)/,
 'Android touch refresh must start only from top edge');
assert.match(pull,/if\(e\.touches\[0\]\.clientY>topEdge\)return;/);
assert.match(pull,/isEditable\(e\.target\)/,'Form edits preserve native scrolling');
assert.match(pull,/hasNestedScroll\(e\.target\)/,'Nested scroll preserves native gestures');
assert.match(pull,/isDashboardContent\(e\.target\)/,'Dashboard swipes never trigger reload');
assert.match(pull,/if\(e\.cancelable\)e\.preventDefault\(\)/,'Only prevent a cancelable gesture');
const gestureStart=src.indexOf('document.addEventListener("keydown",event=>{');
assert.ok(gestureStart>=0);
const keyboard=src.slice(gestureStart,src.indexOf('root.addEventListener("submit"',gestureStart));
assert.match(keyboard,/if\(event\.isComposing\|\|event\.keyCode===229\)return;/,'Android Gboard composition must not pick first food');

const compStart=src.indexOf('const composingFoodSearchTargets=new WeakSet();');
const compEnd=src.indexOf('root.addEventListener("input",e=>{',compStart);
assert.ok(compStart>0&&compEnd>compStart,'The real app must guard composition before filtering');
const listeners={},calls={meal:0,planner:0};
const fakeRoot={addEventListener(name,cb){listeners[name]=cb;}};
const gate=new Function('root','filterMealFoods','filterPlannerFoods',
 src.slice(compStart,compEnd)+';return {foodSearchReadyForInput};')(
 fakeRoot,()=>{calls.meal++},()=>{calls.planner++});
const mealInput={id:'mealFoodSearch',dataset:{}},plannerInput={id:'',dataset:{plansearch:'cena|protein'}};
listeners.compositionstart({target:mealInput});
assert.equal(gate.foodSearchReadyForInput({target:mealInput,isComposing:false}),false,'Gboard can emit input before its composition ends');
assert.equal(gate.foodSearchReadyForInput({target:mealInput,isComposing:true}),false);
listeners.compositionend({target:mealInput});
assert.equal(calls.meal,1,'A completed food name should filter exactly once');
assert.equal(gate.foodSearchReadyForInput({target:mealInput,isComposing:false}),true);
listeners.compositionstart({target:plannerInput});
assert.equal(gate.foodSearchReadyForInput({target:plannerInput,isComposing:false}),false);
listeners.compositionend({target:plannerInput});
assert.equal(calls.planner,1,'Planner search must wait until the IME composition ends');
assert.match(src,/if\(e\.target\.id==="mealFoodSearch"&&foodSearchReadyForInput\(e\)\)filterMealFoods\(\)/);
assert.match(src,/if\(e\.target\.dataset\.plansearch&&foodSearchReadyForInput\(e\)\)filterPlannerFoods\(e\.target\)/);

for(const diet of ['balanced','mediterranean','dash','vegetarian','vegan','pescatarian','flexitarian','portfolio','low_carb','keto']){
 assert.ok(DIET_PATTERNS.some(x=>x.id===diet),'Missing diet '+diet);
}
assert.deepEqual(EATING_WINDOWS.map(x=>x.id),['regular','12_12','14_10','16_8']);
assert.equal(evaluatePattern({patternId:'keto'}).requiresReview,true);
assert.equal(evaluatePattern({patternId:'keto',medicationFlags:['sglt2']}).status,'blocked_pending_clinical_review');
assert.equal(evaluateEatingWindow({windowId:'16_8',medicationFlags:['insulin']}).requiresReview,true);
const targets={k:2200,p:140,c:250,f:65};
for(const windowId of ['12_12','14_10','16_8']){
 const result=distributeDailyTargets({targets,windowId,startTime:windowId==='16_8'?'12:00':'08:00'});
 for(const k of ['k','p','c','f'])
  assert.ok(Math.abs(result.meals.reduce((n,m)=>n+m.targets[k],0)-targets[k])<0.11,'Fasting must preserve '+k);
}
const entry=readFileSync(new URL('../pilot/coach-relaunch-entry-client.js',import.meta.url),'utf8');
const ketoInLiveIntake=entry.includes('["keto","Cetogénica');
console.log('COACH105 hosted integration: keto selectable in current intake:',ketoInLiveIntake?'YES, still requires server validation':'NO, backend and UI integration PENDING');
console.log('PASS COACH105: Android swipe/IME guards; saved habitual picker + default preview; keto and fasting research modes with macro preservation. STILL NEED hosted profile integration + physical Android + cloud habitual E2E.');
