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
function preservesKnown(id,before){
 for(const [key,v]of Object.entries(before.perUnit))if(v!==null)assert.equal(c.foods[id].perUnit[key],v,id+':'+key);
 for(const key of ['name','unit','sourceId','catalogSourceId','sourceDescription'])assert.equal(c.foods[id][key],before[key],id+':'+key);
}
function missingOrSourced(f,key){assert.ok(f.perUnit[key]===null||f.nutrientProvenance?.[key],f.name+':'+key);}
test('every prior known value is preserved; all 618 IDs have a coverage decision',()=>{
 for(const [id,f]of Object.entries(old.foods))for(const [n,v]of Object.entries(f.perUnit))if(v!==null)assert.equal(c.foods[id].perUnit[n],v,id+':'+n);
 const inventory=JSON.parse(readFileSync(new URL('../docs/micronutrients-20261114/coverage.json',import.meta.url)));
 assert.equal(inventory.length,618);assert.equal(new Set(inventory.map(f=>f.id)).size,618);assert.equal(c.foodCount,618);
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
  missingOrSourced(c.foods[id],'b12');
  assert.ok(totals([entry(id,100)]).find(n=>n.id==='iron').food>0);
 }
 assert.equal(c.foods.morcilla_vasca_estimate.perUnit.iron,Math.round((.85*c.foods.morcilla_cooked.perUnit.iron+.10*c.foods.raisins.perUnit.iron+.05*c.foods.walnuts.perUnit.iron)*1e10)/1e10);
});
test('protein milk uses disclosed SARA generic reference; unknown identity stays unknown',()=>{
 const f=c.foods.milk;assert.match(f.sourceDescription,/50%/);assert.equal(f.approximation,true);
 missingOrSourced(f,'b12');assert.ok(Math.abs(f.perUnit.calcium-1.21*1.03)<1e-10);
 const n=totals([{id:'unverified_brand_not_in_catalog',qty:200,unit:'ml'}]).find(n=>n.id==='iron');assert.equal(n.total,null);
});

test('second batch preserves all 218 prior compositions and scales all 25 reviewed foods',()=>{
 const priorText=execFileSync('git',['show','6e9dcbc3da4025ceb12ee8e324b929714af429d3:efg-nutrition/pilot/micronutrient-catalog.js'],{cwd:root,encoding:'utf8'});
 const baseline=JSON.parse(priorText.slice(priorText.indexOf('= ')+2).replace(/;\s*$/,''));
 for(const [id,f]of Object.entries(baseline.foods)) for(const [key,value]of Object.entries(f.perUnit)) if(value!==null) assert.equal(c.foods[id].perUnit[key],value,id+':'+key);
 const batch=JSON.parse(readFileSync(new URL('../docs/micronutrients-20261114/batch-two.json',import.meta.url)));
 assert.equal(Object.keys(batch).length,25);
 const identities={magnesium:[1090,1],calcium:[1087,1],iron:[1089,1],zinc:[1095,1],b12:[1178,1],ala:[1404,1],epa:[1278,1000],dha:[1272,1000]};
 for(const [id,fdc]of Object.entries(batch)){
  assert.equal(c.foods[id].sourceId,String(fdc));
  for(const [key,[nutrient,scale]]of Object.entries(identities)){
   const original=records[fdc].foodNutrients.find(n=>n.nutrient.id===nutrient);
   if(!original){missingOrSourced(c.foods[id],key);continue;}
   assert.ok(Math.abs(c.foods[id].perUnit[key]-original.amount*scale/100)<1e-9,id+':'+key);
  }
  const result=totals([entry(id,75)]).find(n=>n.id==='iron');
  assert.ok(Math.abs(result.food-c.foods[id].perUnit.iron*75)<1e-9,id);
 }
});

