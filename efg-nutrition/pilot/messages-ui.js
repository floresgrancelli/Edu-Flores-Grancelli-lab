// EFG Nutrition Pro · inbox responsive for student, coach, and admin test-coach.
// RLS on efg_messages is the source of truth; this UI NEVER grants chat access.
export function createMessagesCenter({sb,context,afterSend}){
 let selectedStudent=null,threadOpen=false,thread=[],overview=[],filter="",listMode="all";
 let busy=false,refreshing=false,formDraft="",epoch=0,knownUser=null,knownRole=null;
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
  if(knownUser!==key){knownUser=key;selectedStudent=null;threadOpen=false;thread=[];overview=[];formDraft="";filter="";listMode="all";epoch++;}
  const ids=new Set(contacts().map(x=>x.student));
  if(selectedStudent&&!ids.has(selectedStudent)){selectedStudent=null;threadOpen=false;thread=[];formDraft="";epoch++;}
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
    (bubbles||'<p class="efg-chat-empty">Todavía no hay mensajes. Podés iniciar la conversación.</p>')+'</div>'+
   '<form class="efg-message-compose" id="efgMessageForm"><textarea id="efgMessageText" required maxlength="2000" placeholder="Escribí un mensaje…" aria-label="Escribir mensaje">'+esc(formDraft)+'</textarea>'+
   '<button type="submit" '+(busy?'disabled':'')+' aria-label="Enviar mensaje"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg><span>Enviar</span></button></form>'+
   '<p class="efg-chat-privacy">Solo las personas vinculadas y autorizadas pueden conversar. Para emergencias usá los canales correspondientes.</p>';
 }
 function paint({force=false}={}){
  resetIfChanged();const host=document.getElementById("efgMessagesContent");if(!host)return;
  const composer=host.querySelector("#efgMessageText");
  if(!force&&composer===document.activeElement){
   const history=host.querySelector(".efg-message-history");
   if(history){const temp=document.createElement("div");temp.innerHTML=threadHTML();const fresh=temp.querySelector(".efg-message-history");
    if(fresh){const bottom=history.scrollHeight-history.scrollTop-history.clientHeight<60;history.innerHTML=fresh.innerHTML;if(bottom)history.scrollTop=history.scrollHeight;}
   }
   const list=host.querySelector(".efg-chat-contacts");if(list)list.innerHTML=cardsHTML();
   return;
  }
  host.innerHTML='<section class="efg-chat-layout'+(threadOpen?" show-thread":"")+'">'+
    '<aside class="efg-chat-list">'+headerHTML()+'<div class="efg-chat-contacts" aria-label="Conversaciones">'+cardsHTML()+'</div></aside>'+
    '<section class="efg-chat-thread">'+threadHTML()+'</section></section>';
  const history=host.querySelector(".efg-message-history");if(history)history.scrollTop=history.scrollHeight;
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
 async function load(force=false){
  resetIfChanged();const x=pair(),key=epoch;
  if(refreshing)return;
  refreshing=true;
  try{
   if(x&&threadOpen){
    const {data,error}=await sb.from("efg_messages")
      .select("id,student_id,coach_id,sender_id,body,created_at,read_at")
      .eq("student_id",x.student).eq("coach_id",x.coach).order("created_at",{ascending:true}).limit(200);
    if(error)throw error;
    if(epoch!==key)return;
    thread=data||[];
    const unread=thread.filter(m=>m.sender_id!==context().userId&&!m.read_at).map(m=>m.id);
    if(unread.length){
     const {error:receiptError}=await sb.from("efg_messages").update({read_at:new Date().toISOString()}).in("id",unread);
     if(receiptError)console.warn("Message receipt",receiptError.message);
     else thread=thread.map(m=>unread.includes(m.id)?{...m,read_at:new Date().toISOString()}:m);
    }
   }
   await refreshOverview();
  }finally{refreshing=false;paint({force});}
 }
 async function openStudent(student){
  resetIfChanged();if(!contacts().some(x=>x.student===student))return;
  if(selectedStudent!==student){selectedStudent=student;thread=[];formDraft="";epoch++;}
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
   formDraft="";await load(true);afterSend?.();
  }finally{busy=false;paint({force:true});}
 }
 document.addEventListener("click",event=>{
  const host=document.getElementById("efgMessagesContent");if(!host||!host.contains(event.target))return;
  const contact=event.target.closest("[data-chat-contact]");
  if(contact){openStudent(contact.dataset.chatContact).catch(console.warn);return;}
  if(event.target.closest("[data-chat-back]")){threadOpen=false;formDraft="";paint({force:true});return;}
  const tab=event.target.closest("[data-chat-filter]");
  if(tab){listMode=tab.dataset.chatFilter;paint({force:true});}
 });
 document.addEventListener("input",event=>{
  if(event.target?.id==="efgMessageText"){formDraft=event.target.value;return;}
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
