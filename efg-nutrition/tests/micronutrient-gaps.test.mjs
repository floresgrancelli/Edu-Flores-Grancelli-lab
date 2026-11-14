import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {MICRONUTRIENT_CATALOG as c} from '../pilot/micronutrient-expanded-catalog.js';
import {estimateDailyMicronutrients as estimate} from '../pilot/micronutrient-engine.js';
const baseline='ce12efcbb9440e2a51d86d508d2a1ecc533d2836';
const oldFile=path=>execFileSync('git',['show',`${baseline}:${path}`],{encoding:'utf8'});
const oldBase=JSON.parse(oldFile('efg-nutrition/pilot/micronutrient-catalog.js').slice(oldFile('efg-nutrition/pilot/micronutrient-catalog.js').indexOf(' = ')+3).replace(/;\s*$/,''));
const oldExtra=JSON.parse(oldFile('efg-nutrition/pilot/micronutrient-expanded-catalog.js').split('export const NEW_MICRONUTRIENT_ESTIMATES=')[1].split(';\nexport const MICRONUTRIENT_CATALOG=')[0]);
const before={...oldBase.foods,...oldExtra};
assert.equal(Object.keys(c.foods).length,853);
let changed=0,changedFoods=0;
for(const [id,f]of Object.entries(before)){
 const after=c.foods[id];let touched=false;
 assert.equal(after.unit,f.unit);assert.equal(after.catalogSourceId,f.catalogSourceId);
 for(const [key,v]of Object.entries(f.perUnit)){
  if(v!==null&&!f.incompleteNutrients?.includes(key))assert.equal(after.perUnit[key],v,id+':'+key);
  if(after.perUnit[key]!==v){changed++;touched=true;assert.ok(v===null||f.incompleteNutrients.includes(key));}
 }
 if(touched)changedFoods++;
}
const dir=new URL('../docs/micronutrients-gaps-20261114/',import.meta.url);
const get=name=>JSON.parse(readFileSync(new URL(name,dir)));
for(const [file,hash]of Object.entries(get('manifest.json').files))assert.equal(createHash('sha256').update(readFileSync(new URL(file,dir))).digest('hex'),hash);
const rows=get('cofid-selected.json'),mappings=get('mappings.json');
for(const m of mappings){
 const f=c.foods[m.foodId],p=f.nutrientProvenance[m.nutrient];
 assert.match(p.note,/ESTIMACIÓN/);assert.ok(p.sourceUrl.startsWith('https://'));assert.equal(before[m.foodId].perUnit[m.nutrient],null);
 if(m.source==='CoFID 2021'){
  const cell=rows.rows[m.sheet][m.code][m.column];assert.match(String(cell),/^\d+(\.\d+)?$/);
  const value=Number(cell)*(f.gramsPerMl||1)/100*(m.nutrient==='epa'||m.nutrient==='dha'?1000:1);
  assert.ok(Math.abs(value-f.perUnit[m.nutrient])<1e-9);
 }
}
const total=(id,qty)=>estimate({diary:{log_day:'2026-11-14',meals:{cena:[{id,qty,unit:c.foods[id].unit,sourceId:c.foods[id].catalogSourceId}]}},catalog:c,referenceMode:'general'}).nutrients;
for(const id of ['fish_salmon','milk_soy_unsweet','medialuna_butter','rest_mc_big_mac','helado_palito_crema']){
 const a=total(id,100),b=total(id,50);for(let i=0;i<a.length;i++)assert.equal(b[i].total,a[i].total===null?null:a[i].total/2);
}
assert.equal(c.foods.milk_skim.perUnit.ala,0,'Explicit numeric AFCD value, not a converted CoFID trace');
assert.equal(c.foods.milk_skim.nutrientProvenance.ala.source,'FSANZ AFCD Release 3');
assert.equal(c.foods.herbal_tea.perUnit.ala,null,'Unmatched herbal tea remains unknown');
assert.equal(c.foods.chinchulines_grilled.perUnit.b12,null,'Unmatched B12 remains unknown');
const complete=foods=>Object.values(foods).filter(f=>Object.values(f.perUnit).every(v=>v!==null)&&!f.incompleteNutrients?.length).length;
console.log(JSON.stringify({changedValues:changed,changedFoods,completeBefore:complete(before),completeAfter:complete(c.foods),partialAfter:853-complete(c.foods)}));
