import assert from 'node:assert/strict';
import {createWeeklyReportDelivery} from '../pilot/weekly-report-delivery.js';
const record={student_id:'student-ficticio',coach_id:'coach-ficticio',week_ending:'2026-11-06',report_text:'EXACT_FICTITIOUS_SNAPSHOT',updated_at:'2026-11-06T12:00:00Z'},key='scope-ficticio';
function fixture(){let mode='ok',readError=false,inserts=0;const rows=[];
 const sb={from(table){
  assert.equal(table,'efg_weekly_reports');
  return {
   async insert(row){
    inserts++;
    if(mode==='rejected')return {error:{code:'42501',message:'denied'}};
    if(mode==='throw-code')throw Object.assign(Error('transport threw code'),{code:'42501'});
    if(mode==='network')throw Error('network');
    if(rows.length)return {error:{code:'23505',message:'duplicate'}};
    rows.push(structuredClone(row));
    if(mode==='commit-lost')throw Error('response lost');
    return {};
   },
   select(){
    const filters=[];
    return {
     eq(k,v){filters.push(r=>r[k]===v);return this;},
     async limit(){if(readError)throw Error('read unavailable');return {data:structuredClone(rows.filter(r=>filters.every(f=>f(r))))};}
    };
   }
  };
 }};
 return {client:createWeeklyReportDelivery({sb}),rows,get inserts(){return inserts;},mode:v=>mode=v,readError:v=>readError=v};
}
const f=fixture();f.mode('commit-lost');f.readError(true);
await assert.rejects(f.client.send({key,record}),e=>e.weeklyWriteOutcome==='uncertain');assert.equal(f.rows.length,1);assert.equal(f.inserts,1);assert.deepEqual(f.client.get(key).record,record);
await assert.rejects(f.client.send({key,record:{...record,report_text:'CHANGED'}}),/conservamos|Conservamos/);assert.equal(f.inserts,1);
f.readError(false);assert.deepEqual(await f.client.send({key,record}),record);assert.equal(f.inserts,1,'Readback reconciles lost response without a second INSERT');assert.equal(f.client.get(key),null);
const g=fixture();g.mode('rejected');await assert.rejects(g.client.send({key,record}),e=>e.weeklyWriteOutcome==='rejected');assert.equal(g.client.get(key),null,'Explicit first rejection permits editing');
const h=fixture();h.mode('network');await assert.rejects(h.client.send({key,record}),e=>e.weeklyWriteOutcome==='uncertain');h.mode('rejected');await assert.rejects(h.client.send({key,record}),e=>e.weeklyWriteOutcome==='uncertain');assert.deepEqual(h.client.get(key).record,record,'Later rejection cannot erase earlier uncertainty');
h.mode('ok');assert.deepEqual(await h.client.send({key,record}),record);assert.equal(h.rows.length,1);assert.equal(h.client.get(key),null);
const conflict=fixture();conflict.rows.push({...record,report_text:'OTHER_SNAPSHOT'});await assert.rejects(conflict.client.send({key,record}),e=>e.weeklyWriteOutcome==='conflict'&&e.weeklyExistingRecord.report_text==='OTHER_SNAPSHOT');assert.equal(conflict.rows[0].report_text,'OTHER_SNAPSHOT');
const current=fixture();current.mode('network');await assert.rejects(current.client.send({key,record}));current.readError(true);await assert.rejects(current.client.send({key,record}));assert.equal(current.inserts,1,'Failed pre-retry read does not perform blind INSERT');current.client.clear();assert.equal(current.client.get(key),null);
console.log('PASS weekly uncertain delivery: commit + lost response/read failure; exact snapshot retained; readback-before-retry with no second INSERT; rejection vs uncertainty; sticky unknown; conflict never overwrites; logout clears RAM. Synthetic UNIQUE/readback only.');
const coded=fixture();coded.mode('throw-code');await assert.rejects(coded.client.send({key,record}),e=>e.weeklyWriteOutcome==='uncertain');assert.ok(coded.client.get(key),'A thrown transport code is not a confirmed server rejection');
let active=true,releaseRead,phase=0,writeCount=0;
const racing=createWeeklyReportDelivery({sb:{from(){return {async insert(){writeCount++;throw Error('network');},select(){return {eq(){return this;},async limit(){if(phase)await new Promise(r=>releaseRead=r);return {data:[]};}};}};}}});
await assert.rejects(racing.send({key,record,isCurrent:()=>active}));phase=1;
const waiting=racing.send({key,record,isCurrent:()=>active});await Promise.resolve();active=false;releaseRead();await assert.rejects(waiting,e=>e.weeklyWriteOutcome==='stale');assert.equal(writeCount,1,'Context change during pre-retry read must prevent a second INSERT');
console.log('PASS thrown error code stays uncertain; context change during readback prevents late writes.');
