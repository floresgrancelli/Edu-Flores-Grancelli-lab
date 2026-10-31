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
let persisted=0,quantity='3',chosenFood=maki;
const runSave=new Function('parsePlannerKey','document','makePlan','foods','allowedFoods',
 'activeDiary','activeGoal','dailyTotals','state','plannerMeasuredGrams','plannerSushiPortion',
 'MILK_BEVERAGES','openPlannedFoodEditor','normItem','saveDiary','notify','num',
 source.slice(saveStart,saveEnd)+';return addPlannedFood;')(
 key=>key.split('|'),{getElementById:id=>id.startsWith('planQty_')?{value:quantity}:null},
 ()=>({meals:[{slot:'cena',rows:[{category:'protein',food:chosenFood}]}]}),
 [maki],()=>[maki.id],()=>diary,()=>({}),()=>({}),plannerState,
 api.plannerMeasuredGrams,api.plannerSushiPortion,{},()=>{throw Error('Unexpected beverage');},
 (food,grams,slot)=>({id:food.id,name:food.name,qty:grams,unit:'g',when:slot}),
 async()=>{persisted++},msg=>alerts.push(msg),String
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
console.log('PASS UX-SUSHI: real planner persists estimated grams AND 3 visible pieces, rejects fractions; rice unchanged.');

console.log("PASS: sushi pieces -> gram equivalents for macro engine and first selection DOM preservation (offline).");
