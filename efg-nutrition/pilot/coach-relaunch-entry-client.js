// COACH-RELAUNCH: private owner-only intake entry client, NOT ENABLED.
// No local/session storage; signed JWT + server RLS/RPC is authoritative.
import {COACH_RELEASE_INTAKE_VERSION,COACH_RELAUNCH_ONBOARDING_ENABLED,
 resolveCoachRelaunchEntry,initialCoachRelaunchIntake} from "./coach-relaunch-onboarding.js";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const validUid=x=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f-]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const accepted=x=>Array.isArray(x)&&x.length===2&&x.every(z=>z&&z.accepted===true);
const known={
 objective:[["","Sin definir"],["fat_loss","Reducir grasa"],["recomp","Recomposición"],["muscle_gain","Aumentar masa muscular"],["maintenance","Mantener peso"],["general","Mejorar hábitos"]],
 activity_level:[["","No informado"],["low","Mayormente sentado"],["light","Ligera"],["moderate","Moderada"],["high","Alta"]],
 dietary_pattern:[["","No definido"],["omnivore","Omnívoro"],["vegetarian","Vegetariano"],["vegan","Vegano"],["pescatarian","Pescetariano"],["other","Otro"]]
};
export async function loadCoachRelaunchEntry(sb,{profile,userId}={}){
 if(!sb||!validUid(userId)||profile?.user_id!==userId||profile?.role!=="student"||
    profile?.active!==true||!validUid(profile.organization_id))
  throw Error("No se pudo verificar tu cuenta de alumno Coach.");
 const lr=await sb.rpc("efg_legal_current_status");
 if(lr.error||!Array.isArray(lr.data))throw Error("No se pudo comprobar el consentimiento legal actual.");
 const legalStatus=lr.data,legalStatusFetched=true;
 if(!accepted(legalStatus))return {
  ...resolveCoachRelaunchEntry({userId,profile,identityVerified:true,
   legalStatus,legalStatusFetched,onboardingStatusFetched:false}),
  status:null,legalStatus
 };
 const r=await sb.from("efg_coach_relaunch_intakes")
  .select("student_id,organization_id,completed_version,revision,shared_at,completed_at,objective,age_years,height_cm,weight_kg,activity_level,dietary_pattern,preferred_foods,disliked_foods,meal_routine,notes")
  .eq("student_id",userId).eq("completed_version",COACH_RELEASE_INTAKE_VERSION).maybeSingle();
 if(r.error)throw Error("No se pudo verificar la ficha de relanzamiento actual.");
 const status=r.data||null;
 const gate=resolveCoachRelaunchEntry({userId,profile,identityVerified:true,
  legalStatus,legalStatusFetched:true,onboardingStatus:status,onboardingStatusFetched:true});
 return {...gate,status,legalStatus};
}
const field=(id,label,val,step,min,max)=>
 '<div class="field"><label for="coachRelaunch_'+id+'">'+label+' (opcional)</label>'+
 '<input id="coachRelaunch_'+id+'" type="number" inputmode="decimal" min="'+min+
 '" max="'+max+'" step="'+step+'" value="'+esc(val??"")+'"></div>';
const select=(id,label,value)=>'<div class="field"><label for="coachRelaunch_'+id+'">'+label+
 '</label><select id="coachRelaunch_'+id+'">'+known[id].map(([code,text])=>
 '<option value="'+esc(code)+'"'+(value===code?' selected':'')+'>'+esc(text)+'</option>').join("")+'</select></div>';
const textarea=(id,label,value,max)=>
 '<div class="field"><label for="coachRelaunch_'+id+'">'+label+' (opcional)</label>'+
 '<textarea id="coachRelaunch_'+id+'" maxlength="'+max+'" rows="2">'+esc(value||"")+'</textarea></div>';
