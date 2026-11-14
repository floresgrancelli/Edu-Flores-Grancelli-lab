import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve('efg-nutrition/pilot'),out=resolve('artifacts/notification-read-all');mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{const path=new URL(req.url,'http://localhost').pathname;if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<html class="ncc-lime-theme"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/notifications-ui.css"><style>body{background:#101c17;color:#edf0e7;font:16px Arial}#app{padding:20px}#efgInboxFull{max-width:450px}.efg-notify-popup{background:#1b2422}.efg-notify-title{color:#edf0e7}</style><div id="app"><h2>Notificaciones</h2><div id="efgInboxFull"></div></div></html>');return;}try{res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':'text/css');res.end(readFileSync(resolve(root,'.'+path)));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');
const browser=await engines[process.env.NCC_BROWSER||'chromium'].launch({headless:true,...(process.env.NCC_CHROMIUM_PATH?{executablePath:process.env.NCC_CHROMIUM_PATH}:{} )});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(async()=>{
 const {createNotificationInbox}=await import('/notifications-ui.js');
 window.q={user:'coach',rows:Array.from({length:100},(_,i)=>({id:String(i),recipient_id:'coach',created_at:'2026-11-13T12:00:00Z',is_read:false,title:'Alumno sin registro de ayer',body:'Consultá si necesitó ayuda para cargarlo.',target_tab:'home'})),writes:0,fail:false,hold:false,navigations:0};
 q.rows.push({id:'other',recipient_id:'another',created_at:'2026-11-13T12:00:00Z',is_read:false});
 const sb={from(table){if(table!=='efg_notifications')throw Error('Wrong table');let patch=null,filters=[],limit=Infinity;return {select(){return this},eq(k,v){filters.push(r=>r[k]===v);return this},lte(k,v){filters.push(r=>r[k]<=v);return this},order(){return this},limit(v){limit=v;return this},update(v){patch=v;return this},async then(done){if(patch){q.writes++;if(q.hold)await new Promise(r=>q.release=r);if(q.fail)return done({error:{message:'offline'}});}const rows=q.rows.filter(r=>filters.every(f=>f(r)));if(patch)rows.forEach(r=>Object.assign(r,patch));return done({data:structuredClone(rows.slice(0,limit)),error:null});}};}};
 q.inbox=createNotificationInbox({sb,getUserId:()=>q.user,navigate:()=>q.navigations++});await q.inbox.refresh();
 });
 const button=page.locator('#efgInboxFull [data-efg-action="read-all"]');
 assert.equal(await page.locator('#efgInboxFull [data-efg-id]').count(),80);
 await page.locator('.efg-notify-bell').click();await page.screenshot({path:resolve(out,'390-popup.png')});await page.locator('.efg-notify-bell').click();
 await page.evaluate(()=>{q.hold=true});await button.click();await page.waitForFunction(()=>q.writes===1);assert.equal(await button.isDisabled(),true);
 await page.evaluate(()=>{document.querySelector('#efgInboxFull [data-efg-action="read-all"]').click();q.rows.unshift({id:'new',recipient_id:'coach',created_at:'2099-01-01T00:00:00Z',is_read:false,title:'Nuevo aviso',body:'Llegó después',target_tab:'home'});q.hold=false;q.release();});
 await page.waitForFunction(()=>q.rows.filter(r=>r.recipient_id==='coach'&&r.is_read).length===100);
 await page.waitForFunction(()=>document.querySelector('.efg-notify-count')?.textContent==='1');
 assert.deepEqual(await page.evaluate(()=>({other:q.rows.find(r=>r.id==='other').is_read,fresh:q.rows.find(r=>r.id==='new').is_read,writes:q.writes,navigations:q.navigations,total:q.rows.length})),{other:false,fresh:false,writes:1,navigations:0,total:102});
 // Failure leaves unread state intact and enables retry.
 await page.evaluate(()=>{q.rows[0].created_at='2026-11-13T13:00:00Z';q.fail=true;});await button.click();await page.locator('#efgInboxFull [role=alert]').waitFor();assert.equal(await page.evaluate(()=>q.rows[0].is_read),false);assert.equal(await button.isDisabled(),false);
 await page.evaluate(()=>{q.fail=false});await button.click();await page.waitForFunction(()=>!document.querySelector('.efg-notify-count'));assert.equal(await button.isDisabled(),false);
 // No cross-account completion or rendering during a pending mutation.
 await page.evaluate(async()=>{q.rows[0].is_read=false;await q.inbox.refresh();q.hold=true;q.release=null;});await button.click();await page.waitForFunction(()=>!!q.release);
 await page.evaluate(async()=>{q.user='another';await q.inbox.refresh();q.hold=false;q.release();});await page.waitForFunction(()=>document.querySelector('#efgInboxFull [data-efg-id="other"]'));
 assert.equal(await page.evaluate(()=>q.rows.find(r=>r.id==='other').is_read),false);
 assert.equal(await page.locator('#efgInboxFull [data-efg-id]').count(),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('PASS: all 100 older notifications, account isolation, new arrivals, failure/retry, duplicate clicks, preserved history and zero navigation');
}finally{await browser.close();server.close();}
