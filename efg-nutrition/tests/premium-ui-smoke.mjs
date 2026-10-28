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
 '["home","⌂","MI DÍA"]','["coach","⌂","Inicio"]','["admin","⌂","Inicio"]'
]);
includesAll(css,["efg-menu-grid","efg-role-student","safe-area-inset-bottom","@media(max-width:720px)","efg-quick-add-grid","coach-profile-accordion"]);
includesAll(js,["function efgNavIcon(tab)","function efgAvatarLetters(name)","efg-mobile-header","data-scrollto=\"studentMeals\"",'aria-current="page"',"if(el.dataset.scrollto)"]);
includesAll(css,[".efg-mobile-header","efg-mobile-avatar","efg-student-macros","meal-remove-item","safe-area-inset-top"]);
assert.match(js,/data-scrollto="studentMeals"/,"The meals shortcut must scroll to the actual meal section");
assert.match(js,/id="studentMeals"/,"The meals destination must exist");
assert.match(css,/\.pilot-layout \.meal-remove-item\{min-width:44px;height:44px/,"Meal delete targets must be at least 44px");

// Regression: the admin's test-coach roster must load the same persisted consent state as a coach.
const roleLoader=js.slice(js.indexOf("async function loadRoleData(){"),js.indexOf("async function loadStudentDetail("));
assert.match(js,/async function loadCoachRosterConsent\(\)/,"Shared consent loader must exist");
assert.match(roleLoader,/state\.roster=students\.data\|\|\[\];state\.testInvitations=pending\.data\|\|\[\];\s*await loadCoachRosterConsent\(\)/,"Admin test-coach must load persisted student consents");
assert.match(roleLoader,/state\.roster=r\.data\|\|\[\];state\.invitations=inv\.data\|\|\[\];\s*await loadCoachRosterConsent\(\)/,"Coach must use the same consent loader");
assert.match(js,/\.from\("efg_consents"\)\.select\("student_id,accepted"\)/,"Consent status must be read from database, not inferred from enrollment");
assert.ok(html.lastIndexOf("premium-system.css")>html.lastIndexOf("admin-experience.css"),"Premium styles must load last");
assert.ok(!js.slice(js.indexOf("function macroCard("),js.indexOf("function premiumMenuView(")).includes("</summary>"),"Macro card contains unexpected closing summary");
let depth=0;for(const c of css){if(c==="{")depth++;if(c==="}"){depth--;assert.ok(depth>=0,"CSS braces close too early")}}assert.equal(depth,0,"CSS braces unbalanced");
console.log("PASS: JS syntax, UX destinations, profile sections, CSS/mobile structure, macro markup.");
console.log("NOT TESTED: real auth, live iPhone/Android screenshots, mobile visual overflow, live Supabase persistence and permissions.");