export function renderCoachRelaunchEntry(entry,{editing=false}={}){
 if(!entry||!["intake","legal","retry","verify","inactive","ready"].includes(entry.route))
  throw Error("No se verificó el ingreso Coach.");
 if(entry.route==="ready"&&!editing)return "";
 if(editing&&(entry.route!=="ready"||!entry.status||entry.status.completed_version!==COACH_RELEASE_INTAKE_VERSION||!Number.isInteger(entry.status.revision)||entry.status.revision<1))
  throw Error("La revisión de la ficha no está validada.");
 if(entry.route==="legal")return '<section class="card efg-coach-relaunch"><h2>Revisá los documentos vigentes</h2>'+
 '<p>Antes de actualizar tu ficha debemos confirmar los Términos y la Política de Privacidad actuales, por separado. El ingreso con código no significa que los hayas aceptado.</p>'+
 '<p>La aceptación legal todavía está en preparación en esta versión.</p>'+
 '<button type="button" class="btn light" data-act="logout">Cerrar sesión</button></section>';
 if(entry.route!=="intake"&&!editing)return '<section class="card efg-coach-relaunch" role="alert"><h2>Tu ingreso necesita verificación</h2><p>'+
 esc(entry.reason||"No se pudo validar la sesión")+'</p><button type="button" class="btn" data-act="retry">Reintentar</button>'+
 '<button type="button" class="btn light" data-act="logout">Cerrar sesión</button></section>';
 const data=editing?initialCoachRelaunchIntake({draftVersion:COACH_RELEASE_INTAKE_VERSION,
  currentVersionDraft:entry.status}):initialCoachRelaunchIntake();
 return '<section class="card efg-coach-relaunch" aria-labelledby="efgCoachRelaunchTitle">'+
 '<span class="eyebrow">EFG NUTRITION COACH · NUEVA ETAPA</span>'+
 '<h2 id="efgCoachRelaunchTitle">'+(editing?'Revisar mi ficha nueva':'Conozcámonos de nuevo')+'</h2>'+ 
 '<p>Estrenamos herramientas. Revisá esta ficha inicial, incluso si ya usabas EFG Nutrition. Tus registros, tu plan y tus mensajes anteriores se conservan.</p>'+
 '<p class="pilot-hint">Los datos son voluntarios y no equivalen a un diagnóstico. No introduzcas información médica sensible en los campos de texto: ese apartado aún requiere revisión legal y profesional.</p>'+
 '<form id="'+(editing?'efgCoachRelaunchManageForm':'efgCoachRelaunchForm')+'" class="pilot-form">'+ 
 select("objective","Mi objetivo",data.objective)+
 '<div class="field-row">'+field("age_years","Edad (años)",data.age_years,1,18,100)+
 field("height_cm","Altura (cm)",data.height_cm,.1,100,250)+
 field("weight_kg","Peso (kg)",data.weight_kg,.1,20,400)+'</div>'+
 select("activity_level","Actividad habitual",data.activity_level)+
 select("dietary_pattern","Patrón alimentario",data.dietary_pattern)+
 textarea("preferred_foods","Alimentos que me gustan",data.preferred_foods,400)+
 textarea("disliked_foods","Alimentos que evito por gusto",data.disliked_foods,400)+
 textarea("meal_routine","Horarios de comidas",data.meal_routine,400)+
 textarea("notes","Hábitos generales, sin información médica",data.notes,1000)+
 '<label class="efg-intake-share-label" for="coachRelaunch_share"><input type="checkbox" id="coachRelaunch_share"'+(editing&&entry.status.shared_at?' checked':'')+'>'+ 
 ' Autorizo compartir esta nueva ficha con mi coach. Este permiso es independiente de aceptar los términos y puede revocarse.</label>'+
 '<button type="submit" class="btn block">'+(editing?'Guardar cambios de mi ficha':'Confirmar mi ficha nueva')+'</button></form>'+ 
 (editing?'<div class="pilot-toolbar"><button class="btn light" type="button" data-act="revokeCoachRelaunch">Retirar permiso de compartir</button><button class="btn light" type="button" data-act="clearCoachRelaunch">Borrar solo los datos de esta ficha</button></div><p class="pilot-hint">Los datos se borran de la ficha nueva y tu permiso para compartir queda revocado; conservamos un comprobante técnico de que completaste esta versión. No se borran tu plan, historial ni mensajes. Los derechos de supresión de otros registros se gestionan aparte.</p>':'')+ 
 '<p class="pilot-hint">El acceso a tu historia nutricional anterior no se elimina. No se publica ningún plan sin revisión y aprobación del coach.</p></section>';
}
export function readCoachRelaunchForm(doc){
 if(!doc||typeof doc.getElementById!=="function")throw Error("Formulario no disponible.");
 const get=id=>doc.getElementById("coachRelaunch_"+id);
 const choice=field=>{
  const x=get(field)?.value??"";
  if(typeof x!=="string"||!known[field].some(z=>z[0]===x))throw Error("Opción inválida: "+field);
  return x||null;
 };
 const number=(field,min,max,integer=false)=>{
  const raw=get(field)?.value??"";
  if(raw==="")return null;
  const n=Number(raw);
  if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n))||
    (!integer&&Math.round(n*10)!==n*10))
   throw Error("Revisá "+field+".");
  return n;
 };
 const text=(field,max)=>{
  const raw=get(field)?.value??"";
  if(typeof raw!=="string"||raw.length>max)throw Error("Revisá el texto "+field+".");
  return raw.trim();
 };
 const confirm=get("share");
 if(!confirm||typeof confirm.checked!=="boolean")throw Error("Falta la opción de compartir la ficha.");
 return {
  payload:{objective:choice("objective"),
   age_years:number("age_years",18,100,true),
   height_cm:number("height_cm",100,250),
   weight_kg:number("weight_kg",20,400),
   activity_level:choice("activity_level"),
   dietary_pattern:choice("dietary_pattern"),
   preferred_foods:text("preferred_foods",400),
   disliked_foods:text("disliked_foods",400),
   meal_routine:text("meal_routine",400),
   notes:text("notes",1000)},
  shareWithCoach:confirm.checked===true
 };
}
export async function submitCoachRelaunchEntry(sb,{profile,userId,entry,payload,shareWithCoach,explicitSubmit=false}={}){
 if(explicitSubmit!==true||!sb||!validUid(userId)||profile?.user_id!==userId||
    profile?.role!=="student"||profile?.active!==true||
    !validUid(profile.organization_id)||
    (entry?.route!=="intake"&&entry?.route!=="ready"||entry?.route==="intake"&&entry.status!==null||
     entry?.route==="ready"&&(!Number.isInteger(entry.status?.revision)||entry.status.revision<1||entry.status.completed_version!==COACH_RELEASE_INTAKE_VERSION))||!accepted(entry.legalStatus))
  throw Error("Verificá tu identidad, la ficha nueva y la aceptación legal antes de confirmar.");
 if(shareWithCoach!==true&&shareWithCoach!==false)throw Error("Permiso de compartir inválido.");
 const a=await sb.rpc("efg_submit_coach_relaunch_intake",{
  p_completed_version:COACH_RELEASE_INTAKE_VERSION,p_payload:payload,
  p_expected_revision:entry.route==="ready"?entry.status.revision:0,p_share_with_coach:shareWithCoach
 });
 if(a.error)throw Error(a.error.code==="PT409"?
  "Tu ficha cambió en otra sesión; volvé a cargarla para continuar.":"No se pudo guardar la ficha nueva; revisá los permisos e intentá nuevamente.");
 const expected=(entry.route==="ready"?entry.status.revision:0)+1;
 if(a.data!==expected)throw Error("La ficha nueva no devolvió la revisión esperada.");
 const fresh=await loadCoachRelaunchEntry(sb,{profile,userId});
 if(fresh.route!=="ready"||fresh.status?.revision!==expected)
  throw Error("No pudimos verificar la confirmación en el servidor.");
 return fresh;
}

