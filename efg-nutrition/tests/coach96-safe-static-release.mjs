// COACH96: offline contract for an existing-backend, frontend-only release.
// Never call Supabase, change legacy sessions, or activate incomplete relaunch.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderScienceVerticalView,sciencePanels,SCIENCE_WELCOME_ENABLED} from '../pilot/science-welcome.js';
const file=name=>readFileSync(new URL('../pilot/'+name,import.meta.url),'utf8');
const app=file('pilot.js'),index=file('index.html'),science=file('science-welcome.js');
assert.equal(SCIENCE_WELCOME_ENABLED,false,'One-time onboarding requires hosted receipt table');
const panels=sciencePanels();
assert.equal(panels.length,8);
const html=renderScienceVerticalView();
assert.equal((html.match(/class="ns-library-panel"/g)||[]).length,8);
assert.match(html,/¿Qué son las calorías\?/);
assert.match(html,/Proteínas/);
assert.match(html,/Hidratos/);
assert.match(html,/bienestar/);
assert.match(html,/serotonina-acuarela\.avif/);
assert.match(html,/Contenido educativo general/);
assert.match(app,/import \{renderScienceVerticalView\} from "\.\/science-welcome\.js/);
assert.match(app,/function scienceLibraryView\(\)/);
assert.match(app,/science:scienceLibraryView,/);
for(const role of ['coach','student','admin']){
 // The role's existing navigation remains in the app and the static library
 // is available via Más or MI ESPACIO without a new backend.
 assert.match(app,new RegExp('role==="'+role+'"'));
}
assert.equal((app.match(/\["science","🧠","Nutrición Con-Ciencia","lilac"\]/g)||[]).length,3);
assert.match(app,/const moreTabs=\[[^\]]*"science"\]/);
assert.match(index,/content="20261030-coach96-safe-static1"/);
assert.match(index,/pilot\.js\?v=20261030-coach96-safe-static1/);
for(const asset of ['nutrition-science.css','science-welcome.css','science-wellbeing.css','serotonin-loading.css'])
 assert.ok(index.includes('./'+asset+'?v=20261030-coach96-static1'),asset+' absent');
assert.match(index,/efg-serotonin-stage/);
assert.match(index,/Nutrición Con-Ciencia/);
// Never replace existing consent, authentication, diary or coach workflows.
for(const flow of ['efg_claim_invitation','efg_confirm_payment','efg_set_student_active',
                    'efg_set_coach_plan','efg_set_seats']){
 assert.ok(app.includes(flow),'Existing hosted flow unexpectedly removed: '+flow);
}
assert.doesNotMatch(app,/efg_accept_legal_documents|efg_ack_science_intro|efg_publish_coach_plan_draft/);
assert.ok(!app.includes('COACH_RELAUNCH_ONBOARDING_ENABLED')&&!app.includes('COACH_ATOMIC_PLAN_UI_ENABLED'));
assert.match(science,/SCIENCE_WELCOME_ENABLED=false/);
console.log('PASS COACH96: eight static illustrated science panels, exact current-backend app, unchanged existing RPC contracts; once-only and SQL-backed relaunch NOT enabled.');
