// Private consented health declaration. Wired for isolated testing but OFF
// until the server-side signed health document, RLS, hosted OTP and Edu GO.
// It is NEVER a general-intake field or a shortcut around the two pilot notices.
export const PRIVATE_HEALTH_DECLARATION_UI_ENABLED=false;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// These are self-reported dietary considerations, never diagnoses made by the
// app and never proof that an industrial preparation is allergen-safe.
export const RESTRICTION_CHOICES=Object.freeze([
 {id:'celiac',label:'Celiaquía'}, {id:'lactose_intolerance',label:'Intolerancia a la lactosa'},
 {id:'food_allergy',label:'Alergia alimentaria'}, {id:'sibo',label:'SIBO (requiere revisión individual)'},
 {id:'diabetes',label:'Diabetes'}, {id:'hypertension',label:'Hipertensión'},
 {id:'dyslipidemia',label:'Colesterol / lípidos'}, {id:'fatty_liver',label:'Hígado graso'}
].map(x=>Object.freeze(x)));
const allowed=new Set(RESTRICTION_CHOICES.map(x=>x.id));
export function normalizeRestrictionChoices(conditions){
 if(!conditions||typeof conditions!=='object'||Array.isArray(conditions))
  throw Error('Seleccioná una o más restricciones que quieras informar.');
 const entries=Object.entries(conditions);
 if(!entries.length||entries.length>RESTRICTION_CHOICES.length||entries.some(
  ([key,value])=>!allowed.has(key)||!['confirmed','suspected'].includes(value)))
  throw Error('Indicá restricciones válidas o declaralas explícitamente como ninguna.');
 return Object.fromEntries(entries.sort(([a],[b])=>a.localeCompare(b)));
}
export function createStudentRestrictionDeclaration({sb,readContext,enabled=false}){
 let generation=0,snapshot=null,mount=null,busy=false;
 const key=c=>JSON.stringify([c?.userId,c?.sessionId,c?.organizationId,c?.epoch]);
 const capture=()=>{
  const c=readContext();
  if(!enabled||c?.role!=='student'||c.active!==true||!UUID.test(c.userId||'')||
   !UUID.test(c.organizationId||'')||!UUID.test(c.sessionId||'')||!Number.isSafeInteger(c.epoch)||c.epoch<1)
   throw Error('Tu declaración necesita una sesión de alumno verificada.');
  return {context:c,key:key(c),generation};
 };
 const check=t=>{if(t.generation!==generation||t.key!==key(readContext()))throw Error('La sesión o la ficha cambiaron. Volvé a cargar la declaración.');};
 async function call(t,name,args){
  check(t);const user=await sb.auth.getUser();check(t);
  if(user.error||user.data?.user?.id!==t.context.userId)throw Error('Identidad no verificada.');
  // Crucially, recheck AFTER Auth and BEFORE any mutation.
  const r=await sb.rpc(name,args);check(t);
  if(r.error)throw Error('No se pudo confirmar la declaración en el servidor.');
  return r.data;
 }
 async function load(){
  const t=capture();snapshot=null;
  const doc=await call(t,'efg_current_coach_health_document');
  if(!UUID.test(doc?.id||'')||!String(doc.content||'').trim()||! /^[a-f0-9]{64}$/i.test(doc.sha256||''))
   throw Error('La autorización específica todavía no está disponible.');
  const row=await call(t,'efg_get_coach_health_intake',{p_student:t.context.userId});
  if(row!==null&&(!Number.isSafeInteger(row.revision)||row.revision<1||
    (row.revoked!==true&&(row.student_id!==t.context.userId||row.organization_id!==t.context.organizationId))))
   throw Error('La respuesta no corresponde a tu ficha actual.');
  check(t);snapshot={t,doc,revision:row?.revision??0,revoked:row?.revoked===true};
  const d=row?.restriction_declaration;
  const explicit=d?.kind==='none_declared'&&d.version===1&&d.declared_by===t.context.userId&&
   d.source_revision===row.revision&&Number.isFinite(Date.parse(d.confirmed_at))&&Date.parse(d.confirmed_at)<=Date.now();
  // Medical status remains UNKNOWN if no signed negative statement or active
  // self-reported condition exists; a blank {} alone proves nothing.
  const codes=row?.conditions&&typeof row.conditions==='object'&&!Array.isArray(row.conditions)
   ?Object.entries(row.conditions):[];
  if(codes.some(([code,status])=>!allowed.has(code)||!['confirmed','suspected','not_reported'].includes(status)))
   throw Error('No se pudo validar el contenido de tu declaración.');
  const active=Object.fromEntries(codes.filter(([,status])=>status!=='not_reported'));
  const declared=!snapshot.revoked&&Object.keys(active).length>0;
  return {document:doc,revision:snapshot.revision,revoked:snapshot.revoked,
   conditions:declared?active:{},
   declaration:explicit&&!snapshot.revoked?'none_declared':declared?'declared':'unknown'};
 }
 async function declare({noneDeclared=false,processing=false,sharing=null}={}){
  if(busy)throw Error('Esperá la confirmación pendiente.');
  if(!snapshot||noneDeclared!==true||processing!==true||typeof sharing!=='boolean')
   throw Error('Confirmá la declaración y los dos permisos por separado.');
  const s=snapshot;check(s.t);busy=true;
  try{
   const next=await call(s.t,'efg_declare_no_restrictions',{p_document:s.doc.id,p_sha256:s.doc.sha256,
    p_expected_revision:s.revision,p_processing_consent:true,p_share_with_coach:sharing});
   if(next!==s.revision+1)throw Error('La revisión devuelta no coincide.');
   const fresh=await load();if(fresh.revision!==next||fresh.revoked||fresh.declaration!=='none_declared')
    throw Error('No se confirmó la declaración guardada. Volvé a consultar antes de reenviar.');
   return {revision:next,acknowledged:true,declarationReadback:'none_declared'};
  }finally{busy=false;}
 }
 async function declareConditions({conditions,processing=false,sharing=null}={}){
  if(busy)throw Error('Esperá la confirmación pendiente.');
  if(!snapshot||processing!==true||typeof sharing!=='boolean')
   throw Error('Confirmá el tratamiento de esta declaración y decidí si compartirla.');
  const clean=normalizeRestrictionChoices(conditions);
  const s=snapshot;check(s.t);busy=true;
  try{
   const next=await call(s.t,'efg_submit_coach_health_intake',{
    p_conditions:clean,p_document_id:s.doc.id,p_document_sha256:s.doc.sha256,
    p_expected_revision:s.revision,p_processing_consent:true,p_share_with_coach:sharing
   });
   if(next!==s.revision+1)throw Error('La revisión guardada no coincide.');
   const fresh=await load();
   const same=Object.keys(fresh.conditions||{}).length===Object.keys(clean).length&&
    Object.entries(clean).every(([k,v])=>fresh.conditions[k]===v);
   if(!same||fresh.revoked||fresh.declaration!=='declared'||fresh.revision!==next)
    throw Error('No se confirmó la declaración específica en el servidor.');
   return {revision:next,acknowledged:true,declarationReadback:'declared'};
  }finally{busy=false;}
 }
 async function revoke(){
  if(busy||!snapshot||snapshot.revision<1||snapshot.revoked)throw Error('No hay una declaración vigente para retirar.');
  const s=snapshot;check(s.t);busy=true;
  try{if(await call(s.t,'efg_revoke_coach_health_intake',{p_expected_revision:s.revision})!==true)
    throw Error('No se confirmó la revocación.');
   const fresh=await load();if(!fresh.revoked)throw Error('No se confirmó el retiro del permiso.');return fresh;
  }finally{busy=false;}
 }
 function invalidate(){generation++;snapshot=null;if(mount)mount.replaceChildren();mount=null;}
 async function open(element){
  invalidate();mount=element;const gen=generation;
  const value=await load();if(gen!==generation||mount!==element)throw Error('La vista cambió.');
  element.innerHTML='<section class="card" data-restriction-panel><h2>Declaración de restricciones</h2>'+
   '<p>Esta sección es independiente de tus gustos y de la ficha general. No interpreta un campo vacío como ausencia de restricciones.</p>'+
   '<details><summary>Leer autorización específica</summary><p>'+esc(value.document.content)+'</p></details>'+
   '<form data-restriction-form class="pilot-form">'+
   '<p>Indicá solo las condiciones que quieras informar. Podés elegir «me lo indicaron» o «lo sospecho»; la app no diagnostica.</p>'+
   RESTRICTION_CHOICES.map(choice=>'<label>'+esc(choice.label)+
    '<select data-restriction-code="'+esc(choice.id)+'" name="r_'+esc(choice.id)+'">'+
     '<option value="">No informar</option>'+
     '<option value="confirmed"'+(value.conditions?.[choice.id]==='confirmed'?' selected':'')+'>Me lo indicaron</option>'+
     '<option value="suspected"'+(value.conditions?.[choice.id]==='suspected'?' selected':'')+'>Lo sospecho</option>'+
    '</select></label>').join('')+
   '<label><input type="checkbox" name="none"> Declaro expresamente que no tengo restricciones médicas o alergias alimentarias que informar.</label>'+
   '<label><input type="checkbox" name="processing"> Autorizo el tratamiento de esta declaración.</label>'+
   '<label><input type="checkbox" name="sharing"> Autorizo compartirla con mi coach vinculado.</label>'+
   '<p>Elegí restricciones o marcá «ninguna», nunca ambas. Compartir con el coach es opcional; sin permiso permanece privado. No es una indicación clínica.</p>'+
   '<button class="btn" type="submit">Guardar declaración separada</button></form>'+
   (value.revision&&!value.revoked?'<button class="btn light" data-restriction-revoke>Retirar autorización</button>':'')+
   '<p role="status" data-restriction-status>'+esc(value.revoked?'Autorización retirada.':value.declaration==='none_declared'?'Declaración vigente: sin restricciones declaradas.':value.declaration==='declared'?'Declaración vigente: restricciones informadas.':'Declaración ausente o no comprobada.')+'</p></section>';
  const status=element.querySelector('[data-restriction-status]');
  const show=message=>{if(gen===generation&&mount===element)status.textContent=message;};
  element.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();
   const form=e.currentTarget;try{
    const sharing=form.elements.sharing.checked;
    const conditions=Object.fromEntries(
     [...form.querySelectorAll('[data-restriction-code]')].filter(x=>x.value!=='')
      .map(x=>[x.dataset.restrictionCode,x.value]));
    if(form.elements.none.checked&&Object.keys(conditions).length)
     throw Error('Elegí restricciones o ninguna, no ambas.');
    const result=form.elements.none.checked
     ?await declare({noneDeclared:true,processing:form.elements.processing.checked,sharing})
     :await declareConditions({conditions,processing:form.elements.processing.checked,sharing});
    if(gen!==generation||mount!==element)return;
    await open(element);
    element.querySelector('[data-restriction-status]').textContent=sharing
     ?'Declaración compartida con tu coach. Revisión '+result.revision+'.'
     :'Declaración privada guardada. Revisión '+result.revision+'. No se compartió con tu coach.';
   }catch(error){show(error.message);}});
  element.querySelector('[data-restriction-revoke]')?.addEventListener('click',async()=>{
   try{await revoke();if(gen!==generation||mount!==element)return;await open(element);
    element.querySelector('[data-restriction-status]').textContent='Autorización retirada. El borrador anterior requiere nueva revisión.';
   }catch(error){show(error.message);}
  });
  return value;
 }
 return {load,declare,declareConditions,revoke,open,invalidate};
}
