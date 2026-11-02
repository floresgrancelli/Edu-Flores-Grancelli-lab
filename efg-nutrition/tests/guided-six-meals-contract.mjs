import assert from 'node:assert/strict';
import {generateFlexibleGuidedDay,removeFlexibleMeal,removeFlexibleFood,
 addFlexibleFood,replaceFlexibleFood,guideFoodSignal,SIX_GUIDE_SLOTS} from '../pilot/guided-day-v2.js';
import {guideTotals,guideDeviation,validateGuidedDay,rebalanceGuidedDay,GUIDE_MEALS} from '../pilot/guided-day.js';
import {approvedFoodGuide} from '../pilot/coach-food-selection.js';
import {validateCoachPlanProposal} from '../pilot/coach-plan-draft-client.js';
import {readFileSync} from 'node:fs';

const data={
 egg:[1.48,.124,.0096,.0996],egg_white:[.55,.107,.0236,0],
 bread:[2.47,.13,.41,.042],bread_white:[2.65,.09,.49,.032],
 milk_skim:[.35,.034,.05,.001],milk_lactosefree:[.39,.034,.05,.001],
 yogurt:[.50,.042,.081,.0009],yogurt_greek_light:[.58,.1,.04,.004],
 apple:[.52,.003,.138,.002],banana:[.89,.011,.23,.003],
 mandarin:[.53,.008,.133,.003],pear:[.57,.004,.152,.001],
 chicken:[1.65,.31,0,.036],brownrice:[1.23,.027,.256,.01],
 rice:[1.29,.027,.28,.0028],pumpkin:[.34,.01,.08,.001],
 oil:[8.84,0,0,1],cheese:[2.17,.27,.017,.12],
 fish_hake:[.82,.178,0,.007],potato:[.86,.0171,.2001,.001],
 rocket:[.25,.026,.037,.007],walnuts:[6.54,.152,.137,.652],
 tofu_firm:[1.19,.12,.02,.07],tempeh:[2.15,.19,.09,.11],
 chickpeas_cooked:[1.64,.089,.274,.026],lentils_cooked:[1.16,.09,.2,.004],
 bread_glutenfree:[2.8,.07,.5,.04],avocado:[1.6,.02,.085,.15],
 strawberry:[.32,.007,.077,.003],zucchini:[.17,.012,.031,.003],
 broccoli_cooked:[.35,.024,.072,.004],spinach_cooked:[.23,.03,.036,.004]
};
data.oats_raw=[3.89,.169,.663,.069];data.coffee_black=[.001,0,0,0];
const catalog=Object.entries(data).map(([id,[k,p,c,f]])=>({
 id,name:id,category:id==='cheese'?'dairy':'general',
 unit:id==='milk_skim'||id==='milk_lactosefree'?'ml':'g',k,p,c,f,fi:0
}));
const goal={goal_type:'recomp',kcal:2250,protein_g:155,carb_g:250,fat_g:70,fiber_g:28};
const basic=generateFlexibleGuidedDay(catalog,goal);
assert.deepEqual(basic.meals.map(x=>x.slot),SIX_GUIDE_SLOTS.map(x=>x[0]));
assert.equal(basic.kind,'flexible_meal_guide');assert.equal(basic.version,2);
assert.equal(basic.meals.length,6);
assert.equal(GUIDE_MEALS.length,5,'Historical model remains available');
assert.ok(guideTotals(basic).totals.k>0);
assert.doesNotThrow(()=>validateGuidedDay(basic,goal));
const mealBefore=structuredClone(basic);
const reduced=removeFlexibleMeal(basic,'media_tarde',goal);
assert.equal(reduced.meals.length,5);
assert.ok(!reduced.meals.some(x=>x.slot==='media_tarde'));
assert.deepEqual(basic,mealBefore,'Editor must not mutate an existing guide');
assert.ok(Number.isFinite(guideDeviation(reduced,goal).k.actual));
assert.doesNotThrow(()=>validateGuidedDay(reduced,goal));
const reducedAgain=removeFlexibleMeal(reduced,'merienda',goal);
assert.equal(reducedAgain.meals.length,4);
assert.doesNotThrow(()=>validateGuidedDay(reducedAgain,goal));
assert.throws(()=>removeFlexibleMeal(reducedAgain,'invalid',goal));
const target=reducedAgain.meals[0],last=target.items.length-1;
const withoutFood=removeFlexibleFood(reducedAgain,target.slot,last,goal);
assert.equal(withoutFood.meals[0].items.length,target.items.length-1);
assert.ok(!withoutFood.meals[0].items.some(x=>x.id===target.items[last].id));
const available=catalog.find(x=>!withoutFood.meals[0].items.some(y=>y.id===x.id));
const added=addFlexibleFood(withoutFood,target.slot,{id:available.id},catalog,goal);
assert.ok(added.meals[0].items.some(x=>x.id===available.id));
const swapCandidate=catalog.find(x=>!added.meals[0].items.some(y=>y.id===x.id));
const changed=replaceFlexibleFood(added,target.slot,0,{id:swapCandidate.id},catalog,goal);
assert.equal(changed.meals[0].items[0].id,swapCandidate.id);
assert.equal(changed.meals[0].items[0].locked,true);
assert.doesNotThrow(()=>validateGuidedDay(changed,goal));
const guideApproved=approvedFoodGuide(reduced,null,{knownIds:catalog.map(x=>x.id)});
assert.deepEqual(guideApproved.approvedFoodIds,
 [...new Set(reduced.meals.flatMap(m=>m.items.map(x=>x.id)))].sort());
