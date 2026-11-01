import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLuxuryWeeklyEditor} from '../pilot/weekly-luxury-editor.js';
import {buildLuxuryWeeklyReport,reportAsStoredText} from '../pilot/weekly-luxury-report.js';

const model=buildLuxuryWeeklyReport({
 from:'2026-10-23',to:'2026-10-29',friday:'2026-10-30',
 studentName:'Alumno ficticio',coachName:'Coach ficticio',
 days:['2026-10-23','2026-10-24','2026-10-26','2026-10-28','2026-10-29'].map(date=>({
  date,k:2100,p:143,c:245,f:65,hasData:true,closed:true,mealCount:3
 })),
 goals:[{start_on:'2026-10-22',kcal:2200,protein_g:150,carb_g:255,fat_g:70}],logs:[]
});
const ctx={coachId:'coach-1',studentId:'student-1',weekEnding:'2026-10-30',model};
const editor=createLuxuryWeeklyEditor();
let view=editor.scope(ctx);
assert.equal(view.ready,false,'Initial auto-render is not approved preview');
assert.throws(()=>editor.requirePreview(ctx,view.conclusion,view.flexibleNote),/Actualizá la vista previa/);
editor.update(ctx,'conclusion','Conclusión editada por coach');
view=editor.scope(ctx);
assert.equal(view.conclusion,'Conclusión editada por coach','Rerender must retain an unsent edit');
assert.equal(view.ready,false);
const preview=editor.preview(ctx,view.conclusion,view.flexibleNote);
assert.equal(preview.conclusion,view.conclusion);
assert.equal(editor.scope(ctx).ready,true);
const approved=editor.requirePreview(ctx,view.conclusion,view.flexibleNote);
assert.ok(reportAsStoredText(approved,approved.conclusion,approved.flexibleNote).includes('Conclusión editada'));
editor.update(ctx,'flexibleNote','Nueva recomendación flexible');
assert.throws(()=>editor.requirePreview(ctx,view.conclusion,'Nueva recomendación flexible'),/Actualizá/);
const review2=editor.preview(ctx,view.conclusion,'Nueva recomendación flexible');
assert.equal(editor.requirePreview(ctx,review2.conclusion,review2.flexibleNote).flexibleNote,'Nueva recomendación flexible');
assert.throws(()=>editor.requirePreview(ctx,review2.conclusion+' añadido',review2.flexibleNote),/Actualizá/,'Direct DOM edits cannot bypass preview');
const changed={...model,averages:{...model.averages,k:model.averages.k+40}};
const newData={...ctx,model:changed};
assert.equal(editor.scope(newData).ready,false,'Changed actual nutrition data invalidates the preview');
assert.equal(editor.scope(newData).conclusion,'Conclusión editada por coach','Warn instead of silently discarding edited text');
assert.equal(editor.scope(newData).sourceChanged,true);
assert.throws(()=>editor.requirePreview(newData,review2.conclusion,review2.flexibleNote),/Actualizá/);
editor.preview(newData,review2.conclusion,review2.flexibleNote);
assert.equal(editor.scope(newData).ready,true);
const otherStudent={...ctx,studentId:'student-2'};
const otherView=editor.scope(otherStudent);
assert.equal(otherView.conclusion,model.conclusion,'Never leak another pupil draft');
assert.equal(otherView.ready,false);
const otherCoach={...ctx,coachId:'coach-2'};
assert.equal(editor.scope(otherCoach).conclusion,model.conclusion,'Different coach does not reuse private draft');
editor.reset();
assert.equal(editor.scope(ctx).conclusion,model.conclusion,'Explicit end of report session clears draft');
assert.throws(()=>editor.update(ctx,'invalidField','x'),/Campo/);
assert.throws(()=>editor.preview(ctx,'','text'),/Revisá/);
assert.throws(()=>editor.update(ctx,'conclusion','x'.repeat(2300)),/excede/);
const script=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
assert.match(script,/luxuryWeeklyEditor\.requirePreview\(luxuryEditorContext\(model\)/);
assert.match(script,/luxuryWeeklyEditor\.preview\(luxuryEditorContext\(model\)/);
assert.match(script,/if\(publish\)publish\.disabled=true/);
assert.match(script,/id="weeklyLuxuryPublishButton".*?disabled/);
assert.match(script,/luxuryWeeklyEditor\.reset\(\)/);
assert.match(script,/index===-1.*?state\.coachHistory/s);
const source=readFileSync(new URL('../pilot/weekly-luxury-editor.js',import.meta.url),'utf8');
const executable=source.split('\n').filter(line=>!line.trimStart().startsWith('//')).join('\n');
assert.doesNotMatch(executable,/localStorage|sessionStorage|indexedDB|fetch\(/,'Coach draft must remain memory-only');
console.log('PASS REPORT-LUX-76: edit survives redraw; changed data/text revokes approval; exactly previewed text publishable; student/coach isolation; no browser storage.');
