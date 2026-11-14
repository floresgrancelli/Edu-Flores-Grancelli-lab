import {DIET_PATTERNS,EATING_WINDOWS} from "./diet-pattern-workbench.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106";
import {COACH_VERSIONED_INTAKE_ENABLED} from "./coach-versioned-mode.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106";
import {assertCoachGoalWriteSafe} from "./coach-goal-write-gate.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106";
import {COACH_ATOMIC_PLAN_UI_ENABLED} from "./coach-plan-draft-client.js?v=ncc-restaurants-r1-20261114";
import {COACH_RELEASE_INTAKE_VERSION} from "./coach-relaunch-onboarding.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106";
import {assertCoachReleasePlanWriteAllowed} from "./coach-release-plan-gate.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106";
// EFG Nutrition Pro — staged Coach Intake (isolated backend migration required).
// Nothing here unlocks access: PostgreSQL RLS + publish RPC are authoritative.
export function intakeSaveButtonLabel({wasShared=false,willShare=false}={}){
 return willShare?(wasShared?"Actualizar ficha compartida con mi coach":"Guardar y enviar mi ficha a mi coach"):
  (wasShared?"Guardar privada y dejar de compartir":"Guardar ficha privada");
}
export function createCoachIntakeFlow({sb,state,escapeHTML,rootText,notify,render,refresh,legacyIntakeAvailable=false}){
 const names={fat_loss:"Reducir grasa",recomp:"Recomposición",muscle_gain:"Aumentar masa muscular",maintenance:"Mantenimiento",general:"Organizar mis hábitos"};
 const activities={low:"Mayormente sentado",light:"Ligera",moderate:"Moderada",high:"Alta"};
 const diets={...Object.fromEntries(DIET_PATTERNS.map(p=>[p.id,p.label])),omnivore:"Omnívoro",vegetarian:"Vegetariano",vegan:"Vegano",pescatarian:"Pescetariano",other:"Otro / aún no definido"};
 const missing=e=>e&&["42P01","PGRST205"].includes(e.code);
 // The hosted pilot never installed the optional 29/10 intake. UI flags are
 // not schema detection: OFF must not route login to a nonexistent table.
 // Only historical isolated fixtures opt into that old backend explicitly.
 const canReadIntake=()=>COACH_VERSIONED_INTAKE_ENABLED||legacyIntakeAvailable===true;
 // Never let a current-release Coach see a formerly shared legacy intake.
 const currentIntakeTable=()=>COACH_VERSIONED_INTAKE_ENABLED?
   "efg_coach_relaunch_intakes":"efg_student_intakes";
 const currentIntakeFields=(includeStudent=false)=>
   (includeStudent?"student_id,":"")+
   // P23: the versioned guide must validate the signed organization's ID.
   // Omitting this SELECT column makes every valid shared intake fail closed
   // at Coach automatic guide generation even though its RLS check passed.
   (COACH_VERSIONED_INTAKE_ENABLED?"organization_id,":"")+
   "objective,age_years,height_cm,weight_kg,activity_level,dietary_pattern,preferred_foods,disliked_foods,meal_routine,notes,shared_at,updated_at"+
   (COACH_VERSIONED_INTAKE_ENABLED?",completed_version,revision,eating_window":"");
 const filterRelease=query=>COACH_VERSIONED_INTAKE_ENABLED?
   query.eq("completed_version",COACH_RELEASE_INTAKE_VERSION):query;
 const pending=()=>state.profile?.role==="student"&&state.planAccessSupported&&state.planAccess?.status!=="published";
 // Account/session changes cannot allow private legacy intake responses to
 // paint another user's UI. Server RLS remains the authorization authority.
 const actor=()=>({id:state.session?.user?.id||null,role:state.profile?.role||null,
  org:state.profile?.organization_id||null});
 const assertActor=who=>{
  if(!who?.id||state.session?.user?.id!==who.id||
    state.profile?.role!==who.role||state.profile?.organization_id!==who.org)
   throw Error("La sesión cambió durante la consulta de la ficha; volvé a ingresar.");
 };
 async function loadStudent(){
  const who=actor();
  state.studentIntake=null;state.planAccess=null;state.planAccessSupported=false;
  state.legacyIntakeUnavailable=false;
  if(who.role!=="student")return;
  assertActor(who);
  const id=who.id;
  const a=await sb.from("efg_student_plan_access").select("status,published_at,published_goal_id").eq("student_id",id).maybeSingle();
  assertActor(who);
  if(a.error){if(!COACH_VERSIONED_INTAKE_ENABLED&&missing(a.error))return;throw a.error;}
  const f=canReadIntake()?await filterRelease(sb.from(currentIntakeTable()).select(currentIntakeFields()).eq("student_id",id)).maybeSingle():{data:null,error:null};
  assertActor(who);
  // The old optional table is absent on some upgraded pilot databases. This
  // must NOT lock the student out after OTP, nor enable an unreviewed intake.
  // Fail closed for any other error and for the versioned mandatory intake.
  const legacyMissing=!COACH_VERSIONED_INTAKE_ENABLED&&(!canReadIntake()||!!missing(f.error));
  if(f.error&&!legacyMissing)throw f.error;
  if(!legacyMissing&&f.data?.student_id!=null&&f.data.student_id!==id)
   throw Error("La ficha recuperada no corresponde al alumno actual.");
  // Commit both reads together, not a partially hydrated pending/ready state.
  // An absent access row while the rollout is OFF is not a new pending plan.
  // Keep explicit server pending/published rows; never manufacture published.
  state.planAccessSupported=!!a.data||!legacyMissing;
  state.planAccess=a.data||(!legacyMissing?{status:"pending"}:null);
  state.studentIntake=legacyMissing?null:f.data||null;
  state.legacyIntakeUnavailable=legacyMissing;
 }
 async function loadCoach(consentedIds){
  const who=actor();
  state.coachIntakeForms={};state.coachIntakeAccess={};
  if(!consentedIds.length)return;
  assertActor(who);
  const authorized=new Set(consentedIds);
  const ids=[...authorized];
  const [a,b]=await Promise.all([
   canReadIntake()?filterRelease(sb.from(currentIntakeTable()).select(currentIntakeFields(true)).in("student_id",ids).not("shared_at","is",null)).limit(500):Promise.resolve({data:[],error:null}),
   sb.from("efg_student_plan_access").select("student_id,status,published_at").in("student_id",ids).limit(500)
  ]);
  assertActor(who);
  if(a.error&&(COACH_VERSIONED_INTAKE_ENABLED||!missing(a.error)))throw a.error;
  if(b.error&&(COACH_VERSIONED_INTAKE_ENABLED||!missing(b.error)))throw b.error;
  const forms={},access={};
  if(!a.error)for(const v of a.data||[])if(authorized.has(v.student_id)&&v.shared_at)forms[v.student_id]=v;
  if(!b.error)for(const v of b.data||[])if(authorized.has(v.student_id))access[v.student_id]=v;
  assertActor(who);
  state.coachIntakeForms=forms;
  state.coachIntakeAccess=access;
 }
 // Reload before opening a coach's student detail: permission may have been revoked
 // or the optional intake deleted in another session since the roster last loaded.
 async function refreshCoachDetail(studentId,consented,assertCurrent){
  if(!studentId)return;
  const who=actor();
  delete state.coachIntakeForms[studentId];
  delete state.coachIntakeAccess[studentId];
  if(!consented)return;
  assertActor(who);
  const [a,b]=await Promise.all([
   canReadIntake()?filterRelease(sb.from(currentIntakeTable())
    .select(currentIntakeFields(true))
    .eq("student_id",studentId).not("shared_at","is",null)).maybeSingle():Promise.resolve({data:null,error:null}),
   sb.from("efg_student_plan_access")
    .select("student_id,status,published_at").eq("student_id",studentId).maybeSingle()
  ]);
  assertCurrent?.();
  assertActor(who);
  if(a.error&&(COACH_VERSIONED_INTAKE_ENABLED||!missing(a.error)))throw a.error;
  if(b.error&&(COACH_VERSIONED_INTAKE_ENABLED||!missing(b.error)))throw b.error;
  if(!a.error&&a.data?.student_id===studentId&&a.data.shared_at)state.coachIntakeForms[studentId]=a.data;
  if(!b.error&&b.data?.student_id===studentId)state.coachIntakeAccess[studentId]=b.data;
 }
 const opt=(id,label,value,selected)=>'<option value="'+id+'" '+(id===selected?'selected':'')+'>'+label+'</option>';
 function view(){
  // A missing OPTIONAL legacy table must never become a global login failure.
  // Do not show a Save/Delete form that would write to a non-existent table.
  if(state.legacyIntakeUnavailable){
   const awaiting=pending();
   return rootText("MI FICHA INICIAL","Podés seguir usando las funciones habilitadas de tu cuenta.")+
    '<section class="card"><h2>Ficha inicial temporalmente no disponible</h2>'+
    '<p>La ficha opcional anterior todavía no está disponible en este servidor. Tus registros históricos y permisos no se modificaron.</p>'+
    '<p class="pilot-hint">La nueva ficha del piloto se habilitará únicamente cuando su circuito verificado esté disponible. No interpretamos datos ausentes como ausencia de restricciones.</p>'+
    '<div class="pilot-toolbar"><button class="btn light" type="button" data-tab="privacy">Privacidad</button>'+
    (awaiting?'<button class="btn" type="button" data-act="checkCoachPlan">Comprobar mi plan</button>':
      '<button class="btn" type="button" data-tab="home">Volver a MI DÍA</button>')+
    '</div></section>';
  }
  const v=state.studentIntake||{},shared=!!v.shared_at;
  const field=(id,label,value,min,max,step)=>'<div class="field"><label for="'+id+'">'+label+' (opcional)</label><input type="number" inputmode="decimal" id="'+id+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+escapeHTML(value??"")+'"></div>';
  const ready=!pending();
  const nonEmptyKeys=["objective","age_years","height_cm","weight_kg","activity_level","dietary_pattern","preferred_foods","disliked_foods","meal_routine","notes"];
  const informed=nonEmptyKeys.filter(k=>v[k]!==null&&v[k]!==undefined&&String(v[k]).trim()!=="").length;
  const saved=!!state.studentIntake;
  const statusLabel=!saved?"Todavía no guardaste una ficha":shared?"Ficha compartida con tu coach":"Ficha guardada de forma privada";
  return rootText(ready?"MI FICHA INICIAL":"MI INGRESO",ready?"Consultá, corregí o retirale el acceso a tu coach cuando quieras.":"Mientras tu coach prepara tu plan, podés conversar con él y completar tu ficha.")+
  (ready?'<section class="coach-intake-intro"><div class="eyebrow">MI FICHA · Nutrición Con-Ciencia Coach</div><h2>Mi ficha y mis permisos</h2><p>Tu plan ya está disponible. Esta ficha es independiente: podés actualizarla o dejar de compartirla sin perder el acceso a MI DÍA.</p></section>':
   '<section class="coach-intake-intro"><div class="eyebrow">BIENVENIDO · Nutrición Con-Ciencia Coach</div><h2>Estamos preparando tu plan.</h2><p>Al publicarlo tu coach, se habilitarán las herramientas nutricionales. Por ahora tenés la mensajería, la privacidad y tu ficha voluntaria.</p></section>')+
  '<section class="card efg-student-intake-card"><h2>Mi ficha inicial</h2>'+
  '<div class="efg-student-intake-state" role="status" aria-live="polite"><strong>'+escapeHTML(statusLabel)+'</strong><span>'+informed+' datos opcionales aportados · No es obligatorio completar todos</span></div>'+
  '<p class="pilot-hint">Todos los datos son opcionales y autodeclarados. Podés guardar sin compartir, o autorizar expresamente que el coach la vea.</p>'+
  '<form id="efgStudentIntakeForm" class="pilot-form">'+
  '<div class="field"><label for="efgIntakeObjective">Mi objetivo (opcional)</label><select id="efgIntakeObjective">'+opt("","Elegir objetivo","",v.objective||"")+Object.entries(names).map(([k,l])=>opt(k,l,k,v.objective)).join("")+'</select></div>'+
  '<div class="field-row">'+field("efgIntakeAge","Edad (años)",v.age_years,18,100,1)+field("efgIntakeHeight","Altura (cm)",v.height_cm,100,250,0.1)+field("efgIntakeWeight","Peso (kg)",v.weight_kg,20,400,0.1)+'</div>'+
  '<div class="field"><label for="efgIntakeActivity">Actividad diaria (opcional)</label><select id="efgIntakeActivity">'+opt("","Elegir nivel","",v.activity_level||"")+Object.entries(activities).map(([k,l])=>opt(k,l,k,v.activity_level)).join("")+'</select></div>'+
  '<div class="field"><label for="efgIntakeDiet">Mi patrón alimentario (opcional)</label><select id="efgIntakeDiet">'+opt("","Elegir o dejar sin definir","",v.dietary_pattern||"")+Object.entries(diets).map(([k,l])=>opt(k,l,k,v.dietary_pattern)).join("")+'</select></div>'+
  '<div class="field"><label for="efgIntakePreferred">Alimentos que me gustan (opcional)</label><textarea id="efgIntakePreferred" rows="2" maxlength="400" placeholder="Ej.: arroz integral, frutas, pollo, legumbres">'+escapeHTML(v.preferred_foods||"")+'</textarea></div>'+
  '<div class="field"><label for="efgIntakeDisliked">Alimentos que prefiero evitar por gusto (opcional)</label><textarea id="efgIntakeDisliked" rows="2" maxlength="400" placeholder="Solo gustos personales; no cargues alergias o diagnósticos acá">'+escapeHTML(v.disliked_foods||"")+'</textarea></div>'+
  '<div class="field"><label for="efgIntakeSchedule">Mis horarios de comida (opcional)</label><textarea id="efgIntakeSchedule" rows="2" maxlength="400" placeholder="Ej.: desayuno 7:00, almuerzo 13:00, cena 21:00">'+escapeHTML(v.meal_routine||"")+'</textarea></div>'+
  '<div class="pilot-hint" role="note">La celiaquía, diabetes, hipertensión, alergias y resultados de laboratorio requieren una sección clínica y autorización específicas. Esta ficha registra solamente preferencias generales.</div>'+
  '<div class="field"><label for="efgIntakeNotes">Qué te gustaría contarle al coach (opcional)</label><textarea id="efgIntakeNotes" rows="3" maxlength="1000" placeholder="Horarios, hábitos o dudas. Evitá datos médicos en texto libre.">'+escapeHTML(v.notes||"")+'</textarea></div>'+
  '<label class="efg-intake-share-label" for="efgIntakeShare"><input type="checkbox" id="efgIntakeShare" '+(shared?'checked':'')+'> Autorizo compartir esta ficha con mi coach vinculado. Puedo retirar este permiso cuando quiera.</label>'+
  '<p class="pilot-hint">Este permiso es distinto del seguimiento nutricional. Para que el coach lea la ficha, ambos deben estar activos.</p>'+
  '<button class="btn block" id="efgIntakeSubmitButton" type="submit">'+intakeSaveButtonLabel({wasShared:shared,willShare:shared})+'</button></form>'+
  (state.studentIntake?'<div class="pilot-toolbar"><button type="button" class="btn light" data-act="deleteStudentIntake">Eliminar solamente mi ficha inicial</button></div><p class="pilot-hint">Se borran los datos opcionales de esta ficha y se deja de compartir. No se borran tu cuenta, el plan ni tus registros nutricionales.</p>':'')+
  '<div role="status" class="pilot-notice">'+(shared?'Ficha compartida con tu coach si autorizaste su seguimiento.':'Ficha privada. Todavía no la compartiste.')+'</div></section>'+
  (ready?'<section class="card"><h2>Tu plan sigue disponible</h2><p>Modificar o retirar el permiso para compartir esta ficha no borra tus registros ni despublica tu plan. El seguimiento del coach requiere por separado tu consentimiento vigente.</p><div class="pilot-toolbar"><button class="btn light" data-tab="privacy">Privacidad</button><button class="btn" data-tab="home">Volver a MI DÍA</button></div></section>':
   '<section class="card"><h2>Tu coach te acompaña</h2><p>Podés enviarle tus objetivos o hacerle preguntas. El plan se activará únicamente cuando el coach lo publique.</p><div class="pilot-toolbar"><button class="btn light" data-tab="messages">Abrir mensajes</button><button class="btn light" data-tab="privacy">Privacidad</button><button class="btn" data-act="checkCoachPlan">Comprobar mi plan</button></div></section>');
 }
 async function save(){
  if(!canReadIntake())throw Error("La ficha opcional anterior no está disponible. No se guardó nada.");
  if(state.legacyIntakeUnavailable)throw Error("La ficha opcional anterior no está disponible. No se guardó nada.");
  if(COACH_VERSIONED_INTAKE_ENABLED)
   throw Error("Esta versión utiliza una ficha de relanzamiento que requiere revisión segura por versión.");
  if(state.profile?.role!=="student"||!state.session?.user?.id||!state.planAccessSupported)throw Error("Tu ficha no está disponible en esta sesión.");
  const who=actor();assertActor(who);
  const get=id=>document.getElementById(id),value=id=>get(id)?.value?.trim()||"";
  const numeric=(id,min,max,integer=false)=>{
   const v=value(id);if(!v)return null;
   const n=Number(v);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw Error("Revisá el campo "+id+".");
   return n;
  };
  const objective=value("efgIntakeObjective")||null,activity_level=value("efgIntakeActivity")||null,dietary_pattern=value("efgIntakeDiet")||null;
  if(objective&&!Object.keys(names).includes(objective))throw Error("Objetivo inválido.");
  if(activity_level&&!Object.keys(activities).includes(activity_level))throw Error("Actividad inválida.");
  if(dietary_pattern&&!Object.keys(diets).includes(dietary_pattern))throw Error("Patrón alimentario inválido.");
  for(const field of ["efgIntakePreferred","efgIntakeDisliked","efgIntakeSchedule"]){
   if(value(field).length>400)throw Error("El texto supera los 400 caracteres.");
  }
  const allow=!!get("efgIntakeShare")?.checked;
  if(allow&&state.consent?.accepted!==true)
   throw Error("Para enviar la ficha, primero autorizá el seguimiento de tu coach. Podés guardarla privada mientras tanto.");
  const payload={student_id:who.id,organization_id:who.org,
   objective,activity_level,dietary_pattern,age_years:numeric("efgIntakeAge",18,100,true),
   height_cm:numeric("efgIntakeHeight",100,250),weight_kg:numeric("efgIntakeWeight",20,400),
   preferred_foods:value("efgIntakePreferred"),disliked_foods:value("efgIntakeDisliked"),
   meal_routine:value("efgIntakeSchedule"),notes:value("efgIntakeNotes").slice(0,1000),
   shared_at:allow?(state.studentIntake?.shared_at||new Date().toISOString()):null,
   updated_at:new Date().toISOString()};
  const r=await sb.from("efg_student_intakes").upsert(payload,{onConflict:"student_id"});
  assertActor(who);
  if(r.error)throw r.error;
  await loadStudent();assertActor(who);
  await render();assertActor(who);
  notify(allow?"Ficha guardada y compartida.":"Ficha privada guardada.");
 }
 async function deleteOwn(){
  if(!canReadIntake())throw Error("La ficha opcional anterior no está disponible. No se borró nada.");
  if(state.legacyIntakeUnavailable)throw Error("La ficha opcional anterior no está disponible. No se borró nada.");
  if(COACH_VERSIONED_INTAKE_ENABLED)
   throw Error("La ficha nueva exige el borrado/versionado seguro; el borrado antiguo está deshabilitado.");
  if(state.profile?.role!=="student"||!state.session?.user?.id||!state.planAccessSupported)
   throw Error("Tu ficha no está disponible en esta sesión.");
  if(!state.studentIntake)return;
  const who=actor();assertActor(who);
  if(!window.confirm("¿Eliminar definitivamente solo los datos de tu ficha inicial? No se borrarán tu cuenta, tu plan ni tus registros nutricionales."))return;
  assertActor(who);
  const id=who.id;
  // The owner-only DELETE RLS policy provides the server-side permission check.
  const r=await sb.from("efg_student_intakes").delete().eq("student_id",id);
  assertActor(who);
  if(r.error)throw r.error;
  await loadStudent();assertActor(who);
  await render();assertActor(who);
  notify("Tu ficha inicial se eliminó. El seguimiento nutricional conserva sus propios permisos.");
 }
 function details(studentId){
  const v=state.coachIntakeForms[studentId];
  if(!v||!v.shared_at)return "";
  const items=[["Objetivo",names[v.objective]],["Edad",v.age_years?String(v.age_years)+" años":null],["Altura",v.height_cm?String(v.height_cm)+" cm":null],["Peso",v.weight_kg?String(v.weight_kg)+" kg":null],["Actividad",activities[v.activity_level]],["Patrón alimentario",diets[v.dietary_pattern]],["Horario elegido",EATING_WINDOWS.find(w=>w.id===v.eating_window)?.label],["Alimentos preferidos",v.preferred_foods],["Evita por gusto",v.disliked_foods],["Horarios de comida",v.meal_routine],["Observaciones",v.notes]];
  const rows=items.map(([label,value],i)=>'<div data-intake-detail="'+(i<5?'basic':'food')+'"><dt>'+escapeHTML(label)+'</dt><dd>'+escapeHTML(value?String(value):'No informado')+'</dd></div>').join('');
  return '<section class="card coach-intake-shared"><span class="eyebrow">FICHA DEL ALUMNO</span><h3>Ficha compartida</h3><p class="ncc-intake-received">Recibida · disponible para preparar su plan</p>'+
   '<div class="pilot-toolbar"><button class="btn" type="button" data-act="prepareCoachPlanFromIntake">Usar ficha y preparar Dieta Guía</button></div>'+
   '<p class="pilot-hint">Primero revisás los objetivos; después la Dieta Guía y el envío. Este botón solo precarga datos autorizados, no publica el plan.</p>'+
   '<dl class="ncc-intake-data">'+rows+'</dl><p class="pilot-hint">Datos autodeclarados. No informado no significa ausencia de restricciones. Los campos opcionales pueden quedar vacíos.</p></section>';

 }
 async function publish(){
  assertCoachReleasePlanWriteAllowed();
  if(!canReadIntake())throw Error("La publicación anterior no está disponible. Usá el circuito de borrador y aprobación conjunta cuando esté habilitado.");
  if(COACH_ATOMIC_PLAN_UI_ENABLED)
   throw Error("La publicación anterior está deshabilitada: guardá y revisá el borrador para aprobar objetivo y guía juntos.");
  const student=state.selectedStudent,g=state.coachGoals[0],f=state.coachFoodPlan;
  if(!student||!state.consent?.accepted||!g||f?.guided_goal_id!==g.id||!f.guided_plan||!f.guided_plan_approved_at)
   throw Error("Primero aprobá un objetivo y su guía de cinco comidas para este alumno autorizado.");
  // The legacy RPC must never publish a new-cohort plan or rewrite a historical
  // published goal once efg_student_plan_access exists. Staged Coach drafts use
  // efg_publish_coach_plan_draft separately after verified database review.
  const who=actor();assertActor(who);
  await assertCoachGoalWriteSafe(sb,{studentId:student,fromSharedIntake:!!state.coachIntakeForms?.[student]?.shared_at});
  assertActor(who);
  if(state.selectedStudent!==student)throw Error("Cambió el alumno seleccionado durante la publicación.");
  if(!window.confirm("¿Publicar el plan y habilitar las funciones nutricionales de este alumno?"))return;
  assertActor(who);
  const r=await sb.rpc("efg_publish_coach_plan",{p_student:student,p_goal_id:g.id});
  assertActor(who);
  if(r.error)throw r.error;
  await refresh();assertActor(who);
  notify("Plan publicado. El alumno ya puede utilizar las herramientas nutricionales.");
 }
 return {pending,loadStudent,loadCoach,refreshCoachDetail,view,save,deleteOwn,details,publish};
}
