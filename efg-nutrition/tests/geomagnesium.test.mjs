import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {estimateDailyMicronutrients} from '../pilot/micronutrient-engine.js';
import {MICRONUTRIENT_CATALOG as catalog} from '../pilot/micronutrient-catalog.js';
const source=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const list=source.slice(source.indexOf('const SUPPLEMENTS=['),source.indexOf('const SUPPLEMENT_IDS='));
const normalize=source.match(/function normItem\([^\n]+/)[0];
const add=source.slice(source.indexOf('async function addDailySupplement(){'),source.indexOf('\nfunction dayComment'));
async function record(qty,id='geomagnesium_bisglycinate_1400'){
 const diary={log_day:'2026-11-14',meals:{},sports:[]};
 const inputs={supplementItem:{value:id},supplementQty:{value:String(qty)},supplementMoment:{value:'cena'}};
 const context=vm.createContext({document:{getElementById:id=>inputs[id]},structuredClone,mutateSportDiary:async f=>f(diary)});
 vm.runInContext(list+normalize+'\n'+add,context);await vm.runInContext('addDailySupplement()',context);
 return JSON.parse(JSON.stringify(diary));
}
test('GeoMagnesium records actual tablet count with a persistent confirmed label and scales elemental Mg/B12',async()=>{
 for(const [qty,magnesium,b12]of [[1,98.5,250],[2,197,500]]){
  const diary=await record(qty),entry=diary.sports[0];
  assert.equal(entry.unit,'comprimidos');assert.equal(entry.qty,qty);assert.equal(entry.kind,'supplement');assert.equal(entry.when,'cena');assert.equal(entry.k,0);
  const result=estimateDailyMicronutrients({diary,catalog,referenceMode:'general'});
  assert.equal(result.nutrients.find(n=>n.id==='magnesium').supplements,magnesium);
  assert.equal(result.nutrients.find(n=>n.id==='b12').supplements,b12);
  assert.notEqual(result.nutrients.find(n=>n.id==='magnesium').total,1400);
  assert.deepEqual(entry.micronutrientLabel.amounts.b1,{value:10,unit:'mg'});
  assert.deepEqual(entry.micronutrientLabel.amounts.b6,{value:5,unit:'mg'});
  assert.equal(entry.micronutrientLabel.doseQuantity,2);
  assert.equal(result.nutrients.find(n=>n.id==='calcium').supplementKnown,0);
 }
});
test('GeoMagnesium does not register empty, zero or negative quantities',async()=>{
 for(const qty of ['',0,-1,'no-numero'])await assert.rejects(record(qty));
});

test('Gentech records actual capsules and counts EPA+DHA separately from total omega-3 and oil',async()=>{
 for(const qty of [1,2]){
  const diary=await record(qty,'omega3_gentech_epa_dha'),entry=diary.sports[0];
  assert.equal(entry.unit,'cápsulas');assert.equal(entry.qty,qty);assert.equal(entry.k,9*qty);assert.equal(entry.f,qty);
  assert.equal(entry.micronutrientLabel.doseQuantity,2);
  assert.deepEqual(entry.micronutrientLabel.amounts.epa,{value:920,unit:'mg'});
  assert.deepEqual(entry.micronutrientLabel.amounts.dha,{value:360,unit:'mg'});
  const omega=estimateDailyMicronutrients({diary,catalog,referenceMode:'general'}).nutrients.find(n=>n.id==='epa_dha');
  assert.equal(omega.supplements,640*qty);assert.equal(omega.total,640*qty);
  assert.notEqual(omega.total,675*qty);assert.notEqual(omega.total,1000*qty);
 }
 for(const qty of ['',0,-1,'no-numero'])await assert.rejects(record(qty,'omega3_gentech_epa_dha'));
});
