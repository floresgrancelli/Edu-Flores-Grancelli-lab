// COACH105 pilot release gate: real previously reported Android + habitual defects,
// keto/fasting options and their nonautomatic nutrition behavior. Offline contract,
// NOT proof of physical Android or hosted persistence.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DIET_PATTERNS,EATING_WINDOWS,evaluatePattern,evaluateEatingWindow,distributeDailyTargets} from "../pilot/diet-pattern-workbench.js";
const src=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
const pull=readFileSync(new URL("../pilot/pull-refresh.js",import.meta.url),"utf8");
assert.ok(src.includes('data-habitualsave="'+ "'+key+'" +'"'),'The meal accordion must retain Save habitual');
assert.match(src,/\+habitualPickerHTML\(key\)\+/, 'Existing habitual picker must render under each meal');
assert.match(src,/const choice=selectedIndex>=0\?selectedIndex:0;/, 'Saved habitual must be previewed by default, including multiple saved variants');
assert.match(src,/getHabitualList\(slot\)/,'Pick only the current meal slot');
assert.match(src,/cloudHabituales=data\|\|\[\]/,'Previously saved meals must be fetched');
assert.match(src,/\.eq\("student_id",state\.session\.user\.id\)\.order\("created_at"/,'Habitual fetch must use signed account');
assert.match(src,/data-habitualchoice/,'User can choose each habitual');
assert.match(src,/data-habitualapply/,'User can apply selected habitual');
assert.match(src,/data-habitualdelete/,'User can delete habitual without deleting history');
assert.match(src,/await saveDiary\(\);notify\('Habitual/,'Only explicit Apply saves into diary');
assert.match(src,/if\(d\.meals\[slot\]\.length&&!confirm/,'Do not silently overwrite current meal');
assert.match(pull,/Math\.min\(110,Math\.round\(window\.innerHeight\*\.18\)\)/,
 'Android touch refresh must start only from top edge');
assert.match(pull,/if\(e\.touches\[0\]\.clientY>topEdge\)return;/);
assert.match(pull,/isEditable\(e\.target\)\|\|hasNestedScroll\(e\.target\)/,'Nested scroll and forms preserve gestures');
assert.match(pull,/if\(e\.cancelable\)e\.preventDefault\(\)/,'Only prevent a cancelable gesture');
const gestureStart=src.indexOf('document.addEventListener("keydown",event=>{');
assert.ok(gestureStart>=0);
const keyboard=src.slice(gestureStart,src.indexOf('root.addEventListener("submit"',gestureStart));
assert.match(keyboard,/if\(event\.isComposing\|\|event\.keyCode===229\)return;/,'Android Gboard composition must not pick first food');
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
assert.doesNotMatch(entry,/\["keto","Cetogénica/, 'keto is NOT live in intake yet; full release must integrate its server contract first');
console.log('PASS COACH105: Android swipe/IME guards; saved habitual picker + default preview; keto and fasting research modes with macro preservation. STILL NEED hosted profile integration + physical Android + cloud habitual E2E.');
