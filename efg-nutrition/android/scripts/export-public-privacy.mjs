// Export the SAME reviewed privacy version used by onboarding to a public HTML page.
// Reads a JSON export, never backend credentials. Refuses drafts or modified content.
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function exportPrivacy(doc){
 if(doc?.kind!=='privacy'||doc.is_current!==true||!doc.version||
    !Number.isFinite(Date.parse(doc.published_at||''))||typeof doc.body!=='string'||doc.body.trim().length<300)
   throw Error('Se requiere la versión vigente y publicada de privacidad.');
 const digest=createHash('sha256').update(doc.body,'utf8').digest('hex');
 if(doc.sha256!==digest)throw Error('El contenido no coincide con la huella de la versión publicada.');
 if(/BORRADOR|NO VIGENTE|NO PUBLICAR|\[(?:PENDIENTE|POR COMPLETAR|EMAIL|PERSONA|CANAL|TABLA|VERIFICAR)[^\]]*\]/i.test(doc.body))
   throw Error('El texto contiene marcas de borrador o datos incompletos.');
 const paragraphs=doc.body.split(/\n\s*\n/).map(block=>'<p>'+esc(block).replace(/\n/g,'<br>')+'</p>').join('\n');
 return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Privacidad · Nutrición Con-Ciencia</title>
<style>body{margin:0;background:#f6f8f3;color:#172015;font:16px/1.75 system-ui,sans-serif}main{max-width:780px;margin:auto;padding:35px 24px}h1{line-height:1.2}p{overflow-wrap:anywhere}a{color:#36512c}.version{color:#596653;font-size:14px}</style></head>
<body><main><a href="./">Nutrición Con-Ciencia</a><h1>Política de privacidad</h1><p class="version">Versión ${esc(doc.version)} · Publicada ${esc(doc.published_at)}</p>
${paragraphs}
<p><a href="./eliminar-cuenta.html">Solicitar eliminación de mi cuenta y mis datos</a></p></main></body></html>\n`;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Uso: node scripts/export-public-privacy.mjs documento.json privacidad.html');
 await writeFile(output,exportPrivacy(JSON.parse(await readFile(input,'utf8'))),'utf8');
}
