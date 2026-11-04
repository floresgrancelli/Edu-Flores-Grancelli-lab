import assert from 'node:assert/strict';
import {loadPeriodReportGoals} from '../pilot/period-report-goals.js';
const old={id:'baseline',start_on:'2025-01-01',kcal:2500};
const changes=Array.from({length:121},(_,i)=>({id:String(i),start_on:'2026-10-02',kcal:2100}));
let pages=0;
const sb={from(table){assert.equal(table,'efg_goals');const q={select(){return q;},eq(k,v){assert.equal(k,'student_id');assert.equal(v,'QA');return q;},lte(){return q;},gt(){return q;},order(){return q;},async limit(n){assert.equal(n,1);return {data:[old]};},async range(a,b){pages++;return {data:changes.slice(a,b+1)};}};return q;}};
const result=await loadPeriodReportGoals(sb,'QA','2026-10-01','2026-10-10');assert.equal(result.length,122);assert.equal(result[0].kcal,2500);assert.equal(pages,2);
console.log('PASS period goals: historical baseline and paginated changes beyond latest20 retained. Synthetic query transport.');
