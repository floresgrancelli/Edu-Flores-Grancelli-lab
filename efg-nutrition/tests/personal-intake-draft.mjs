// NUT-61 isolated Personal self-report intake test; no databases or medical advice.
import assert from "node:assert/strict";
import {PERSONAL_INTAKE_ENABLED,PERSONAL_HEALTH_FLAGS,PERSONAL_INTAKE_GOALS,
 parsePersonalIntake,personalIntakeSafety,renderPersonalIntakeDraft} from "../pilot/personal-intake-draft.js";
assert.equal(PERSONAL_INTAKE_ENABLED,false,"No sensitive intake collection until legal/backend review.");
assert.ok(PERSONAL_INTAKE_GOALS.some(x=>x[0]==="recomp"));
for(const code of ["celiac","diabetes","hypertension","high_cholesterol","fatty_liver","food_allergy","lactose_intolerance","sibo","kidney_disease"]){
 assert.ok(PERSONAL_HEALTH_FLAGS.some(x=>x[0]===code),"Missing self-reported condition "+code);
}
const data=parsePersonalIntake({
 goal:"recomp",age_years:"41",height_cm:"174",weight_kg:"79.4",activity_level:"moderate",
 sex_for_equation:"male",dietary_pattern:"omnivore",health_flags:[],
 preferred_foods:'Pan & huevo <script>alert("x")</script>',notes:"Voy al gimnasio."
});
assert.equal(data.age_years,41);
assert.equal(data.height_cm,174);
assert.equal(data.weight_kg,79.4);
assert.equal(personalIntakeSafety(data).canPreviewGeneralEnergyEstimate,true);
assert.equal(personalIntakeSafety(data).automaticGuideAllowed,false);
assert.equal(personalIntakeSafety(parsePersonalIntake({...data,health_flags:["celiac"]})).requiresProfessionalReview,true);
assert.equal(personalIntakeSafety(parsePersonalIntake({...data,health_flags:["celiac"]})).canPreviewGeneralEnergyEstimate,false);
for(const f of ["lactose_intolerance","sibo"]){const d=personalIntakeSafety(parsePersonalIntake({...data,health_flags:[f]}));assert.equal(d.automaticGuideAllowed,false);assert.equal(d.requiresProfessionalReview,true);}
assert.equal(personalIntakeSafety(parsePersonalIntake({...data,goal:"general"})).canPreviewGeneralEnergyEstimate,false);
assert.throws(()=>parsePersonalIntake({...data,health_flags:["celiac","celiac"]}),/Selección inválida/);
assert.throws(()=>parsePersonalIntake({...data,health_flags:["not_a_diagnosis"]}),/Selección inválida/);
assert.throws(()=>parsePersonalIntake({...data,age_years:17}),/edad/i);
assert.throws(()=>parsePersonalIntake({...data,age_years:41.5}),/entero/);
assert.throws(()=>parsePersonalIntake({...data,weight_kg:0}),/peso/);
assert.throws(()=>parsePersonalIntake({...data,sex_for_equation:"unknown"}),/ecuación/);
assert.throws(()=>parsePersonalIntake({...data,dietary_pattern:"keto_auto"}),/patrón/);
assert.throws(()=>parsePersonalIntake({...data,allergy_details:"Nueces"}),/Marcá alergia/);
assert.equal(parsePersonalIntake({...data,health_flags:["food_allergy"],allergy_details:"Nueces"}).allergy_details,"Nueces");
assert.throws(()=>parsePersonalIntake({...data,notes:"x".repeat(801)}),/observaciones/);
assert.throws(()=>parsePersonalIntake({...data,health_flags:null}),/Selección inválida/);
const html=renderPersonalIntakeDraft(data);
for(const s of ["Mi ficha nutricional","Celiaquía","Diabetes","Hipertensión","Hígado graso","Colesterol elevado","Alergia alimentaria","Intolerancia a la lactosa","SIBO","Patrón de alimentación"]){
 assert.ok(html.includes(s),s);
}
assert.ok(html.includes("&lt;script&gt;"),"All user text escaped");
assert.doesNotMatch(html,/<script>|onclick=|onload=/i);
assert.doesNotMatch(html,/data-act="save|data-act="send|type="submit"/);
assert.ok(html.includes("todavía no se guarda"),"No implied backend persistence");
const htmlUnsafe=renderPersonalIntakeDraft({...data,health_flags:["celiac"],preferred_foods:'"<img src=x onerror=alert(1)>'});
assert.ok(htmlUnsafe.includes("&lt;img"),"Untrusted HTML must be escaped");
assert.doesNotMatch(htmlUnsafe,/<img src=x/,"No injected elements");
assert.ok(htmlUnsafe.includes('value="celiac" checked'));
assert.ok(!html.includes('value="celiac" checked'),"Sensitive flags must never be selected by default");
const empty=renderPersonalIntakeDraft();
assert.ok(!empty.includes(" checked"),"All optional health checks blank for a new Personal intake");
console.log("PASS NUT-61: Personal intake OFF, voluntary health declarations, input bounds, injection safety, no medical food claims and no implicit sharing.");
