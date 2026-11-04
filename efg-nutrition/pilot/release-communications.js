// Nutrición Con-Ciencia · major-release communications prototype (OFF by default).
// Pure rendering / contract helpers. No database writes, mail, sign-out or legal consent.
export const RELEASE_COMMUNICATIONS_ENABLED=false;
const esc=(value)=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const roleCopy={admin:"Organizá tu plataforma y acompañá a tu comunidad.",coach:"Más claridad para acompañar a cada alumno.",student:"Tus hábitos, tu historia y tu acompañamiento en un mismo lugar.",personal:"Un espacio para organizar tus hábitos a tu ritmo."};
const ROLES=new Set(["admin","coach","student","personal"]);
const launchArtwork="<div class=\"efg-release-art\" aria-hidden=\"true\"><div class=\"efg-serotonin-stage\"><img class=\"efg-serotonin-mark\" src=\"./assets/serotonina-acuarela.avif\" alt=\"\" width=\"78\" height=\"47\"></div><svg viewBox=\"0 0 240 176\" width=\"240\" height=\"176\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\">\n<ellipse cx=\"116\" cy=\"150\" rx=\"91\" ry=\"13\" fill=\"#27475b\" opacity=\".12\"/>\n<circle cx=\"49\" cy=\"51\" r=\"29\" fill=\"#f2a3b0\"/><circle cx=\"199\" cy=\"39\" r=\"21\" fill=\"#b6b4fa\"/>\n<path d=\"M84 83c-21-22-11-48 13-58 10 29-3 49-13 58\" fill=\"#78b8a0\"/>\n<path d=\"M126 78c-1-37 19-52 48-53-2 34-20 51-48 53\" fill=\"#439d84\"/>\n<path d=\"M98 90c-11-18-3-37 15-45 10 20 4 36-15 45\" fill=\"#b7cf6d\"/>\n<path d=\"M94 93c7-12 31-16 44-2l-8 38-35-3Z\" fill=\"#e9c980\"/>\n<circle cx=\"75\" cy=\"102\" r=\"16\" fill=\"#f39c65\"/><circle cx=\"156\" cy=\"102\" r=\"18\" fill=\"#de7186\"/>\n<path d=\"M151 86c-2-10 3-16 11-20\" fill=\"none\" stroke=\"#408a73\" stroke-width=\"5\" stroke-linecap=\"round\"/>\n<path d=\"M48 110c18 28 41 39 68 39 38 0 69-17 82-39Z\" fill=\"#365875\"/>\n<path d=\"M48 110c38 17 116 17 150 0\" fill=\"none\" stroke=\"#d8e7ed\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n<path d=\"M68 138c26 11 68 14 93 2\" fill=\"none\" stroke=\"#86b4ba\" stroke-width=\"4\" stroke-linecap=\"round\"/>\n<path d=\"m192 82 6-15 6 15 15 6-15 6-6 15-6-15-15-6Z\" fill=\"#f1d383\"/>\n</svg></div>";
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
 return '<section class="card efg-release-announcement" aria-labelledby="efgUpcomingReleaseTitle">'+launchArtwork+
  '<span class="eyebrow">Nutrición Con-Ciencia · '+(m.phase==='preview'?'PRÓXIMAMENTE':'YA DISPONIBLE')+'</span>'+
  '<h2 id="efgUpcomingReleaseTitle">'+esc(m.title)+'</h2>'+
  '<p>'+esc(m.phase==='preview'?'Estamos preparando una nueva etapa para acompañarte cada día.':'La nueva versión está disponible. Guardá tus cambios antes de volver a ingresar.')+'</p>'+
  '<p>'+esc(roleCopy[role])+'</p>'+
  '<ul class="efg-release-highlights">'+m.highlights.map(t=>'<li><span aria-hidden="true">✦</span>'+esc(t)+'</li>').join("")+'</ul>'+
  '<p class="pilot-hint">'+esc(m.phase==='preview'
   ?'Todavía no es necesario cerrar sesión. Te avisaremos cuando la Gran Actualización esté realmente publicada.'
   :'Al confirmar el aviso de esta versión mayor, cerrás la sesión solo de este dispositivo. Al volver a ingresar con código podrás revisar y aceptar los documentos legales vigentes por separado.')+'</p>'+
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
 // Unknown/corrupt receipt data is not proof that this announcement is unseen.
 // Fail closed instead of throwing (or treating a string as a version list).
 if(m.phase!=="live"||!Array.isArray(seenVersions)||seenVersions.includes(m.version))return "";
 return '<section class="card efg-release-whatsnew" aria-labelledby="efgReleaseWhatsNewTitle">'+launchArtwork+
  '<span class="eyebrow">NUEVA VERSIÓN · '+esc(m.version)+'</span>'+
  '<h2 id="efgReleaseWhatsNewTitle">¡Bienvenido a la nueva versión de Nutrición Con-Ciencia!</h2>'+
  '<p>'+esc(roleCopy[role])+'</p><p>Novedades de Nutrición Con-Ciencia: conocé las mejoras que ya están disponibles.</p>'+
  '<ul class="efg-release-highlights">'+m.highlights.map(t=>'<li><span aria-hidden="true">✦</span>'+esc(t)+'</li>').join("")+'</ul>'+
  '<button class="btn" type="button" data-act="markReleaseSeen" data-release="'+esc(m.id)+'">Comenzar</button></section>';
}
export function seenVersionRequest(manifest,role){
 const m=valid(manifest);
 if(m.phase!=="live"||!releaseVisibleTo(m,role))throw Error("Esta versión no está publicada.");
 return {release_id:m.id,view_kind:"whats_new_seen"};
}
