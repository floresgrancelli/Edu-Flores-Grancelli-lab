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
assert.ok(app.includes('["coach","⌂","Inicio"],["home","◷","MI DÍA"]'),"Coach has direct MI DÍA access");
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
