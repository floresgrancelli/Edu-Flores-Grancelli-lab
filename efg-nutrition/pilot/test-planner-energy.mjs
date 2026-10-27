// Tests de regresión: kcal elegidas vs objetivo y traslado a cena.
// Ejecutar: node efg-nutrition/pilot/test-planner-energy.mjs
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const code=await readFile(new URL("./planner.js",import.meta.url),"utf8");
const {makePlan,plannerEnergyBreakdown}=await import("data:text/javascript;base64,"+Buffer.from(code).toString("base64"));
const foods=[
 {id:"yogurt",name:"Yogur",k:.55,p:.043,c:.08,f:.005,unit:"g"},
 {id:"bread",name:"Pan",k:2.47,p:.13,c:.41,f:.042,unit:"g"},
 {id:"chicken",name:"Pollo",k:1.65,p:.31,c:0,f:.036,unit:"g"},
 {id:"rice",name:"Arroz",k:1.29,p:.0267,c:.2799,f:.0028,unit:"g"},
 {id:"avocado",name:"Palta",k:1.6,p:.02,c:.09,f:.147,category:"fat",unit:"g"}
];
const args={foods,approved:foods.map(f=>f.id),diary:{meals:{},skipped:{}},
 goals:{k:897,p:48.1,c:107,f:29.2},totals:{k:0,p:0,c:0,f:0}};
const plan=makePlan({...args,dinnerOnly:false});
const v=plannerEnergyBreakdown(plan);
assert.deepEqual(v.map(x=>x.slot),["merienda","cena"]);
assert.equal(v[0].target,299);
assert.equal(v[1].baseline,598);
assert.ok(Math.abs(v[1].target-(897-v[0].selected))<.0001);
assert.ok(v[0].remaining>0);
assert.ok(v[1].remaining>0);
const changed=plannerEnergyBreakdown(plan,{"merienda|protein":100,"merienda|carbs":25});
assert.ok(changed[0].selected<v[0].selected);
assert.ok(changed[1].target>v[1].target);
assert.ok(Math.abs(changed[1].target-(897-changed[0].selected))<.0001);
const noSnack=plannerEnergyBreakdown(plan,{"merienda|protein":0,"merienda|carbs":0});
assert.equal(noSnack[1].target,897);
const one=plannerEnergyBreakdown(makePlan({...args,dinnerOnly:true}));
assert.equal(one.length,1);assert.equal(one[0].target,897);
const withExtra=makePlan({...args,selections:{"cena|vegetable":"avocado"}});
assert.ok(withExtra.meals[1].rows[2].grams>0);
assert.ok(withExtra.meals[1].rows[2].grams<=55);
for(const x of v)assert.ok(Math.abs(x.selected+x.remaining-x.exceeded-x.target)<.0001);
console.log("Resumen energético, transferencia y extras optativos: OK");
