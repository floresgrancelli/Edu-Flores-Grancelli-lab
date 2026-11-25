// Real renderer/handlers, synthetic transport only; no remote requests or patients.
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const {chromium,webkit}=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';
const base=process.cwd(),out=resolve('artifacts/guide-inline-catalog');mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname,file=resolve(base,'.'+(path.endsWith('/')?path+'index.html':path));
 assert.ok(file.startsWith(base+'/'));let bytes=readFileSync(file);
 if(path.endsWith('/pilot.js'))bytes=Buffer.from(bytes.toString()+`\nwindow.__GUIDE_QA__={state,root,foods,sb,coachDraftClient,guideTotals,readGuidedEditor,coachGuidedSection,coachAtomicDraftPanel,previewCoachGuide,sendCoachGuidePreview,generateFlexibleGuidedDay,render,frame,studentPrimaryNavigation,studentSecondaryNavigation,studentPendingTabAllowed,studentMoreView,efgNavIcon,installSuccess(){coachDraftClient.publish=async payload=>{window.trace.publishes++;window.trace.keys.push(payload.requestId);return {studentId:payload.studentId,goalId:'44444444-4444-4444-8444-444444444444',requestId:payload.requestId};};}};`);
 res.writeHead(200,{'content-type':({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html'})[extname(file)]||'application/octet-stream'});res.end(bytes);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const engine=process.env.EFG_QA_ENGINE||'chromium';
assert.ok(['chromium','webkit'].includes(engine),'Unsupported QA engine');
const browser=await ({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'&&process.env.EFG_CHROME_PATH?{executablePath:process.env.EFG_CHROME_PATH}:{})});

try{for(const role of ['coach','admin'])for(const width of [360,390,1280]){
 const ctx=await browser.newContext({viewport:{width,height:850},hasTouch:true,isMobile:width<720});
 await ctx.route('**/*',route=>{
  if(route.request().url().startsWith('http://127.0.0.1:'))return route.continue();
  if(route.request().url().startsWith('https://esm.sh/'))return route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:`export function createClient(){const q={select(){return this},eq(){return this},in(){return this},order(){return this},limit(){return this},maybeSingle:async()=>({data:null,error:null}),then(r){r({data:[],error:null})}};return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>q,rpc:async()=>({data:null,error:null})}}`});
  return route.abort();
 });
 const debug=process.env.DEBUG_GUIDE==='1';
 const page=await ctx.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/efg-nutrition/pilot/`);await page.waitForFunction(()=>window.__GUIDE_QA__);
 if(debug){page.on('pageerror',e=>console.error('PAGE',e));page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text());});}
 await page.evaluate(role=>{
  const v=window.__GUIDE_QA__,s=v.state;
  s.selectedStudent='11111111-1111-4111-8111-111111111111';s.session={user:{id:'22222222-2222-4222-8222-222222222222'}};s.consent={accepted:true};s.profile={role,active:true,nickname:'Coach ficticio'};s.org={id:'55555555-5555-4555-8555-555555555555',is_test:true,seat_limit:10};s.tab='coachStudents';s.roster=[{user_id:s.selectedStudent,nickname:'Alumno ficticio',active:true,email:'student@example.invalid'}];
  s.coachIntakeForms={[s.selectedStudent]:{shared_at:'2026-11-04',updated_at:'2026-11-04',revision:1,completed_version:'coach_major_2026_r1'}};
  s.pendingGoal={goal_type:'maintenance',kcal:2100,protein_g:150,carb_g:225,fat_g:70,fiber_g:28};
  s.coachGuidedDraft=v.generateFlexibleGuidedDay(v.foods,s.pendingGoal,{patternId:'balanced',restrictionStatus:'none_declared',restrictions:[]});
  const ids=['egg','brownrice','pumpkin'];
  s.coachGuidedDraft.meals.find(m=>m.slot==='almuerzo').items=ids.map(id=>({...v.foods.find(f=>f.id===id),qty:id==='pumpkin'?160:100,locked:false}));
  s.coachGuidedDraft.supplementNote='Nota ficticia de prueba';
  s.coachPlanDraftRecord=null;
  window.trace={saves:0,publishes:0,keys:[],failSave:false,sourceReads:0};
  v.sb.rpc=async(name)=>{if(name!=='efg_coach_guide_catalog')throw Error('Unexpected RPC '+name);trace.sourceReads++;const rows=[...new Map(s.coachGuidedDraft.meals.flatMap(m=>m.items).map(f=>[f.id,f])).values()].map(f=>({...f,sourceType:'synthetic_fixture',dataQuality:'estimated',sourceUrl:'https://example.invalid/'+f.id}));return {data:{version:'ncc-catalog-0123456789abcdef',foods:rows},error:null};};
  v.coachDraftClient.save=async payload=>{window.trace.saves++;await new Promise(r=>setTimeout(r,50));if(window.trace.failSave)throw Error('Fallo sintético de guardado');window.saved={student_id:s.selectedStudent,status:'draft',draft_revision:window.trace.saves,source_intake_updated_at:'2026-11-04',source_intake_revision:1,goal_proposal:payload.goal,guide_proposal:payload.guide};return {revision:window.trace.saves};};
  v.coachDraftClient.load=async()=>structuredClone(window.saved);
  v.coachDraftClient.publish=async payload=>{window.trace.publishes++;window.trace.keys.push(payload.requestId);await new Promise(r=>setTimeout(r,60));throw Error('Guide foods are not independently reviewed and current');};
  v.frame(v.coachGuidedSection()+v.coachAtomicDraftPanel());
 },role);
 const lunch=page.locator('[data-guidecard="almuerzo"]');
 await page.locator('[data-guidejump="almuerzo"]').click();
 const eligible=await page.evaluate(()=>new Set(window.__GUIDE_QA__.foods.filter(f=>!f.diaryOnly).map(f=>f.id)).size);
 for(const [i,group] of [[0,'Proteínas'],[1,'Hidratos'],[2,'Verduras']]){
  const choice=lunch.locator('[data-guideswap="almuerzo:'+i+'"]');
  assert.equal(await choice.isVisible(),true);
  assert.equal(await choice.locator('option').count(),1,'Does not render the entire catalog in every row initially');
  await choice.dispatchEvent('pointerdown');
  assert.equal(await choice.locator('optgroup').first().getAttribute('label').then(t=>t.includes(group)),true);
  assert.equal(await choice.locator('optgroup option').count(),eligible);
  assert.equal(await choice.locator('option[value="chicken"]').count(),1);
  assert.equal(await choice.locator('option[value="brownrice"]').count(),1);
  assert.equal(await choice.locator('option[value="pumpkin"]').count(),1);
 }
 for(const card of await page.locator('[data-guidecard]').all())assert.ok(await card.locator('[data-guidecatalogcurrent]').count()>0,'All six hours render direct options');
 assert.equal(await lunch.locator('summary').filter({hasText:/Editar|reemplazar/i}).count(),0);
 const swap=lunch.locator('[data-guideswap="almuerzo:0"]');
 const search=swap.locator('xpath=ancestor::*[@data-guidecatalogrow]').locator('[data-guidecatalogsearch]');
 await search.fill('xyz-sin-coincidencias');assert.equal(await swap.locator('option').count(),1);
 assert.equal(await swap.locator('option').first().textContent(),'Sin coincidencias');
 await search.fill('póllo');assert.equal(await swap.locator('option[value="chicken"]').count(),1);
 assert.equal(await swap.locator('option[value="brownrice"]').count(),0);
 const review=()=>page.evaluate(()=>window.__GUIDE_QA__.state.coachGuidedDraft.meals.find(x=>x.slot==='almuerzo').items.map(f=>f.id));
 assert.deepEqual(await review(),['egg','brownrice','pumpkin']);
 await search.fill('');
 const fieldSize=await swap.boundingBox();assert.ok(fieldSize&&fieldSize.width>=80&&fieldSize.height>=44);
 if(role==='coach'&&width===390){
  await swap.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  await page.screenshot({path:resolve(out,`inline-${engine}-${role}-${width}.png`)});
 }
 page.on('dialog',d=>d.accept());
 await swap.selectOption('chicken');
 await page.waitForFunction(()=>window.__GUIDE_QA__.state.coachGuidedDraft.meals.find(m=>m.slot==='almuerzo').items[0].id==='chicken',null,{timeout:8000});
 assert.deepEqual(await review(),['chicken','brownrice','pumpkin']);
 assert.equal(await page.evaluate(()=>window.trace.publishes+window.trace.saves),0);
 await page.screenshot({path:resolve(out,`guide-${engine}-${role}-${width}.png`)});
 console.log('PASS',engine,role,width,eligible,'catalog choices in every group; searches and draft-only row replacement');
 await ctx.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}
