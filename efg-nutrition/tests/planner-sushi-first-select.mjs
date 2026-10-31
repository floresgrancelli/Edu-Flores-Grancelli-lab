import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {FOOD_UNIT_PORTIONS,EXTRA_FOODS} from "../pilot/food-catalog.js";

// Contract-only: run the same pure helpers used by the planner; no network or hosted writes.
const source=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
const start=source.indexOf("// El sushi se muestra por piezas;");
const end=source.indexOf("function plannerCard(){",start);
assert.ok(start>=0&&end>start,"Sushi quantity helpers must exist in planner");
const helperSource=source.slice(start,end);
const api=runInNewContext(helperSource+";({plannerSushiPortion,plannerShownQty,plannerMeasuredGrams,plannerQtyLabel})",{
 FOOD_UNIT_PORTIONS,num:(value)=>String(value)
});
const maki=EXTRA_FOODS.find(f=>f.id==="sushi_maki_salmon");
assert.ok(maki,"Sushi maki must exist in catalog");
const portion=FOOD_UNIT_PORTIONS[maki.id];
assert.equal(portion.grams,28,"Catalog estimate: 28 g per maki piece");
assert.equal(api.plannerShownQty(maki,224),8);
assert.equal(api.plannerMeasuredGrams(maki,8),224);
assert.ok(api.plannerQtyLabel(maki,"g").includes("piezas"));
assert.ok(Number.isNaN(api.plannerMeasuredGrams(maki,1.5)),"Reject fractional pieces");
assert.equal(api.plannerMeasuredGrams({id:"rice"},80),80,"Non-sushi still uses grams");
assert.match(source,/const grams=plannerMeasuredGrams\(food,shownQty\)/,"Preview converts pieces into grams");
assert.match(source,/const grams=plannerMeasuredGrams\(row\.food,shownQty\)/,"Save converts pieces into grams");
assert.match(source,/syncPlannerSearchActions\(key\);updatePlannerPreview\(\);/,"First selection updates controls without replacing select DOM");
assert.doesNotMatch(source,/e\.target\.blur\(\);refreshPlannerCard\(key\)/,"First selection must not destroy the native selector");

// Execute the real planner save handler against a synthetic in-memory diary.
// Piece quantity must survive registration, not only the suggestion preview.
const saveStart=source.indexOf('async function addPlannedFood(key){');
const saveEnd=source.indexOf('let mealDialogReturnFocus=null;',saveStart);
assert.ok(saveStart>=0&&saveEnd>saveStart,'Actual planner save handler must exist');
const diary={meals:{},skipped:{}},alerts=[];
const plannerState={plannerMode:'dinner',plannerSelections:{},plannerDraftGrams:{}};
let persisted=0,quantity='3',chosenFood=maki,failNextSave=false;
const runSave=new Function('parsePlannerKey','document','makePlan','foods','allowedFoods',
 'activeDiary','activeGoal','dailyTotals','state','plannerMeasuredGrams','plannerSushiPortion',
 'MILK_BEVERAGES','openPlannedFoodEditor','normItem','saveDiary','notify','num','pendingMealRegistrations',
 source.slice(saveStart,saveEnd)+';return addPlannedFood;')(
 key=>key.split('|'),{getElementById:id=>id.startsWith('planQty_')?{value:quantity}:null},
 ()=>({meals:[{slot:'cena',rows:[{category:'protein',food:chosenFood}]}]}),
 [maki],()=>[maki.id],()=>diary,()=>({}),()=>({}),plannerState,
 api.plannerMeasuredGrams,api.plannerSushiPortion,{},()=>{throw Error('Unexpected beverage');},
 (food,grams,slot)=>({id:food.id,name:food.name,qty:grams,unit:'g',when:slot}),
 async()=>{if(failNextSave){failNextSave=false;throw Error('network offline')}persisted++},msg=>alerts.push(msg),String,new Set()
);
await runSave('cena|protein');
assert.equal(persisted,1,'Sushi planner should persist only once');
assert.equal(diary.meals.cena.length,1,'Sushi must appear once');
assert.equal(diary.meals.cena[0].qty,84,'Three pieces represent estimated 84 g');
assert.equal(diary.meals.cena[0].displayQty,3,'Diary must display three pieces');
assert.equal(diary.meals.cena[0].displayUnit,portion.label,'Diary must retain piece units');
assert.equal(diary.meals.cena[0].unitEstimate,true,'Approximate weight must remain marked');
assert.ok(alerts[0].includes('3 piezas'),'Notification should report piece count');
quantity='1.5';
await assert.rejects(runSave('cena|protein'),/entera/,'Fractional pieces must be rejected');
assert.equal(persisted,1,'Invalid pieces cannot be saved');
quantity='2';chosenFood={id:'rice',name:'Arroz',unit:'g'};
await runSave('cena|protein');
assert.equal(diary.meals.cena[1].qty,2,'Ordinary food still records grams');
assert.equal(diary.meals.cena[1].displayQty,undefined,'Ordinary food has no piece metadata');

