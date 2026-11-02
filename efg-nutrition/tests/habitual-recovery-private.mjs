import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
import {sameRecipeIngredients} from '../pilot/recipe-ingredients-equal.js';
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const start=app.indexOf('async function loadCloudHabituales(){'),end=app.indexOf('\n}',start)+2;assert.ok(start>0&&end>start);
const dir=mkdtempSync(join(tmpdir(),'ncc-habitual-recovery-'));
try{
 const path=join(dir,'real-loader.mjs');
 writeFileSync(path,'export function create(env){const {state,sb,localStorage,mealSlots,habitualListKey,habitualKey,sameRecipeIngredients}=env;let cloudHabituales=[];'+app.slice(start,end)+';return {loadCloudHabituales,rows:()=>cloudHabituales};}');
 const {create}=await import(pathToFileURL(path).href);
 for(const scenario of ['full','free-slot','already-committed','different-quantity']){
  const item={id:'banana',qty:100,unit:'g',k:89,p:1.09,c:22.84,f:0.33,fi:2.6};
  const jsonb=x=>Object.fromEntries(Object.entries(x).reverse());
  let inserts=0;const rows=Array.from({length:scenario==='free-slot'?19:20},(_,i)=>({id:'keep-'+i,meal_slot:'desayuno',name:'H'+i,items:[jsonb(item)]}));
  const pending={name:'TEST_ONLY pending',items:[item]};
  if(['already-committed','different-quantity'].includes(scenario)){rows[19]={id:'original',meal_slot:'desayuno',name:pending.name,items:[jsonb({...item,qty:scenario==='different-quantity'?101:100})]};}
  const baseline=structuredClone(rows),store=new Map([['v2',JSON.stringify([pending])]]);
  const sb={from(table){assert.equal(table,'efg_habitual_meals');let value;return {select(){return this;},eq(){return this;},order:async()=>({data:structuredClone(rows),error:null}),insert(v){inserts++;value=v;return this;},single:async()=>{const row={...value,id:'new',items:value.items.map(jsonb)};rows.push(row);return {data:row,error:null};}};}};
  const loader=create({state:{session:{user:{id:'TEST_ONLY_A'}},profile:{role:'student'},authContextEpoch:0},sb,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},mealSlots:[['desayuno']],habitualListKey:()=> 'v2',habitualKey:()=> 'v1',sameRecipeIngredients});
  await loader.loadCloudHabituales();await loader.loadCloudHabituales();
  assert.equal(rows.length,20);assert.deepEqual(rows.slice(0,baseline.length),baseline,'Original rows must be preserved');
  assert.equal(inserts,scenario==='free-slot'?1:0);
  assert.equal(store.has('v2'),['full','different-quantity'].includes(scenario));
  console.log('PASS real habitual loader: '+scenario+' (synthetic Node, not HTTP)');
 }
}finally{rmSync(dir,{recursive:true,force:true});}