test('third batch preserves every published known value and verifies SARA scaling and fatty-acid units',()=>{
 const text=execFileSync('git',['show','2b08fca6d20c4c6906d0471a930306e98f7cdc74:efg-nutrition/pilot/micronutrient-catalog.js'],{cwd:root,encoding:'utf8'});
 const baseline=JSON.parse(text.slice(text.indexOf('= ')+2).replace(/;\s*$/,''));
 for(const [id,f]of Object.entries(baseline.foods))for(const [key,value]of Object.entries(f.perUnit))if(value!==null)assert.equal(c.foods[id].perUnit[key],value,id+':'+key);
 const sara=JSON.parse(readFileSync(new URL('../docs/micronutrients-20261114/sara2-reviewed.json',import.meta.url)));
 for(const row of sara){
  const f=c.foods[row.foodId];missingOrSourced(f,'b12');
  for(const [key,value]of Object.entries(row.per100g))assert.equal(f.perUnit[key],value/100);
  assert.ok(Math.abs(totals([entry(row.foodId,150)]).find(n=>n.id==='iron').food-row.per100g.iron*1.5)<1e-9);
  if(row.fattyAcidEvidence)for(const key of ['ala','epa','dha'])assert.equal(f.perUnit[key],row.fattyAcidEvidence[key]*(key==='ala'?1:1000)/100);
 }
 assert.equal(c.foods.fish_hake.perUnit.epa,1.3);assert.equal(c.foods.fish_hake.perUnit.dha,3.45);
 assert.ok(Math.abs(totals([entry('fish_hake',150)]).find(n=>n.id==='epa_dha').food-712.5)<1e-9);
 assert.equal(c.foods.chorizo_cooked.perUnit.epa,0);assert.equal(c.foods.alfajor_chocolate.perUnit.epa,0);
 const batch=JSON.parse(readFileSync(new URL('../docs/micronutrients-20261114/batch-three.json',import.meta.url)));
 for(const [id,fdc]of Object.entries(batch.usdaAdditions)){
  assert.equal(c.foods[id].sourceId,String(fdc));
  for(const [key,n]of Object.entries({iron:1089,zinc:1095,magnesium:1090,calcium:1087}))assert.ok(Math.abs(c.foods[id].perUnit[key]-records[fdc].foodNutrients.find(x=>x.nutrient.id===n).amount/100)<1e-9);
 }
});

test('fourth batch preserves 264 known profiles and adds exact USDA captures and declared mixtures',()=>{
 const priorText=execFileSync('git',['show','8728e37f89eaf2bded888653f401080fed0f2233:efg-nutrition/pilot/micronutrient-catalog.js'],{cwd:root,encoding:'utf8'});
 const baseline=JSON.parse(priorText.slice(priorText.indexOf('= ')+2).replace(/;\s*$/,''));
 for(const [id,f]of Object.entries(baseline.foods))for(const [key,value]of Object.entries(f.perUnit))if(value!==null)assert.equal(c.foods[id].perUnit[key],value,id+':'+key);
 const apiBytes=readFileSync(new URL('../docs/micronutrients-20261114/usda-full-five.json.gz',import.meta.url));
 const apiManifest=JSON.parse(readFileSync(new URL('../docs/micronutrients-20261114/usda-full-five-manifest.json',import.meta.url)));
 assert.equal(createHash('sha256').update(apiBytes).digest('hex'),apiManifest.archiveSha256);
 const apiRecords=Object.fromEntries(JSON.parse(gunzipSync(apiBytes)).map(r=>[r.fdcId,r]));
 for(const [id,fdc]of Object.entries({egg:748967,chicken_breast_roasted:2705956,rice:2708408})){
  assert.equal(c.foods[id].sourceId,String(fdc));
  for(const [key,n]of Object.entries({iron:1089,zinc:1095,magnesium:1090,calcium:1087,b12:1178})){
   const original=apiRecords[fdc].foodNutrients.find(x=>x.nutrient.id===n).amount;
   assert.ok(Math.abs(c.foods[id].perUnit[key]-original/100)<1e-9);
   assert.ok(Math.abs(totals([entry(id,125)]).find(x=>x.id===key).food-original*1.25)<1e-9);
  }
 }
 assert.equal(c.foods.egg_white.sourceId,'172183');assert.equal(c.foods.egg_white.catalogSourceId,'747997');assert.equal(c.foods.egg_white.matchType,'reviewed_generic_reference');
 const batch=JSON.parse(readFileSync(new URL('../docs/micronutrients-20261114/batch-four.json',import.meta.url)));
 for(const [id,parts]of Object.entries(batch.existingRecipeModels))for(const key of Object.keys(c.foods[id].perUnit)){
  const incomplete=Object.keys(parts).some(k=>c.foods[k].perUnit[key]===null);
  if(incomplete){missingOrSourced(c.foods[id],key);if(c.foods[id].perUnit[key]!==null)assert.ok(c.foods[id].incompleteNutrients.includes(key));}
  else assert.ok(Math.abs(c.foods[id].perUnit[key]-Object.entries(parts).reduce((sum,[k,w])=>sum+c.foods[k].perUnit[key]*w,0))<1e-9);
 }
 assert.equal(c.foods.merluza_filet_cruda.perUnit.iron,.019);assert.ok(Math.abs(c.foods.merluza_grill.perUnit.iron-.0247)<1e-10);
});


