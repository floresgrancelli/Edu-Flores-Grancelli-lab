// Preparation only. Executes exclusively when called by the attested disposable runner.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {q} from '../runner/snapshot.mjs';
import {yes} from '../runner/local-context.mjs';
import {projection} from './tests/bridge-http-contract.mjs';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
export const frame=r=>({draft:r.draft_revision,intake:r.intake_revision,health:r.health_revision,catalog:r.catalog_digest,goal:r.goal,declaration:r.restriction_declaration,pattern:r.compatibility.pattern});
export function bridgeFixtures({sql,rpc,fresh,users,snapshot,intake}){
 const deadlines=JSON.parse(sql("select jsonb_agg(jsonb_build_object('id',food_id,'expires',expires_at)) from efg_private.coach_reviewed_foods"));
 const resetDates=()=>sql(deadlines.map(f=>`update efg_private.coach_reviewed_foods set expires_at=${q(f.expires)}::timestamptz where food_id=${q(f.id)};`).join(''));
 async function newFixture(side='A'){
  resetDates();const f=await fresh(side);
  const row=yes(await rpc('efg_read_bound_guide',f.coach.token,{p_student:f.student.id}),'bridge fresh read');
  return {...f,row,args:{p_student:f.student.id,p_expected:frame(row),p_recipe:projection(row.guide),p_request_key:randomUUID()}};
 }
 async function lockStudent(id){
  let output='',error=false;const child=spawn('psql',['-X','-Atq','-v','ON_ERROR_STOP=1'],{env:{...process.env,PGHOST:'127.0.0.1',PGPORT:'54322',PGUSER:'postgres',PGPASSWORD:'postgres',PGDATABASE:'postgres'},stdio:['pipe','pipe','pipe']});
  child.stdout.on('data',d=>output+=String(d));child.stderr.on('data',()=>error=true);child.on('error',()=>error=true);child.stdin.on('error',()=>error=true);
  const closed=new Promise(r=>child.on('close',r));
  child.stdin.write(`begin;select student_id from public.efg_student_plan_access where student_id=${q(id)} for update;select 'BRIDGE_LOCKED';\n`);
  try{for(let i=0;i<100&&!output.includes('BRIDGE_LOCKED');i++){assert.equal(error,false);await delay(30);}
   assert.ok(output.includes('BRIDGE_LOCKED'));
  }catch(e){if(!child.stdin.writableEnded)child.stdin.end('rollback;\n\\q\n');await closed;throw e;}
  return async()=>{if(!child.stdin.writableEnded)child.stdin.end('rollback;\n\\q\n');assert.equal(await closed,0);assert.equal(error,false);};
 }
 async function make(name,{method}){
  const f=await newFixture();let unlock=null,watcher=null,observed=false,mutation=false;
  if(name==='revoked')yes(await rpc('efg_revoke_coach_health_intake',f.student.token,{p_expected_revision:f.row.health_revision}),'fixture revoke');
  if(name==='intake_changed')yes(await rpc('efg_submit_coach_relaunch_intake',f.student.token,intake(f.row.intake_revision,true)),'fixture revised intake');
  if(name==='source_changed')sql(`update efg_private.coach_reviewed_foods set expires_at=clock_timestamp()-interval '1 second' where food_id=${q(f.args.p_recipe.meals[0].items[0].id)}`);
  if(name.startsWith('expired_during_')){
   // Bind the changed expiry before obtaining expected context, so the failure
   // cannot be attributed merely to an old catalogue digest.
   sql(`update efg_private.coach_reviewed_foods set expires_at=clock_timestamp()+interval '4 seconds';update efg_private.guide_source_bindings set catalog_digest=efg_private.guide_catalog_digest(food_ids) where student_id=${q(f.student.id)};`);
   f.row=yes(await rpc('efg_read_bound_guide',f.coach.token,{p_student:f.student.id}),'fresh short TTL');f.args.p_expected=frame(f.row);
   if(name==='expired_during_wait'){
    unlock=await lockStudent(f.student.id);
    watcher=(async()=>{
     for(let i=0;i<100;i++){
      if(sql(`select exists(select 1 from pg_stat_activity where pid<>pg_backend_pid() and wait_event_type='Lock' and query like '%efg_${method}_clinical_bound_recipe%')`)==='t'){observed=true;break;}await delay(30);
     }
     try{assert.ok(observed,'Actual RPC lock wait required');await delay(4200);}finally{await unlock();unlock=null;}
    })();
    // Attach rejection immediately; cleanup still propagates the same failure.
    watcher.catch(()=>{});
   }else{
    sql(`create sequence efg_private.qa_bridge_mutation_probe;
     revoke all on sequence efg_private.qa_bridge_mutation_probe from public,anon,authenticated;
     create function efg_private.qa_bridge_save_pause() returns trigger language plpgsql set search_path='' as $$begin
      if new.student_id=${q(f.student.id)}::uuid and new.draft_revision>old.draft_revision then
       perform nextval('efg_private.qa_bridge_mutation_probe');perform pg_sleep(5);
      end if;return new;end$$;
     revoke all on function efg_private.qa_bridge_save_pause() from public,anon,authenticated;
     create trigger qa_bridge_save_pause after update on public.efg_coach_plan_drafts for each row execute function efg_private.qa_bridge_save_pause();`);
   }
  }
  return {coachToken:f.coach.token,args:f.args,snapshot,
   pauseWasReached:async()=>{if(watcher){await watcher;return observed;}return sql("select is_called from efg_private.qa_bridge_mutation_probe")==='t';},
   mutationReached:async()=>sql("select is_called from efg_private.qa_bridge_mutation_probe")==='t',
   cleanup:async()=>{
    try{if(watcher)await watcher;}finally{
     if(unlock)await unlock();
     sql('drop trigger if exists qa_bridge_save_pause on public.efg_coach_plan_drafts;drop function if exists efg_private.qa_bridge_save_pause();drop sequence if exists efg_private.qa_bridge_mutation_probe;');resetDates();
    }
   }};
 }
 return {newFixture,cases:Object.fromEntries(['revoked','source_changed','intake_changed','expired_during_wait','expired_during_save'].map(name=>[name,options=>make(name,options)])),resetDates};
}
