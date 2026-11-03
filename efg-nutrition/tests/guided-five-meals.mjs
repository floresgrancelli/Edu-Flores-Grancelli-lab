import assert from "node:assert/strict";
import {GUIDE_MEALS,generateGuidedDay,guideTotals,guideDeviation,validateGuidedDay,summarizeBaseline,guidedFoodAlternatives,swapGuidedFood,rebalanceGuidedDay,describeGuidedMeal,guidedPortionBounds} from "../pilot/guided-day.js";
const data={
egg:[1.48,.124,.0096,.0996],bread:[2.47,.13,.41,.042],milk_skim:[.35,.034,.05,.001],banana:[.89,.011,.23,.003],
yogurt:[.50,.042,.081,.0009],apple:[.52,.003,.138,.002],chicken:[1.65,.31,0,.036],brownrice:[1.23,.027,.256,.01],
pumpkin:[.34,.01,.08,.001],oil:[8.84,0,0,1],cheese:[2.17,.27,.017,.12],mandarin:[.53,.008,.133,.003],
fish_hake:[.82,.178,0,.007],potato:[.86,.0171,.2001,.001],rocket:[.25,.026,.037,.007],whey_powder:[3.9,.83,.07,.025],rice:[1.29,.0267,.2799,.0028],bread_white:[2.65,.09,.49,.032]
};
data.oats_raw=[3.89,.169,.663,.069];data.coffee_black=[.001,0,0,0];
Object.assign(data,{
 egg_white:[.55,.107,.0236,0],
 ham_cooked:[1.25,.18,.02,.05],
 turkey_breast_cooked:[1.35,.29,0,.017],
 yogurt_greek_light:[.58,.10,.04,.004],
 yogurt_high_protein:[.69,.10,.05,.01],
 cottage_cheese:[.95,.11,.034,.043],
 ricotta_light:[1.3,.11,.04,.08],
 tofu_firm:[1.19,.12,.02,.07],
 tempeh:[2.15,.19,.09,.11]
});
const catalog=Object.entries(data).map(([id,[k,p,c,f]])=>({id,name:id,unit:id==="milk_skim"?"ml":"g",k,p,c,f,fi:0}));
const goal={kcal:2250,protein_g:155,carb_g:250,fat_g:70};
for(const includeWhey of [false,true]){
 const plan=generateGuidedDay(catalog,goal,{includeWhey});
 assert.deepEqual(plan.meals.map(x=>x.slot),GUIDE_MEALS.map(x=>x.slot));
 assert.equal(plan.meals.length,5);
 assert.match(describeGuidedMeal(plan.meals[0]),/revueltos|plancha/);
 assert.ok(plan.meals[0].items.some(x=>x.id==="coffee_black"),"Coffee with milk must list both ingredients");
 assert.ok(plan.meals[0].items.find(x=>x.id==="bread").qty<=50,"Do not propose excessive breakfast bread");
 assert.ok(plan.meals[2].items.find(x=>x.id==="chicken").qty>=160,"No tiny lunch protein portions");
 assert.ok(plan.meals.flatMap(x=>x.items).filter(x=>["apple","mandarin"].includes(x.id)).every(x=>x.qty<=220),"Fruit portions stay reasonable");
 const all=plan.meals.flatMap(x=>x.items);
 assert.equal(all.some(x=>x.id==="whey_powder"),includeWhey);
 assert.ok(all.every(x=>x.qty>0&&x.qty<701));
 const delta=guideDeviation(plan,goal);
 for(const k of ["k","p","c","f"])assert.ok(Math.abs(delta[k].percent)<30,"Large generated deviation "+k+": "+delta[k].percent);
 assert.doesNotThrow(()=>validateGuidedDay(plan,goal));
 assert.ok(guideTotals(plan).totals.k>0);
 const invalid=structuredClone(plan);invalid.meals[0].items[0].qty=900;
 assert.throws(()=>validateGuidedDay(invalid,goal));
}
const logs=[
 {log_day:"2026-10-27",meals:{desayuno:[{k:300,p:20,c:30,f:10}],almuerzo:[{k:700,p:50,c:65,f:20}]}},
 {log_day:"2026-10-26",meals:{desayuno:[{k:250,p:15,c:20,f:10}]}},
 {log_day:"2026-10-28",meals:{cena:[{k:2000,p:70,c:230,f:80}]}},
];
const baseline=summarizeBaseline(logs,{todayISO:"2026-10-28"});
assert.equal(baseline.days.length,2);
assert.equal(baseline.average.k,625);
assert.match(baseline.warning,/no el consumo habitual/);
console.log("PASS: five-meal educational guide, bounded portions, optional whey, assessment, sample intake, no auto-prescribing.");

