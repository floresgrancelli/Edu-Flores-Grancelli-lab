// Student-only declaration. Health data never travel in the general intake.
import {COACH_HEALTH_CONDITIONS} from './gut-clinical-workbench.js';
const IDS=new Set(COACH_HEALTH_CONDITIONS.map(x=>x.id));
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const known=x=>x==='suspected'||x==='confirmed';
function choices(obj){
 if(!obj||typeof obj!=='object'||Array.isArray(obj)||Object.entries(obj).some(([id,v])=>!IDS.has(id)||!known(v)))throw Error('Revisá las opciones marcadas.');
 return Object.fromEntries(Object.entries(obj).sort(([a],[b])=>a.localeCompare(b)));
}
export function createStudentRestrictionDeclaration({sb,readContext,enabled=false}){
 let generation=0,snapshot=null,mount=null,busy=false;
 const key=c=>JSON.stringify([c?.userId,c?.sessionId,c?.organizationId,c?.epoch,c?.role,c?.active]);
 const capture=()=>{const c=readContext();if(!enabled||c?.role!=='student'||c.active!==true||![c.userId,c.organizationId,c.sessionId].every(x=>UUID.test(x||''))||!Number.isSafeInteger(c.epoch)||c.epoch<1)throw Error('Se necesita una sesión de alumno verificada.');return {context:c,key:key(c),generation};};
 const check=t=>{if(t.generation!==generation||t.key!==key(readContext()))throw Error('La sesión o la ficha cambiaron. Volvé a cargarla.');};
 async function call(t,name,args){check(t);const u=await sb.auth.getUser();check(t);if(u.error||u.data?.user?.id!==t.context.userId)throw Error('Identidad no verificada.');const r=await sb.rpc(name,args);check(t);if(r.error)throw Error('No se confirmó la operación. Volvé a consultar antes de reenviar.');return r.data;}
 async function load(){
  const t=capture();snapshot=null;const doc=await call(t,'efg_current_coach_health_document');
  if(!UUID.test(doc?.id||'')||typeof doc.content!=='string'||!doc.content.trim()||!/^[a-f0-9]{64}$/i.test(doc.sha256||''))throw Error('La autorización específica todavía no está disponible.');
  const row=await call(t,'efg_get_coach_health_intake',{p_student:t.context.userId});
  if(row!==null&&(!Number.isSafeInteger(row?.revision)||row.revision<1||(row.revoked!==true&&(row.student_id!==t.context.userId||row.organization_id!==t.context.organizationId))))throw Error('La respuesta no corresponde a tu ficha actual.');
  const raw=row?.revoked?{}:row?.conditions??{};
  const readable=raw&&typeof raw==='object'&&!Array.isArray(raw)&&Object.entries(raw).every(([k,v])=>IDS.has(k)&&(known(v)||v==='not_reported'));
  const selected=readable?choices(Object.fromEntries(Object.entries(raw).filter(([,v])=>known(v)))):{};
  const d=row?.restriction_declaration,explicit=d?.kind==='none_declared'&&d.version===1&&d.declared_by===t.context.userId&&d.source_revision===row.revision&&Number.isFinite(Date.parse(d.confirmed_at))&&Date.parse(d.confirmed_at)<=Date.now();
  const declaration=row?.revoked||!readable?'unknown':Object.keys(selected).length?'reported':explicit?'none_declared':'unknown';
  check(t);snapshot={t,doc,revision:row?.revision??0,revoked:row?.revoked===true,readable};
  return {document:doc,revision:snapshot.revision,revoked:snapshot.revoked,declaration,selected,shared:row?.shared_with_coach===true,readable};
 }
 async function declare({noneDeclared=false,conditions={},processing=false,sharing=false}={}){
  const selected=choices(conditions),count=Object.keys(selected).length,s=snapshot;
  if(busy||!s?.readable||processing!==true||typeof sharing!=='boolean'||typeof noneDeclared!=='boolean'||(noneDeclared?count!==0||!sharing:count===0))throw Error('Elegí una respuesta y confirmá por separado los permisos que correspondan.');
  check(s.t);busy=true;
  try{
   const common={p_expected_revision:s.revision,p_processing_consent:true,p_share_with_coach:sharing};
   const next=noneDeclared?await call(s.t,'efg_declare_no_restrictions',{...common,p_document:s.doc.id,p_sha256:s.doc.sha256}):await call(s.t,'efg_submit_coach_health_intake',{...common,p_conditions:selected,p_document_id:s.doc.id,p_document_sha256:s.doc.sha256});
   if(next!==s.revision+1)throw Error('Revisión inesperada. Volvé a consultar.');check(s.t);
   const fresh=await load();check(s.t);
   if(next!==fresh.revision||fresh.revoked||fresh.document.id!==s.doc.id||fresh.document.sha256!==s.doc.sha256||(noneDeclared?fresh.declaration!=='none_declared':fresh.declaration!=='reported'||fresh.shared!==sharing||JSON.stringify(fresh.selected)!==JSON.stringify(selected)))throw Error('La lectura posterior no coincide con lo enviado.');
   return {revision:next,acknowledged:true,declarationReadback:fresh.declaration};
  }finally{busy=false;}
 }
 async function revoke(){const s=snapshot;if(busy||!s||s.revision<1||s.revoked)throw Error('No hay autorización vigente para retirar.');check(s.t);busy=true;try{if(await call(s.t,'efg_revoke_coach_health_intake',{p_expected_revision:s.revision})!==true)throw Error('Revocación no confirmada.');check(s.t);const fresh=await load();if(!fresh.revoked)throw Error('No se confirmó el retiro del permiso.');return fresh;}finally{busy=false;}}
 function invalidate(){generation++;snapshot=null;mount?.replaceChildren();mount=null;}
 async function open(element){
  invalidate();mount=element;const t=capture(),v=await load();check(t);
  const opts=COACH_HEALTH_CONDITIONS.map(({id,label})=>'<label>'+esc(label)+'<select data-condition="'+esc(id)+'"><option value="">No seleccionada</option>'+[['confirmed','Confirmada'],['suspected','En estudio']].map(([k,l])=>'<option value="'+k+'"'+(v.selected[id]===k?' selected':'')+'>'+l+'</option>').join('')+'</select></label>').join('');
  element.innerHTML='<section class="card" data-restriction-panel><h2>Mis restricciones alimentarias</h2><details><summary>Cómo se usan mis datos</summary><p>'+esc(v.document.content)+'</p></details><form data-restriction-form class="pilot-form"><fieldset><legend>¿Qué querés informar?</legend>'+opts+'<label><input type="checkbox" name="none"> No tengo restricciones que informar.</label></fieldset><label><input type="checkbox" name="processing"> Autorizo guardar esta información de salud.</label><label><input type="checkbox" name="sharing"> Autorizo compartirla con mi coach.</label><button class="btn" type="submit"'+(!v.readable?' disabled':'')+'>Guardar mi respuesta</button></form>'+(v.revision&&!v.revoked?'<button class="btn light" data-restriction-revoke>Retirar autorización</button>':'')+'<p role="status" data-restriction-status></p></section>';
  const status=element.querySelector('[data-restriction-status]'),form=element.querySelector('form');
  status.textContent=!v.readable?'No se pudo interpretar la ficha guardada. No la sobrescribimos.':v.revoked?'Autorización retirada.':v.declaration==='reported'?(v.shared?'Ficha compartida con tu coach.':'Ficha privada: no compartida.') :v.declaration==='none_declared'?'Declaración vigente: sin restricciones.':'Todavía no hay una respuesta confirmada.';
  const show=msg=>{if(t.generation===generation&&t.key===key(readContext())&&mount===element)status.textContent=msg;};
  form.addEventListener('submit',async e=>{e.preventDefault();try{check(t);const conditions=Object.fromEntries([...form.querySelectorAll('[data-condition]')].filter(el=>el.value).map(el=>[el.dataset.condition,el.value]));await declare({conditions,noneDeclared:form.elements.none.checked,processing:form.elements.processing.checked,sharing:form.elements.sharing.checked});check(t);await open(element);}catch(err){show(err.message);}});
  element.querySelector('[data-restriction-revoke]')?.addEventListener('click',async()=>{try{check(t);await revoke();check(t);await open(element);}catch(err){show(err.message);}});return v;
 }
 return {load,declare,revoke,open,invalidate};
}
