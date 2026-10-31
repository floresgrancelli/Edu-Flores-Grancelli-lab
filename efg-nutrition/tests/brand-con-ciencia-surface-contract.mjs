// BRAND-78: user-visible rebranding on critical app, report, release and PWA surfaces.
// Not a declaration that every legacy file or native store listing has been renamed.
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
const files=[
 "../index.html","../pilot/index.html","../pilot/pilot.js",
 "../pilot/weekly-luxury-report.js","../pilot/daily-report.js",
 "../pilot/progress-charts.js","../pilot/release-communications.js",
 "../pilot/coach-relaunch-entry-client.js","../pilot/coach-intake-flow.js",
 "../pilot/legal-onboarding.js","../pilot/version-notice.js",
 "../pilot/personal-workspace.js","../pilot/personal-intake-draft.js",
 "../pilot/pull-refresh.js"
];
const read=relative=>readFileSync(new URL(relative,import.meta.url),"utf8");
for(const file of files){
 const text=read(file);
 const stripped=text.replace(/^\s*(?:\/\/|\/\*|\*).*$/gm,"");
 assert.doesNotMatch(stripped,/EFG\s+NUTRITION(?:\s+PRO)?/i,file+" retains a visible legacy brand");
}
// Scan every direct pilot UI asset, not just a short hand-picked checklist.
// Source comments are not visible; keep their technical EFG project identifiers.
const uiDir=new URL("../pilot/",import.meta.url);
const candidateAssets=readdirSync(uiDir).filter(name=>
 /\.(?:js|html|css|json|webmanifest)$/i.test(name));
assert.ok(candidateAssets.length>=80,"Expected full pilot UI asset coverage");
for(const name of candidateAssets){
 const raw=readFileSync(new URL(name,uiDir),"utf8");
 const noBlockComments=raw.replace(/\/\*[\s\S]*?\*\//g,"");
 const visibleSource=noBlockComments.replace(/^\s*\/\/[^\n]*$/gm,"");
 assert.doesNotMatch(visibleSource,/\bEFG\s+NUTRITION(?:\s+PRO)?\b/i,
  "Old visible brand in pilot/"+name+"; DO NOT rename technical IDs, files or keys");
}
const pilot=read("../pilot/pilot.js");
assert.equal((pilot.match(/\["nutritionScience","✦","Nutrición Con-Ciencia"\]/g)||[]).length,4,
 "Student ready/pending, Coach and Admin nav must show the permanent science library");
assert.equal((pilot.match(/\["nutritionScience","🧠","Nutrición Con-Ciencia"/g)||[]).length,3,
 "Student, Coach and Admin More menus must show the permanent science library");
assert.match(pilot,/nutritionScience:renderScienceVerticalView/);
assert.match(pilot,/renderScienceWelcomeStep\(state\.scienceWelcomeStep/);
const html=read("../pilot/index.html");
assert.match(html,/<title>Nutrición Con-Ciencia/);
assert.match(html,/pilot-loader-wordmark">Nutrición Con-Ciencia/);
assert.match(html,/serotonina-acuarela\.avif/);
const report=read("../pilot/weekly-luxury-report.js");
assert.match(report,/Nutrición Con-Ciencia/);
assert.match(report,/serotonina-acuarela\.avif/);
assert.match(pilot,/<strong>Nutrición Con-Ciencia<\/strong><small>PRO · PRIVADO<\/small>/,
 "Login/onboarding must use the approved public brand; internal EFG identifiers remain unchanged");
const progress=read("../pilot/progress-charts.js");
assert.match(progress,/NUTRICIÓN CON-CIENCIA · EVOLUCIÓN/,
 "Progress graphs must carry public name without changing graph logic");
assert.match(pilot,/efg-nutrition-habitual-v1:/,
 "Old saved meal keys must remain stable for existing users");
assert.match(pilot,/efg-nutrition-habitual-v2:/,
 "New saved meal keys must remain stable for existing users");
assert.match(pilot,/efgNutritionCoachConsent:/,
 "Session consent keys must NOT be renamed during visual brand change");
const daily=read("../pilot/daily-report.js");
assert.match(daily,/NUTRICIÓN CON-CIENCIA \| INFORME DIARIO/,
 "Daily report must not retain legacy visible title");
assert.match(pilot,/class="pilot-logo"/,
 "Do not replace the existing sidebar layout or technical class");
const brandCSS=read("../pilot/premium-system.css");
assert.match(brandCSS,/BRAND-78 responsive visible-name fit/,
 "The longer visible name must have a responsive layout");
assert.match(brandCSS,/\.efg-mobile-brand-text\{min-width:0;white-space:normal\}/,
 "The longer public name must wrap instead of overflowing narrow iPhones");
const intro=read("../pilot/science-welcome.js");
assert.match(intro,/serotonina-acuarela\.avif/);
assert.match(intro,/SCIENCE_WELCOME_ENABLED=false/);
assert.match(read("../pilot/index.html"),/science-welcome\.css\?v=/);
console.log("PASS BRAND-78: all direct pilot UI assets and 14 critical files use Nutrición Con-Ciencia, with original serotonin logo in app and report. Static only, no host rebrand certification.");
