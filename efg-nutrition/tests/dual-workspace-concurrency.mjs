// Public synthetic model only. This program never loads application SQL or private captures.
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=dirname(fileURLToPath(import.meta.url));
const socket=process.env.NCC_SYNTHETIC_SOCKET;
assert.equal(process.env.NCC_CONCURRENCY_SYNTHETIC,'yes');
assert.ok(socket?.startsWith(process.env.RUNNER_TEMP+'/'),'Only a runner-temporary Unix socket is allowed');
assert.equal(process.env.PGHOST,undefined,'Do not inherit external connection configuration');
for(const key of ['PGSERVICE','PGSERVICEFILE','PGPASSWORD','DATABASE_URL','SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD'])assert.equal(process.env[key],undefined,key+' must be absent');
const results=[],sessions=[];let serial=0;
const quote=x=>"'"+String(x).replaceAll("'","''")+"'";
class Session{
 constructor(name){
  this.name=name;this.pending=null;this.buffer='';
  const env={PATH:process.env.PATH,HOME:process.env.RUNNER_TEMP,LC_ALL:'C',PGAPPNAME:'ncc-model-'+name};
  this.proc=spawn('psql',['-X','-qAt','-h',socket,'-U',process.env.USER,'-d','ncc_synthetic','-v','ON_ERROR_STOP=0'],{env,stdio:['pipe','pipe','pipe']});
  this.proc.stdout.on('data',chunk=>{this.buffer+=chunk;this.consume()});
  this.proc.stderr.on('data',()=>{}); // Expected denials are recorded by SQLSTATE, never raw logs.
  this.proc.on('error',e=>this.pending?.reject(e));
  this.proc.on('exit',code=>{if(this.pending)this.pending.reject(new Error('psql ended '+code))});
  sessions.push(this);
 }
 consume(){while(this.buffer.includes('\n')){const at=this.buffer.indexOf('\n');const line=this.buffer.slice(0,at).trim();this.buffer=this.buffer.slice(at+1);
   if(!this.pending)continue;
   if(line.startsWith(this.pending.marker+' ')){const p=this.pending;this.pending=null;clearTimeout(p.timer);p.resolve({state:line.slice(p.marker.length+1).trim(),lines:p.lines});}
   else if(line)this.pending.lines.push(line);
  }}
 query(sql,fatal=false){assert.equal(this.pending,null,'One command per connection');const marker='__NCC_'+(++serial)+'__';
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.proc.kill('SIGTERM');reject(new Error('Session timeout '+this.name));},15000);
   this.pending={marker,resolve,reject,lines:[],timer};this.proc.stdin.write('\\set ON_ERROR_STOP '+(fatal?'on':'off')+'\n'+sql+'\n\\echo '+marker+' :SQLSTATE\n');});}
 async ok(sql){const r=await this.query(sql,true);assert.equal(r.state,'00000',this.name+' '+sql.slice(0,80));return r.lines;}
 async init(){await this.ok("SET statement_timeout='10s'; SET lock_timeout='8s'; SET deadlock_timeout='500ms'; SET ncc.synthetic='yes';");this.pid=Number((await this.ok('SELECT pg_backend_pid();'))[0]);}
 async begin(level='READ COMMITTED'){await this.ok('BEGIN ISOLATION LEVEL '+level+';');}
 async rollback(){await this.ok('ROLLBACK;');}
 close(){this.proc.stdin.end('\\q\n');}
}
const a=new Session('a'),b=new Session('b'),o=new Session('observer');
const call=(actor,req,op,p={},compat=false)=>`SELECT model.${compat?'compat':'mutate'}(${actor},${quote(req)},${quote(op)},${quote(JSON.stringify({space:1,...p}))}::jsonb);`;
async function scalar(sql){return(await o.ok(sql))[0];}
async function snapshot(){return scalar(`SELECT jsonb_build_object('spaces',(SELECT jsonb_agg(x ORDER BY id) FROM model.space x),'caps',(SELECT jsonb_agg(x ORDER BY space_id) FROM model.cap x),'people',(SELECT jsonb_agg(x ORDER BY id) FROM model.person x),'personal',(SELECT jsonb_agg(x ORDER BY id) FROM model.personal x),'invites',(SELECT jsonb_agg(x ORDER BY id) FROM model.invite x),'receipts',(SELECT jsonb_agg(x ORDER BY actor,request) FROM model.receipt x))::text;`);}
async function reset(extra=''){
 await a.rollback();await b.rollback();
 await o.ok(`TRUNCATE model.receipt,model.invite,model.person,model.personal,model.cap,model.space RESTART IDENTITY;
 INSERT INTO model.space VALUES(1,2,true,true,true,8),(2,4,false,true,true,8);
 INSERT INTO model.cap VALUES(1,2,true);
 INSERT INTO model.person VALUES(10,1,true,true),(11,1,false,false),(20,2,true,true);
 INSERT INTO model.personal VALUES(2,9,'{"role":"learner","original_space":99}','{"published":true,"version":1}');
 INSERT INTO model.invite(space_id,address) VALUES(1,'pending@example.invalid'); ${extra}`);
}
async function waitBlocked(waiter,blocker){const deadline=Date.now()+6000;while(Date.now()<deadline){
 const data=JSON.parse(await scalar(`SELECT json_build_object('observed_at',clock_timestamp(),'blocked',${blocker.pid}=ANY(pg_blocking_pids(${waiter.pid})),'waits',(SELECT count(*) FROM pg_locks WHERE pid=${waiter.pid} AND NOT granted),'type',(SELECT wait_event_type FROM pg_stat_activity WHERE pid=${waiter.pid}))::text;`));
 if(data.blocked&&data.waits>0&&data.type==='Lock')return data;
 await new Promise(r=>setTimeout(r,20));
 }throw new Error('Expected database-observed blocking '+waiter.name+' by '+blocker.name);}
