import assert from 'node:assert/strict';
import {createMessagesCenter} from '../pilot/messages-ui.js';
import {readFileSync} from 'node:fs';

const originalDocument=globalThis.document;
const originalInterval=globalThis.setInterval;
let focus=0,queryCount=0,writeCount=0;
globalThis.document={
 addEventListener:()=>{},
 getElementById:id=>id==='efgMessageText'?{
    value:'',focus:()=>{focus++},setSelectionRange:()=>{}
 }:null
};
globalThis.setInterval=()=>({unref(){}});
const query=()=>{
 const builder={
  select:()=>builder,eq:()=>builder,order:()=>builder,limit:()=>builder,
  then(resolve,reject){queryCount++;return Promise.resolve({data:[],error:null}).then(resolve,reject)}
 };
 return builder;
};
const sb={from:table=>{
 assert.equal(table,'efg_messages');
 return { ...query(),insert(){writeCount++;throw Error('Reply navigation MUST NOT auto-send a message')} };
}};
try{
 const userId='student-synthetic-1';
 let role='student';
 const center=createMessagesCenter({sb,context:()=>({
  userId,role,orgCoachId:'coach-synthetic-2',testCoach:false,roster:[],consented:{}
 })});
 await center.replyToWeeklyReport(userId,'2026-10-29');
 assert.equal(focus,1,'Reply action should focus message textarea');
 assert.ok(queryCount>=2,'Reply action should open and load the existing private thread');
 assert.equal(writeCount,0,'No message may be sent without student pressing Send');
 await assert.rejects(()=>center.replyToWeeklyReport('different-user','2026-10-29'),/No se pudo abrir/);
 await assert.rejects(()=>center.replyToWeeklyReport(userId,'2026-10-29<script>'),/No se pudo abrir/);
 role='coach';
 await assert.rejects(()=>center.replyToWeeklyReport(userId,'2026-10-29'),/No se pudo abrir/);
 assert.equal(writeCount,0);
 const pilot=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
 assert.match(pilot,/data-act="replyWeeklyReport"/,'Button in the published student report history');
 assert.match(pilot,/state\.tab="messages";await render\(\)/,'Action navigates to real messages tab');
 assert.match(pilot,/messages\.replyToWeeklyReport\(state\.session\.user\.id,week\)/,'Action connects exact weekly report context');
 assert.match(pilot,/myWeeklyReports\.some\(r=>r\.week_ending===week&&parseLuxuryWeeklyReport\(r\.report_text\)\)/,'Reject unpublished or invalid report');
 console.log('PASS REPORT-LUX-REPLY: correct student, valid shared report, open private message thread, focus composer, no automatic send; reject cross-user/invalid date/coach role.');
}finally{globalThis.document=originalDocument;globalThis.setInterval=originalInterval;}