const beforeFailure=structuredClone(diary.meals.cena);
quantity='4';chosenFood=maki;plannerState.plannerSelections['cena|protein']='sushi_maki_salmon';
plannerState.plannerDraftGrams={'cena|protein':112};
const beforeDraft=plannerState.plannerDraftGrams;
failNextSave=true;
await assert.rejects(runSave('cena|protein'),/network offline/);
assert.deepEqual(diary.meals.cena,beforeFailure,'Rejected planner write leaves no phantom food');
assert.equal(plannerState.plannerSelections['cena|protein'],'sushi_maki_salmon');
assert.strictEqual(plannerState.plannerDraftGrams,beforeDraft,'Failed write restores quantity draft');
assert.equal(persisted,2);
await runSave('cena|protein');
assert.equal(diary.meals.cena.length,3,'A successful retry must not double-register');
assert.equal(diary.meals.cena[2].displayQty,4);
assert.equal(persisted,3);

const directStart=source.indexOf('async function saveSelectedMeal(continueGuided=false){');
const directEnd=source.indexOf('function coachFoodChoices(',directStart);
assert.ok(directStart>=0&&directEnd>directStart,'Actual direct meal editor exists');
const directState={activeMeal:'cena',diary};
let failDirect=true,directWrites=0;
const directSave=new Function('state','measureMealEntry','foodAllowedForMeal','allowedFoods',
 'FOOD_STATE_PAIRS','activeDiary','BEVERAGE_IDS','calculateBeverage','normItem','isGuidedMealSlot',
 'guidedMealGroupFor','groupIdFor','today','saveDiary','openMealDialog','notify','pendingMealRegistrations',
 source.slice(directStart,directEnd)+';return saveSelectedMeal;')(
 directState,()=>({f:maki,qty:2,grams:56,useUnits:true,portion}),
 ()=>true,()=>[maki.id],{},()=>diary,new Set(),()=>{throw Error('not a beverage')},
 (f,grams,slot)=>({id:f.id,name:f.name,qty:grams,unit:'g',when:slot}),
 ()=>false,()=>null,()=>null,()=> '2026-10-31',
 async()=>{if(failDirect)throw Error('network offline');directWrites++;},
 ()=>{throw Error('Unexpected dialog')},msg=>alerts.push(msg),new Set()
);
const beforeDirect=structuredClone(diary.meals.cena);
await assert.rejects(directSave(),/network offline/);
assert.deepEqual(diary.meals.cena,beforeDirect,'Rejected direct write leaves no phantom food');
assert.equal(directState.activeMeal,'cena','Editor must remain open on failure');
failDirect=false;
await directSave();
assert.equal(directWrites,1);
assert.equal(diary.meals.cena.length,beforeDirect.length+1,'Manual retry writes only once');

