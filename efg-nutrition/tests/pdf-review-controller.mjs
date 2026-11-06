// Actual shared PDF.js review controller, deterministic DOM/decode doubles.
// Real pixels and browser journeys are separate tests; this proves state gates.
import assert from 'node:assert/strict';
import {createWeeklyPdfReview} from '../pilot/weekly-pdf-review.js';
let id=0;const revoked=[],dialogs=[];
const node=()=>({style:{},dataset:{},hidden:false,disabled:false,checked:false,textContent:'',clientWidth:390,isConnected:true,handlers:{},setAttribute(){},addEventListener(event,handler){this.handlers[event]=handler;},replaceChildren(){},focus(){},getContext(){return {};}});
const document={createElement(tag){if(tag==='canvas')return node();const fields=new Map(),d={...node(),open:false,classList:{add(){}},setAttribute(){},showModal(){this.open=true;},remove(){this.open=false;this.isConnected=false;},querySelector(selector){if(selector.startsWith('#')&&!this.innerHTML?.includes('id="'+selector.slice(1)+'"'))return null;selector=selector.replace('data-pdf-status','data-weekly-status').replace('data-pdf-close','data-weekly-close').replace('data-pdf-download','data-weekly-download');if(!fields.has(selector))fields.set(selector,node());return fields.get(selector);}};dialogs.push(d);return d;}};
Object.assign(globalThis,{document});URL.createObjectURL=()=> 'blob:fixture-'+(++id);URL.revokeObjectURL=url=>revoked.push(url);
const snapshot={studentName:'FICTICIO',from:'2026-10-30',to:'2026-11-05',friday:'2026-11-06',daysRecorded:3,pdfRendererVersion:'synthetic'};
const turn=()=>new Promise(r=>setImmediate(r));
for(const mode of ['weekly','period']){
 let originCurrent=true;
 let sends=0,fail=false,failText=false,holdText=false,textCancelled=0,current=true,buildGate=null,release,destroyed=0;
 const api=createWeeklyPdfReview({root:{appendChild(){}},mode,buildPdf:async()=>{if(buildGate)await buildGate;if(fail)throw Error('synthetic build fail');return new Uint8Array([37,80,68,70]);},loadDocument:async()=>({destroy:async()=>{destroyed++;},promise:Promise.resolve({numPages:3,getPage:async()=>({getViewport:()=>({width:600,height:800}),render:()=>({promise:Promise.resolve(),cancel(){}}),streamTextContent:()=>new ReadableStream({start(c){if(failText){c.error(Error('text extraction failure'));return;}if(holdText)return;c.enqueue({items:[{str:'Synthetic PDF page'}],styles:{},lang:null});c.close();},cancel(){textCancelled++;}})})})})});
 const open=()=>api.open({snapshot,isCurrent:()=>current,isOriginCurrent:()=>originCurrent,editable:true,onSend:async()=>{sends++;}});
 let view=open();assert.equal(view.dialog.open,true,'Dialog opens in the original tap, before bytes');assert.equal(view.ready,false);await view.prepared;
 assert.equal(view.page,1);assert.equal(view.check.disabled,true);assert.throws(()=>api.requireReviewed(view.serialized),/todas/);
 view.check.checked=true;view.check.handlers.change();assert.equal(view.reviewed,false);assert.equal(view.send.disabled,true);
 await view.next.handlers.click();await turn();assert.equal(view.page,2);assert.equal(view.check.disabled,true);
 await view.next.handlers.click();await turn();assert.equal(view.page,3);assert.equal(view.check.disabled,false);assert.equal(view.send.disabled,true);
 view.check.checked=true;view.check.handlers.change();assert.equal(api.requireReviewed(view.serialized),view);await view.send.handlers.click();assert.equal(sends,1);
 api.setSubmitting(view,true);api.close();assert.equal(view.dialog.open,true);assert.equal(view.send.disabled,true);api.setSubmitting(view,false);const old=view.url;api.close();assert.ok(revoked.includes(old));assert.throws(()=>api.requireReviewed(view.serialized));
 fail=true;view=open();await view.prepared;assert.equal(view.ready,false);assert.equal(view.retry.hidden,false);assert.equal(view.send.disabled,true);fail=false;await view.retry.handlers.click();await turn();assert.equal(view.ready,true);assert.equal(view.seen.size,1);assert.equal(view.check.disabled,true);api.close();
 failText=true;view=open();await view.prepared;assert.equal(view.ready,false);assert.equal(view.seen.size,0);assert.equal(view.send.disabled,true);assert.throws(()=>api.requireReviewed(view.serialized));failText=false;await view.retry.handlers.click();await turn();assert.equal(view.ready,true);api.close();
 holdText=true;view=open();await turn();assert.equal(view.ready,false);assert.equal(view.send.disabled,true);api.close();await view.prepared;assert.equal(view.seen.size,0);assert.equal(textCancelled,1);holdText=false;
 buildGate=new Promise(r=>release=r);view=open();api.close();release();await view.prepared;buildGate=null;assert.equal(view.url,undefined,'A closed pending generation cannot retain bytes');
 view=open();await view.prepared;current=false;await view.next.handlers.click();await turn();assert.equal(view.dialog.isConnected,false);current=true;
 view=api.open({snapshot,isCurrent:()=>true});await view.prepared;assert.equal(view.editable,false);assert.equal(view.send,null); // No editable listeners in a historical view.
 assert.equal(view.check,null);assert.equal(api.complete(view),false,'History cannot complete a publication');api.close();assert.ok(destroyed>=4);
 const review=async v=>{await v.prepared;while(v.page<3){await v.next.handlers.click();await turn();}v.check.checked=true;v.check.handlers.change();};
 const scrolls=[],focus=[];globalThis.scrollX=7;globalThis.scrollY=430;globalThis.scrollTo=position=>scrolls.push(position);
 view=open();await review(view);await view.send.handlers.click();assert.equal(view.dialog.open,true,'Resolving onSend alone must never imply confirmed delivery');
 originCurrent=false;assert.equal(api.complete(view),false);assert.equal(view.dialog.open,true);assert.equal(scrolls.length,0);originCurrent=true;
 current=false;assert.equal(api.canReturn(view),true,'Confirmed delivery may invalidate only the editable snapshot predicate');
 assert.equal(api.complete(view,()=>({isConnected:true,focus:options=>focus.push(options)})),true);
 assert.equal(view.dialog.isConnected,false);assert.deepEqual(focus,[{preventScroll:true}]);assert.deepEqual(scrolls,[{left:7,top:430,behavior:'instant'}]);
 assert.equal(api.complete(view),false);assert.equal(scrolls.length,1);current=true;
 const oldView=open();await review(oldView);api.close(true);const newer=open();await newer.prepared;
 assert.equal(api.complete(oldView),false);assert.equal(newer.dialog.open,true);assert.equal(scrolls.length,1);api.close(true);
 const manual=api.open({snapshot:{...snapshot,coachVoiceVersion:'coach-direct-v1',coachName:'Tu coach',conclusion:'Texto manual EFG con mi coach.'},isCurrent:()=>true,editable:true});await review(manual);
 assert.equal(manual.dialog.querySelector('[data-weekly-review-note]').hidden,false);assert.match(manual.dialog.querySelector('[data-weekly-review-note]').textContent,/No hay un nombre verificado/);assert.match(manual.dialog.querySelector('[data-weekly-review-note]').textContent,/no lo cambiamos automáticamente/);
 assert.equal(manual.send.disabled,false,'Copy warnings must not add a publication block');assert.equal(manual.snapshot.conclusion,'Texto manual EFG con mi coach.');api.close(true);
 delete globalThis.scrollTo;delete globalThis.scrollX;delete globalThis.scrollY;
}
console.log('PASS actual shared weekly/period controller: synchronous dialog, all-pages+checkbox gate, tamper refusal, pending close lock, resource cleanup, build retry resets review, late generation discarded, stale page closes, history has no send listener. DOM/decode doubles only.');
