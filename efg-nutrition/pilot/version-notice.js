// Nutrición Con-Ciencia — opt-in version update notice for the installed /pilot/ PWA.
// Checks current published HTML only; no execution of remote code until the user chooses to reload.
export function createVersionNotice({
 currentVersion,canShow=()=>true,hasUnsavedChanges=()=>false,intervalMs=90000,
 announceMinorUpdates=true,onOpen=()=>{},onChange=()=>{},getContextKey=()=>null,
 reload=()=>{const url=new URL(window.location.href);url.searchParams.set("ncc_updated",String(Date.now()));window.location.replace(url.toString());}
}={}){
 const headVersion=document.querySelector('meta[name="efg-build"]')?.content||String(currentVersion||"");
 const stylesheetSignature=(doc)=>{
  const links=[...doc.querySelectorAll('link[rel="stylesheet"]')];
  // Runtime modules append styles before this initializer. Only compare the
  // release-owned links that also exist in the fetched, unexecuted HTML.
  const releaseLinks=links.filter(el=>el.getAttribute("data-ncc-release-style")==="true");
  return (releaseLinks.length?releaseLinks:links).map(el=>el.getAttribute("href")||"").sort();
 };
 const signature=doc=>JSON.stringify({
  entry:doc.querySelector('script[type="module"][src*="pilot.js"]')?.getAttribute("src")||"",
  css:stylesheetSignature(doc)
 });
 const initialSignature=signature(document);
 const sourceUrl=new URL("./index.html",import.meta.url);
 let latest=null,dismissed=null,working=false,lastChecked=0,lastError=null;
 let inFlight=null,finishFlight=null,disposed=false,updating=false;
 const host=document.createElement("aside");
 host.id="efgVersionNotice";
 host.className="efg-version-notice";
 host.setAttribute("aria-live","polite");
 host.setAttribute("aria-label","Actualización de Nutrición Con-Ciencia");
 host.hidden=true;
 document.body.append(host);
 // Offer the upgrade, but never auto-reload a running food diary or edit.
 // Build changes are independent of promotional and legal flows.
 function paint(){
  if(disposed)return;
  host.replaceChildren();
  // User-approved 14/11: announce every new asset version without automatic reload.
  const canPresent=announceMinorUpdates===true&&!!latest&&dismissed!==latest.key&&canShow()&&!document.hidden;
  host.hidden=!canPresent;
  if(!canPresent)return;
  const icon=document.createElement("span");
  icon.className="efg-version-icon";
  icon.textContent="☁";
  icon.setAttribute("aria-hidden","true");
  const copy=document.createElement("div");
  copy.className="efg-version-copy";
  const title=document.createElement("strong");
  title.textContent="Nueva actualización";
  const hint=document.createElement("p");
  const dirty=!!hasUnsavedChanges();
  hint.textContent=dirty
   ?"Guardá tus cambios antes de actualizar."
   :"Podés actualizar ahora o seguir usando esta versión.";
  copy.append(title,hint);
  const actions=document.createElement("div");
  actions.className="efg-version-actions";
  const later=document.createElement("button");
  later.type="button";later.className="efg-version-later";
  later.textContent="Más tarde";
  later.addEventListener("click",()=>{
   dismissed=latest?.key||null;
   paint();
  });
  const instructions=document.createElement("button");
  instructions.type="button";instructions.className="efg-version-update";
  instructions.textContent="Ver actualización";
  instructions.addEventListener("click",()=>{onOpen();});
  actions.append(later,instructions);
  host.append(icon,copy,actions);
 }
 async function check({force=false,reopen=false}={}){
  if(disposed)return false;
  if(inFlight){
   await inFlight;
   if(disposed)return false;
   if(reopen&&latest){dismissed=null;paint();}
   return !!latest;
  }
  if(!force&&document.hidden)return false;
  inFlight=new Promise(resolve=>{finishFlight=resolve;});
  working=true;
  const abort=new AbortController();
  const timeout=setTimeout(()=>abort.abort(),12000);
  try{
   const url=new URL(sourceUrl);
   url.searchParams.set("efg_version_check",String(Date.now()));
   const response=await fetch(url.toString(),{signal:abort.signal,cache:"no-store",credentials:"same-origin",headers:{"Accept":"text/html"}});
   if(disposed)return false;
   if(!response.ok)throw Error("Version check HTTP "+response.status);
   const html=await response.text();
   if(disposed)return false;
   if(!/<!doctype html|<html/i.test(html.slice(0,600)))throw Error("Invalid version response");
   const doc=new DOMParser().parseFromString(html,"text/html");
   const serverVersion=doc.querySelector('meta[name="efg-build"]')?.getAttribute("content")||"";
   const serverSignature=signature(doc);
   // A partial or captive-portal HTML response must not masquerade as a release.
   if(!serverVersion||!doc.querySelector('script[type="module"][src*="pilot.js"]'))throw Error("Incomplete version manifest");
   const changed=(serverVersion&&serverVersion!==headVersion)||(serverSignature&&serverSignature!==initialSignature);
   // No update banner if the response is ambiguous or the server is unavailable.
   latest=changed?{key:serverVersion+"|"+serverSignature,version:serverVersion}:null;
   lastChecked=Date.now();lastError=null;
   if(reopen&&latest)dismissed=null;
   paint();onChange();return !!latest;
  }catch(err){lastError=String(err?.message||err);console.warn("EFG version check unavailable:",lastError);return false}
  finally{
   clearTimeout(timeout);working=false;
   const finish=finishFlight;inFlight=null;finishFlight=null;
   if(finish)finish();
  }
 }
 async function apply({explicitClick=false,discardConfirmed=false}={}){
  if(disposed||updating||!explicitClick||!canShow())return {updated:false,reason:'unavailable'};
  if(hasUnsavedChanges()&&!discardConfirmed)return {updated:false,reason:'unsaved'};
  const contextKey=getContextKey();
  updating=true;
  try{
   await check({force:true});
   if(getContextKey()!==contextKey)return {updated:false,reason:'unavailable'};
   if(disposed||!canShow()||lastError)return {updated:false,reason:'offline'};
   if(!latest)return {updated:false,reason:'current'};
   if(hasUnsavedChanges()&&!discardConfirmed)return {updated:false,reason:'unsaved'};
   reload();return {updated:true};
  }finally{updating=false;}
 }
 const visibilityHandler=()=>{if(!document.hidden){paint();void check();}};
 const focusHandler=()=>{paint();void check();};
 document.addEventListener("visibilitychange",visibilityHandler);
 window.addEventListener("focus",focusHandler);
 const poll=setInterval(()=>{void check();},intervalMs);
 // Do the first fetch promptly after all module initializers have mounted.
 queueMicrotask(()=>{void check({force:true});});
 return {check,paint,apply,getLatest:()=>latest,getLastChecked:()=>lastChecked,getStatus:()=>({current:headVersion,latest:latest?.version||null,hasUpdate:!!latest,automaticNoticeEnabled:announceMinorUpdates===true,lastError,lastChecked,working}),dismiss:()=>{dismissed=latest?.key||null;paint();},dispose:()=>{
  if(disposed)return;
  disposed=true;
  clearInterval(poll);
  document.removeEventListener("visibilitychange",visibilityHandler);
  window.removeEventListener("focus",focusHandler);host.remove();
 }};
}
