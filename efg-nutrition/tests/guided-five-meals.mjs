import assert from "node:assert/strict";
import {GUIDE_MEALS,generateGuidedDay,guideTotals,guideDeviation,validateGuidedDay,summarizeBaseline} from "../pilot/guided-day.js";
const data={
egg:[1.48,.124,.0096,.0996],bread:[2.47,.13,.41,.042],milk_skim:[.35,.034,.05,.001],banana:[.89,.011,.23,.003],
yogurt:[.50,.042,.081,.0009],apple:[.52,.003,.138,.002],chicken:[1.65,.31,0,.036],brownrice:[1.23,.027,.256,.01],
pumpkin:[.34,.01,.08,.001],oil:[8.84,0,0,1],cheese:[2.17,.27,.017,.12],mandarin:[.53,.008,.133,.003],
fish_hake:[.82,.178,0,.007],potato:[.86,.0171,.2001,.001],rocket:[.25,.026,.037,.007],whey_powder:[3.9,.83,.07,.025]
};
const catalog=Object.entries(data).map(([id,[k,p,c,f]])=>({id,name:id,unit:id==="milk_skim"?"ml":"g",k,p,c,f,fi:0}));
const goal={kcal:2250,protein_g:155,carb_g:250,fat_g:70};
for(const includeWhey of [false,true]){
 const plan=generateGuidedDay(catalog,goal,{includeWhey});
 assert.deepEqual(plan.meals.map(x=>x.slot),GUIDE_MEALS.map(x=>x.slot));
 assert.equal(plan.meals.length,5);
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