const original=generateGuidedDay(catalog,goal);
const exampleEgg=original.meals[0].items.find(x=>x.id==="egg");
assert.equal(exampleEgg.qty,110,"Default breakfast must remain two eggs, not three");
assert.ok(guidedFoodAlternatives("egg",catalog).includes("ham_cooked"),"Ham replacement must be offered");
for(const alternative of ["egg_white","ham_cooked","turkey_breast_cooked","yogurt_greek_light","yogurt_high_protein","cottage_cheese","ricotta_light","tofu_firm","tempeh","whey_powder"]){
 const choice=swapGuidedFood(original,"desayuno",0,alternative,catalog);
 const result=rebalanceGuidedDay(choice,goal);
 assert.equal(result.meals[0].items[0].id,alternative,"Must retain coach choice");
 assert.ok(result.meals[0].items[0].locked,"Coach food replacement must stay locked");
 assert.equal(result.meals[0].items[0].qty,choice.meals[0].items[0].qty,"Rebalancing cannot overwrite coach protein choice");
 assert.ok(guidedPortionBounds(alternative)[0]<=result.meals[0].items[0].qty,"No too-small breakfast portion");
 assert.doesNotMatch(describeGuidedMeal(result.meals[0]),/huevos revueltos/i,"Description must not retain eggs after replacement");
 assert.doesNotThrow(()=>validateGuidedDay(result,goal),"Protein swap must produce valid guide: "+alternative);
}
const hamDay=swapGuidedFood(original,"desayuno",0,"ham_cooked",catalog);
assert.match(describeGuidedMeal(hamDay.meals[0]),/jamón cocido/);
assert.match(describeGuidedMeal(hamDay.meals[0]),/café con leche/);
assert.ok(hamDay.meals[0].items[0].qty>=35&&hamDay.meals[0].items[0].qty<=150);

assert.ok(guidedFoodAlternatives("brownrice",catalog).includes("rice"),"Rice alternative should exist");
const swapped=swapGuidedFood(original,"almuerzo",1,"rice",catalog);
assert.equal(original.meals[2].items[1].id,"brownrice","Swaps cannot mutate original");
assert.equal(swapped.meals[2].items[1].id,"rice");
assert.notEqual(swapped.meals[2].items[1].k,original.meals[2].items[1].k,"Swaps must load correct nutrient source");
assert.throws(()=>swapGuidedFood(original,"almuerzo",1,"oil",catalog));
assert.throws(()=>swapGuidedFood(original,"almuerzo",1,"fake",catalog));
const adjusted=structuredClone(swapped);
adjusted.meals[2].items[1].qty=200;adjusted.meals[2].items[1].locked=true;
const protectedEdit=rebalanceGuidedDay(adjusted,goal);
assert.equal(protectedEdit.meals[2].items[1].qty,200,"Coach-entered portion must survive automatic rebalancing");
const balanced=rebalanceGuidedDay(swapped,goal);
assert.equal(balanced.meals[2].items[1].id,"rice","Rebalancing preserves chosen foods");
assert.doesNotThrow(()=>validateGuidedDay(balanced,goal));
const impractical=structuredClone(balanced);
impractical.meals[2].items.find(x=>x.id==="oil").qty=80;
assert.throws(()=>validateGuidedDay(impractical,goal),"No oversized oil portions");
for(const variant of [
 {kcal:1900,protein_g:135,carb_g:205,fat_g:60},
 {kcal:2650,protein_g:165,carb_g:320,fat_g:80}
]) {
 const generated=generateGuidedDay(catalog,variant);
 assert.equal(generated.meals.length,5);
 assert.doesNotThrow(()=>validateGuidedDay(generated,variant),"Reasonable target must yield plausible five meals");
}
console.log("PASS: real-food swaps, bounded portions and different calorie targets.");
