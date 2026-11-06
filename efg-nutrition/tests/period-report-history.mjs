import assert from 'node:assert/strict';
import {createPeriodReportHistory} from '../pilot/period-report-history.js';
import {buildLuxuryPeriodReport} from '../pilot/period-luxury-report.js';
const model=buildLuxuryPeriodReport({from:'2026-10-01',to:'2026-10-01',friday:'2026-10-02',days:[{date:'2026-10-01',hasData:true,closed:true,mealCount:1,k:100,p:10,c:10,f:2,fi:1}]});
function fixture(){
 let ctx={userId:'coach',studentId:'student',allowed:true,canPublish:true,role:'coach',epoch:1};
 const rows=new Map();let inserts=0,offline=false,hold=null;
 const sb={from(table){assert.equal(table,'efg_period_reports');return {
 async insert(row){inserts++;if(hold)await hold;if(offline)return {error:{code:'NETWORK'}};
 if(rows.has(row.id)||[...rows.values()].some(x=>x.period_from===row.period_from&&x.period_to===row.period_to))return {error:{code:'23505'}};
 rows.set(row.id,structuredClone(row));return {error:null};},
 select(){let key;const q={eq(k,v){key=v;return q;},order(){return q;},async limit(){if(hold)await hold;return {data:[...rows.values()]};},async single(){return rows.has(key)?{data:rows.get(key)}:{error:Error('missing')};}};return q;}
 };}};
 return {client:createPeriodReportHistory({sb,context:()=>ctx}),rows,get inserts(){return inserts;},setContext:c=>ctx={...ctx,...c},setOffline:v=>offline=v,setHold:v=>hold=v};
}
const f=fixture(),args={model,requestId:'request-1',confirmed:true};
await assert.rejects(f.client.publish({...args,confirmed:false}),/confirm/);assert.equal(f.inserts,0);
f.setContext({role:'student'});await assert.rejects(f.client.publish(args),/confirm/);f.setContext({role:'coach'});
f.setOffline(true);await assert.rejects(f.client.publish(args));f.setOffline(false);
assert.equal((await f.client.publish(args)).id,'request-1');assert.equal((await f.client.publish(args)).id,'request-1');assert.equal(f.rows.size,1);
await assert.rejects(f.client.publish({...args,model:{...model,conclusion:'Changed after sharing'}}),/exactamente/);
await assert.rejects(f.client.publish({...args,requestId:'request-2'}),/missing/);assert.equal(f.rows.size,1);
const race=fixture();let release;race.setHold(new Promise(r=>release=r));const pending=race.client.publish(args);
await assert.rejects(race.client.publish(args),/en curso/);race.setContext({studentId:'other',epoch:2});release();assert.equal(await pending,null);
const read=fixture();let releaseRead;read.setHold(new Promise(r=>releaseRead=r));const reading=read.client.list();read.setContext({allowed:false,epoch:2});releaseRead();assert.equal(await reading,null);
console.log('PASS period history client: explicit review, validated author capability, failed request retry, exact idempotency, immutable payload, duplicate period rejected, pending guard, stale publish/read discarded. Synthetic transport only.');
