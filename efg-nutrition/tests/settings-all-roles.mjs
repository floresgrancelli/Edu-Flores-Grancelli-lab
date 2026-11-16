import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');

test('Configuración is routed to every signed-in role and shows version controls',()=>{
 assert.match(app,/function settingsView\(\)\{/);
 assert.match(app,/settings:settingsView,recipes:/);
 const view=app.split('function settingsView(){')[1]?.split('function studentMoreView(){')[0]||'';
 assert.match(view,/versionCheckCard\(\)/);
 assert.match(view,/data-act="logout"/);
 assert.doesNotMatch(view,/coachIntakeForms|efg_coach_|\.from\(/,'No privileged data queries in role-neutral settings');
});

test('Student sees Configuración, including waiting-for-coach navigation',()=>{
 const secondary=app.split('function studentSecondaryNavigation(){')[1]?.split('function studentPendingTabAllowed(tab){')[0]||'';
 assert.match(secondary,/entries\.push\(\["settings","","Configuración","lilac"\]\)/);
 assert.match(app,/\["intake","messages","nutritionScience","privacy","notifications","studentMore","settings"\]\.includes\(tab\)/);
});

test('Coach and administrator get their own Configuración menu card',()=>{
 const coach=app.split('function coachPersonalMoreView(){')[1]?.split('function settingsView(){')[0]||'';
 const admin=app.split('function adminMoreView(){')[1]?.split('function currentWeekMonday(){')[0]||'';
 assert.match(coach,/\["settings","⚙️","Configuración","lilac"\]/);
 assert.match(admin,/\["settings","⚙️","Configuración","lilac"\]/);
 assert.match(app,/role==="coach"&&\["recipes","supplements","sport","weight","planner","settings"\]/);
 assert.match(app,/"adminManage","settings"\]\.includes\(state\.tab\)/);
});

test('Settings card offers explicit on-demand update; no automatic reload',()=>{
 assert.match(app,/function versionCheckCard\(\)/);
 assert.match(app,/data-act="checkAppVersion"/);
 assert.match(app,/data-act="applyAppVersion"/);
 assert.match(app,/versionNotice\.apply\(\{explicitClick:true,discardConfirmed\}\)/);
});


test("Configuración is reachable while student waits for coach",()=>{
 const guarded=app.split('else if(pilot?.route==="review"||pilot?.route==="private"){')[1]||"";
 assert.match(guarded,/else if\(state\.tab==="settings"\)frame\(settingsView\(\)\)/);
});
// Regression: a student awaiting Coach approval must reach Settings, not the waiting screen.
