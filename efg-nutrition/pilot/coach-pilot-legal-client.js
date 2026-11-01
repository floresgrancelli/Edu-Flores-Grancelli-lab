// COACH117: explicit, versioned terms & privacy for Coach pilot.
// Documents come ONLY from active server publications; no user is deemed
// accepted until two separate signed server receipts are read back.
// IMPORTANT: these legal receipts are NOT medical-data authorization.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH=/^[a-f0-9]{64}$/i;
// Defense in depth: a mistakenly marked current document must not turn a
// clearly labelled internal draft into a user acceptance flow.
const UNAPPROVED_LEGAL=/\[(?:PENDIENTE|POR COMPLETAR)[^\]]*\]|BORRADOR\s+NO\s+PUBLICAR|NO\s+EN\s+VIGENCIA|ESTADO:\s*NO\s+APROBADO/i;
function reviewedBody(body){
 return typeof body==='string'&&body.trim().length>=300&&!UNAPPROVED_LEGAL.test(body);
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TYPES=['terms','privacy'];
function validStatus(rows){
 return Array.isArray(rows)&&rows.length===2&&
  TYPES.every(kind=>rows.filter(x=>x?.kind===kind).length===1)&&
  rows.every(x=>UUID.test(x.document_id||'')&&HASH.test(x.sha256||'')&&
   typeof x.version==='string'&&x.version.length>=5&&typeof x.accepted==='boolean');
}
export async function loadCoachPilotLegal(sb,{profile}={}){
 if(typeof sb?.auth?.getUser!=='function'||typeof sb?.rpc!=='function'||
    typeof sb?.from!=='function')throw Error('Servicio legal no disponible.');
 const user=await sb.auth.getUser(),id=user?.data?.user?.id;
 if(user?.error||!UUID.test(id||'')||profile?.user_id!==id||
    profile?.active!==true||!['student','coach','admin','personal'].includes(profile?.role))
  throw Error('No pudimos verificar tu cuenta antes de mostrar documentos legales.');
 const sr=await sb.rpc('efg_legal_current_status');
 if(sr.error)throw Error('No pudimos consultar la versión vigente de los documentos.');
 if(!validStatus(sr.data))return Object.freeze({ready:false,documents:[],reason:
  'Los Términos y la Política de Privacidad están en preparación. Todavía no se puede aceptar esta versión.'});
 const status=sr.data;
 const dr=await sb.from('efg_legal_documents')
  .select('id,kind,version,body,sha256,is_current,published_at')
  .in('id',status.map(x=>x.document_id)).limit(2);
 if(dr.error||!Array.isArray(dr.data)||dr.data.length!==2)
  throw Error('No pudimos comprobar el contenido completo de los documentos.');
 const after=await sb.auth.getUser();
 if(after?.error||after?.data?.user?.id!==id)
  throw Error('La sesión cambió mientras verificábamos los documentos legales. Volvé a ingresar.');
 const docs=TYPES.map(kind=>{
  const st=status.find(x=>x.kind===kind),doc=dr.data.find(x=>x.id===st.document_id);
  if(!doc||doc.kind!==kind||doc.version!==st.version||doc.sha256!==st.sha256||
    doc.is_current!==true||!doc.published_at||typeof doc.body!=='string'||
    !reviewedBody(doc.body))throw Error('Las versiones legales no coinciden o todavía son borradores no aprobados.');
  return Object.freeze({...doc,accepted:st.accepted});
 });
 return Object.freeze({ready:true,documents:Object.freeze(docs),
  accepted:docs.every(x=>x.accepted===true)});
}
export function renderCoachPilotLegal(snapshot){
 if(!snapshot?.ready)return '<section class="card efg-coach-legal" role="alert">'+
  '<h2>Documentos en preparación</h2><p>'+esc(snapshot?.reason||'No están disponibles las versiones actuales de los documentos.')+'</p>'+
  '<p>Tu historial y tus alimentos registrados permanecen guardados.</p>'+
  '<button class="btn light" type="button" data-act="retry">Volver a consultar</button></section>';
 const docs=snapshot.documents;
 if(!Array.isArray(docs)||docs.length!==2||!TYPES.every(k=>docs.some(x=>x.kind===k)))
  throw Error('No se encontraron dos documentos legales vigentes.');
 return '<section class="card efg-coach-legal" aria-labelledby="coachLegalTitle">'+
  '<span class="eyebrow">NUTRICIÓN CON-CIENCIA · NUEVO INGRESO</span>'+
  '<h2 id="coachLegalTitle">Términos y privacidad</h2>'+
  '<p>Leé los dos documentos actuales. Se confirman por separado, sin casillas premarcadas. Esto no autoriza el tratamiento de datos de salud, que requiere un permiso independiente.</p>'+
  '<div class="pilot-form">'+docs.map(doc=>{
   const isTerms=doc.kind==='terms',label=isTerms?'Términos y Condiciones':'Política de Privacidad';
   return '<article class="efg-legal-document"><details><summary>'+label+' · versión '+esc(doc.version)+'</summary>'+
    '<div class="efg-legal-body">'+esc(doc.body)+'</div></details>'+
    '<label class="efg-legal-confirm"><input type="checkbox" id="efgCoachPilotLegal_'+doc.kind+'"'+
    (doc.accepted?' disabled':'')+'> '+(doc.accepted?'Ya aceptaste esta versión de '+label:
     'Leí y acepto expresamente '+label)+'</label></article>';
  }).join('')+
  '<button type="button" class="btn block" data-act="acceptCoachPilotLegal">'+
  'Confirmar los dos documentos</button></div>'+
  '<p class="pilot-hint">La participación del piloto y el envío de la ficha al coach son autorizaciones adicionales y separadas.</p></section>';
}
export function readCoachPilotLegalSelections(doc,snapshot){
 if(!snapshot?.ready||!Array.isArray(snapshot.documents)||snapshot.documents.length!==2)
  throw Error('No hay documentos legales actuales listos para aceptar.');
 const terms=snapshot.documents.find(x=>x.kind==='terms');
 const privacy=snapshot.documents.find(x=>x.kind==='privacy');
 if(!UUID.test(terms?.id||'')||!UUID.test(privacy?.id||''))
  throw Error('Identificación legal inválida.');
 const checked={terms:terms.accepted===true||doc?.getElementById?.('efgCoachPilotLegal_terms')?.checked===true,
  privacy:privacy.accepted===true||doc?.getElementById?.('efgCoachPilotLegal_privacy')?.checked===true};
 if(!checked.terms||!checked.privacy)
  throw Error('Confirmá ambas casillas por separado luego de leer los documentos.');
 return Object.freeze({p_terms_id:terms.id,p_privacy_id:privacy.id,
  p_terms_checked:checked.terms,p_privacy_checked:checked.privacy});
}
export async function submitCoachPilotLegal(sb,snapshot,selection,{explicitSubmit=false,profile}={}){
 if(!explicitSubmit||!snapshot?.ready||typeof sb?.rpc!=='function'||
   !selection?.p_terms_checked||!selection?.p_privacy_checked)
  throw Error('La aceptación legal requiere confirmar expresamente ambos documentos.');
 // The IDs sent to the signed RPC must be EXACTLY the two documents displayed
 // to this user; do not accept an accidental stale/mixed or forged selection.
 const docs=snapshot.documents;
 const terms=Array.isArray(docs)?docs.find(x=>x.kind==='terms'):null;
 const privacy=Array.isArray(docs)?docs.find(x=>x.kind==='privacy'):null;
 if(!Array.isArray(docs)||docs.length!==2||
   !UUID.test(terms?.id||'')||!UUID.test(privacy?.id||'')||
   selection.p_terms_id!==terms.id||selection.p_privacy_id!==privacy.id)
  throw Error('Las versiones legales seleccionadas no coinciden con las mostradas. Volvé a revisarlas.');
 const user=await sb.auth.getUser();
 if(user?.error||!UUID.test(user?.data?.user?.id||'')||
   profile?.user_id!==user.data.user.id||profile?.active!==true||
   !['student','coach','admin','personal'].includes(profile?.role))
  throw Error('La sesión ya no está verificada.');
 const response=await sb.rpc('efg_accept_current_legal',selection);
 if(response.error||response.data!==true)
  throw Error('No se pudo registrar la aceptación de las dos versiones vigentes.');
 const verified=await loadCoachPilotLegal(sb,{profile});
 if(!verified.ready||!verified.accepted||
   !TYPES.every(kind=>verified.documents.find(x=>x.kind===kind)?.id===
   snapshot.documents.find(x=>x.kind===kind)?.id))
  throw Error('Las versiones cambiaron o no se confirmó su aceptación. Volvé a revisarlas.');
 return verified;
}
