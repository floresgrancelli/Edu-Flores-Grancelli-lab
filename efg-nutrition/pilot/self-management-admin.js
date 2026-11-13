import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.118.0';
import {SELF_MANAGEMENT_URL,SELF_SUPABASE_URL,SELF_PUBLISHABLE_KEY} from './self-management-config.js?v=ncc-self-live-r1-20261113';
const sb=createClient(SELF_SUPABASE_URL,SELF_PUBLISHABLE_KEY),$=id=>document.getElementById(id);
let epoch=0,owner=null,email=null,busy=false;
const errors={admin_required:'Este acceso requiere una cuenta administradora activa.',account_not_ready:'La persona debe ingresar y verificar su correo una vez antes de habilitarla.',mode_mismatch:'Esta cuenta conserva su circuito con coach o está inactiva.',backend_pending:'El control de accesos todavía no está publicado.',auth_required:'Ingresá nuevamente desde la app.'};
function clear(){epoch++;owner=null;email=null;$('adminControls').hidden=true;$('accessDetail').hidden=true;$('accessState').textContent='';$('accessLookup').reset();}
async function call(body,t=epoch){
 const verified=await sb.auth.getUser();if(t!==epoch)throw Error('Cambió la sesión.');
 if(verified.error||!verified.data?.user||owner&&owner!==verified.data.user.id)throw Error(errors.auth_required);
 const id=verified.data.user.id,session=await sb.auth.getSession();
 if(t!==epoch||session.data?.session?.user?.id!==id)throw Error(errors.auth_required);
 const response=await fetch(SELF_MANAGEMENT_URL,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.data.session.access_token,apikey:SELF_PUBLISHABLE_KEY},body:JSON.stringify(body)});
 const data=await response.json();const check=await sb.auth.getUser();
 if(t!==epoch||check.data?.user?.id!==id)throw Error('Cambió la sesión.');
 if(!response.ok)throw Error(errors[data.error]||'No se pudo completar la operación. Reintentá.');
 if(data.userId!==id)throw Error('La respuesta no corresponde a tu sesión.');owner=id;return data;
}
function show(data){
 email=data.email;$('accessDetail').hidden=false;
 const active=data.access?.active&&Date.parse(data.access.expires_at)>Date.now();
 $('accessState').textContent=email+' · '+(active?'Habilitado hasta '+new Date(data.access.expires_at).toLocaleDateString('es-AR'):'Sin acceso vigente');
 $('grantAccess').disabled=!data.eligible;$('revokeAccess').disabled=!data.access?.active;
}
async function run(work){
 if(busy)return;busy=true;const t=epoch;$('adminControls').inert=true;
 try{await work(t);}catch(e){if(t===epoch)$('adminStatus').textContent=e.message;}
 finally{busy=false;$('adminControls').inert=false;}
}
$('accessEmail').oninput=()=>{email=null;$('accessDetail').hidden=true;$('accessState').textContent='';};
$('accessLookup').onsubmit=e=>{e.preventDefault();run(async t=>{const data=await call({action:'admin_lookup',email:$('accessEmail').value.trim()},t);show(data);$('adminStatus').textContent='Cuenta consultada.';});};
$('grantAccess').onclick=()=>run(async t=>{if(!email)return;show(await call({action:'admin_grant',email,days:Number($('accessDays').value)},t));$('adminStatus').textContent='Acceso al piloto guardado.';});
$('revokeAccess').onclick=()=>run(async t=>{if(!email)return;show(await call({action:'admin_revoke',email},t));$('adminStatus').textContent='Acceso revocado. Los registros se conservan.';});
sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||owner&&session?.user?.id!==owner){clear();$('adminStatus').textContent='Cambió la sesión. Volvé a administración.';}});
await run(async t=>{await call({action:'admin_status'},t);$('adminControls').hidden=false;$('adminStatus').textContent='Administración de accesos · Piloto privado';});
