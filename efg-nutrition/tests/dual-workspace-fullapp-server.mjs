// Local synthetic response adapter. It never edits release flags on disk.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
export const clientRoot=fileURLToPath(new URL('../../',import.meta.url));
const pilotPath='/efg-nutrition/pilot/pilot.js';
const fixtureBase='/efg-nutrition/tests/';
const transparent=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Y9ycAAAAASUVORK5CYII=','base64');
function once(source,before,after){assert.equal(source.split(before).length,2,'Expected exact fixture marker: '+before);return source.replace(before,after);}
export function syntheticResponse(pathname,source,{enabled=true,professionalScreens=false,professionalFixture=professionalScreens,professionalReconciliation=false}={}){
 if(professionalReconciliation)assert.ok(enabled&&professionalScreens&&professionalFixture,'Reconciliation requires the complete synthetic fixture');
 let value=source;
 // These older protocol fixtures enable their own independent candidate. The
 // separately tested installed release backend must stay outside that fixture.
 if(pathname==='/efg-nutrition/pilot/professional-workspace-release-config.mjs'){
  value=once(value,'export const PROFESSIONAL_WORKSPACE_RELEASE_ENABLED = true;','export const PROFESSIONAL_WORKSPACE_RELEASE_ENABLED = false;');
 }

 if(professionalReconciliation&&pathname==='/efg-nutrition/pilot/professional-mutation-journal.mjs')
  value=once(value,'export const PROFESSIONAL_RECONCILIATION_ENABLED = false;','export const PROFESSIONAL_RECONCILIATION_ENABLED = true;');
 if(professionalReconciliation&&pathname===fixtureBase+'professional-screens-fullapp-sdk.mjs')
  value=once(value,'const PERSIST_FICTIONAL_BACKEND = false;','const PERSIST_FICTIONAL_BACKEND = true;');
 if(pathname===pilotPath){
  value=once(value,'"https://esm.sh/@supabase/supabase-js@2.118.0"','"../tests/dual-workspace-fullapp-sdk.mjs"');
  value=value.replace(/^const SUPABASE_URL=.*;$/m,'const SUPABASE_URL=new URL("/__ncc_fixture__/supabase",location.origin).href;');
  value=value.replace(/^const SUPABASE_PUBLISHABLE=.*;$/m,'const SUPABASE_PUBLISHABLE="synthetic-only-no-auth";');
  if(professionalFixture)value=value.replace('dual-workspace-fullapp-sdk.mjs','professional-screens-fullapp-sdk.mjs').replace('new URL("/__ncc_fixture__/supabase",location.origin).href','new URL("/",location.origin).href');
  value+="\nimport {bindApp,fixture} from '../tests/dual-workspace-fullapp-sdk.mjs';\n"+
   "const syntheticHooks={state,render,refresh,refreshVisibleWorkspace,today,handleAuthStateChange,resetPrivateSession,hasPendingUnsavedEdits,frame:dualWorkspaceFrame};\n"+
   "bindApp(syntheticHooks);globalThis.__NCC_R4_FULLAPP__={...syntheticHooks,fixture};\n";
  if(professionalFixture)value=value.replaceAll("dual-workspace-fullapp-sdk.mjs","professional-screens-fullapp-sdk.mjs");
 }
 if(pathname==='/efg-nutrition/pilot/dual-workspace-candidate.mjs'&&enabled)
  value=once(value,'export const DUAL_WORKSPACE_RELEASE_ENABLED = false;','export const DUAL_WORKSPACE_RELEASE_ENABLED = true;');
 if(professionalScreens&&pathname==='/efg-nutrition/pilot/professional-screens-candidate.mjs')
  value=once(value,'export const PROFESSIONAL_SCREENS_RELEASE_ENABLED = false;','export const PROFESSIONAL_SCREENS_RELEASE_ENABLED = true;');
 if(professionalScreens&&pathname==='/efg-nutrition/pilot/professional-screens-transport.mjs'){
  value=once(value,'export const PROFESSIONAL_TRANSPORT_ENABLED = false;','export const PROFESSIONAL_TRANSPORT_ENABLED = true;');
  value=once(value,'export const PROFESSIONAL_BACKEND_EXECUTION_ENABLED = false;','export const PROFESSIONAL_BACKEND_EXECUTION_ENABLED = true;');
 }
 // Every image/font/doc URL becomes a local placeholder in this layout fixture.
 // No production resource, token or remote browser request is required.
 value=value.replace(/https?:\/\/[^\s"'<>`)\\]+/g,'/__ncc_fixture__/placeholder.png');
 value=value.replace(/(?<=[("'])\/\/[^\s"'<>`)\\]+/g,'/__ncc_fixture__/placeholder.png');
 return value;
}
export async function startSyntheticServer({enabled=true,professionalScreens=false,professionalFixture=professionalScreens,professionalReconciliation=false}={}){
 assert.equal(process.env.NCC_R4_SYNTHETIC_FULL_APP,'1','Opt in to the local synthetic fixture explicitly');
 if(professionalReconciliation)assert.ok(enabled&&professionalScreens&&professionalFixture,'Reconciliation requires the complete synthetic fixture');
 const served=[],missing=[],external=[];
 const server=createServer((request,response)=>{
  try{
   if(!/^127\.0\.0\.1:\d+$/.test(request.headers.host||''))throw Error('Loopback host required');
   const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
   const path=resolve(clientRoot,'.'+pathname),file=pathname.endsWith('/')?resolve(path,'index.html'):path;
   if(!file.startsWith(resolve(clientRoot)+sep))throw Error('Outside fixture root');
   served.push(pathname);
   const type=extname(file);
   let body,contentType;
   if(pathname==='/__ncc_fixture__/placeholder.png'||!existsSync(file)&&/\.(avif|webp|png|jpg|jpeg|svg|woff2?)$/.test(type)){
    if(pathname!='/__ncc_fixture__/placeholder.png')missing.push(pathname);
    body=transparent;contentType='image/png';
   }else{
    body=readFileSync(file);contentType=({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.avif':'image/avif'}[type]||'application/octet-stream');
    if(['.html','.js','.mjs','.css'].includes(type))body=syntheticResponse(pathname,body.toString(),{enabled,professionalScreens,professionalFixture,professionalReconciliation});
   }
   response.writeHead(200,{'Content-Type':contentType,'Cache-Control':'no-store',
    'Content-Security-Policy':"default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; object-src 'none'; form-action 'self'"});response.end(body);
  }catch(error){response.writeHead(404,{'Content-Type':'text/plain'});response.end('Synthetic fixture resource unavailable');}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {origin:'http://127.0.0.1:'+server.address().port,served,missing,external,
  close:()=>new Promise(resolve=>server.close(resolve))};
}
