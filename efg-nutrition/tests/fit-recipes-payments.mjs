import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
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
const recipeRuntime=new Function('sb','state','localStorage','recipeStoreKey',
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
const createRecipeHarness=(adapter,owner,storage)=>new Function('sb','state','localStorage','recipeStoreKey',
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
