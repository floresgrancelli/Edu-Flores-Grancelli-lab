// Fictional quantities/composition only; no network, account, or persisted data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {guidedCountablePortion,normalizeGuidedCountableQuantity as normalize} from '../pilot/guided-countable-portions.js';
import {rebalanceGuidedDay,guideTotals,guideDeviation,guideQuantityRanges,validateGuidedDay} from '../pilot/guided-day.js';
import {addFlexibleFood,replaceFlexibleFood} from '../pilot/guided-day-v2.js';
import {FOOD_UNIT_PORTIONS} from '../pilot/food-catalog.js';
import {validateCoachPlanProposal} from '../pilot/coach-plan-draft-client.js';
import {createGuideEditor,updateGuideEditor,reviewEditedGuide} from '../pilot/adapted-guide-editor.js';
import {food as source,context} from './adapted-guide-fixtures.mjs';
const f=(id,qty,extra={})=>({id,name:'FICTICIO '+id,unit:'g',qty,k:4,p:.2,c:.5,f:.1,fi:.03,...extra});
const goal={goal_type:'maintenance',kcal:2000,protein_g:100,carb_g:250,fat_g:60,fiber_g:25};
const screenshot=()=>({kind:'flexible_meal_guide',version:2,supplementNote:'',meals:[
 {slot:'merienda',label:'Merienda',items:[f('bread',50),f('cheese',55),f('mandarin',80)]},
 {slot:'cena',label:'Cena',items:[f('tofu_firm',200),f('brownrice',200),f('oil',5,{k:9,p:0,c:0,f:1,fi:0})]}]});
const integer=(item)=>{const rule=guidedCountablePortion(item.id);if(rule&&!item.recipeComponent)assert.ok(Math.abs(item.qty/rule.grams-Math.round(item.qty/rule.grams))<1e-8,`${item.id}: ${item.qty}`);};
test('screenshot real grams normalize to 2 slices, 2 cheese slices, 1 mandarin',()=>{
 assert.deepEqual(screenshot().meals[0].items.map(normalize),[60,50,90]);
 for(const [id,p] of Object.entries(FOOD_UNIT_PORTIONS))if(guidedCountablePortion(id)){
  for(const count of [.1,1,1.67,2.2,3.3,7.9])integer(f(id,normalize(f(id,count*p.grams))));
 }
 for(const id of ['whey_powder','cake','scrambled_eggs','mixed_nuts','fruit_salad_basic'])assert.equal(guidedCountablePortion(id),null);
});
test('optimizer keeps all counts integral, recomputes exact nutrients and preserves sources',()=>{
 const original=screenshot(),copy=structuredClone(original);let p=original;
 for(let i=0;i<5;i++){
  p=rebalanceGuidedDay(p,goal,{targetTolerance:.05});
  p.meals.flatMap(m=>m.items).forEach(integer);
  const totals=guideTotals(p);
  for(const k of ['k','p','c','f','fi'])assert.equal(totals.totals[k],p.meals.flatMap(m=>m.items).reduce((s,x)=>s+x.qty*x[k],0));
 }
 assert.deepEqual(original,copy);
 assert.notEqual(guideTotals(p).totals.k,guideTotals(copy).totals.k);
 assert.deepEqual(p.meals.flatMap(m=>m.items.map(({qty,...rest})=>rest)),copy.meals.flatMap(m=>m.items.map(({qty,...rest})=>rest)));
 assert.deepEqual(guideQuantityRanges({meals:[{items:[f('bread',50)]}]}).k,{min:120,max:240});
});
test('manual add/replace, locks, recipes and infeasible target remain honest',()=>{
 const p=screenshot();p.meals[0].items=p.meals[0].items.slice(1);p.meals[0].items.forEach(x=>x.qty=normalize(x));
 const catalog=[f('bread',1),f('cheese',1)];
 const added=addFlexibleFood(p,'merienda',{id:'bread',qty:50},catalog,goal);
 assert.equal(added.meals[0].items.find(x=>x.id==='bread').qty,60);
 assert.equal(added.meals[0].items.find(x=>x.id==='bread').locked,true);
 const replaced=replaceFlexibleFood(p,'merienda',0,{id:'bread',qty:50},catalog,goal);assert.equal(replaced.meals[0].items[0].qty,60);
 const locked=screenshot();locked.meals[0].items[0].locked=true;
 assert.throws(()=>rebalanceGuidedDay(locked,goal),/unidades enteras/);assert.equal(locked.meals[0].items[0].qty,50);
 const recipe=f('bread',5.5,{recipeComponent:true,locked:true});assert.equal(normalize(recipe),5.5);
 const fixed=screenshot();for(const x of fixed.meals.flatMap(m=>m.items)){x.qty=normalize(x);x.locked=true;}
 const impossible=rebalanceGuidedDay(fixed,{...goal,kcal:6000});assert.deepEqual(impossible,fixed);assert.ok(Math.abs(guideDeviation(impossible,{...goal,kcal:6000}).k.percent)>5);
});
test('persistence validation rejects fractional raw/reloaded drafts without mutating them',()=>{
 const old=screenshot(),saved=structuredClone(old);assert.throws(()=>validateCoachPlanProposal(goal,old),/unidades enteras/);assert.deepEqual(old,saved);
 assert.throws(()=>validateGuidedDay(old,goal),/unidades enteras/);
 const p=rebalanceGuidedDay(old,goal),persisted=JSON.parse(JSON.stringify(validateCoachPlanProposal(goal,p).guide));
 assert.deepEqual(persisted.meals,p.meals);assert.deepEqual(guideTotals(persisted),guideTotals(p));
 persisted.meals[0].items.forEach(integer);
});
test('private editor normalizes explicit edit, rejects old fractions and preserves cancel',()=>{
 const catalog=[source('fresh_a'),source('fresh_b'),source('bread')];
 const plan={meals:['desayuno','media_manana','almuerzo','merienda','cena'].map(slot=>({slot,label:slot,items:[{...catalog[0],qty:100},{...catalog[1],qty:100}]}))};
 const env={catalog,context,goal:{kcal:2230,protein_g:200,carb_g:20,fat_g:150,fiber_g:20}};
 const original=createGuideEditor({ok:true,plan},env);
 let s=updateGuideEditor(original,{type:'begin'},env);
 s=updateGuideEditor(s,{type:'replace',slot:'desayuno',index:0,id:'bread',unit:'g',qty:50},env);
 assert.equal(s.working.meals[0].items[0].qty,60);
 assert.equal(s.review.totals.k,guideTotals(s.review.normalizedPlan).totals.k);
 assert.deepEqual(updateGuideEditor(s,{type:'cancel'},env).working,original.committed);
 const bad=structuredClone(plan);bad.meals[0].items[0]={...catalog[2],qty:50};
 assert.ok(reviewEditedGuide(bad,env).issues.some(i=>i.code==='countable'));
});
test('preview uses actual canonical quantities, no display-only rounding',()=>{
 const code=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
 const from=code.indexOf('function guidePortion(food)'),end=code.indexOf('function guidedDayContents(',from);
 const sandbox={FOOD_UNIT_PORTIONS,num:(x)=>String(x)};vm.createContext(sandbox);vm.runInContext(code.slice(from,end),sandbox);
 const p=screenshot();p.meals[0].items.forEach(x=>x.qty=normalize(x));
 assert.deepEqual(p.meals[0].items.map(x=>sandbox.guideQuantityLabel(x)),['2 × rebanada','2 × feta','1 × mandarina mediana']);
 assert.equal(sandbox.guideQuantityLabel(f('bread',45)),'1.5 × rebanada'); // rendering never conceals stale bad state
});

