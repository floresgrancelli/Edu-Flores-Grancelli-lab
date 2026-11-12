// Executes actual pilot routing/publication source with a bounded DOM/transport substitute.
// This is lifecycle/serialization coverage, not browser or database/RLS coverage.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {buildLuxuryWeeklyReport,reportAsStoredText,parseLuxuryWeeklyReport} from '../pilot/coach-report-models.js';
import {createLuxuryWeeklyEditor} from '../pilot/weekly-luxury-editor.js';
import {createWeeklyReportDelivery} from '../pilot/weekly-report-delivery.js';
import {WEEKLY_PDF_RENDERER_VERSION} from '../pilot/weekly-report-pdf.js';
const source=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
function between(a,b){const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start);return source.slice(start,end);}
const model=buildLuxuryWeeklyReport({from:'2026-10-30',to:'2026-11-05',friday:'2026-11-06',studentName:'Alumna FICTICIA',coachName:'Coach FICTICIO',days:[{date:'2026-10-30',hasData:true,closed:true,mealCount:2,k:1900,p:110,c:230,f:55}],goals:[],logs:[]});
let spec,reviewed=false,failInsert=false,failRead=false,lostResponse=false,gate=null,refreshGate=null,release,generated=0,inserts=0,renders=0,returns=0;
const rows=[],host={isConnected:true},fields={weeklyCoachConclusion:{value:'Texto final ficticio\n\nCon párrafos.'},weeklyCoachFlexibleNote:{value:'Nota ficticia'},coachReportWeek:host};
const state={session:{user:{id:'coach-ficticio'}},profile:{role:'coach'},org:{id:'org-ficticia',coach_id:'coach-ficticio',is_test:true},authContextEpoch:1,selectedStudent:'alumna-ficticia',consent:{accepted:true},roster:[{user_id:'alumna-ficticia',active:true}],coachHistory:[]};
const weeklyPdfReview={open(options){spec=options;spec.send={textContent:""};spec.status={textContent:""};reviewed=false;return options;},requireReviewed(text){if(!reviewed||!spec?.editable||!spec.isCurrent()||spec.serialized!==text)throw Error('PDF no revisado');return spec;},setSubmitting(view,value){view.submitting=value;},canReturn(view){return spec===view&&reviewed&&view.editable&&view.isOriginCurrent();},complete(view,refresh){if(!this.canReturn(view))return false;refresh?.();returns++;this.close();return true;},close(){spec=null;reviewed=false;}};
const ctx={createWeeklyReportDelivery,state,document:{getElementById:id=>fields[id],querySelector:()=>null},weeklyCoachDraft:()=>"SYNTHETIC_SHARED_PANEL",coachLuxuryHistoryPanel:()=>"SYNTHETIC_HISTORY",weeklyPdfReview,WEEKLY_PDF_RENDERER_VERSION,buildCurrentLuxuryModel:()=>{generated++;return structuredClone(model);},luxuryWeeklyEditor:createLuxuryWeeklyEditor(),luxuryEditorContext:m=>({coachId:state.session.user.id,studentId:state.selectedStudent,weekEnding:m.friday,model:m}),weeklyReportEnd:()=>model.friday,parseLuxuryWeeklyReport,reportAsStoredText,confirm:()=>true,myWeeklyReports:[],notify(){},render:async()=>{renders++;weeklyPdfReview.close();},sb:{from(table){assert.equal(table,'efg_weekly_reports');const q={async insert(record){inserts++;if(gate)await gate;if(failInsert)return {error:Object.assign(Error('SYNTHETIC_INSERT_FAILURE'),{code:'42501'})};rows.push(structuredClone(record));if(lostResponse)throw Error("LOST_RESPONSE");return {error:null};},select(){return q;},eq(){return q;},order(){return q;},limit(){if(refreshGate)return refreshGate;return Promise.resolve(failRead?{error:Error('SYNTHETIC_REFRESH_FAILURE')}:{data:structuredClone(rows)});}};return q;}}};
vm.createContext(ctx);
vm.runInContext(between('let weeklyPublishPending=false;','const luxuryWeeklyEditor=createLuxuryWeeklyEditor();')+between('function openWeeklyPdfView(','function periodReportContext(){')+';this.open=openWeeklyPdfView;this.publish=publishWeeklyReport;',ctx);
ctx.open(-1,{});assert.equal(spec.editable,true);assert.equal(spec.snapshot.approvedByCoach,true);assert.equal(spec.snapshot.pdfRendererVersion,WEEKLY_PDF_RENDERER_VERSION);assert.equal(spec.serialized,JSON.stringify(spec.snapshot));
await assert.rejects(ctx.publish(),/PDF no revisado/);assert.equal(inserts,0);
reviewed=true;const approvedText=spec.serialized;
fields.weeklyCoachConclusion.value+=' editado';assert.equal(spec.isCurrent(),false);await assert.rejects(ctx.publish());assert.equal(inserts,0);fields.weeklyCoachConclusion.value='Texto final ficticio\n\nCon párrafos.';
ctx.open(-1,{});reviewed=true;state.authContextEpoch++;assert.equal(spec.isCurrent(),false);await assert.rejects(ctx.publish());state.authContextEpoch--;
ctx.open(-1,{});reviewed=true;state.consent.accepted=false;await assert.rejects(ctx.publish(),/sin autorización/);state.consent.accepted=true;
ctx.open(-1,{});reviewed=true;failInsert=true;await assert.rejects(ctx.publish(),/SYNTHETIC_INSERT_FAILURE/);assert.equal(state.coachHistory.length,0);assert.equal(fields.weeklyCoachConclusion.value,'Texto final ficticio\n\nCon párrafos.');assert.equal(spec.submitting,false);
failInsert=false;gate=new Promise(r=>release=r);failRead=true;
const pending=ctx.publish();await Promise.resolve();await assert.rejects(ctx.publish(),/publicación anterior/);assert.equal(inserts,2);release();await pending;gate=null;
assert.equal(state.coachHistory.length,1,'Confirmed INSERT populates history even when refresh fails');assert.equal(rows[0].report_text,approvedText);assert.equal(renders,0,'Return must not globally rerender or discard the independent period draft');assert.equal(returns,1);assert.equal(host.outerHTML,'SYNTHETIC_SHARED_PANEL');await assert.rejects(ctx.publish(),/Ya existe/);
const before=generated;ctx.open(-1,{});assert.equal(spec.editable,undefined);assert.equal(generated,before,'Shared history never calls current model');assert.equal(JSON.stringify(spec.snapshot),approvedText);assert.equal(spec.isCurrent(),true);
ctx.myWeeklyReports=structuredClone(rows);state.profile.role='student';state.session={user:{id:'alumna-ficticia'}};ctx.open(0,{});assert.equal(JSON.stringify(spec.snapshot),approvedText);assert.equal(spec.editable,undefined);assert.throws(()=>ctx.open(-1,{}),/autorización/);
state.profile.role='coach';state.session={user:{id:'coach-ficticio'}};state.coachHistory=[{week_ending:model.friday,report_text:'Informe histórico FICTICIO\nTexto guardado exacto.'}];ctx.open(-1,{});assert.equal(spec.snapshot.kind,'efg_legacy_weekly_text_v1');assert.equal(spec.snapshot.reportText,state.coachHistory[0].report_text);assert.equal(generated,before);assert.equal(spec.editable,undefined);
state.coachHistory=[{week_ending:'2026-10-30',report_text:approvedText}];assert.throws(()=>ctx.open(0,{}),/no coincide/);
state.coachHistory=[{week_ending:model.friday,report_text:'{"kind":"broken"}'}];assert.throws(()=>ctx.open(-1,{}),/formato válido/);
state.coachHistory=[];state.profile.role='admin';state.org.coach_id='other';assert.throws(()=>ctx.open(-1,{}),/autorización/);state.org.coach_id='coach-ficticio';ctx.open(-1,{});assert.equal(spec.editable,true);
reviewed=true;failRead=false;gate=new Promise(r=>release=r);const late=ctx.publish();await Promise.resolve();state.selectedStudent='other';state.coachHistory=[{sentinel:'untouched'}];release();await late;assert.deepEqual(state.coachHistory,[{sentinel:'untouched'}]);
assert.match(source,/async function render\(\)\{\s*weeklyPdfReview\.close\(true\)/);
// Additional session cleanup may precede the PDF/editor reset. Execute the exact
// reset instead of requiring weeklyPdfReview to be the first statement. Keep the
// original forced-PDF-close/editor order and prove that dual teardown is required.
const resetSource=between('function resetPrivateSession(){','function handleAuthStateChange(');
function assertSessionResetLifecycle(reset){
 const calls=[],sessionState={dualCandidateCoach:true,session:{user:{id:'SYNTHETIC_OLD'}},profile:{role:'coach'}};
 const context={studentGuideSheet:{owner:'OLD'},studentGuideDrafts:new Map([['OLD',[{qty:'123'}]]]),recipeSheet:{owner:'OLD'},recipeSheetDrafts:new Map([['OLD',{qty:'2'}]]),recipeRegistrationBusy:true,state:sessionState,
  dualWorkspaceBootstrap:{invalidate:()=>calls.push('dual-bootstrap')},
  dualWorkspaceFrame:{invalidate:()=>calls.push('dual-frame')},
  professionalReleaseFrame:{invalidate:()=>calls.push('professional-release-frame')},
  weeklyPdfReview:{close:force=>calls.push(force===true?'weekly-close-forced':'weekly-close-unforced')},
  luxuryWeeklyEditor:{reset:()=>calls.push('weekly-editor')},weeklyReportDelivery:{clear(){}},
  closePeriodPdfView(){},pilotGuideLifecycle:{invalidate(){}},coachAdaptedWorkspace:{close(){}},
  pendingMealRegistrations:new Set(),pendingHabitualSlots:new Set()};
 assert.match(reset,/weeklyPdfReview\.close\(true\);luxuryWeeklyEditor\.reset\(\)/,
  'Forced weekly PDF close must still immediately precede editor reset');
 vm.runInNewContext(reset+';resetPrivateSession();',context);
 assert.equal(context.studentGuideSheet,null);assert.equal(context.studentGuideDrafts.size,0);
 assert.equal(context.recipeSheet,null);assert.equal(context.recipeSheetDrafts.size,0);assert.equal(context.recipeRegistrationBusy,false);
 assert.deepEqual(calls,['dual-bootstrap','dual-frame','professional-release-frame','weekly-close-forced','weekly-editor'],
  'Each dual invalidation must execute once before the existing PDF/editor cleanup');
 assert.equal(sessionState.dualCandidateCoach,false,'Candidate shell marker must clear');
 assert.equal(sessionState.session,null);assert.equal(sessionState.profile,null);
}
assertSessionResetLifecycle(resetSource);
for(const required of ['dualWorkspaceBootstrap.invalidate();','state.dualCandidateCoach=false;',
 'dualWorkspaceFrame.invalidate();','professionalReleaseFrame.invalidate();','weeklyPdfReview.close(true);','luxuryWeeklyEditor.reset();']){
 assert.equal(resetSource.split(required).length,2,'Required cleanup occurs exactly once: '+required);
 assert.throws(()=>assertSessionResetLifecycle(resetSource.replace(required,'')),
  'Removing required cleanup must fail: '+required);
}
assert.throws(()=>assertSessionResetLifecycle(resetSource.replace('weeklyPdfReview.close(true)','weeklyPdfReview.close(false)')),
 'An unforced weekly PDF close must still fail the original lifecycle contract');
console.log('PASS actual weekly route/publisher: versioned exact snapshot; unreviewed/edit/epoch/consent gates; readonly JSON + plaintext history; no live-data fallback; failed/double/late INSERT; failed refresh; admin scope; lifecycle cleanup. Synthetic DOM/transport only.');

// A lost response keeps the original PDF across close/edit attempts/reopen, then reconciles.
state.profile.role='coach';state.selectedStudent='alumna-ficticia';state.coachHistory=[];state.consent.accepted=true;state.authContextEpoch++;
gate=null;rows.length=0;failRead=true;lostResponse=true;
ctx.open(-1,{});reviewed=true;const frozen=spec.serialized;const beforeLoss=inserts;
await assert.rejects(ctx.publish(),/No se confirmó/);assert.equal(fields.weeklyCoachConclusion.disabled,true);assert.equal(rows.length,1);
weeklyPdfReview.close();fields.weeklyCoachConclusion.value='No debe reemplazar el snapshot pendiente';ctx.open(-1,{});assert.equal(spec.serialized,frozen);assert.equal(spec.snapshot.conclusion,JSON.parse(frozen).conclusion);
reviewed=true;failRead=false;lostResponse=false;await ctx.publish();assert.equal(inserts,beforeLoss+1,'Reopen/retry reconciles the first INSERT, without a second write');assert.equal(state.coachHistory[0].report_text,frozen);
console.log('PASS actual weekly close/reopen after lost response: immutable PDF retained; edits blocked; readback confirms without resend.');

// Exact publisher must not return after another view/context has taken ownership.
for(const change of ['close','tab','student','epoch','host']){
 state.profile.role='coach';state.selectedStudent='alumna-ficticia';state.coachHistory=[];state.tab='reports';state.consent.accepted=true;
 fields.coachReportWeek=host;rows.length=0;failRead=false;lostResponse=false;
 ctx.open(-1,{});reviewed=true;gate=new Promise(r=>release=r);const beforeReturn=returns,beforeRender=renders;
 const pending=ctx.publish();await Promise.resolve();
 if(change==='close')weeklyPdfReview.close();
 if(change==='tab')state.tab='messages';
 if(change==='student')state.selectedStudent='other';
 if(change==='epoch')state.authContextEpoch++;
 if(change==='host')fields.coachReportWeek={isConnected:true};
 release();await pending;gate=null;
 assert.equal(returns,beforeReturn,change+' must not return late');assert.equal(renders,beforeRender);
 assert.equal(state.coachHistory.length,0,change+' must not repaint the abandoned source');
}
// The second await (history refresh) cannot reclaim a closed or newer source either.
for(const change of ['close','tab','replacement']){
 state.selectedStudent='alumna-ficticia';state.tab='reports';state.coachHistory=[];fields.coachReportWeek=host;rows.length=0;
 ctx.open(-1,{});reviewed=true;let releaseRefresh;refreshGate=new Promise(r=>releaseRefresh=r);
 const beforeReturn=returns;const pending=ctx.publish();while(!state.coachHistory.length)await Promise.resolve();
 weeklyPdfReview.close();if(change==='tab')state.tab='messages';
 if(change==='replacement'){assert.throws(()=>ctx.open(-1,{}),/publicación anterior/);weeklyPdfReview.open({isCurrent:()=>true});}
 const newer=spec;state.coachHistory=[{sentinel:'new view history'}];
 releaseRefresh({data:structuredClone(rows)});await pending;refreshGate=null;
 assert.equal(returns,beforeReturn);assert.equal(spec,newer);assert.deepEqual(state.coachHistory,[{sentinel:'new view history'}]);
}
// A conflicting historical report is not a successful publication of this PDF.
state.selectedStudent='alumna-ficticia';state.tab='reports';fields.coachReportWeek=host;state.coachHistory=[];rows.length=0;
ctx.open(-1,{});reviewed=true;failRead=true;lostResponse=true;
await assert.rejects(ctx.publish(),/No se confirmó/);const conflictView=spec,beforeConflictReturn=returns;
rows[0].report_text='Another preserved historical report';failRead=false;lostResponse=false;
await assert.rejects(ctx.publish(),/informe distinto/);
assert.equal(spec,conflictView);assert.equal(returns,beforeConflictReturn);assert.match(spec.status.textContent,/No se reemplazó/);assert.equal(spec.completed,true);
assert.equal(state.coachHistory[0].report_text,'Another preserved historical report');assert.equal(renders,0);
console.log('PASS R12 weekly source ownership: confirmed share/reconciliation returns once, no global render, closed/tab/student/epoch/replaced origins never return late, conflict remains visible and history preserved.');

// An unresolved pre-R12 report must not gain the new voice, signature or renderer on retry.
const legacy={...JSON.parse(approvedText),pdfRendererVersion:'ncc-luxury-weekly-pdf-v1',conclusion:'Texto histórico EFG con tu coach.'};delete legacy.coachVoiceVersion;
state.selectedStudent='alumna-ficticia';state.tab='reports';state.coachHistory=[];state.authContextEpoch++;fields.coachReportWeek=host;rows.length=0;
ctx.legacyRecord={student_id:'alumna-ficticia',coach_id:state.session.user.id,week_ending:model.friday,report_text:JSON.stringify(legacy),updated_at:'2026-11-06T00:00:00Z'};
failRead=true;lostResponse=true;
await assert.rejects(vm.runInContext('weeklyReportDelivery.send({key:weeklyPublicationKey(),record:legacyRecord})',ctx),/No se confirmó/);
ctx.open(-1,{});assert.equal(spec.serialized,ctx.legacyRecord.report_text);assert.equal(spec.snapshot.coachVoiceVersion,undefined);
reviewed=true;failRead=false;lostResponse=false;const beforeLegacyRetry=inserts;await ctx.publish();
assert.equal(inserts,beforeLegacyRetry);assert.equal(state.coachHistory[0].report_text,ctx.legacyRecord.report_text);
console.log('PASS pre-R12 uncertain snapshot retry remains byte-for-byte identical, including old voice/signature/version.');
