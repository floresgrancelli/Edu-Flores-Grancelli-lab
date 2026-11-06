import test from 'node:test';
import assert from 'node:assert/strict';
import {createDualWorkspaceFrame,workspaceIdentity,isDualWorkspaceField} from '../pilot/dual-workspace-frame.mjs';

class Element {
 constructor(){this.dataset={};this.attributes={};this.handlers={};this.isConnected=true;this.children=[];}
 setAttribute(k,v){this.attributes[k]=v;}
 append(child){this.children.push(child);child.isConnected=true;child.parent=this;}
 remove(){this.isConnected=false;this.parent=null;}
 addEventListener(k,f){this.handlers[k]=f;}
}
function fakeFrame(){
 const root=new Element(),personal=new Element(),slot=new Element(),nav=[new Element(),new Element()];
 root.ownerDocument={createElement:()=>new Element()};
 root.querySelector=s=>s==='[data-ncc-personal-content]'?personal:s==='[data-ncc-dual-slot]'?slot:null;
 root.querySelectorAll=s=>s==='.pilot-nav [data-tab]'?nav:[];
 return {root,personal,slot,nav};
}
function harness(){
 let session={userId:'learner',sessionId:'session',epoch:1},calls=[],disposed=0;
 const bridge=createDualWorkspaceFrame({enabled:true,readSession:()=>session,
  mountPanel(options){calls.push(options);return {ready:Promise.resolve({disabled:false}),dispose(){disposed++;}};}});
 return {bridge,calls,session:v=>{session=v;},get disposed(){return disposed;}};
}
test('frame feature OFF touches no DOM, identity or RPC',async()=>{
 const forbidden=()=>assert.fail('Disabled feature accessed a dependency');
 const frame=createDualWorkspaceFrame({readSession:forbidden,rpc:forbidden,mountPanel:forbidden});
 frame.prepareFrame();frame.mountFrame(null);frame.guardEvent(null);frame.invalidate();
 assert.equal(frame.wrap('base app'),'base app');assert.equal(frame.isProfessional(),false);
 assert.deepEqual(await frame.ready(),{disabled:true});
});
test('selection hides and inerts personal content; personal navigation disabled; logout allowed',()=>{
 const h=harness(),f=fakeFrame();h.bridge.mountFrame(f.root);
 h.calls[0].onView({professional:{id:'own'}});
 assert.equal(f.personal.hidden,true);assert.equal(f.personal.inert,true);assert.ok(f.nav.every(b=>b.disabled));
 let prevented=0,stopped=0;
 const click=target=>({type:'click',target,preventDefault(){prevented++;},stopImmediatePropagation(){stopped++;}});
 assert.equal(h.bridge.guardEvent(click({closest:()=>null})),true);
 assert.equal(prevented,1);assert.equal(stopped,1);
 assert.equal(h.bridge.guardEvent(click({closest:s=>s==='[data-act="logout"]'?{}:null})),false);
 assert.equal(h.bridge.guardEvent(click({closest:s=>s==='[data-ncc-dual-panel]'?{}:null})),false);
 h.calls[0].onView({professional:null});assert.equal(f.personal.hidden,false);assert.equal(f.personal.inert,false);
 assert.ok(f.nav.every(b=>!b.disabled));
});
test('repeated real frame replaces reuse panel, operation state and selected space',()=>{
 const h=harness(),a=fakeFrame(),b=fakeFrame();h.bridge.mountFrame(a.root);h.calls[0].onView({professional:{id:'own'}});
 h.bridge.prepareFrame();h.bridge.mountFrame(b.root);
 assert.equal(h.calls.length,1);assert.equal(h.disposed,0);assert.equal(b.personal.hidden,true);
 assert.equal(b.slot.children[0],a.slot.children[0]);
});
test('UID, session and auth epoch each isolate selection and pending callbacks',()=>{
 for(const next of [{userId:'other',sessionId:'session',epoch:1},
  {userId:'learner',sessionId:'new-session',epoch:1},{userId:'learner',sessionId:'session',epoch:2}]){
  const h=harness(),f=fakeFrame();h.bridge.mountFrame(f.root);const old=h.calls[0];old.onView({professional:{id:'own'}});
  h.session(next);h.bridge.revalidate();assert.equal(h.disposed,1);assert.equal(h.bridge.isProfessional(),false);
  old.onView({professional:{id:'stale'}});assert.equal(f.personal.hidden,false);
  h.bridge.mountFrame(f.root);assert.equal(h.calls.length,2);
  assert.notEqual(old.readSession().sessionId,undefined);
 }
});
test('null or malformed session cannot mount; explicit invalidation clears selection',()=>{
 const h=harness(),f=fakeFrame();h.session(null);h.bridge.mountFrame(f.root);assert.equal(h.calls.length,0);
 assert.equal(workspaceIdentity({userId:'a',sessionId:'b',epoch:NaN}),null);
 assert.equal(workspaceIdentity({userId:'a',epoch:1}),null);
 h.session({userId:'a',sessionId:'b',epoch:2});h.bridge.mountFrame(f.root);
 h.calls[0].onView({professional:{id:'own'}});h.bridge.invalidate();assert.equal(f.personal.hidden,false);assert.equal(h.disposed,1);
});
test('panel fields have an explicit marker for personal dirty-state exclusion',()=>{
 assert.equal(isDualWorkspaceField(null),false);
 assert.equal(isDualWorkspaceField({closest:()=>null}),false);
 assert.equal(isDualWorkspaceField({closest:s=>s==='[data-ncc-dual-panel]'?{}:null}),true);
});
