// BRAND-78: user-visible rebranding on critical app, report, release and PWA surfaces.
// Not a declaration that every legacy file or native store listing has been renamed.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const files=[
 "../index.html","../pilot/index.html","../pilot/pilot.js",
 "../pilot/weekly-luxury-report.js","../pilot/release-communications.js",
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
const pilot=read("../pilot/pilot.js");
assert.equal((pilot.match(/\["nutritionScience","✦","Nutrición Con-Ciencia"\]/g)||[]).length,2,
 "Both mobile nav bars must show full tab name");
assert.equal((pilot.match(/\["nutritionScience","🧠","Nutrición Con-Ciencia"/g)||[]).length,2,
 "Both More menus must display full name");
assert.match(pilot,/nutritionScience:renderScienceVerticalView/);
assert.match(pilot,/renderScienceWelcomeStep\(state\.scienceWelcomeStep/);
const html=read("../pilot/index.html");
assert.match(html,/<title>Nutrición Con-Ciencia/);
assert.match(html,/pilot-loader-wordmark">Nutrición Con-Ciencia/);
assert.match(html,/serotonina-acuarela\.avif/);
const report=read("../pilot/weekly-luxury-report.js");
assert.match(report,/Nutrición Con-Ciencia/);
assert.match(report,/serotonina-acuarela\.avif/);
const intro=read("../pilot/science-welcome.js");
assert.match(intro,/serotonina-acuarela\.avif/);
assert.match(intro,/SCIENCE_WELCOME_ENABLED=false/);
assert.match(read("../pilot/index.html"),/science-welcome\.css\?v=/);
console.log("PASS BRAND-78: 12 user-visible files use Nutrición Con-Ciencia, with original serotonin logo in app and report. Static only, no host rebrand certification.");
