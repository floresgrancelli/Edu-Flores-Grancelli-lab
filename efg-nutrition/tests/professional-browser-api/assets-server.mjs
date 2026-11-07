import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {loopbackOrigin,requireThat,MODULE_HASHES,JOURNAL_QUERY} from './policy.mjs';
import {verifyCandidateFiles,verifyBundle,sha256} from './verify-inputs.mjs';
export async function prepareAssets() {
  const candidate=await verifyCandidateFiles(),bundle=await verifyBundle(),assets=new Map();
  for(const [route,file] of [['/','index.html'],['/harness/browser.mjs','browser.mjs'],['/harness/policy.mjs','policy.mjs'],['/harness/loss-fetch.mjs','loss-fetch.mjs']])assets.set(route,{bytes:await readFile(new URL(file,import.meta.url)),contentType:route==='/'?'text/html; charset=utf-8':'text/javascript; charset=utf-8'});
  for(const [name,value] of Object.entries(candidate.files))assets.set('/candidate/'+name+(name==='professional-mutation-journal.mjs'?JOURNAL_QUERY:''),{bytes:value.bytes,contentType:'text/javascript; charset=utf-8'});
  assets.set('/favicon.ico',{bytes:Buffer.alloc(0),contentType:'image/x-icon'});
  assets.set('/sdk/supabase-bundle.mjs',{bytes:bundle.sdk,contentType:'text/javascript; charset=utf-8'});
  return {assets,bundleReport:bundle.report,dependencies:bundle.dependencies,candidateHashes:{...MODULE_HASHES}};
}
export async function startAssets(prepared) {
  requireThat(process.env.GITHUB_ACTIONS==='true'&&process.platform==='linux','CI_ONLY');
  requireThat(process.env.NCC_SYNTHETIC_BROWSER_API==='1','SYNTHETIC_OPT_IN_REQUIRED');
  let backendOrigin=null,origin=null;
  const server=createServer((req,res)=>{
    if(!origin||!backendOrigin||req.headers.host!==new URL(origin).host||req.method!=='GET'||!prepared.assets.has(req.url)) {res.writeHead(404,{'content-type':'text/plain'});res.end('ASSET_REJECTED');return;}
    const a=prepared.assets.get(req.url);
    res.writeHead(200,{'content-type':a.contentType,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer',
      'content-security-policy':`default-src 'none'; script-src 'self'; connect-src ${backendOrigin}; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`});res.end(a.bytes);
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  origin='http://127.0.0.1:'+server.address().port;
  return {origin,setBackendOrigin(value){requireThat(!backendOrigin&&value!==origin,'DISTINCT_API_ORIGIN_REQUIRED');backendOrigin=loopbackOrigin(value);},
    close:()=>new Promise((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeAllConnections();})};
}
