// Coach/student messaging UI. Security is enforced by Supabase RLS, never by this client.
export function createMessagesCenter({sb,context,afterSend}){
 let activeStudent=null,activeCoach=null,loading=false,loaded=[],formDraft="";
 const el=document.createElement("div");
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const localTime=x=>new Date(x).toLocaleString("es-AR",{timeZone:"America/Argentina/Buenos_Aires",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
 const isCoach=()=>{const c=context();return c.role==="coach"||(c.role==="admin"&&c.testCoach)};
 const roster=()=>isCoach()?(context().roster||[]).filter(x=>x.active&&context().consented?.[x.user_id]):[];
 function current(){
  const c=context();
  if(!c.userId)return null;
  if(isCoach()){
   if(!roster().some(x=>x.user_id===activeStudent))activeStudent=roster()[0]?.user_id||null;
   return activeStudent?{student:activeStudent,coach:c.userId}:null;
  }
  return c.role==="student"&&c.orgCoachId?{student:c.userId,coach:c.orgCoachId}:null;
 }
 function html(){
  const c=context(),pair=current();
  if(!c.userId)return '<p>Ingresá a tu cuenta para revisar los mensajes.</p>';
  if(!pair)return '<p class="pilot-hint">No hay conversaciones activas. Los mensajes están disponibles cuando hay una vinculación y autorización de seguimiento.</p>';
  const people=roster();
  const left=isCoach()?'<aside class="efg-message-roster" aria-label="Alumnos">'+people.map(x=>'<button type="button" data-msgstudent="'+esc(x.user_id)+'" class="'+(x.user_id===pair.student?'active':'')+'">'+esc(x.nickname||"Alumno")+'</button>').join("")+'</aside>':'';
  const bubbles=loaded.map(m=>'<div class="efg-message-bubble '+(m.sender_id===c.userId?'self':'')+'">'+esc(m.body)+'<small>'+localTime(m.created_at)+(m.sender_id===c.userId?(m.read_at?' · Leído':' · Enviado'):'')+'</small></div>').join("");
  return '<section class="efg-messages-shell">'+left+'<div class="efg-message-thread"><h3>Conversación '+(isCoach()?'con '+esc(people.find(p=>p.user_id===pair.student)?.nickname||"alumno"):'con mi coach')+'</h3>'+
   '<div class="efg-message-history" aria-label="Mensajes">'+(bubbles||'<p class="pilot-hint">Todavía no hay mensajes. Podés iniciar la conversación.</p>')+'</div>'+
   '<form class="efg-message-compose" id="efgMessageForm"><textarea id="efgMessageText" required maxlength="2000" placeholder="Escribí tu mensaje…" aria-label="Escribir mensaje">'+esc(formDraft)+'</textarea><button type="submit" '+(loading?'disabled':'')+'>Enviar</button></form>'+
   '<p class="pilot-hint">Solo vos y tu coach o alumno vinculado pueden consultar estos mensajes. No uses este chat para emergencias.</p></div></section>';
 }
 function show({force=false}={}){
  const host=document.getElementById("efgMessagesContent");if(!host)return;
  // A background sync must never replace the focused message composer.
  // Refresh just the conversation bubbles while preserving the draft and keyboard.
  const composer=host.querySelector("#efgMessageText");
  if(!force&&composer&&composer===document.activeElement){
   const oldHistory=host.querySelector(".efg-message-history");
   const wrapper=document.createElement("div");wrapper.innerHTML=html();
   const newer=wrapper.querySelector(".efg-message-history");
   if(oldHistory&&newer){
    const atBottom=oldHistory.scrollHeight-oldHistory.scrollTop-oldHistory.clientHeight<50;
    oldHistory.innerHTML=newer.innerHTML;
    if(atBottom)oldHistory.scrollTop=oldHistory.scrollHeight;
    return;
   }
  }
  host.innerHTML=html();
  const history=host.querySelector(".efg-message-history");if(history)history.scrollTop=history.scrollHeight;
 }
 async function load(force=false){
  const pair=current();if(!pair){loaded=[];show();return;}
  if(loading)return;
  loading=true;
  try{
   const {data,error}=await sb.from("efg_messages").select("id,sender_id,body,created_at,read_at").eq("student_id",pair.student).eq("coach_id",pair.coach).order("created_at",{ascending:true}).limit(200);
   if(error)throw error;
   if(current()?.student!==pair.student)return;
   loaded=data||[];
   const unread=loaded.filter(x=>x.sender_id!==context().userId&&!x.read_at).map(x=>x.id);
   if(unread.length){
    const {error:readError}=await sb.from("efg_messages").update({read_at:new Date().toISOString()}).in("id",unread);
    if(readError)console.warn("Message receipt",readError.message);
   }
  }catch(err){console.warn("Messages not available:",err.message);throw err}
  finally{loading=false;show({force});}
 }
 async function send(text){
  const pair=current(),c=context();
  if(!pair||!c.userId)throw Error("Seleccioná una conversación activa.");
  const body=String(text||"").trim();
  if(body.length<1||body.length>2000)throw Error("Ingresá un mensaje de hasta 2000 caracteres.");
  const {error}=await sb.from("efg_messages").insert({student_id:pair.student,coach_id:pair.coach,sender_id:c.userId,body});
  if(error)throw error;
  formDraft="";await load(true);afterSend?.();
 }
 document.addEventListener("click",event=>{
  const btn=event.target.closest("[data-msgstudent]");
  if(!btn||!document.getElementById("efgMessagesContent"))return;
  activeStudent=btn.dataset.msgstudent;loaded=[];formDraft="";show({force:true});load().catch(console.warn);
 });
 document.addEventListener("submit",event=>{
  if(event.target?.id!=="efgMessageForm")return;
  event.preventDefault();const text=event.target.querySelector("#efgMessageText")?.value;
  send(text).catch(e=>{console.error(e);alert("No se pudo enviar el mensaje: "+e.message)});
 });
 document.addEventListener("input",event=>{
  if(event.target?.id==="efgMessageText")formDraft=event.target.value;
 });
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&document.getElementById("efgMessagesContent"))load().catch(console.warn)});
 setInterval(()=>{if(!document.hidden&&document.getElementById("efgMessagesContent"))load().catch(console.warn)},25000);
 return {mount:()=>{show({force:true});load().catch(console.warn)},selectStudent:id=>{activeStudent=id;loaded=[];show({force:true});load().catch(console.warn)},refresh:load};
}
