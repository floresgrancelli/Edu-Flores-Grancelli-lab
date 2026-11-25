import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {foodSearchText} from '../pilot/food-catalog.js';
import {exportGuideCatalog} from '../tools/export-guide-catalog.mjs';
test('mix is an estimated cooked vegetable and is searchable by each ingredient',()=>{
 const id='mix_verduras_cocidas_3';
 const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
 assert.match(app,/id:"mix_verduras_cocidas_3"[\s\S]*?category:"vegetable",unit:"g"/);
 const f=exportGuideCatalog().foods[id];
 assert.equal(f.unit,'g');
 assert.equal(f.sourceType,'recipe_estimate');
 assert.equal(f.diaryOnly,undefined);
 assert.match(f.source,/sin aceite ni sal agregados/);
 assert.match(f.source,/zucchini usado como aproximación del zapallito/);
 for(const key of ['zanahoria','zapallito','cebolla','verduras cocidas'])assert.ok(foodSearchText(f).includes(key));
 const parts=[
  {k:35,p:0.76,c:8.22,f:0.18,fi:3},
  {k:15,p:1.14,c:2.69,f:0.36,fi:1},
  {k:44,p:1.36,c:10.15,f:0.19,fi:1.4}
 ];
 for(const k of ['k','p','c','f','fi']){
  assert.ok(Math.abs(f[k]*100-parts.reduce((n,x)=>n+x[k],0)/3)<0.004,k);
 }
 const snapshot=exportGuideCatalog();
 assert.deepEqual(snapshot,JSON.parse(readFileSync(new URL('../catalog/guide-catalog.json',import.meta.url),'utf8')));
 assert.equal(snapshot.foods[id].dataQuality,'estimated');
});
