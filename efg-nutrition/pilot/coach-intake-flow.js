// EFG Nutrition Pro — staged Coach Intake (isolated backend migration required).
// Nothing here unlocks access: PostgreSQL RLS + publish RPC are authoritative.
export function createCoachIntakeFlow({sb,state,escapeHTML,rootText,notify,render,refresh}){
 const names={fat_loss:"Reducir grasa",recomp:"Recomposición",muscle_gain:"Aumentar masa muscular",maintenance:"Mantenimiento",general:"Organizar mis hábitos"};
 const activities={low:"Mayormente sentado",light:"Ligera",moderate:"Moderada",high:"Alta"};
 const missing=e=>e&&["42P01","PGRST205"].includes(e.code);
 const pending=()=>state.profile?.role==="student"&&state.planAccessSupported&&state.planAccess?.status!=="published";
 async function loadStudent(){
  state.studentIntake=null;state.planAccess=null;state.planAccessSupported=false;
  if(state.profile?.role!=="student")return;
  const id=state.session.user.id;
  const a=await sb.from("efg_student_plan_access").select("status,published_at,published_goal_id").eq("student_id",id).maybeSingle();
  if(a.error){if(missing(a.error))return;throw a.error;}
  state.planAccessSupported=true;state.planAccess=a.data||{status:"pending"};
  // Privacy rights continue after publication: retain access to the intake and revoke sharing at any time.
  {
   const f=await sb.from("efg_student_intakes").select("objective,age_years,height_cm,weight_kg,activity_level,notes,shared_at").eq("student_id",id).maybeSingle();
   if(f.error)throw f.error;
   state.studentIntake=f.data||null;
  }
 }
 async function loadCoach(consentedIds){
  state.coachIntakeForms={};state.coachIntakeAccess={};
  if(!consentedIds.length)return;
  const [a,b]=await Promise.all([
   sb.from("efg_student_intakes").select("student_id,objective,age_years,height_cm,weight_kg,activity_level,notes,shared_at").in("student_id",consentedIds).not("shared_at","is",null).limit(500),
   sb.from("efg_student_plan_access").select("student_id,status,published_at").in("student_id",consentedIds).limit(500)
  ]);
  if(a.error&&!missing(a.error))throw a.error;
  if(b.error&&!missing(b.error))throw b.error;
  if(!a.error)for(const v of a.data||[])state.coachIntakeForms[v.student_id]=v;
  if(!b.error)for(const v of b.data||[])state.coachIntakeAccess[v.student_id]=v;
 }
 // Reload before opening a coach's student detail: permission may have been revoked
 // or the optional intake deleted in another session since the roster last loaded.
 async function refreshCoachDetail(studentId,consented){
  if(!studentId)return;
  delete state.coachIntakeForms[studentId];
  delete state.coachIntakeAccess[studentId];
  if(!consented)return;
  const [a,b]=await Promise.all([
   sb.from("efg_student_intakes")
    .select("student_id,objective,age_years,height_cm,weight_kg,activity_level,notes,shared_at")
    .eq("student_id",studentId).not("shared_at","is",null).maybeSingle(),
   sb.from("efg_student_plan_access")
    .select("student_id,status,published_at").eq("student_id",studentId).maybeSingle()
  ]);
  if(a.error&&!missing(a.error))throw a.error;
  if(b.error&&!missing(b.error))throw b.error;
  if(!a.error&&a.data?.shared_at)state.coachIntakeForms[studentId]=a.data;
  if(!b.error&&b.data)state.coachIntakeAccess[studentId]=b.data;
 }
 const opt=(id,label,value,selected)=>'<option value="'+id+'" '+(id===selected?'selected':'')+'>'+label+'</option>';
 function view(){
  const v=state.studentIntake||{},shared=!!v.shared_at;
  const field=(id,label,value,min,max,step)=>'<div class="field"><label for="'+id+'">'+label+' (opcional)</label><input type="number" inputmode="decimal" id="'+id+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+escapeHTML(value??"")+'"></div>';
  const ready=!pending();
  return rootText(ready?"MI FICHA INICIAL":"MI INGRESO",ready?"Consultá, corregí o retirale el acceso a tu coach cuando quieras.":"Mientras tu coach prepara tu plan, podés conversar con él y completar tu ficha.")+
  (ready?'<section class="coach-intake-intro"><div class="eyebrow">MI FICHA · EFG NUTRITION CON COACH</div><h2>Mi ficha y mis permisos</h2><p>Tu plan ya está disponible. Esta ficha es independiente: podés actualizarla o dejar de compartirla sin perder el acceso a MI DÍA.</p></section>':
   '<section class="coach-intake-intro"><div class="eyebrow">BIENVENIDO · EFG NUTRITION CON COACH</div><h2>Estamos preparando tu plan.</h2><p>Al publicarlo tu coach, se habilitarán las herramientas nutricionales. Por ahora tenés la mensajería, la privacidad y tu ficha voluntaria.</p></section>')+
  '<section class="card"><h2>Mi ficha inicial</h2><p class="pilot-hint">Todos los datos son opcionales y autodeclarados. Podés guardar sin compartir, o autorizar expresamente que el coach la vea.</p>'+
  '<form id="efgStudentIntakeForm" class="pilot-form">'+
  '<div class="field"><label for="efgIntakeObjective">Mi objetivo (opcional)</label><select id="efgIntakeObjective">'+opt("","Elegir objetivo","",v.objective||"")+Object.entries(names).map(([k,l])=>opt(k,l,k,v.objective)).join("")+'</select></div>'+
  '<div class="field-row">'+field("efgIntakeAge","Edad (años)",v.age_years,18,100,1)+field("efgIntakeHeight","Altura (cm)",v.height_cm,100,250,0.1)+field("efgIntakeWeight","Peso (kg)",v.weight_kg,20,400,0.1)+'</div>'+
  '<div class="field"><label for="efgIntakeActivity">Actividad diaria (opcional)</label><select id="efgIntakeActivity">'+opt("","Elegir nivel","",v.activity_level||"")+Object.entries(activities).map(([k,l])=>opt(k,l,k,v.activity_level)).join("")+'</select></div>'+
  '<div class="field"><label for="efgIntakeNotes">Qué te gustaría contarle al coach (opcional)</label><textarea id="efgIntakeNotes" rows="3" maxlength="1000" placeholder="Preferencias, horarios o dudas. No hace falta compartir datos médicos.">'+escapeHTML(v.notes||"")+'</textarea></div>'+
  '<label class="efg-intake-share-label" for="efgIntakeShare"><input type="checkbox" id="efgIntakeShare" '+(shared?'checked':'')+'> Autorizo compartir esta ficha con mi coach vinculado. Puedo retirar este permiso cuando quiera.</label>'+
  '<p class="pilot-hint">Este permiso es distinto del seguimiento nutricional. Para que el coach lea la ficha, ambos deben estar activos.</p>'+
  '<button class="btn block" type="submit">Guardar mi ficha</button></form>'+
  (state.studentIntake?'<div class="pilot-toolbar"><button type="button" class="btn light" data-act="deleteStudentIntake">Eliminar solamente mi ficha inicial</button></div><p class="pilot-hint">Se borran los datos opcionales de esta ficha y se deja de compartir. No se borran tu cuenta, el plan ni tus registros nutricionales.</p>':'')+
  '<div role="status" class="pilot-notice">'+(shared?'Ficha compartida con tu coach si autorizaste su seguimiento.':'Ficha privada. Todavía no la compartiste.')+'</div></section>'+
  (ready?'<section class="card"><h2>Tu plan sigue disponible</h2><p>Modificar o retirar el permiso para compartir esta ficha no borra tus registros ni despublica tu plan. El seguimiento del coach requiere por separado tu consentimiento vigente.</p><div class="pilot-toolbar"><button class="btn light" data-tab="privacy">Privacidad</button><button class="btn" data-tab="home">Volver a MI DÍA</button></div></section>':
   '<section class="card"><h2>Tu coach te acompaña</h2><p>Podés enviarle tus objetivos o hacerle preguntas. El plan se activará únicamente cuando el coach lo publique.</p><div class="pilot-toolbar"><button class="btn light" data-tab="messages">Abrir mensajes</button><button class="btn light" data-tab="privacy">Privacidad</button><button class="btn" data-act="checkCoachPlan">Comprobar mi plan</button></div></section>');
 }
 async function save(){
  if(state.profile?.role!=="student"||!state.session?.user?.id||!state.planAccessSupported)throw Error("Tu ficha no está disponible en esta sesión.");
  const get=id=>document.getElementById(id),value=id=>get(id)?.value?.trim()||"";
  const numeric=(id,min,max,integer=false)=>{
   const v=value(id);if(!v)return null;
   const n=Number(v);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw Error("Revisá el campo "+id+".");
   return n;
  };
  const objective=value("efgIntakeObjective")||null,activity_level=value("efgIntakeActivity")||null;
  if(objective&&!Object.keys(names).includes(objective))throw Error("Objetivo inválido.");
  if(activity_level&&!Object.keys(activities).includes(activity_level))throw Error("Actividad inválida.");
  const allow=!!get("efgIntakeShare")?.checked;
  const payload={student_id:state.session.user.id,organization_id:state.profile.organization_id,
   objective,activity_level,age_years:numeric("efgIntakeAge",18,100,true),
   height_cm:numeric("efgIntakeHeight",100,250),weight_kg:numeric("efgIntakeWeight",20,400),
   notes:value("efgIntakeNotes").slice(0,1000),
   shared_at:allow?(state.studentIntake?.shared_at||new Date().toISOString()):null,
   updated_at:new Date().toISOString()};
  const r=await sb.from("efg_student_intakes").upsert(payload,{onConflict:"student_id"});
  if(r.error)throw r.error;
  await loadStudent();await render();notify(allow?"Ficha guardada y compartida.":"Ficha privada guardada.");
 }
 async function deleteOwn(){
  if(state.profile?.role!=="student"||!state.session?.user?.id||!state.planAccessSupported)
   throw Error("Tu ficha no está disponible en esta sesión.");
  if(!state.studentIntake)return;
  if(!window.confirm("¿Eliminar definitivamente solo los datos de tu ficha inicial? No se borrarán tu cuenta, tu plan ni tus registros nutricionales."))return;
  const id=state.session.user.id;
  // The owner-only DELETE RLS policy provides the server-side permission check.
  const r=await sb.from("efg_student_intakes").delete().eq("student_id",id);
  if(r.error)throw r.error;
  await loadStudent();await render();notify("Tu ficha inicial se eliminó. El seguimiento nutricional conserva sus propios permisos.");
 }
 function details(studentId){
  const v=state.coachIntakeForms[studentId];
  if(!v||!v.shared_at)return "";
  const items=[["Objetivo",names[v.objective]],["Edad",v.age_years?String(v.age_years)+" años":null],["Altura",v.height_cm?String(v.height_cm)+" cm":null],["Peso",v.weight_kg?String(v.weight_kg)+" kg":null],["Actividad",activities[v.activity_level]],["Observaciones",v.notes]];
  return '<section class="card coach-intake-shared"><h3>Ficha inicial compartida</h3><p class="pilot-hint">Datos autodeclarados por el alumno. Úsalos únicamente para el acompañamiento autorizado.</p>'+
   items.filter(x=>x[1]).map(x=>'<p><strong>'+escapeHTML(x[0])+':</strong> '+escapeHTML(String(x[1]))+'</p>').join("")+'</section>';
 }
 async function publish(){
  const student=state.selectedStudent,g=state.coachGoals[0],f=state.coachFoodPlan;
  if(!student||!state.consent?.accepted||!g||f?.guided_goal_id!==g.id||!f.guided_plan||!f.guided_plan_approved_at)
   throw Error("Primero aprobá un objetivo y su guía de cinco comidas para este alumno autorizado.");
  if(!window.confirm("¿Publicar el plan y habilitar las funciones nutricionales de este alumno?"))return;
  const r=await sb.rpc("efg_publish_coach_plan",{p_student:student,p_goal_id:g.id});
  if(r.error)throw r.error;
  await refresh();
  notify("Plan publicado. El alumno ya puede utilizar las herramientas nutricionales.");
 }
 return {pending,loadStudent,loadCoach,refreshCoachDetail,view,save,deleteOwn,details,publish};
}
