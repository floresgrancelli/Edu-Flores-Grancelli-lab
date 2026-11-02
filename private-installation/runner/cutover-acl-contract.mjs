import assert from 'node:assert/strict';
import {capturePermissions} from './acl-contract.mjs';
import {q} from './snapshot.mjs';
const targets=new Set(['public.efg_goals','public.efg_food_plans','public.efg_student_plan_access','public.efg_coach_plan_drafts']);
const legacy='public.efg_save_coach_plan_draft(uuid, jsonb, jsonb, timestamp with time zone, integer, bigint)';
function acl(entries,removed=''){
 return (entries||[]).flatMap(entry=>{
  const m=entry.match(/^([^=]*)=([^/]*)\/(.*)$/);assert.ok(m,'ACL syntax');
  let rights=m[2];if(['','anon','authenticated'].includes(m[1]))rights=rights.replace(/[A-Za-z]\*?/g,x=>removed.includes(x[0])?'':x);
  return rights?[m[1]+'='+rights+'/'+m[3]]:[];
 }).sort();
}
export function captureTriggers(sql){return JSON.parse(sql("select coalesce(jsonb_agg(jsonb_build_object('table',n.nspname||'.'||c.relname,'name',t.tgname,'function',t.tgfoid::regprocedure::text,'enabled',t.tgenabled,'type',t.tgtype,'definition',pg_get_triggerdef(t.oid)) order by n.nspname,c.relname,t.tgname),'[]'::jsonb) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','efg_private')"));}
export function verifyCutoverPermissions(sql,before,triggersBefore){
 const after=capturePermissions(sql);
 assert.deepEqual(after.defaults,before.defaults);assert.deepEqual(after.policies,before.policies);
 assert.deepEqual(after.tables.map(x=>x.name),before.tables.map(x=>x.name));
 for(const b of before.tables){const a=after.tables.find(x=>x.name===b.name);assert.equal(a.rls,b.rls);assert.deepEqual(acl(a.acl),acl(b.acl,targets.has(b.name)?'awdDxt':''),b.name);}
 const cols=(rows,filter)=>rows.map(x=>({...x,acl:acl(x.acl,filter&&targets.has(x.table)?'awx':'')})).filter(x=>x.acl.length);
 assert.deepEqual(cols(after.columns,false),cols(before.columns,true),'Exact column revocations only');
 const added=after.functions.filter(a=>!before.functions.some(b=>b.signature===a.signature));
 assert.deepEqual(added.map(x=>x.signature),['efg_private.require_coach119_publication_write()']);
 for(const b of before.functions){const a=after.functions.find(x=>x.signature===b.signature);assert.ok(a);assert.deepEqual(acl(a.acl),acl(b.acl,b.signature===legacy?'X':''),b.signature);}
 assert.ok(before.functions.some(x=>x.signature===legacy),'Legacy signature must be present');
 const reference=before.functions.find(x=>x.signature==='efg_private.block_bound_guide_publication()');assert.ok(reference);
 assert.deepEqual(acl(added[0].acl),acl(reference.acl),'Same unchanged private-trigger default ACL; no new grants');
 for(const role of ['anon','authenticated']){
  assert.equal(sql(`select has_function_privilege(${q(role)},'efg_private.require_coach119_publication_write()','EXECUTE')`),'f');
  assert.equal(sql(`select has_function_privilege(${q(role)},${q(legacy)},'EXECUTE')`),'f');
 }
 const helper=JSON.parse(sql("select jsonb_build_object('owner',pg_get_userbyid(proowner),'definer',prosecdef,'config',proconfig) from pg_proc where oid='efg_private.require_coach119_publication_write()'::regprocedure"));
 assert.deepEqual(helper,{owner:'postgres',definer:true,config:['search_path=""']});
 const triggersAfter=captureTriggers(sql),key=x=>x.table+'.'+x.name;
 for(const b of triggersBefore)assert.deepEqual(triggersAfter.find(x=>key(x)===key(b)),b,'Existing trigger unchanged');
 const fresh=triggersAfter.filter(a=>!triggersBefore.some(b=>key(a)===key(b)));
 assert.deepEqual(fresh.map(key).sort(),['public.efg_goals.coach119_only_goal_write','public.efg_food_plans.coach119_only_guide_write','public.efg_student_plan_access.coach119_only_access_write'].sort());
 for(const t of fresh){assert.equal(t.function,'efg_private.require_coach119_publication_write()');assert.equal(t.enabled,'O');assert.equal(t.type,31,'ROW BEFORE INSERT DELETE UPDATE');}
 return {before,after,triggersBefore,triggersAfter,verified:true};
}
