import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {FOOD_PHOTO_MAP,resolveFoodVisual} from '../pilot/food-visuals-r2.js';
const root=new URL('../../',import.meta.url),base='9dad4de8e376d164e1c2d2eca5f9cbde1e8f372c';
const read=p=>readFileSync(new URL(p,root));
const spec=JSON.parse(read('efg-nutrition/docs/food-thumbnails-20261113/generation-prompts.json'));
const old=JSON.parse(read('efg-nutrition/docs/food-thumbnails-20261113/baseline-photo-map.json'));
assert.equal(Object.keys(old).length,560);assert.equal(spec.records.length,53);assert.equal(Object.keys(FOOD_PHOTO_MAP).length,613);
assert.deepEqual(JSON.parse(read('efg-nutrition/pilot/food-photo-map-r2.json')),FOOD_PHOTO_MAP);
for(const [id,p] of Object.entries(old))assert.deepEqual(FOOD_PHOTO_MAP[id],p,id);
const hashes=new Set(),paths=new Set();let bytes=0;
for(const x of spec.records){
 const photo=FOOD_PHOTO_MAP[x.id];assert.ok(photo);assert.equal(photo.label,x.name);assert.equal(resolveFoodVisual({id:x.id,name:'otro nombre histórico'}),photo);
 if(x.assetPath){assert.equal(photo.src,'./'+x.assetPath.replace('efg-nutrition/pilot/',''));const b=read(x.assetPath);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.ok(b.length<32768,x.id+' compressed budget');bytes+=b.length;hashes.add(createHash('sha256').update(b).digest('hex'));paths.add(photo.src);}
 else assert.deepEqual(photo,{...old[x.sourceFoodId],label:x.name});
}
assert.equal(hashes.size,51);assert.equal(paths.size,51);assert.ok(bytes<1536000);
const prior=p=>execFileSync('git',['show',base+':'+p],{cwd:root,encoding:'utf8'});
for(const p of ['efg-nutrition/catalog/guide-catalog.json','efg-nutrition/pilot/food-catalog.js','efg-nutrition/pilot/food-catalog-batch-20261113.js','efg-nutrition/pilot/food-catalog-batch-two-20261113.js'])assert.equal(read(p).toString(),prior(p),'Nutritional bytes unchanged: '+p);
const resolver=s=>s.slice(s.indexOf(');\nconst normalize'));
assert.equal(resolver(read('efg-nutrition/pilot/food-visuals-r2.js').toString()),resolver(prior('efg-nutrition/pilot/food-visuals-r2.js')),'Exact resolver implementation unchanged');
for(const name of ['Ensalada de espinaca inventada','Garbanzos con salsa desconocida','Mi receta de atún'])assert.equal(resolveFoodVisual({id:'custom-unmapped',name}).placeholder,true);
console.log('PASS 53 explicit photo identities, 560 exact preserved mappings, 51 unique local WebPs ('+bytes+' bytes), exact nutritional bytes and unchanged resolver.');
