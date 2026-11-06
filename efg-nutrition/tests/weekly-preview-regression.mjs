// Reproduce the screenshot's exact action with synthetic history, not a PDF mock success.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const start=app.indexOf(' if(el.dataset.act==="printLuxuryReport"){');
const end=app.indexOf(' if(el.dataset.act==="publishWeeklyReport")',start);
assert.ok(start>=0&&end>start);
const trace={prints:0,opens:0};
const context={el:{dataset:{act:'printLuxuryReport',reportindex:'0'},closest:()=>({querySelector:()=>({classList:{add(){},remove(){}}})})},state:{profile:{role:'coach'},coachHistory:[{report_text:'synthetic saved report'}]},window:{print:()=>trace.prints++,addEventListener(){}},openWeeklyPdfView:async()=>trace.opens++};
await vm.runInNewContext('(async()=>{'+app.slice(start,end)+'})()',context);
assert.equal(trace.prints,0,'The reported weekly action must open a PDF review, never invoke window.print()');
assert.equal(trace.opens,1,'The exact history action opens the weekly PDF view');
console.log('PASS screenshot action regression: opens weekly PDF view, no print dialog.');
