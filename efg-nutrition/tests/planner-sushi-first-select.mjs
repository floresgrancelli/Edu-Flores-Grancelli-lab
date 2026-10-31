import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {FOOD_UNIT_PORTIONS,EXTRA_FOODS} from "../pilot/food-catalog.js";

// Contract-only: run the same pure helpers used by the planner; no network or hosted writes.
const source=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
const start=source.indexOf("// El sushi se muestra por piezas;");
const end=source.indexOf("function plannerCard(){",start);
assert.ok(start>=0&&end>start,"Sushi quantity helpers must exist in planner");
const helperSource=source.slice(start,end);
const api=runInNewContext(helperSource+";({plannerSushiPortion,plannerShownQty,plannerMeasuredGrams,plannerQtyLabel})",{
 FOOD_UNIT_PORTIONS,num:(value)=>String(value)
});
const maki=EXTRA_FOODS.find(f=>f.id==="sushi_maki_salmon");
assert.ok(maki,"Sushi maki must exist in catalog");
const portion=FOOD_UNIT_PORTIONS[maki.id];
assert.equal(portion.grams,28,"Catalog estimate: 28 g per maki piece");
assert.equal(api.plannerShownQty(maki,224),8);
assert.equal(api.plannerMeasuredGrams(maki,8),224);
assert.ok(api.plannerQtyLabel(maki,"g").includes("piezas"));
assert.ok(Number.isNaN(api.plannerMeasuredGrams(maki,1.5)),"Reject fractional pieces");
assert.equal(api.plannerMeasuredGrams({id:"rice"},80),80,"Non-sushi still uses grams");
assert.match(source,/const grams=plannerMeasuredGrams\(food,shownQty\)/,"Preview converts pieces into grams");
assert.match(source,/const grams=plannerMeasuredGrams\(row\.food,shownQty\)/,"Save converts pieces into grams");
assert.match(source,/syncPlannerSearchActions\(key\);updatePlannerPreview\(\);/,"First selection updates controls without replacing select DOM");
assert.doesNotMatch(source,/e\.target\.blur\(\);refreshPlannerCard\(key\)/,"First selection must not destroy the native selector");
console.log("PASS: sushi pieces -> gram equivalents for macro engine and first selection DOM preservation (offline).");