test('small whole units tolerate floating point in actual manual input gate',()=>{
 const code=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
 const line=code.split('\n').find(x=>x.includes('Normalize on change, before locking.'));
 const condition=line.match(/if\((.*)\)return;/)[1];
 const blocked=(qty,countable)=>vm.runInNewContext(condition,{qty,countable});
 assert.equal(blocked(7*1.2,{grams:1.2}),false);
 assert.equal(blocked(7.3*1.2,{grams:1.2}),true);
});

test('every catalog equivalence has an explicit reviewed countable/divisible classification',()=>{
 const reviewed=JSON.parse(readFileSync(new URL('./countable-catalog-reviewed.json',import.meta.url),'utf8'));
 assert.equal(new Set([...reviewed.countable,...reviewed.divisible]).size,Object.keys(FOOD_UNIT_PORTIONS).length);
 assert.deepEqual([...reviewed.countable,...reviewed.divisible].sort(),Object.keys(FOOD_UNIT_PORTIONS).sort(),
  'Review each new equivalence explicitly: a piece is not the same as a serving or a multipack');
 for(const id of reviewed.countable){assert.ok(guidedCountablePortion(id),id);integer(f(id,normalize(f(id,FOOD_UNIT_PORTIONS[id].grams*1.25))));}
 for(const id of reviewed.divisible)assert.equal(guidedCountablePortion(id),null,id);
 for(const id of ['arcor_chocolate_leche_porcion','arcor_chocolate_blanco_porcion']){
  assert.equal(FOOD_UNIT_PORTIONS[id].label,'2 unidades');assert.equal(normalize(f(id,20)),20);
 }
});
test('all additional individual units survive add, replace, optimize, save and reload as whole counts',()=>{
 const required=['empanada_atun_horno','empanada_verdura_horno','empanada_jamon_queso_horno',
  'empanada_humita_horno','empanada_carne_horno_extra','tostada_pan_miga','pan_campo_panaderia',
  'sushi_nigiri_atun','sushi_sashimi_salmon','milanesa_soy_gobinda','medallon_pollo_simple',
  'galletitas_agua','helado_palito_agua','arcor_bon_o_bon_blanco'];
 const ids=JSON.parse(readFileSync(new URL('./countable-catalog-reviewed.json',import.meta.url),'utf8')).countable;
 for(const id of required)assert.ok(ids.includes(id),id);
 for(const id of ids){
  const grams=FOOD_UNIT_PORTIONS[id].grams,base=rebalanceGuidedDay(screenshot(),goal);
  base.meals[0].items=base.meals[0].items.filter(x=>x.id!==id);
  const added=addFlexibleFood(base,'merienda',{id,qty:grams*1.25},[f(id,1)],goal);
  const item=added.meals[0].items.find(x=>x.id===id);assert.equal(item.qty,grams,id);assert.equal(item.locked,true);
  const replaced=replaceFlexibleFood(base,'merienda',0,{id,qty:grams*1.25},[f(id,1)],goal);
  assert.equal(replaced.meals[0].items[0].qty,grams,id);
  const optimized=rebalanceGuidedDay(added,goal);assert.equal(optimized.meals[0].items.find(x=>x.id===id).qty,grams,id);
  const persisted=JSON.parse(JSON.stringify(validateCoachPlanProposal(goal,optimized).guide));
  persisted.meals.flatMap(m=>m.items).forEach(integer);assert.deepEqual(guideTotals(persisted),guideTotals(optimized));
  assert.equal(normalize(f(id,grams*.25,{recipeComponent:true})),grams*.25,'Exact decomposed recipe '+id);
 }
});
