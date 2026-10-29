// EFG Nutrition Pro — Sprint UX 1 regression checks, completely offline and synthetic.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const pathTo=relative=>new URL("../pilot/"+relative,import.meta.url);
const [messagesSource,inboxSource,pilotSource,chatCSS,inboxCSS]=await Promise.all([
 "messages-ui.js","notifications-ui.js","pilot.js","messages-ui.css","notifications-ui.css"
].map(x=>readFile(pathTo(x),"utf8")));

assert.match(messagesSource,/order\("created_at",\{ascending:false\}\)\.order\("id",\{ascending:false\}\)\.limit\(PAGE_SIZE\)/,"Read most recent messages with deterministic pagination");
assert.match(messagesSource,/created_at\.lt\./,"Cursor must include timestamps");
assert.match(messagesSource,/id\.lt\./,"Cursor must break timestamp ties");
assert.match(messagesSource,/drafts\.set\(selectedStudent,formDraft\)/,"Keep drafts per contact");
assert.match(messagesSource,/drafts\.clear\(\)/,"Never carry drafts across users");
assert.match(messagesSource,/preventScroll:true/,"Retain focus on refresh");
assert.match(inboxSource,/status="stale"/,"Network errors must show stale status rather than hiding the bell");
assert.doesNotMatch(inboxSource,/host\.hidden=!getUserId\(\)\|\|!available/,"No hidden bell on network errors");
assert.match(chatCSS,/efg-chat-load-more/,"Touch-friendly pagination");
assert.match(inboxCSS,/efg-inbox-warning/,"Visible retry state");
assert.match(pilotSource,/let verified=false/,"OTP error handling separates verification from later session loading");
assert.match(pilotSource,/label for="\'+q\[0\]/,"Numeric fields have accessible labels");
assert.match(pilotSource,/Cerrar ventana de alimentos/,"Food dialog close button has a name");
assert.match(pilotSource,/if\(event\.key==="Escape"\)/,"Food dialog is dismissible with keyboard");

// A tiny fake DOM lets us exercise the actual chat and notification modules without credentials.
const handlers={};
const chatHost={innerHTML:"",querySelector:()=>null,contains:()=>false};
const notifHost={innerHTML:"",hidden:false,setAttribute(){},className:"",id:""};
globalThis.document={
 activeElement:null,hidden:false,body:{append(){}},
 createElement:()=>notifHost,
 getElementById:id=>id==="efgMessagesContent"?chatHost:null,
 addEventListener:(type,cb)=>{(handlers[type]??=[]).push(cb);}
};
globalThis.window={addEventListener(){}};
globalThis.setInterval=()=>0;
const {createMessagesCenter}=await import(pathTo("messages-ui.js"));
const rows=Array.from({length:201},(_,i)=>({
 id:String(i+1).padStart(8,"0")+"-0000-4000-8000-000000000000",
 student_id:"student-a",coach_id:"coach-a",
 sender_id:"coach-a",body:"Mensaje "+(i+1),read_at:"2026-10-28T10:00:00Z",
 created_at:new Date(Date.UTC(2026,9,28,12,0,i)).toISOString()
}));
const builder=()=>{
 const state={where:[],sort:[],cursor:null};
 return {
  select(){return this;},
  eq(k,v){state.where.push([k,v]);return this;},
  in(k,arr){state.where.push([k,arr]);return this;},
  or(x){state.cursor=x;return this;},
  order(k,{ascending}){state.sort.push([k,ascending]);return this;},
  limit(n){
   let values=rows.filter(row=>state.where.every(([k,v])=>Array.isArray(v)?v.includes(row[k]):row[k]===v));
   if(state.cursor){
    const match=state.cursor.match(/^created_at\.lt\.(.+),and\(created_at\.eq\.(.+),id\.lt\.(.+)\)$/);
    assert.ok(match,"Stable timestamp+id cursor");
    values=values.filter(m=>m.created_at<match[1]||(m.created_at===match[2]&&m.id<match[3]));
   }
   values.sort((a,b)=>{
    for(const [key,asc] of state.sort){const n=String(a[key]).localeCompare(String(b[key]));if(n)return asc?n:-n;}return 0;
   });
   return Promise.resolve({data:values.slice(0,n),error:null});
  },
  update(){return {in:()=>Promise.resolve({error:null})};},
  insert(){return Promise.resolve({error:null});}
 };
};
const chat=createMessagesCenter({
 sb:{from:name=>{assert.equal(name,"efg_messages");return builder();}},
 context:()=>({userId:"student-a",role:"student",orgCoachId:"coach-a",coachName:"Coach de prueba"}),
 afterSend:()=>{}
});
chat.mount();
chat.selectStudent("student-a");
await new Promise(resolve=>setImmediate(resolve));
await new Promise(resolve=>setImmediate(resolve));
assert.match(chatHost.innerHTML,/Mensaje 201/,"Newest message must remain visible");
assert.match(chatHost.innerHTML,/Ver mensajes anteriores/,"Older page must be reachable");
assert.doesNotMatch(chatHost.innerHTML,/Mensaje 1<small>/,"Oldest should be in older page");
const olderHandler=handlers.click.find(Boolean);
assert.ok(olderHandler);
chatHost.contains=()=>true;
olderHandler({target:{closest:selector=>selector==="[data-chat-older]"?{}:null}});
await new Promise(resolve=>setImmediate(resolve));
assert.match(chatHost.innerHTML,/Mensaje 1<small>/,"Paging reveals oldest message");
assert.match(chatHost.innerHTML,/Mensaje 201/,"Paging does not lose the newest message");

const {createNotificationInbox}=await import(pathTo("notifications-ui.js"));
let failNext=false;
const inbox=createNotificationInbox({
 sb:{from:name=>{
  assert.equal(name,"efg_notifications");
  return {select(){return this;},eq(){return this;},order(){return this;},
   limit(){return Promise.resolve(failNext?{data:null,error:{message:"Network unavailable"}}:{
    data:[{id:"notice-1",title:"Aviso de prueba",body:"Contenido ficticio",created_at:"2026-10-29T10:00:00Z",is_read:false}],error:null
   });}};
 }},
 getUserId:()=>"student-a",navigate:async()=>{}
});
await inbox.refresh();
assert.match(notifHost.innerHTML,/Aviso de prueba/);
failNext=true;await inbox.refresh();
assert.equal(notifHost.hidden,false,"Bell must remain visible on error");
assert.match(notifHost.innerHTML,/Aviso de prueba/,"Retain last known notices");
assert.match(notifHost.innerHTML,/Reintentar/,"Offer retry after network failure");
console.log("UX Sprint 1: chat page 201, cursor, stored drafts, stable controls, offline bell and accessible UI verified with fixtures.");
