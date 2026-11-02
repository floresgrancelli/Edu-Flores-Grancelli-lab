// Student UX regression: execute REAL handlers from pilot.js against isolated
// session/REST fixtures. No hosted credentials, production data or device UAT.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const slice=(start,end)=>{
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Missing production handler boundary: '+start);
 return source.slice(a,b);
};
const day='2026-11-01',today=()=>day;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const initialDiary=()=>({student_id:'A',log_day:day,meals:{cena:[{id:'egg',qty:100,k:145}]},skipped:{cena:false,_closed:false}});
const nextDiary=()=>({student_id:'B',log_day:day,meals:{cena:[{id:'rice',qty:120,k:156}]},skipped:{cena:false,_closed:false}});
const switchAccount=(state,newDiary)=>{
 state.session={user:{id:'B'}};state.diary=newDiary;state.lastEditedMeal='B-marker';
};

const recipeHelper=slice('function allowedRecipeIngredientIds(){','async function createPersonalRecipe(){');
const recipeState={profile:{role:'student'},foodPlan:{approved_food_ids:['egg','rice_cooked']}};
const recipes=new Function('state','allowedFoods','FOOD_STATE_PAIRS',
 recipeHelper+';return {allowedRecipeIngredientIds,validateRecipeIngredientAccess};')(
 recipeState,()=>['egg','rice_cooked'],{rice:['rice_cooked','rice_raw']});
assert.deepEqual([...recipes.allowedRecipeIngredientIds()].sort(),['egg','rice_cooked','rice_raw']);
assert.doesNotThrow(()=>recipes.validateRecipeIngredientAccess([{foodId:'egg',grams:100}]));
assert.doesNotThrow(()=>recipes.validateRecipeIngredientAccess([['rice_raw',80]]));
assert.throws(()=>recipes.validateRecipeIngredientAccess([{foodId:'chocolate',grams:20}]),/coach no incluyó/);
assert.throws(()=>recipes.validateRecipeIngredientAccess([['unknown_food',10]]),/coach no incluyó/);
assert.throws(()=>recipes.validateRecipeIngredientAccess([]),/coach no incluyó/);
recipeState.foodPlan=null;
assert.doesNotThrow(()=>recipes.validateRecipeIngredientAccess([{foodId:'chocolate',grams:20}]),
 'Pilot legacy accounts without approved food list keep their old catalog');
recipeState.foodPlan={approved_food_ids:['egg']};recipeState.profile.role='coach';
assert.doesNotThrow(()=>recipes.validateRecipeIngredientAccess([{foodId:'chocolate',grams:20}]),
 'Coach private diary is independent of student-approved catalog');
assert.match(source,/validateRecipeIngredientAccess\(recipe\.ingredients\)/,
 'Fit registration invokes actual published-food validation');
assert.match(source,/validateRecipeIngredientAccess\(selected\.ingredients\)/,
 'Personal recipe registration validates old recipes again');