test('fifth batch checks every nutrient against frozen sources and preserves diary source identity',()=>{
 const batch=JSON.parse(readFileSync(new URL('../docs/micronutrients-20261114/batch-five.json',import.meta.url)));
 const ids={magnesium:[1090,1],calcium:[1087,1],iron:[1089,1],zinc:[1095,1],b12:[1178,1],ala:[1404,1],epa:[1278,1000],dha:[1272,1000]};
 for(const [id,fdc] of Object.entries(batch.usdaAdditions)){
  const f=c.foods[id];assert.equal(f.sourceId,String(fdc));
  for(const [key,[nutrient,scale]] of Object.entries(ids)){
   const source=records[fdc].foodNutrients.find(n=>n.nutrient.id===nutrient);
   if(!source){missingOrSourced(f,key);continue;}
   assert.ok(Math.abs(f.perUnit[key]-source.amount*scale/100)<1e-9,id+':'+key);
  }
  const e=entry(id,175),before=JSON.stringify(e);
  assert.ok(Math.abs(totals([e]).find(n=>n.id==='calcium').food-f.perUnit.calcium*175)<1e-9);
  assert.equal(JSON.stringify(e),before);
 }
 assert.equal(totals([{...entry('egg_white',100),sourceId:'wrong'}]).find(n=>n.id==='calcium').total,null);
});


test('sixth batch preserves all 307 profiles and checks sources, raw preparation and aliases',()=>{
 const priorText=execFileSync('git',['show','9e013d9a63b6f069fab0b9c6fe9b929d2a9147d8:efg-nutrition/pilot/micronutrient-catalog.js'],{cwd:root,encoding:'utf8'});
 const baseline=JSON.parse(priorText.slice(priorText.indexOf('= ')+2).replace(/;\s*$/,''));
 for(const [id,f]of Object.entries(baseline.foods))preservesKnown(id,f);
 const batch=JSON.parse(readFileSync(new URL('../docs/micronutrients-20261114/batch-six.json',import.meta.url)));
 const ids={magnesium:[1090,1],calcium:[1087,1],iron:[1089,1],zinc:[1095,1],b12:[1178,1],ala:[1404,1],epa:[1278,1000],dha:[1272,1000]};
 for(const [id,fdc] of Object.entries(batch.usdaAdditions)){
  const f=c.foods[id];assert.equal(f.sourceId,String(fdc));
  for(const [key,[nutrient,scale]] of Object.entries(ids)){
   const source=records[fdc].foodNutrients.find(n=>n.nutrient.id===nutrient);
   if(!source){missingOrSourced(f,key);continue;}
   assert.ok(Math.abs(f.perUnit[key]-source.amount*scale/100)<1e-9,id+':'+key);
  }
  assert.ok(Math.abs(totals([entry(id,80)]).find(n=>n.id==='iron').food-f.perUnit.iron*80)<1e-9);
 }
 for(const id of ['sushi_sashimi_salmon','sushi_sashimi_atun']){
  assert.match(c.foods[id].sourceDescription,/raw/);
  const v=c.foods[id].perUnit;
  assert.ok(Math.abs(totals([entry(id,80)]).find(n=>n.id==='epa_dha').food-(v.epa+v.dha)*80)<1e-9);
 }
 for(const [a,b]of [['medialuna_butter','factura_medialuna_manteca'],['galleta_agua','galletitas_agua'],['arroz_leche','arroz_con_leche'],['palomitas_dulces','pochoclos_dulces_acaramelados_genericos']])assert.deepEqual(c.foods[a].perUnit,c.foods[b].perUnit);
});

