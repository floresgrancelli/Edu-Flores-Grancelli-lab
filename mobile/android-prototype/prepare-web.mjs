// Generates ONLY ignored mobile resources from the existing isolated RAM fixture.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,rmSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,dirname,extname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {syntheticResponse} from '../../efg-nutrition/tests/dual-workspace-fullapp-server.mjs';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../..');
const www=resolve(here,'www');rmSync(www,{recursive:true,force:true});mkdirSync(www,{recursive:true});
function copy(path){const rel=relative(root,path),pathname='/'+rel;let body=readFileSync(path);
 if(['.html','.js','.mjs','.css'].includes(extname(path))){let text=syntheticResponse(pathname,body.toString(),{enabled:true});if(pathname==='/efg-nutrition/pilot/pilot.js')text=text.replaceAll('../tests/dual-workspace-fullapp-sdk.mjs','../tests/student-day-visual-sdk.mjs');body=Buffer.from(text);}
 const dest=resolve(www,rel);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,body);
}
function copyTree(dir){for(const e of readdirSync(dir,{withFileTypes:true})){if(e.name.startsWith('.')||['node_modules','artifacts'].includes(e.name))continue;const p=resolve(dir,e.name);if(e.isDirectory())copyTree(p);else copy(p);}}
copyTree(resolve(root,'efg-nutrition/pilot'));
// Preserve parent styles and relative paths; exclude unrelated demo entry pages.
for(const e of readdirSync(resolve(root,'efg-nutrition'),{withFileTypes:true}))if(e.isFile()&&e.name.endsWith('.css'))copy(resolve(root,'efg-nutrition',e.name));
for(const file of ['student-day-visual-sdk.mjs','dual-workspace-fullapp-sdk.mjs','dual-workspace-fixture.mjs'])copy(resolve(root,'efg-nutrition/tests',file));
const csp="default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; object-src 'none'; frame-src 'self' blob:; worker-src 'self' blob:; form-action 'none'; base-uri 'self'";
writeFileSync(resolve(www,'index.html'),`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>NCC · Prueba ficticia</title></head><body><p>Ensayo Android · sin cuentas reales</p><a href="./efg-nutrition/pilot/">Abrir prueba</a><script src="./entry.js"></script></body></html>`);
writeFileSync(resolve(www,'entry.js'),"location.replace('./efg-nutrition/pilot/');\n");
// Remove the optional iframe preview: the native entry is the actual pilot page.
rmSync(resolve(www,'mobile.html'),{force:true});
const pilot=resolve(www,'efg-nutrition/pilot/index.html');
let html=readFileSync(pilot,'utf8');assert.ok(html.includes('<head>'));
html=html.replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="${csp}"><script src="../../capacitor.js"></script>`);
html=html.replace('<title>Nutrición Con-Ciencia · Acceso privado</title>','<title>NCC · PRUEBA FICTICIA</title>');writeFileSync(pilot,html);
// Turn off the older independent dual-role experiment as in PR122's fixture.
const dual=resolve(www,'efg-nutrition/pilot/dual-workspace-candidate.mjs');
const text=readFileSync(dual,'utf8');assert.ok(text.includes('export const DUAL_WORKSPACE_RELEASE_ENABLED = true;'));
writeFileSync(dual,text.replace('export const DUAL_WORKSPACE_RELEASE_ENABLED = true;','export const DUAL_WORKSPACE_RELEASE_ENABLED = false;'));
// RAM fixture controls remain visible and explicitly fictional. No real OTP form.
const sdk=resolve(www,'efg-nutrition/tests/student-day-visual-sdk.mjs');
writeFileSync(sdk,readFileSync(sdk,'utf8').replace('app=hooks;baseBind(hooks);',`app=hooks;baseBind(hooks);
 const lockLogin=()=>{const form=document.querySelector('#app .pilot-login-form');if(form&&!form.dataset.prototypeLocked){form.dataset.prototypeLocked='1';form.innerHTML='<h2>PRUEBA ANDROID · DATOS FICTICIOS</h2><p>Elegí Alumno o Coach en los controles de ensayo. No ingreses un correo real. No hay conexión al servidor.</p>';}};
 new MutationObserver(lockLogin).observe(document.getElementById('app'),{childList:true,subtree:true});lockLogin();`));
const files=[];function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())walk(p);else files.push(p);}}walk(www);
// Scan generated executable text, not historical source docs or binary photos.
for(const path of files.filter(p=>['.js','.mjs','.html','.css'].includes(extname(p)))){
 const s=readFileSync(path,'utf8');assert.ok(!/cyjvddhimbsfipjfctsl\.supabase\.co|esm\.sh\/@supabase|efg-nutrition\.onrender\.com/.test(s),'Hosted endpoint in '+path);
}
console.log('Prepared isolated Android web assets:',files.length,'files; no hosted transport.');
writeFileSync(resolve(www,'prototype-ready.json'),JSON.stringify({mode:'fictional-only',files:files.length,backend:'none'}));