function mark(group,name,detail={}){results.push({group,name,status:'PASS',...detail});console.log('PASS',group,name);}
async function denied(session,sql,code='42501'){const before=await snapshot();const r=await session.query(sql);assert.equal(r.state,code);await session.rollback();assert.equal(await snapshot(),before);return r;}
async function revokeBefore(group,op,p={},compat=false,level='READ COMMITTED'){
 await reset();await a.begin();await a.ok(call(1,'revoke','revoke'));
 await b.begin(level);const pending=b.query(call(op==='claim'?3:2,'later',op,p,compat));
 const observed=await waitBlocked(b,a);await a.ok('COMMIT;');const committed=await snapshot();
 const r=await pending;assert.equal(r.state,level==='READ COMMITTED'?'42501':'40001');await b.rollback();assert.equal(await snapshot(),committed);
 mark(group,op+' after revocation'+(compat?' compatibility':''),{isolation:level,sqlstate:r.state,observed});
}
async function operationBefore(group,op,p={},compat=false){
 await reset();const occupationBefore=await scalar("SELECT (SELECT count(*) FROM model.person WHERE space_id=1 AND active)+(SELECT count(*) FROM model.invite WHERE space_id=1 AND claimed IS NULL AND NOT cancelled);");await a.begin();await a.ok(call(op==='claim'?3:2,'first',op,p,compat));
 await b.begin();const pending=b.query(call(1,'revoke','revoke'));const observed=await waitBlocked(b,a);await a.ok('COMMIT;');
 assert.equal((await pending).state,'00000');await b.ok('COMMIT;');assert.equal(await scalar('SELECT model.context(2,1);'),'f');
 assert.equal(await scalar('SELECT mentor FROM model.personal WHERE id=2;'),'9');
 if(op==='claim')assert.equal(await scalar("SELECT (SELECT count(*) FROM model.person WHERE space_id=1 AND active)+(SELECT count(*) FROM model.invite WHERE space_id=1 AND claimed IS NULL AND NOT cancelled);"),occupationBefore,'Claim converts reservation without double counting');
 mark(group,op+' before revocation'+(compat?' compatibility':''),{observed});
}
try{
 await Promise.all(sessions.map(s=>s.init()));
 const model=readFileSync(resolve(root,'dual-workspace-concurrency-model.sql'),'utf8');await o.ok(model);
 const version=await scalar('SHOW server_version;');
 for(const compat of [false,true])await revokeBefore(1,'invite',{address:'new@example.invalid'},compat);
 await operationBefore(2,'invite',{address:'new@example.invalid'});await denied(a,call(3,'late','claim',{address:'new@example.invalid'}));
 await revokeBefore(3,'claim',{address:'pending@example.invalid'});await operationBefore(3,'claim',{address:'pending@example.invalid'});
 assert.equal(await scalar('SELECT count(*) FROM model.person WHERE id=3;'),'1');
 for(const value of [false,true]){const p={person:value?11:10,value};await revokeBefore(4,'active',p);await operationBefore(4,'active',p);assert.equal(await scalar(`SELECT consent FROM model.person WHERE id=${p.person};`),'f');}
 for(const op of ['cancel','delete']){await revokeBefore(5,op,{address:'pending@example.invalid'});await operationBefore(5,op,{address:'pending@example.invalid'});}
 await reset();await a.ok(call(3,'claim','claim',{address:'pending@example.invalid'}));await denied(a,call(2,'delete','delete',{address:'pending@example.invalid'}));mark(5,'Consumed invitation preserved');
 await revokeBefore(6,'terms');await operationBefore(6,'terms');await denied(a,call(2,'first','terms'));mark(6,'Terms replay denied after revocation');
 for(const sameAddress of [false,true]){
  await reset('UPDATE model.space SET capacity=3 WHERE id=1;');await a.begin();await a.ok(call(2,'one','invite',{address:'last@example.invalid'}));
  await b.begin();const pending=b.query(call(2,'two','invite',{address:sameAddress?'last@example.invalid':'other@example.invalid'}));await waitBlocked(b,a);await a.ok('COMMIT;');
  const stable=await snapshot();assert.equal((await pending).state,'23514');await b.rollback();assert.equal(await snapshot(),stable);mark(7,'Last seat single winner',{sameAddress});
 }
 for(const changed of [false,true]){
  await reset();await a.begin();await a.ok(call(2,'same','invite',{address:'one@example.invalid'}));await b.begin();
  const pending=b.query(call(2,'same','invite',{address:changed?'two@example.invalid':'one@example.invalid'}));await waitBlocked(b,a);await a.ok('COMMIT;');
  const before=await snapshot();const r=await pending;assert.equal(r.state,changed?'22023':'00000');await b.ok(changed?'ROLLBACK;':'COMMIT;');assert.equal(await snapshot(),before);mark(8,'Concurrent idempotency',{changed,sqlstate:r.state});
 }
 // Deliberately unsafe model of reversed lock order: negative control only, then rollback.
 await reset();const beforeCycle=await snapshot();await a.begin();await b.begin();
 await a.ok('SELECT pg_advisory_xact_lock(777001);');await b.ok('SELECT id FROM model.space WHERE id=1 FOR UPDATE;');
 const wa=a.query('SELECT id FROM model.space WHERE id=1 FOR UPDATE;');await waitBlocked(a,b);
 const wb=b.query('SELECT pg_advisory_xact_lock(777001);');const cycle=await Promise.all([wa,wb]);
 assert.equal(cycle.filter(r=>r.state==='40P01').length,1);assert.equal(cycle.filter(r=>r.state==='00000').length,1);
 await a.rollback();await b.rollback();assert.equal(await snapshot(),beforeCycle);mark(9,'Negative reversed-order model reproduces deadlock',{sqlstates:cycle.map(r=>r.state)});
 // Corrected global request-first order: conflict after wait, no deadlock and no second effect.
 for(const first of ['seats','revoke']){
  await reset();await a.begin();await a.ok(call(1,'shared',first,first==='seats'?{count:9}:{}));await b.begin();
  const next=first==='seats'?'revoke':'seats';const pending=b.query(call(1,'shared',next,next==='seats'?{count:9}:{}));await waitBlocked(b,a);await a.ok('COMMIT;');
  const stable=await snapshot();assert.equal((await pending).state,'22023');await b.rollback();assert.equal(await snapshot(),stable);mark(9,'Uniform admin order prevents cycle',{first});
 }
 for(const first of ['terms','invite','active']){
  await reset();const p=first==='invite'?{address:'global@example.invalid'}:first==='active'?{person:10,value:false}:{};
  await a.begin();await a.ok(call(2,'shared',first,p));await b.begin();const pending=b.query(call(2,'shared',first==='terms'?'active':'terms',first==='terms'?{person:10,value:false}:{}));
  await waitBlocked(b,a);await a.ok('COMMIT;');const stable=await snapshot();assert.equal((await pending).state,'22023');await b.rollback();assert.equal(await snapshot(),stable);mark(9,'Uniform coach order prevents cycle',{first});
 }
 for(const guard of [true,false]){
  await reset();await o.ok('SELECT pg_advisory_lock(777002);');await a.begin();const pending=a.query(`SELECT model.late_claim(${guard},777002);`);await waitBlocked(a,o);
  await b.ok("INSERT INTO model.invite(space_id,address) VALUES(1,'late@example.invalid');");const stable=await snapshot();await o.ok('SELECT pg_advisory_unlock(777002);');
  const r=await pending;assert.equal(r.state,guard?'40001':'00000');if(!guard)assert.equal((await a.ok('SELECT count(*) FROM model.person WHERE id=88;'))[0],'1');
  await a.rollback();assert.equal(await snapshot(),stable);mark(10,guard?'Final target guard rejects late selection':'Negative control admits late selection then rolls back',{sqlstate:r.state});
 }
 for(const corruption of ['owner','capability']){
  await reset();await a.begin();await a.ok(corruption==='owner'?'UPDATE model.space SET owner_id=55 WHERE id=1;':'UPDATE model.cap SET enabled=false WHERE space_id=1;');
  // Capability mutation is serialized by the workspace row, as required by this model.
  if(corruption==='capability')await a.ok('SELECT id FROM model.space WHERE id=1 FOR UPDATE;');
  await b.begin();const pending=b.query(call(2,'wait','invite',{address:'corrupt@example.invalid'},true));await waitBlocked(b,a);await a.ok('COMMIT;');
  const stable=await snapshot();assert.equal((await pending).state,'42501');await b.rollback();assert.equal(await snapshot(),stable);mark(11,'Inconsistent state fails closed',{corruption});
 }
 await reset();await a.begin('REPEATABLE READ');assert.equal((await a.ok('SELECT model.context(2,1);'))[0],'t');
 await b.ok(call(1,'revoke','revoke'));assert.equal((await a.ok('SELECT model.context(2,1);'))[0],'t');await a.ok('COMMIT;');assert.equal((await a.ok('SELECT model.context(2,1);'))[0],'f');mark(12,'Snapshot visibility is not retroactive revocation');
 await revokeBefore(12,'invite',{address:'rr@example.invalid'},false,'REPEATABLE READ');
 await reset();const personal=await scalar('SELECT row_to_json(x)::text FROM model.personal x WHERE id=2;');
 await a.ok(call(4,'legacy','invite',{space:2,address:'legacy@example.invalid'},true));await a.ok(call(1,'revoke','revoke'));
 assert.equal(await scalar('SELECT model.context(4,2);'),'t');assert.equal(await scalar('SELECT row_to_json(x)::text FROM model.personal x WHERE id=2;'),personal);mark(12,'Unrelated legacy and personal model state preserved');
 assert.equal(new Set(results.map(r=>r.group)).size,12);
 const output={status:'PASS_SYNTHETIC_MODEL_MULTISESSION_ONLY',head_sha:process.env.GITHUB_SHA||null,postgres:version,completed_at:new Date().toISOString(),default_isolation:'READ COMMITTED',model_sha256:createHash('sha256').update(model).digest('hex'),sessions:sessions.map(s=>({name:s.name,pid:s.pid})),results,
 limits:['New synthetic model, not captured R5 SQL or hosted schema.','Compatibility means this model only, not application RPC parity.','No GoTrue, JWT, PostgREST, RLS, actual users or production permission changes.','Negative deadlock demonstrates the lock pattern, not execution of the private implementation.','Repeatable-read snapshots can retain previously visible data; new transaction denies after revocation.']};
 const dir=resolve('artifacts/ncc-concurrency');mkdirSync(dir,{recursive:true});writeFileSync(resolve(dir,'result.json'),JSON.stringify(output,null,2)+'\n');
 console.log('PASS 12 groups; synthetic PostgreSQL model only; feature remains OFF.');
}finally{for(const s of sessions){try{if(!s.pending)await s.rollback();}catch{}s.close();}}
