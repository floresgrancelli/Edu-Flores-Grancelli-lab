// 06-01/06-02 regression: run the real UI modules with a stateful fake DOM and
// RLS-like pair filters. This is a deterministic unit fixture, NOT hosted/UAT.
import assert from "node:assert/strict";
import {createMessagesCenter,conversationSessionKey} from "../pilot/messages-ui.js";
import {createNotificationInbox} from "../pilot/notifications-ui.js";

assert.notEqual(
 conversationSessionKey({userId:"student-x",role:"student",orgCoachId:"coach-a"}),
 conversationSessionKey({userId:"student-x",role:"student",orgCoachId:"coach-b"}),
 "A student changing coaches must invalidate the chat cache");

const oldDocument=globalThis.document,oldInterval=globalThis.setInterval,oldAlert=globalThis.alert;
const handlers=new Map();
const chatHost={innerHTML:"",querySelector:()=>null,contains:()=>false};
let notificationHost;
const mockDocument={
 activeElement:null,hidden:false,
 body:{append(node){notificationHost=node;}},
 createElement(){return {id:"",innerHTML:"",hidden:false,setAttribute(){}};},
 getElementById(id){return id==="efgMessagesContent"?chatHost:id==="efgNotifications"?notificationHost:null;},
 addEventListener(type,fn){const all=handlers.get(type)||[];all.push(fn);handlers.set(type,all);}
};
const fire=async(type,event)=>{for(const fn of handlers.get(type)||[])await fn(event);};
const tick=async()=>{for(let i=0;i<48;i++)await Promise.resolve();};
const ctx={userId:"student-demo",role:"student",orgCoachId:"coach-old",coachName:"Coach anterior"};
const rows=[
 {id:"m-old",student_id:"student-demo",coach_id:"coach-old",sender_id:"coach-old",body:"SECRETO-COACH-ANTERIOR",created_at:"2026-10-30T10:00:00Z",read_at:null},
 {id:"m-new",student_id:"student-demo",coach_id:"coach-new",sender_id:"coach-new",body:"MENSAJE-COACH-NUEVO",created_at:"2026-10-30T11:00:00Z",read_at:null}
];
const receipts=[],sent=[];let failReads=0,afterSend=0,alerts=0;
function msgQuery(){
 const q={verb:"select",filters:[]};
 return {
  select(){return this;},eq(k,v){q.filters.push([k,v]);return this;},in(k,v){q.filters.push([k,v]);return this;},
  or(){return this;},order(){return this;},limit(){return this;},
  update(value){q.verb="update";q.value=value;return this;},
  insert(value){q.verb="insert";q.value=value;return this;},
  then(yes,no){
   let result;
   if(q.verb==="insert"){sent.push(q.value);result={data:null,error:null};}
   else if(q.verb==="update"){receipts.push(q.filters);result={data:null,error:null};}
   else if(failReads>0){failReads--;result={data:null,error:{message:"offline after confirmed write"}};}
   else result={data:rows.filter(m=>q.filters.every(([k,v])=>Array.isArray(v)?v.includes(m[k]):m[k]===v)),error:null};
   return Promise.resolve(result).then(yes,no);
  }
 };
}
try{
 globalThis.document=mockDocument;globalThis.setInterval=()=>0;globalThis.alert=()=>{alerts++;};
 const center=createMessagesCenter({sb:{from:msgQuery},context:()=>ctx,afterSend:()=>{afterSend++;}});
 center.mount();await tick();center.selectStudent("student-demo");await tick();
 assert.match(chatHost.innerHTML,/SECRETO-COACH-ANTERIOR/);
 ctx.orgCoachId="coach-new";ctx.coachName="Nuevo coach";
 await center.refresh();await tick();
 assert.doesNotMatch(chatHost.innerHTML,/SECRETO-COACH-ANTERIOR/);
 center.selectStudent("student-demo");await tick();
 assert.match(chatHost.innerHTML,/MENSAJE-COACH-NUEVO/);
 assert.doesNotMatch(chatHost.innerHTML,/SECRETO-COACH-ANTERIOR/);
 assert.ok(receipts.length>0);
 assert.ok(receipts.every(f=>f.some(([k,v])=>k==="student_id"&&v==="student-demo")&&f.some(([k,v])=>k==="coach_id"&&["coach-old","coach-new"].includes(v))),"Every read receipt is scoped to student and coach");
 await fire("input",{target:{id:"efgMessageText",value:"Hola nuevo coach"}});
 failReads=1;
 await fire("submit",{target:{id:"efgMessageForm",querySelector:()=>({value:"Hola nuevo coach"})},preventDefault(){}});
 await tick();
 assert.equal(sent.length,1,"INSERT occurred once");
 assert.equal(afterSend,1,"Successful INSERT callback must run despite failed readback");
 assert.equal(alerts,0,"No false error inviting a duplicate retry after successful INSERT");
 assert.match(chatHost.innerHTML,/Mensaje enviado\. No pudimos actualizar la conversación/);
 assert.equal(sent[0].coach_id,"coach-new");

 let markExists=false,navigations=0;
 const alertsData=[{id:"notice-1",recipient_id:"student-demo",title:"Actualización de plan",body:"Revisá tu plan",created_at:"2026-10-31T02:00:00Z",is_read:false}];
 function inboxQuery(){
  const q={verb:"select",filters:[]};
  return {
   select(){return this;},eq(k,v){q.filters.push([k,v]);return this;},order(){return this;},limit(){return this;},
   update(v){q.verb="update";return this;},maybeSingle(){return this;},
   then(yes,no){
    const allowed=q.filters.some(([k,v])=>k==="recipient_id"&&v===ctx.userId);
    const result=q.verb==="update"?{data:allowed&&markExists?{id:"notice-1"}:null,error:null}:{data:allowed?alertsData:[],error:null};
    return Promise.resolve(result).then(yes,no);
   }
  };
 }
 const inbox=createNotificationInbox({sb:{from:inboxQuery},getUserId:()=>ctx.userId,navigate:async()=>{navigations++;}});
 await inbox.refresh();
 const toggleButton={dataset:{efgAction:"toggle"}};
 const toggleTarget={closest:selector=>selector==="button"?toggleButton:selector.includes("#efgNotifications")?notificationHost:null};
 await fire("click",{target:toggleTarget});
 assert.match(notificationHost.innerHTML,/30\/10\/2026/,"UTC date must be rendered in Buenos Aires local time");
 const button={dataset:{efgId:"notice-1"}};
 const target={closest:selector=>selector==="button"?button:selector.includes("#efgNotifications")?notificationHost:null};
 await fire("click",{target});
 assert.equal(navigations,0,"Zero-row read receipt must not be treated as success");
 assert.match(notificationHost.innerHTML,/unread/);
 markExists=true;
 await fire("click",{target});
 assert.equal(navigations,1,"Confirmed recipient-scoped read receipt permits navigation");
 assert.doesNotMatch(notificationHost.innerHTML,/efg-notify-count/,"Unread count must clear after confirmed update");
}finally{
 globalThis.document=oldDocument;globalThis.setInterval=oldInterval;globalThis.alert=oldAlert;
}
console.log("PASS 06-01/06-02: coach reassignment, pair-scoped receipts, no duplicate send retry, notification readback and ART dates.");
