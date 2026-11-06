import {createWeeklyPdfReview} from '../pilot/weekly-pdf-review.js';
// Regression on the REAL PWA source. Synthetic REST promises; no hosted writes.
// Session A pending save -> logout -> session B save -> late A response.
// Also cover A->B->A reauthentication, per-meal leases and midnight UI guards.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
function section(first,last){
 const start=source.indexOf(first),end=source.indexOf(last,start);
 assert.ok(start>=0&&end>start,'Actual PWA section exists: '+first);
 return source.slice(start,end);
}
const lockSource=section('function createSessionScopedSlotLocks(){','const pendingHabitualSlots=');
const createLocks=new Function(lockSource+';return createSessionScopedSlotLocks;')();
const mealLocks=createLocks(),favoriteLocks=createLocks();

const idA='TEST_ONLY_STUDENT_A',idB='TEST_ONLY_STUDENT_B',day='2026-11-03';
const makeDay=(id,mark)=>({
 student_id:id,log_day:day,meals:{
  desayuno:[{id:mark,name:mark,k:120,p:5,c:10,f:5,fi:1}],
  media_manana:[],almuerzo:[],media_tarde:[],merienda:[],cena:[]
 },sports:[],skipped:{},totals:{}
});
const state={
 session:{user:{id:idA}},profile:{role:'student'},authContextEpoch:1,
 diary:makeDay(idA,'A-OLD'),pendingDiaryDraft:null,progressLogs:[],
 diaryWritePending:false,renderedDay:day
};
const deferred=[];
const sb={from(table){
 assert.equal(table,'efg_daily_logs');
 return {upsert(payload,options){
  assert.equal(options.onConflict,'student_id,log_day');
  const row=structuredClone(payload);
  return {select(){return {single(){return new Promise(resolve=>{
   deferred.push({row,resolve});
  });}};}};
 }};
}};
let renderCount=0;const notices=[];
const totals=d=>({
 k:Object.values(d.meals||{}).flat().reduce((acc,item)=>acc+Number(item.k||0),0),
 p:5,c:10,f:5,fi:1
});
const saveDiary=new Function('state','activeDiary','today','isNutritionDayClosed',
 'dailyTotals','sb','render','notify',
 section('async function saveDiary(){','async function loadPersonalData(){')+
 ';return saveDiary;')(
 state,()=>state.diary,()=>day,()=>false,totals,sb,
 async()=>{renderCount++;},msg=>notices.push(msg));

// Execute the real PDF teardown alongside the real session reset. Even a pending
// publication must not leave the previous student's reviewed snapshot or Blob URL.
const revokedPdfUrls=[];let nextPdfUrl=0,removedPdfDialogs=0,pdfOpenerFocus=0,editorResets=0,deliveryClears=0;
URL.createObjectURL=()=> 'blob:synthetic-'+(++nextPdfUrl);URL.revokeObjectURL=url=>revokedPdfUrls.push(url);
const fakeNode=()=>({style:{},dataset:{},clientWidth:390,setAttribute(){},addEventListener(){},replaceChildren(){},getContext:()=>({}),disabled:false});
globalThis.document={createElement(tag){if(tag==='canvas')return fakeNode();const fields=new Map();return {...fakeNode(),isConnected:true,open:false,classList:{add(){}},showModal(){this.open=true;},remove(){removedPdfDialogs++;this.isConnected=false;this.open=false;},querySelector(selector){if(!fields.has(selector))fields.set(selector,fakeNode());return fields.get(selector);}};}};
const options={root:{appendChild(){}},buildPdf:async()=>new Uint8Array([37,80,68,70]),loadDocument:async()=>({destroy:async()=>{},promise:Promise.resolve({numPages:1,getPage:async()=>({getViewport:()=>({width:600,height:800}),render:()=>({promise:Promise.resolve(),cancel(){}}),streamTextContent:()=>new ReadableStream({start(c){c.enqueue({items:[],styles:{},lang:null});c.close();}})})})})};
const weeklyPdfReview=createWeeklyPdfReview(options),periodPdfReview=createWeeklyPdfReview({...options,mode:'period'});
const pdfView=new Function('periodPdfReview',
 section('let activePeriodPdfView=null;','function currentPeriodReportHost(){')+
 ';return {close:closePeriodPdfView,set:view=>activePeriodPdfView=view,get:()=>activePeriodPdfView};')(periodPdfReview);
