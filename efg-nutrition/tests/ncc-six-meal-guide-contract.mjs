// Pure synthetic behavioral contract. No patient records or hosted data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateGuidedDay,validateGuidedDay,guideTotals,guideDeviation} from '../pilot/guided-day.js';
import {FLEXIBLE_GUIDE_KIND,SIX_GUIDE_SLOTS,generateFlexibleGuidedDay,removeFlexibleMeal,
 removeFlexibleFood,addFlexibleFood,replaceFlexibleFood,guideFoodSignal} from '../pilot/guided-day-v2.js';
import {approvedFoodGuide} from '../pilot/coach-food-selection.js';
import {adjustNutritionGoal} from '../pilot/goal-adjustments.js';
import {recipeCatalogEntries} from '../pilot/recipe-catalog-bridge.js';
import {addCoachRecipeServing,recipeIngredientLimits} from '../pilot/coach-guide-recipe-serving.js';
import {validateCoachPlanProposal} from '../pilot/coach-plan-draft-client.js';
const nutrients={egg:[1.48,.124,.0096,.0996],egg_white:[.55,.107,.0236,0],
 bread:[2.47,.13,.41,.042],milk_skim:[.35,.034,.05,.001],
 banana:[.89,.011,.23,.003],yogurt:[.50,.042,.081,.0009],apple:[.52,.003,.138,.002],
 chicken:[1.65,.31,0,.036],brownrice:[1.23,.027,.256,.01],pumpkin:[.34,.01,.08,.001],
 oil:[8.84,0,0,1],cheese:[2.17,.27,.017,.12],mandarin:[.53,.008,.133,.003],
 fish_hake:[.82,.178,0,.007],potato:[.86,.0171,.2001,.001],rocket:[.25,.026,.037,.007],
 oats_raw:[3.89,.169,.663,.069],coffee_black:[.001,0,0,0],tofu_firm:[1.19,.12,.02,.07],
 tempeh:[2.15,.19,.09,.11],walnuts:[6.54,.15,.14,.65],rice:[1.29,.0267,.2799,.0028],
 chickpeas_cooked:[1.64,.09,.27,.026],zucchini:[.2,.012,.03,.001],
 avocado:[1.6,.02,.085,.147],strawberry:[.32,.007,.077,.003],
 broccoli_cooked:[.35,.024,.07,.004],lentils_cooked:[1.16,.09,.20,.004],
 peanut_butter:[5.8,.25,.20,.5],bread_glutenfree:[2.5,.04,.46,.06],milk_lactosefree:[.4,.034,.05,.001]
};
const catalog=Object.entries(nutrients).map(([id,[k,p,c,f]])=>({id,name:id,unit:id.startsWith('milk')?'ml':'g',k,p,c,f,fi:0}));
const goal={goal_type:'recomp',kcal:2250,protein_g:155,carb_g:250,fat_g:70,fiber_g:24};
const bySlot=plan=>plan.meals.map(m=>m.slot);
const ids=plan=>plan.meals.flatMap(m=>m.items.map(x=>x.id));
const total=plan=>guideTotals(plan).totals;
const classic=generateGuidedDay(catalog,goal);
assert.equal(classic.kind,'five_meal_example');
assert.equal(classic.meals.length,5,'Legacy approved guides must remain readable');
assert.doesNotThrow(()=>validateGuidedDay(classic,goal));
const initial=generateFlexibleGuidedDay(catalog,goal);
const healthSource={studentId:'11111111-1111-4111-8111-111111111111',organizationId:'22222222-2222-4222-8222-222222222222',revision:4,status:'none_declared'};
const bound=generateFlexibleGuidedDay(catalog,goal,{restrictionSource:healthSource});
healthSource.revision=5;
assert.equal(bound.restrictionSource.revision,4,'Generation captures source; later scope change cannot rebind it');
assert.deepEqual(removeFlexibleMeal(bound,'media_tarde',goal).restrictionSource,bound.restrictionSource);
assert.deepEqual(replaceFlexibleFood(bound,'almuerzo',0,{id:'tofu_firm',qty:180},catalog,goal).restrictionSource,bound.restrictionSource);
assert.deepEqual(validateCoachPlanProposal(goal,bound).guide.restrictionSource,bound.restrictionSource,'Source survives serialization to draft');
assert.throws(()=>generateFlexibleGuidedDay(catalog,goal,{restrictionSource:{...healthSource,revision:0}}),/revisión/);
assert.equal(initial.kind,FLEXIBLE_GUIDE_KIND);
assert.equal(initial.version,2);
assert.deepEqual(bySlot(initial),SIX_GUIDE_SLOTS.map(x=>x[0]));
assert.equal(initial.meals.length,6);
assert.ok(initial.meals.every(m=>m.items.length>=1));
assert.ok(initial.meals.every(m=>m.items.every(i=>i.qty>0&&i.qty<=400)));
assert.equal(validateGuidedDay(initial,goal).totals.k,total(initial).k);
assert.ok(Math.abs(guideDeviation(initial,goal).k.percent)<45);
const old=structuredClone(initial),withoutSnack=removeFlexibleMeal(initial,'media_tarde',goal);
assert.equal(withoutSnack.meals.length,5);
assert.ok(!bySlot(withoutSnack).includes('media_tarde'));
assert.deepEqual(initial,old,'Removing a guide meal never mutates the source or the six-slot diary');
assert.equal(guideDeviation(withoutSnack,goal).k.target,2250,'Target must remain unchanged after removing a slot');
const withoutMorning=removeFlexibleMeal(withoutSnack,'media_manana',goal);
assert.equal(withoutMorning.meals.length,4);
assert.equal(validateGuidedDay(withoutMorning,goal).totals.k,total(withoutMorning).k);
const twice=removeFlexibleMeal(removeFlexibleMeal(withoutMorning,'merienda',goal),'almuerzo',goal);
assert.equal(twice.meals.length,2);
assert.throws(()=>removeFlexibleMeal(twice,'desayuno',goal),/al menos dos/);
const toChange=initial.meals[2].items[0];
const replaced=replaceFlexibleFood(initial,'almuerzo',0,{id:'tofu_firm',qty:190},catalog,goal);
assert.equal(replaced.meals[2].items[0].id,'tofu_firm');
assert.equal(replaced.meals[2].items[0].qty,190);
assert.equal(replaced.meals[2].items[0].locked,true);
// The coach may replace a food with ANY catalogue food, not only the
// contextual swap suggestions. This does not restrict the student's catalog.
const anywhere=replaceFlexibleFood(initial,'almuerzo',0,{id:'peanut_butter',qty:30},catalog,goal);
assert.equal(anywhere.meals.find(m=>m.slot==='almuerzo').items[0].id,'peanut_butter');
assert.equal(anywhere.meals.find(m=>m.slot==='almuerzo').items[0].qty,30);
assert.equal(anywhere.meals.find(m=>m.slot==='almuerzo').items[0].locked,true);
assert.equal(initial.meals.find(m=>m.slot==='almuerzo').items[0].id,toChange.id);
assert.doesNotThrow(()=>validateGuidedDay(anywhere,goal));
const removed=removeFlexibleFood(replaced,'almuerzo',0,goal);
assert.equal(removed.meals[2].items.some(i=>i.id==='tofu_firm'),false,'Removed food never reappears on automatic rebalance');
assert.equal(initial.meals[2].items[0].id,toChange.id);
const added=addFlexibleFood(removed,'almuerzo',{id:'tofu_firm',qty:170},catalog,goal);
assert.equal(added.meals[2].items.at(-1).id,'tofu_firm');
assert.equal(added.meals[2].items.at(-1).qty,170);
assert.throws(()=>addFlexibleFood(added,'almuerzo',{id:'tofu_firm'},catalog,goal),/duplicad|ya existe/);
assert.throws(()=>removeFlexibleFood(initial,'cena',999,goal));
const celiac=generateFlexibleGuidedDay(catalog,goal,{restrictions:['celiac']});
assert.equal(celiac.meals.length,6);
assert.ok(!ids(celiac).includes('bread'));
assert.ok(!ids(celiac).includes('oats_raw'));
assert.ok(!ids(celiac).includes('bread_glutenfree'),'Do not auto-certify a generic GF product');
const lactose=generateFlexibleGuidedDay(catalog,goal,{restrictions:['lactose_intolerance']});
assert.ok(!ids(lactose).some(id=>['cheese','milk_skim','yogurt'].includes(id)));
const vegan=generateFlexibleGuidedDay(catalog,goal,{patternId:'vegan'});
assert.ok(ids(vegan).some(id=>['tofu_firm','tempeh','chickpeas_cooked'].includes(id)));
assert.ok(!ids(vegan).some(id=>['egg','chicken','fish_hake','yogurt','cheese','milk_skim'].includes(id)));
// A dietary pattern must continue working while independent health processing
// consent is absent. Every choice remains amber for Coach review, not "safe".
const unknownVegan=generateFlexibleGuidedDay(catalog,goal,{patternId:'vegan',restrictionStatus:'unknown'});
assert.equal(unknownVegan.meals.length,6,'Unknown health status must not prevent a general vegan Coach draft');
assert.ok(!ids(unknownVegan).some(id=>['egg','chicken','fish_hake','yogurt','cheese','milk_skim'].includes(id)),
 'Unknown health status must not retain animal foods prohibited by the chosen vegan pattern');
