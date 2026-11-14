import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {MICRONUTRIENT_CATALOG as c} from '../pilot/micronutrient-expanded-catalog.js';
import {estimateDailyMicronutrients as estimate} from '../pilot/micronutrient-engine.js';
const baseline='8ba19873cdd42ccc10ec602e138f8c8f6dff1d34';
const old=p=>execFileSync('git',['show',baseline+':'+p],{encoding:'utf8',maxBuffer:4*1024*1024});
const raw=old('efg-nutrition/pilot/micronutrient-catalog.js');const base=JSON.parse(raw.slice(raw.indexOf(' = ')+3).replace(/;\s*$/,''));
const extra=JSON.parse(old('efg-nutrition/pilot/micronutrient-expanded-catalog.js').split('export const NEW_MICRONUTRIENT_ESTIMATES=')[1].split(';\nexport const MICRONUTRIENT_CATALOG=')[0]);const before={...base.foods,...extra};
const dir=new URL('../docs/micronutrients-nori-20261114/',import.meta.url);
const json=p=>JSON.parse(readFileSync(new URL(p,dir)));
for(const [file,sha]of Object.entries(json('manifest.json').files))assert.equal(createHash('sha256').update(readFileSync(new URL(file,dir))).digest('hex'),sha);
const source=json('source.json');assert.equal(source.foodCode,'09003');for(const p of Object.values(source.pages))assert.equal(p.weightGrams,100);
assert.ok(source.pages['4'].rows.includes('18:3 n-3 α−リノレン酸 4 mg'));
assert.ok(source.pages['4'].rows.includes('20:5 n-3 イコサペンタエン酸 1200 mg'));
assert.ok(source.pages['4'].rows.includes('22:6 n-3 ドコサヘキサエン酸 - mg'));
assert.deepEqual(Object.keys(source.usedPer100g).sort(),['ala','calcium','epa','iron','magnesium','zinc']);
for(const [key,label]of Object.entries({calcium:'カルシウム',magnesium:'マグネシウム',iron:'鉄',zinc:'亜鉛'})){const row=source.pages['0'].rows.find(r=>r.startsWith(label+' '));assert.ok(row.endsWith(' mg'));assert.equal(Number(row.split(' ')[1]),source.usedPer100g[key].value);}
const quantity=(id,seen=new Set())=>{
 if(id==='@nori')return 1;
 if(!c.foods[id])return 0;
 assert.ok(!seen.has(id),'Recipe must be acyclic');const next=new Set([...seen,id]),f=c.foods[id];
 if(f.ingredients)return f.ingredients.reduce((a,p)=>a+p.quantity*quantity(p.id,next),0)/(f.yieldGrams||f.yieldQuantity)*(f.gramsPerMl||1);
 if(f.ingredientsByMass)return Object.entries(f.ingredientsByMass).reduce((a,[id,q])=>a+q*quantity(id,next),0);
 return 0;
};
let cells=0,foods=0,noriProfiles=0;
for(const [id,f]of Object.entries(before)){
 let changed=false;const next=c.foods[id],q=quantity(id);
 for(const [k,v]of Object.entries(f.perUnit)){
  if(v!==null&&!f.incompleteNutrients?.includes(k))assert.equal(next.perUnit[k],v,id+':'+k);
  if(next.perUnit[k]!==v){cells++;changed=true;}
 }
 foods+=changed;
 if(q){
  noriProfiles++;
  for(const [k,v]of Object.entries(source.usedPer100g)){
   const contribution=q*v.value/100/(k==='ala'?1000:1);
   assert.ok(Math.abs(next.perUnit[k]-f.perUnit[k]-contribution)<1e-8,id+':'+k);
   assert.match(next.nutrientProvenance[k].sourceUrl,/fooddb\.mext\.go\.jp/);
  }
  for(const k of ['b12','dha']){assert.equal(next.perUnit[k],f.perUnit[k]);assert.ok(next.incompleteNutrients.includes(k));}
 }
}
const totals=(id,qty)=>estimate({diary:{log_day:'2026-11-14',meals:{cena:[{id,qty,unit:c.foods[id].unit,sourceId:c.foods[id].catalogSourceId}]}},catalog:c,referenceMode:'general'}).nutrients;
for(const id of ['sushi_maki_salmon','sushi_california','rest_sushiclub_combo_30','rest_fabric_combo_15','rest_ishidan_combo_salmon_12']){
 const a=totals(id,100),b=totals(id,50);for(let i=0;i<a.length;i++)assert.equal(b[i].total,a[i].total===null?null:a[i].total/2);
 for(const k of ['iron','calcium','magnesium','zinc'])assert.equal(a.find(n=>n.id===k).partial,false,id+':'+k);
 for(const k of ['b12','epa_dha'])assert.equal(a.find(n=>n.id===k).partial,true,id+':'+k);
}
const complete=foods=>Object.values(foods).filter(f=>Object.values(f.perUnit).every(v=>v!==null)&&!f.incompleteNutrients?.length).length;
console.log(JSON.stringify({changedCells:cells,changedFoods:foods,noriProfiles,completeBefore:complete(before),completeAfter:complete(c.foods),partialAfter:853-complete(c.foods)}));
