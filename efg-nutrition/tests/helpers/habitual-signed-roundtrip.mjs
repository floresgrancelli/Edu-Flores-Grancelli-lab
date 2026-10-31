// Real application functions, real LOCAL signed GoTrue sessions and PostgREST.
// No hosted data; no browser/physical device or external OTP claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {yes,denied} from './coach119-local.mjs';
import {signOutCurrentDevice} from '../../pilot/logout-session.js';
import {readScienceWelcomeStatus} from '../../pilot/science-welcome.js';

export async function verifyHabitualSignedRoundTrip({request,asClient,users,password}){
 const user=users.newA,source=readFileSync(new URL('../../pilot/pilot.js',import.meta.url),'utf8');
 const slice=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start);return source.slice(start,end)};
 const slots=['desayuno','media_manana','almuerzo','media_tarde','merienda','cena'];
 const state={session:{user:{id:user.id}},profile:{user_id:user.id,role:'student',active:true},diary:null,progressLogs:[],habitualSelection:{}};
 const controls={};let nextName='';
 const deps={state,sb:asClient(user),mealSlots:slots.map(s=>[s,s]),mealDefault:Object.fromEntries(slots.map(s=>[s,[]])),
  today:()=> '2026-11-03',isNutritionDayClosed:()=>false,render:async()=>{},notify:()=>{},
  prompt:()=>nextName,confirm:()=>true,document:{getElementById:id=>({value:controls[id]||''})},
  localStorage:{getItem:()=>null,removeItem:()=>{}},habitualShortLabel:x=>x.name,
  habitualPreviewHTML:x=>x?.items?.map(i=>i.name).join(', ')||'',escapeHTML:String,num:String};
 const code=[slice('const values=(items)=>','async function ensureCurrentDay(){'),
  slice('let cloudHabituales=[];','function recipeStoreKey(){'),
  slice('async function saveDiary(){','async function loadPersonalData(){')].join('\n');
 const api=new Function(...Object.keys(deps),code+'\nreturn {activeDiary,loadCloudHabituales,habitualAction,getHabitualList,habitualPickerHTML,applyChosenHabitual,deleteChosenHabitual,reset(){cloudHabituales=[]}};')(...Object.values(deps));
 const first={id:'qa_food_a',name:'Alimento ficticio A',qty:100,unit:'g',k:100,p:10,c:10,f:2,fi:1};
 const second={id:'qa_food_b',name:'Alimento ficticio B',qty:120,unit:'g',k:120,p:12,c:12,f:2.4,fi:1.2};
 await api.loadCloudHabituales();
 for(const slot of slots){
  nextName=slot+' A';api.activeDiary().meals[slot]=[first];await api.habitualAction(slot,'save');
  nextName=slot+' B';api.activeDiary().meals[slot]=[second];await api.habitualAction(slot,'save');
 }
 const stored=yes(await request('/rest/v1/efg_habitual_meals?select=*&student_id=eq.'+user.id,{token:user.token}),'twelve saved menus');
 assert.equal(stored.length,12);
 const historyBefore=yes(await request('/rest/v1/efg_daily_logs?select=*&student_id=eq.'+user.id,{token:user.token}),'history before session exit');
 // Exercise the same explicit local-scope sign-out adapter used by the app.
 const oldSession=JSON.parse(Buffer.from(user.token.split('.')[1],'base64url')).session_id;
 const oldRefresh=user.refreshToken;
 const signout=await signOutCurrentDevice({explicitClick:true,auth:{async signOut({scope}){
  assert.equal(scope,'local');const r=await request('/auth/v1/logout?scope=local',{method:'POST',token:user.token});
  return {error:r.ok?null:r.data};
 }}});
 assert.equal(signout.signedOut,true);
 user.token=null;state.session=null;state.diary=null;state.habitualSelection={};api.reset();
 const revoked=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:oldRefresh}});
 assert.equal(revoked.ok,false,'Signed-out refresh token must not create a session');
 const login=yes(await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:user.email,password}}),'new LOCAL login');
 user.token=login.access_token;user.refreshToken=login.refresh_token;
 assert.equal(login.user.id,user.id);assert.notEqual(JSON.parse(Buffer.from(user.token.split('.')[1],'base64url')).session_id,oldSession);
 state.session={user:{id:user.id}};
 await api.loadCloudHabituales();
 for(const slot of slots){
  assert.deepEqual(api.getHabitualList(slot).map(x=>x.name),[slot+' A',slot+' B']);
  assert.ok(api.habitualPickerHTML(slot).includes(slot+' B'));
 }
 assert.equal((await readScienceWelcomeStatus(asClient(user),{profile:state.profile,userId:user.id})).pending,false,
  'Education receipt survives genuine LOCAL sign-out and fresh sign-in');
 // Actual first-day habitual application must reach the signed diary endpoint.
 controls.habitualChoice_desayuno=api.getHabitualList('desayuno')[1].id;
 await api.applyChosenHabitual('desayuno');
 const saved=yes(await request('/rest/v1/efg_daily_logs?select=*&student_id=eq.'+user.id+'&log_day=eq.2026-11-03',{token:user.token}),'first habitual diary readback');
 assert.deepEqual(saved[0].meals.desayuno,[second]);assert.equal(saved[0].totals.k,120);
 for(const row of historyBefore){
  const old=yes(await request('/rest/v1/efg_daily_logs?select=*&student_id=eq.'+user.id+'&log_day=eq.'+row.log_day,{token:user.token}),'historical preservation');
  assert.deepEqual(old,[row]);
 }
 for(const actor of [users.studentB,users.coachA,users.coachB,users.admin]){
  const path='/rest/v1/efg_habitual_meals?student_id=eq.'+user.id;
  assert.deepEqual(yes(await request(path+'&select=*',{token:actor.token}),'foreign habitual read'),[]);
  assert.deepEqual(yes(await request(path,{method:'PATCH',token:actor.token,body:{name:'forbidden'},prefer:'return=representation'}),'foreign habitual update'),[]);
  assert.deepEqual(yes(await request(path,{method:'DELETE',token:actor.token,prefer:'return=representation'}),'foreign habitual delete'),[]);
  denied(await request('/rest/v1/efg_habitual_meals',{method:'POST',token:actor.token,body:{student_id:user.id,meal_slot:'cena',name:'forbidden',items:[first]}}),'foreign habitual insert');
 }
 denied(await request('/rest/v1/efg_habitual_meals?id=eq.'+stored[0].id,{method:'PATCH',token:user.token,body:{student_id:users.studentB.id}}),'owner reassignment denied');
 await api.deleteChosenHabitual('desayuno');api.reset();await api.loadCloudHabituales();
 assert.deepEqual(api.getHabitualList('desayuno').map(x=>x.name),['desayuno A']);
 assert.deepEqual(yes(await request('/rest/v1/efg_daily_logs?select=*&student_id=eq.'+user.id+'&log_day=eq.2026-11-03',{token:user.token}),'diary after habitual delete'),saved);
 console.log('PASS signed LOCAL habitual round trip: 12 menus/6 slots, actual app logout adapter, revoked refresh, new session, education receipt, first-day diary, cross-org/coach/admin denial, delete without historical loss. Password login in LOCAL QA; external OTP and physical UAT remain untested.');
}