assert.ok(ids(unknownVegan).some(id=>['tofu_firm','tempeh','chickpeas_cooked'].includes(id)));
assert.ok(unknownVegan.profileReviewNotes.some(x=>x.includes('Restricciones sin verificar')),
 'The draft must disclose unverified medical compatibility without claiming safety');
const keto=generateFlexibleGuidedDay(catalog,goal,{patternId:'keto'});
assert.equal(keto.meals.length,6,'Keto alone is not fasting');
assert.ok(keto.profileReviewNotes.some(x=>x.includes('keto')),'Coach warned about carb target');
const fast=generateFlexibleGuidedDay(catalog,goal,{patternId:'balanced',windowId:'16_8'});
assert.deepEqual(bySlot(fast),['almuerzo','media_tarde','merienda','cena']);
const food={id:'bread',name:'Pan integral'};
assert.equal(guideFoodSignal(food,{restrictions:['celiac']}).status,'avoid');
assert.equal(guideFoodSignal({id:'bread_glutenfree',name:'Pan sin gluten'},{restrictions:['celiac']}).status,'review');
assert.equal(guideFoodSignal({id:'cheese',name:'Port Salut convencional'},{restrictions:['lactose_intolerance']}).status,'avoid');
assert.throws(()=>generateFlexibleGuidedDay(catalog,goal,{restrictions:['food_allergy']}),/alérgeno/);
assert.equal(guideFoodSignal({id:'banana'},{restrictions:[]}).status,'possible');
const references=approvedFoodGuide(initial,null,{knownIds:catalog.map(x=>x.id)});
const allIds=[...new Set(ids(initial))].sort();
assert.deepEqual(references.approvedFoodIds,allIds);
// P23: a complete 537-food/recipe picker may include noncanonical preview IDs.
// Only SELECTED ingredients need canonical, server-publishable identifiers;
// never use the whole catalog as a whitelist or a reason to block every guide.
const fullPickerIds=[...catalog.map(x=>x.id),'fit-recipe:pancakes','custom-recipe:fictional'];
assert.deepEqual(approvedFoodGuide(initial,null,{knownIds:fullPickerIds}).approvedFoodIds,allIds);
const pseudoSelected=structuredClone(initial);
pseudoSelected.meals[0].items[0].id='fit-recipe:pancakes';
assert.throws(()=>approvedFoodGuide(pseudoSelected,null,{knownIds:fullPickerIds}),
 /inexistente o inválido/,'Recipe preview IDs cannot be published as unexpanded ingredients');