test('full completion preserves all 319 prior profiles and all previous canonical macro entries',()=>{
 const baseline='7402b8541ef647cea4becf1166fdbec383086179';
 const text=execFileSync('git',['show',baseline+':efg-nutrition/pilot/micronutrient-catalog.js'],{cwd:root,encoding:'utf8'});
 const before=JSON.parse(text.slice(text.indexOf('= ')+2).replace(/;\s*$/,''));
 assert.equal(Object.keys(before.foods).length,319);
 for(const [id,f]of Object.entries(before.foods))preservesKnown(id,f);
 const macro=readFileSync(new URL('../catalog/guide-catalog.json',import.meta.url));
 const priorMacros=JSON.parse(execFileSync('git',['show',baseline+':efg-nutrition/catalog/guide-catalog.json'],{cwd:root}));
 for(const [id,food] of Object.entries(priorMacros.foods))assert.deepEqual(JSON.parse(macro).foods[id],food,id+' unchanged');
 const catalog=JSON.parse(macro);assert.deepEqual(Object.keys(c.foods).sort(),Object.keys(catalog.foods).sort());
 for(const f of Object.values(c.foods))for(const v of Object.values(f.perUnit))assert.ok(v===null||Number.isFinite(v)&&v>=0);
});
test('all completion source and assumption files have frozen manifest hashes',()=>{
 const folder=new URL('../docs/micronutrients-20261114/',import.meta.url);
 const manifest=JSON.parse(readFileSync(new URL('completion-manifest.json',folder)));
 for(const [name,hash]of Object.entries(manifest.files))assert.equal(createHash('sha256').update(readFileSync(new URL(name,folder))).digest('hex'),hash,name);
 const inventory=JSON.parse(readFileSync(new URL('coverage.json',folder)));
 assert.equal(inventory.filter(f=>f.status==='pending').length,0);
 for(const f of inventory)if(f.incomplete.length)assert.equal(f.status,'partial');
});
test('chia recipe and lactose-free milk convert native millilitres exactly once',()=>{
 const expected=(18*c.foods.chia.perUnit.calcium+82/1.03*c.foods.milk_skim.perUnit.calcium)/100;
 assert.ok(Math.abs(c.foods.chia_pudding.perUnit.calcium-expected)<1e-9);
 assert.ok(Math.abs(c.foods.milk_lactosefree.perUnit.calcium-c.foods.milk_skim.perUnit.calcium)<1e-9);
 const single={id:'milk_lactosefree',qty:250,unit:'ml'};
 const n=totals([single]).find(n=>n.id==='calcium');assert.ok(Math.abs(n.total-250*c.foods.milk_skim.perUnit.calcium)<1e-8);
});
test('unknown dry nori and unquantified cake ingredients retain known contributions but mark them partial',()=>{
 const ids=Object.keys(c.foods).filter(id=>c.foods[id].ingredients?.some(i=>i.id==='@nori'));
 assert.ok(ids.length>0);
 for(const id of [...ids,'cake']){
  const food=c.foods[id];assert.ok(food.incompleteNutrients.includes('iron'),id);
  const n=totals([entry(id,100)]).find(n=>n.id==='iron');assert.ok(n.total>0,id);
  assert.equal(n.partial,true);assert.equal(n.foodPartial,1);assert.equal(n.foodKnown+n.foodUnknown,1);
  assert.equal(n.difference,null);assert.equal(n.status,'partial');
 }
});
test('named brand approximations never claim to be a manufacturer label',()=>{
 for(const id of ['arcor_chocolate_aguila_familiar','arcor_chocolate_blanco_porcion','arcor_chocolate_leche_porcion','colonial_chocolate_organico_80_cacao','arcor_mini_alfajor_aguila_chocolate','arcor_saladix_jamon','milanesa_soy_gobinda']){
  const f=c.foods[id];assert.equal(f.approximation,true);assert.match(f.mappingNote,/NO RÓTULO/);
  const n=totals([entry(id,100)]).find(n=>n.id==='calcium');assert.equal(n.contributors[0].mappingNote,f.mappingNote);
 }
});

