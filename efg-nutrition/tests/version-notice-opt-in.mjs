import './approved-release-flags.mjs';
// NUT-58: local DOM-only simulation, no browser, network or production data.
import assert from "node:assert/strict";
import {createVersionNotice} from "../pilot/version-notice.js";
import {readFileSync,existsSync} from "node:fs";
import {assertPwaBuildIdentity} from "../tools/pwa-build-identity.mjs";
// A candidate changing Coach permissions and the first-use illustration MUST
// carry a coherent release and cache-busted module URL. Minor hotfixes keep
// the server release identity and must match their exact pinned asset manifest.
const liveHtml=readFileSync(new URL("../pilot/index.html",import.meta.url),"utf8");
const appJs=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
const build=liveHtml.match(/<meta name="efg-build" content="([^"]+)"/)?.[1];
const entry=liveHtml.match(/<script type="module" src="\.\/pilot\.js\?v=([^"]+)"/)?.[1];
const candidateManifest=new URL("../docs/guide-return-candidate/asset-manifest.json",import.meta.url);
const hotfixBytes=readFileSync(existsSync(candidateManifest)?candidateManifest:new URL("../docs/p30o-guide/asset-overrides.json",import.meta.url));
assert.deepEqual(assertPwaBuildIdentity(liveHtml,hotfixBytes),{build,assetVersion:entry});
for(const changed of [
 liveHtml.replace(entry,entry+"-unknown"),
 liveHtml.replace(`content="${build}"`,`content="${build}-other"`),
 liveHtml.replace("</head>","<meta name=\"efg-build\" content=\"duplicate\"></head>"),
 liveHtml.replace("</body>","<!-- unreviewed HTML --> </body>")
])assert.throws(()=>assertPwaBuildIdentity(changed,hotfixBytes));
assert.throws(()=>assertPwaBuildIdentity(liveHtml));
assert.throws(()=>assertPwaBuildIdentity(liveHtml,Buffer.from("{}")));
const regular=liveHtml.replaceAll(entry,build);
assert.deepEqual(assertPwaBuildIdentity(regular),{build,assetVersion:build});
assert.match(build,/ncc-pilot-3a40474052be/,"Gran Actualización must version walking steps and preserve older reviewed food signals");
const scienceVersion=JSON.parse(hotfixBytes).moduleVersions["efg-nutrition/pilot/science-welcome.js"];
assert.ok(scienceVersion,"Reviewed science module version must be present");
assert.ok(appJs.includes('./science-welcome.js?v='+scienceVersion+'"'),"Load approved science module at the exact pinned version");


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
let availableAsset=null;
let available="build-2",editing=false,loggedIn=true,visible=true,reloads=0,opens=0,contextKey=0;
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
    if(selector.includes('pilot.js'))return {getAttribute:()=>"/pilot/pilot.js?v="+(availableAsset||available)};
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
 hasUnsavedChanges:()=>editing,intervalMs:3600000,
 getContextKey:()=>contextKey,onOpen:()=>{opens++},reload:()=>{reloads++} // visible by default, explicit update only
});
const host=root.children.find(x=>x.id==="efgVersionNotice");
assert.ok(host);
await notice.check({force:true});
assert.equal(notice.getStatus().hasUpdate,true);
assert.equal(host.hidden,false,"Latest version must show visible banner");
const buttons=()=>host.children.find(x=>x.className==="efg-version-actions")?.children;
assert.deepEqual(buttons().map(x=>x.textContent),["Más tarde","Ver actualización"]);
assert.equal(reloads,0,"Never auto-reload merely because version changed");
editing=true;notice.paint();
assert.equal(host.hidden,false);
assert.equal(buttons()[1].disabled,false,"Instructions remain accessible even during an unsaved edit");
buttons()[1].click();
assert.equal(opens,1,"Open update view without losing the current form");
assert.equal(reloads,0);
assert.deepEqual(await notice.apply({explicitClick:true}),{updated:false,reason:"unsaved"});
assert.match(host.children.find(x=>x.className==="efg-version-copy").children[1].textContent,/Guardá tus cambios/);
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
assert.equal(reloads,0,"Instructions never reload a running PWA");
assert.deepEqual(await notice.apply(),{updated:false,reason:'unavailable'});
assert.equal(reloads,0);
assert.deepEqual(await notice.apply({explicitClick:true}),{updated:true});assert.equal(reloads,1);
editing=true;
assert.deepEqual(await notice.apply({explicitClick:true,discardConfirmed:true}),{updated:true});assert.equal(reloads,2);
editing=false;
const goodFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('offline')};
assert.deepEqual(await notice.apply({explicitClick:true}),{updated:false,reason:'offline'});assert.equal(reloads,2);
globalThis.fetch=goodFetch;reloads=0;
let finishUpdate;
globalThis.fetch=async()=>new Promise(resolve=>{finishUpdate=resolve});
const pendingUpdate=notice.apply({explicitClick:true});
assert.deepEqual(await notice.apply({explicitClick:true}),{updated:false,reason:'unavailable'},'Double click cannot run concurrent updates');
contextKey++;
finishUpdate({ok:true,text:async()=>'<html><body></body></html>'});
assert.deepEqual(await pendingUpdate,{updated:false,reason:'unavailable'},'Account change cancels the old update request');
assert.equal(reloads,0);globalThis.fetch=goodFetch;
notice.dispose();
assert.equal(host.wasRemoved,true);
// Explicit opt-out remains available to isolated consumers; the app opts in.
const silent=createVersionNotice({
 currentVersion:current,canShow:()=>loggedIn,
 hasUnsavedChanges:()=>editing,intervalMs:3600000,announceMinorUpdates:false
});
const silentHost=root.children.at(-1);
await silent.check({force:true});
assert.equal(silent.getStatus().hasUpdate,true,"Manual check still detects updated code");
assert.equal(silent.getStatus().automaticNoticeEnabled,false);
assert.equal(silentHost.hidden,true,"Minor deployments never interrupt a logged-in user");
await silent.check({force:true,reopen:true});
assert.equal(silentHost.hidden,true,"Manual checking must not create unwanted minor popup");
available=current;availableAsset=current+"-intakefix1";
await silent.check({force:true});
assert.equal(silent.getStatus().hasUpdate,true,"Asset URL changes are detected even with the same server release");
assert.equal(silentHost.hidden,true,"An asset-only hotfix remains silent");
assert.equal(reloads,0,"Asset-only updates never reload edited forms");
silent.dispose();
// Regression: modules already appended runtime styles before initialization.
const originalLinks=document.querySelectorAll;
document.querySelectorAll=selector=>selector==='link[rel="stylesheet"]'?
 [{getAttribute:key=>key==='data-ncc-release-style'?'true':'/pilot/pilot.css?v='+current},
  {getAttribute:key=>key==='href'?'/pilot/student-plan-r1.css?v=runtime':null}]:[];
