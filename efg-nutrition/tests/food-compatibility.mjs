import assert from 'node:assert/strict';
import {classifyFood,renderFoodCompatibility,FOOD_COMPATIBILITY_ENABLED} from '../pilot/food-compatibility.js';
const now=Date.parse('2026-10-29T00:00:00Z');
const evidence={foodId:'fixture',rule:'pattern:vegan',status:'reviewed',
 catalogReviewId:'review_fixture_001',catalogVersion:'2026.10.reviewed',sourceKind:'manufacturer_label',
 sourceUrl:'https://example.test/label',reviewedAt:'2026-10-01',expiresAt:'2026-11-01',
 completeIngredients:true,ingredientClasses:['plant']};
const food={id:'fixture'};
const classify=(f,profile,catalogEvidence=[])=>classifyFood(f,profile,{now,catalogEvidence});
// Food/diary objects are user-editable: fake embedded "reviewed" evidence cannot make green.
assert.equal(classify({...food,compatibilityEvidence:[evidence]},{patternId:'vegan'}).color,'yellow');
assert.equal(classify(food,{patternId:'vegan'},[evidence]).color,'green');
// Even a typed catalog review cannot imply clinical/allergy/gluten compatibility.
assert.equal(classify(food,{patternId:'vegan',restrictions:['celiac']},[evidence]).color,'yellow');
assert.equal(FOOD_COMPATIBILITY_ENABLED,false);
for(const k of [0,100,1000])assert.equal(classify({...food,k,f:100,c:900},{inPlan:true}).color,'neutral');
assert.equal(classify(food,{patternId:'vegan'},[evidence]).color,'green');
assert.equal(classify(food,{patternId:'vegan'},[{...evidence,ingredientClasses:['dairy']}]).color,'red');
for(const patch of [{foodId:'other'},{expiresAt:'2026-10-01'},{reviewedAt:'2026-11-01'},{sourceUrl:''},{status:'draft'},{catalogReviewId:null},{catalogVersion:''},{sourceKind:'unverified'},{completeIngredients:false},{ingredientClasses:[]},{ingredientClasses:['unknown']}]){
 assert.equal(classify(food,{patternId:'vegan'},[{...evidence,...patch}]).color,'yellow');
}
for(const restriction of ['celiac','allergy:milk','diabetes','hypertension','cholesterol']){
 const result=classify(food,{patternId:'vegan',restrictions:[restriction],inPlan:true});
 assert.equal(result.color,'yellow');assert.equal(result.canRecord,true);assert.equal(result.inPlan,true);
}
assert.equal(classify(food,{patternId:'vegan',restrictions:['celiac']},[{...evidence,ingredientClasses:['dairy']}]).color,'red');
assert.equal(renderFoodCompatibility(classify(food,{})),'');
assert.match(renderFoodCompatibility(classify(food,{inPlan:true})),/Incluido en mi plan/);
assert.doesNotMatch(renderFoodCompatibility({color:'yellow',reasons:[{reason:'<script>x</script>'}]}),/<script>/);
assert.match(renderFoodCompatibility(classify(food,{patternId:'vegan'},[evidence])),/Fuente 1/);
assert.match(renderFoodCompatibility(classify(food,{patternId:'vegan'},[evidence])),/rel="noopener noreferrer"/);
const unsafeUrl='https://example.test/"><script>alert(1)</script>';
const safeHtml=renderFoodCompatibility({color:'yellow',reasons:[{reason:'Revisar',sources:[unsafeUrl,'javascript:alert(1)']}]});
assert.doesNotMatch(safeHtml,/<script>/);
assert.doesNotMatch(safeHtml,/href="javascript:/);
assert.match(safeHtml,/&lt;script&gt;/);

assert.deepEqual(food,{id:'fixture'},'Classifier must not mutate food/diary input');
assert.equal(classify(food,{patternId:'vegan',restrictions:['pattern:vegan']},[evidence]).reasons.length,1,'No duplicate pattern restrictions');
assert.equal(classify(food,{patternId:'vegan'},[{...evidence,catalogReviewId:null}]).color,'yellow');
assert.equal(classify(food,{patternId:'vegan'},[{...evidence,catalogVersion:''}]).color,'yellow');
assert.equal(classify(food,{patternId:'vegan'},[{...evidence,sourceKind:'unverified'}]).color,'yellow');
assert.equal(classify(null,{patternId:'vegan'},[evidence]).color,'yellow');
assert.throws(()=>classify(food,{patternId:'vegan',restrictions:[null]}),/inválido/);
assert.throws(()=>classifyFood(food,{patternId:'vegan'},{now,catalogEvidence:null}),/inválido/);
console.log('PASS: neutral calories, evidence identity/expiry, precedence, no clinical green, independent plan badge, truthful recording');