const asyncLocks=new Set(),asyncState={plannerMode:'dinner',plannerSelections:{},plannerDraftGrams:{}};
let releasePlanner,plannerWrites=0,readPlanner='3';
const pendingPromise=new Promise(resolve=>{releasePlanner=resolve});
const pendingAdd=new Function('parsePlannerKey','document','makePlan','foods','allowedFoods',
 'activeDiary','activeGoal','dailyTotals','state','plannerMeasuredGrams','plannerSushiPortion',
 'MILK_BEVERAGES','openPlannedFoodEditor','normItem','saveDiary','notify','num','pendingMealRegistrations',
 source.slice(saveStart,saveEnd)+';return addPlannedFood;')(
 key=>key.split('|'),{getElementById:id=>id.startsWith('planQty_')?{value:readPlanner}:null},
 ()=>({meals:[{slot:'cena',rows:[{category:'protein',food:maki}]}]}),
 [maki],()=>[maki.id],()=>diary,()=>({}),()=>({}),asyncState,
 api.plannerMeasuredGrams,api.plannerSushiPortion,{},()=>{throw Error('Unexpected beverage')},
 (food,grams,slot)=>({id:food.id,name:food.name,qty:grams,unit:'g',when:slot}),
 async()=>{plannerWrites++;await pendingPromise},()=>{},String,asyncLocks
);
const beforeConcurrent=diary.meals.cena.length;
const firstPending=pendingAdd('cena|protein');
await pendingAdd('cena|protein'); // Second tap while the network is still pending.
assert.equal(plannerWrites,1,'Repeated tap does not launch a second network upsert');
assert.equal(diary.meals.cena.length,beforeConcurrent+1,'Repeated tap adds one draft');
releasePlanner();
await firstPending;
assert.equal(asyncLocks.size,0,'Lock is always released after response');
assert.equal(diary.meals.cena.length,beforeConcurrent+1,'No duplicate after concurrent taps');

// Cross-route protection for manual entry and planner on the same slot.
const crossLocks=new Set(['cena']);
const guardedSave=new Function('state','measureMealEntry','foodAllowedForMeal','allowedFoods',
 'FOOD_STATE_PAIRS','activeDiary','BEVERAGE_IDS','calculateBeverage','normItem','isGuidedMealSlot',
 'guidedMealGroupFor','groupIdFor','today','saveDiary','openMealDialog','notify','pendingMealRegistrations',
 source.slice(directStart,directEnd)+';return saveSelectedMeal;')(
 {activeMeal:'cena'},()=>{throw Error('Manual editor should be skipped while slot is busy')},
 ()=>true,()=>[maki.id],{},()=>diary,new Set(),()=>null,()=>null,()=>false,()=>null,()=>null,
 ()=> '2026-10-31',async()=>{},()=>{},()=>{},crossLocks);
await guardedSave();
assert.equal(diary.meals.cena.length,beforeConcurrent+1,'Busy slot cannot accept a simultaneous manual save');

