import test from 'node:test';
import assert from 'node:assert/strict';
import {guidedCountablePortion,normalizeGuidedCountableQuantity} from '../pilot/guided-countable-portions.js?v=ncc-pilot-3a40474052be';
import {GUIDE_MEALS,rebalanceGuidedDay,guideTotals,guideDeviation,guideQuantityRanges,validateGuidedDay,swapGuidedFood} from '../pilot/guided-day.js?v=ncc-pilot-3a40474052be';
import {addFlexibleFood,replaceFlexibleFood,generateFlexibleGuidedDay,guideFoodSignal} from '../pilot/guided-day-v2.js';
import {FOOD_UNIT_PORTIONS} from '../pilot/food-catalog.js?v=ncc-pilot-3a40474052be';
// Deliberately fictional nutrient vectors; never used as food composition data.
const food=(id,qty,extra={})=>({id,name:'Synthetic '+id,unit:'g',qty,k:5,p:.3,c:.4,f:.2,fi:.05,sourceType:'synthetic_test',sourceId:'fixture',validationStatus:'fixture_only',...extra});
const plan=()=>({version:2,kind:'flexible_meal_guide',supplementNote:'',restrictionSource:{revision:7},meals:[{slot:'desayuno',label:'Desayuno',items:[food('egg',165),food('tofu_firm',80)]},{slot:'cena',label:'Cena',items:[food('tempeh',155)]}]});
const goal={kcal:2000,protein_g:120,carb_g:160,fat_g:80,fiber_g:20};
const error=p=>Object.values(guideDeviation(p,goal)).reduce((v,x)=>v+Math.abs(x.percent),0);
test('catalog is the source of the explicit whole-egg unit; 3.3 becomes 3 real units',()=>{
 assert.equal(guidedCountablePortion('egg').grams,FOOD_UNIT_PORTIONS.egg.grams);
 assert.equal(normalizeGuidedCountableQuantity(food('egg',165)),150);
 assert.equal(GUIDE_MEALS[0].items[0][1],100);
 for(const qty of [50,75,100,110,149,150,165,999])assert.equal(normalizeGuidedCountableQuantity(food('egg',qty))%50,0);
 assert.equal(guidedCountablePortion('bread'),null);
 assert.equal(normalizeGuidedCountableQuantity(food('bread',33.3)),33.3);
 assert.equal(normalizeGuidedCountableQuantity(food('scrambled_eggs',165)),165);
});
test('rebalances the real deficit using only existing foods, preserving source and restrictions',()=>{
 const original=plan(),snapshot=structuredClone(original),rounded=structuredClone(original);rounded.meals[0].items[0].qty=150;
 const result=rebalanceGuidedDay(original,goal,{targetTolerance:.05});
 assert.deepEqual(original,snapshot);
 assert.equal(result.meals[0].items[0].qty,150);
 assert.equal(result.meals[0].items[0].qty/FOOD_UNIT_PORTIONS.egg.grams,3);
 assert.ok(error(result)<error(rounded),`${error(result)} should improve ${error(rounded)}`);
 assert.notEqual(guideTotals(result).totals.k,guideTotals(rounded).totals.k);
 assert.deepEqual(result.restrictionSource,original.restrictionSource);
 const strip=p=>p.meals.flatMap(m=>m.items.map(({qty,...rest})=>rest));
 assert.deepEqual(strip(result),strip(original));
 assert.ok(result.meals.flatMap(m=>m.items).some((f,i)=>f.id!=='egg'&&f.qty!==original.meals.flatMap(m=>m.items)[i].qty));
});
test('locked integer portions and exact recipe fractions are not changed',()=>{
 const p=plan();p.meals[0].items[0]=food('egg',100,{locked:true});
 p.meals[0].items.push(food('egg',16.5,{recipeComponent:true}));
 const result=rebalanceGuidedDay(p,goal);
 assert.deepEqual(result.meals[0].items[0],p.meals[0].items[0]);
 assert.deepEqual(result.meals[0].items.at(-1),p.meals[0].items.at(-1));
 const recipeOnly={meals:[{items:[p.meals[0].items.at(-1)]}]};
 assert.deepEqual(guideQuantityRanges(recipeOnly).k,{min:82.5,max:82.5});
});
test('existing fractional locks fail closed rather than silently changing the coach choice',()=>{
 const p=plan();p.meals[0].items[0]=food('egg',110,{locked:true});
 assert.throws(()=>rebalanceGuidedDay(p,goal),/unidades enteras/);
 assert.equal(p.meals[0].items[0].qty,110);
 assert.throws(()=>validateGuidedDay(p,goal),/unidades enteras/);
});
test('validation disallows fractional standalone eggs but allows recipe fractions',()=>{
 const p=plan();p.meals[0].items[0].qty=110;
 assert.throws(()=>validateGuidedDay(p,goal),/unidades enteras/);
 p.meals[0].items[0].recipeComponent=true;
 assert.doesNotThrow(()=>validateGuidedDay(p,goal));
 assert.throws(()=>normalizeGuidedCountableQuantity(food('egg',3,{unit:'unit'})),/unidad/);
});
test('adding and replacing normalize quantities before the new manual lock is applied',()=>{
 const p=plan();p.meals[0].items.shift();
 const catalog=[food('egg',1),food('tofu_firm',1)];
 const added=addFlexibleFood(p,'desayuno',{id:'egg',qty:165},catalog,goal);
 assert.equal(added.meals[0].items.find(x=>x.id==='egg').qty,150);
 assert.equal(added.meals[0].items.find(x=>x.id==='egg').locked,true);
 const replaced=replaceFlexibleFood(p,'desayuno',0,{id:'egg',qty:110},catalog,goal);
 assert.equal(replaced.meals[0].items[0].qty,100);
 const swapped=swapGuidedFood(p,'desayuno',0,'egg',catalog);
 assert.equal(swapped.meals[0].items[0].qty%50,0);
});
test('infeasible compensation remains visibly outside target and does not invent nutrients',()=>{
 const p=plan();p.meals[0].items[1].locked=true;p.meals[1].items[0].locked=true;
 const result=rebalanceGuidedDay(p,{...goal,kcal:5000},{targetTolerance:.05});
 assert.equal(result.meals[0].items[0].qty,150);
 assert.equal(result.meals[0].items[1].qty,80);
 assert.equal(result.meals[1].items[0].qty,155);
 assert.ok(Math.abs(guideDeviation(result,{...goal,kcal:5000}).k.percent)>5);
});

