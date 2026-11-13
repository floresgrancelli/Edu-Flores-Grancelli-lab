import assert from 'node:assert/strict';
import {CATALOG_BATCH_FOODS} from '../pilot/food-catalog-batch-20261113.js';
import {readFileSync,existsSync} from 'node:fs';
import {FOOD_PHOTO_MAP,resolveFoodVisual as visual,foodPhotoHTML} from '../pilot/food-visuals-r2.js';
const escapeHTML=v=>String(v).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const html=f=>foodPhotoHTML(f,escapeHTML);
const catalog=Object.values(JSON.parse(readFileSync(new URL('../catalog/guide-catalog.json',import.meta.url))).foods);
assert.ok(catalog.length>=560);
const pendingPhotoIds=new Set(CATALOG_BATCH_FOODS.map(f=>f.id));
assert.equal(pendingPhotoIds.size,25);
assert.deepEqual(Object.keys(FOOD_PHOTO_MAP).sort(),catalog.filter(f=>!pendingPhotoIds.has(f.id)).map(f=>f.id).sort());
for(const food of CATALOG_BATCH_FOODS){assert.equal(visual(food).placeholder,true,food.id+' must not inherit a picture by keyword');assert.match(html(food),/Imagen no disponible/);}
const assets=new Set();
for(const f of catalog.filter(f=>!pendingPhotoIds.has(f.id))){
 const before=JSON.stringify(f),v=visual(f);
 assert.ok(!v.placeholder,f.id);assert.match(html(f),/ncc-family-photo/);assert.equal(JSON.stringify(f),before);
 assert.deepEqual(visual({name:f.name}),v,'Historical exact name: '+f.id);
 if(!v.src){const rows=v.rows||(v.atlas==='prepared'?4:6);assert.ok(Number.isInteger(v.cell)&&v.cell>=0&&v.cell<v.columns*rows,f.id);}
 const asset=v.src||(v.atlas==='legacy'?'./assets/food-families-r1.webp':'./assets/food-specific/'+v.atlas+'-r1.webp');
 assert.ok(existsSync(new URL('../pilot/'+asset,import.meta.url)),asset);assets.add(asset);
}
for(const [id,cell] of Object.entries({ensalada_verduras:0,fruit_salad_basic:1,pure_potato:2,milanesa_chicken_baked:3})){
 assert.equal(visual({id}).atlas,'prepared');assert.equal(visual({id}).cell,cell);
 assert.equal(visual({id,name:'histórico sin azúcar ni aceite con leche'}),FOOD_PHOTO_MAP[id]);
}
assert.notDeepEqual(visual({id:'fruit_salad_basic'}),visual({id:'quince'}));
assert.notDeepEqual(visual({id:'ensalada_verduras'}),visual({id:'oil'}));
assert.notDeepEqual(visual({id:'pure_potato'}),visual({id:'milk'}));
assert.notDeepEqual(visual({id:'milanesa_chicken_baked'}),visual({id:'chicken'}));
for(const name of ['Mi receta propia','Alimento histórico desconocido','Ensalada propia con aceite','Tarta casera de pollo'])assert.equal(visual({name,privateRecipe:true}).placeholder,true);
assert.equal(visual({id:'custom-coffee',name:'Café con leche · 300 ml leche protein descremada'}),FOOD_PHOTO_MAP.coffee_milk);
for(const name of ['Queso crema','Queso untable light','Casancrem','Philadelphia'])assert.equal(visual({name}).src,'./assets/cream-cheese-r1.webp');
assert.equal(visual({name:'Dulce de membrillo'}),FOOD_PHOTO_MAP.quince);
assert.equal(visual({name:'Tostadas integrales'}),FOOD_PHOTO_MAP.toast_whole);
assert.ok(assets.size>=12);
const source=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
assert.match(source,/function foodFamilyPhoto\(food\)\{return foodPhotoHTML\(food,escapeHTML\);\}/);
console.log('PASS exact food photos: '+catalog.length+' identities, '+assets.size+' local assets, prepared-food regressions, historical names, neutral unknowns; no mutations.');