test('gap enrichment keeps every previously complete estimate and increases only documented partial sums',()=>{
 const text=execFileSync('git',['show','2e59931f4bd3495a8eca4c6f004ae32a13a34520:efg-nutrition/pilot/micronutrient-catalog.js'],{cwd:root,encoding:'utf8'});
 const baseline=JSON.parse(text.slice(text.indexOf('= ')+2).replace(/;\s*$/,''));let additions=0;
 for(const [id,f]of Object.entries(baseline.foods))for(const [key,v]of Object.entries(f.perUnit)){
  const n=c.foods[id].perUnit[key];
  if(v!==null&&!f.incompleteNutrients?.includes(key))assert.equal(n,v,id+':'+key);
  else if(v!==null)assert.ok(n>=v-1e-9,id+':'+key);
  if(n!==v){assert.ok(c.foods[id].nutrientProvenance?.[key],id+':'+key);additions++;}
 }
 assert.ok(additions>=600);
});
test('every independently added nutrient matches the frozen named column and declared unit',()=>{
 const dir=new URL('../docs/micronutrients-20261114/',import.meta.url);
 const m=JSON.parse(readFileSync(new URL('enrichment-manifest.json',dir)));
 for(const [name,hash]of Object.entries(m.files))assert.equal(createHash('sha256').update(readFileSync(new URL(name,dir))).digest('hex'),hash);
 const sara=JSON.parse(readFileSync(new URL('enrichment-sara-rows.json',dir)));
 const records=Object.fromEntries(JSON.parse(gunzipSync(readFileSync(new URL('enrichment-usda.json.gz',dir)))).map(r=>[r.fdcId,r]));
 const ids={b12:1178,zinc:1095};
 for(const [id,f]of Object.entries(c.foods))for(const [key,p]of Object.entries(f.nutrientProvenance||{})){
  if(p.source==='recipe_components')continue;
  let expected;
  if(p.source==='SARA 2'){
   const row=sara[p.food];
   if(key==='b12'){assert.equal(Number(row.micro.cells[17].replace(',','.')),0);expected=0;}
   else{const col={ala:11,epa:13,dha:14}[key];assert.notEqual(row.macro.cells[col],'');expected=Number(row.macro.cells[col].replace(',','.'))*(key==='ala'?1:1000);}
  }else{const nutrient=records[p.fdcId].foodNutrients.find(n=>n.nutrient.id===ids[key]);assert.equal(nutrient.nutrient.unitName,key==='b12'?'µg':'mg');expected=nutrient.amount;}
  assert.ok(Math.abs(f.perUnit[key]-expected*(f.gramsPerMl||1)/100)<1e-9,id+':'+key);
 }
});
test('flaxseed and walnuts now contribute named ALA; beef B12 propagates into recipes',()=>{
 assert.equal(c.foods.flaxseed.perUnit.ala,.22813);assert.equal(c.foods.walnuts.perUnit.ala,.0908);
 const ala=totals([entry('flaxseed',10),entry('walnuts',20)]).find(n=>n.id==='ala');assert.ok(Math.abs(ala.total-4.0973)<1e-8);
 assert.equal(ala.partial,false);assert.ok(c.foods.beef.perUnit.b12>0);
 const n=totals([entry('beef',150)]).find(n=>n.id==='b12');assert.match(n.contributors[0].mappingNote,/USDA/);
});

 test('quinoa milanesa keeps the explicit recipe, grams and estimated unit coherent',()=>{
 const recipe=JSON.parse(readFileSync(new URL('../docs/quinoa-20261114/recipe.json',import.meta.url)));
 const f=c.foods[recipe.food.id];assert.equal(f.yieldGrams,320);assert.match(f.mappingNote,/Contiene huevo y trigo/);
 const macros=JSON.parse(readFileSync(new URL('../catalog/guide-catalog.json',import.meta.url))).foods[recipe.food.id];
 assert.equal(macros.k*100,177.8125);assert.equal(macros.p*100,7.5);
 const one=totals([entry(recipe.food.id,80)]),two=totals([entry(recipe.food.id,160)]);
 assert.ok(one.find(n=>n.id==='magnesium').food>0);assert.equal(two.find(n=>n.id==='magnesium').food,2*one.find(n=>n.id==='magnesium').food);
 });
