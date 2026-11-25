// Entire PWA against loopback fixtures. No hosted accounts, writes or credentials.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const preview=process.env.NCC_SCIENCE_PREVIEW_DIR||'/workspace/ncc-food-entry-preview-'+process.pid,out=resolve(root,'artifacts/science-library');
mkdirSync(out,{recursive:true});
const prepare=spawnSync(process.execPath,['efg-nutrition/tests/prepare-student-day-visual.mjs',preview],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
const staged=resolve(preview,'dist/efg-nutrition/pilot/dual-workspace-candidate.mjs');
writeFileSync(staged,readFileSync(staged,'utf8').replace('export const DUAL_WORKSPACE_RELEASE_ENABLED = true;','export const DUAL_WORKSPACE_RELEASE_ENABLED = false;'));
const pilot=resolve(preview,'dist/efg-nutrition/pilot/pilot.js');
writeFileSync(pilot,readFileSync(pilot,'utf8').replaceAll('../tests/student-day-visual-sdk.mjs','../tests/food-entry-sdk.mjs'));
copyFileSync(resolve(root,'efg-nutrition/tests/food-entry-sdk.mjs'),resolve(preview,'dist/efg-nutrition/tests/food-entry-sdk.mjs'));
// Restore this editorial module's public photo URLs only; the generic adapter
// replaces every external URL with a placeholder. Auth/SDK isolation stays intact.
copyFileSync(resolve(root,'efg-nutrition/pilot/nutrition-daily-tip.js'),resolve(preview,'dist/efg-nutrition/pilot/nutrition-daily-tip.js'));
// Keep the real hrefs when checking external link styles. The page route blocks external requests.
for(const module of ['nutrition-science.js','science-welcome.js']){
 copyFileSync(resolve(root,'efg-nutrition/pilot',module),resolve(preview,'dist/efg-nutrition/pilot',module));
}
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(preview,'dist','.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(preview+'/dist/'))throw Error();res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const engines=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');


const evidence=[];
try{for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{for(const width of [320,390,1280])for(const role of ['student','coach','admin']){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',isMobile:width<700,hasTouch:width<700});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/efg-nutrition/pilot/');
 await page.getByRole('button',{name:'Alumno: vacío',exact:true}).click();await page.locator('.ncc-focus-summary').waitFor();
 await page.evaluate(async()=>{
  const v=window.__NCC_R4_FULLAPP__,day=v.state.diary;
  day.meals.desayuno=[{name:'Avena',fi:2.5},{name:'Huevo',fi:0}];
  day.meals.merienda=[{name:'Avena',fi:1.25},{name:'Pera',fi:2}];
  day.meals.cena=[{name:'Comida omitida',fi:9}];day.skipped={cena:true};
  day.sports=[{name:'Psyllium',fi:1,kind:'supplement'}];
  await v.render();
 });
 await page.locator('.ncc-micro-expand > summary').click();
 const fiber=page.locator('[data-micro-detail="fiber"]');
 assert.equal(await fiber.locator('li').count(),3);
 assert.deepEqual(await fiber.locator('li span').allTextContents(),['Avena','Pera','Psyllium (suplemento)']);
 assert.deepEqual(await fiber.locator('li strong').allTextContents(),['3,75 g','2 g','1 g']);
 assert.match(await fiber.locator('.ncc-micro-amount').textContent(),/6,8 g/);
 await page.evaluate(async role=>{const v=window.__NCC_R4_FULLAPP__;v.state.profile.role=role;v.state.tab='nutritionScience';await v.render();document.querySelector('#ncc-student-day-fixture-controls').hidden=true;},role);
 const before=await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary));
 const topics=page.locator('.ns-topic');assert.equal(await topics.count(),11);
 assert.equal(await page.locator('.ns-topic[open]').count(),0);
 await page.locator('.ns-topic>summary img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 assert.ok(await page.locator('.ns-topic>summary img').evaluateAll(imgs=>imgs.every(i=>i.naturalWidth>0)));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-compact.png'),fullPage:true});
 for(let i=0;i<11;i++){
 const summary=topics.nth(i).locator(':scope > summary');await summary.focus();await page.keyboard.press('Enter');
 assert.equal(await topics.nth(i).getAttribute('open')!==null,true,'Topic opens with keyboard');
 assert.equal(await page.locator('.ns-topic[open]').count(),1,'Only selected topic remains expanded');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Expanded content fits');
 if(i===1||i===8)await page.screenshot({path:resolve(out,engine+'-'+width+'-'+role+'-topic-'+i+'.png'),fullPage:true});
 }
 const externalLinks=page.locator('.ns-science-library a[href^="https://"]');
 assert.equal(await externalLinks.count(),12);
 const fiberTopic=topics.filter({hasText:'Fibra y microbiota'});
 await fiberTopic.getByRole('heading',{name:'Arroz y papa: cociná, enfriá y, si querés, recalentá'}).waitFor();
 assert.equal(await fiberTopic.getByRole('link',{name:/Estudio en arroz/}).getAttribute('href'),'https://pubmed.ncbi.nlm.nih.gov/26693746/');
 assert.equal(await fiberTopic.getByRole('link',{name:/Estudio en papa/}).getAttribute('href'),'https://pubmed.ncbi.nlm.nih.gov/27132853/');
 assert.equal(await fiberTopic.getByRole('link',{name:/Guía de seguridad/}).getAttribute('href'),'https://www.food.gov.uk/print/pdf/node/4286');
 assert.ok(await externalLinks.evaluateAll(links=>links.every(link=>{
  const style=getComputedStyle(link);
  return style.color==='rgb(139, 213, 255)'&&style.textDecorationLine.includes('underline');
 })));
 assert.equal(await page.locator('.ns-sources a').count(),7);
 await topics.nth(9).locator(':scope > summary').click();
 await topics.nth(8).locator(':scope > summary').click();
 const faq=page.locator('.ns-faq details').first();await faq.locator('summary').click();assert.equal(await faq.getAttribute('open')!==null,true);
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__NCC_R4_FULLAPP__.state.diary)),before);
 assert.deepEqual(errors,[]);evidence.push({engine,width,role,topics:11,photos:true,keyboard:true,exclusiveExpansion:true,faq:true,noOverflow:true,diaryUnchanged:true});await context.close();
 }}finally{await browser.close();}
}writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2));console.log('PASS science library',evidence.length);
}finally{server.close();}
