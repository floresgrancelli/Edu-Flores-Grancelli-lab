// EFG Nutrition Pro — persistent user-scoped inbox.
// Polls the RLS-protected table; never reloads the page or queries someone else's inbox.
export function createNotificationInbox({sb,getUserId,navigate}){
 const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let records=[],open=false,loadedUser=null,inFlight=false,status="ok";
 const host=document.createElement("aside");
 host.id="efgNotifications";host.className="efg-notifications";
 host.setAttribute("aria-label","Notificaciones de EFG");
 document.body.append(host);
 function listMarkup(){
  return records.length?records.map(n=>'<button class="efg-notify-item '+(n.is_read?'read':'unread')+'" type="button" data-efg-id="'+esc(n.id)+'"><span class="efg-notify-item-top"><b>'+esc(n.title)+'</b><small>'+new Date(n.created_at).toLocaleDateString("es-AR")+'</small></span><span>'+esc(n.body)+'</span></button>').join(""):'<p class="efg-notify-empty">Todavía no hay avisos.</p>';
 }
 function paint(){
  const count=records.filter(n=>!n.is_read).length;
  const warning=status==="ok"?"":'<div class="efg-inbox-warning" role="status">No pudimos actualizar los avisos. Se muestran los últimos disponibles. <button type="button" data-efg-action="retry">Reintentar</button></div>';
  const full=document.getElementById("efgInboxFull");
  if(full)full.innerHTML=warning+'<div class="efg-inbox-full-meta">'+count+' pendientes · '+records.length+' recientes</div>'+listMarkup();
  host.hidden=!getUserId();
  if(host.hidden)return;
  host.innerHTML='<button type="button" class="efg-notify-bell" data-efg-action="toggle" aria-label="Notificaciones'+(count?', '+count+' sin leer':'')+'" aria-expanded="'+open+'"><svg class="efg-notify-bell-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>'+(count?'<span class="efg-notify-count">'+(count>99?'99+':count)+'</span>':'')+'</button>'+
    (open?'<section class="efg-notify-popup" role="region" aria-label="Bandeja de notificaciones"><div class="efg-notify-title"><strong>Notificaciones</strong><button type="button" data-efg-action="toggle" aria-label="Cerrar">✕</button></div>'+
    warning+listMarkup()+'</section>':'');
 }
 async function refresh(){
  const userId=getUserId();
  if(!userId){records=[];loadedUser=null;open=false;status="ok";paint();return;}
  if(inFlight)return;
  if(userId!==loadedUser){records=[];open=false;loadedUser=userId;status="ok";}
  inFlight=true;
  try{
   const {data,error}=await sb.from("efg_notifications")
     .select("id,kind,title,body,target_tab,target_student,created_at,is_read")
     .eq("recipient_id",userId).order("created_at",{ascending:false}).limit(80);
   if(error)throw error;
   if(getUserId()!==userId)return;
   status="ok";records=data||[];paint();
  }catch(err){
   console.warn("EFG inbox:",err.message);
   // Offline, expired sessions and schema failures are not equivalent. Never hide saved alerts.
   if(getUserId()===userId){status="stale";paint();}
  }finally{inFlight=false;}
 }
 document.addEventListener("click",async event=>{
  if(!event.target.closest("#efgNotifications, #efgInboxFull"))return;
  const button=event.target.closest("button");if(!button)return;
  if(button.dataset.efgAction==="toggle"){open=!open;paint();return;}
  if(button.dataset.efgAction==="retry"){await refresh();return;}
  const n=records.find(x=>x.id===button.dataset.efgId);if(!n)return;
  try{
   if(!n.is_read){
    const {error}=await sb.from("efg_notifications").update({is_read:true,read_at:new Date().toISOString()}).eq("id",n.id).eq("recipient_id",getUserId());
    if(error)throw error;
    n.is_read=true;
   }
   open=false;paint();
   await navigate(n);
   await refresh();
  }catch(err){console.error(err);open=true;paint();}
 });
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh()});
 window.addEventListener("focus",()=>refresh());
 setInterval(()=>{if(!document.hidden&&getUserId())refresh();},25000);
 paint();
 return {refresh,repaint:paint};
}
