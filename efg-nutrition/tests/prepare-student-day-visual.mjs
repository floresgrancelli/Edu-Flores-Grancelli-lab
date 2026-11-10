// Build a separate local preview of the FULL PWA using the existing synthetic adapter.
// No changes to source flags, real SDK, auth, hosted services or production data.
import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import {resolve,relative,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {syntheticResponse} from './dual-workspace-fullapp-server.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const destination=resolve(process.argv[2]||'');
if(!process.argv[2]||!destination.startsWith('/workspace/')||destination===root)throw Error('Explicit separate /workspace preview destination required');
const dist=resolve(destination,'dist');mkdirSync(dist,{recursive:true});
function walk(folder){for(const item of readdirSync(folder,{withFileTypes:true})){if(item.name.startsWith('.')||['node_modules','artifacts'].includes(item.name))continue;const path=resolve(folder,item.name);if(item.isDirectory())walk(path);else{
 const rel=relative(root,path),pathname='/'+rel,type=extname(path);let body=readFileSync(path);
 if(['.html','.js','.mjs','.css'].includes(type)){
  let text=syntheticResponse(pathname,body.toString(),{enabled:true});
  if(pathname==='/efg-nutrition/pilot/pilot.js')text=text.replaceAll('../tests/dual-workspace-fullapp-sdk.mjs','../tests/student-day-visual-sdk.mjs');
  body=Buffer.from(text);
 }
 const target=resolve(dist,rel);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,body);
}}}
walk(resolve(root,'efg-nutrition/pilot'));
for(const file of readdirSync(resolve(root,'efg-nutrition'))){if(/\.(js|css|html|webmanifest)$/.test(file))writeFileSync(resolve(dist,'efg-nutrition',file),readFileSync(resolve(root,'efg-nutrition',file)));}
mkdirSync(resolve(dist,'efg-nutrition/tests'),{recursive:true});
for(const file of ['student-day-visual-sdk.mjs','dual-workspace-fullapp-sdk.mjs','dual-workspace-fixture.mjs']){
 writeFileSync(resolve(dist,'efg-nutrition/tests',file),readFileSync(resolve(root,'efg-nutrition/tests',file)));
}
writeFileSync(resolve(dist,'index.html'),'<!doctype html><html lang="es"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./efg-nutrition/pilot/"><a href="./efg-nutrition/pilot/">Abrir ensayo ficticio de la candidata</a></html>');
mkdirSync(resolve(destination,'.openai'),{recursive:true});writeFileSync(resolve(destination,'.openai/hosting.json'),JSON.stringify({static:{directory:'dist'}}));
console.log('Prepared isolated full-app synthetic preview at '+destination);

writeFileSync(resolve(dist,'mobile.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><title>Mi Día integrado · revisión móvil</title><style>body{background:#080909;color:#d4dbcf;font:12px system-ui;margin:0}header{text-align:center;padding:12px}select{padding:6px;background:#26301c;color:#d7ff3f}iframe{display:block;margin:auto;border:1px solid #414b34;border-radius:10px}</style><header>Ensayo de app completa · datos ficticios <label>Ancho <select><option>320</option><option selected>390</option><option>768</option><option>1280</option></select></label></header><iframe title="App completa ficticia" src="/efg-nutrition/pilot/" width="390" height="810"></iframe><script>document.querySelector('select').onchange=e=>document.querySelector('iframe').width=e.target.value</script></html>`);
