import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {MICRONUTRIENT_CATALOG as catalog} from '../pilot/micronutrient-catalog.js';
import {micronutrientReferences,estimateDailyMicronutrients,micronutrientPeriod} from '../pilot/micronutrient-engine.js';
import {renderMicronutrients,renderMicronutrientPeriod} from '../pilot/micronutrient-view.js';
import {MICRONUTRIENTS_ENABLED} from '../pilot/micronutrients-config.js';
const profile={age:41,referenceSex:'male',lifeStage:'adult',dietaryPattern:'omnivore'};
const diary=(items=[],sports=[])=>({log_day:'2026-11-13',meals:{desayuno:items},sports,skipped:{}});
const food=(id,qty,unit='g')=>({id,qty,unit,name:catalog.foods[id]?.name||id});
const model=(d,p=profile,c=catalog)=>estimateDailyMicronutrients({diary:d,profile:p,catalog:c});
const nutrient=(m,id)=>m.nutrients.find(n=>n.id===id);

test('adult references track age/sex/life stage; EPA+DHA has no invented RDA',()=>{
 const r=micronutrientReferences(profile);assert.equal(r.magnesium.value,420);assert.equal(r.calcium.value,1000);
 assert.equal(r.ala.value,1.6);assert.equal(r.ala.kind,'AI');assert.equal(r.epa_dha.value,null);
 assert.equal(micronutrientReferences({...profile,referenceSex:'female',age:51}).calcium.value,1200);
 assert.equal(micronutrientReferences({...profile,age:71}).calcium.value,1200);
 assert.equal(micronutrientReferences({...profile,referenceSex:'female',age:25}).magnesium.value,310);
 assert.equal(micronutrientReferences({...profile,referenceSex:'female',lifeStage:'pregnancy'}).iron.value,27);
 assert.equal(micronutrientReferences({...profile,referenceSex:'female',lifeStage:'lactation'}).b12.value,2.8);
 assert.equal(micronutrientReferences({...profile,dietaryPattern:'vegan'}).iron.value,14.4);
});
test('no inferred targets from missing profile, unknown stage, age under 19 or clinical adaptation',()=>{
 for(const p of [null,{age:41},{...profile,lifeStage:null},{...profile,age:18},
  {...profile,clinicalAdaptation:true},{...profile,lifeStage:'pregnancy'}])
  assert.ok(Object.values(micronutrientReferences(p)).every(r=>r.value===null));
});
test('exact-source apple composition scales by actual grams; missing data is not macro-derived',()=>{
 const m=model(diary([food('apple',200)]));
 assert.equal(nutrient(m,'magnesium').food,10);assert.equal(nutrient(m,'calcium').food,12);
 assert.equal(nutrient(m,'magnesium').status,'estimated');assert.equal(nutrient(m,'b12').total,0);
});
test('ml entries use explicit existing density conversion and reject inconsistent units',()=>{
 const milk=catalog.foods.milk_skim;assert.equal(milk.gramsPerMl,1.03);
 assert.ok(Math.abs(milk.perUnit.calcium-122*1.03/100)<1e-9);
 assert.equal(nutrient(model(diary([food('milk_skim',250,'ml')])),'calcium').total,milk.perUnit.calcium*250);
 assert.equal(nutrient(model(diary([food('milk_skim',250,'g')])),'calcium').total,null);
});
test('one unsupported recipe makes coverage partial; no shortfall is fabricated',()=>{
 const m=model(diary([food('apple',200),food('custom-recipe',1,'porción')]));
 const mg=nutrient(m,'magnesium');assert.equal(mg.total,10);assert.equal(mg.status,'partial');
 assert.equal(mg.foodKnown,1);assert.equal(mg.foodUnknown,1);assert.equal(mg.difference,null);
 assert.ok(renderMicronutrients(m).includes('No calculamos faltantes con datos incompletos'));
});
test('empty records and null micronutrients display unknown rather than zero',()=>{
 const empty=model(diary());assert.equal(empty.hasEntries,false);assert.equal(nutrient(empty,'magnesium').total,null);
 const c=structuredClone(catalog);c.foods.apple.perUnit.magnesium=null;
 const m=model(diary([food('apple',200)]),profile,c);assert.equal(nutrient(m,'magnesium').total,null);
 assert.ok(renderMicronutrients(m).includes('Sin datos'));
});
test('omitted meals and changed source identity do not count as compatible intake',()=>{
 const d=diary([food('apple',200)]);d.skipped.desayuno=true;
 assert.equal(model(d).hasEntries,false);
 assert.equal(nutrient(model(diary([{...food('apple',200),sourceId:'different'}])),'magnesium').total,null);
});
test('elemental magnesium is separate from food; upper limit applies to supplements only',()=>{
 const d=diary([food('oats_raw',200)],[{id:'magnesium_citrate',kind:'supplement',qty:200,unit:'mg elementales'}]);
 const mg=nutrient(model(d),'magnesium');assert.ok(mg.total>350);assert.equal(mg.supplements,200);assert.equal(mg.upperLimitExceeded,false);
 d.sports[0].qty=400;assert.equal(nutrient(model(d),'magnesium').upperLimitExceeded,true);
 d.sports[0]={id:'magnesium_citrate',kind:'supplement',qty:1000,unit:'mg'};
 const unknown=nutrient(model(d),'magnesium');assert.equal(unknown.supplements,0);assert.equal(unknown.supplementUnknown,1);
});
test('one gram of fish oil is never inferred to be one gram EPA+DHA or ALA',()=>{
 const m=model(diary([],[{id:'omega3',kind:'supplement',qty:1,unit:'cápsulas',f:1,k:9}]));
 assert.equal(nutrient(m,'epa_dha').total,null);assert.equal(nutrient(m,'ala').total,null);
});
test('EPA+DHA comes from verified-per-dose units; missing DHA is not assumed zero',()=>{
 const entry={id:'omega3',kind:'supplement',qty:2,unit:'cápsulas',micronutrientLabel:{confirmed:true,source:'Etiqueta ficticia de QA',doseQuantity:1,doseUnit:'cápsulas',amounts:{epa:{value:300,unit:'mg'},dha:{value:200,unit:'mg'}}}};
 assert.equal(nutrient(model(diary([],[entry])),'epa_dha').total,1000);
 delete entry.micronutrientLabel.amounts.dha;
 assert.equal(nutrient(model(diary([],[entry])),'epa_dha').total,null);
});
test('a partial multivitamin label does not imply zero for all undeclared nutrients',()=>{
 const entry={id:'multivitamin',kind:'supplement',qty:1,unit:'comprimidos',micronutrientLabel:{confirmed:true,source:'FICTICIO',doseQuantity:1,doseUnit:'comprimidos',amounts:{magnesium:{value:50,unit:'mg'}}}};
 const m=model(diary([],[entry]));assert.equal(nutrient(m,'magnesium').total,50);assert.equal(nutrient(m,'calcium').total,null);
});
test('period averages exclude missing and partial-composition days, never fill absent days with zeros',()=>{
 const a=diary([food('apple',100)]),b=diary([food('apple',100),food('unknown',100)]);b.log_day='2026-11-12';
 const period=micronutrientPeriod({logs:[a,b],profile,catalog,from:'2026-11-07',to:'2026-11-13'});
 const mg=period.summary.find(n=>n.id==='magnesium');assert.equal(mg.average,5);assert.equal(mg.daysWithComposition,1);assert.equal(mg.partialDays,1);
 assert.equal(period.daysWithoutRecords,5);assert.ok(renderMicronutrientPeriod(period).includes('parciales excluidos'));
});
test('estimate is read-only and escapes user-entered food names in detail',()=>{
 const d=diary([{...food('apple',100),name:'<script>alert(1)</script>'}]),copy=structuredClone(d),c=structuredClone(catalog);
 const m=model(d);assert.deepEqual(d,copy);assert.deepEqual(catalog,c);
 const html=renderMicronutrients(m,{expanded:true});assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(html.includes('<h2>Micronutrientes</h2>'));assert.ok(!html.includes('Comprar suplemento'));
});
test('invalid calendar dates and duplicate dates are rejected',()=>{
 assert.throws(()=>model({...diary(),log_day:'2026-02-30'}));
 assert.throws(()=>micronutrientPeriod({logs:[],catalog,profile,from:'2026-02-30',to:'2026-03-01'}));
 assert.throws(()=>micronutrientPeriod({logs:[diary(),diary()],catalog,profile,from:'2026-11-13',to:'2026-11-13'}));
});
test('feature stays off and reference context never falls back to selected student data',()=>{
 assert.equal(MICRONUTRIENTS_ENABLED,false);
 const source=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('function ownMicronutrientProfile(){'),source.indexOf('function homeView(){'));
 const context={state:{session:{user:{id:'owner'}},authContextEpoch:3,
  micronutrientReference:{userId:'pupil',epoch:3,profile},coachIntakePrefill:{profile}}};
 vm.createContext(context);vm.runInContext(body,context);assert.equal(context.ownMicronutrientProfile(),null);
 context.state.micronutrientReference.userId='owner';assert.equal(context.ownMicronutrientProfile(),profile);
 context.state.authContextEpoch=4;assert.equal(context.ownMicronutrientProfile(),null);
});
