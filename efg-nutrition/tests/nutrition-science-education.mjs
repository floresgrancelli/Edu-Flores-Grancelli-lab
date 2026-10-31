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
assert.match(page,/Nutrición <em>Con-Ciencia/);
assert.match(page,/Los hidratos no son el villano/);
assert.match(page,/¿Por qué importa la proteína si entrenás\?/);
assert.match(page,/1,4–2,0 g\/kg\/día/);
assert.match(page,/105–150 g de proteína/);
assert.match(page,/metaanálisis de entrenamiento de fuerza/);

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
assert.equal(NUTRITION_SCIENCE_SOURCES.length,7);
assert.match(page,/¿Por qué importa moverse\?/);
assert.match(page,/Cada movimiento cuenta/);
assert.match(css,/\.ns-movement\{/);
assert.ok(NUTRITION_SCIENCE_SOURCES.some(s=>s.url==='https://www.who.int/news-room/fact-sheets/detail/physical-activity'), 'Verified WHO movement source is cited');
for(const s of NUTRITION_SCIENCE_SOURCES){
 assert.ok(/^https:\/\/(www\.)?(who\.int|ncbi\.nlm\.nih\.gov|pmc\.ncbi\.nlm\.nih\.gov)\//.test(s.url),s.title+" scientific link");
 assert.ok(page.includes(s.url),"cited source missing");
}
assert.match(js,/import \{SCIENCE_WELCOME_ENABLED,SCIENCE_STEPS,readScienceWelcomeStatus,acknowledgeScienceWelcome,renderScienceVerticalView,renderScienceWelcomeStep\} from "\.\/science-welcome\.js/);
assert.match(js,/nutritionScience:renderScienceVerticalView/);
assert.match(js,/\["nutritionScience","✦","Nutrición Con-Ciencia"\]/);
assert.equal((js.match(/\["nutritionScience","✦","Nutrición Con-Ciencia"\]/g)||[]).length,5,"permanent student ready/pending/private, coach and admin tabs");
assert.equal((js.match(/\["nutritionScience","🧠","Nutrición Con-Ciencia"/g)||[]).length,3,"discoverable from student, coach and admin More menus");
assert.match(js,/if\(studentPlanPending\(\)&&!\["intake","messages","nutritionScience","privacy","notifications"\]\.includes\(state\.tab\)\)state\.tab="intake"/,
 "pending intake gate preserves MI DÍA lock but allows the educational library");
assert.match(js,/state\.tab=studentPlanPending\(\)&&!\["intake","messages","nutritionScience","privacy","notifications"\]\.includes\(el\.dataset\.tab\)\?"intake":el\.dataset\.tab/,
 "pending intake click may open science but cannot reach the locked diary");
assert.match(html,/nutrition-science\.css\?v=20261030-science-edu1/);
assert.match(css,/@media\(max-width:520px\)/);
assert.match(css,/focus-visible/);
let depth=0;for(const c of css){if(c==="{")++depth;if(c==="}"){--depth;assert.ok(depth>=0)}}assert.equal(depth,0);
console.log("PASS EDUCATION-01: student and coach nav + more, 4/4/9 math, peer-reviewed sources, inclusive myths, readable FAQ, mobile CSS, onboarding remains gated. LOCAL ONLY; no physical mobile verification.");
