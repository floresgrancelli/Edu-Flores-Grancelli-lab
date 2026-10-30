import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COACH_STUDENT_JOURNEY_ENABLED,renderCoachPlanWaiting} from '../pilot/coach-student-journey.js';
import {PILOT_PARTICIPATION_ENABLED,renderPilotParticipationNotice} from '../pilot/pilot-participation-demo.js';
const pilot=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
assert.equal(COACH_STUDENT_JOURNEY_ENABLED,false,
 'The new route MUST remain OFF until signed JWT A/B, server write gate and atomic goal+guide publication.');
assert.equal(PILOT_PARTICIPATION_ENABLED,false,'Standalone demo must not unlock access.');
const notice=renderPilotParticipationNotice({serverReceipts:true});
assert.match(notice,/se guardarán en el servidor con tu cuenta/);
assert.doesNotMatch(notice,/Esta pantalla es una simulación/);
assert.match(notice,/id="efgPilotParticipate" required/);
assert.match(notice,/id="efgPilotShare" required/);
assert.doesNotMatch(notice,/<input[^>]+checked/i,'No prechecking either opt-in');
assert.match(renderCoachPlanWaiting(),/Tu coach está preparando tu plan/);
assert.match(renderCoachPlanWaiting(),/openMessages/);
for(const token of [
 'import {COACH_STUDENT_JOURNEY_ENABLED,renderCoachPlanWaiting}',
 'import {fetchCoachPilotEntry}', 'import {loadCoachPilotGeneralIntake,submitCoachPilotGeneralIntake}',
 'import {acceptPilotParticipation}', 'renderPilotParticipationNotice({serverReceipts:true})',
 'state.coachPilotEntry=await fetchCoachPilotEntry(sb,{profile:state.profile});',
 'state.coachPilotIntake=(await loadCoachPilotGeneralIntake(sb,{profile:state.profile})).intake;',
 'if(action==="pilotDemoContinue")','await acceptPilotParticipation(sb,choice,{explicitSubmit:true});',
 'if(action==="openMessages"&&COACH_STUDENT_JOURNEY_ENABLED',
 'syncPilotParticipationContinueButton(document);return;',
 'await submitCoachPilotGeneralIntake(sb,{profile:state.profile,payload:data.payload,'
 ])assert.ok(pilot.includes(token),'Expected pilot integration: '+token);
const index=pilot.indexOf('if(state.profile.role==="student"&&COACH_STUDENT_JOURNEY_ENABLED){');
const old=pilot.indexOf('if(state.profile.role==="student"&&COACH_RELAUNCH_ONBOARDING_ENABLED){',index);
assert.ok(index>0&&old>index,'Signed new pilot must take priority when enabled.');
const signout=pilot.match(/if\(action==="logout"\)\{[^\n]+/);
assert.ok(signout&&signout[0].includes('state.coachPilotEntry=null;')&&
 signout[0].includes('state.coachPilotIntake=null;')&&
 signout[0].includes('state.foodCompatEvidence=[];'),
 'Signing out must clear new private pilot, compatibility, and old session caches.');
assert.match(pilot,/if\(COACH_RELAUNCH_ONBOARDING_ENABLED\)throw Error\("Ingreso piloto duplicado/);
assert.match(pilot,/if\(!data.shareWithCoach\)throw Error\("Para continuar compartí la ficha/);
console.log('PASS COACH113: signed pilot entry and consent-driven intake UI wired but OFF; waiting preserves messaging; session caches cleared.');
