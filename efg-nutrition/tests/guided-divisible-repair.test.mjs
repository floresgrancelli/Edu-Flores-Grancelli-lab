// Synthetic vectors test numerical repair, not food composition or clinical goals.
import test from 'node:test';
import assert from 'node:assert/strict';
import {rebalanceGuidedDay,guideTotals,guideDeviation} from '../pilot/guided-day.js';
const item=(id,qty,extra={})=>({id,name:'FICTICIO '+id,unit:'g',qty,k:10,p:.1,c:.2,f:.05,fi:.01,...extra});
test('fine repair compensates through divisible grams without fractional counted food',()=>{
 const plan={version:2,kind:'flexible_meal_guide',supplementNote:'',meals:[
  {slot:'desayuno',items:[item('egg',50,{locked:true})]},
  {slot:'cena',items:[item('tofu_firm',80)]}
 ]};
 const before=structuredClone(plan),goal={kcal:1330,protein_g:13.3,carb_g:26.6,fat_g:6.65,fiber_g:1.33};
 const result=rebalanceGuidedDay(plan,goal,{targetTolerance:.001});
 assert.deepEqual(plan,before);
 assert.deepEqual(result.meals[0],before.meals[0]);
 assert.equal(result.meals[1].items[0].qty,83);
 assert.ok(Object.values(guideDeviation(result,goal)).every(x=>Math.abs(x.percent)<.1));
 for(const k of ['k','p','c','f','fi'])assert.equal(guideTotals(result).totals[k],result.meals.flatMap(m=>m.items).reduce((n,x)=>n+x.qty*x[k],0));
 assert.deepEqual(result.meals.map(m=>m.items.map(({qty,...rest})=>rest)),before.meals.map(m=>m.items.map(({qty,...rest})=>rest)));
});
