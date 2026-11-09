// Isolated real Chromium DOM with real release frame/panel; all SDK data fictitious.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const out=path.join(root,'efg-nutrition/docs/admin-panel-20261109');const results=[];
 try{for(const width of [390,412,1280]){
  const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage();
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());if(url.origin!=='http://ncc.fixture.test')throw Error('External network blocked: '+url.origin);
   if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/efg-nutrition/pilot/pilot.css"><link rel="stylesheet" href="/efg-nutrition/pilot/premium-system.css"><main id="app"></main>'});
   const file=path.resolve(root,'.'+url.pathname);assert.ok(file.startsWith(root+path.sep));return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.css')?'text/css':'text/javascript'});
  });
  await page.goto('http://ncc.fixture.test');
  await page.evaluate(async()=>{
   const {createProfessionalWorkspaceReleaseFrame}=await import('/efg-nutrition/pilot/professional-workspace-release-frame.mjs');
   const uid='11111111-1111-4111-8111-111111111111',sid='22222222-2222-4222-8222-222222222222',org='33333333-3333-4333-8333-333333333333',personal='44444444-4444-4444-8444-444444444444';
   window.test={role:'admin',own:false,tab:'home',writes:0,epoch:1};
   const profile=()=>({user_id:uid,active:true,role:test.role,organization_id:test.role==='student'?personal:null});
   const sdk={supabaseUrl:'https://ncc.example.com',auth:{onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},async getSession(){return {data:{session:{access_token:'a.'+btoa(JSON.stringify({session_id:sid}))+'.b'}}}},async getUser(){return {data:{user:{id:uid}}}}},from(){const q={select(){return q},eq(){return q},single(){return q},then(resolve){resolve({data:profile()})}};return q},async rpc(n){
    if(n==='ncc_dual_workspace_contexts_v1')return {data:{user_id:uid,active:true,profile_role:test.role,student_context:test.role==='student'?{organization_id:personal,coach_id:org,consent_accepted:true}:null,coach_contexts:test.own?[{id:org,coach_id:uid,name:'Coach ficticio',status:'active',is_test:true,legal_ready:false,seat_limit:10,active_students:0,pending_invitations:0}]:[],managed_coaches:[{id:org,name:'Coach ficticio',seat_limit:10,active_students:0,pending_invitations:0}]}};
    if(n.includes('create')||n.includes('set_seats')||n.includes('invite'))test.writes++;
    return {data:null,error:{message:'Synthetic fixture intentionally has no professional terms'}};
   }};
   test.frame=createProfessionalWorkspaceReleaseFrame({enabled:true,sdk,config:{explicitReleaseConfiguration:true,backendOrigin:sdk.supabaseUrl},readSession:()=>({userId:uid,sessionId:sid,epoch:test.epoch}),readLegacyPersonal:()=>({profile:profile()}),readAdminLocation:()=>test.role==='admin'&&['admin','adminManage'].includes(test.tab)});
   test.navigate=async(tab)=>{test.tab=tab;test.frame.prepareFrame();document.querySelector('#app').innerHTML=test.frame.wrap('<h1>'+tab+'</h1><p>Contenido de la pestaña</p>')+'<nav class="pilot-nav"><button data-tab="home">Mi día</button></nav>';test.frame.mountFrame(document.querySelector('#app'));await test.frame.ready();};await test.navigate('home');
  });
  const admin=page.locator('[data-ncc-admin-controls]'),host=page.locator('[data-ncc-professional-release-host]');
  for(const tab of ['home','testCoach','nutritionScience','adminMore','reports']){await page.evaluate(t=>test.navigate(t),tab);assert.equal(await admin.count(),0);assert.equal(await host.isVisible(),false);}
  await page.evaluate(()=>test.navigate('admin'));assert.equal(await admin.count(),1);assert.equal(await admin.getAttribute('open'),null);
  assert.ok((await host.boundingBox()).height<220,'Admin starts compact and folded');
  await admin.locator(':scope > summary').click();await page.getByLabel('Correo del coach',{exact:true}).fill('draft@example.invalid');
  assert.equal(await page.getByRole('button',{name:'Verificar creación anterior',exact:true}).isVisible(),false);
  await page.evaluate(()=>test.navigate('home'));assert.equal(await admin.count(),0);await page.evaluate(()=>test.navigate('adminManage'));
  assert.equal(await page.getByLabel('Correo del coach',{exact:true}).inputValue(),'draft@example.invalid');
  const controls=await page.locator('[data-ncc-admin-controls] input').evaluateAll(nodes=>nodes.filter(x=>x.getClientRects().length).map(x=>({w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height,r:x.getBoundingClientRect().right})));
  assert.ok(controls.every(x=>x.h>=44&&x.r<=width),'Inputs fit viewport and remain touch friendly');
  await page.screenshot({path:path.join(out,`admin-open-${width}.png`),fullPage:true});
  await page.evaluate(async()=>{test.own=true;test.epoch++;await test.navigate('home');});
  assert.equal(await admin.count(),0);assert.equal(await page.getByLabel('Elegí tu espacio').isVisible(),true);assert.ok((await host.boundingBox()).height<130,'Role selector is compact');
  await page.screenshot({path:path.join(out,`compact-selector-${width}.png`),fullPage:true});
  await page.getByLabel('Elegí tu espacio').selectOption('33333333-3333-4333-8333-333333333333');
  await page.waitForFunction(()=>document.querySelector('[data-ncc-release-personal]').hidden);assert.equal(await admin.count(),0);
  await page.waitForFunction(()=>!document.querySelector('[aria-label="Elegí tu espacio"]').disabled);
  await page.getByLabel('Elegí tu espacio').selectOption('');await page.waitForFunction(()=>!document.querySelector('[data-ncc-release-personal]').hidden);
  await page.evaluate(async()=>{test.role='student';test.epoch++;await test.navigate('admin');});assert.equal(await admin.count(),0);assert.equal(await page.getByLabel('Elegí tu espacio').isVisible(),true);
  await page.evaluate(async()=>{test.own=false;test.epoch++;await test.navigate('home');});assert.equal(await host.isVisible(),false);
  assert.equal(await page.evaluate(()=>test.writes),0);results.push({width,passed:true,mutations:0});await context.close();
 }
 fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({scope:'Real Chromium, actual release frame/panel with fictional SDK; no hosted writes',results},null,2));console.log(JSON.stringify(results));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
