// 05-01 / 05-03 · weekly data quality, no fabricated 0 g days.
import assert from 'node:assert/strict';
import {weeklyNumbers} from '../pilot/weekly-metrics.js';
const rows=[
 {date:'2026-10-29',hasData:true,closed:true,k:2100,p:130,c:null,f:60,fi:null},
 {date:'2026-10-28',hasData:true,closed:false,k:1900,p:null,c:200,f:60,fi:30},
 {date:'2026-10-29',hasData:true,closed:true,k:2100,p:130,c:null,f:60,fi:null},
 {date:'2026-02-30',hasData:true,closed:true,k:9000,p:999},
 {date:'2026-10-27',hasData:false,k:0,p:0,c:0,f:0}
];
const goals=[{start_on:'2026-10-26',protein_g:150},
 {start_on:'2026-10-29',protein_g:140},
 {start_on:'2026-11-01',protein_g:50}];
const weights=[{measured_on:'2026-10-28',kg:80.3},
 {measured_on:'2026-10-29',kg:79.9},
 {measured_on:'2026-10-29',kg:79.9}];
const beforeRows=structuredClone(rows),beforeWeights=structuredClone(weights);
const report=weeklyNumbers(rows,goals,weights);
assert.equal(report.daysRecorded,2,'Duplicate and invalid dates cannot inflate coverage');
assert.equal(report.daysClosed,1);
assert.equal(report.averages.k,2000);
assert.equal(report.averages.p,130,'Missing protein is not 0 g');
assert.equal(report.averages.c,200,'Missing carbs is not 0 g');
assert.equal(report.averages.fi,30,'Missing fibre is not 0 g');
assert.equal(report.proteinDaysCompared,1,'Missing protein cannot count as a miss');
assert.equal(report.proteinDaysOnTarget,1,'Date-specific protein target, not future goal');
assert.ok(Math.abs(report.weightDelta+0.4)<1e-9);
assert.deepEqual(rows,beforeRows,'Do not mutate diary');
assert.deepEqual(weights,beforeWeights,'Do not mutate weights');
const unknown=weeklyNumbers([{date:'2026-10-28',hasData:true,closed:false,k:null,p:'',c:undefined,f:false}],[],[]);
assert.deepEqual(unknown.averages,{k:null,p:null,c:null,f:null,fi:null});
assert.equal(unknown.proteinDaysCompared,0);
assert.equal(weeklyNumbers([],[],[]).weightDelta,null);
// Duplicate conflict: contradictory revisions cannot overwrite an entire day
// merely because the API changed row ordering.
const ambiguous=weeklyNumbers([...rows,{...rows[0],p:999}],goals,weights);
assert.equal(ambiguous.daysRecorded,1,'Conflicting 29th logs must be excluded from aggregates');
assert.equal(ambiguous.averages.k,1900,'28th must stay available');
const future=weeklyNumbers(rows,goals,[...weights,
 {measured_on:'2026-11-20',kg:65},{measured_on:'2026-10-01',kg:92}]);
assert.ok(Math.abs(future.weightDelta+0.4)<1e-9,
 'Future and stale weights must not leak into a past weekly change');
assert.equal(weeklyNumbers([{date:'2026-10-29',hasData:true,k:2100,p:100,c:200,f:70}],[],
 [{measured_on:'2026-10-01',kg:89},{measured_on:'2026-10-29',kg:80}]).weightDelta,null,
 'A weight from outside the reported dates cannot invent weekly progress');
console.log('PASS WEEKLY-METRICS: unique dates, conflicts, dated weights, historic goals, unknown macros, immutable inputs.');
