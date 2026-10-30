// EDUCATION-01. Reproducible offline science and navigation test; no student data.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {renderNutritionScienceView,NUTRITION_SCIENCE_SOURCES,macroEnergy}
 from "../pilot/nutrition-science.js";
const js=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../pilot/index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../pilot/nutrition-science.css",import.meta.url),"utf8");
const page=renderNutritionScienceView();
for(const [kind,factor] of [["protein",4],["carbs",4],["fat",9]]){
 assert.equal(macroEnergy(20,kind),20*factor,kind+" correct kcal per gram");
}
for(const broken of [[-1,"protein"],[5,"other"],[NaN,"fat"]])
 assert.throws(()=>macroEnergy(...broken),RangeError);
assert.match(page,/Nutrición <em>con ciencia/);
assert.match(page,/Los hidratos no son el villano/);
assert.match(page,/Más proteínas, menos grasas/);
assert.match(page,/Más grasas, menos proteínas/);
assert.match(page,/20 g de grasa aportan 180 kcal; 20 g de proteína, 80 kcal/);
assert.match(page,/No por sí sola/);
assert.match(page,/1,4 a 2,0 g\/kg\/día/);
assert.match(page,/condición médica/);
assert.match(page,/Contenido educativo general/);
assert.equal((page.match(/<details>/g)||[]).length,4,"native accessible FAQs");
assert.equal((page.match(/<summary>/g)||[]).length,4,"each FAQ has keyboard-friendly summary");
assert.match(page,/aria-label="Proteína e hidratos: 4 kilocalorías/);
assert.ok(!/data-act=|sb\.from|service_role|pg_catalog/.test(page),"no privileged food or role mutation");
assert.equal(NUTRITION_SCIENCE_SOURCES.length,5);
for(const s of NUTRITION_SCIENCE_SOURCES){
 assert.ok(/^https:\/\/(www\.)?(who\.int|ncbi\.nlm\.nih\.gov|pmc\.ncbi\.nlm\.nih\.gov)\//.test(s.url),s.title+" scientific link");
 assert.ok(page.includes(s.url),"cited source missing");
}
assert.match(js,/import \{renderNutritionScienceView\} from "\.\/nutrition-science\.js/);
assert.match(js,/nutritionScience:renderNutritionScienceView/);
assert.match(js,/\["nutritionScience","✦","Ciencia"\]/);
assert.equal((js.match(/\["nutritionScience","✦","Ciencia"\]/g)||[]).length,2,"one real tab for student and one for coach");
assert.equal((js.match(/\["nutritionScience","🧠","Nutrición con ciencia"/g)||[]).length,2,"discoverable from BOTH more menus");
assert.match(js,/if\(studentPlanPending\(\)&&!\["intake","messages","privacy","notifications"\]\.includes\(state\.tab\)\)state\.tab="intake"/,
 "pending intake gate must prevent science from bypassing onboarding");
assert.match(js,/state\.tab=studentPlanPending\(\)&&!\["intake","messages","privacy","notifications"\]\.includes\(el\.dataset\.tab\)\?"intake":el\.dataset\.tab/,
 "pending intake click must not bypass onboarding");
assert.match(html,/nutrition-science\.css\?v=20261030-science-edu1/);
assert.match(css,/@media\(max-width:520px\)/);
assert.match(css,/focus-visible/);
let depth=0;for(const c of css){if(c==="{")++depth;if(c==="}"){--depth;assert.ok(depth>=0)}}assert.equal(depth,0);
console.log("PASS EDUCATION-01: student and coach nav + more, 4/4/9 math, peer-reviewed sources, inclusive myths, readable FAQ, mobile CSS, onboarding remains gated. LOCAL ONLY; no physical mobile verification.");
