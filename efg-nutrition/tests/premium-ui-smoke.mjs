// EFG Nutrition Pro — static UX smoke gate (no Supabase writes or credentials).
// Run: node efg-nutrition/tests/premium-ui-smoke.mjs
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const path="efg-nutrition/pilot/";
const js=readFileSync(path+"pilot.js","utf8");
const css=readFileSync(path+"premium-system.css","utf8");
const html=readFileSync(path+"index.html","utf8");
const syntax=js.replace(/^import .*;$/gm,"");
new Function(syntax);
function includesAll(text,names){for(const x of names)assert.ok(text.includes(x),"Missing: "+x)}
includesAll(js,[
 "function coachHomeView()","function adminHomeView()",
 "function studentPlannerView()","function studentRecipesView()",
 "function studentSupplementsView()","function studentPrivacyView()",
 "efg-quick-add-grid","efg-consent-reminder",
 "data-coachsection","coach-profile-accordion",
 '["home","⌂","Hoy"]','["coach","⌂","Inicio"]','["admin","⌂","Inicio"]'
]);
includesAll(css,["efg-menu-grid","efg-role-student","safe-area-inset-bottom","@media(max-width:720px)","efg-quick-add-grid","coach-profile-accordion"]);
assert.ok(html.lastIndexOf("premium-system.css")>html.lastIndexOf("admin-experience.css"),"Premium styles must load last");
assert.ok(!js.slice(js.indexOf("function macroCard("),js.indexOf("function homeView()")).includes("</summary>"),"Macro card contains unexpected closing summary");
let depth=0;for(const c of css){if(c==="{")depth++;if(c==="}"){depth--;assert.ok(depth>=0,"CSS braces close too early")}}assert.equal(depth,0,"CSS braces unbalanced");
console.log("PASS: JS syntax, UX destinations, profile sections, CSS/mobile structure, macro markup.");
console.log("NOT TESTED: real auth, mobile visual overflow, live Supabase persistence and permissions.");
