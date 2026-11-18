import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium,webkit} from 'playwright';

const root = resolve(import.meta.dirname,'..');
const output = 'artifacts/activity-mobile';
const mime = {
 '.js':'text/javascript','.mjs':'text/javascript','.json':'application/json',
 '.css':'text/css','.webp':'image/webp',
};
const fixture = `<!doctype html><html lang="es"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/pilot/activity-atlas-preview.css">
<style>body{margin:0;background:#111b16;color:#f0e7d0}</style>
<main class="pilot-main"></main>
<script type="module">
import {activityAtlasHTML,mountActivityAtlas,mountActivityReleaseNotice} from '/pilot/activity-atlas-preview.js';
let noticeOwner = 'fixture-a';
let state = 'no_data_or_permission';
const source = 'apple_health';
const bridge = {postMessage:async ()=>state==='available'?
 {status:state,source,steps:0,activeKcal:84,measuredAt:new Date().toISOString()} : {status:state}};
window.webkit ??= {messageHandlers:{}};
window.webkit.messageHandlers.nccActivity = bridge;
const db = {
 from:()=>({select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:null})})})})}),
 rpc:async(name,payload)=>{
  if(name!=='efg_sync_device_activity'||payload.p_expected_owner!=='fixture-a') throw new Error('wrong scope');
  return {data:{steps:payload.p_steps,active_kcal:payload.p_active_kcal,source}};
 },
};
const main = document.querySelector('main');
function render() {
 main.innerHTML = activityAtlasHTML();
 mountActivityReleaseNotice(document.body,{owner:noticeOwner});
 mountActivityAtlas(document.body,{db,owner:'fixture-a',isCurrent:()=>true,enabled:true});
}
window.render = render;
window.switchNoticeAccount = ()=>{noticeOwner='fixture-b';render();};
window.setBridgeStatus = next=>{state=next;};
main.addEventListener('click',event=>{if(event.target.matches('[data-tab=sport]')) render();});
render();
</script></html>`;

const server = createServer(async (request,response)=>{
 const path = new URL(request.url,'http://127.0.0.1').pathname;
 try {
  if (path==='/') {
   response.writeHead(200,{'content-type':'text/html; charset=utf-8'});
   return response.end(fixture);
  }
  const file = resolve(root,'.'+path);
  if (!file.startsWith(root+'/')) throw new Error('outside fixture');
  const data = await readFile(file);
  response.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream'});
  response.end(data);
 } catch {
  response.writeHead(404).end();
 }
});
await mkdir(output,{recursive:true});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin = 'http://127.0.0.1:'+server.address().port;
try {
 for (const [name,engine] of Object.entries({chromium,webkit})) {
  const browser = await engine.launch();
  try {
   for (const width of [320,390]) {
    const page = await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
    const errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin);
    await page.getByRole('heading',{name:'Novedades de Mi Actividad'}).waitFor();
    await page.getByRole('button',{name:'Cerrar',exact:true}).click();
    await page.evaluate(()=>window.render());
    assert.equal(await page.locator('.ncc-activity-release').count(),0);
    await page.reload();
    await page.getByRole('button',{name:'Conectar actividad del dispositivo'}).waitFor();
    assert.equal(await page.locator('.ncc-activity-release').count(),0);
    await page.evaluate(()=>window.switchNoticeAccount());
    await page.getByRole('button',{name:'Ir a Mi Actividad'}).click();
    assert.equal(await page.locator('.ncc-activity-release').count(),0);
    const connect = page.getByRole('button',{name:'Conectar actividad del dispositivo'});
    await connect.click();
    await page.getByText('Sin datos disponibles. Revisá el acceso en Apple Salud.',{exact:true}).waitFor();
    assert.equal(await page.locator('[data-atlas-steps]').innerText(),'—');
    await page.evaluate(()=>window.setBridgeStatus('available'));
    await connect.click();
    await page.getByText('84 kcal',{exact:true}).waitFor();
    assert.equal(await page.locator('[data-atlas-steps]').innerText(),'0');
    await page.locator('.ncc-scent-female figure').first().waitFor();
    await page.getByText('Hombre',{exact:true}).click();
    await page.locator('.ncc-scent-male figure').first().waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:output+'/'+name+'-'+width+'.png',fullPage:true});
    await page.close();
   }
  } finally { await browser.close(); }
 }
} finally { server.close(); }
