// UX-HABITUAL-REAL-01: execute the REAL habitual subsystem extracted from pilot.js
// against an in-memory Supabase-like adapter, preserving the original source code.
// No real users or hosted credentials; validates save -> readback -> reload -> dropdown.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const begin=app.indexOf('let cloudHabituales=[];');
const end=app.indexOf('function recipeStoreKey(){',begin);
assert.ok(begin>0&&end>begin,'The actual cloud habitual subsystem must remain discoverable');
const subsystem=app.slice(begin,end);
let rows=[],seq=0,rendered=0,notified=[],diaryWrites=0;
let holdNextInsert=false,releaseHeldInsert=null,approvedIds=['egg','oats'];
const userId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const sb={from(table){
 assert.equal(table,'efg_habitual_meals');
 return {
  select(){return this;},eq(){return this;},order(){return Promise.resolve({data:structuredClone(rows),error:null})},
  insert(value){this.value=value;return this;},
  single(){const data={...structuredClone(this.value),id:'id-'+(++seq),created_at:'2026-10-30T00:00:00Z'};
   rows.push(data);
   if(holdNextInsert){holdNextInsert=false;return new Promise(resolve=>{releaseHeldInsert=()=>resolve({data,error:null})})}
   return Promise.resolve({data,error:null})}
 };
}};
const state={profile:{role:'student'},session:{user:{id:userId}},habitualSelection:{}};
const mealSlots=[['desayuno','Desayuno'],['media_manana','Media mañana'],['almuerzo','Almuerzo'],
 ['media_tarde','Media tarde'],['merienda','Merienda'],['cena','Cena']];
const legacyStore=new Map();
const localStorage={
 getItem:key=>legacyStore.get(key)||null,
 removeItem:key=>{legacyStore.delete(key)}
};
const diary={meals:{desayuno:[{id:'egg',name:'Huevos',qty:100,unit:'g',k:140,p:12,c:2,f:8}]},skipped:{}};
const fakeDocument={getElementById(id){const slot=id.replace('habitualChoice_','');return {value:state.habitualSelection[slot]||''}}};
const pendingMealRegistrations=new Set();
const api=new Function('sb','state','mealSlots','localStorage','activeDiary','prompt','confirm',
 'habitualShortLabel','habitualPreviewHTML','escapeHTML','notify','render','saveDiary','num',
 'foods','FOOD_STATE_PAIRS','allowedFoods','document','pendingMealRegistrations','today',
 subsystem+'\nreturn {loadCloudHabituales,getHabitualList,habitualPickerHTML,habitualAction,applyChosenHabitual,updateHabitualPreview,resetMemory(){cloudHabituales=[]}};')(
 sb,state,mealSlots,localStorage,()=>diary,
 msg=>msg.startsWith('Elegí la comida habitual escribiendo su número:')?'1':seq===0?'Desayuno de huevos':'Desayuno de avena',()=>true,
 x=>x.name,x=>x?x.items.map(z=>z.name).join(', '):'',x=>String(x),
 msg=>notified.push(msg),async()=>{rendered++},async()=>{diaryWrites++},x=>String(x),
 [{id:'egg',name:'Huevos'},{id:'oats',name:'Avena'}],{},()=>approvedIds,fakeDocument,pendingMealRegistrations,()=>diary.log_day
);
await api.loadCloudHabituales();
assert.equal(api.getHabitualList('desayuno').length,0);
await api.habitualAction('desayuno','save');
assert.equal(rows.length,1,'Saving must reach hosted-table-shaped insert');
assert.equal(api.getHabitualList('desayuno').length,1);
assert.match(api.habitualPickerHTML('desayuno'),/Desayuno de huevos/);
assert.match(api.habitualPickerHTML('desayuno'),/Huevos/);
diary.meals.desayuno=[{id:'oats',name:'Avena',qty:80,unit:'g',k:310,p:12,c:54,f:5}];
await api.habitualAction('desayuno','save');
assert.equal(rows.length,2,'Allow multiple habitual meals in same time slot');
api.resetMemory();state.habitualSelection={};
await api.loadCloudHabituales();
assert.deepEqual(api.getHabitualList('desayuno').map(x=>x.name),['Desayuno de huevos','Desayuno de avena']);
const html=api.habitualPickerHTML('desayuno');
assert.match(html,/Desayuno de huevos/);
assert.match(html,/Desayuno de avena/);
assert.match(html,/Elegí una de tus 2 comidas habituales/);
assert.match(html,/data-habitualapply="desayuno"/);
assert.equal(api.getHabitualList('cena').length,0,'No crossover between meal slots');
assert.match(api.habitualPickerHTML('cena'),/Todavía no guardaste habituales/);
// Saved meal summaries must remain readable after a simulated session reload.
assert.match(api.habitualPickerHTML('desayuno'),/Desayuno de avena/);
assert.equal(rendered,2);
assert.equal(notified.length,2);
// Simulate two rapid save taps while Supabase has not answered the first insert.
// They must not create duplicate favorites; sequential saves remain supported.
const beforeFastTaps=rows.length;
holdNextInsert=true;
const firstTap=api.habitualAction('desayuno','save');
await api.habitualAction('desayuno','save');
assert.equal(rows.length,beforeFastTaps+1,'Rapid duplicate save must insert one favorite only');
assert.equal(pendingMealRegistrations.has('desayuno'),true,'A pending favorite also locks direct meal registration');
assert.equal(pendingMealRegistrations.has('almuerzo'),false,'Other meal slots remain independent');
assert.ok(typeof releaseHeldInsert==='function','Mock must hold first network response');
releaseHeldInsert();
await firstTap;
assert.equal(pendingMealRegistrations.has('desayuno'),false,'Favorite lock is released when remote insert resolves');
assert.equal(api.getHabitualList('desayuno').length,3);
await api.habitualAction('desayuno','save');
assert.equal(rows.length,beforeFastTaps+2,'A later independent favorite can still be saved');
pendingMealRegistrations.add('desayuno'); // Simulated direct editor currently saving to diary.
const blockedBefore=rows.length;
await api.habitualAction('desayuno','save');
assert.equal(rows.length,blockedBefore,'Favorite action cannot race a manual food save in same slot');
pendingMealRegistrations.delete('desayuno');

