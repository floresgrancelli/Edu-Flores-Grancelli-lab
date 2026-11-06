// Executes actual pilot routing/publication source with a bounded DOM/transport substitute.
// This is lifecycle/serialization coverage, not browser or database/RLS coverage.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {buildLuxuryWeeklyReport,reportAsStoredText,parseLuxuryWeeklyReport} from '../pilot/weekly-luxury-report.js';
import {createLuxuryWeeklyEditor} from '../pilot/weekly-luxury-editor.js';
import {createWeeklyReportDelivery} from '../pilot/weekly-report-delivery.js';
import {WEEKLY_PDF_RENDERER_VERSION} from '../pilot/weekly-report-pdf.js';
const source=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
function between(a,b){const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start);return source.slice(start,end);}
const model=buildLuxuryWeeklyReport({from:'2026-10-30',to:'2026-11-05',friday:'2026-11-06',studentName:'Alumna FICTICIA',coachName:'Coach FICTICIO',days:[{date:'2026-10-30',hasData:true,closed:true,mealCount:2,k:1900,p:110,c:230,f:55}],goals:[],logs:[]});
let spec,reviewed=false,failInsert=false,failRead=false,lostResponse=false,gate=null,release,generated=0,inserts=0,renders=0;
const rows=[],host={isConnected:true},fields={weeklyCoachConclusion:{value:'Texto final ficticio\n\nCon párrafos.'},weeklyCoachFlexibleNote:{value:'Nota ficticia'},coachReportWeek:host};
const state={session:{user:{id:'coach-ficticio'}},profile:{role:'coach'},org:{id:'org-ficticia',coach_id:'coach-ficticio',is_test:true},authContextEpoch:1,selectedStudent:'alumna-ficticia',consent:{accepted:true},roster:[{user_id:'alumna-ficticia',active:true}],coachHistory:[]};
const weeklyPdfReview={open(options){spec=options;spec.send={textContent:""};reviewed=false;return options;},requireReviewed(text){if(!reviewed||!spec?.editable||!spec.isCurrent()||spec.serialized!==text)throw Error('PDF no revisado');return spec;},setSubmitting(view,value){view.submitting=value;},close(){spec=null;reviewed=false;}};
const ctx={createWeeklyReportDelivery,state,document:{getElementById:id=>fields[id]},weeklyPdfReview,WEEKLY_PDF_RENDERER_VERSION,buildCurrentLuxuryModel:()=>{generated++;return structuredClone(model);},luxuryWeeklyEditor:createLuxuryWeeklyEditor(),luxuryEditorContext:m=>({coachId:state.session.user.id,studentId:state.selectedStudent,weekEnding:m.friday,model:m}),weeklyReportEnd:()=>model.friday,parseLuxuryWeeklyReport,reportAsStoredText,confirm:()=>true,myWeeklyReports:[],notify(){},render:async()=>{renders++;weeklyPdfReview.close();},sb:{from(table){assert.equal(table,'efg_weekly_reports');const q={async insert(record){inserts++;if(gate)await gate;if(failInsert)return {error:Object.assign(Error('SYNTHETIC_INSERT_FAILURE'),{code:'42501'})};rows.push(structuredClone(record));if(lostResponse)throw Error("LOST_RESPONSE");return {error:null};},select(){return q;},eq(){return q;},order(){return q;},limit(){return Promise.resolve(failRead?{error:Error('SYNTHETIC_REFRESH_FAILURE')}:{data:structuredClone(rows)});}};return q;}}};
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
assert.equal(state.coachHistory.length,1,'Confirmed INSERT populates history even when refresh fails');assert.equal(rows[0].report_text,approvedText);assert.equal(renders,1);await assert.rejects(ctx.publish(),/Ya existe/);
const before=generated;ctx.open(-1,{});assert.equal(spec.editable,undefined);assert.equal(generated,before,'Shared history never calls current model');assert.equal(JSON.stringify(spec.snapshot),approvedText);assert.equal(spec.isCurrent(),true);
ctx.myWeeklyReports=structuredClone(rows);state.profile.role='student';state.session={user:{id:'alumna-ficticia'}};ctx.open(0,{});assert.equal(JSON.stringify(spec.snapshot),approvedText);assert.equal(spec.editable,undefined);assert.throws(()=>ctx.open(-1,{}),/autorización/);
state.profile.role='coach';state.session={user:{id:'coach-ficticio'}};state.coachHistory=[{week_ending:model.friday,report_text:'Informe histórico FICTICIO\nTexto guardado exacto.'}];ctx.open(-1,{});assert.equal(spec.snapshot.kind,'efg_legacy_weekly_text_v1');assert.equal(spec.snapshot.reportText,state.coachHistory[0].report_text);assert.equal(generated,before);assert.equal(spec.editable,undefined);
state.coachHistory=[{week_ending:'2026-10-30',report_text:approvedText}];assert.throws(()=>ctx.open(0,{}),/no coincide/);
state.coachHistory=[{week_ending:model.friday,report_text:'{"kind":"broken"}'}];assert.throws(()=>ctx.open(-1,{}),/formato válido/);
state.coachHistory=[];state.profile.role='admin';state.org.coach_id='other';assert.throws(()=>ctx.open(-1,{}),/autorización/);state.org.coach_id='coach-ficticio';ctx.open(-1,{});assert.equal(spec.editable,true);
reviewed=true;failRead=false;gate=new Promise(r=>release=r);const late=ctx.publish();await Promise.resolve();state.selectedStudent='other';state.coachHistory=[{sentinel:'untouched'}];release();await late;assert.deepEqual(state.coachHistory,[{sentinel:'untouched'}]);
assert.match(source,/async function render\(\)\{\s*weeklyPdfReview\.close\(true\)/);
assert.match(source,/function resetPrivateSession\(\)\{\s*weeklyPdfReview\.close\(true\);luxuryWeeklyEditor\.reset\(\)/);
console.log('PASS actual weekly route/publisher: versioned exact snapshot; unreviewed/edit/epoch/consent gates; readonly JSON + plaintext history; no live-data fallback; failed/double/late INSERT; failed refresh; admin scope; lifecycle cleanup. Synthetic DOM/transport only.');

// A lost response keeps the original PDF across close/edit attempts/reopen, then reconciles.
state.profile.role='coach';state.selectedStudent='alumna-ficticia';state.coachHistory=[];state.consent.accepted=true;state.authContextEpoch++;
gate=null;rows.length=0;failRead=true;lostResponse=true;
ctx.open(-1,{});reviewed=true;const frozen=spec.serialized;const beforeLoss=inserts;
await assert.rejects(ctx.publish(),/No se confirmó/);assert.equal(fields.weeklyCoachConclusion.disabled,true);assert.equal(rows.length,1);
weeklyPdfReview.close();fields.weeklyCoachConclusion.value='No debe reemplazar el snapshot pendiente';ctx.open(-1,{});assert.equal(spec.serialized,frozen);assert.equal(spec.snapshot.conclusion,JSON.parse(frozen).conclusion);
reviewed=true;failRead=false;lostResponse=false;await ctx.publish();assert.equal(inserts,beforeLoss+1,'Reopen/retry reconciles the first INSERT, without a second write');assert.equal(state.coachHistory[0].report_text,frozen);
console.log('PASS actual weekly close/reopen after lost response: immutable PDF retained; edits blocked; readback confirms without resend.');