const OriginalParser=globalThis.DOMParser;
globalThis.DOMParser=class {parseFromString(){return {
 querySelector:selector=>selector==='meta[name="efg-build"]'?{getAttribute:()=>available}:selector.includes('pilot.js')?{getAttribute:()=>'/pilot/pilot.js?v='+(availableAsset||available)}:null,
 querySelectorAll:()=>[{getAttribute:key=>key==='data-ncc-release-style'?'true':'/pilot/pilot.css?v='+available}]
};}};
available=current;availableAsset=null;
const reloaded=createVersionNotice({currentVersion:current,intervalMs:3600000});
await reloaded.check({force:true});assert.equal(reloaded.getStatus().hasUpdate,false,'Runtime CSS must not advertise an update after reload');
await reloaded.check({force:true});assert.equal(reloaded.getStatus().hasUpdate,false,'Repeated checks remain current');
availableAsset=current+'-next';await reloaded.check({force:true});assert.equal(reloaded.getStatus().hasUpdate,true,'A genuine new entry still announces an update');
availableAsset=null;available=current+'-css';await reloaded.check({force:true});assert.equal(reloaded.getStatus().hasUpdate,true,'Release CSS changes remain detectable');
reloaded.dispose();document.querySelectorAll=originalLinks;globalThis.DOMParser=OriginalParser;
// 09-02/09-03: an old async version response cannot reopen a discarded
// component after navigating away/logging out or recreating the PWA shell.
let finishStaleFetch,staleFetches=0;
globalThis.fetch=async()=>{
 staleFetches++;
 return new Promise(resolve=>{finishStaleFetch=resolve});
};
const dying=createVersionNotice({
 currentVersion:current,canShow:()=>loggedIn,intervalMs:3600000,
 announceMinorUpdates:true
});
const dyingHost=root.children.at(-1);
const inflight=dying.check({force:true});
assert.equal(staleFetches,1,"Probe starts before route unmount");
dying.dispose();
assert.equal(dyingHost.wasRemoved,true);
finishStaleFetch({ok:true,text:async()=>"<html><body></body></html>"});
assert.equal(await inflight,false,"Unmount cancels presentation of stale async response");
assert.equal(dying.getLatest(),null,"Unmounted component must not publish a stale update");
assert.equal(dying.getStatus().working,false,"Unloading releases in-flight state");
assert.equal(await dying.check({force:true}),false,"Disposed checker never fetches again");
assert.equal(staleFetches,1);
Object.assign(globalThis,original);
console.log("PASS NUT-58: visible noninterrupting update notice, explicit update and unsaved-edit/offline guards, dismissal, new release reopens, login/background hidden.");
