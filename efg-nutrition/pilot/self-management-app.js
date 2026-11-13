import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.118.0';
import {SELF_MANAGEMENT_URL,SELF_SUPABASE_URL,SELF_PUBLISHABLE_KEY} from './self-management-config.js';
import {reuseOwnSelfIntake} from './self-management-intake.js';
import {showSelfManagedResult} from './self-management-presenter.js';
const sb=createClient(SELF_SUPABASE_URL,SELF_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const form=document.getElementById('intake'),status=document.getElementById('status'),result=document.getElementById('result');
const accountStatus=document.getElementById('accountStatus'),button=document.getElementById('generate');
const errors={auth_required:'Ingresá nuevamente desde la app.',access_required:'Tu acceso al piloto de autogestión todavía no está habilitado.',
 mode_mismatch:'Tu cuenta conserva el circuito con coach. Volvé a Mi Día para continuar.',legal_required:'Revisá y aceptá las condiciones vigentes.',
 conflict:'La ficha cambió en otro dispositivo. Recargá antes de continuar.',rate_limited:'Hiciste varias solicitudes seguidas. Esperá un minuto y reintentá.',
 outside_scope:'Esta guía general no cubre tu situación. Consultá con un profesional.',
 targets_unmatched:'No pudimos ajustar una guía a tus metas. No se guardó un menú desajustado.',
 composition_unavailable:'No conseguimos una guía compatible con tu ficha. Revisá tus preferencias.',
 pattern_pending:'Ese patrón alimentario aún no permite entrega automática.',window_pending:'El ayuno requiere una adaptación profesional.',
 unavailable:'No pudimos conectar con tu cuenta. Reintentá en unos momentos.'};
let owner=null,epoch=0,revision=0,legal=null,preferencePending=false,editVersion=0;
const current=t=>t===epoch&&!!owner;
const identity=async()=>{const {data,error}=await sb.auth.getUser();if(error||!data?.user)throw Object.assign(Error(errors.auth_required),{code:'auth_required'});return data.user.id;};
async function transport(body,t=epoch){
 const id=await identity();if(!current(t)||id!==owner)throw Error('Cambió la sesión.');
 const {data,error}=await sb.auth.getSession();if(error||data.session?.user?.id!==id)throw Error(errors.auth_required);
 const response=await fetch(SELF_MANAGEMENT_URL,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token,apikey:SELF_PUBLISHABLE_KEY},body:JSON.stringify(body)});
 const value=await response.json();
 if(!current(t)||await identity()!==owner)throw Error('Cambió la sesión.');
 if(!response.ok)throw Object.assign(Error(errors[value.error]||'No pudimos completar la solicitud. Revisá la ficha e intentá nuevamente.'),{code:value.error});
 if(value.userId!==owner)throw Error('La respuesta no corresponde a tu cuenta.');return value;
}
function clearPrivate(){epoch++;owner=null;revision=0;legal=null;preferencePending=false;form.reset();form.hidden=true;result.hidden=true;result.replaceChildren();status.textContent='';document.getElementById('preferenceText').textContent='';}
function showPlan(saved){
 if(saved?.userId!==owner||saved.intakeRevision!==revision||!saved.result?.guide)return;
 showSelfManagedResult(result,saved.result,{onEdit:()=>{result.hidden=true;form.scrollIntoView({behavior:'smooth'});}});
}
async function boot(){
 clearPrivate();const t=epoch;accountStatus.textContent='Verificando tu cuenta…';
 try{
  const id=await identity();if(t!==epoch)return;owner=id;
  const state=await transport({action:'status'},t);legal=state.legal;
  let context=null;
  if(legal?.accepted){try{context=await transport({action:'context'},t);}catch(e){if(e.code!=='mode_mismatch')throw e;}}
  const snapshot=await fetch('../catalog/guide-catalog.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('No pudimos cargar los alimentos.');return r.json();});
  if(!current(t))return;
  const choices=Object.values(snapshot.foods).filter(f=>['g','ml'].includes(f.unit)).sort((a,b)=>a.name.localeCompare(b.name,'es'));
  const select=document.getElementById('disliked');select.replaceChildren(...choices.map(f=>new Option(f.name,f.id)));
  if(context){
   const reused=reuseOwnSelfIntake({userId:owner,saved:context.intake,general:context.generalIntake});revision=reused.intakeRevision;
   for(const [key,value] of Object.entries(reused.fields))if(form.elements[key]&&value!==null&&value!==undefined){if(key==='eating_window'&&![...form.elements[key].options].some(o=>o.value===value))form.elements[key].add(new Option('Ventana previa · requiere revisión',value));form.elements[key].value=value;}
   for(const option of select.options)option.selected=(reused.fields.disliked_food_ids||[]).includes(option.value);
   preferencePending=reused.unresolvedPreferenceText.length>0;
   document.getElementById('preferenceReview').hidden=!preferencePending;
   document.getElementById('preferenceText').textContent=preferencePending?'Tu ficha previa tiene gustos escritos: '+reused.unresolvedPreferenceText.map(k=>reused.fields[k]).join(' · ')+'. Revisé la selección de alimentos de abajo; esos textos no se aplican automáticamente.':'';
   document.getElementById('prefillStatus').textContent=revision?'Recuperamos tu ficha privada. Podés actualizar las medidas.':'Recuperamos los datos disponibles de tu ficha.';
   showPlan(context.latestPlan);
  }
  form.elements.scope.checked=false;form.elements.consent.checked=false;
  form.hidden=false;accountStatus.textContent='Autogestión · acceso privado';
 }catch(e){if(t!==epoch)return;clearPrivate();accountStatus.textContent=e.message;}
}
form.addEventListener('input',()=>{editVersion++;result.hidden=true;});
form.addEventListener('change',()=>{editVersion++;result.hidden=true;});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(button.disabled||!form.reportValidity())return;
 const t=epoch,id=owner,edit=editVersion,values=Object.fromEntries(new FormData(form));button.disabled=true;form.inert=true;
 try{
  if(preferencePending&&!document.getElementById('preferenceReviewed').checked)throw Error('Revisá y confirmá los gustos de tu ficha previa.');
  status.textContent='Guardando tu ficha y calculando la guía…';
  if(!legal?.accepted){await transport({action:'accept_terms',version:legal.version,accepted:true},t);legal.accepted=true;}
  await transport({action:'register',explicitChoice:true},t);
  const fields={age_years:Number(values.age_years),height_cm:Number(values.height_cm),weight_kg:Number(values.weight_kg),
   objective:values.objective,sex_for_equation:values.sex_for_equation,activity_level:values.activity_level,dietary_pattern:values.dietary_pattern,
   eating_window:values.eating_window,processingConsent:true,pregnantOrBreastfeeding:false,clinicalCareRequired:false,eatingDisorderHistory:false,
   restrictionDeclaration:'none_declared',health_flags:[],disliked_food_ids:[...document.getElementById('disliked').selectedOptions].map(o=>o.value)};
  const saved=await transport({action:'save_intake',fields,expectedRevision:revision,requestId:crypto.randomUUID()},t);
  revision=saved.intake.revision;
  if(!current(t)||id!==owner||edit!==editVersion)return;
  const generated=await transport({action:'generate',requestId:crypto.randomUUID()},t);
  if(!current(t)||id!==owner||edit!==editVersion)return;
  showPlan(generated);status.textContent='Guía guardada en tu cuenta. Podés volver a abrirla cuando quieras.';
  result.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){if(current(t))status.textContent=e.message;}
 finally{button.disabled=false;form.inert=false;}
});
document.getElementById('clear').onclick=()=>boot();
document.getElementById('logout').onclick=async()=>{clearPrivate();await sb.auth.signOut();location.href='./';};
sb.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){clearPrivate();accountStatus.textContent='Sesión cerrada. Volvé a ingresar desde la app.';}});
await boot();
