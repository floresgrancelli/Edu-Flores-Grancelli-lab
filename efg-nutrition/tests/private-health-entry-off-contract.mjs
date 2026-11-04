import {expectedReleaseFlag} from './approved-release-flags.mjs';
// COACH01-05: the actual PWA route is connected for future authorized rollout
// but stays completely OFF while hosted private health/consent is unavailable.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRIVATE_HEALTH_DECLARATION_UI_ENABLED,
 createStudentRestrictionDeclaration} from '../pilot/student-restriction-declaration.js';
import {COACH_STUDENT_JOURNEY_ENABLED} from '../pilot/coach-student-journey.js';
import {CLINICAL_GUIDE_CONNECTION_ENABLED} from '../pilot/clinical-guide-connection.js';
assert.equal(PRIVATE_HEALTH_DECLARATION_UI_ENABLED,expectedReleaseFlag("PRIVATE_HEALTH_DECLARATION_UI_ENABLED"),'No health route for live users');
assert.equal(COACH_STUDENT_JOURNEY_ENABLED,expectedReleaseFlag("COACH_STUDENT_JOURNEY_ENABLED"),'Onboarding itself remains OFF');
assert.equal(CLINICAL_GUIDE_CONNECTION_ENABLED,false,'No clinical guide');
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
for(const token of [
 'import {PRIVATE_HEALTH_DECLARATION_UI_ENABLED,createStudentRestrictionDeclaration}',
 'state.privateHealthDeclaration=createStudentRestrictionDeclaration({sb,',
 'sessionId:state.privateHealthSessionNonce',
 'epoch:Number.isSafeInteger(state.authContextEpoch)',
 'role:state.profile?.role,',
 'const allowed=PRIVATE_HEALTH_DECLARATION_UI_ENABLED&&COACH_STUDENT_JOURNEY_ENABLED',
 'intake?.student_id===userId&&intake.organization_id===profile.organization_id',
 'intake.completed_version===COACH_RELEASE_INTAKE_VERSION',
 '["private","review","ready"].includes(route)',
 'else if(PRIVATE_HEALTH_DECLARATION_UI_ENABLED&&state.tab==="privateHealth")',
 '&&PRIVATE_HEALTH_DECLARATION_UI_ENABLED&&state.tab==="privateHealth"',
 'state.privateHealthDeclaration?.invalidate?.();',
 'state.privateHealthSessionNonce=null;',
 'state.privateHealthDeclaration.open(mount);',
 'visibleMenu.map(m=>',
 'Mis restricciones'
])assert.ok(app.includes(token),'Private health UI missing safe entry guard: '+token);
assert.ok(!app.includes('PRIVATE_HEALTH_DECLARATION_UI_ENABLED=true'));
const student='11111111-1111-4111-8111-111111111111';
const org='22222222-2222-4222-8222-222222222222';
let serverReads=0;
const sb={auth:{getUser:async()=>{serverReads++;return {data:{user:{id:student}}};}},
 rpc:async()=>{serverReads++;return {data:null};}};
const controller=createStudentRestrictionDeclaration({sb,enabled:false,
 readContext:()=>({userId:student,organizationId:org,sessionId:org,epoch:1,role:'student',active:true})});
await assert.rejects(controller.load(),/sesión de alumno verificada/);
await assert.rejects(controller.declare({noneDeclared:true,processing:true,sharing:true}));
assert.equal(serverReads,0,'OFF feature must do no health or consent RPC');
const privateModule=readFileSync(new URL('../pilot/student-restriction-declaration.js',import.meta.url),'utf8');
assert.doesNotMatch(privateModule,/localStorage|sessionStorage|setItem\(/i,
 'Sensitive details may never persist in browser storage');
console.log('PASS COACH01-05 OFF: actual student route guarded by signed entry/current intake; no sensitive RPCs before activation; sign-out clears private context.');
