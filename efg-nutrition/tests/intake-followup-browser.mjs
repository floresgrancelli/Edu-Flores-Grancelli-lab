import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {extname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const sdk=`
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',org='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const u={id,email:'fixture@example.invalid'}, time='2026-11-25T16:00:00Z';
let enabled=false, fail=false, accepted=false, intake=null;
const calls=[];
export const fixture={id,org,u,calls,enable(){enabled=true},rejectNext(){fail=true},get intake(){return intake}};
export function createClient(url){
 if(new URL(url).origin!==location.origin)throw Error('Fixture requires loopback');
 return {
 auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:enabled?u:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
 from(table){
  let payload;const filters={};
  const row=()=>table==='efg_consents'?{student_id:id,accepted}:table==='efg_coach_relaunch_intakes'?intake:table==='efg_pilot_participation_receipts'?{student_id:id,organization_id:org,version:'coach_pilot_2026_demo1',participation_accepted:true,sharing_accepted:true,acceptance_method:'two_explicit_checkboxes',accepted_at:time,revoked_at:null}:null;
  const q={select(){return q},eq(k,v){filters[k]=v;return q},update(p){payload=p;return q},
   async maybeSingle(){return {data:row(),error:null}},async single(){
    if(table!=='efg_consents'||filters.student_id!==id||payload?.accepted!==true)throw Error('Unexpected write');
    calls.push('consent');if(fail){fail=false;return {error:Error('Synthetic rejection')};}
    accepted=true;return {data:row(),error:null};
   }};return q;
 },
 async rpc(n,a){
  if(n==='efg_submit_coach_relaunch_intake'){
   if(!accepted||!a.p_share_with_coach)throw Error('Attempt without consent');
   calls.push('intake');
   intake={...a.p_payload,student_id:id,organization_id:org,completed_version:a.p_completed_version,revision:1,shared_at:time};
   return {data:1,error:null};
  }
  return {data:null,error:null};
 }};
}
`;
const types={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif'};
const server=createServer((req,res)=>{
 try{
  const p=new URL(req.url,'http://localhost').pathname;
  if(p==='/fixture.mjs'){res.setHeader('Content-type',types['.mjs']);res.end(sdk);return;}
  if(!p.startsWith('/efg-nutrition/')||p.includes('..'))throw Error();
  const local=p.endsWith('/')?p+'index.html':p;
  const file=resolve(root,'.'+local);res.setHeader('Content-type',types[extname(file)]||'application/octet-stream');
  let body=readFileSync(file);
  if(local==='/efg-nutrition/pilot/pilot.js')body=body.toString()
   .replace('"https://esm.sh/@supabase/supabase-js@2.118.0"','"/fixture.mjs"')
   .replace(/^const SUPABASE_URL=.*;$/m,'const SUPABASE_URL=location.origin;')
   .replace(/^const SUPABASE_PUBLISHABLE=.*;$/m,'const SUPABASE_PUBLISHABLE="synthetic-only";')+
   '\nimport {fixture} from "/fixture.mjs";globalThis.startSyntheticIntake=()=>{fixture.enable();state.session={user:fixture.u};state.profile={user_id:fixture.id,organization_id:fixture.org,role:"student",active:true};state.coachPilotEntry={route:"intake"};state.consent={student_id:fixture.id,accepted:false};state.scienceWelcomePending=false;return render();};';
  res.end(body);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.NCC_CHROMIUM_PATH,headless:true});
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:840},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();
  const state=()=>page.evaluate(async()=>{const {fixture}=await import('/fixture.mjs');return {calls:fixture.calls,intake:fixture.intake};});
  await page.goto(origin+'/efg-nutrition/pilot/');
  await page.locator('#loginEmail').waitFor();
  await page.evaluate(()=>window.startSyntheticIntake());
  await page.locator('#coachRelaunch_objective_recomp').check();
  await page.locator('#coachRelaunch_age_years').fill('34');
  await page.locator('#coachRelaunch_height_cm').fill('171');
  await page.locator('#coachRelaunch_weight_kg').fill('71');
  await page.locator('#coachRelaunch_activity_level_moderate').check();
  await page.locator('[data-intakenext="1"]').click();
  await page.locator('#coachRelaunch_dietary_pattern').selectOption('omnivore');
  await page.locator('[data-intakenext="2"]').click();
  await page.locator('#coachRelaunch_notes').fill('Dato de prueba que debe conservarse');
  await page.locator('[data-intakenext="3"]').click();
  const authorize=page.getByRole('button',{name:'Autorizar seguimiento',exact:true});
  const send=page.getByRole('button',{name:'Guardar y enviar mi ficha al coach'});
  assert.equal(await authorize.isVisible(),true);
  await send.click();
  await page.locator('#efgCoachIntakeSaveError').waitFor();
  assert.deepEqual((await state()).calls,[]);
  page.once('dialog',d=>d.dismiss());await authorize.click();
  assert.deepEqual((await state()).calls,[]);
  await page.evaluate(async()=>(await import('/fixture.mjs')).fixture.rejectNext());
  page.once('dialog',d=>d.accept());await authorize.click();
  await page.getByText('No pudimos confirmar el permiso.',{exact:false}).waitFor();
  assert.equal(await page.locator('#coachRelaunch_notes').inputValue(),'Dato de prueba que debe conservarse');
  page.once('dialog',d=>d.accept());await authorize.click();
  await page.getByText('Seguimiento autorizado. Ya podés guardar y enviar la ficha.').waitFor();
  assert.deepEqual((await state()).calls,['consent','consent']);
  assert.equal(await authorize.isVisible(),false);
  assert.equal(await page.locator('#coachRelaunch_notes').inputValue(),'Dato de prueba que debe conservarse');
  await send.click();
  await page.waitForFunction(async()=>Boolean((await import('/fixture.mjs')).fixture.intake));
  const saved=await state();
  assert.deepEqual(saved.calls,['consent','consent','intake']);
  assert.equal(saved.intake.notes,'Dato de prueba que debe conservarse');
  assert.ok(saved.intake.shared_at);
  console.log('PASS',width,'explicit consent, cancel, error, retry and send with preserved draft');
  await context.close();
 }
}finally{await browser?.close();await new Promise(r=>server.close(r));}
