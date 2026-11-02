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
 browser=await chromium.launch();await mkdir('artifacts/adapted-guide-private',{recursive:true});
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();activePage=page;const errors=[];page.on('pageerror',()=>errors.push('pageerror'));
  await page.goto(origin+'/tests/adapted-guide-preview.html');
  await page.locator('#editor').getByText('Borrador pendiente de aprobación del coach.',{exact:true}).waitFor();
  assert.equal(await page.locator('[data-compatibility="green"]').count(),1);
  assert.equal(await page.locator('[data-compatibility="red"]').count(),1);
  assert.equal(await page.locator('[data-compatibility="yellow"]').count(),1);
  assert.equal(await page.locator('#editor section').count(),5);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#dislike').check();
  assert.equal(await page.locator('#editor section').getByText(/fresh_a/).count(),0);
  await page.screenshot({path:`artifacts/adapted-guide-private/compatible-${width}.png`,fullPage:true});
  const editor=page.locator('#editor');
  await editor.getByRole('button',{name:'Editar borrador',exact:true}).click();
  const row=editor.locator('[data-edit-row="desayuno:0"]');
  const before=await editor.locator('[data-guide-totals]').textContent();
  const editedQty=Number(await row.locator('input').inputValue())+10;
  await row.locator('input').fill(String(editedQty));await row.locator('input').press('Tab');
  assert.notEqual(await editor.locator('[data-guide-totals]').textContent(),before);
  await editor.getByRole('button',{name:'Conservar borrador editado'}).click();
  assert.equal(await editor.locator('[data-draft-origin="edited_draft"]').count(),1);
  await editor.getByRole('button',{name:'Editar borrador',exact:true}).click();
  await row.locator('select').selectOption('drink');
  assert.equal(await row.locator('span').textContent(),' ml');
  await row.locator('input').fill('0');await row.locator('input').press('Tab');
  await editor.getByRole('button',{name:'Conservar borrador editado'}).click();
  await editor.getByText('Total no disponible: corregí cantidad, unidad o fuente.',{exact:true}).waitFor();
  await editor.getByRole('button',{name:'Cancelar edición'}).click();
  assert.equal(await editor.locator('[data-edit-row]').count(),0);
  await editor.getByRole('button',{name:'Editar borrador',exact:true}).click();
  await editor.locator('[data-edit-row="desayuno:0"] select').selectOption('wheat');
  await editor.getByRole('status').filter({hasText:'Contiene gluten'}).waitFor();
  await page.locator('#gluten').uncheck();
  await editor.getByRole('status').filter({hasText:'Borrador pendiente'}).waitFor();
  await page.locator('#gluten').check();
  await editor.getByRole('status').filter({hasText:'Contiene gluten'}).waitFor();
  await page.screenshot({path:`artifacts/adapted-guide-private/editor-conflict-${width}.png`,fullPage:true});
  await editor.getByRole('button',{name:'Restaurar borrador automático'}).click();
  assert.equal(await editor.locator('[data-draft-origin="automatic_draft"]').count(),1);
  await page.getByRole('button',{name:'Metas incompatibles'}).click();
  await page.getByRole('status').filter({hasText:'Las metas no coinciden'}).waitFor();
  assert.equal(await page.locator('main section').count(),0);
  await page.screenshot({path:`artifacts/adapted-guide-private/conflict-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Sin opciones'}).click();
  await page.getByRole('status').filter({hasText:'Faltan opciones compatibles'}).waitFor();
  assert.equal(await page.locator('main section').count(),0);
  assert.equal(errors.length,0);await context.close();
 }
 console.log('PASS synthetic fixture interactions/overflow; inspect PNGs for visual approval. Not full app UAT.');
}catch(error){
 try{if(activePage&&!activePage.isClosed())await activePage.screenshot({path:'artifacts/adapted-guide-private/failure.png',fullPage:true});}catch{}
 throw error;
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
