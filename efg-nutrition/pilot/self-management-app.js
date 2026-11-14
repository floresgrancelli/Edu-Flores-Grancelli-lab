import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.118.0';
import {SELF_MANAGEMENT_URL,SELF_SUPABASE_URL,SELF_PUBLISHABLE_KEY} from './self-management-config.js?v=ncc-self-live-r1-20261113';
import {reuseOwnSelfIntake} from './self-management-intake.js?v=ncc-self-live-r1-20261113';
import {showSelfManagedResult} from './self-management-presenter.js?v=ncc-quinoa-r1-20261114';
const sb=createClient(SELF_SUPABASE_URL,SELF_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const form=document.getElementById('intake'),status=document.getElementById('status'),result=document.getElementById('result');
const accountStatus=document.getElementById('accountStatus'),button=document.getElementById('generate');
const entry=document.getElementById('selfEntry');
const login=document.getElementById('selfLogin'),nav=document.getElementById('selfNav');
let hasPlan=false,loginEmail=null,loginBusy=false;
function showTab(tab){
 form.hidden=tab!=='intake';result.hidden=tab!=='guide'||!hasPlan;
 document.getElementById('showGuide').setAttribute('aria-pressed',String(tab==='guide'));
 document.getElementById('showIntake').setAttribute('aria-pressed',String(tab==='intake'));
}
document.getElementById('showGuide').onclick=()=>showTab('guide');
document.getElementById('showIntake').onclick=()=>showTab('intake');
const errors={auth_required:'Ingresá con tu correo para abrir tu espacio.',access_required:'Tu acceso al piloto de autogestión todavía no está habilitado.',
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
 const id=await identity();if(!current(t)||id!==owner)throw Object.assign(Error('Cambió la sesión. Ingresá nuevamente.'),{code:'session_changed'});
 const {data,error}=await sb.auth.getSession();if(error||data.session?.user?.id!==id)throw Error(errors.auth_required);
 const response=await fetch(SELF_MANAGEMENT_URL,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token,apikey:SELF_PUBLISHABLE_KEY},body:JSON.stringify(body)});
 const value=await response.json();
 if(!current(t)||await identity()!==owner)throw Object.assign(Error('Cambió la sesión. Ingresá nuevamente.'),{code:'session_changed'});
 if(!response.ok)throw Object.assign(Error(errors[value.error]||'No pudimos completar la solicitud. Revisá la ficha e intentá nuevamente.'),{code:value.error});
 if(value.userId!==owner)throw Error('La respuesta no corresponde a tu cuenta.');return value;
}
function clearPrivate(){document.body.classList.remove('self-ready');document.getElementById('logout').hidden=false;document.getElementById('retryAccess').hidden=false;epoch++;owner=null;revision=0;legal=null;preferencePending=false;hasPlan=false;nav.hidden=true;login.hidden=true;form.reset();form.hidden=true;entry.hidden=true;document.getElementById('selfEntryConsent').checked=false;result.hidden=true;result.replaceChildren();status.textContent='';document.getElementById('preferenceText').textContent='';document.getElementById('prefillStatus').textContent='';loginEmail=null;document.getElementById('selfEmailForm').reset();document.getElementById('selfCodeForm').reset();document.getElementById('loginStatus').textContent='';document.getElementById('selfEmailForm').hidden=false;document.getElementById('selfCodeForm').hidden=true;}
function showPlan(saved){
 if(saved?.userId!==owner||saved.intakeRevision!==revision||!saved.result?.guide)return;
 hasPlan=true;document.getElementById('showGuide').disabled=false;
 showSelfManagedResult(result,saved.result,{onEdit:()=>showTab('intake')});showTab('guide');
}
async function boot(){
 clearPrivate();const t=epoch;accountStatus.textContent='Verificando tu cuenta…';
 try{
  const id=await identity();if(t!==epoch)return;owner=id;loginEmail=null;document.getElementById('selfEmailForm').reset();document.getElementById('selfCodeForm').reset();
  document.getElementById('mainAppLink').hidden=true;
  const profile=await sb.from('efg_profiles').select('role,active').eq('user_id',id).maybeSingle();
  if(!current(t))return;
  if(!profile.error&&profile.data?.active&&['admin','coach','student'].includes(profile.data.role))document.getElementById('mainAppLink').hidden=false;
  const state=await transport({action:'status'},t);legal=state.legal;
  let context=null;
  if(legal?.accepted){try{context=await transport({action:'context'},t);}catch(e){if(e.code!=='mode_mismatch')throw e;}}
  if(!context){entry.hidden=false;accountStatus.textContent='Elegí autogestión para recuperar tu ficha privada.';return;}
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
  document.body.classList.add('self-ready');nav.hidden=false;document.getElementById('showGuide').disabled=!hasPlan;showTab(hasPlan?'guide':'intake');accountStatus.textContent='Autogestión · acceso privado';
 }catch(e){if(t!==epoch)return;clearPrivate();accountStatus.textContent=e.message;if(e.code==='auth_required'){document.getElementById('logout').hidden=true;document.getElementById('retryAccess').hidden=true;login.hidden=false;document.getElementById('selfEmailForm').hidden=false;document.getElementById('selfCodeForm').hidden=true;}}
}
function edited(){editVersion++;hasPlan=false;result.hidden=true;document.getElementById('showGuide').disabled=true;status.textContent='Regenerá la guía para aplicar los cambios en tu ficha.';}
form.addEventListener('input',edited);
form.addEventListener('change',edited);
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
 }catch(e){if(current(t)){if(['auth_required','session_changed'].includes(e.code)){clearPrivate();accountStatus.textContent=e.message;}else status.textContent=e.message;}}
 finally{button.disabled=false;form.inert=false;}
});
document.getElementById('clear').onclick=()=>boot();
document.getElementById('retryAccess').onclick=()=>boot();
document.getElementById('openSelfIntake').onclick=async()=>{
 if(!document.getElementById('selfEntryConsent').checked){status.textContent='Marcá tu autorización para continuar.';return;}
 const t=epoch;entry.inert=true;
 try{
  if(!legal?.accepted)await transport({action:'accept_terms',version:legal.version,accepted:true},t);
  await transport({action:'register',explicitChoice:true},t);await boot();
 }catch(e){if(current(t))status.textContent=e.message;}
 finally{entry.inert=false;}
};
document.getElementById('logout').onclick=async()=>{clearPrivate();const {error}=await sb.auth.signOut();if(error){accountStatus.textContent='No pudimos cerrar la sesión. Reintentá.';return;}location.href='./';};
async function requestCode(){
 if(loginBusy)return;loginBusy=true;login.inert=true;
 const message=document.getElementById('loginStatus');
 try{
  const email=document.getElementById('selfEmail').value.trim().toLowerCase();
  if(!document.getElementById('selfEmailForm').reportValidity())return;
  const {error}=await sb.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:'https://efg-nutrition.onrender.com/pilot/'}});
  if(error)throw error;
  loginEmail=email;document.getElementById('selfEmailForm').hidden=true;document.getElementById('selfCodeForm').hidden=false;
  message.textContent='Revisá tu correo e ingresá el código. Verificar tu correo no habilita el piloto automáticamente.';
 }catch{message.textContent='No pudimos solicitar el código. Revisá tu conexión y reintentá.';}
 finally{loginBusy=false;login.inert=false;}
}
document.getElementById('selfEmailForm').onsubmit=e=>{e.preventDefault();requestCode();};
document.getElementById('resendCode').onclick=requestCode;
document.getElementById('changeEmail').onclick=()=>{loginEmail=null;document.getElementById('selfCodeForm').reset();document.getElementById('selfCodeForm').hidden=true;document.getElementById('selfEmailForm').hidden=false;document.getElementById('loginStatus').textContent='';document.getElementById('selfEmailForm').hidden=false;document.getElementById('selfCodeForm').hidden=true;};
document.getElementById('selfCodeForm').onsubmit=async e=>{
 e.preventDefault();if(loginBusy||!loginEmail)return;loginBusy=true;login.inert=true;
 try{const {error}=await sb.auth.verifyOtp({email:loginEmail,token:document.getElementById('selfCode').value.trim(),type:'email'});if(error)throw error;await boot();}
 catch{document.getElementById('loginStatus').textContent='El código no se pudo verificar. Revisalo o pedí uno nuevo.';}
 finally{loginBusy=false;login.inert=false;}
};
sb.auth.onAuthStateChange((event,session)=>{
 if(event==='SIGNED_OUT'){clearPrivate();accountStatus.textContent='Sesión cerrada.';document.getElementById('logout').hidden=true;document.getElementById('retryAccess').hidden=true;login.hidden=false;}
 else if(session?.user?.id&&((owner&&session.user.id!==owner)||(!owner&&event==='SIGNED_IN'&&!loginBusy))){clearPrivate();accountStatus.textContent='La cuenta cambió. Verificando el acceso…';setTimeout(()=>boot(),0);}
});
await boot();