state.foodPlan={approved_food_ids:['oats']};
approvedIds=['oats'];state.habitualSelection.desayuno=rows[0].id;
const unchanged=structuredClone(diary.meals.desayuno);
const prevWrites=diaryWrites;
await assert.rejects(api.applyChosenHabitual('desayuno'),/coach ya no incluyó/);
assert.equal(diaryWrites,prevWrites,'Disallowed historical foods cannot bypass Coach approval via favorites');
assert.deepEqual(diary.meals.desayuno,unchanged,'Rejected favorite must not change diary');
assert.ok(api.getHabitualList('desayuno').some(x=>x.id===rows[0].id),
 'Historical favorite remains available for review, not erased');
approvedIds=['egg'];state.foodPlan.approved_food_ids=['egg'];
await api.applyChosenHabitual('desayuno');
assert.equal(diaryWrites,prevWrites+1,'Coach-approved favorite remains reusable');
assert.equal(diary.meals.desayuno[0].id,'egg');
state.foodPlan=null;approvedIds=[];
await api.habitualAction('desayuno','use');
assert.equal(diaryWrites,prevWrites+2,'Legacy account without approval list keeps habitual behavior');

// Both picker paths must restore the previous diary if the remote write fails.
assert.match(subsystem,/async function applyChosenHabitual\(slot\)/);
assert.match(subsystem,/const previousItems=structuredClone\(d\.meals\[slot\]\)/);
assert.equal((subsystem.match(/catch\(error\)\{\s*d\.meals\[slot\]=previousItems/g)||[]).length,2,
 'Both the selected habitual and legacy action must roll back in-memory meals');
// UX-04-03: upgrading an account with BOTH v2 favorites and v1 older meal
// must import both, not erase the still-unmigrated v1 meal when v2 is present.
const lunchV2Key='efg-nutrition-habitual-v2:'+userId+':almuerzo';
const lunchV1Key='efg-nutrition-habitual-v1:'+userId+':almuerzo';
const lunchV2={name:'Almuerzo v2',items:[{id:'oats',name:'Avena',qty:80}]};
const lunchV1=[{id:'egg',name:'Huevos',qty:100}];
legacyStore.set(lunchV2Key,JSON.stringify([lunchV2]));
legacyStore.set(lunchV1Key,JSON.stringify(lunchV1));
api.resetMemory();await api.loadCloudHabituales();
assert.deepEqual(api.getHabitualList('almuerzo').map(x=>x.name),['Almuerzo v2','Mi habitual anterior'],
 'Both locally saved versions must survive migration to cloud favorites');
assert.equal(legacyStore.has(lunchV2Key),false,'Remove v2 after verified import');
assert.equal(legacyStore.has(lunchV1Key),false,'Remove v1 only after verified import');

// At the 20-favorite capacity limit, keep BOTH backups. Import one at a time
// when capacity later becomes available, without silently discarding the other.
const dinnerV2Key='efg-nutrition-habitual-v2:'+userId+':cena';
const dinnerV1Key='efg-nutrition-habitual-v1:'+userId+':cena';
legacyStore.set(dinnerV2Key,JSON.stringify([{name:'Cena nueva',items:[{id:'oats',name:'Avena',qty:50}]}]));
legacyStore.set(dinnerV1Key,JSON.stringify([{id:'egg',name:'Huevos',qty:50}]));
for(let i=0;i<20;i++)rows.push({id:'seed-dinner-'+i,student_id:userId,meal_slot:'cena',
 name:'Cena antigua '+i,items:[{id:'egg',name:'Huevos',qty:i+1}],created_at:'2026-10-29T00:00:00Z'});
api.resetMemory();await api.loadCloudHabituales();
assert.equal(api.getHabitualList('cena').length,22,
 '20 cloud favorites must not hide TWO unsynced local meals');
assert.deepEqual(api.getHabitualList('cena').slice(-2).map(x=>x.name),['Cena nueva','Mi habitual anterior']);
assert.match(api.habitualPickerHTML('cena'),/pendiente de sincronizar/,
 'The picker must visibly indicate locally recovered favorites');
state.habitualSelection.cena='local-20';
await api.applyChosenHabitual('cena');
assert.equal(diary.meals.cena[0].id,'oats',
 'Even at full cloud quota, a locally backed-up favorite stays usable');
assert.ok(legacyStore.has(dinnerV2Key)&&legacyStore.has(dinnerV1Key),
 'Full quota must preserve v1 and v2 backup keys');
rows=rows.filter(x=>x.id!=='seed-dinner-19');
await api.loadCloudHabituales();
assert.equal(api.getHabitualList('cena').length,21,
 '19 old cloud + 1 imported + 1 locally pending remain accessible');
assert.ok(legacyStore.has(dinnerV1Key),'When only v2 fits, v1 must remain recoverable');
rows=rows.filter(x=>x.id!=='seed-dinner-18');
await api.loadCloudHabituales();
assert.deepEqual(api.getHabitualList('cena').slice(-2).map(x=>x.name),['Cena nueva','Mi habitual anterior']);
assert.ok(!legacyStore.has(dinnerV1Key)&&!legacyStore.has(dinnerV2Key),
 'Cleanup only after both backups have migrated to the cloud');
console.log('PASS UX-04-03: v1+v2 coexistence, 20-slot quota and deferred recovery preserve saved habitual meals.');
// A malformed backup must not block the OTHER version or be silently removed.
const corruptV2Key='efg-nutrition-habitual-v2:'+userId+':media_tarde';
const validV1Key='efg-nutrition-habitual-v1:'+userId+':media_tarde';
legacyStore.set(corruptV2Key,'{incomplete-json');
legacyStore.set(validV1Key,JSON.stringify([{id:'egg',name:'Huevos',qty:75}]));
const validV2Key='efg-nutrition-habitual-v2:'+userId+':merienda';
const corruptV1Key='efg-nutrition-habitual-v1:'+userId+':merienda';
legacyStore.set(validV2Key,JSON.stringify([{name:'Merienda v2',items:[{id:'oats',name:'Avena',qty:33}]}]));
legacyStore.set(corruptV1Key,'{incomplete-json');
api.resetMemory();await api.loadCloudHabituales();
assert.deepEqual(api.getHabitualList('media_tarde').map(x=>x.name),['Mi habitual anterior']);
assert.deepEqual(api.getHabitualList('merienda').map(x=>x.name),['Merienda v2']);
assert.ok(legacyStore.has(corruptV2Key),'Malformed v2 must remain recoverable');
assert.ok(legacyStore.has(corruptV1Key),'Malformed v1 must remain recoverable');
assert.ok(!legacyStore.has(validV1Key)&&!legacyStore.has(validV2Key),
 'Successfully migrated intact versions may be cleaned up independently');
console.log('PASS UX-04-03: malformed v1/v2 backups preserved without blocking valid-version recovery.');

console.log('PASS UX-HABITUAL-REAL-01: actual app save twice, cloud readback after reset/relogin, both names and foods in picker, no cross-slot leakage. Hosted iPhone/Android UAT pending.');

// UX-04-03: an old account's delayed read must never replace the favorites of
// the current account, even when the old local v2 JSON is malformed.
const accountA='user-favorite-A',accountB='user-favorite-B';
const switchState={profile:{role:'student'},session:{user:{id:accountA}},habitualSelection:{}};
const oldV1='efg-nutrition-habitual-v1:'+accountA+':desayuno';
const oldV2='efg-nutrition-habitual-v2:'+accountA+':desayuno';
const switchStore=new Map([[oldV1,JSON.stringify([{id:'oats',name:'Avena antigua'}])],[oldV2,'{damaged']]);
const switchLocal={getItem:k=>switchStore.get(k)||null,removeItem:k=>switchStore.delete(k)};
let resolveOldRead;
const switchSB={from(table){
 assert.equal(table,'efg_habitual_meals');
 let owner='';
 return {select(){return this;},eq(field,value){if(field==='student_id')owner=value;return this;},
  order(){
   if(owner===accountA)return new Promise(resolve=>{resolveOldRead=resolve});
   return Promise.resolve({data:[{id:'fav-B',meal_slot:'desayuno',name:'Comida de B',
    items:[{id:'egg',name:'Huevo'}]}],error:null});
  },
  insert(){throw new Error('Stale migration attempted an insert');}};
}};
const switchAPI=new Function('sb','state','mealSlots','localStorage','pendingMealRegistrations',
 subsystem+';return {loadCloudHabituales,getHabitualList};')(
 switchSB,switchState,mealSlots,switchLocal,new Set());
const oldRead=switchAPI.loadCloudHabituales();
switchState.session={user:{id:accountB}};
await switchAPI.loadCloudHabituales();
resolveOldRead({data:[{id:'fav-A',meal_slot:'desayuno',name:'Comida de A',
 items:[{id:'oats',name:'Avena'}]}],error:null});
await oldRead;
assert.deepEqual(switchAPI.getHabitualList('desayuno').map(x=>x.name),['Comida de B'],
 'A delayed response must never render a previous account’s meals');
switchState.session={user:{id:accountA}};
assert.deepEqual(switchAPI.getHabitualList('desayuno').map(x=>x.name),['Mi habitual anterior'],
 'Malformed v2 must not hide valid old v1 while the new account loads');
assert.ok(switchStore.has(oldV1)&&switchStore.has(oldV2),'No old-user backup deletion');

// Also simulate a completed old-user INSERT after account switch. Its UI result
// must be ignored and its local backup kept for safe reconciliation on re-login.
const insertState={profile:{role:'student'},session:{user:{id:accountA}},habitualSelection:{}};
const insertKey='efg-nutrition-habitual-v2:'+accountA+':desayuno';
const insertStore=new Map([[insertKey,JSON.stringify([{name:'Pendiente A',items:[{id:'egg'}]}])]]);
let resolveOldInsert;
const pendingInsertSB={from(table){
 assert.equal(table,'efg_habitual_meals');
 let owner='',payload;
 return {select(){return this;},eq(field,value){if(field==='student_id')owner=value;return this;},
  order(){return Promise.resolve({data:owner===accountB?
   [{id:'fav-B2',meal_slot:'desayuno',name:'Otro favorito de B',items:[{id:'oats'}]}]:[],error:null});},
  insert(value){payload=value;return this;},
  single(){assert.equal(payload.student_id,accountA);
   return new Promise(resolve=>{resolveOldInsert=()=>resolve({data:{...payload,id:'insert-A'},error:null});});}};
}};
const insertAPI=new Function('sb','state','mealSlots','localStorage','pendingMealRegistrations',
 subsystem+';return {loadCloudHabituales,getHabitualList};')(
 pendingInsertSB,insertState,mealSlots,
 {getItem:k=>insertStore.get(k)||null,removeItem:k=>insertStore.delete(k)},new Set());
const oldInsert=insertAPI.loadCloudHabituales();
await Promise.resolve(); // resume initial SELECT and enter awaited import INSERT
assert.equal(typeof resolveOldInsert,'function');
insertState.session={user:{id:accountB}};
await insertAPI.loadCloudHabituales();
resolveOldInsert();
await oldInsert;
assert.deepEqual(insertAPI.getHabitualList('desayuno').map(x=>x.name),['Otro favorito de B']);
assert.ok(insertStore.has(insertKey),'Late old-account insert must not erase its backup');
console.log('PASS UX-04-03: stale A/B favorite reads and imports isolated; corrupt v2 cannot hide v1.');


// UX-04-03 OFFLINE DELETE AND RETRY: exercise the REAL functions from pilot.js.
// Users can delete a confirmed, locally backed-up favorite even when the
// backend is offline, without deleting another favorite or damaged backup.
const offlineUser='student-offline-delete';
const offlineV2='efg-nutrition-habitual-v2:'+offlineUser+':cena';
const offlineV1='efg-nutrition-habitual-v1:'+offlineUser+':cena';
const offlineMeals=[
 {name:'Cena A',items:[{id:'egg',name:'Huevo'}]},
 {name:'Cena B',items:[{id:'oats',name:'Avena'}]}
];
const offlineStore=new Map([
 [offlineV2,JSON.stringify(offlineMeals)],
 [offlineV1,JSON.stringify([{id:'banana',name:'Banana antigua'}])]
]);
const offlineStorage={
 getItem:key=>offlineStore.get(key)||null,
 setItem:(key,value)=>offlineStore.set(key,value),
 removeItem:key=>offlineStore.delete(key)
};
const offlineState={profile:{role:'student'},session:{user:{id:offlineUser}},habitualSelection:{}};
let allowOfflineDelete=false, offlineRenderCount=0;
const offlineDocument={getElementById(){return {value:offlineState.habitualSelection.cena||''}}};
const offlineSB={from(table){
 assert.equal(table,'efg_habitual_meals');
 return {select(){return this;},eq(){return this;},
  order(){return Promise.resolve({data:null,error:new Error('network unreachable')});}};
}};
const offlineApi=new Function('sb','state','mealSlots','localStorage',
 'pendingMealRegistrations','document','confirm','render','notify',
 subsystem+';return {loadCloudHabituales,getHabitualList,deleteChosenHabitual};')(
 offlineSB,offlineState,mealSlots,offlineStorage,new Set(),offlineDocument,
 ()=>allowOfflineDelete,async()=>{offlineRenderCount++},()=>{});
await offlineApi.loadCloudHabituales();
assert.deepEqual(offlineApi.getHabitualList('cena').map(x=>x.name),
 ['Cena A','Cena B','Mi habitual anterior'],
 'Offline cloud read cannot hide local v1/v2 favorites');
offlineState.habitualSelection.cena='local-0';
await offlineApi.deleteChosenHabitual('cena');
assert.deepEqual(JSON.parse(offlineStore.get(offlineV2)),offlineMeals,
 'Cancelled local deletion must not mutate backup');
allowOfflineDelete=true;
await offlineApi.deleteChosenHabitual('cena');
assert.deepEqual(JSON.parse(offlineStore.get(offlineV2)),[offlineMeals[1]],
 'Deleting one v2 favorite must preserve the other');
assert.ok(offlineStore.has(offlineV1),'v2 deletion must never clear v1 backup');
offlineState.habitualSelection.cena='local-1';
await offlineApi.deleteChosenHabitual('cena');
assert.equal(offlineStore.has(offlineV1),false,'Explicitly deleted v1 favorite is removed');
assert.equal(offlineRenderCount,2,'Only confirmed deletes cause re-render');
offlineStore.set(offlineV2,'{corrupt-json');
offlineStore.set(offlineV1,JSON.stringify([{id:'rice',name:'Arroz histórico'}]));
offlineState.habitualSelection.cena='local-0';
await offlineApi.deleteChosenHabitual('cena');
assert.equal(offlineStore.has(offlineV1),false);
assert.equal(offlineStore.get(offlineV2),'{corrupt-json',
 'Malformed v2 backup must be left untouched when removing valid v1');

const importUser='student-failed-migration';
const importKey='efg-nutrition-habitual-v2:'+importUser+':almuerzo';
const importStorageData=new Map([[importKey,JSON.stringify([
 {name:'Almuerzo sin subir',items:[{id:'oats',name:'Avena'}]}
])]]);
const importStorage={
 getItem:key=>importStorageData.get(key)||null,
 setItem:(key,value)=>importStorageData.set(key,value),
 removeItem:key=>importStorageData.delete(key)
};
const importState={profile:{role:'student'},session:{user:{id:importUser}},habitualSelection:{}};
const failedImportSB={from(){
 return {select(){return this;},eq(){return this;},
  order(){return Promise.resolve({data:[],error:null});},
  insert(){return this;},single(){return Promise.resolve({data:null,error:new Error('offline write')});}};
}};
const failedImportApi=new Function('sb','state','mealSlots','localStorage',
 'pendingMealRegistrations',subsystem+
 ';return {loadCloudHabituales,getHabitualList};')(
 failedImportSB,importState,mealSlots,importStorage,new Set());
await failedImportApi.loadCloudHabituales();
assert.equal(failedImportApi.getHabitualList('almuerzo')[0]?.name,'Almuerzo sin subir');
assert.ok(importStorageData.has(importKey),
 'Failed best-effort import must keep the original local backup');
console.log('PASS UX-04-03 offline local deletion, cancellation, malformed key protection and failed-import retry.');


// UX-04-03: thrown transport errors (not just resolved {error}) must preserve backups.
{
 const uid='student-transport-rejected',key='efg-nutrition-habitual-v2:'+uid+':cena';
 const pending={name:'Cena sin subir',items:[{id:'egg',name:'Huevo',qty:2}]};
 const store=new Map([[key,JSON.stringify([pending])]]);
 let failRead=true,attempts=0;
 const db={from(table){
  assert.equal(table,'efg_habitual_meals');
  return {select(){return this;},eq(){return this;},
   order(){return failRead?Promise.reject(new TypeError('Failed to fetch')):Promise.resolve({data:[],error:null});},
   insert(){return this;},single(){attempts++;return Promise.reject(new TypeError('NetworkError on insert'));}};
 }};
 const st={profile:{role:'student'},session:{user:{id:uid}},habitualSelection:{}};
 const local={getItem:k=>store.get(k)||null,removeItem:k=>store.delete(k)};
 const api=new Function('sb','state','mealSlots','localStorage','pendingMealRegistrations','console',
  subsystem+';return {loadCloudHabituales,getHabitualList};')(
  db,st,mealSlots,local,new Set(),{warn(){}});
 await api.loadCloudHabituales();
 assert.deepEqual(api.getHabitualList('cena').map(x=>x.name),[pending.name]);
 assert.equal(attempts,0,'No writes when SELECT rejected');
 failRead=false;
 await api.loadCloudHabituales();
 assert.equal(attempts,1,'Next successful SELECT retries unsynced favorite');
 assert.deepEqual(api.getHabitualList('cena').map(x=>x.name),[pending.name]);
 assert.equal(store.get(key),JSON.stringify([pending]),'Rejected INSERT leaves exact bytes for retry');
 console.log('PASS UX-04-03: rejected SELECT and rejected INSERT retain offline favorite.');
}


// UX-OFFLINE-NEW-HABITUAL-01: run REAL habitualAction() with rejected and
// resolved transport errors; local pending -> readback -> retry -> cloud once.
// Permission denial or malformed backup must never be reported as saved.
{
 const uid='student-new-habitual-offline';
 const cache=new Map(),notices=[];
 const storage={getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)};
 const st={profile:{role:'student'},session:{user:{id:uid}},habitualSelection:{}};
 const diary={meals:{desayuno:[{id:'egg',name:'Huevo',qty:100,k:150,p:12,c:1,f:10}]},skipped:{}};
 const names=['Desayuno primera red caída','Desayuno segunda red caída','Intento sin permisos','Intento sobre respaldo roto'];
 let failure='reject',inserts=0;
 const hosted=[];
 const db={from(table){
  assert.equal(table,'efg_habitual_meals');
  return {select(){return this;},eq(){return this;},
   order(){return Promise.resolve({data:structuredClone(hosted),error:null});},
   insert(v){this.value=v;return this;},
   single(){
    inserts++;
    if(failure==='reject')return Promise.reject(new TypeError('Failed to fetch'));
    if(failure==='returned')return Promise.resolve({data:null,error:{status:503,message:'Service temporarily unavailable'}});
    if(failure==='forbidden')return Promise.resolve({data:null,error:{status:403,code:'42501',message:'RLS denied'}});
    const row={...structuredClone(this.value),id:'cloud-'+inserts,created_at:'2026-11-01T07:00:00Z'};
    hosted.push(row);return Promise.resolve({data:row,error:null});
   }};
 }};
 const api=new Function('sb','state','mealSlots','localStorage','pendingMealRegistrations','activeDiary','prompt','notify','render','console',
  subsystem+';return {habitualAction,getHabitualList,loadCloudHabituales};')(
  db,st,mealSlots,storage,new Set(),()=>diary,()=>names.shift(),
  msg=>notices.push(msg),async()=>{},{warn(){}});
 await api.habitualAction('desayuno','save');
 failure='returned';await api.habitualAction('desayuno','save');
 const key='efg-nutrition-habitual-v2:'+uid+':desayuno';
 assert.equal(JSON.parse(cache.get(key)).length,2);
 assert.equal(hosted.length,0);
 assert.equal(api.getHabitualList('desayuno').filter(r=>r.pendingLocal).length,2);
 assert.equal(notices.filter(n=>n.includes('pendiente de sincronizar')).length,2);
 failure='success';await api.loadCloudHabituales();await api.loadCloudHabituales();
 assert.equal(hosted.length,2,'Reconnect must migrate each pending meal exactly once');
 assert.equal(api.getHabitualList('desayuno').length,2);
 assert.equal(cache.has(key),false,'Remove backup only when cloud accepted both meals');
 failure='forbidden';
 await assert.rejects(api.habitualAction('desayuno','save'),error=>error.code==='42501');
 assert.equal(hosted.length,2);
 assert.equal(cache.has(key),false,'RLS 403 must not be bypassed into local backup');
 cache.set(key,'{broken-json');failure='reject';
 await assert.rejects(api.habitualAction('desayuno','save'),/respaldo local/);
 assert.equal(cache.get(key),'{broken-json','Never overwrite malformed local JSON');
 assert.equal(notices.length,2,'Failed writes must not claim success');
 console.log('PASS UX-OFFLINE-NEW-HABITUAL-01: two offline saves, import once, 403 denies local write, damaged backups preserved.');
}
