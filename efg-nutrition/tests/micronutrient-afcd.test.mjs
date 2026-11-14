import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {MICRONUTRIENT_CATALOG as c} from '../pilot/micronutrient-expanded-catalog.js';
import {estimateDailyMicronutrients as estimate} from '../pilot/micronutrient-engine.js';
const baseline='e79fe9e61f7215be92f8cd1f0e1c1877191531af';
const old=path=>execFileSync('git',['show',baseline+':'+path],{encoding:'utf8',maxBuffer:4*1024*1024});
const raw=old('efg-nutrition/pilot/micronutrient-catalog.js');
const base=JSON.parse(raw.slice(raw.indexOf(' = ')+3).replace(/;\s*$/,''));
const extra=JSON.parse(old('efg-nutrition/pilot/micronutrient-expanded-catalog.js').split('export const NEW_MICRONUTRIENT_ESTIMATES=')[1].split(';\nexport const MICRONUTRIENT_CATALOG=')[0]);
const before={...base.foods,...extra};let cells=0,changedFoods=0,improvedProfiles=0;
for(const [id,f]of Object.entries(before)){
 const next=c.foods[id];let changed=false;
 assert.equal(next.unit,f.unit);assert.equal(next.catalogSourceId,f.catalogSourceId);
 for(const [key,v]of Object.entries(f.perUnit)){
  if(v!==null&&!f.incompleteNutrients?.includes(key))assert.equal(next.perUnit[key],v,id+':'+key);
  if(next.perUnit[key]!==v){changed=true;cells++;assert.ok(v===null||f.incompleteNutrients.includes(key));}
 }
 changedFoods+=changed;
 improvedProfiles+=changed||JSON.stringify(f.incompleteNutrients||[])!==JSON.stringify(next.incompleteNutrients||[]);
}
const dir=new URL('../docs/micronutrients-afcd-20261114/',import.meta.url);
const json=name=>JSON.parse(readFileSync(new URL(name,dir)));
for(const [file,sha]of Object.entries(json('manifest.json').files))assert.equal(createHash('sha256').update(readFileSync(new URL(file,dir))).digest('hex'),sha);
const source=json('selected-records.json'),maps=json('mappings.json');
assert.equal(source.sheet,'All solids & liquids per 100 g');
const refs=JSON.parse(readFileSync(new URL('../docs/micronutrients-restaurants-20261114/equivalent-models.json',import.meta.url))).drinkReferences;
let matched=0;
for(const m of maps){
 const drink=m.target.startsWith('drink:'),f=drink?refs[m.target]:c.foods[m.target];
 for(const key of m.nutrients){
  const p=f.nutrientProvenance?.[key];if(p?.source!=='FSANZ AFCD Release 3')continue;
  const column={ala:209,epa:222,dha:229,b12:93}[key];
  assert.equal(source.header[column],{ala:'C18:3w3 (g)',epa:'C20:5w3 (mg)',dha:'C22:6w3 (mg)',b12:'Cobalamin (B12) \n(ug)'}[key]);
  const v=source.rows[m.code][column];assert.equal(typeof v,'number');assert.ok(v>=0);
  const expected=v*(drink?1:f.gramsPerMl||1)/100;assert.ok(Math.abs(f.perUnit[key]-expected)<1e-9,m.target+':'+key);
  assert.equal(p.foodCode,m.code);assert.ok(p.licenseUrl.includes('datauserlicenceagreement'));assert.match(p.note,/ESTIMACIÓN/);matched++;
 }
}
const totals=(id,qty)=>estimate({diary:{log_day:'2026-11-14',meals:{cena:[{id,qty,unit:c.foods[id].unit,sourceId:c.foods[id].catalogSourceId}]}},catalog:c,referenceMode:'general'}).nutrients;
for(const id of ['cashews','pistachios','pecans','macadamia_nuts','milk_skim','barley_cooked','red_lentils_dry','alc_beer_lager']){
 const a=totals(id,25),b=totals(id,12.5);for(let i=0;i<a.length;i++)assert.equal(b[i].total,a[i].total===null?null:a[i].total/2,id);
}
assert.equal(c.foods.cashews.perUnit.ala,.0007,'Use g per 100g, not percent of fatty acids');
assert.equal(c.foods.pistachios.perUnit.ala,.0023);
assert.equal(totals('milk_skim',200).find(n=>n.id==='ala').foodUnknown,0,'Published rounded zero has known coverage');
assert.equal(totals('herbal_tea',200).find(n=>n.id==='ala').foodUnknown,1,'Unmatched tea stays unknown');
assert.equal(c.foods.chinchulines_grilled.perUnit.b12,null);
assert.ok(c.additionalDataLicenses.some(l=>l.source.includes('FSANZ')&&l.countryStatement&&l.limitationOfDataStatement&&l.licenseUrl));
const complete=f=>Object.values(f).filter(x=>Object.values(x.perUnit).every(v=>v!==null)&&!x.incompleteNutrients?.length).length;
console.log(JSON.stringify({matchedDirectCells:matched,changedValues:cells,changedFoods,improvedProfiles,completeBefore:complete(before),completeAfter:complete(c.foods),partialAfter:853-complete(c.foods)}));
