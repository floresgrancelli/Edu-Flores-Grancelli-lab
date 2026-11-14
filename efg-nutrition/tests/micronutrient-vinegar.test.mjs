import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {MICRONUTRIENT_CATALOG as c} from '../pilot/micronutrient-expanded-catalog.js';
import {estimateDailyMicronutrients as estimate} from '../pilot/micronutrient-engine.js';
const old=p=>execFileSync('git',['show','2dcf6b83ddeef76587c37d291bb9ae15b1f5b444:'+p],{encoding:'utf8',maxBuffer:4*1024*1024});
const raw=old('efg-nutrition/pilot/micronutrient-catalog.js');
const before={...JSON.parse(raw.slice(raw.indexOf(' = ')+3).replace(/;\s*$/,'')).foods,...JSON.parse(old('efg-nutrition/pilot/micronutrient-expanded-catalog.js').split('export const NEW_MICRONUTRIENT_ESTIMATES=')[1].split(';\nexport const MICRONUTRIENT_CATALOG=')[0])};
let improved=0,covered=0;
for(const [id,f] of Object.entries(before)){
 const n=c.foods[id];
 assert.equal(n.unit,f.unit);
 for(const [key,v] of Object.entries(f.perUnit))if(v!==null&&!f.incompleteNutrients?.includes(key))assert.equal(n.perUnit[key],v,id+':'+key);
 assert.deepEqual(n.ingredients,f.ingredients,id+': quantities');
 const p=n.nutrientProvenance?.ala?.afcdVinegar;
 if(p){
  covered++;assert.equal(p.foodCode,'F009498');assert.equal(p.value,0);assert.equal(p.sourceUnit,'g/100g');
  assert.equal(n.perUnit.ala,f.perUnit.ala,'Published zero improves coverage without inflating intake');
  assert.equal(n.incompleteNutrients.includes('ala'),false,id);
  assert.equal(n.perUnit.b12,f.perUnit.b12);assert.equal(n.perUnit.dha,f.perUnit.dha);
 }
 improved+=JSON.stringify(n.perUnit)!==JSON.stringify(f.perUnit)||JSON.stringify(n.incompleteNutrients)!==JSON.stringify(f.incompleteNutrients);
}
assert.ok(covered>30);
assert.equal(c.foods.pita_wholewheat.perUnit.ala,.0007);
assert.equal(c.foods.corn_tortilla_ready.perUnit.ala,.0002);
for(const id of ['sushi_maki_salmon','rest_sushiclub_combo_30','pita_wholewheat','corn_tortilla_ready']){
 const totals=qty=>estimate({diary:{log_day:'2026-11-14',meals:{cena:[{id,qty,unit:c.foods[id].unit,sourceId:c.foods[id].catalogSourceId}]}},catalog:c,referenceMode:'general'}).nutrients;
 const a=totals(100),b=totals(50);for(let i=0;i<a.length;i++)assert.equal(b[i].total,a[i].total===null?null:a[i].total/2);
 assert.equal(a.find(n=>n.id==='ala').foodUnknown,0);
}
assert.equal(c.foods.herbal_tea.perUnit.ala,null);
const complete=Object.values(c.foods).filter(f=>Object.values(f.perUnit).every(v=>v!==null)&&!f.incompleteNutrients?.length).length;
console.log(JSON.stringify({improved,covered,complete,partial:853-complete}));
