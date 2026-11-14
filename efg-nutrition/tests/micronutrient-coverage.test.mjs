import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {MICRONUTRIENT_CATALOG as c} from '../pilot/micronutrient-catalog.js';
import {estimateDailyMicronutrients as estimate} from '../pilot/micronutrient-engine.js';
const root=new URL('../../',import.meta.url);
const prior=execFileSync('git',['show','8f660da95964021fae389cdf52873e3988f4b10a:efg-nutrition/pilot/micronutrient-catalog.js'],{cwd:root,encoding:'utf8'});
const old=JSON.parse(prior.slice(prior.indexOf('= ')+2).replace(/;\s*$/,''));
const raw=readFileSync(new URL('../docs/micronutrients-20261114/usda-sr-selected.json.gz',import.meta.url));
const records=Object.fromEntries(JSON.parse(gunzipSync(raw)).map(r=>[r.fdcId,r]));
const day=items=>({log_day:'2026-11-14',meals:{almuerzo:items},sports:[],skipped:{}});
const entry=(id,qty)=>({id,qty,unit:'g',sourceId:c.foods[id].catalogSourceId});
const totals=items=>estimate({diary:day(items),catalog:c}).nutrients;
test('every prior known value is preserved; all 617 IDs have a coverage decision',()=>{
 for(const [id,f]of Object.entries(old.foods))for(const [n,v]of Object.entries(f.perUnit))if(v!==null)assert.equal(c.foods[id].perUnit[n],v,id+':'+n);
 const inventory=JSON.parse(readFileSync(new URL('../docs/micronutrients-20261114/coverage.json',import.meta.url)));
 assert.equal(inventory.length,617);assert.equal(new Set(inventory.map(f=>f.id)).size,617);assert.equal(c.foodCount,218);
 for(const f of inventory)assert.equal(f.known.length+f.missing.length,8);
});
test('frozen official extract has exact manifest hash and reviewed source descriptions',()=>{
 const m=JSON.parse(readFileSync(new URL('../docs/micronutrients-20261114/source-manifest.json',import.meta.url)));
 assert.equal(createHash('sha256').update(raw).digest('hex'),m.selectedSha256);
 const mappings=JSON.parse(readFileSync(new URL('../docs/micronutrients-20261114/reviewed-mappings.json',import.meta.url)));
 for(const row of mappings)assert.equal(records[row.fdcId].description,row.sourceDescription);
});
test('cooked beef tenderloin contributes iron zinc and B12 from grilled lean source, scales without diary writes',()=>{
 const f=c.foods.beef_tenderloin;assert.equal(f.sourceId,'170641');assert.match(f.sourceDescription,/cooked, grilled/);
 for(const [key,id]of [['iron',1089],['zinc',1095],['b12',1178]]){
  const source=records[170641].foodNutrients.find(n=>n.nutrient.id===id).amount;
  assert.ok(Math.abs(f.perUnit[key]-source/100)<1e-10);assert.ok(source>0);
  const e=entry('beef_tenderloin',150),before=JSON.stringify(e);
  assert.ok(Math.abs(totals([e]).find(n=>n.id===key).food-source*1.5)<1e-9);
  assert.equal(JSON.stringify(e),before);
 }
 assert.equal(totals([{...entry('beef_tenderloin',150),sourceId:'wrong'}]).find(n=>n.id==='iron').total,null);
});
test('all six achuras have mineral data; uncertain B12 stays null; recipe propagates missing nutrients',()=>{
 for(const id of ['chorizo_cooked','chinchulines_grilled','morcilla_cooked','morcilla_vasca_estimate','kidney_beef_grilled','sweetbreads_beef_grilled']){
  for(const n of ['iron','zinc','calcium','magnesium'])assert.ok(c.foods[id].perUnit[n]>0,id+':'+n);
  assert.equal(c.foods[id].perUnit.b12,null);
  assert.ok(totals([entry(id,100)]).find(n=>n.id==='iron').food>0);
 }
 assert.equal(c.foods.morcilla_vasca_estimate.perUnit.iron,Math.round((.85*c.foods.morcilla_cooked.perUnit.iron+.10*c.foods.raisins.perUnit.iron+.05*c.foods.walnuts.perUnit.iron)*1e10)/1e10);
});
test('unknown branded product remains unknown, never inferred from common milk',()=>{
 assert.equal(c.foods.milk,undefined);const n=totals([{id:'milk',qty:200,unit:'ml'}]).find(n=>n.id==='iron');assert.equal(n.total,null);
});
