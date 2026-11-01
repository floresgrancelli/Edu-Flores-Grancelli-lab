// Synthetic fixture ONLY. Explicit runner opt-in; never runs on this Mac.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
assert.equal(process.env.GITHUB_ACTIONS,'true','Real Actions runner required');
assert.equal(process.env.EFG_PRIVATE_GUIDE_QA,'1','Explicit private fixture opt-in required');
const {chromium}=await import('playwright');
const root=resolve('efg-nutrition');
const allowed=new Set(['.html','.js','.mjs']);
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!path.startsWith(root+sep)||!allowed.has(extname(path)))throw Error();
  res.writeHead(200,{'content-type':extname(path)==='.html'?'text/html':'text/javascript'});
  res.end(await readFile(path));
 }catch{res.writeHead(404);res.end('Fixture unavailable');}
});
let browser,activePage;
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch();await mkdir('artifacts/coach-intake-guide-private',{recursive:true});
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();activePage=page;const errors=[];page.on('pageerror',()=>errors.push('pageerror'));
  await page.goto(origin+'/tests/coach-guide-intake-preview.html');
  await page.locator('#preferred').selectOption('preferred');
  await page.locator('#disliked').selectOption('fresh_a');
  await page.locator('#gluten').check();await page.locator('#share').check();
  await page.getByRole('button',{name:'Compartir ficha ficticia',exact:true}).click();
  await page.locator('#coach').click();
  const editor=page.locator('#editor');
  await editor.getByText('Borrador pendiente de aprobación del coach.',{exact:true}).waitFor();
  assert.equal(await editor.locator('section').count(),5);
  assert.equal(await editor.locator('section').getByText(/fresh_a/).count(),0);
  await editor.getByRole('button',{name:'Editar borrador',exact:true}).click();
  const qty=editor.locator('[data-edit-row="desayuno:0"] input');
  await qty.fill(String(Number(await qty.inputValue())+10));await qty.press('Tab');
  await editor.getByRole('button',{name:'Conservar borrador editado'}).click();
  assert.equal(await editor.locator('[data-draft-origin="edited_draft"]').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`artifacts/coach-intake-guide-private/prepared-${width}.png`,fullPage:true});
  // A later submitted intake discards an edited draft; it cannot keep its approval/state.
  await page.locator('#disliked').selectOption('');
  await page.getByRole('button',{name:'Compartir ficha ficticia',exact:true}).click();
  assert.equal(await editor.locator('section').count(),0);
  await page.locator('#coach').click();
  assert.equal(await editor.locator('[data-draft-origin="automatic_draft"]').count(),1);
  await page.locator('#revoke').click();assert.equal(await editor.locator('button').count(),0);
  await page.locator('#coach').click();
  await page.locator('#message').filter({hasText:'no tiene un origen'}).waitFor();
  await page.screenshot({path:`artifacts/coach-intake-guide-private/revoked-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Compartir ficha ficticia',exact:true}).click();
  await page.locator('#missing').click();await page.locator('#coach').click();
  await page.locator('#message').filter({hasText:'Faltan opciones compatibles'}).waitFor();
  assert.equal(await editor.locator('section').count(),0);
  await page.screenshot({path:`artifacts/coach-intake-guide-private/missing-evidence-${width}.png`,fullPage:true});
  assert.equal(errors.length,0);await context.close();
 }
 console.log('PASS synthetic intake connector UI. Not real intake submission or hosted authorization.');
}catch(error){
 try{if(activePage&&!activePage.isClosed())await activePage.screenshot({path:'artifacts/coach-intake-guide-private/failure.png',fullPage:true});}catch{}
 throw error;
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
