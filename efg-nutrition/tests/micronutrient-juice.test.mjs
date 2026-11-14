import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {MICRONUTRIENT_CATALOG as c} from '../pilot/micronutrient-expanded-catalog.js';
import {estimateDailyMicronutrients as estimate} from '../pilot/micronutrient-engine.js';
const old=p=>execFileSync('git',['show','6abec22ddd9d7b6c0d4a685331c0765d6e5692b2:efg-nutrition/pilot/'+p],{encoding:'utf8',maxBuffer:4e6});
const s=old('micronutrient-catalog.js');const before={...JSON.parse(s.slice(s.indexOf(' = ')+3).replace(/;\s*$/,'')).foods,...JSON.parse(old('micronutrient-expanded-catalog.js').split('export const NEW_MICRONUTRIENT_ESTIMATES=')[1].split(';\nexport const')[0])};
const rows=JSON.parse(readFileSync(new URL('../docs/micronutrients-20261114/enrichment-sara-rows.json',import.meta.url)));
assert.equal(rows['Jugo de naranja, exprimido'].macro.page,129);
assert.equal(rows['Jugo de naranja, exprimido'].macro.cells[11],'0,011');
assert.equal(c.foods.orange_juice_raw_weight.perUnit.ala,.00011);
assert.equal(c.foods.helado_frutilla_crema.perUnit.ala,.00163);
assert.equal(c.foods.helado_frutilla_crema.perUnit.epa,0);
assert.equal(c.foods.helado_frutilla_crema.perUnit.dha,0);
let changed=0;
for(const [id,f]of Object.entries(before)){
 const n=c.foods[id];assert.equal(n.unit,f.unit);assert.deepEqual(n.ingredients,f.ingredients);
 for(const [key,v]of Object.entries(f.perUnit))if(v!==null&&!f.incompleteNutrients?.includes(key))assert.equal(n.perUnit[key],v,id+':'+key);
 if(JSON.stringify(n.perUnit)===JSON.stringify(f.perUnit))continue;
 changed++;
 if(id.startsWith('alc_')){
  const orange=n.ingredients.find(x=>x.id==='orange');assert.ok(orange,id);
  assert.ok(Math.abs(n.perUnit.ala-(f.perUnit.ala||0)-.00011*orange.quantity/n.yieldQuantity)<1e-10,id);
  assert.ok(n.nutrientProvenance.ala.saraReferences.some(p=>p.ingredient==='orange'&&p.sourceUrl.endsWith('#page=129')));
 }
}
assert.equal(changed,8);
for(const id of ['orange_juice_raw_weight','helado_frutilla_crema','alc_vodka_orange']){
 const totals=qty=>estimate({diary:{log_day:'2026-11-14',meals:{cena:[{id,qty,unit:c.foods[id].unit,sourceId:c.foods[id].catalogSourceId}]}},catalog:c,referenceMode:'general'}).nutrients;
 const a=totals(100),b=totals(50);for(let i=0;i<a.length;i++)assert.equal(b[i].total,a[i].total===null?null:a[i].total/2);
}
assert.equal(c.foods.herbal_tea.perUnit.ala,null);
const complete=Object.values(c.foods).filter(f=>Object.values(f.perUnit).every(v=>v!==null)&&!f.incompleteNutrients?.length).length;
console.log(JSON.stringify({changed,complete,partial:853-complete}));