async function privatePdfFixture(userId){
 const host={periodPublishing:true,periodReviewed:{userId},periodPdfSnapshot:{userId}};
 const snapshot={studentName:'FICTICIO '+userId,from:day,to:day,friday:day,daysRecorded:1};
 const view=periodPdfReview.open({snapshot,isCurrent:()=>true,editable:true,opener:{isConnected:true,focus(){pdfOpenerFocus++;}},onClose:()=>{host.periodReviewed=null;host.periodPdfSnapshot=null;pdfView.set(null);}});
 view.host=host;pdfView.set(view);await view.prepared;periodPdfReview.setSubmitting(view,true);
 view.weekly=weeklyPdfReview.open({snapshot,isCurrent:()=>true,editable:true,opener:{isConnected:true,focus(){pdfOpenerFocus++;}}});await view.weekly.prepared;weeklyPdfReview.setSubmitting(view.weekly,true);
 return view;
}

const resetPrivateSession=new Function(
 'state','pendingMealRegistrations','pendingHabitualSlots',
 'pilotGuideLifecycle','coachAdaptedWorkspace','closePeriodPdfView','weeklyPdfReview','luxuryWeeklyEditor','weeklyReportDelivery',
 'let myWeeklyReports=[],cloudRecipes=[],cloudHabituales=[],coachRosterConsent={};'+
 'let userHasUnconfirmedEdits=false,lastRenderedViewKey=null,recipeRegistrationBusy=false;'+
 section('function resetPrivateSession(){','function handleAuthStateChange(')+
 ';return resetPrivateSession;')(
 state,mealLocks,favoriteLocks,{invalidate(){}},{close(){}},pdfView.close,weeklyPdfReview,{reset(){editorResets++;}},{clear(){deliveryClears++;}});

const leaseA=mealLocks.add('desayuno');
const favoriteLeaseA=favoriteLocks.add('cena');
const pendingA=saveDiary();
assert.equal(state.diaryWritePending,true);
assert.equal(deferred.length,1,'First diary write should be in flight');
const pdfA=await privatePdfFixture(idA);
resetPrivateSession();
assert.equal(pdfView.get(),null,'Logout closes an in-flight private PDF view');
assert.equal(pdfA.host.periodReviewed,null,'Logout revokes the old review');
assert.equal(pdfA.host.periodPdfSnapshot,null,'Logout clears the old PDF snapshot');
assert.equal(pdfA.ticket,null,'Late PDF generation cannot attach after logout');
assert.deepEqual(revokedPdfUrls.sort(),[pdfA.url,pdfA.weekly.url].sort());assert.equal(pdfA.weekly.ticket,null);assert.equal(pdfA.weekly.dialog.isConnected,false);
assert.equal(removedPdfDialogs,2);assert.equal(editorResets,1);assert.equal(deliveryClears,1);
assert.equal(pdfOpenerFocus,0,'Forced logout does not refocus the previous account UI');
assert.equal(state.diaryWritePending,false,'Old account cannot block new user');
assert.equal(mealLocks.has('desayuno'),false);
assert.equal(favoriteLocks.has('cena'),false);

state.authContextEpoch=2;
state.session={user:{id:idB}};state.profile={role:'student'};
state.diary=makeDay(idB,'B-FOOD');state.progressLogs=[];
const leaseB=mealLocks.add('desayuno');
const favoriteLeaseB=favoriteLocks.add('cena');
assert.equal(mealLocks.delete('desayuno',leaseA),false,
 'Old A finally may not unlock B entry');