assert.throws(()=>approvedFoodGuide(initial,null,{knownIds:[...fullPickerIds,null]}),
 /catálogo no tiene identificadores válidos/);
assert.throws(()=>approvedFoodGuide(initial,['egg'],{knownIds:catalog.map(x=>x.id)}));
assert.deepEqual(initial.approvedFoodIds,undefined);
assert.equal(validateCoachPlanProposal(goal,initial).guide.kind,FLEXIBLE_GUIDE_KIND);
assert.equal(validateCoachPlanProposal(goal,withoutSnack).guide.meals.length,5);
// GU-06: one Fit recipe portion -> canonical ingredient weights, without a
// synthetic recipe food, duplicate egg or clamping banana/oats to large minima.
const selectedRecipe=recipeCatalogEntries({foods:catalog,fitRecipes:[
 {id:'pancakes',name:'Panqueques de banana y avena',portions:2,
  ingredients:[['egg',100],['banana',100],['oats_raw',30]]}
]})[0];
// One-step replacement with a Fit recipe removes the selected original
// ingredient first, then expands the recipe into real foods. If an ingredient
// overlaps the replaced food it must NOT be counted twice.
const recipeSwap=addCoachRecipeServing(initial,'desayuno',selectedRecipe,1,catalog,goal,{replaceIndex:0});
const swappedBreakfast=recipeSwap.meals.find(x=>x.slot==='desayuno');
const eggFromRecipe=swappedBreakfast.items.find(x=>x.id==='egg');
assert.equal(eggFromRecipe?.qty,50,'One recipe serving contributes 50 g egg, not old egg + 50 g');
assert.equal(eggFromRecipe?.locked,true);
assert.equal(swappedBreakfast.items.find(x=>x.id==='banana')?.qty,50);
assert.equal(swappedBreakfast.items.find(x=>x.id==='oats_raw')?.qty,15);
assert.equal(swappedBreakfast.items.filter(x=>x.id==='egg').length,1);
assert.deepEqual(initial,old,'Replacing a guide food must not mutate the source draft');
assert.doesNotThrow(()=>validateGuidedDay(recipeSwap,goal));
for(const index of [-1,999,0.5]){
 assert.throws(()=>addCoachRecipeServing(initial,'desayuno',selectedRecipe,1,catalog,goal,
  {replaceIndex:index}),/reemplazar/);
}
const cooked=addCoachRecipeServing(initial,'desayuno',selectedRecipe,1,catalog,goal);
const breakfast=cooked.meals.find(x=>x.slot==='desayuno');
const originalBreakfast=initial.meals.find(x=>x.slot==='desayuno');
assert.equal(breakfast.items.filter(x=>x.id==='egg').length,1,'Shared egg ingredient merges once');
assert.equal(breakfast.items.find(x=>x.id==='egg').qty,originalBreakfast.items.find(x=>x.id==='egg').qty+50);
assert.equal(breakfast.items.find(x=>x.id==='banana').qty,50,'50 g banana not enlarged to generic 80 g lower bound');
assert.equal(breakfast.items.find(x=>x.id==='oats_raw').qty,15);
assert.equal(breakfast.items.find(x=>x.id==='banana').locked,true);
assert.deepEqual(recipeIngredientLimits(breakfast.items.find(x=>x.id==='banana')),[0.01,1000]);
assert.ok(breakfast.items.every(x=>!x.id.startsWith('fit-recipe:')));
assert.doesNotThrow(()=>validateGuidedDay(cooked,goal));
assert.equal(new Set(breakfast.items.map(x=>x.id)).size,breakfast.items.length);
assert.deepEqual(initial,old,'Recipe edits must not alter the previous draft');
assert.throws(()=>addCoachRecipeServing(initial,'desayuno',selectedRecipe,0,catalog,goal),/media y cuatro/);
assert.throws(()=>addCoachRecipeServing(initial,'desayuno',{
 ...selectedRecipe,recipeIngredients:[{foodId:'not_in_catalog',grams:100}]},1,catalog,goal),/desconocido/);
