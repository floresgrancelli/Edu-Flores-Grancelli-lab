// COACH 01-05: exercise the ACTUAL isolated PWA function with ON/OFF gates.
// No database, hosted health RPC, personal records or browser session involved.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRIVATE_HEALTH_DECLARATION_UI_ENABLED} from '../pilot/student-restriction-declaration.js';
import {COACH_STUDENT_JOURNEY_ENABLED} from '../pilot/coach-student-journey.js';
assert.equal(PRIVATE_HEALTH_DECLARATION_UI_ENABLED,false);
assert.equal(COACH_STUDENT_JOURNEY_ENABLED,false);
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const start=app.indexOf('async function renderPrivateHealthDeclaration(){');
const end=app.indexOf('\nasync function render(){',start);
assert.ok(start>0&&end>start&&end-start<3700,'Need exact real PWA function, no mock rewrite');
const actual=app.slice(start,end);
assert.match(actual,/viewEpoch=state.authContextEpoch\|\|0/);
assert.match(actual,/\(state.authContextEpoch\|\|0\)!==viewEpoch/);
const student='11111111-1111-4111-8111-111111111111';
const org='22222222-2222-4222-8222-222222222222';
const nonce='33333333-3333-4333-8333-333333333333';
const version='coach_major_2026_r1';
function runFixture({ui=true,journey=true,route='review',role='student',
 profileUser=student,profileOrg=org,intakeStudent=student,
 intakeOrg=org,intakeVersion=version,intakeRevision=2,open,cryptoSource}={}){
 const calls={opens:0,frames:0,notices:0,errors:[],frameContents:[],nonces:0};
 const mount={isConnected:true,children:[],replaceChildren(...elements){
  this.children=elements;calls.notices++;
 }};
 const state={
  session:{user:{id:student}},
  profile:{user_id:profileUser,role,organization_id:profileOrg,active:true},
  coachPilotEntry:{route},
  coachPilotIntake:{student_id:intakeStudent,organization_id:intakeOrg,
    completed_version:intakeVersion,revision:intakeRevision},
  tab:'privateHealth',authContextEpoch:7,privateHealthSessionNonce:null,
  privateHealthDeclaration:{async open(element){
   calls.opens++; assert.equal(element,mount);
   if(open)return open(element); return {declaration:'unknown'};
  }}
 };
 const root={innerHTML:''};
 const doc={
  getElementById(id){assert.equal(id,'privateHealthDeclarationMount');return mount;},
  createElement(tag){assert.equal(tag,'p');return {textContent:'',setAttribute(name,value){
    calls.errors.push({name,value});
  }};}
 };
 const env={state,root,document:doc,
  window:{crypto:cryptoSource===undefined?{randomUUID(){calls.nonces++;return nonce;}}:cryptoSource},
  frame(html){calls.frames++;calls.frameContents.push(html);},
  PRIVATE_HEALTH_DECLARATION_UI_ENABLED:ui,
  COACH_STUDENT_JOURNEY_ENABLED:journey,COACH_RELEASE_INTAKE_VERSION:version};
 const fn=new Function(...Object.keys(env),actual+'\nreturn renderPrivateHealthDeclaration;')
   (...Object.values(env));
 return {state,root,mount,calls,run:fn};
}
for(const variant of [
 {ui:false},{journey:false},{role:'coach'},{profileUser:nonce},
 {profileOrg:nonce},{intakeStudent:nonce},{intakeOrg:nonce},
 {intakeVersion:'old_intake_2025'},{intakeRevision:0},
 {route:'legal'},{route:'participation'},{route:'verify'}
]){
 const t=runFixture(variant);
 await t.run();
 assert.equal(t.calls.opens,0,'No private reads on unverified role/route/intake');
 assert.equal(t.calls.frames,0,'No sensitive form may render before gate');
 assert.match(t.root.innerHTML,/no disponible/i);
 assert.equal(t.state.privateHealthSessionNonce,null);
}
for(const route of ['private','review','ready']){
 const t=runFixture({route});
 await t.run();
 assert.equal(t.calls.opens,1,'Allow only in authorized student private/review/ready');
 assert.equal(t.calls.frames,1);
 assert.equal(t.calls.nonces,1);
 assert.equal(t.state.privateHealthSessionNonce,nonce);
 assert.match(t.calls.frameContents[0],/privateHealthDeclarationMount/);
}
{
 let calls=0;
 const t=runFixture({cryptoSource:{getRandomValues(bytes){
  calls++;assert.ok(bytes instanceof Uint8Array);assert.equal(bytes.length,16);
  bytes.set(Array.from({length:16},(_,i)=>i));return bytes;
 }}});
 await t.run();
 assert.equal(t.state.privateHealthSessionNonce,'00010203-0405-4607-8809-0a0b0c0d0e0f');
 assert.equal(t.calls.opens,1,'HTTP preview still opens the signed health flow');
 await t.run();assert.equal(calls,1,'Reuse nonce within the same verified session');
}
for(const cryptoSource of [null,{}, {getRandomValues(){throw Error('CSPRNG unavailable');}}]){
 const t=runFixture({cryptoSource});
 await assert.rejects(t.run(),/identificador de sesión local seguro|CSPRNG unavailable/);
 assert.equal(t.calls.opens,0,'No private request without cryptographic randomness');
 assert.equal(t.state.privateHealthSessionNonce,null);
}
{
 let reject;
 const deferred=new Promise((_,r)=>{reject=r;});
 const t=runFixture({open:()=>deferred});
 const pending=t.run();
 t.state.authContextEpoch=8; // A→B→A: same visible user, different auth epoch
 reject(Error('stale private diagnostic'));
 await pending;
 assert.equal(t.calls.notices,0,'Late failure from old session cannot touch current UI');
 assert.equal(t.calls.errors.length,0);
}
{
 const t=runFixture({open:async()=>{throw Error('<unsafe>');}});
 await t.run();
 assert.equal(t.calls.notices,1);
 assert.equal(t.mount.children[0].textContent,'<unsafe>',
  'Text, never HTML: backend errors cannot inject DOM');
 assert.deepEqual(t.calls.errors,[{name:'role',value:'alert'}]);
}
console.log('PASS COACH 01-05 real isolated UI: OFF, signed entry/tenant/intake/route, ON-only fixture, auth epoch late-error discard and text-only errors. No health RPC or hosted changes.');
