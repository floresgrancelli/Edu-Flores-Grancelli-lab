// COACH96 safe frontend subset: Node-only assertions, zero remote data, zero writes.
// This QA intentionally does NOT certify staged legal, intake, atomic publication or physical UAT.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sciencePanels,renderScienceVerticalView,SCIENCE_WELCOME_ENABLED}
 from '../pilot/science-welcome.js';
const get=file=>readFileSync(new URL('../pilot/'+file,import.meta.url),'utf8');
const main=get('pilot.js'),html=get('index.html');
const page=renderScienceVerticalView();
assert.equal(SCIENCE_WELCOME_ENABLED,false,'Do not activate server-bound first-time receipt');
assert.equal(sciencePanels().length,8,'Keep eight approved educational sections');
assert.match(page,/data-science-step="8"/);
assert.match(page,/ns-wellbeing-title/);
assert.match(page,/serotonina-acuarela\.avif/);
assert.match(page,/ns-fuentes/);
assert.match(page,/Contenido educativo general/);
assert.match(main,/science:scienceLibraryView/);
assert.match(main,/function scienceLibraryView\(\)/);
assert.match(main,/renderScienceVerticalView\(\)/);
assert.ok((main.match(/\["science","🧠","Nutrición Con-Ciencia","lilac"\]/g)||[]).length===3,
 'Student, coach and admin must all have the same visible science entry');
assert.match(main,/import \{renderScienceVerticalView\} from "\.\/science-welcome\.js/);
assert.match(html,/meta name="efg-build" content="20261030-coach96-safe-static1"/);
assert.match(html,/pilot\.js\?v=20261030-coach96-safe-static1/);
for(const css of ['nutrition-science.css','science-welcome.css','science-wellbeing.css','serotonin-loading.css'])
 assert.ok(html.includes('./'+css+'?v=20261030-coach96-static1'),'missing CSS '+css);
// These server-bound flows are not installed or enabled in the safe subset.
for(const forbidden of [
 'COACH_RELAUNCH_ONBOARDING_ENABLED','COACH_ATOMIC_PLAN_UI_ENABLED',
 'COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED','efg_publish_coach_plan_draft',
 'efg_ack_science_intro','efg_legal_current_status','PERSONAL_WORKSPACE_ENABLED'
])assert.ok(!main.includes(forbidden),'unexpected backend dependency '+forbidden);
// No auto consent/onboarding and no new write RPCs. Existing production flows remain unchanged.
assert.ok(!html.includes('supabase')&&!page.includes('data-act="acceptLegal"'));
console.log('PASS COACH96: Nutrición Con-Ciencia page for all 3 roles, 8 sections, serotonin final, no release backend or sensitive health activation.');
