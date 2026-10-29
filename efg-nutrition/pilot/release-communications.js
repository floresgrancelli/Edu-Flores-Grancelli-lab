// EFG Nutrition Pro · major-release communications prototype (OFF by default).
// Pure rendering / contract helpers. No database writes, mail, sign-out or legal consent.
export const RELEASE_COMMUNICATIONS_ENABLED=false;
const esc=(value)=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const roleCopy={admin:"Organizá tu plataforma y acompañá a tu comunidad.",coach:"Más claridad para acompañar a cada alumno.",student:"Tus hábitos, tu historia y tu acompañamiento en un mismo lugar.",personal:"Un espacio para organizar tus hábitos a tu ritmo."};
const ROLES=new Set(["admin","coach","student","personal"]);
function valid(manifest){
 if(!manifest||!/^[a-z0-9][a-z0-9._-]{2,40}$/i.test(manifest.id||"")||
    !/^[0-9A-Za-z._-]{2,35}$/.test(manifest.version||"")||
    typeof manifest.title!=="string"||!manifest.title.trim()||manifest.title.length>120||
    !["preview","reauth_required","live"].includes(manifest.phase)||
    !Array.isArray(manifest.highlights)||manifest.highlights.length<1||manifest.highlights.length>8||
    manifest.highlights.some(h=>typeof h!=="string"||!h.trim()||h.length>230)||
    !Array.isArray(manifest.roles)||manifest.roles.length!==4||
    new Set(manifest.roles).size!==4||manifest.roles.some(r=>!ROLES.has(r)))
  throw Error("Manifiesto de actualización incompleto o incorrecto.");
 return manifest;
}
export function releaseVisibleTo(manifest,role){
 const m=valid(manifest);
 if(!ROLES.has(role))return false;
 return m.roles.includes(role);
}
export function renderMajorReleaseAnnouncement(manifest,role){
 if(!releaseVisibleTo(manifest,role))return "";
 const m=valid(manifest);
 if(!["preview","reauth_required"].includes(m.phase))return "";
 return '<section class="card efg-release-announcement" aria-labelledby="efgUpcomingReleaseTitle">'+
  '<span class="eyebrow">EFG NUTRITION PRO · '+(m.phase==='preview'?'PRÓXIMAMENTE':'YA DISPONIBLE')+'</span>'+
  '<h2 id="efgUpcomingReleaseTitle">'+esc(m.title)+'</h2>'+
  '<p>'+esc(m.phase==='preview'?'Estamos preparando una nueva etapa para acompañarte cada día.':'La nueva versión está disponible. Guardá tus cambios antes de volver a ingresar.')+'</p>'+
  '<p>'+esc(roleCopy[role])+'</p>'+
  '<ul>'+m.highlights.map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul>'+
  '<p class="pilot-hint">Para completar el cambio tendrás que volver a iniciar sesión. Al regresar, podrás revisar los documentos legales vigentes y aceptar lo que corresponda por separado.</p>'+
  '<p class="pilot-hint">Leer este aviso no constituye aceptación de Términos ni consentimiento para compartir información de salud.</p>'+
  (m.phase==="preview"
   ?'<button class="btn" type="button" data-act="ackReleasePreview" data-release="'+esc(m.id)+'">Entendido</button>'
   :'<button class="btn" type="button" data-act="ackReleaseAndSignOut" data-release="'+esc(m.id)+'">Entendido, cerrar sesión</button>')+
  '<button class="btn small light" type="button" data-act="releaseHelp">Ayuda y consultas</button></section>';
}
export function releaseAcknowledgment(manifest,role){
 const m=valid(manifest);
 if(!["preview","reauth_required"].includes(m.phase)||!releaseVisibleTo(m,role))throw Error("No hay comunicación activa para este perfil.");
 // Only server-side auth decides who owns the acknowledgment. NOT a contract signature.
 return {release_id:m.id,acknowledgment_kind:m.phase==="preview"?"announcement_preview_read":"reauth_notice_acknowledged"};
}
export function renderWhatsNew(manifest,role,seenVersions=[]){
 if(!releaseVisibleTo(manifest,role))return "";
 const m=valid(manifest);
 if(m.phase!=="live"||seenVersions.includes(m.version))return "";
 return '<section class="card efg-release-whatsnew" aria-labelledby="efgReleaseWhatsNewTitle">'+
  '<span class="eyebrow">NUEVA VERSIÓN · '+esc(m.version)+'</span>'+
  '<h2 id="efgReleaseWhatsNewTitle">¡Bienvenido a la nueva versión de EFG Nutrition Pro!</h2>'+
  '<p>'+esc(roleCopy[role])+'</p><p>Novedades de EFG Nutrition Pro: conocé las mejoras que ya están disponibles.</p>'+
  '<ul>'+m.highlights.map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul>'+
  '<button class="btn" type="button" data-act="markReleaseSeen" data-release="'+esc(m.id)+'">Comenzar</button></section>';
}
export function seenVersionRequest(manifest,role){
 const m=valid(manifest);
 if(m.phase!=="live"||!releaseVisibleTo(m,role))throw Error("Esta versión no está publicada.");
 return {release_id:m.id,view_kind:"whats_new_seen"};
}