const proposal=validateCoachPlanProposal(goal,guideApproved);
assert.equal(proposal.guide.meals.length,5);
assert.throws(()=>approvedFoodGuide(reduced,['egg'],{knownIds:catalog.map(x=>x.id)}),
 'v2 must never accept a partial or unrelated reference whitelist');

const celiac=generateFlexibleGuidedDay(catalog,goal,{restrictions:['celiac']});
assert.ok(!celiac.meals.flatMap(x=>x.items).some(x=>['bread','bread_white'].includes(x.id)));
assert.equal(guideFoodSignal(catalog.find(x=>x.id==='bread'),{restrictions:['celiac']}).status,'avoid');
const lactose=generateFlexibleGuidedDay(catalog,goal,{restrictions:['lactose_intolerance']});
assert.ok(!lactose.meals.flatMap(x=>x.items).some(x=>['cheese','milk_skim','yogurt'].includes(x.id)));
const vegan=generateFlexibleGuidedDay(catalog,goal,{patternId:'vegan'});
assert.ok(!vegan.meals.flatMap(x=>x.items).some(x=>['chicken','fish_hake','egg','milk_skim','yogurt','cheese'].includes(x.id)));
const keto=generateFlexibleGuidedDay(catalog,{...goal,carb_g:60,fat_g:145},{patternId:'keto'});
assert.equal(keto.meals[0].slot,'desayuno','Keto does not imply intermittent fasting');
const fasting=generateFlexibleGuidedDay(catalog,goal,{windowId:'16_8'});
assert.ok(!fasting.meals.some(x=>x.slot==='desayuno'));
assert.equal(fasting.meals[0].slot,'almuerzo');
assert.throws(()=>generateFlexibleGuidedDay(catalog,goal,{restrictions:['food_allergy']}),
 /alérgeno/);
const alternative=rebalanceGuidedDay(changed,goal);
assert.deepEqual(alternative.meals.map(x=>x.slot),changed.meals.map(x=>x.slot));
const sql=readFileSync(new URL('../migrations/20261030_coach_reviewed_guide_nutrition_source.sql',import.meta.url),'utf8');
const rpc=readFileSync(new URL('../docs/COACH119_HOSTED_ATOMIC_RELEASE_CANDIDATE_NOT_APPLIED.sql',import.meta.url),'utf8');
assert.match(sql,/flexible_meal_guide/);
assert.match(sql,/jsonb_array_length\(p_guide->'meals'\) between 2 and 6/);
assert.match(rpc,/jsonb_array_length\(v_guide->'meals'\) between 2 and 6/);
assert.match(rpc,/v_distinct_slots<>v_slot_count/);
assert.match(rpc,/Flexible guide references must match its ingredients exactly/);
assert.match(rpc,/v_enabled is distinct from true/);
console.log('PASS NCC SIX-GUIDE: 6 slots, bounded edits 6→5→4, profile patterns, v1 archive, private draft and fail-closed SQL candidate.');
