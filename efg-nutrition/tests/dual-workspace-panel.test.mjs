import test from 'node:test';
import assert from 'node:assert/strict';
import {mountDualWorkspacePanel} from '../pilot/dual-workspace-panel.mjs';
import {createSyntheticService} from './dual-workspace-fixture.mjs';
class Element {
 constructor(tag,doc){this.tag=tag;this.ownerDocument=doc;this.children=[];this.listeners={};this.isConnected=true;this.disabled=false;}
 append(...nodes){this.children.push(...nodes);}
 prepend(...nodes){this.children.unshift(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 setAttribute(){}
 addEventListener(type,callback){this.listeners[type]=callback;}
 querySelectorAll(tags){return this.children.flatMap(node=>[...(tags.split(',').includes(node.tag)?[node]:[]),...node.querySelectorAll(tags)]);}
}
test('real panel snapshots successful form controls BEFORE disabling pending submit',async()=>{
 const doc={createElement:tag=>new Element(tag,doc)},root=new Element('section',doc),service=createSyntheticService();
 const oldFormData=globalThis.FormData;
 globalThis.FormData=class {constructor(form){this.values=new Map(form.querySelectorAll('input').filter(e=>!e.disabled).map(e=>[e.name,e.value]));}get(name){return this.values.get(name)??null;}};
 try{
  const panel=mountDualWorkspacePanel({root,enabled:true,readSession:()=>({userId:'admin',sessionId:'synthetic'}),
   rpc:(n,a)=>service.call('admin',n,a),readLegacyPersonal:()=>({profile:service.inspect().profiles.find(p=>p.user_id==='admin'),organization:null})});
  await panel.ready;
  const form=root.querySelectorAll('form')[0];form.querySelectorAll('input').find(i=>i.name==='seats').value='7';
  form.listeners.submit({preventDefault(){},stopPropagation(){}});
  for(let n=0;n<10&&!service.inspect().capabilities.length;n++)await new Promise(resolve=>setImmediate(resolve));
  const db=service.inspect();assert.equal(db.capabilities.length,1);
  assert.equal(db.organizations.find(o=>o.id===db.capabilities[0].organization_id).seat_limit,7);
  assert.equal(db.profiles.find(p=>p.user_id==='learner').role,'student');
  panel.dispose();
 }finally{globalThis.FormData=oldFormData;}
});
