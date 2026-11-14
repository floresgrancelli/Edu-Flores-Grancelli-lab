import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {MICRONUTRIENT_CATALOG as c} from '../pilot/micronutrient-expanded-catalog.js';
import {estimateDailyMicronutrients as estimate} from '../pilot/micronutrient-engine.js';
const old=p=>execFileSync('git',['show','0d0e88df8734996683b4c3f11bb6344feb1b0f6c:efg-nutrition/pilot/'+p],{encoding:'utf8',maxBuffer:5e6});
const s=old('micronutrient-catalog.js'),before={...JSON.parse(s.slice(s.indexOf(' = ')+3).replace(/;\s*$/,'')).foods,...JSON.parse(old('micronutrient-expanded-catalog.js').split('export const NEW_MICRONUTRIENT_ESTIMATES=')[1].split(';\nexport const')[0])};
const dir=new URL('../docs/micronutrients-bulk-20261114/',import.meta.url),json=p=>JSON.parse(readFileSync(new URL(p,dir)));
for(const [file,h]of Object.entries(json('manifest.json').files))assert.equal(createHash('sha256').update(readFileSync(new URL(file,dir))).digest('hex'),h);
const source=JSON.parse(readFileSync(new URL('../docs/micronutrients-afcd-20261114/selected-records.json',import.meta.url)));
const cols={ala:209,epa:222,dha:229,b12:93};let resolved=[];
for(const [id,f]of Object.entries(before)){
 const n=c.foods[id];assert.equal(n.unit,f.unit);assert.deepEqual(n.ingredients,f.ingredients);assert.deepEqual(n.ingredientsByMass,f.ingredientsByMass);assert.equal(n.yieldGrams,f.yieldGrams);assert.equal(n.yieldQuantity,f.yieldQuantity);
 const missing=Object.keys(f.perUnit).filter(k=>f.perUnit[k]===null||f.incompleteNutrients?.includes(k));
 for(const [k,v]of Object.entries(f.perUnit)){
  if(!missing.includes(k))assert.equal(n.perUnit[k],v,id+':'+k);
  assert.ok(Number.isFinite(n.perUnit[k])&&n.perUnit[k]>=0,id+':'+k);
 }
 assert.equal(n.incompleteNutrients?.length||0,0,id);
 if(missing.length)resolved.push({id,name:n.name,completed:missing,notes:missing.map(k=>({nutrient:k,provenance:n.nutrientProvenance?.[k]||null}))});
}
assert.equal(resolved.length,169);
for(const m of json('mappings.json').filter(x=>x.scope==='food'))for(const k of m.nutrients){
 const f=c.foods[m.target],v=source.rows[m.code][cols[k]];
 assert.ok(Math.abs(f.perUnit[k]-v*(f.gramsPerMl||1)/100)<1e-10,m.target+':'+k);
 assert.equal(f.nutrientProvenance[k].foodCode,m.code);assert.match(f.nutrientProvenance[k].note,/ESTIMACIÓN/);
}
for(const r of json('recipes.json').filter(x=>x.scope==='food'))for(const k of r.nutrients){
 assert.equal(Object.values(r.parts).reduce((a,b)=>a+b,0),100);
 const expected=Object.entries(r.parts).reduce((sum,[id,q])=>sum+source.rows[id][cols[k]]*q/10000,0);
 assert.ok(Math.abs(c.foods[r.target].perUnit[k]-expected)<1e-12,r.target);assert.match(c.foods[r.target].nutrientProvenance[k].note,/baja confianza/);
}
assert.equal(c.foods.tempeh.perUnit.ala,.0072);assert.equal(c.foods.mung_beans_cooked.perUnit.ala,.00067);
const totals=(id,qty,catalog=c)=>estimate({diary:{log_day:'2026-11-14',meals:{cena:[{id,qty,unit:catalog.foods[id].unit,sourceId:catalog.foods[id].catalogSourceId}]}},catalog,referenceMode:'general'}).nutrients;
for(const {id}of resolved){const full=totals(id,100),half=totals(id,50);for(let i=0;i<full.length;i++)assert.equal(half[i].total,full[i].total/2,id);}
// Completing the catalog must not turn genuinely missing future data into zero.
const unknown=structuredClone(c);unknown.foods.herbal_tea.perUnit.ala=null;delete unknown.foods.herbal_tea.nutrientProvenance.ala;
assert.equal(totals('herbal_tea',100,unknown).find(n=>n.id==='ala').foodUnknown,1);
assert.equal(totals('herbal_tea',100,unknown).find(n=>n.id==='ala').difference,null);
const partial=structuredClone(c);partial.foods.sushi_maki_salmon.incompleteNutrients=['b12'];
assert.equal(totals('sushi_maki_salmon',100,partial).find(n=>n.id==='b12').partial,true);
if(process.env.NCC_WRITE_BULK_AUDIT==='1')writeFileSync(new URL('audit-169.json',dir),JSON.stringify({baseline:'0d0e88df8734996683b4c3f11bb6344feb1b0f6c',complete:853,resolved},null,2)+'\n');
console.log(JSON.stringify({resolved:169,complete:853,partial:0,priorCompleteValuesPreserved:true}));
