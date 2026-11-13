// Standalone review artifact only. The production pilot retains native ESM.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pilot=path.join(root,'pilot'),sources={},seen=new Set();
function collect(name){
  if(seen.has(name))return;seen.add(name);
  if(path.basename(name)!==name||!name.endsWith('.js'))throw Error('Invalid module path');
  const code=readFileSync(path.join(pilot,name),'utf8');sources[name]=code;
  for(const match of code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)){
    if(!match[1].startsWith('./'))throw Error('Remote module forbidden in offline review');
    collect(match[1].slice(2).split('?')[0]);
  }
}
collect('self-management-preview.js');
const catalog=JSON.parse(readFileSync(path.join(root,'catalog/guide-catalog.json'),'utf8'));
const literal=x=>JSON.stringify(x).replaceAll('<','\\u003c');
const script=`globalThis.NCC_SELF_PREVIEW_CATALOG=${literal(catalog)};
const moduleSources=${literal(sources)},moduleUrls=new Map();
function link(name){if(moduleUrls.has(name))return moduleUrls.get(name);
const code=moduleSources[name].replace(/\\bfrom\\s+(['"])([^'"]+)\\1/g,(_,q,ref)=>'from '+q+link(ref.slice(2).split('?')[0])+q);
const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));moduleUrls.set(name,url);return url;}
await import(link('self-management-preview.js'));`;
let html=readFileSync(path.join(pilot,'autogestion-prueba.html'),'utf8');
html=html.replace('<script type="module" src="./self-management-preview.js"></script>',
  ()=>'<script type="module">'+script+'</script>');
const out=process.argv[2]||path.join(root,'docs/play-store/Autogestion_Prueba_Interactiva.html');
mkdirSync(path.dirname(out),{recursive:true});writeFileSync(out,html);
console.log(JSON.stringify({output:out,modules:seen.size,bytes:Buffer.byteLength(html)}));
