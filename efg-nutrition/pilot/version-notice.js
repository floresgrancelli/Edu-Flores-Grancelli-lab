// Nutrición Con-Ciencia — opt-in version update notice for the installed /pilot/ PWA.
// Checks current published HTML only; no execution of remote code until the user chooses to reload.
export function createVersionNotice({
 currentVersion,canShow=()=>true,hasUnsavedChanges=()=>false,intervalMs=90000,
 announceMinorUpdates=false
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
 host.setAttribute("aria-label","Actualización de Nutrición Con-Ciencia");
 host.hidden=true;
 document.body.append(host);
 // Offer the upgrade, but never auto-reload a running food diary or edit.
 // Build changes are independent of promotional and legal flows.
 function paint(){
  host.replaceChildren();
  // UX-35 definitive 29/10: minor/daily releases are SILENT by default.
  // Manual check still reports the new code; major reauth has a separate,
  // server-verified, explicitly approved release workflow.
  const canPresent=announceMinorUpdates===true&&!!latest&&dismissed!==latest.key&&canShow()&&!document.hidden;
  host.hidden=!canPresent;
  if(!canPresent)return;
  const icon=document.createElement("span");
  icon.className="efg-version-icon";
  icon.textContent="↻";
  icon.setAttribute("aria-hidden","true");
  const copy=document.createElement("div");
  copy.className="efg-version-copy";
  const title=document.createElement("strong");
  title.textContent="Hay una actualización disponible";
  const hint=document.createElement("p");
  const dirty=!!hasUnsavedChanges();
  hint.textContent=dirty
   ?"Guardá tus cambios y volvé a abrir la app para instalarla sin perder lo que estás editando."
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
  instructions.textContent="Cómo actualizar";
  instructions.addEventListener("click",()=>{
   hint.textContent="Guardá tus cambios, cerrá la app y volvé a abrirla. La actualización nunca recarga tu sesión de forma automática.";
  });
  actions.append(later,instructions);
  host.append(icon,copy,actions);
 }
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
 return {check,paint,getLatest:()=>latest,getLastChecked:()=>lastChecked,getStatus:()=>({current:headVersion,latest:latest?.version||null,hasUpdate:!!latest,automaticNoticeEnabled:announceMinorUpdates===true,lastError,lastChecked,working}),dismiss:()=>{dismissed=latest?.key||null;paint();},dispose:()=>{
  clearInterval(poll);
  document.removeEventListener("visibilitychange",visibilityHandler);
  window.removeEventListener("focus",focusHandler);host.remove();
 }};
}
