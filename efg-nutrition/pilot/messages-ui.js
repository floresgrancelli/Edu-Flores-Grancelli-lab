// EFG Nutrition Pro · inbox responsive for student, coach, and admin test-coach.
// RLS on efg_messages is the source of truth; this UI NEVER grants chat access.
export function createMessagesCenter({sb,context,afterSend}){
 let selectedStudent=null,threadOpen=false,thread=[],overview=[],filter="",listMode="all";
 let busy=false,refreshing=false,pendingLoad=false,loadingOlder=false,threadHasMore=false,formDraft="",epoch=0,knownUser=null;
 const drafts=new Map();
 const PAGE_SIZE=200;
 const messageOrder=(a,b)=>String(a.created_at).localeCompare(String(b.created_at))||String(a.id).localeCompare(String(b.id));
 const mergeMessages=(oldRows,newRows)=>[...new Map([...oldRows,...newRows].map(row=>[row.id,row])).values()].sort(messageOrder);
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const shortTime=v=>{if(!v)return "";const d=new Date(v);const now=new Date();
  return d.toLocaleDateString("es-AR",{timeZone:"America/Argentina/Buenos_Aires"})===now.toLocaleDateString("es-AR",{timeZone:"America/Argentina/Buenos_Aires"})?
   d.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Argentina/Buenos_Aires"}):
   d.toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",timeZone:"America/Argentina/Buenos_Aires"});};
 const isCoach=()=>{const c=context();return c.role==="coach"||(c.role==="admin"&&c.testCoach);};
 const contacts=()=>{
  const c=context();
  if(!c.userId)return [];
  if(isCoach())return (c.roster||[]).filter(x=>x.active&&c.consented?.[x.user_id])
   .map(x=>({student:x.user_id,coach:c.userId,name:x.nickname||x.email||"Alumno",role:"Alumno"}))
   .sort((a,b)=>a.name.localeCompare(b.name,"es-AR"));
  return c.role==="student"&&c.orgCoachId?
    [{student:c.userId,coach:c.orgCoachId,name:c.coachName||"Mi coach",role:"Entrenador"}]:[];
 };
 const identity=x=>x?.student+"::"+x?.coach;
 const pair=()=>contacts().find(x=>x.student===selectedStudent)||null;
 function resetIfChanged(){
  const c=context(),key=c.userId+"|"+c.role+"|"+(c.testCoach?"test":"");
  if(knownUser!==key){knownUser=key;selectedStudent=null;threadOpen=false;thread=[];overview=[];formDraft="";drafts.clear();threadHasMore=false;filter="";listMode="all";epoch++;}
  const ids=new Set(contacts().map(x=>x.student));
  if(selectedStudent&&!ids.has(selectedStudent)){drafts.delete(selectedStudent);selectedStudent=null;threadOpen=false;thread=[];formDraft="";threadHasMore=false;epoch++;}
 }
 function previews(){
  const latest=new Map(),unread=new Map(),self=context().userId;
  for(const m of overview){
   if(!latest.has(m.student_id))latest.set(m.student_id,m);
   if(m.sender_id!==self&&!m.read_at)unread.set(m.student_id,(unread.get(m.student_id)||0)+1);
  }
  return {latest,unread};
 }
 function cardsHTML(){
  const {latest,unread}=previews();
  let people=contacts().map(x=>({...x,last:latest.get(x.student),unread:unread.get(x.student)||0}));
  people.sort((a,b)=>String(b.last?.created_at||"").localeCompare(String(a.last?.created_at||""))||a.name.localeCompare(b.name,"es-AR"));
  const q=filter.trim().toLocaleLowerCase("es-AR");
  if(q)people=people.filter(x=>(x.name+" "+x.role).toLocaleLowerCase("es-AR").includes(q));
  if(listMode==="unread")people=people.filter(x=>x.unread>0);
  if(!people.length)return '<p class="efg-chat-empty">'+(q?"No hay alumnos o contactos que coincidan con tu búsqueda.":listMode==="unread"?"No tenés mensajes sin leer.":"Todavía no hay conversaciones habilitadas para tu cuenta.")+'</p>';
  return people.map(x=>{
   const last=x.last,initials=x.name.trim().split(/\s+/).slice(0,2).map(v=>v[0]||"").join("").toLocaleUpperCase("es-AR");
   const preview=last?((last.sender_id===context().userId?"Vos: ":"")+last.body):"Tocá para iniciar la conversación";
   return '<button type="button" class="efg-chat-contact'+(selectedStudent===x.student?" is-selected":"")+'" data-chat-contact="'+esc(x.student)+'" aria-label="Abrir conversación con '+esc(x.name)+'">'+
     '<span class="efg-chat-avatar" aria-hidden="true">'+esc(initials||"EF")+'</span>'+
     '<span class="efg-chat-contact-copy"><strong>'+esc(x.name)+'</strong><small>'+esc(preview)+'</small></span>'+
     '<span class="efg-chat-side">'+(last?'<time>'+esc(shortTime(last.created_at))+'</time>':'')+
     (x.unread?'<span class="efg-chat-unread" aria-label="'+x.unread+' mensajes no leídos">'+x.unread+'</span>':'')+'</span></button>';
  }).join("");
 }
 function headerHTML(){
  const unread=[...previews().unread.values()].reduce((a,b)=>a+b,0);
  return '<header class="efg-chat-list-head"><div><span class="eyebrow">MENSAJERÍA INTERNA</span><h2>Chats</h2></div><span class="efg-chat-count">'+contacts().length+' contactos</span></header>'+
   '<div class="efg-chat-search-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>'+
   '<input type="search" id="efgChatSearch" placeholder="Buscar alumno o contacto" autocomplete="off" aria-label="Buscar conversaciones" value="'+esc(filter)+'"></div>'+
   '<div class="efg-chat-tabs" role="group" aria-label="Filtro de conversaciones"><button type="button" data-chat-filter="all" class="'+(listMode==="all"?"active":"")+'">Todos</button>'+
   '<button type="button" data-chat-filter="unread" class="'+(listMode==="unread"?"active":"")+'">No leídos'+(unread?" · "+unread:"")+'</button></div>';
 }
 function threadHTML(){
  const c=context(),x=pair();
  if(!x)return '<div class="efg-chat-welcome"><span aria-hidden="true">✉</span><h3>Elegí una conversación</h3><p>Buscá un alumno o contacto en la lista y tocá su nombre para ingresar directamente al chat.</p></div>';
  const bubbles=thread.map(m=>'<div class="efg-message-bubble'+(m.sender_id===c.userId?" self":"")+'">'+esc(m.body)+
   '<small>'+shortTime(m.created_at)+(m.sender_id===c.userId?(m.read_at?" · Leído":" · Enviado"):"")+'</small></div>').join("");
  return '<div class="efg-chat-thread-top"><button type="button" class="efg-chat-back" data-chat-back="1" aria-label="Volver a conversaciones">‹</button>'+
   '<span class="efg-chat-avatar small" aria-hidden="true">'+esc(x.name.trim().slice(0,1).toUpperCase())+'</span>'+
   '<div><h3>'+esc(x.name)+'</h3><small>Conversación privada · '+esc(x.role)+'</small></div></div>'+
   '<div class="efg-message-history" aria-label="Mensajes" role="log" aria-live="polite">'+
    (threadHasMore?'<button type="button" class="efg-chat-load-more" data-chat-older="1" '+(loadingOlder?"disabled":"")+'>'+(loadingOlder?"Cargando mensajes…":"Ver mensajes anteriores")+"</button>":"")+
    (bubbles||'<p class="efg-chat-empty">Todavía no hay mensajes. Podés iniciar la conversación.</p>')+'</div>'+
   '<form class="efg-message-compose" id="efgMessageForm"><textarea id="efgMessageText" required maxlength="2000" placeholder="Escribí un mensaje…" aria-label="Escribir mensaje">'+esc(formDraft)+'</textarea>'+
   '<button type="submit" '+(busy?'disabled':'')+' aria-label="Enviar mensaje"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg><span>Enviar</span></button></form>'+
   '<p class="efg-chat-privacy">Solo las personas vinculadas y autorizadas pueden conversar. Para emergencias usá los canales correspondientes.</p>';
 }
 function paint({force=false,prepend=false}={}){
  resetIfChanged();const host=document.getElementById("efgMessagesContent");if(!host)return;
  const current=host.querySelector(".efg-message-history");
  const oldPosition=current?{top:current.scrollTop,height:current.scrollHeight,atBottom:current.scrollHeight-current.scrollTop-current.clientHeight<65}:null;
  const focused=host.contains(document.activeElement)?document.activeElement:null;
  const focusId=focused?.id||null;
  const selection=focusId&&typeof focused.selectionStart==="number"?[focused.selectionStart,focused.selectionEnd]:null;
  // Preserve active text controls in place: repainting them closes some iOS keyboards.
  if(!force&&(focusId==="efgMessageText"||focusId==="efgChatSearch")){
   const list=host.querySelector(".efg-chat-contacts");
   if(list)list.innerHTML=cardsHTML();
   const oldHistory=host.querySelector(".efg-message-history");
   if(oldHistory){
    const tmp=document.createElement("div");tmp.innerHTML=threadHTML();
    const next=tmp.querySelector(".efg-message-history");
    if(next){
     const atBottom=oldHistory.scrollHeight-oldHistory.scrollTop-oldHistory.clientHeight<65;
     const top=oldHistory.scrollTop,previousHeight=oldHistory.scrollHeight;
     oldHistory.innerHTML=next.innerHTML;
     oldHistory.scrollTop=prepend?top+oldHistory.scrollHeight-previousHeight:atBottom?oldHistory.scrollHeight:top;
    }
   }
   return;
  }
  // Refreshes should not close the mobile keyboard, reset a search, or jump while reading history.
  host.innerHTML='<section class="efg-chat-layout'+(threadOpen?" show-thread":"")+'">'+
    '<aside class="efg-chat-list">'+headerHTML()+'<div class="efg-chat-contacts" aria-label="Conversaciones">'+cardsHTML()+'</div></aside>'+
    '<section class="efg-chat-thread">'+threadHTML()+'</section></section>';
  const history=host.querySelector(".efg-message-history");
  if(history){
   if(force||!oldPosition)history.scrollTop=history.scrollHeight;
   else if(prepend)history.scrollTop=oldPosition.top+(history.scrollHeight-oldPosition.height);
   else if(oldPosition.atBottom)history.scrollTop=history.scrollHeight;
   else history.scrollTop=oldPosition.top;
  }
  if(focusId&&!force){
   const replacement=host.querySelector("#"+focusId);
   if(replacement){replacement.focus({preventScroll:true});if(selection&&typeof replacement.setSelectionRange==="function")replacement.setSelectionRange(...selection);}
  }
 }
 async function refreshOverview(){
  const c=context(),people=contacts(),key=knownUser;
  if(!c.userId||!people.length){overview=[];paint();return;}
  // The list comes from the same RLS-protected table; no admin-wide message query.
  let request=sb.from("efg_messages").select("id,student_id,coach_id,sender_id,body,created_at,read_at");
  if(isCoach())request=request.eq("coach_id",c.userId).in("student_id",people.map(x=>x.student));
  else request=request.eq("student_id",c.userId).eq("coach_id",people[0].coach);
  const {data,error}=await request.order("created_at",{ascending:false}).limit(1000);
  if(error)throw error;
  if(knownUser!==key)return;
  overview=data||[];paint();
 }
 async function markRead(rows){
  const unread=rows.filter(m=>m.sender_id!==context().userId&&!m.read_at).map(m=>m.id);
  if(!unread.length)return rows;
  const readAt=new Date().toISOString();
  const {error}=await sb.from("efg_messages").update({read_at:readAt}).in("id",unread);
  if(error){console.warn("Message receipt",error.message);return rows;}
  const ids=new Set(unread);return rows.map(m=>ids.has(m.id)?{...m,read_at:readAt}:m);
 }
 async function load(force=false){
  resetIfChanged();const x=pair(),key=epoch;
  if(refreshing){pendingLoad=true;return;}
  refreshing=true;
  try{
   if(x&&threadOpen){
    // Newest-first pagination avoids the old first-200-messages cutoff.
    const {data,error}=await sb.from("efg_messages")
      .select("id,student_id,coach_id,sender_id,body,created_at,read_at")
      .eq("student_id",x.student).eq("coach_id",x.coach)
      .order("created_at",{ascending:false}).order("id",{ascending:false}).limit(PAGE_SIZE);
    if(error)throw error;
    if(epoch!==key)return;
    const incoming=await markRead(data||[]);
    if(epoch!==key)return;
    thread=mergeMessages(thread,incoming);
    if(!thread.length||thread.length===incoming.length)threadHasMore=incoming.length===PAGE_SIZE;
   }
   await refreshOverview();
  }finally{
   refreshing=false;paint({force});
   if(pendingLoad){pendingLoad=false;queueMicrotask(()=>load(force).catch(console.warn));}
  }
 }
 async function loadOlder(){
  resetIfChanged();const x=pair(),oldest=thread[0],key=epoch;
  if(!x||!threadOpen||!oldest||!threadHasMore||loadingOlder)return;
  loadingOlder=true;paint();
  try{
   // Timestamp + UUID cursor: stable when new messages arrive while paging.
   const cursor="created_at.lt."+oldest.created_at+",and(created_at.eq."+oldest.created_at+",id.lt."+oldest.id+")";
   const {data,error}=await sb.from("efg_messages")
     .select("id,student_id,coach_id,sender_id,body,created_at,read_at")
     .eq("student_id",x.student).eq("coach_id",x.coach).or(cursor)
     .order("created_at",{ascending:false}).order("id",{ascending:false}).limit(PAGE_SIZE);
   if(error)throw error;
   if(key!==epoch)return;
   const older=await markRead(data||[]);
   if(key!==epoch)return;
   thread=mergeMessages(thread,older);
   threadHasMore=older.length===PAGE_SIZE;
  }finally{loadingOlder=false;if(key===epoch)paint({prepend:true});}
 }
 async function openStudent(student){
  resetIfChanged();if(!contacts().some(x=>x.student===student))return;
  if(selectedStudent!==student){selectedStudent=student;thread=[];formDraft=drafts.get(student)||"";threadHasMore=false;epoch++;}
  threadOpen=true;paint({force:true});
  await load(true);
 }
 async function send(value){
  const x=pair(),c=context(),body=String(value??"").trim();
  if(!x||!threadOpen)throw Error("Elegí una conversación activa.");
  if(body.length<1||body.length>2000)throw Error("Escribí un mensaje de hasta 2000 caracteres.");
  busy=true;
  try{
   const {error}=await sb.from("efg_messages").insert({student_id:x.student,coach_id:x.coach,sender_id:c.userId,body});
   if(error)throw error;
   formDraft="";drafts.delete(x.student);await load(true);afterSend?.();
  }finally{busy=false;paint({force:true});}
 }
 document.addEventListener("click",event=>{
  const host=document.getElementById("efgMessagesContent");if(!host||!host.contains(event.target))return;
  const contact=event.target.closest("[data-chat-contact]");
  if(contact){openStudent(contact.dataset.chatContact).catch(console.warn);return;}
  if(event.target.closest("[data-chat-back]")){threadOpen=false;paint({force:true});return;}
  if(event.target.closest("[data-chat-older]")){loadOlder().catch(console.warn);return;}
  const tab=event.target.closest("[data-chat-filter]");
  if(tab){listMode=tab.dataset.chatFilter;paint({force:true});}
 });
 document.addEventListener("input",event=>{
  if(event.target?.id==="efgMessageText"){formDraft=event.target.value;if(selectedStudent)drafts.set(selectedStudent,formDraft);return;}
  if(event.target?.id==="efgChatSearch"){
   filter=event.target.value;const list=document.querySelector("#efgMessagesContent .efg-chat-contacts");
   if(list)list.innerHTML=cardsHTML();
  }
 });
 document.addEventListener("submit",event=>{
  if(event.target?.id!=="efgMessageForm")return;
  event.preventDefault();const value=event.target.querySelector("#efgMessageText")?.value;
  send(value).catch(e=>{console.error(e);alert("No se pudo enviar el mensaje: "+e.message);});
 });
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&document.getElementById("efgMessagesContent"))load().catch(console.warn);});
 setInterval(()=>{if(!document.hidden&&document.getElementById("efgMessagesContent"))load().catch(console.warn);},25000);
 return {mount:()=>{resetIfChanged();paint({force:true});load().catch(console.warn);},
  selectStudent:student=>{openStudent(student).catch(console.warn);},refresh:load};
}
