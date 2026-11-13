import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.118.0';
import {createDeletionClient} from './account-deletion-client.mjs';

// Same public configuration and browser session as the current pilot app.
// This is a publishable key, never an admin/service key.
const sdk = createClient('https://cyjvddhimbsfipjfctsl.supabase.co',
  'sb_publishable_85h68iKEFdxLTWM86Z8svg_a4s349CZ',
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const client = createDeletionClient(sdk);
const $ = id => document.getElementById(id);
let otpEmail = '';
let busy = false;
let epoch = 0;
function feedback(message,error=false) { $('feedback').textContent=message; $('feedback').dataset.error=String(error); }
function showIdentity(user) {
  $('email-form').hidden=true; $('code-form').hidden=true; $('verified').hidden=false;
  $('identity').textContent='Cuenta verificada: '+user.email;
}
function reset() {
  $('email-form').hidden=false; $('code-form').hidden=true; $('verified').hidden=true;
  $('receipt').hidden=true; $('receipt').replaceChildren(); $('identity').textContent='';
  $('deletion-form').hidden=false; $('confirm').checked=false; $('code').value=''; otpEmail='';
}
function receipt(row) {
  $('deletion-form').hidden=true; $('receipt').hidden=false; $('receipt').replaceChildren();
  const title=document.createElement('strong');
  title.textContent=row.status==='completed'?'Solicitud marcada como completada':row.status==='processing'?'Solicitud en proceso':'Solicitud recibida';
  const id=document.createElement('p');id.textContent='Número: '+row.id;
  const note=document.createElement('p');note.textContent=row.status==='completed'
    ?'El estado fue informado por el servicio. Esta pantalla no comprueba por sí sola el borrado de cada dato.'
    :'Tu pedido quedó registrado. La eliminación todavía no se completó.';
  $('receipt').append(title,id,note);
}
async function action(fn) {
  if(busy)return; busy=true;const startEpoch=epoch;
  document.querySelectorAll('button').forEach(x=>x.disabled=true);
  feedback('Un momento…');
  try { await fn(startEpoch); } catch(error) { feedback(error.message||'No pudimos completar la operación.',true); }
  finally { busy=false;document.querySelectorAll('button').forEach(x=>x.disabled=false); }
}
async function checkCurrent() {
  const start=epoch;
  const {data,error}=await sdk.auth.getUser();
  if(start!==epoch)return;
  if(error||!data?.user){reset();feedback('');return;}
  const row=await client.current();
  if(start!==epoch)return;
  showIdentity(data.user);if(row)receipt(row);feedback('');
}
$('email-form').addEventListener('submit',event=>{event.preventDefault();action(async()=>{
  const email=$('email').value.trim();
  const {error}=await sdk.auth.signInWithOtp({email,options:{shouldCreateUser:false}});
  if(error)throw new Error('No pudimos enviar el código. Revisá el correo o intentá más tarde.');
  otpEmail=email;$('email-form').hidden=true;$('code-form').hidden=false;$('code').focus();
  feedback('Si el correo corresponde a una cuenta, recibirás un código de acceso.');
});});
$('code-form').addEventListener('submit',event=>{event.preventDefault();action(async()=>{
  const {error}=await sdk.auth.verifyOtp({email:otpEmail,token:$('code').value.trim(),type:'email'});
  if(error)throw new Error('El código no es válido o venció. Volvé a solicitarlo.');
  await checkCurrent();
});});
$('change-email').addEventListener('click',()=>{epoch++;reset();feedback('');});
$('deletion-form').addEventListener('submit',event=>{event.preventDefault();action(async(start)=>{
  const row=await client.request({confirmed:$('confirm').checked});
  if(start!==epoch)throw new Error('La sesión cambió. Volvé a verificar tu cuenta.');
  receipt(row);feedback('La solicitud se guardó correctamente.');
});});
$('sign-out').addEventListener('click',()=>action(async()=>{
  const {error}=await sdk.auth.signOut();if(error)throw new Error('No se pudo cerrar la sesión. Intentá nuevamente.');
  epoch++;reset();feedback('Sesión cerrada.');
}));
sdk.auth.onAuthStateChange(event=>{if(['SIGNED_OUT','SIGNED_IN','USER_UPDATED'].includes(event)){
  epoch++;reset();
}});
checkCurrent().catch(()=>{reset();feedback('No pudimos consultar el servicio. Intentá nuevamente más tarde.',true);});
