// Exercise the actual application handlers and saveDiary on an absent daily row.
// Persistence is in memory here; signed HTTP persistence is covered separately.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(process.env.EFG_QA_PILOT_SOURCE||new URL('../pilot/pilot.js',import.meta.url),'utf8');
const slice=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start);return source.slice(start,end)};
const mealSlots=[['desayuno','Desayuno'],['almuerzo','Almuerzo'],['cena','Cena']];
const state={session:{user:{id:'owner-a'}},profile:{role:'student'},diary:null,progressLogs:[],habitualSelection:{},plannerSelections:{},plannerDraftGrams:{}};
let day='2026-10-31',saved=[],failWrite=false;
const fields={};
const sb={from(table){assert.equal(table,'efg_daily_logs');return {upsert(row){this.row=structuredClone(row);return this},select(){return this},async single(){if(failWrite)return {error:Error('offline')};saved.push(this.row);return {data:this.row,error:null}}}}};
const deps={state,sb,mealSlots,mealDefault:Object.fromEntries(mealSlots.map(([s])=>[s,[]])),today:()=>day,
 isNutritionDayClosed:()=>false,render:async()=>{},notify:()=>{},confirm:()=>true,prompt:()=>'',
 document:{getElementById:id=>({value:fields[id]||''})},localStorage:{getItem:()=>null},
 habitualShortLabel:x=>x.name,habitualPreviewHTML:()=>'',escapeHTML:String,num:String,
 SUPPLEMENTS:[{id:'test-protein',name:'Test protein',unit:'g',k:4,p:1}],
 foods:[{id:'sushi_maki_salmon',name:'Maki',unit:'g',k:2,p:.1,c:.3,f:.02,fi:.01}],
 allowedFoods:()=>['sushi_maki_salmon'],activeGoal:()=>({k:2000}),
 parsePlannerKey:()=>['almuerzo','prepared'],MILK_BEVERAGES:{},
 plannerSushiPortion:food=>food.id.startsWith('sushi_')?{grams:28,label:'pieza'}:null,
 plannerMeasuredGrams:(_food,qty)=>qty*28,
 makePlan:()=>({meals:[{slot:'almuerzo',rows:[{category:'prepared',food:deps.foods[0]}]}]})};
const parts=[slice('const values=(items)=>','async function ensureCurrentDay(){'),
 slice('function normItem(','let cloudHabituales=[];'),
 slice('let cloudHabituales=[];','function recipeStoreKey(){'),
 slice('async function addDailySupplement(){','let coachRosterConsent='),
 slice('async function addPlannedFood(key){','let mealDialogReturnFocus='),
 slice('async function saveDiary(){','async function loadPersonalData(){')];
const api=new Function(...Object.keys(deps),parts.join('\n')+'\nreturn {activeDiary,saveDiary,applyChosenHabitual,addDailySupplement,saveDayComment,addPlannedFood,setHabitual(v){cloudHabituales=v}};')(...Object.values(deps));
const reset=()=>{state.diary=null;state.progressLogs=[];saved=[];failWrite=false;};
const breakfast={id:'fav',meal_slot:'desayuno',name:'Huevos',items:[{id:'egg',name:'Huevos',qty:100,k:140,p:12,c:2,f:8,fi:0}]};
api.setHabitual([breakfast]);fields.habitualChoice_desayuno='fav';
await api.applyChosenHabitual('desayuno');
assert.deepEqual(saved[0].meals.desayuno,breakfast.items,'First habitual of a new day must survive saveDiary');
assert.equal(saved[0].totals.k,140);
reset();fields.supplementItem='test-protein';fields.supplementQty='30';fields.supplementMoment='desayuno';
await api.addDailySupplement();assert.equal(saved[0].sports[0]?.qty,30,'First supplement must persist');assert.equal(saved[0].totals.p,30);
reset();fields.dayComment='Registro de prueba';await api.saveDayComment();assert.equal(saved[0].skipped._comment,'Registro de prueba');
reset();fields.planQty_lunch='8';await api.addPlannedFood('lunch');
assert.equal(saved[0].meals.almuerzo[0]?.qty,224,'Planner first registration must persist');
assert.equal(saved[0].meals.almuerzo[0]?.displayQty,8,'Planner sushi must preserve pieces after reload');
assert.equal(saved[0].meals.almuerzo[0]?.displayUnit,'pieza');
const previous=structuredClone(state.diary);day='2026-11-01';
await api.applyChosenHabitual('desayuno');assert.equal(saved.at(-1).log_day,day);
assert.deepEqual(previous.meals.almuerzo[0].qty,224,'Previous day is preserved');
state.session.user.id='owner-b';assert.equal(api.activeDiary().student_id,'owner-b');
assert.deepEqual(api.activeDiary().meals.desayuno,[],'A new identity cannot inherit the prior draft');
reset();failWrite=true;await assert.rejects(api.applyChosenHabitual('desayuno'),/offline/);
assert.equal(saved.length,0);assert.deepEqual(api.activeDiary().meals.desayuno,[],'Failed habitual save restores the draft');
console.log('PASS actual fresh-day handlers: habitual, supplement, comment, sushi planner, next day, identity switch and failed-write rollback (memory adapter).');