assert.throws(()=>addCoachRecipeServing(initial,'desayuno',{
 ...selectedRecipe,id:'custom-recipe:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',privateRecipe:true,
 ownerStudentId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},1,catalog,goal),/lectura firmada/);
assert.equal(validateCoachPlanProposal(goal,cooked).guide.kind,FLEXIBLE_GUIDE_KIND);
assert.throws(()=>validateCoachPlanProposal(goal,{...initial,meals:initial.meals.slice(0,1)}));
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
for(const key of [
 'generateFlexibleGuidedDay(foods,goal','removeFlexibleMeal(draft','removeFlexibleFood(draft',
 'addFlexibleFood(draft','data-guideremovemeal','data-guideremovefood','data-guideaddfood',
 'data-guidefoodsearch','data-guidereplaceindex','function currentCoachGuideProfile()',
 'efg_get_coach_health_intake','guide.kind==="flexible_meal_guide"?null:coachFoodChoicesFromDom(root)'
])assert.ok(app.includes(key),'Missing real Coach UX connection: '+key);
assert.match(app,/return foods\.concat\(recipeCatalogEntries\(/,
 'One full food and recipe catalog must serve every Coach add/replace action');
assert.match(app,/replaceFlexibleFood\(draft,slot,replaceIndex/,
 'The same full-catalog picker must allow one-step replacement');
assert.match(app,/addCoachRecipeServing\(draft,slot,food,Number\(input\?\.value\|\|1\),foods,goal,[\s\S]*?\.\.\.auth,replaceIndex/,
 'Replacing food with a recipe must go through canonical ingredients, not a fake ID');
const sql=readFileSync(new URL('../docs/COACH119_HOSTED_ATOMIC_RELEASE_CANDIDATE_NOT_APPLIED.sql',import.meta.url),'utf8');
const sourceSql=readFileSync(new URL('../migrations/20261030_coach_reviewed_guide_nutrition_source.sql',import.meta.url),'utf8');
for(const text of ["v_guide->>'kind'='flexible_meal_guide'","jsonb_array_length(v_guide->'meals') between 2 and 6"])
 assert.ok(sql.includes(text),'Staged atomic publication missing '+text);
for(const text of ["p_guide->>'kind'='flexible_meal_guide'","'media_tarde'","v_count>90"])
 assert.ok(sourceSql.includes(text),'Staged source verification missing '+text);
// A normal Coach guide must not demand a separate health schema when clinical
// modules are intentionally OFF. The general signed intake remains mandatory.
assert.doesNotMatch(app,/if\(COACH_ATOMIC_PLAN_UI_ENABLED\)throw Error\("No se confirmó la declaración sanitaria/);
assert.doesNotMatch(app,/!state\.coachGuideHealth\?\.consentVerified\|\|/);
assert.match(app,/intake\?\.completed_version!==COACH_RELEASE_INTAKE_VERSION/);
assert.match(app,/required\.some\(k=>intake\[k\]===null/);
assert.match(app,/Unknown medical status is never interpreted/);
assert.match(app,/COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED/);
const publishedGoal={goal_type:'recomp',kcal:2500,protein_g:160,carb_g:300,fat_g:80,fiber_g:35};
const revisedGoal=adjustNutritionGoal(publishedGoal,2100,'protect_protein');
assert.equal(revisedGoal.kcal,2100);
assert.equal(revisedGoal.protein_g,160,'Coach may protect protein when dropping calories');
const revisedPlan=generateFlexibleGuidedDay(catalog,revisedGoal,{patternId:'balanced',restrictionStatus:'unknown'});
assert.equal(revisedPlan.meals.length,6);
assert.ok(revisedPlan.profileReviewNotes.some(x=>x.includes('Restricciones sin verificar')));
assert.deepEqual(publishedGoal,{goal_type:'recomp',kcal:2500,protein_g:160,carb_g:300,fat_g:80,fiber_g:35},
 'Drafting the two-month update must not mutate the previous goal');
const sameCalorieGoal=adjustNutritionGoal(publishedGoal,2500,'protect_protein');
assert.equal(sameCalorieGoal.kcal,2500,'Food-only reviews are allowed when calories stay unchanged');
const revisionUI=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
assert.match(revisionUI,/data-periodic-plan-review/);
assert.match(revisionUI,/data-periodic-new-guide/);
assert.match(revisionUI,/Generar nueva Dieta Guía · borrador/);
assert.match(revisionUI,/el ALUMNO debe actualizar su declaración privada/);
assert.match(revisionUI,/goal.kcal===Number\(latest.kcal\)&&!COACH_ATOMIC_PLAN_UI_ENABLED/);

// Product invariant: automatic proposal -> coach reviews/edits -> explicitly approves.
assert.ok(app.includes('state.coachGuidedDraft=generateFlexibleGuidedDay(foods,goal,{'),
 'Current authorized intake and goals create an automatic six-slot Coach draft');
const generation=app.slice(app.indexOf('if(action==="makeGuidedDay"){'),
 app.indexOf('if(action==="removeGuidedMeal"){'));
assert.ok(generation.includes('showGuidedEditor();notify('),
 'Automatic draft is visible for Coach to approve as-is or change');
assert.ok(!generation.includes('coachDraftClient.publish('),
 'Generating is never an automatic publication');
const publication=app.slice(app.indexOf('async function publishCoachAtomicDraft(){'),
 app.indexOf('function activeCoachGuideGoal(){'));
assert.ok(publication.includes('if(!window.confirm("¿Aprobar y publicar juntos el objetivo y la guía?'),
 'Atomic publication must require an explicit Coach confirmation');
assert.ok(publication.includes('coachDraftClient.publish({studentId,expectedRevision:draft.draft_revision,')&&
 publication.includes('requestId:state.coachPlanPublishRequestId,confirmed:true'),
 'Server publication requires Coach confirmation and idempotent request');
assert.equal(initial.meals.length,6,'Automatic default offers six slots before editing');

console.log('PASS NCC six-meal guide and periodic review: 2500→2100 goal + six meals, same-calorie new guide, prior goal untouched, verified-profile warning, publish remains Coach atomic-only.');
