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
let rows=[],seq=0,rendered=0,notified=[];
const userId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const sb={from(table){
 assert.equal(table,'efg_habitual_meals');
 return {
  select(){return this;},eq(){return this;},order(){return Promise.resolve({data:structuredClone(rows),error:null})},
  insert(value){this.value=value;return this;},
  single(){const data={...structuredClone(this.value),id:'id-'+(++seq),created_at:'2026-10-30T00:00:00Z'};
   rows.push(data);return Promise.resolve({data,error:null})}
 };
}};
const state={profile:{role:'student'},session:{user:{id:userId}},habitualSelection:{}};
const mealSlots=[['desayuno','Desayuno'],['media_manana','Media mañana'],['almuerzo','Almuerzo'],
 ['media_tarde','Media tarde'],['merienda','Merienda'],['cena','Cena']];
const localStorage={getItem(){return null},removeItem(){}};
const diary={meals:{desayuno:[{id:'egg',name:'Huevos',qty:100,unit:'g',k:140,p:12,c:2,f:8}]},skipped:{}};
const api=new Function('sb','state','mealSlots','localStorage','activeDiary','prompt','confirm',
 'habitualShortLabel','habitualPreviewHTML','escapeHTML','notify','render','saveDiary','num',
 subsystem+'\nreturn {loadCloudHabituales,getHabitualList,habitualPickerHTML,habitualAction,updateHabitualPreview,resetMemory(){cloudHabituales=[]}};')(
 sb,state,mealSlots,localStorage,()=>diary,()=>seq===0?'Desayuno de huevos':'Desayuno de avena',()=>true,
 x=>x.name,x=>x?x.items.map(z=>z.name).join(', '):'',x=>String(x),
 msg=>notified.push(msg),async()=>{rendered++},async()=>{},x=>String(x)
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
assert.equal(rendered,2);
assert.equal(notified.length,2);
console.log('PASS UX-HABITUAL-REAL-01: actual app save twice, cloud readback after reset/relogin, both names and foods in picker, no cross-slot leakage. Hosted iPhone/Android UAT pending.');
