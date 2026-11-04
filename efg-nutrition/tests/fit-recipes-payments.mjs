import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const equalitySource=readFileSync("efg-nutrition/pilot/recipe-ingredients-equal.js","utf8");
const {sameRecipeIngredients}=await import("data:text/javascript;base64,"+Buffer.from(equalitySource).toString("base64"));
const createAppHarness=(...args)=>new Function('sameRecipeIngredients',...args).bind(null,sameRecipeIngredients);
const source=readFileSync("efg-nutrition/pilot/fit-recipes.js","utf8");
const photoSource=readFileSync("efg-nutrition/pilot/fit-recipe-photos.js","utf8");
const {FIT_RECIPE_PHOTOS}=await import("data:text/javascript;base64,"+Buffer.from(photoSource).toString("base64"));

const {FIT_RECIPES,recipeTotals}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const catalog=readFileSync("efg-nutrition/pilot/food-catalog.js","utf8");
const app=readFileSync("efg-nutrition/pilot/pilot.js","utf8");
const css=readFileSync("efg-nutrition/pilot/premium-system.css","utf8");
assert.equal(FIT_RECIPES.length,12);
const photos=FIT_RECIPES.map(r=>FIT_RECIPE_PHOTOS[r.id]);
assert.ok(photos.every(Boolean),"Every recipe needs an assigned stock photo");
assert.equal(new Set(photos.map(p=>p.src)).size,12,"All twelve photographs must differ");
for(const p of photos){
 assert.ok(/^https:\/\/images\.(unsplash|pexels)\.com\//.test(p.src),"Approved photo CDN");
 assert.ok(p.author&&p.provider&&/^https:\/\/(unsplash\.com|www\.pexels\.com)\//.test(p.source),"Attribution is mandatory in EFG");
}
assert.ok(app.includes("FIT_RECIPE_PHOTOS[recipe.id]"),"Photographs replace SVG illustrations");
assert.ok(app.includes("Foto ilustrativa"),"Dish photograph is not claimed to be the exact cooked recipe");

// PRO07 accessible image fallback, attribution, ingredient weight and estimated
// macro disclaimer must remain on every rendered Fit recipe card.
assert.match(app,/class="efg-fit-photo" src/,"PRO07 photo component");
assert.match(app,/alt="Fotografía ilustrativa de /,"Recipe photo alt must identify the dish");
assert.match(app,/onerror="this\.hidden=true;this\.nextElementSibling\.hidden=false"/,
 "Broken image must reveal fallback rather than leave a blank tile");
assert.match(app,/Fotografía temporalmente no disponible/);
assert.match(app,/efg-fit-photo-credit/);
assert.match(app,/rel="noopener noreferrer"/);
assert.match(app,/Ingredientes para '\+recipe\.portions\+' porciones/);
assert.match(app,/Valores orientativos calculados a partir del catálogo/);
assert.match(app,/data-fitrecipe/);
console.log("PRO07 accessible photo/fallback/grams/estimated-macro contract verified (not physical device).");

assert.ok(!app.includes("fitRecipeIllustration(recipe.id)"),"Do not render cartoons");

assert.equal(new Set(FIT_RECIPES.map(x=>x.id)).size,12);
for(const recipe of FIT_RECIPES){
 assert.ok(recipe.portions>0&&recipe.ingredients.length>=3&&recipe.steps.length>=3,recipe.id);
 for(const [id,grams] of recipe.ingredients){
  assert.ok(grams>0,recipe.id);
  assert.ok(catalog.includes('"'+id+'"')||app.includes('id:"'+id+'"'),"Food missing "+id);
 }
 const food=recipe.ingredients.map(([id])=>({id,k:1,p:.1,c:.1,f:.1,fi:.01}));
 const r=recipeTotals(recipe,food);
 assert.ok(r.perPortion.k>0&&r.totals.k>0);
 assert.equal(r.perPortion.k,r.totals.k/recipe.portions);
}
const edu=FIT_RECIPES.find(r=>r.id==="budin-edu");
assert.equal(edu.portions,10);
for(const [id,grams] of [["egg",250],["oats_raw",80],["apple",300],["banana",120],["raisins",60]])assert.ok(edu.ingredients.some(x=>x[0]===id&&x[1]===grams));
const whey=FIT_RECIPES.find(r=>r.id==="budin-whey");
assert.equal(whey.portions,5);
assert.ok(whey.ingredients.some(x=>x[0]==="whey_powder"&&x[1]===30));
assert.ok(!edu.ingredients.some(x=>x[0]==="whey_powder"));
for(const token of ['data-fitrecipe','registerFitRecipe','data-fitfilter','data-act="coachAlias"','data-act="refreshPayments"','data-copyalias','Comprobantes de mis alumnos','efg_submit_payment','efg_confirm_payment','createSignedUrl'])assert.ok(app.includes(token),"Missing "+token);
assert.ok(app.includes('if(state.tab==="payments")await loadOrgAndPayments()'));
assert.ok(css.includes(".efg-fit-grid")&&css.includes(".efg-payment-inbox"));
assert.ok(app.includes('const coachWorkspace=role==="coach"||(role==="admin"&&org?.is_test===true&&org?.coach_id===state.session.user.id)'),"Admin may manage only own test-coach workspace");
assert.ok(app.includes('const aliasPanel=coachWorkspace?'),"Alias editor must be visible to test coach");
assert.ok(app.includes('p.payment_kind==="student_coach"&&p.organization_id===org?.id'),"Coach inbox must be scoped to own organization");
assert.ok(app.includes('p.payer_id===state.session.user.id'),"Payment sender is payer_id, not sender_id");
assert.ok(!app.includes('p.sender_id'),"Legacy sender_id does not exist in payment schema");
assert.ok(app.includes('Comprobantes de licencias EFG'),"Admin billing must be preserved");
// Contratos comerciales y cuenta nutricional propia del entrenador.
for(const token of ["COBRAR A MIS ALUMNOS","PAGAR MI LICENCIA A EFG","Cupos contratados","ALTA COMERCIAL DE COACH","ALIAS OFICIAL DE EFG","data-copyplatform","state.platformAlias","studentMore:state.profile.role===\"coach\"?coachPersonalMoreView","function coachPersonalMoreView","personal:isPersonalProfessional","MI ESPACIO"])assert.ok(app.includes(token),"Missing coach personal/commercial UX: "+token);
assert.ok(app.includes('["coach","⌂","Inicio"]')&&app.includes('["home","◷","MI DÍA"]'),"Coach has direct MI DÍA access regardless of coach navigation order");
assert.ok(app.includes('["coachIntake","▣","Ingresos"]'),"Coach has a dedicated new arrivals tab");
assert.ok(app.includes('state.profile.role==="coach"||state.profile.role==="admin"'),"Professional personal goal eligibility");
assert.ok(app.includes('if(!["student","coach","admin"].includes(state.profile?.role))'),"Fit recipes register in professional private diary");
assert.ok(app.includes('commercialReady=isTest||["active","grace"].includes(org?.status)'),"Commercial invitation requires admin activation");
assert.ok(app.includes('efg_activate_paid_coach'),"Commercial coach activation requires approved payment and admin RPC");
const licenseMigration=readFileSync("efg-nutrition/migrations/20261029_coach_license_activates_invites.sql","utf8");
assert.match(licenseMigration,/efg_invite_student/);
assert.match(licenseMigration,/efg_set_student_active/);
assert.match(licenseMigration,/v_org.status not in \('active','grace'\)/);
assert.match(licenseMigration,/v_org.is_test/,"Admin's lab is exempt from commercial trial restriction");
assert.ok(!app.includes('EJEMPLO.ALIAS')&&!app.includes('efg-default-placeholder.invalid'),"Never assign a fictitious payment alias");
console.log("PASS: 12 Fit recipes, 12 credited real photographs, budins, macros and payment UI.");

// Execute the real payment view: pilot exemption must not hide student receipts.
const paymentViewSource=app.slice(app.indexOf('function paymentsView(){'),app.indexOf('// Retain open sections'));
const renderPayments=new Function('state','rootText','num','escapeHTML','paymentCard','today',paymentViewSource+';return paymentsView();');
const paymentState={profile:{role:'coach'},session:{user:{id:'coach-qa'}},org:{id:'org-qa',coach_id:'coach-qa',is_test:true,seat_limit:2},payments:[{id:'receipt-qa',recipient_id:'coach-qa',organization_id:'org-qa',payment_kind:'student_coach',status:'pending'}]};
const renderPaymentFixture=()=>renderPayments(paymentState,(a,b)=>a+b,String,String,p=>p.id,()=> '2026-11-04');
let paymentHTML=renderPaymentFixture();
assert.match(paymentHTML,/receipt-qa/,'Pilot coach can inspect student receipts');
assert.match(paymentHTML,/licencia piloto gratuita/);
assert.doesNotMatch(paymentHTML,/PAGAR MI LICENCIA A EFG|Mi contrato|data-act="sendProof"/,'Pilot coach must not be billed');
paymentState.org.is_test=false;
paymentHTML=renderPaymentFixture();
assert.match(paymentHTML,/PAGAR MI LICENCIA A EFG/,'Commercial flow remains available');
assert.match(paymentHTML,/receipt-qa/);
console.log('PASS: actual pilot/commercial payment views preserve separate receipt and license circuits.');

// UX-08-08 / 04-02: full recipe slots must NOT erase local recipes that
// could not migrate. Execute the real importer against a synthetic DB.
const recipeBegin=app.indexOf('async function loadCloudRecipes(){');
const recipeEnd=app.indexOf('async function createPersonalRecipe(){',recipeBegin);
assert.ok(recipeBegin>0&&recipeEnd>recipeBegin);
const recipeStore=new Map(),recipeKey='legacy-recipes:test-user';
const mkRecipe=(name,i)=>({name,ingredients:[{foodId:'egg',grams:10+i}],portions:1,totals:{k:20+i}});
const localSaved=[mkRecipe('Primera pendiente',1),mkRecipe('Segunda pendiente',2),{name:'Receta inválida recuperable',ingredients:[],portions:1,totals:{k:10}}];
recipeStore.set(recipeKey,JSON.stringify(localSaved));
const remoteRecipes=Array.from({length:29},(_,i)=>({...mkRecipe('Remota '+i,100+i),id:'remote-'+i}));
let recipeInserts=0;
const recipeSB={from(table){
 assert.equal(table,'efg_personal_recipes');
 return {
  select(){return this;},eq(){return this;},
  order(){return Promise.resolve({data:remoteRecipes.slice(),error:null});},
  insert(row){return {select(){return {single(){
   recipeInserts++;
   const saved={...row,id:'migrated-'+recipeInserts};
   remoteRecipes.push(saved);
   return Promise.resolve({data:saved,error:null});
  }}}};}
 };
}};
const localAPI={
 getItem:k=>recipeStore.has(k)?recipeStore.get(k):null,
 setItem:(k,v)=>recipeStore.set(k,v),
 removeItem:k=>recipeStore.delete(k)
};
const recipeRuntime=createAppHarness('sb','state','localStorage','recipeStoreKey',
 'let cloudRecipes=[];'+app.slice(recipeBegin,recipeEnd)+';return {loadCloudRecipes, getRecipes:()=>cloudRecipes};')(
 recipeSB,{profile:{role:'student'},session:{user:{id:'test-user'}}},localAPI,()=>recipeKey);
await recipeRuntime.loadCloudRecipes();
assert.equal(recipeInserts,1,'One remaining server slot imports only one recipe');
assert.equal(recipeRuntime.getRecipes().length,30);
assert.deepEqual(JSON.parse(recipeStore.get(recipeKey)).map(x=>x.name),
 ['Segunda pendiente','Receta inválida recuperable'],
 'Capacity limit cannot erase local backups for remaining recipes');
await recipeRuntime.loadCloudRecipes();
assert.equal(recipeInserts,1,'No duplicate import while cap remains full');
remoteRecipes.pop(); // Free a single slot in the synthetic DB.
await recipeRuntime.loadCloudRecipes();
assert.equal(recipeInserts,2,'Deferred valid recipe imports when capacity permits');
assert.deepEqual(JSON.parse(recipeStore.get(recipeKey)).map(x=>x.name),['Receta inválida recuperable'],
 'Invalid legacy data is preserved for explicit recovery rather than silently deleted');
console.log('PASS UX-08-08 personal recipes: partial import never discards remaining local backup (offline).');

// UX-08-08: a previous account's delayed SELECT or legacy import cannot
// replace the next account's recipes or delete recoverable local backups.
const recipeA='recipe-user-A',recipeB='recipe-user-B';
const oldRecipeKey='efg-nutrition-custom-recipes:'+recipeA;
const oldRecipeBackup=[{name:'Receta local A',ingredients:[{foodId:'egg',grams:80}],portions:1,totals:{k:100}}];
const switchRecipesState={profile:{role:'student'},session:{user:{id:recipeA}}};
const switchRecipesStore=new Map([[oldRecipeKey,JSON.stringify(oldRecipeBackup)]]);
const switchRecipeLocal={
 getItem:k=>switchRecipesStore.get(k)||null,
 setItem:(k,v)=>switchRecipesStore.set(k,v),
 removeItem:k=>switchRecipesStore.delete(k)
};
let resolveOldRecipeRead;
const switchRecipeSB={from(table){
 assert.equal(table,'efg_personal_recipes');
 let owner='';
 return {select(){return this;},eq(field,value){if(field==='student_id')owner=value;return this;},
  order(){
   if(owner===recipeA)return new Promise(resolve=>{resolveOldRecipeRead=resolve});
   return Promise.resolve({data:[{id:'B-1',name:'Receta propia B'}],error:null});
  },
  insert(){throw new Error('Stale recipe import attempted to write');}};
}};
const recipeCode=app.slice(recipeBegin,recipeEnd);
const createRecipeHarness=(adapter,owner,storage)=>createAppHarness('sb','state','localStorage','recipeStoreKey',
 'let cloudRecipes=[];'+recipeCode+
 ';return {loadCloudRecipes,visible:()=>state.cloudRecipesUserId===state.session?.user?.id?cloudRecipes:[]};')(
 adapter,owner,storage,()=> 'efg-nutrition-custom-recipes:'+owner.session?.user?.id);
const switchRecipes=createRecipeHarness(switchRecipeSB,switchRecipesState,switchRecipeLocal);
const firstRecipeFetch=switchRecipes.loadCloudRecipes();
switchRecipesState.session={user:{id:recipeB}};
await switchRecipes.loadCloudRecipes();
resolveOldRecipeRead({data:[{id:'A-1',name:'Receta propia A'}],error:null});
await firstRecipeFetch;
assert.deepEqual(switchRecipes.visible().map(x=>x.name),['Receta propia B']);
switchRecipesState.session={user:{id:recipeA}};
assert.deepEqual(switchRecipes.visible(),[],'Do not expose B recipes before A reads its own data');
assert.deepEqual(JSON.parse(switchRecipesStore.get(oldRecipeKey)),oldRecipeBackup,
 'Old A backup must survive stale read');

const insertRecipesState={profile:{role:'student'},session:{user:{id:recipeA}}};
const insertRecipesStore=new Map([[oldRecipeKey,JSON.stringify(oldRecipeBackup)]]);
let resolveOldRecipeInsert;
const insertRecipesSB={from(table){
 assert.equal(table,'efg_personal_recipes');
 let owner='',pending;
 return {select(){return this;},eq(field,value){if(field==='student_id')owner=value;return this;},
  order(){return Promise.resolve({data:owner===recipeB?
   [{id:'B-2',name:'Otra receta B'}]:[],error:null});},
  insert(value){pending=value;return this;},
  single(){assert.equal(pending.student_id,recipeA);
   return new Promise(resolve=>{resolveOldRecipeInsert=()=>resolve({data:{...pending,id:'import-A'},error:null});});}};
}};
const insertRecipes=createRecipeHarness(insertRecipesSB,insertRecipesState,{
 getItem:k=>insertRecipesStore.get(k)||null,
 setItem:(k,v)=>insertRecipesStore.set(k,v),
 removeItem:k=>insertRecipesStore.delete(k)
});
const oldRecipeImport=insertRecipes.loadCloudRecipes();
await Promise.resolve();
assert.equal(typeof resolveOldRecipeInsert,'function');
insertRecipesState.session={user:{id:recipeB}};
await insertRecipes.loadCloudRecipes();
resolveOldRecipeInsert();
await oldRecipeImport;
assert.deepEqual(insertRecipes.visible().map(x=>x.name),['Otra receta B']);
assert.ok(insertRecipesStore.has(oldRecipeKey),
 'An import committed before logout must not delete old-user backup after logout');
console.log('PASS UX-08-08: stale A/B recipe queries, import callbacks and local backups are isolated.');


// UX-08-08: The REAL recipe picker must surface legitimate local backups
// despite a full remote quota; malformed entries remain backed up, not shown.
// The account-specific backup may be registered without an extra cloud INSERT.
const visibleRecipeStart=app.indexOf('function myRecipes(){');
const visibleRecipeEnd=app.indexOf('async function loadCloudRecipes(){',visibleRecipeStart);
assert.ok(visibleRecipeStart>=0&&visibleRecipeEnd>visibleRecipeStart);
const visibleLegacyA='efg-nutrition-custom-recipes:pending-A';
const visibleLegacyB='efg-nutrition-custom-recipes:pending-B';
const visiblePendingRecipe={name:'Bowl local sin sincronizar',
 ingredients:[{foodId:'egg',grams:50}],portions:2,
 totals:{k:180,p:12,c:3,f:10,fi:0}};
const visibleRecipeRemote={id:'remote-0',name:'Remota 0',
 ingredients:[{foodId:'egg',grams:100}],portions:1,
 totals:{k:120,p:10,c:1,f:6,fi:0}};
const visibleRecipeStore=new Map([
 [visibleLegacyA,JSON.stringify([visiblePendingRecipe,
  {...visibleRecipeRemote,id:undefined},
  {name:'Irrecuperable automáticamente',ingredients:[],portions:1,totals:{k:0}}])],
 [visibleLegacyB,JSON.stringify([{...visiblePendingRecipe,name:'Receta solo de B'}])]
]);
const visibleRecipeLocal={
 getItem:k=>visibleRecipeStore.get(k)||null,
 setItem:(k,value)=>visibleRecipeStore.set(k,value),
 removeItem:k=>visibleRecipeStore.delete(k)
};
const visibleRecipeState={session:{user:{id:'pending-A'}},cloudRecipesUserId:'pending-A'};
const visibleRecipeKey=()=> 'efg-nutrition-custom-recipes:'+visibleRecipeState.session?.user?.id;
const visibleRecipeRemoteList=Array.from({length:30},(_,i)=>({
 ...visibleRecipeRemote,id:'remote-'+i,name:'Remota '+i}));
const visibleRecipeList=createAppHarness('state','cloudRecipes','localStorage','recipeStoreKey',
 app.slice(visibleRecipeStart,visibleRecipeEnd)+';return myRecipes;')(
 visibleRecipeState,visibleRecipeRemoteList,visibleRecipeLocal,visibleRecipeKey);
let displayedRecipes=visibleRecipeList();
assert.equal(displayedRecipes.length,31,'Full cloud quota cannot hide recoverable local recipe');
assert.equal(displayedRecipes[30].id,'local-recipe-0');
assert.equal(displayedRecipes[30].pendingLocal,true);
assert.equal(displayedRecipes.filter(r=>r.name==='Remota 0').length,1,'No duplicate imported recipe');
assert.match(app,/pendiente de sincronizar/,'Pending state must be explained in picker and cards');
visibleRecipeState.session={user:{id:'pending-B'}};
assert.deepEqual(visibleRecipeList().map(r=>r.name),['Receta solo de B'],
 'Local recipe from account A must not appear on account B');
visibleRecipeState.session={user:{id:'pending-A'}};

// Register the pending recipe using the actual confirmRecipeRegistration handler.
const visibleRegisterBegin=app.indexOf('async function confirmRecipeRegistration(){');
const visibleRegisterEnd=app.indexOf('function rootText(',visibleRegisterBegin);
assert.ok(visibleRegisterBegin>=0&&visibleRegisterEnd>visibleRegisterBegin);
const visibleMeal={meals:{almuerzo:[]},skipped:{}},visibleWriteSnapshots=[];
const visibleFields={efgRecipeRegisterId:'local-recipe-0',efgRecipeRegisterSlot:'almuerzo',efgRecipeRegisterQty:'1.5'};
const registerVisibleRecipe=createAppHarness('myRecipes','document','mealSlots','pendingMealRegistrations',
 'activeDiary','saveDiary','structuredClone','state','closeRecipeRegistration','notify','validateRecipeIngredientAccess',
 'let recipeRegistrationBusy=false;'+app.slice(visibleRegisterBegin,visibleRegisterEnd)+';return confirmRecipeRegistration;')(
 visibleRecipeList,{getElementById:id=>({value:visibleFields[id]})},
 [['almuerzo','Almuerzo']],new Set(),()=>visibleMeal,
 async()=>{visibleWriteSnapshots.push(structuredClone(visibleMeal));},structuredClone,
 {diary:visibleMeal},()=>{},()=>{},()=>{});
await registerVisibleRecipe();
assert.equal(visibleMeal.meals.almuerzo.length,1,'Pending recipe registers exactly one nutrition entry');
assert.equal(visibleMeal.meals.almuerzo[0].id,'custom-recipe');
assert.equal(visibleMeal.meals.almuerzo[0].k,135,'1.5 of 2 portions: 180 * 1.5 / 2 kcal');
assert.equal(visibleWriteSnapshots.length,1);
assert.equal(visibleRecipeStore.has(visibleLegacyA),true,'Registering must not delete unsynced backup');

// Delete only the explicitly chosen local backup; never issue a DB DELETE
// for an unsynced recipe and never alter a different account's backup.
const visibleDeleteBegin=app.indexOf('if(el.dataset.recipedelete){');
const visibleDeleteEnd=app.indexOf('if(el.dataset.act==="createPersonalRecipe")',visibleDeleteBegin);
assert.ok(visibleDeleteBegin>=0&&visibleDeleteEnd>visibleDeleteBegin);
const deleteVisibleRecipe=createAppHarness('state','myRecipes','recipeStoreKey','localStorage',
 'sb','confirm','notify','render','cloudRecipes',
 'return async function(el){'+app.slice(visibleDeleteBegin,visibleDeleteEnd)+'}')(
 visibleRecipeState,visibleRecipeList,visibleRecipeKey,visibleRecipeLocal,
 {from(){throw Error('Remote DELETE forbidden for local-only backup');}},
 ()=>true,()=>{},async()=>{},visibleRecipeRemoteList);
await deleteVisibleRecipe({dataset:{recipedelete:'local-recipe-0'}});
assert.deepEqual(JSON.parse(visibleRecipeStore.get(visibleLegacyA)).map(r=>r.name),
 ['Remota 0','Irrecuperable automáticamente'],
 'Only confirmed selection was removed; duplicate and malformed backups survive');
assert.ok(visibleRecipeStore.has(visibleLegacyB),'Other account backup must stay intact');
console.log('PASS UX-08-08: 30+1 pending recipes visible, registered once with macros and owner-safe deletion (offline).');


// UX-08-08 OFFLINE RECIPE RECOVERY: run the real recipe loader and picker;
// network errors cannot hide a valid account-owned local backup or cross
// contaminate the next signed-in account's cloud recipes.
const offlineRecipeBegin=app.indexOf('function recipeStoreKey(){');
const offlineRecipeEnd=app.indexOf('async function createPersonalRecipe(){',offlineRecipeBegin);
assert.ok(offlineRecipeBegin>0&&offlineRecipeEnd>offlineRecipeBegin);
const offlineRecipeSource=app.slice(offlineRecipeBegin,offlineRecipeEnd);
const offlineRecipeUser='recipe-offline-A',offlineRecipeOther='recipe-offline-B';
const offlineRecipeKey='efg-nutrition-custom-recipes:'+offlineRecipeUser;
const offlineRecipe={name:'Budín local sin sincronizar',
 ingredients:[{foodId:'egg',grams:80}],portions:2,
 totals:{k:200,p:15,c:8,f:10,fi:1}};
const offlineRecipeMap=new Map([[offlineRecipeKey,JSON.stringify([offlineRecipe])]]);
const offlineRecipeStorage={
 getItem:key=>offlineRecipeMap.get(key)||null,
 setItem:(key,value)=>offlineRecipeMap.set(key,value),
 removeItem:key=>offlineRecipeMap.delete(key)
};
const offlineRecipeState={profile:{role:'student'},session:{user:{id:offlineRecipeUser}}};
let failRecipeQuery=true,failRecipeImport=false,remoteRecipeReadCount=0;
const offlineRecipeDB={from(table){
 assert.equal(table,'efg_personal_recipes');
 return {select(){return this;},eq(){return this;},
  order(){
   remoteRecipeReadCount++;
   if(failRecipeQuery)return Promise.resolve({data:null,error:new Error('offline read')});
   return Promise.resolve({data:[],error:null});
  },
  insert(){return this;},
  single(){return Promise.resolve({data:null,error:failRecipeImport?new Error('offline insert'):null});}};
}};
const offlineRecipes=createAppHarness('sb','state','localStorage','console',
 offlineRecipeSource+';return {loadCloudRecipes,myRecipes};')(
 offlineRecipeDB,offlineRecipeState,offlineRecipeStorage,{warn(){}});
await offlineRecipes.loadCloudRecipes();
assert.deepEqual(offlineRecipes.myRecipes().map(x=>x.name),[offlineRecipe.name],
 'Offline SELECT must not hide local recipe');
assert.equal(offlineRecipes.myRecipes()[0].pendingLocal,true);
failRecipeQuery=false;failRecipeImport=true;
await offlineRecipes.loadCloudRecipes();
assert.equal(remoteRecipeReadCount,2);
assert.deepEqual(offlineRecipes.myRecipes().map(x=>x.name),[offlineRecipe.name],
 'Failed background INSERT preserves selectable recipe');
assert.deepEqual(JSON.parse(offlineRecipeMap.get(offlineRecipeKey)),[offlineRecipe],
 'Failed import must not delete local backup');
offlineRecipeState.session={user:{id:offlineRecipeOther}};
failRecipeQuery=true;
await offlineRecipes.loadCloudRecipes();
assert.deepEqual(offlineRecipes.myRecipes(),[],
 'Offline account B cannot see recipes belonging to A');
assert.deepEqual(JSON.parse(offlineRecipeMap.get(offlineRecipeKey)),[offlineRecipe],
 'Account switch leaves A backup intact');
console.log('PASS UX-08-08 offline recipe read/import and A/B account cache isolation.');


// UX-08-08: Supabase adapter can reject Promise instead of returning {error}.
{
 const uid='recipe-transport-rejected',key='efg-nutrition-custom-recipes:'+uid;
 const entry={name:'Receta sin subir',ingredients:[{foodId:'egg',grams:80}],
  portions:2,totals:{k:200,p:15,c:8,f:10,fi:1}};
 const store=new Map([[key,JSON.stringify([entry])]]);
 const local={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const st={profile:{role:'student'},session:{user:{id:uid}}};
 let failRead=true,attempts=0;
 const db={from(table){
  assert.equal(table,'efg_personal_recipes');
  return {select(){return this;},eq(){return this;},
   order(){return failRead?Promise.reject(new TypeError('Failed to fetch')):Promise.resolve({data:[],error:null});},
   insert(){return this;},single(){attempts++;return Promise.reject(new TypeError('NetworkError on insert'));}};
 }};
 const api=createAppHarness('sb','state','localStorage','console',
  offlineRecipeSource+';return {loadCloudRecipes,myRecipes};')(db,st,local,{warn(){}});
 await api.loadCloudRecipes();
 assert.deepEqual(api.myRecipes().map(x=>x.name),[entry.name]);
 assert.equal(attempts,0);
 failRead=false;
 await api.loadCloudRecipes();
 assert.equal(attempts,1,'Recovered SELECT retries local import');
 assert.deepEqual(api.myRecipes().map(x=>x.name),[entry.name]);
 assert.equal(store.get(key),JSON.stringify([entry]),'Rejected upload leaves local recipe intact');
 st.session={user:{id:'other-user'}};failRead=true;
 await api.loadCloudRecipes();
 assert.deepEqual(api.myRecipes(),[],'Account B cannot view offline A recipe');
 console.log('PASS UX-08-08: rejected SELECT/INSERT preserve offline recipe and user isolation.');
}


// UX-OFFLINE-NEW-RECIPE-01: execute the REAL createPersonalRecipe() flow
// against a rejecting transport, a 503 response, a successful retry, and RLS 403.
{
 const uid='student-new-recipe-offline',local=new Map(),messages=[];
 const storage={getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)};
 const st={profile:{role:'student'},session:{user:{id:uid}}};
 const cloud=[],queue=[];let failure='reject',inserts=0;
 const inputFood=[{id:'egg',name:'Huevo',k:1.5,p:0.12,c:0.01,f:0.1,fi:0}];
 const askRecipe=name=>queue.push(name,'huevo','1','100','','2');
 const db={from(table){
  assert.equal(table,'efg_personal_recipes');
  return {select(){return this;},eq(){return this;},
   order(){return Promise.resolve({data:structuredClone(cloud),error:null});},
   insert(value){this.value=value;return this;},
   single(){
    inserts++;
    if(failure==='reject')return Promise.reject(new TypeError('Failed to fetch'));
    if(failure==='returned')return Promise.resolve({data:null,error:{status:503,message:'Service unavailable'}});
    if(failure==='forbidden')return Promise.resolve({data:null,error:{status:403,code:'42501',message:'RLS denied'}});
    const row={...structuredClone(this.value),id:'remote-'+inserts,created_at:'2026-11-01T07:00:00Z'};
    cloud.push(row);return Promise.resolve({data:row,error:null});
   }};
 }};
 const recoveryBegin=app.indexOf('function recoverableOfflineWrite(');
 const recoveryEnd=app.indexOf('async function loadCloudHabituales(){',recoveryBegin);
 const createBegin=app.indexOf('function recipeStoreKey(){');
 const createEnd=app.indexOf('let recipeDialogReturnFocus=',createBegin);
 assert.ok(recoveryBegin>=0&&recoveryEnd>recoveryBegin&&createBegin>=0&&createEnd>createBegin);
 const runtime=createAppHarness('sb','state','localStorage','foods','prompt','notify','render','num','allowedFoods','FOOD_STATE_PAIRS',
  app.slice(recoveryBegin,recoveryEnd)+app.slice(createBegin,createEnd)+
  ';return {createPersonalRecipe,myRecipes,loadCloudRecipes};')(
  db,st,storage,inputFood,()=>queue.shift(),message=>messages.push(message),async()=>{},x=>String(x),()=>['egg'],{});
 askRecipe('Tortilla pendiente');await runtime.createPersonalRecipe();
 failure='returned';askRecipe('Panqueque pendiente');await runtime.createPersonalRecipe();
 const key='efg-nutrition-custom-recipes:'+uid;
 assert.deepEqual(JSON.parse(local.get(key)).map(x=>x.name),['Tortilla pendiente','Panqueque pendiente']);
 assert.equal(cloud.length,0);
 assert.equal(runtime.myRecipes().filter(r=>r.pendingLocal).length,2);
 assert.equal(messages.filter(m=>m.includes('pendiente de sincronizar')).length,2);
 failure='success';await runtime.loadCloudRecipes();await runtime.loadCloudRecipes();
 assert.equal(cloud.length,2,'Each offline recipe must be imported only once');
 assert.equal(runtime.myRecipes().length,2);
 assert.equal(local.has(key),false,'Verified import clears only corresponding recoverable backups');
 st.session={user:{id:'student-new-recipe-B'}};
 assert.deepEqual(runtime.myRecipes(),[],'Switching account cannot expose original recipes');
 st.session={user:{id:uid}};
 failure='forbidden';askRecipe('Receta denegada');
 await assert.rejects(runtime.createPersonalRecipe(),error=>error.code==='42501');
 assert.equal(local.has(key),false,'RLS 403 must not create a local recipe bypass');
 local.set(key,'{invalid-json');failure='reject';askRecipe('No sobrescribir');
 await assert.rejects(runtime.createPersonalRecipe(),/respaldo local/);
 assert.equal(local.get(key),'{invalid-json','Corrupt JSON must remain recoverable');
 assert.equal(messages.length,2,'Only real local saves report success');
 console.log('PASS UX-OFFLINE-NEW-RECIPE-01: offline creation, 503, retry import, account isolation, RLS denial and malformed JSON.');
}

// Reuse the established Premium QA job for the unified food/recipe picker.
await import('./recipes-shared-picker-contract.mjs');

// P30I: execute real receipt upload using the established secure UUID fallback.
const receiptFn=app.slice(app.indexOf('async function sendProof(){'),app.indexOf('async function onePaymentAction('));
const nonceFn=app.slice(app.indexOf('function createCoachPublicationRequestId('),app.indexOf('function coachPublicationFailureMessage('));
const receiptCalls=[];
const receiptState={profile:{role:'student'},session:{user:{id:'qa-student'}},org:{payment_alias:'QA - NO TRANSFERIR'}};
const receiptDOM={getElementById:id=>({payFile:{files:[{type:'image/png',size:100}]},payAmount:{value:'1'},payPeriod:{value:'2026-11'}}[id])};
const receiptSB={storage:{from:bucket=>({upload:async(path,file,opts)=>{receiptCalls.push({bucket,path,opts});return {error:null};}})},rpc:async(name,args)=>{receiptCalls.push({name,args});return {error:null};}};
const receiptRun=new Function('state','document','sb','window','loadOrgAndPayments','render','notify',nonceFn+receiptFn+';return sendProof();');
await receiptRun(receiptState,receiptDOM,receiptSB,{crypto:{getRandomValues:b=>{b.fill(11);return b;}}},async()=>{},async()=>{},()=>{});
assert.match(receiptCalls[0].path,/^qa-student\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/);
assert.equal(receiptCalls[0].bucket,'efg-receipts');
assert.equal(receiptCalls[0].opts.upsert,false);
assert.equal(receiptCalls[1].name,'efg_submit_payment');
assert.equal(receiptCalls[1].args.p_receipt_path,receiptCalls[0].path);
receiptCalls.length=0;
await assert.rejects(receiptRun(receiptState,receiptDOM,receiptSB,{crypto:{}},async()=>{},async()=>{},()=>{}),/identificador seguro/);
assert.equal(receiptCalls.length,0,'Without secure randomness fail before any storage or RPC write');
console.log('PASS P30I receipt secure UUID fallback and fail-closed before upload.');
