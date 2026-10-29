// EFG Nutrition Pro — opt-in version update notice for the installed /pilot/ PWA.
// Checks current published HTML only; no execution of remote code until the user chooses to reload.
export function createVersionNotice({
 currentVersion,canShow=()=>true,hasUnsavedChanges=()=>false,intervalMs=90000
}={}){
 const headVersion=document.querySelector('meta[name="efg-build"]')?.content||String(currentVersion||"");
 const stylesheetSignature=(doc)=>[...doc.querySelectorAll('link[rel="stylesheet"]')].map(el=>el.getAttribute("href")||"").sort();
 const signature=doc=>JSON.stringify({
  entry:doc.querySelector('script[type="module"][src*="pilot.js"]')?.getAttribute("src")||"",
  css:stylesheetSignature(doc)
 });
 const initialSignature=signature(document);
 const sourceUrl=new URL("./index.html",import.meta.url);
 let latest=null,dismissed=null,working=false,lastChecked=0,lastError=null;
 let inFlight=null,finishFlight=null;
 const host=document.createElement("aside");
 host.id="efgVersionNotice";
 host.className="efg-version-notice";
 host.setAttribute("aria-live","polite");
 host.setAttribute("aria-label","Actualización de EFG Nutrition Pro");
 host.hidden=true;
 document.body.append(host);
 // Build changes are silent. Promotional and legal flows have separate server gates.
 function paint(){host.hidden=true;host.innerHTML="";}
 async function check({force=false,reopen=false}={}){
  if(inFlight){
   await inFlight;
   if(reopen&&latest){dismissed=null;paint();}
   return !!latest;
  }
  if(!force&&document.hidden)return false;
  inFlight=new Promise(resolve=>{finishFlight=resolve;});
  working=true;
  try{
   const url=new URL(sourceUrl);
   url.searchParams.set("efg_version_check",String(Date.now()));
   const response=await fetch(url.toString(),{cache:"no-store",credentials:"same-origin",headers:{"Accept":"text/html"}});
   if(!response.ok)throw Error("Version check HTTP "+response.status);
   const html=await response.text();
   if(!/<!doctype html|<html/i.test(html.slice(0,600)))throw Error("Invalid version response");
   const doc=new DOMParser().parseFromString(html,"text/html");
   const serverVersion=doc.querySelector('meta[name="efg-build"]')?.getAttribute("content")||"";
   const serverSignature=signature(doc);
   const changed=(serverVersion&&serverVersion!==headVersion)||(serverSignature&&serverSignature!==initialSignature);
   // No update banner if the response is ambiguous or the server is unavailable.
   latest=changed?{key:serverVersion||serverSignature,version:serverVersion}:null;
   lastChecked=Date.now();lastError=null;
   if(reopen&&latest)dismissed=null;
   paint();return !!latest;
  }catch(err){lastError=String(err?.message||err);console.warn("EFG version check unavailable:",lastError);return false}
  finally{
   working=false;
   const finish=finishFlight;inFlight=null;finishFlight=null;
   if(finish)finish();
  }
 }
 const visibilityHandler=()=>{if(!document.hidden){paint();void check();}};
 const focusHandler=()=>{paint();void check();};
 document.addEventListener("visibilitychange",visibilityHandler);
 window.addEventListener("focus",focusHandler);
 const poll=setInterval(()=>{void check();},intervalMs);
 // Do the first fetch promptly after all module initializers have mounted.
 queueMicrotask(()=>{void check({force:true});});
 return {check,paint,getLatest:()=>latest,getLastChecked:()=>lastChecked,getStatus:()=>({current:headVersion,latest:latest?.version||null,hasUpdate:!!latest,lastError,lastChecked,working}),dismiss:()=>{dismissed=latest?.key||null;paint();},dispose:()=>{
  clearInterval(poll);
  document.removeEventListener("visibilitychange",visibilityHandler);
  window.removeEventListener("focus",focusHandler);host.remove();
 }};
}
