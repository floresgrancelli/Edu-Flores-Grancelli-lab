import assert from 'node:assert/strict';
import {classifyFood,renderFoodCompatibility,FOOD_COMPATIBILITY_ENABLED} from '../pilot/food-compatibility.js';
const now=Date.parse('2026-10-29T00:00:00Z');
const evidence={foodId:'fixture',rule:'pattern:vegan',status:'reviewed',sourceUrl:'https://example.test/label',reviewedAt:'2026-10-01',expiresAt:'2026-11-01',completeIngredients:true,ingredientClasses:['plant']};
const food={id:'fixture',compatibilityEvidence:[evidence]};
const classify=(f,profile)=>classifyFood(f,profile,{now});
assert.equal(FOOD_COMPATIBILITY_ENABLED,false);
for(const k of [0,100,1000])assert.equal(classify({...food,k,f:100,c:900},{inPlan:true}).color,'neutral');
assert.equal(classify(food,{patternId:'vegan'}).color,'green');
assert.equal(classify({...food,compatibilityEvidence:[{...evidence,ingredientClasses:['dairy']}]},{patternId:'vegan'}).color,'red');
for(const patch of [{foodId:'other'},{expiresAt:'2026-10-01'},{reviewedAt:'2026-11-01'},{sourceUrl:''},{status:'draft'},{completeIngredients:false},{ingredientClasses:[]},{ingredientClasses:['unknown']}]){
 assert.equal(classify({...food,compatibilityEvidence:[{...evidence,...patch}]},{patternId:'vegan'}).color,'yellow');
}
for(const restriction of ['celiac','allergy:milk','diabetes','hypertension','cholesterol']){
 const result=classify(food,{patternId:'vegan',restrictions:[restriction],inPlan:true});
 assert.equal(result.color,'yellow');assert.equal(result.canRecord,true);assert.equal(result.inPlan,true);
}
assert.equal(classify({...food,compatibilityEvidence:[{...evidence,ingredientClasses:['dairy']}]},{patternId:'vegan',restrictions:['celiac']}).color,'red');
assert.equal(renderFoodCompatibility(classify(food,{})),'');
assert.match(renderFoodCompatibility(classify(food,{inPlan:true})),/Incluido en mi plan/);
assert.doesNotMatch(renderFoodCompatibility({color:'yellow',reasons:[{reason:'<script>x</script>'}]}),/<script>/);
assert.deepEqual(food.compatibilityEvidence,[evidence]);
console.log('PASS: neutral calories, evidence identity/expiry, precedence, no clinical green, independent plan badge, truthful recording');