assert.equal(favoriteLocks.delete('cena',favoriteLeaseA),false,
 'Old A habitual completion may not unlock B favorites');
assert.equal(mealLocks.has('desayuno'),true);
assert.equal(favoriteLocks.has('cena'),true);
const pendingB=saveDiary();
assert.equal(deferred.length,2,'B must be allowed to submit while A still hangs');
deferred[0].resolve({data:deferred[0].row,error:null});
await pendingA;
assert.equal(state.diary.student_id,idB,'Late A response cannot rehydrate B');
assert.equal(state.diaryWritePending,true,'Late A finally cannot release B write');
assert.equal(mealLocks.has('desayuno'),true);
assert.equal(renderCount,0,'Old A response cannot render B UI');
deferred[1].resolve({data:deferred[1].row,error:null});
await pendingB;
assert.equal(state.diary.student_id,idB);
assert.equal(state.diary.meals.desayuno[0].id,'B-FOOD');
assert.equal(state.diaryWritePending,false);
assert.equal(renderCount,1);
assert.equal(mealLocks.delete('desayuno',leaseB),true);
assert.equal(favoriteLocks.delete('cena',favoriteLeaseB),true);
console.log('PASS NCC session A -> B: no stale data, no blocked first food, leased favorites');

state.authContextEpoch=3;
state.session={user:{id:idA}};state.profile={role:'student'};
state.diary=makeDay(idA,'A-SESSION3');
const oldSameAccount=saveDiary();
assert.equal(deferred.length,3);
const sameAccountPdf=await privatePdfFixture(idA);
resetPrivateSession();
assert.equal(sameAccountPdf.host.periodPdfSnapshot,null);
assert.equal(pdfView.get(),null,'Fresh authentication of the same account cannot retain the old PDF');
assert.equal(removedPdfDialogs,4);
assert.equal(revokedPdfUrls.length,4);assert.equal(sameAccountPdf.weekly.ticket,null);assert.equal(editorResets,2);assert.equal(deliveryClears,2);
state.authContextEpoch=4;
state.session={user:{id:idA}};state.profile={role:'student'};
state.diary=makeDay(idA,'A-SESSION4');state.progressLogs=[];
const newSameAccount=saveDiary();
assert.equal(deferred.length,4);
deferred[2].resolve({data:deferred[2].row,error:null});
await oldSameAccount;
assert.equal(state.diary.meals.desayuno[0].id,'A-SESSION4',
 'Older same-ID token cannot rehydrate after logout and new OTP');
assert.equal(state.diaryWritePending,true);
deferred[3].resolve({data:deferred[3].row,error:null});
await newSameAccount;
assert.equal(state.diary.meals.desayuno[0].id,'A-SESSION4');
assert.equal(state.diaryWritePending,false);
assert.equal(renderCount,2);
console.log('PASS NCC session A -> B -> A: old auth epoch and finally isolated');

const midnightState={
 session:{user:{id:idA}},profile:{role:'student'},
 authContextEpoch:101,renderedDay:'2026-11-02'
};
let finishMidnight,midnightRenders=0;const midnightNotices=[];
const updateAtDayChange=new Function(
 'state','today','ensureCurrentDay','render','notify','isNutritionDayClosed',
 section('async function updateAtDayChange(){','root.addEventListener("click",')+
 ';return updateAtDayChange;')(
 midnightState,()=>day,
 ()=>new Promise(resolve=>{finishMidnight=resolve;}),
 async()=>{midnightRenders++;},
 msg=>midnightNotices.push(msg),()=>false);
const rollover=updateAtDayChange();
assert.equal(typeof finishMidnight,'function');
midnightState.session={user:{id:idB}};
midnightState.authContextEpoch=102;
midnightState.renderedDay=day;
finishMidnight();
await rollover;
assert.equal(midnightRenders,0,'Old midnight fetch may not render new account');
assert.equal(midnightNotices.length,0,'Old midnight notice may not toast new account');
console.log('PASS NCC midnight: stale A rollover cannot render or toast B');