export const emptyCoachRelaunchPayload=()=>({
 objective:null,age_years:null,height_cm:null,weight_kg:null,activity_level:null,
 dietary_pattern:null,preferred_foods:"",disliked_foods:"",meal_routine:"",notes:""
});
export function currentCoachRelaunchPayload(entry){
 if(entry?.route!=="ready"||entry.status?.completed_version!==COACH_RELEASE_INTAKE_VERSION)
  throw Error("No se verificó la revisión de tu ficha actual.");
 const fields=Object.keys(emptyCoachRelaunchPayload());
 const out={};
 for(const field of fields)out[field]=entry.status[field]??emptyCoachRelaunchPayload()[field];
 return out; // Whitelisted fields only; never spread identifiers/permissions from DB.
}
export async function revokeCoachRelaunchSharing(sb,{profile,userId,entry,explicitSubmit=false}={}){
 if(entry?.route!=="ready"||explicitSubmit!==true)
  throw Error("Confirmá expresamente el cambio de permiso.");
 const payload=currentCoachRelaunchPayload(entry);
 return submitCoachRelaunchEntry(sb,{profile,userId,entry,payload,shareWithCoach:false,explicitSubmit:true});
}
export async function clearCoachRelaunchData(sb,{profile,userId,entry,explicitSubmit=false}={}){
 if(entry?.route!=="ready"||explicitSubmit!==true)
  throw Error("Confirmá expresamente el borrado de la ficha.");
 return submitCoachRelaunchEntry(sb,{profile,userId,entry,
  payload:emptyCoachRelaunchPayload(),shareWithCoach:false,explicitSubmit:true});
}
