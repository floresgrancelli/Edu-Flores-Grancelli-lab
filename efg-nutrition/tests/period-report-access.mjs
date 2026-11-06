// Screenshot regression: existing admin-test owner permission must reach date inputs.
// Uses source metadata + synthetic accounts only; never establishes live RLS parity.
import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {createPeriodReportHistory} from '../pilot/period-report-history.js';
import {buildLuxuryPeriodReport} from '../pilot/period-luxury-report.js';
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
function between(a,b){const i=app.indexOf(a),j=app.indexOf(b,i);assert.ok(i>=0&&j>i);return app.slice(i,j);}
const state={profile:{user_id:'admin-ficticio',role:'admin',active:true},session:{user:{id:'admin-ficticio'}},org:{id:'org-ficticia',coach_id:'admin-ficticio',is_test:true,status:'trial'},selectedStudent:'alumno-ficticio',roster:[{user_id:'alumno-ficticio',organization_id:'org-ficticia',role:'student',active:true}],consent:{student_id:'alumno-ficticio',organization_id:'org-ficticia',accepted:true},authContextEpoch:1};
const ctx={state,today:()=> '2026-11-06'};vm.createContext(ctx);vm.runInContext(between('function periodReportContext(){','// A PDF is an immutable approved snapshot.')+between('function coachPeriodReportPanel(){','function coachReportsView(){')+';this.context=periodReportContext;this.panel=coachPeriodReportPanel;this.matches=periodContextMatches;',ctx);
assert.match(ctx.panel(),/id="periodReportFrom"/,'Existing admin-test owner permission must show date controls');assert.match(ctx.panel(),/id="periodReportTo"/);assert.equal(ctx.context().canPublish,true);assert.equal(ctx.context().role,'admin','Never disguise an admin as coach');
const good=structuredClone(state),reset=()=>{for(const k of Object.keys(state))delete state[k];Object.assign(state,structuredClone(good));};
for(const [label,mutate]of [
 ['non-test admin',s=>s.org.is_test=false],['other owner',s=>s.org.coach_id='another'],['inactive admin',s=>s.profile.active=false],['other profile',s=>s.profile.user_id='another'],['no org',s=>s.org=null],['suspended org',s=>s.org.status='suspended'],['other student org',s=>s.roster[0].organization_id='another'],['inactive student',s=>s.roster[0].active=false],['non-student roster row',s=>s.roster[0].role='coach'],['revoked consent',s=>s.consent.accepted=false],['other consent org',s=>s.consent.organization_id='another'],['other consent student',s=>s.consent.student_id='another'],['no session',s=>s.session=null]
 ]){reset();mutate(state);assert.equal(ctx.context().allowed,false,label);assert.doesNotMatch(ctx.panel(),/id="periodReportFrom"/,label);}
reset();const captured=ctx.context();for(const mutate of [s=>s.profile.role='coach',s=>s.org.id='another',s=>s.org.coach_id='another',s=>s.authContextEpoch++,s=>s.selectedStudent='another']){reset();mutate(state);assert.equal(ctx.matches(captured),false);}
reset();let inserted=null;const model=buildLuxuryPeriodReport({from:'2026-10-01',to:'2026-10-01',friday:'2026-10-02',days:[{date:'2026-10-01',hasData:true,closed:true,mealCount:1,k:100,p:10,c:10,f:2,fi:1}]});
const sb={from(){return {async insert(row){inserted=row;return {};},select(){return {eq(){return this;},async single(){return {data:inserted};}};}};}};
const client=createPeriodReportHistory({sb,context:ctx.context});const result=await client.publish({model,requestId:'synthetic-id',confirmed:true});assert.equal(result.coach_id,'admin-ficticio');assert.equal(state.profile.role,'admin');
reset();state.profile.role='student';state.session.user.id='alumno-ficticio';await assert.rejects(client.publish({model,requestId:'blocked-id',confirmed:true}));
console.log('PASS period admin-test owner date controls + author identity; normal admin/other org/owner/inactive/missing consent/student-publish blocked; role/org/epoch changes invalidated. Source-backed synthetic test, not live RLS.');
