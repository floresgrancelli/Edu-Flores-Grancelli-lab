import {expectedReleaseFlag} from './approved-release-flags.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderPilotParticipationNotice} from '../pilot/pilot-participation-demo.js';
import {COACH_STUDENT_JOURNEY_ENABLED} from '../pilot/coach-student-journey.js';
const ui=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
assert.equal(COACH_STUDENT_JOURNEY_ENABLED,expectedReleaseFlag("COACH_STUDENT_JOURNEY_ENABLED"),'Do not activate without atomic plan publisher and RLS diary write gate');
assert.match(ui,/fetchCoachPilotEntry\(sb,\{profile:state\.profile\}\)/);
assert.match(ui,/renderPilotParticipationNotice\(\{serverReceipts:true\}\)/);
assert.match(ui,/acceptPilotParticipation\(sb,choice,\{explicitSubmit:true\}\)/);
assert.match(ui,/readPilotParticipationSelection\(document,\{explicitClick:true\}\)/);
assert.match(ui,/syncPilotParticipationContinueButton\(document\)/);
assert.match(ui,/renderCoachPlanWaiting\(\)/);
assert.doesNotMatch(ui,/\["history","home","summaries"\]\.includes\(state\.tab\)\|\|pilot\.route==="private"/,
 'Student HOME after submitting a shared intake cannot hide the waiting-for-Coach view');
assert.match(ui,/else if\(\["history","summaries"\]\.includes\(state\.tab\)\)/);
assert.match(ui,/else if\(pilot\.route==="private"\)/,
 'A private unshared intake needs a distinct message, not a misleading Coach waiting state');
assert.match(ui,/else\s+\/\/ Home after submission must show the promised waiting-for-coach screen\./);
assert.match(ui,/state\.tab="messages";await render\(\)/);
assert.match(ui,/submitCoachPilotGeneralIntake\(sb,\{profile:state\.profile,payload:data\.payload/);
assert.match(ui,/expectedRevision:state\.coachPilotIntake\?\.revision\?\?0/);
assert.match(ui,/if\(state\.coachPilotEntry\.route!=="ready"\)return render\(\)/);
assert.match(ui,/if\(!\["ready","review","private"\]\.includes\(state\.coachPilotEntry\.route\)\)\{await contextRead\(render\(\)\);return;\}/);
assert.match(ui,/if\(state\.tab==="nutritionScience"\)frame\(renderScienceVerticalView\(\)\)/,
 'Waiting pupil has access to approved science library without unlocking diaries');
const server=renderPilotParticipationNotice({serverReceipts:true});
assert.match(server,/se guardarán en el servidor/i);
assert.doesNotMatch(server,/Esta pantalla es una simulación/);
assert.match(server,/No equivalen a términos legales definitivos/);
assert.ok(!/checked(?:\s|>)/i.test(server));
const demo=renderPilotParticipationNotice();
assert.match(demo,/Esta pantalla es una simulación/,'Existing mock mode must retain its disclaimer');
console.log('PASS COACH113: complete pilot UI route wired behind OFF flag, real receipts, revised general intake, waiting+messages; no clinical consent pretended.');
