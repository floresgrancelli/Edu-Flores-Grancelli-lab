// Exercise the inherited HTTP callback with fake request/response/files only.
// No listen(), network, browser import or browser launch occurs in this test.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const fixtures=[
 {name:'guide',file:'guide-preview-mobile.mjs',start:'const server=createServer(',extraTypes:[]},
 {name:'pilot privacy',file:'coach-pilot-privacy-visual-qa.mjs',start:'const types=',extraTypes:[['asset.svg','image/svg+xml'],['asset.avif','image/avif']]}
];
function request(url,fixture,script){
 const start=script.indexOf(fixture.start),end=script.indexOf('await new Promise(r=>server.listen',start);
 assert.ok(start>=0&&end>start,'Exact inherited server callback boundaries');
 let handler,status,headers,body;
 vm.runInNewContext(script.slice(start,end),{
  createServer:callback=>{handler=callback;return {};},base:resolve('synthetic-fixture-root'),
  URL,resolve,extname,assert,Buffer,readFileSync:()=>Buffer.from('export const synthetic=true;')
 });
 handler({url},{writeHead(value,meta){status=value;headers=meta;},end(value){body=value;}});
 return {status,headers,body};
}
function requireJavascript(url,fixture,script){
 const response=request(url,fixture,script);assert.equal(response.status,200);
 assert.equal(response.headers['content-type'],'text/javascript','Browser module must have a JavaScript MIME type: '+url);
 return response;
}
for(const fixture of fixtures){
 const source=readFileSync(new URL('./'+fixture.file,import.meta.url),'utf8');
test('inherited '+fixture.name+' fixture serves all dual .mjs modules as JavaScript, including version query',()=>{
 for(const name of ['bootstrap','candidate','frame','integration','panel']){
  for(const suffix of ['', '?v=ncc-dual-workspace-r4-20261106']){
   const response=requireJavascript('/efg-nutrition/pilot/dual-workspace-'+name+'.mjs'+suffix,fixture,source);
   assert.equal(response.body.toString(),'export const synthetic=true;');
  }
 }
});
test(fixture.name+': existing JS/CSS/HTML MIME and unknown binary fallback remain unchanged',()=>{
 for(const [file,mime]of [['fixture.js','text/javascript'],['pilot.css','text/css'],['index.html','text/html'],['asset.bin','application/octet-stream'],...fixture.extraTypes]){
  const response=request('/efg-nutrition/pilot/'+file,fixture,source);assert.equal(response.status,200);assert.equal(response.headers['content-type'],mime);
 }
});
test(fixture.name+': removing only the .mjs mapping recreates and detects the boot regression',()=>{
 const marker="'.mjs':'text/javascript',";assert.equal(source.split(marker).length,2);
 const original=source.replace(marker,'');
 assert.equal(request('/efg-nutrition/pilot/dual-workspace-frame.mjs',fixture,original).headers['content-type'],'application/octet-stream');
 assert.throws(()=>requireJavascript('/efg-nutrition/pilot/dual-workspace-frame.mjs',fixture,original),/JavaScript MIME/);
});
}
