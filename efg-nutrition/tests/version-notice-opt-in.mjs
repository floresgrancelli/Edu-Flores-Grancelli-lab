// NUT-58: local DOM-only simulation, no browser, network or production data.
import assert from "node:assert/strict";
import {createVersionNotice} from "../pilot/version-notice.js";

function el(tag){
 return {
  tagName:tag.toUpperCase(),children:[],hidden:false,disabled:false,textContent:"",
  attributes:{},listeners:{},className:"",type:"",
  setAttribute(k,v){this.attributes[k]=String(v)},
  append(...children){this.children.push(...children)},
  replaceChildren(...children){this.children=[...children]},
  addEventListener(k,cb){this.listeners[k]=cb},
  remove(){this.wasRemoved=true},
  click(){this.listeners.click?.()},
 };
}
const root=el("body");
const current="build-1";
let available="build-2",editing=false,loggedIn=true,visible=true,reloads=0;
const original={
 document:globalThis.document,window:globalThis.window,DOMParser:globalThis.DOMParser,
 fetch:globalThis.fetch
};
globalThis.document={
 get hidden(){return !visible},
 body:root,
 createElement:el,
 querySelector(selector){
  if(selector==='meta[name="efg-build"]')return {content:current};
  if(selector.includes('pilot.js'))return {getAttribute:()=>"/pilot/pilot.js?v="+current};
  return null
 },
 querySelectorAll(selector){
  return selector==='link[rel="stylesheet"]'
   ?[{getAttribute:()=>"/pilot/pilot.css?v="+current}]:[]
 },
 addEventListener(){},
 removeEventListener(){}
};
globalThis.window={location:{reload(){reloads++}},addEventListener(){},removeEventListener(){}};
globalThis.DOMParser=class{
 parseFromString(){
  return {
   querySelector(selector){
    if(selector==='meta[name="efg-build"]')return {getAttribute:()=>available};
    if(selector.includes('pilot.js'))return {getAttribute:()=>"/pilot/pilot.js?v="+available};
    return null
   },
   querySelectorAll(selector){
    return selector==='link[rel="stylesheet"]'
     ?[{getAttribute:()=>"/pilot/pilot.css?v="+available}]:[]
   }
  }
 }
};
globalThis.fetch=async (url,opts)=>{
 assert.match(url,/efg_version_check=/);
 assert.equal(opts.cache,"no-store");
 return {ok:true,text:async()=>"<html><head></head><body></body></html>"};
};
const notice=createVersionNotice({
 currentVersion:current,canShow:()=>loggedIn,
 hasUnsavedChanges:()=>editing,intervalMs:3600000
});
const host=root.children.find(x=>x.id==="efgVersionNotice");
assert.ok(host);
await notice.check({force:true});
assert.equal(notice.getStatus().hasUpdate,true);
assert.equal(host.hidden,false,"Latest version must show visible banner");
const buttons=()=>host.children.find(x=>x.className==="efg-version-actions")?.children;
assert.deepEqual(buttons().map(x=>x.textContent),["Más tarde","Actualizar"]);
assert.equal(reloads,0,"Never auto-reload merely because version changed");
editing=true;notice.paint();
assert.equal(host.hidden,false);
assert.equal(buttons()[1].disabled,true,"Cannot reload unsaved meal");
buttons()[1].click();
assert.equal(reloads,0);
buttons()[0].click();
assert.equal(host.hidden,true,"Dismissed release must stay hidden");
await notice.check({force:true});
assert.equal(host.hidden,true,"Polling should not repeat dismissed same version");
available="build-3";
await notice.check({force:true});
assert.equal(host.hidden,false,"Newer release reopens dismissed banner");
editing=false;notice.paint();
assert.equal(buttons()[1].disabled,false);
loggedIn=false;notice.paint();
assert.equal(host.hidden,true,"Do not show version notice on login screen");
loggedIn=true;visible=false;notice.paint();
assert.equal(host.hidden,true,"Do not show version notice in background");
visible=true;notice.paint();
assert.equal(host.hidden,false);
buttons()[1].click();
assert.equal(reloads,1,"Only the user's explicit click may reload");
notice.dispose();
assert.equal(host.wasRemoved,true);
Object.assign(globalThis,original);
console.log("PASS NUT-58: update visible, opt-in only, not while unsaved, dismissed release stable, new release reopens, login/background hidden.");