test('fresh guides use integer eggs and keep declared dietary exclusions',()=>{
 const ids=[...new Set([...GUIDE_MEALS.flatMap(m=>m.items.map(([id])=>id)),'tofu_firm','tempeh','walnuts','banana','chickpeas_cooked','soy_textured_hydrated','strawberry'])];
 const catalog=ids.map(id=>food(id,1));
 for(const profile of [{pattern:'balanced',restrictionStatus:'none_declared'},{pattern:'vegan',restrictionStatus:'none_declared'},{restrictions:['lactose_intolerance'],restrictionStatus:'declared'}]){
  const generated=generateFlexibleGuidedDay(catalog,goal,profile);
  for(const item of generated.meals.flatMap(m=>m.items)){
   assert.notEqual(guideFoodSignal(item,profile).status,'avoid');
   if(item.id==='egg')assert.equal(item.qty%50,0);
  }
 }
});

test('normalized egg counts survive opposing targets and repeated optimization',()=>{
 for(const kcal of [1200,6000]){
  const p=plan();p.meals[0].items[1]=food('tofu_firm',250,{locked:true});p.meals[1].items[0]=food('tempeh',180,{locked:true});
  const target={kcal,protein_g:kcal*.06,carb_g:kcal*.08,fat_g:kcal*.04};
  for(const tolerance of [null,.05,0]){
   const result=rebalanceGuidedDay(p,target,{targetTolerance:tolerance});
   assert.equal(result.meals[0].items[0].qty,150);
   assert.equal(result.meals[0].items[0].locked,undefined);
   assert.equal(rebalanceGuidedDay(result,target,{targetTolerance:tolerance}).meals[0].items[0].qty,150);
   assert.ok(Math.abs(guideDeviation(result,target).k.percent)>5);
  }
 }
});
test('necessary ranges match fixed normalized counts without mutating the input',()=>{
 const p={meals:[{items:[food('egg',165)]}]};
 assert.deepEqual(guideQuantityRanges(p).k,{min:750,max:750});
 assert.equal(p.meals[0].items[0].qty,165);
});

test('totals are independently recomputed from canonical quantities, including exact recipes',()=>{
 const p=plan();p.meals[0].items.push(food('egg',16.5,{recipeComponent:true,recipeId:'fixture-recipe',recipeLabel:'Synthetic recipe',sourceApprovalId:'fixture-approval',sourceUrl:'https://example.invalid/recipe',locked:true}));
 const original=structuredClone(p);const result=rebalanceGuidedDay(p,goal,{targetTolerance:.05});
 const totals=guideTotals(result);
 for(const key of ['k','p','c','f','fi']){
  const expected=result.meals.reduce((n,m)=>n+m.items.reduce((v,f)=>v+f.qty*f[key],0),0);
  assert.ok(Math.abs(totals.totals[key]-expected)<1e-9);
  assert.ok(Math.abs(totals.perMeal.reduce((n,m)=>n+m.totals[key],0)-expected)<1e-9);
  assert.ok(Math.abs(guideDeviation(result,goal)[key].actual-expected)<1e-9);
 }
 assert.deepEqual(result.meals[0].items.at(-1),original.meals[0].items.at(-1));
 assert.deepEqual(p,original);
});