// Removal uses the same meal lock and restores both list and skipped flags on failed upsert.
assert.match(source,/if\(el\.dataset\.removefood\)\{[\s\S]*?pendingMealRegistrations\.has\(slot\)[\s\S]*?previousItems=structuredClone\(d\.meals\[slot\]\)[\s\S]*?catch\(error\)\{[\s\S]*?d\.meals\[slot\]=previousItems/);



// Run the actual diary persister with a failed REST upsert. A stale calorie
// total must not survive a rejected write when the UI retries.
const realSaveStart=source.indexOf('async function saveDiary(){');
const realSaveEnd=source.indexOf('async function loadPersonalData(){',realSaveStart);
assert.ok(realSaveStart>=0&&realSaveEnd>realSaveStart,'Real daily persister exists');
const persistedDiary={log_day:'2026-10-31',student_id:null,meals:{cena:[]},
 sports:[],skipped:{},totals:{k:123,p:9,c:12,f:4,fi:3}};
const persistedState={session:{user:{id:'student-test-id'}},diary:persistedDiary,progressLogs:[]};
let pendingWrite,rejectWrite=true,renderCalls=0;
const fakeDailySb={from(table){
 assert.equal(table,'efg_daily_logs');
 return {upsert(row,options){
  assert.equal(options.onConflict,'student_id,log_day');
  pendingWrite=structuredClone(row);
  return {select(){return {single:async()=>rejectWrite?
   {data:null,error:Error('network offline')}:
   {data:{...structuredClone(row)},error:null}}}};
 }};
}};
const actualSave=new Function('activeDiary','today','isNutritionDayClosed','dailyTotals','state','sb','render',
 source.slice(realSaveStart,realSaveEnd)+';return saveDiary;')(
 ()=>persistedDiary,()=> '2026-10-31',()=>false,
 ()=>({k:250,p:15,c:30,f:6,fi:4}),persistedState,fakeDailySb,
 async()=>{renderCalls++}
);
await assert.rejects(actualSave(),/network offline/);
assert.equal(pendingWrite.totals.k,250,'Supabase receives freshly calculated macros');
assert.equal(persistedDiary.totals.k,123,'Unconfirmed totals cannot remain in the diary');
assert.equal(persistedState.diary,persistedDiary,'Failed write retains previous diary state');
assert.equal(renderCalls,0,'Failed write cannot signal a successful render');
rejectWrite=false;
await actualSave();
assert.equal(persistedState.diary.totals.k,250,'Confirmed totals reach the diary only after REST success');
assert.equal(renderCalls,1,'Successful write triggers one render');


// A skipped-meal checkbox must not claim a persisted omission when the
// PostgREST write rejects. Test the actual toggle handler, including a
// concurrent write on the same meal and a later successful retry.
const skipStart=source.indexOf('async function saveSkippedMealChoice(slot,checked,checkbox){');
const skipEnd=source.indexOf('root.addEventListener("change",e=>{invalidateCoachDraft(e);',skipStart);
assert.ok(skipStart>=0&&skipEnd>skipStart,'Real skipped-meal persist handler exists');
const skipDiary={skipped:{desayuno:false,_closed:false},meals:{desayuno:[]},totals:{k:0}};
const skipState={diary:skipDiary},skipLock=new Set();
let skipFail=true,skipWrites=0;
const skipAction=new Function('mealSlots','activeDiary','pendingMealRegistrations','state','saveDiary',
 source.slice(skipStart,skipEnd)+';return saveSkippedMealChoice;')(
 [['desayuno','Desayuno']],()=>skipDiary,skipLock,skipState,async()=>{
  skipWrites++;if(skipFail)throw Error('offline');
 });
const checkbox={checked:true};
await assert.rejects(skipAction('desayuno',true,checkbox),/offline/);
assert.equal(skipDiary.skipped.desayuno,false,'Failed omit must restore original diary state');
assert.equal(checkbox.checked,false,'Failed omit must restore actual checkbox');
assert.equal(skipLock.size,0,'Rejected write must release slot');
skipLock.add('desayuno');checkbox.checked=true;
await skipAction('desayuno',true,checkbox);
assert.equal(skipWrites,1,'Busy slot cannot start an overlapping skipped-meal write');
assert.equal(checkbox.checked,false,'Busy slot must reset checkbox to committed state');
skipLock.delete('desayuno');
skipFail=false;checkbox.checked=true;
await skipAction('desayuno',true,checkbox);
assert.equal(skipWrites,2,'Retry saves once after slot is free');
assert.equal(skipDiary.skipped.desayuno,true,'Successful retry applies omitted state');
assert.equal(skipLock.size,0,'Successful write releases slot');

console.log('PASS UX-SUSHI: real planner persists estimated grams AND 3 visible pieces, rejects fractions; rice unchanged.');

console.log("PASS: sushi pieces -> gram equivalents for macro engine and first selection DOM preservation (offline).");