assert.match(source,/const matches=foods\.filter\(f=>permittedIngredients\.has\(f\.id\)/,
 'New personal recipe picker hides foods not approved by coach');

// An old habitual must not notify B or restore B's last edited slot if A's
// existing diary write resolves/rejects after switching account.
const habitualBody=slice('async function applyChosenHabitual(slot){','async function habitualAction(slot,action){');
for(const fails of [false,true]){
 const a=initialDiary(),b=nextDiary(),state={session:{user:{id:'A'}},diary:a,lastEditedMeal:'old-A'};
 const alerts=[],hold=deferred(),old=structuredClone(a);
 const handler=new Function('state','mealSlots','runHabitualSlotAction','chosenHabitual',
  'validateHabitualCatalog','activeDiary','confirm','saveDiary','notify','today',
  habitualBody+';return applyChosenHabitual;')(
  state,[['cena','Cena']],(_slot,work)=>work(),
  ()=>({name:'Cereal favorito',items:[{id:'oats',qty:80,k:300}]}),
  ()=>{},()=>a,()=>true,()=>hold.promise,msg=>alerts.push(msg),today);
 const task=handler('cena');switchAccount(state,b);
 if(fails){hold.reject(new Error('offline'));await assert.rejects(task,/offline/);
  assert.deepEqual(a,old,'Failed A favorite restores only A diary');
 }else{hold.resolve();await task;}
 assert.strictEqual(state.diary,b,'A favorite result may not replace B diary');
 assert.equal(state.lastEditedMeal,'B-marker','A favorite callback may not overwrite B UI');
 assert.deepEqual(alerts,[],'A favorite must not notify B');
}

const removeBody=slice('if(el.dataset.removefood){','if(el.dataset.removesupp!==undefined){');
const clearBody=slice('if(el.dataset.clearm){','if(el.dataset.removesport!==undefined)');
for(const [kind,code,el] of [
 ['remove',removeBody,{dataset:{removefood:'cena:0'}}],
 ['clear',clearBody,{dataset:{clearm:'cena'}}]
]){
 for(const fails of [false,true]){
  const a=initialDiary(),b=nextDiary(),state={session:{user:{id:'A'}},diary:a};
  const beforeA=structuredClone(a),beforeB=structuredClone(b),alerts=[],hold=deferred(),locks=new Set();
  const handler=new Function('el','pendingMealRegistrations','activeDiary','saveDiary',
    'state','mealSlots','notify','today',
    'return async()=>{'+code+'};')(
    el,locks,()=>a,()=>hold.promise,state,[['cena','Cena']],m=>alerts.push(m),today);
  const task=handler();switchAccount(state,b);
  if(fails){hold.reject(new Error('offline'));await assert.rejects(task,/offline/);
   assert.deepEqual(a,beforeA,kind+' rejected write must restore old diary only');
  }else{hold.resolve();await task;assert.deepEqual(a.meals.cena,[],kind+' confirmed write clears A');}
  assert.deepEqual(b,beforeB,kind+' response must preserve all B data');
  assert.strictEqual(state.diary,b,kind+' late callback may not restore old A diary');
  assert.deepEqual(alerts,[],kind+' late callback may not toast B');
  assert.equal(locks.size,0,kind+' lock must always release');
 }
}

// The two real "Omitir" entry points must not restore B's diary, checkbox or
// guided editor when a pending response from account A completes later.
const checkboxBody=slice('async function saveSkippedMealChoice(slot,checked,checkbox){',
 'root.addEventListener("change",e=>{invalidateCoachDraft(e);');
const guidedBody=slice('if(el.dataset.mealomit){','if(action==="closeMeal")');
for(const [kind,body] of [['checkbox',checkboxBody],['guided',guidedBody]]){
 for(const fails of [false,true]){
  const a={student_id:'A',log_day:day,meals:{desayuno:[]},
   skipped:{desayuno:false,_closed:false,_guidedComponents:{desayuno:{protein:false,carb:false}}}};
  const b=nextDiary(),state={session:{user:{id:'A'}},diary:a,activeMeal:'desayuno'};
  const priorA=structuredClone(a),priorB=structuredClone(b);
  const locks=new Set(),hold=deferred(),alerts=[],editors=[];
  const checkbox={checked:true};
  const task=kind==='checkbox'?
   new Function('mealSlots','activeDiary','pendingMealRegistrations','state','saveDiary','today',
    body+';return saveSkippedMealChoice;')(
    [['desayuno','Desayuno']],()=>a,locks,state,()=>hold.promise,today
   )('desayuno',true,checkbox):
   new Function('el','state','isGuidedMealSlot','pendingMealRegistrations',
    'activeDiary','today','saveDiary','openMealDialog','notify',
    'return async()=>{'+body+'};')(
    {dataset:{mealomit:'protein'}},state,slot=>slot==='desayuno',locks,
    ()=>a,today,()=>hold.promise,(...args)=>editors.push(args),m=>alerts.push(m)
   )();
  switchAccount(state,b);state.activeMeal='cena';
  checkbox.checked=false; // Current B screen is no longer the A draft.
  if(fails){hold.reject(new Error('offline'));await assert.rejects(task,/offline/);
   assert.deepEqual(a,priorA,kind+' A rollback must restore only A');
  }else{hold.resolve();await task;}
  assert.strictEqual(state.diary,b,kind+' late A response cannot replace B diary');
  assert.deepEqual(b,priorB,kind+' must not mutate B payload');
  assert.equal(checkbox.checked,false,kind+' may not toggle B checkbox');
  assert.equal(state.activeMeal,'cena',kind+' may not take B back to old meal');
  assert.deepEqual(editors,[],kind+' delayed A response may not open B guided editor');
  assert.deepEqual(alerts,[],kind+' delayed A response may not notify B');
  assert.equal(locks.size,0,kind+' must release pending per-meal lock');
 }
}

console.log('PASS student UX: approved recipe ingredients (Fit/personal), favorite/food remove/clear and Omitir account isolation (synthetic REST, not hosted/device UAT).');
