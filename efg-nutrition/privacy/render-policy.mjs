import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderPolicy(policy,contact,{publish=false}={}){
 if(!contact?.authorizedPublicContact||!contact.controller||!/^\S+@\S+\.\S+$/.test(contact.email||''))throw Error('Contacto público no confirmado.');
 if(!Array.isArray(policy.sections)||!policy.sections.length)throw Error('Política incompleta.');
 if(publish&&(policy.status!=='approved'||policy.releaseBlockers?.length||!policy.effectiveDate||!contact.postalAddress))throw Error('La política sigue en revisión; no se puede publicar como vigente.');
 // Preview mode is always labelled as a proposal, even if someone changes a status flag.
 const draft=!publish;
 return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="referrer" content="same-origin"><title>Privacidad · ${esc(contact.appName)}</title>
<style>:root{font-family:system-ui,-apple-system,sans-serif;color:#233022;background:#f4f6ef}*{box-sizing:border-box}body{margin:0}header{background:#101b13;color:#eff4e8;padding:36px 24px}header>div,main,footer{max-width:820px;margin:auto}h1{font-size:clamp(32px,6vw,46px);line-height:1.15;letter-spacing:-.04em}main{padding:24px}h2{font-size:23px;line-height:1.25;margin-top:32px}p{line-height:1.75;overflow-wrap:anywhere}a{color:#345a34}header a{color:#d1dfc3}.notice{padding:18px;background:#fff1d6;border:1px solid #d1bc8d;border-radius:12px;line-height:1.6}.contact{padding:20px;background:white;border-radius:16px;border:1px solid #ced7c5;line-height:1.7}.contact strong{display:block}.contact a{overflow-wrap:anywhere}footer{padding:20px 24px 45px;font-size:13px;color:#61705c}.version{font-size:13px;letter-spacing:.03em}</style></head><body>
<header><div><span class="version">${esc(contact.appName)}</span><h1>Política de privacidad</h1><p class="version">${esc(policy.version)} · ${draft?'Propuesta en revisión, todavía no vigente':esc(policy.effectiveDate||'')}</p></div></header>
<main>${draft?'<aside class="notice">Esta propuesta incorpora los datos de contacto confirmados por Edu. Todavía requiere completar los puntos pendientes antes de publicarse como política vigente.</aside>':''}
<div class="contact"><strong>${esc(contact.controller)}</strong>Contacto de privacidad y soporte:<br><a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>${contact.postalAddress?'<p>'+esc(contact.postalAddress)+'</p>':''}</div>
${policy.sections.map(section=>'<section><h2>'+esc(section.title)+'</h2>'+section.paragraphs.map(p=>'<p>'+esc(p)+'</p>').join('')+'</section>').join('')}
<h2>Solicitar eliminación</h2><p>También podés iniciar tu pedido sin ingresar a la aplicación:</p><p><a href="mailto:${esc(contact.email)}?subject=Solicitud%20de%20eliminaci%C3%B3n%20-%20Nutrici%C3%B3n%20Con-Ciencia">Escribir al responsable de privacidad</a></p>
</main><footer>Documento de preparación para Google Play. No modifica los consentimientos ni los avisos vigentes del piloto.</footer></body></html>\n`;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const root=new URL('./',import.meta.url);
 const policy=JSON.parse(await readFile(new URL('policy-draft.json',root),'utf8'));
 const contact=JSON.parse(await readFile(new URL('contact.json',root),'utf8'));
 await mkdir(new URL('preview/',root),{recursive:true});
 await writeFile(new URL('preview/privacidad.html',root),renderPolicy(policy,contact),'utf8');
 console.log('Vista previa de privacidad generada; no vigente y no desplegada.');
}
