import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync("efg-nutrition/pilot/fit-recipes.js","utf8");
const artSource=readFileSync("efg-nutrition/pilot/fit-recipe-illustrations.js","utf8");
const {fitRecipeIllustration}=await import("data:text/javascript;base64,"+Buffer.from(artSource).toString("base64"));

const {FIT_RECIPES,recipeTotals}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const catalog=readFileSync("efg-nutrition/pilot/food-catalog.js","utf8");
const app=readFileSync("efg-nutrition/pilot/pilot.js","utf8");
const css=readFileSync("efg-nutrition/pilot/premium-system.css","utf8");
assert.equal(FIT_RECIPES.length,12);
const illustrations=FIT_RECIPES.map(r=>fitRecipeIllustration(r.id));
assert.equal(new Set(illustrations).size,12,"Each recipe needs a different finished-dish illustration");
for(const art of illustrations){
 assert.ok(art.startsWith('<svg')&&art.includes('viewBox="0 0 480 250"'),"Must use responsive SVG");
 assert.ok(art.includes("</svg>")&&!art.includes("<image"),"No external image dependency");
 assert.ok(!art.includes("undefined")&&!art.includes("[object Object]"),"Valid SVG markup");
}
assert.ok(app.includes("fitRecipeIllustration(recipe.id)"),"Cards must display finished-dish art");

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
console.log("PASS: 12 Fit recipes, two distinct budins, ingredient ids, per-portion math, coach alias, payment receipts and refresh.");
