// CLIN-01: structural tests only, with FAKE restrictions and sample foods.
// No actual real-world allergen/celiac safety labels or medical conclusions.
import assert from "node:assert/strict";
import {assessDietarySignal,DIETARY_LABELS} from "../pilot/dietary-traffic-light.js";
const asOf=new Date("2026-10-30T12:00:00Z");
const fake=(restriction,verdict="allowed",overrides={})=>({
 food_id:"test_food",restriction,verdict,status:"reviewed",
 evidence_id:"TEST_ONLY_SOURCE",source_url:"https://example.invalid/not-a-medical-source",
 reviewed_by:"SYNTHETIC_REVIEWER",reviewed_at:"2026-10-01T00:00:00Z",
 expires_at:"2026-11-30T00:00:00Z",...overrides
});
const signal=(restrictions,rows,foodId="test_food")=>
 assessDietarySignal({foodId,restrictions,reviewedRows:rows,asOf});
let cases=0;
function check(name,restrictions,rows,color){
 const x=signal(restrictions,rows);
 assert.equal(x.color,color,name);
 assert.equal(x.label,DIETARY_LABELS[color],name+" label");
 assert.equal(x.verified,color==="green"||color==="red");
 cases++;
}
check("No restrictions: NEVER traffic-light calories or foods",[],[fake("dummy_a")],"neutral");
check("Missing evidence: unknown is yellow",["dummy_a"],[],"yellow");
check("Only synthetic reviewed allowed -> green",["dummy_a"],[fake("dummy_a")],"green");
check("All restrictions must have allowed evidence",["dummy_a","dummy_b"],[fake("dummy_a")],"yellow");
check("Both synthetic restrictions allowed",["dummy_a","dummy_b"],[fake("dummy_a"),fake("dummy_b")],"green");
check("Explicit synthetic avoid -> red",["dummy_a"],[fake("dummy_a","avoid")],"red");
check("Red more conservative than incomplete second restriction",["dummy_a","dummy_b"],[fake("dummy_a","avoid")],"red");
check("Review-needed => yellow",["dummy_a"],[fake("dummy_a","verify")],"yellow");
check("Unknown verdict => yellow",["dummy_a"],[fake("dummy_a","SAFE")],"yellow");
check("Expired review cannot yield green",["dummy_a"],[fake("dummy_a","allowed",{expires_at:"2026-10-20T00:00:00Z"})],"yellow");
check("Future-dated review cannot yield green",["dummy_a"],[fake("dummy_a","allowed",{reviewed_at:"2026-11-01T00:00:00Z"})],"yellow");
check("Unreviewed => yellow",["dummy_a"],[fake("dummy_a","allowed",{status:"draft"})],"yellow");
check("No reviewer => yellow",["dummy_a"],[fake("dummy_a","allowed",{reviewed_by:""})],"yellow");
check("No source => yellow",["dummy_a"],[fake("dummy_a","allowed",{source_url:""})],"yellow");
check("http source => yellow",["dummy_a"],[fake("dummy_a","allowed",{source_url:"http://example.invalid"})],"yellow");
check("Duplicate/conflicting rows -> yellow",["dummy_a"],[fake("dummy_a"),fake("dummy_a","avoid")],"yellow");
check("Other food's review never crosses food boundary",["dummy_a"],[fake("dummy_a","allowed",{food_id:"other_food"})],"yellow");
check("Review for different restriction cannot authorize",["dummy_a"],[fake("dummy_b")],"yellow");
check("Duplicate user-selected restrictions deduplicated",["dummy_a","dummy_a"],[fake("dummy_a")],"green");
check("Selection does not depend on caloric/kcal metadata",[],[{...fake("dummy_a"),kcal:99999}],"neutral");
assert.throws(()=>signal([""],[]),/Restricciones/);
assert.throws(()=>assessDietarySignal({foodId:"test_food",restrictions:"gluten",reviewedRows:[]}),/verificar/);
assert.throws(()=>assessDietarySignal({foodId:"test_food",restrictions:["dummy_a"],reviewedRows:[],asOf:"bad-date"}),/Fecha/);
console.log("PASS CLIN-01: "+cases+" synthetic dietary signal cases + 3 invalid-input cases. No safety claims. No backend trust. RELEASE NO GO.");
