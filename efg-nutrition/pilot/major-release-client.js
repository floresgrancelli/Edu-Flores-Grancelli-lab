// COACH120 / UX35 major-relauch client. OFF until approved release and QA.
// The server owns the phase, version and authenticated receipt. This code
// NEVER issues automatic signout; minor PWA asset changes are silent.
export const MAJOR_RELEASE_FLOW_ENABLED=false;
const ID=/^[a-z][a-z0-9_]{6,60}$/;
const V=/^[0-9a-zA-Z._-]{2,35}$/;
const PHASES=new Set(['none','preview','reauth_required','legal','live']);
const ROLES=new Set(['student','coach','admin','personal']);
const freezeNone=()=>Object.freeze({phase:'none'});
function validRelease(data,role){
 if(!data||typeof data!=='object'||Array.isArray(data)||!PHASES.has(data.phase))
  throw Error('Estado del relanzamiento sin verificar.');
 if(data.phase==='none')return freezeNone();
 if(!ID.test(data.id||''))throw Error('Identificador de relanzamiento inválido.');
 if(data.phase==='legal')return Object.freeze({phase:'legal',id:data.id});
 if(!V.test(data.version||'')||typeof data.title!=='string'||
   data.title.trim().length<10||data.title.length>120||
   !Array.isArray(data.highlights)||data.highlights.length<1||data.highlights.length>8||
   data.highlights.some(x=>typeof x!=='string'||x.length>230||!x.trim())||
   !Array.isArray(data.roles)||data.roles.length!==4||
   new Set(data.roles).size!==4||data.roles.some(r=>!ROLES.has(r))||
   !ROLES.has(role)||!data.roles.includes(role)||
   typeof data.build!=='string'||!/^[0-9A-Za-z._-]{6,80}$/.test(data.build)||
   data.build==='unconfigured'||typeof data.published!=='boolean'||
   (data.phase==='preview'&&data.published!==false)||
   (['reauth_required','live'].includes(data.phase)&&data.published!==true))
  throw Error('Manifiesto de relanzamiento incompleto.');
 return Object.freeze({...data,roles:Object.freeze([...data.roles]),
  highlights:Object.freeze([...data.highlights])});
}
export async function readMajorRelease(sb,{profile,explicitlyEnabled=MAJOR_RELEASE_FLOW_ENABLED}={}){
 if(explicitlyEnabled!==true)return freezeNone();
 if(!ROLES.has(profile?.role)||profile?.active!==true||typeof sb?.rpc!=='function'||
    typeof sb?.auth?.getUser!=='function')throw Error('Perfil no verificado para el relanzamiento.');
 const u=await sb.auth.getUser();
 if(u.error||!u.data?.user?.id||u.data.user.id!==profile.user_id)
  throw Error('Tu sesión necesita verificarse antes de continuar.');
 const r=await sb.rpc('efg_major_release_status');
 if(r.error)throw Error('No pudimos comprobar el estado actual del relanzamiento.');
 return validRelease(r.data,profile.role);
}
export async function acknowledgeMajorRelease(sb,{profile,release,kind,
 explicitClick=false,explicitlyEnabled=MAJOR_RELEASE_FLOW_ENABLED}={}){
 if(!explicitClick||!explicitlyEnabled||!ROLES.has(profile?.role)||
    !release||!ID.test(release.id||'')||
    !['announcement_preview_read','reauth_notice_acknowledged','whats_new_seen'].includes(kind)||
    (release.phase!=='preview'&&kind==='announcement_preview_read')||
    (release.phase!=='reauth_required'&&kind==='reauth_notice_acknowledged')||
    (release.phase!=='live'&&kind==='whats_new_seen'))
  throw Error('No existe un aviso aprobado para confirmar.');
 const original=profile.user_id;
 const u=await sb.auth.getUser();
 if(u.error||u.data?.user?.id!==original)
  throw Error('La sesión cambió. Volvé a verificar antes de confirmar.');
 const ack=await sb.rpc('efg_major_release_ack',{
  p_release:release.id,p_event_kind:kind,p_explicit_click:true
 });
 if(ack.error||ack.data!==true)throw Error('No pudimos confirmar el aviso con el servidor.');
 if((await sb.auth.getUser()).data?.user?.id!==original)
  throw Error('La cuenta cambió durante la confirmación. Cerrá esta pantalla.');
 return true;
}
