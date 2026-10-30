// NUT-60 · Autogestión: isolated read-only workspace, NOT enabled for release.
// Never reuse the Coach/Student diary or approvals. Supabase RLS/JWT is authoritative.
// Backend schemas are STAGING ONLY until legal, clinical, recovery and mobile gates pass.
export const PERSONAL_WORKSPACE_ENABLED=false;
export const PERSONAL_MEALS=Object.freeze([
 {id:"desayuno",label:"Desayuno",icon:"☀️"},
 {id:"media_manana",label:"Media mañana",icon:"🍐"},
 {id:"almuerzo",label:"Almuerzo",icon:"🍽️"},
 {id:"media_tarde",label:"Media tarde",icon:"☕"},
 {id:"cena",label:"Cena",icon:"🌙"}
]);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const validId=v=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f-]{27,40}$/i.test(v);
const integer=v=>typeof v==="number"&&Number.isFinite(v)&&v>=0&&Number.isInteger(v);
const count=v=>integer(v)?v.toLocaleString("es-AR"):"—";
const one=v=>typeof v==="number"&&Number.isFinite(v)&&v>=0?v.toLocaleString("es-AR",{maximumFractionDigits:1}):"—";
const validDay=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v+"T12:00:00Z").toISOString().slice(0,10)===v;
export function assertPersonalAccess({profile,userId,account,legalStatus}={}){
 if(!validId(userId)||!profile||profile.user_id!==userId||profile.role!=="personal"||
  profile.active!==true||profile.organization_id!==null)
  throw Error("No hay una cuenta Personal activa y verificada.");
 if(!account||account.user_id!==userId)throw Error("No se pudo verificar la cuenta independiente de Autogestión.");
 if(!Array.isArray(legalStatus)||legalStatus.length!==2||
    legalStatus.some(d=>!d||d.accepted!==true||!d.document_id)||
    new Set(legalStatus.map(d=>d.document_id)).size!==2)
  throw Error("Revisá y aceptá las versiones legales vigentes antes de usar tu espacio.");
 return true;
}
const result=(r,what)=>{if(!r||r.error)throw Error("No pudimos verificar "+what+" en el servidor.");return r.data;};
export async function loadPersonalWorkspace(sb,{profile,userId,day}={}){
 if(!sb||!validDay(day))throw Error("La fecha del diario es inválida.");
 // Authorization starts with a verified server profile, then RLS owner account
 // and the current legal versions. No legacy table may be queried on this path.
 if(!validId(userId)||profile?.user_id!==userId||profile?.role!=="personal"||
    profile?.active!==true||profile?.organization_id!==null)
  throw Error("No hay un perfil Autogestión activo.");
 const [accountResponse,legalResponse]=await Promise.all([
  sb.from("efg_personal_accounts").select("user_id").eq("user_id",userId).maybeSingle(),
  sb.rpc("efg_legal_current_status")
 ]);
 const account=result(accountResponse,"tu cuenta"),legalStatus=result(legalResponse,"los documentos legales");
 assertPersonalAccess({profile,userId,account,legalStatus});
 const [goalsRes,guidesRes,diaryRes,habitualRes]=await Promise.all([
  sb.from("efg_personal_goals").select("user_id,revision,goal_type,kcal,protein_g,carb_g,fat_g,fiber_g").eq("user_id",userId).order("revision",{ascending:false}).limit(1),
  sb.from("efg_personal_guides").select("user_id,revision,goal_revision,guide").eq("user_id",userId).order("revision",{ascending:false}).limit(1),
  sb.from("efg_personal_daily_logs").select("user_id,log_day,meals,totals,skipped").eq("user_id",userId).eq("log_day",day).maybeSingle(),
  sb.from("efg_personal_habitual_meals").select("id,user_id,meal_slot,name,items").eq("user_id",userId).order("created_at",{ascending:false}).limit(80)
 ]);
 const goal=(result(goalsRes,"tus objetivos")||[])[0]||null;
 const guide=(result(guidesRes,"tu guía")||[])[0]||null;
 const diary=result(diaryRes,"tu diario")||null,habituals=result(habitualRes,"tus comidas habituales")||[];
 if(goal&&goal.user_id!==userId||guide&&guide.user_id!==userId||
  diary&&(diary.user_id!==userId||diary.log_day!==day)||
  !Array.isArray(habituals)||habituals.some(h=>h.user_id!==userId))
  throw Error("La respuesta no corresponde a tu cuenta. No se muestran datos.");
 return {verified:true,userId,day,profile:{nickname:profile.nickname},goal,guide,diary,habituals};
}
export function guideMeals(guideRow,goal){
 if(!goal||!guideRow||guideRow.goal_revision!==goal.revision)return null;
 const guide=guideRow.guide,required=PERSONAL_MEALS.map(m=>m.id);
 if(!guide||guide.kind!=="five_meal_example"||!Array.isArray(guide.meals)||
    guide.meals.length!==5)return null;
 const slots=guide.meals.map(m=>m?.slot);
 if(new Set(slots).size!==5||slots.some(s=>!required.includes(s))||
    guide.meals.some(m=>!Array.isArray(m.items)||m.items.length>30))return null;
 return required.map(slot=>guide.meals.find(m=>m.slot===slot));
}
function itemLabel(item){
 if(!item||typeof item!=="object")return "Alimento por revisar";
 // The stored food id is not a nutrition label; show an educational placeholder.
 const name=item.name||item.label||"Alimento por revisar";
 const amount=typeof item.grams==="number"&&item.grams>0&&Number.isFinite(item.grams)
  ?" · "+one(item.grams)+" g":"";
 return esc(String(name).slice(0,110))+amount;
}
export function renderPersonalWorkspace(snapshot){
 if(snapshot?.verified!==true||!validId(snapshot.userId)||!validDay(snapshot.day)||
  !snapshot.profile||!Array.isArray(snapshot.habituals)||
  snapshot.goal&&snapshot.goal.user_id!==snapshot.userId||
  snapshot.diary&&(snapshot.diary.user_id!==snapshot.userId||snapshot.diary.log_day!==snapshot.day))
  throw Error("No existe un estado Personal verificado.");
 const {goal,diary,habituals}=snapshot;
 const guide=guideMeals(snapshot.guide,goal);
 const totals=diary?.totals||{};
 const measure=(label,n,unit)=>'<div class="efg-self-metric"><small>'+label+'</small><strong>'+count(n)+'</strong><span>'+unit+'</span></div>';
 const name=esc(String(snapshot.profile.nickname||"").slice(0,70));
 const meals=PERSONAL_MEALS.map(m=>{
  const log=Array.isArray(diary?.meals?.[m.id])?diary.meals[m.id]:[];
  const guideSlot=guide?.find(g=>g.slot===m.id);
  const example=guideSlot?.items||[];
  const presets=habituals.filter(h=>h.meal_slot===m.id);
  return '<section class="efg-self-meal"><header><span class="efg-self-emoji" aria-hidden="true">'+m.icon+'</span><h3>'+m.label+'</h3></header>'+
   '<div class="efg-self-meal-grid"><div><h4>Registrado hoy</h4>'+
   (log.length?'<ul>'+log.slice(0,30).map(i=>'<li>'+itemLabel(i)+'</li>').join("")+'</ul>':
    '<p class="efg-self-muted">Todavía no registraste esta comida.</p>')+'</div>'+
   '<div><h4>Ejemplo de dieta guía</h4>'+
   (guide?(example.length?'<ul>'+example.map(i=>'<li>'+itemLabel(i)+'</li>').join("")+'</ul>':
    '<p class="efg-self-muted">Sin ingredientes en esta comida.</p>'):
    '<p class="efg-self-muted">Sin guía vigente verificada.</p>')+'</div></div>'+
   (presets.length?'<p class="efg-self-presets">Habituales guardadas: '+presets.slice(0,12).map(h=>esc(h.name)).join(" · ")+'</p>':'')+'</section>';
 }).join("");
 return '<div class="efg-self-shell"><header class="efg-self-head">'+
  '<div class="efg-self-brand"><img src="./assets/serotonina-acuarela.avif" width="52" height="34" alt="" aria-hidden="true">'+
  '<span>EFG NUTRITION <small>Autogestión Personal</small></span></div>'+
  '<button type="button" class="btn small ghost" data-act="logout">Cerrar sesión</button></header>'+
  '<main class="efg-self-content"><div class="efg-self-hero"><span class="eyebrow">MI ESPACIO · '+esc(snapshot.day)+'</span>'+
  '<h1>Tu alimentación, a tu manera'+(name?", "+name:"")+'.</h1>'+
  '<p>Este panel muestra tus registros privados. La guía es un ejemplo orientativo, no una prescripción clínica.</p></div>'+
  '<section class="efg-self-overview" aria-label="Objetivos personales">'+
  '<h2>Mis objetivos</h2>'+(goal?
   '<div class="efg-self-metrics">'+
    measure("Energía",goal.kcal,"kcal")+
    measure("Proteínas",goal.protein_g,"g")+
    measure("Hidratos",goal.carb_g,"g")+
    measure("Grasas",goal.fat_g,"g")+
    measure("Fibra",goal.fiber_g,"g")+'</div>'+
    '<p class="efg-self-muted">Revisión '+count(goal.revision)+'. No son metas aprobadas por un coach.</p>':
   '<p class="efg-self-muted">Todavía no tenés objetivos personales guardados.</p>')+
  '<h3>Consumo registrado hoy</h3><p class="efg-self-totals">'+
   'Energía '+one(totals.k)+' kcal · Proteínas '+one(totals.p)+' g · Hidratos '+one(totals.c)+
   ' g · Grasas '+one(totals.f)+' g</p></section>'+
  '<section class="efg-self-foods" aria-label="Mis cinco comidas"><h2>Mis cinco comidas</h2>'+
  '<p class="efg-self-muted">Los platos preparados combinan distintos nutrientes; no los contés dos veces. Los alimentos no fueron clasificados como aptos para condiciones médicas.</p>'+
  meals+'</section>'+
  '<p class="efg-self-footer">Autogestión en preparación: vista de lectura de pruebas. No se habilitaron cambios, recomendaciones médicas, mensajes a coaches ni publicaciones.</p>'+
  '</main></div>';
}
