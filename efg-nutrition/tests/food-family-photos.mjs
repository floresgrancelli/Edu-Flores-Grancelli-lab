import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const src=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const code=src.slice(src.indexOf('function foodFamilyVisual('),src.indexOf('// Exact ingredient IDs only:'));
const {visual,html}=new Function('escapeHTML',code+';return {visual:foodFamilyVisual,html:foodFamilyPhoto};')(v=>String(v).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'));
const catalog=Object.values(JSON.parse(readFileSync(new URL('../catalog/guide-catalog.json',import.meta.url))).foods);
assert.ok(catalog.length>=560);
for(const f of catalog){const before=JSON.stringify(f),v=visual(f);assert.ok(v.src||Number.isInteger(v.cell)&&v.cell>=0&&v.cell<30,f.id);assert.match(html(f),/ncc-family-photo/);assert.equal(JSON.stringify(f),before);if(v.src)assert.ok(existsSync(new URL('../pilot/'+v.src,import.meta.url)));}
for(const name of ['Port Salut Light','Mozzarella','Ricota magra','Queso rallado'])assert.equal(visual({name}).cell,0,name);
assert.equal(visual({id:'custom-drink-42',name:'Café con leche · 300 ml leche protein descremada'}).cell,2);
assert.equal(visual({name:'Tostadas integrales'}).cell,1);
assert.equal(visual({name:'Dulce de membrillo'}).cell,4);
assert.equal(visual({name:'Mi receta propia',privateRecipe:true}).cell,29);
assert.equal(visual({name:'Alimento histórico desconocido'}).cell,29);
assert.ok(readFileSync(new URL('../pilot/assets/food-families-r1.webp',import.meta.url)).length>10000);
console.log('PASS generic food family photos: '+catalog.length+' catalog foods, custom drinks, cheese variants and unknown historical entries; no mutations.');

for(const name of ['Queso crema','Queso untable light','Casancrem','Philadelphia'])assert.equal(visual({name}).src,'./assets/cream-cheese-r1.webp',name);
assert.equal(visual({id:'cream_cheese_regular'}).src,'./assets/cream-cheese-r1.webp');
