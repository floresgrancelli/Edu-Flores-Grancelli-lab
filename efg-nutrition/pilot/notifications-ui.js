// Resolve only known destinations; stale alerts never reuse another student's selection.
export function notificationDestination(n,{role,testCoach=false,userId,roster=[],consented={}}={}){
 const coach=role==="coach"||(role==="admin"&&testCoach);
 const allowed=new Set(["home","reports","coachStudents","coachIntake","summaries","payments","messages"]);
 if(!allowed.has(n.target_tab))throw Error("Este aviso no tiene un destino disponible.");
 let tab=n.target_tab,student=null;
 if(["reports","coachStudents","coachIntake"].includes(tab)&&!coach)throw Error("Este aviso no corresponde a tu espacio actual.");
 if(coach&&["reports","coachStudents","coachIntake","messages"].includes(tab)){
  const p=roster.find(p=>p.user_id===n.target_student&&p.active);
  if(!p||consented[p.user_id]!==true)throw Error("El alumno de este aviso ya no está disponible para tu seguimiento.");
  student=p.user_id;
 }
 if(tab==="messages"&&!coach){if(role!=="student")throw Error("No hay una conversación habilitada para este aviso.");student=userId;}
 if(tab==="summaries"&&role!=="student")throw Error("Este informe no corresponde a tu espacio actual.");
 const week=tab==="summaries"&&n.kind==="weekly_report"?String(n.event_key||"").match(/^weekly:(\d{4}-\d{2}-\d{2}):/)?.[1]||null:null;
 if(tab==="home"&&n.kind==="guide"&&role==="student")tab="planner";
 return {tab:tab==="coachIntake"?"coachStudents":tab,student,section:n.target_tab==="coachIntake"?"coachStudentIntake":null,week};
}
export function notificationAction(n){
 return n.target_tab==="coachIntake"?"Ver ficha":n.target_tab==="messages"?"Abrir conversación":n.target_tab==="summaries"||n.target_tab==="reports"?"Ver informe":n.kind==="guide"?"Ver Dieta Guía":n.target_tab==="payments"?"Ver pagos":"Abrir aviso";
}
// EFG Nutrition Pro — persistent user-scoped inbox.
// Polls the RLS-protected table; never reloads the page or queries someone else's inbox.
export function createNotificationInbox({sb,getUserId,navigate,validate=()=>{}}){
 const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let records=[],open=false,loadedUser=null,inFlight=false,pendingRefresh=false,status="ok",failureType="network",filter="all",actionError="",opening=null;
 const host=document.createElement("aside");
 host.id="efgNotifications";host.className="efg-notifications";
 host.setAttribute("aria-label","Notificaciones de Nutrición Con-Ciencia");
 document.body.append(host);
 function filtersMarkup(){
  const unread=records.filter(n=>!n.is_read).length;
  return '<nav class="ncc-notify-filters" aria-label="Filtrar notificaciones">'+[["all","Todos",records.length],["unread","Sin leer",unread],["read","Leídos",records.length-unread]].map(([id,label,count])=>'<button type="button" data-efg-filter="'+id+'" aria-pressed="'+(filter===id)+'">'+label+' <span>'+count+'</span></button>').join("")+'</nav>';
 }
 function listMarkup(){
  const items=records.filter(n=>filter==="all"||(filter==="read"?n.is_read:!n.is_read));
  return items.length?items.map(n=>'<button class="efg-notify-item '+(n.is_read?'read':'unread')+'" type="button" data-efg-id="'+esc(n.id)+'" '+(opening?'disabled':'')+'><span class="efg-notify-item-top"><b>'+esc(n.title)+'</b><small>'+new Date(n.created_at).toLocaleDateString("es-AR",{timeZone:"America/Argentina/Buenos_Aires"})+'</small></span><span>'+esc(n.body)+'</span><span class="ncc-notify-footer"><small>'+(n.is_read?'Leída':'Sin leer')+'</small><strong>'+(opening===n.id?'Abriendo…':notificationAction(n))+' →</strong></span></button>').join(""):'<p class="efg-notify-empty">'+(filter==="unread"?'Estás al día. No hay avisos sin leer.':filter==="read"?'Todavía no hay avisos leídos.':'Todavía no hay avisos.')+'</p>';
 }

 function paint(){
  // Never render alerts cached for a different authenticated identity.
  const visibleUser=getUserId();
  if(visibleUser!==loadedUser){records=[];open=false;loadedUser=visibleUser;status="ok";failureType="network";filter="all";actionError="";opening=null;}
  const count=records.filter(n=>!n.is_read).length;
  const reason=failureType==="access"?"Revisá tu sesión y volvé a intentar.":failureType==="schema"?"El servicio de avisos no está disponible temporalmente.":"Comprobá tu conexión e intentá nuevamente.";
  const warning=status==="ok"?"":'<div class="efg-inbox-warning" role="status">No pudimos actualizar los avisos. Se muestran los últimos disponibles. '+reason+' <button type="button" data-efg-action="retry">Reintentar</button></div>';
  const actionWarning=actionError?'<p class="efg-inbox-warning" role="alert">'+esc(actionError)+'</p>':"";
  const full=document.getElementById("efgInboxFull");
  if(full)full.innerHTML=warning+actionWarning+filtersMarkup()+'<div class="efg-inbox-full-meta">'+count+' sin leer · '+records.length+' recientes</div>'+listMarkup();
  host.hidden=!visibleUser;
  if(host.hidden)return;
  host.innerHTML='<button type="button" class="efg-notify-bell" data-efg-action="toggle" aria-label="Notificaciones'+(count?', '+count+' sin leer':'')+'" aria-expanded="'+open+'"><svg class="efg-notify-bell-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>'+(count?'<span class="efg-notify-count">'+(count>99?'99+':count)+'</span>':'')+'</button>'+
    (open?'<section class="efg-notify-popup" role="region" aria-label="Bandeja de notificaciones"><div class="efg-notify-title"><strong>Notificaciones</strong><button type="button" data-efg-action="toggle" aria-label="Cerrar">✕</button></div>'+
    warning+actionWarning+filtersMarkup()+listMarkup()+'</section>':'');
 }
 async function refresh(){
  const userId=getUserId();
  // Identity change must clear old content BEFORE an outstanding request can defer a fetch.
  if(userId!==loadedUser){records=[];open=false;loadedUser=userId;status="ok";failureType="network";filter="all";actionError="";opening=null;paint();}
  if(!userId){records=[];open=false;status="ok";paint();return;}
  if(inFlight){pendingRefresh=true;return;}
  inFlight=true;
  try{
   const {data,error}=await sb.from("efg_notifications")
     .select("id,kind,event_key,title,body,target_tab,target_student,created_at,is_read")
     .eq("recipient_id",userId).order("created_at",{ascending:false}).limit(80);
   if(error)throw error;
   if(getUserId()!==userId)return;
   status="ok";failureType="network";records=data||[];paint();
  }catch(err){
   console.warn("EFG inbox:",err.message);
   // Offline, expired sessions and schema failures are not equivalent. Never hide saved alerts.
   if(getUserId()===userId){
    const code=String(err.code||""),http=Number(err.status||0);
    failureType=["42P01","PGRST205"].includes(code)?"schema":(["42501","PGRST301"].includes(code)||http===401||http===403)?"access":"network";
    status="stale";paint();
   }
  }finally{
   inFlight=false;
   // A login switch during a request must not wait for the 25-second polling interval.
   if(pendingRefresh||getUserId()!==userId){
    pendingRefresh=false;
    queueMicrotask(()=>refresh().catch(console.warn));
   }
  }
 }
 document.addEventListener("click",async event=>{
  if(!event.target.closest("#efgNotifications, #efgInboxFull"))return;
  const button=event.target.closest("button");if(!button)return;
  if(button.dataset.efgAction==="toggle"){open=!open;paint();return;}
  if(button.dataset.efgAction==="retry"){await refresh();return;}
  if(button.dataset.efgFilter){filter=button.dataset.efgFilter;actionError="";paint();return;}
  if(opening)return;
  const clickedUser=getUserId();
  if(!clickedUser||clickedUser!==loadedUser)return;
  const n=records.find(x=>x.id===button.dataset.efgId);if(!n)return;
  try{
   opening=n.id;actionError="";paint();
   await validate(n);
   if(getUserId()!==clickedUser)return;
   if(!n.is_read){
    const {data:confirmed,error}=await sb.from("efg_notifications")
     .update({is_read:true,read_at:new Date().toISOString()})
     .eq("id",n.id).eq("recipient_id",clickedUser).select("id").maybeSingle();
    if(error)throw error;
    if(confirmed?.id!==n.id)throw Error("No se pudo confirmar la lectura de la notificación.");
    if(getUserId()!==clickedUser)return;
    n.is_read=true;
   }
   if(getUserId()!==clickedUser)return;
   open=false;paint();
   await navigate(n);
   await refresh();
  }catch(err){console.error(err);if(getUserId()===clickedUser){actionError=err.message||"No pudimos abrir este aviso. Volvé a intentar.";open=true;}}
  finally{if(getUserId()===clickedUser){opening=null;paint();}}
 });
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh()});
 window.addEventListener("focus",()=>refresh());
 setInterval(()=>{if(!document.hidden&&getUserId())refresh();},25000);
 paint();
 return {refresh,repaint:paint};
}
