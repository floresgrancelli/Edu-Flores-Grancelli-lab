import assert from 'node:assert/strict';
import {q} from './snapshot.mjs';
// Explicit, reviewable list; not inferred from whatever objects happen to exist.
export const newTables=['efg_private.nutrition_import_policies','efg_private.efg_coach_health_documents','efg_private.efg_coach_health_intakes','efg_private.efg_coach_health_revocations','efg_private.guide_source_bindings','public.efg_coach_plan_publish_receipts','efg_private.coach_guide_history','efg_private.coach119_atomic_transactions'];
export const newFunctions={
 'efg_private.coach_food_evidence_current(efg_private.coach_reviewed_foods)':false,
 'public.efg_current_coach_health_document()':true,
 'public.efg_submit_coach_health_intake(jsonb,uuid,text,integer,boolean,boolean)':true,
 'public.efg_get_coach_health_intake(uuid)':true,
 'public.efg_revoke_coach_health_intake(integer)':true,
 'efg_private.coach_pilot_share_active(uuid,uuid)':true,
 'public.efg_coach_pilot_entry_status()':true,
 'public.efg_declare_no_restrictions(uuid,text,integer,boolean,boolean)':true,
 'efg_private.guide_catalog_digest(text[])':false,
 'efg_private.guide_binding_current(uuid)':true,
 'public.efg_prepare_bound_guide(uuid,jsonb,integer,integer,text[],text[],text[],bigint)':true,
 'public.efg_read_bound_guide(uuid)':true,
 'public.efg_save_bound_guide(uuid,bigint,text,jsonb)':true,
 'efg_private.block_bound_guide_publication()':false,
 'efg_private.coach119_archive_replaced_guide()':false,
 'efg_private.coach119_is_atomic_transaction()':false,
 'efg_private.coach119_reviewed_food_ids(jsonb)':false,
 'efg_private.coach119_validate_bound(uuid)':false,
 'public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)':true
};
const scope="n.nspname='efg_private' or n.nspname='public' and p.proname like 'efg_%'";
export function capturePermissions(sql){return JSON.parse(sql(`select jsonb_build_object(
 'defaults',(select coalesce(jsonb_agg(to_jsonb(d) order by d.defaclrole,d.defaclnamespace,d.defaclobjtype),'[]'::jsonb) from pg_default_acl d),
 'policies',(select coalesce(jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname),'[]'::jsonb) from pg_policies p where schemaname in ('public','efg_private')),
 'columns',(select coalesce(jsonb_agg(jsonb_build_object('table',n.nspname||'.'||c.relname,'column',a.attname,'acl',a.attacl) order by n.nspname,c.relname,a.attname),'[]'::jsonb) from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace where a.attnum>0 and not a.attisdropped and a.attacl is not null and n.nspname in ('public','efg_private')),
 'tables',(select coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'rls',c.relrowsecurity,'acl',coalesce(c.relacl,acldefault('r',c.relowner))) order by n.nspname,c.relname),'[]'::jsonb) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in ('public','efg_private')),
 'functions',(select coalesce(jsonb_agg(jsonb_build_object('signature',n.nspname||'.'||p.proname||'('||oidvectortypes(p.proargtypes)||')','acl',coalesce(p.proacl,acldefault('f',p.proowner))) order by n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]'::jsonb) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where ${scope}))`));}
function canonical(rows){return rows.map(x=>`${x.grantee}/${x.privilege_type}/${x.is_grantable}`).sort();}
function actual(sql,kind,identity){
 const obj=kind==='f'?`select p.proacl acl,p.proowner owner from pg_proc p where p.oid=${q(identity)}::regprocedure`:`select c.relacl acl,c.relowner owner from pg_class c where c.oid=${q(identity)}::regclass`;
 return canonical(JSON.parse(sql(`select coalesce(jsonb_agg(jsonb_build_object('grantee',case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,'privilege_type',a.privilege_type,'is_grantable',a.is_grantable)),'[]'::jsonb) from (${obj}) o cross join lateral aclexplode(coalesce(o.acl,acldefault(${q(kind)},o.owner))) a`)));
}
function expected(sql,kind,schema,auth){
 // PostgreSQL global defaults replace hardwired defaults; schema defaults add.
 // Compare default ACL snapshot unchanged before using it; never bless new defaults.
 const rows=JSON.parse(sql(`with owner as(select oid from pg_roles where rolname='postgres'), initial as(
 select coalesce((select d.defaclacl from pg_default_acl d,owner o where d.defaclrole=o.oid and d.defaclnamespace=0 and d.defaclobjtype=${q(kind)}),acldefault(${q(kind)},(select oid from owner))) acl
 union all select d.defaclacl from pg_default_acl d,owner o where d.defaclrole=o.oid and d.defaclnamespace=${q(schema)}::regnamespace and d.defaclobjtype=${q(kind)}
 ) select coalesce(jsonb_agg(distinct jsonb_build_object('grantee',case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,'privilege_type',a.privilege_type,'is_grantable',a.is_grantable)),'[]'::jsonb) from initial cross join lateral aclexplode(initial.acl) a`));
 const filtered=rows.filter(x=>!['PUBLIC','anon','authenticated'].includes(x.grantee));
 if(auth)filtered.push({grantee:'authenticated',privilege_type:'EXECUTE',is_grantable:false});
 return canonical(filtered);
}
export function verifyPermissions(sql,before){
 const after=capturePermissions(sql);assert.deepEqual(after.defaults,before.defaults,'No default ACL changes');assert.deepEqual(after.columns,before.columns,'No new column grants');
 const policyKey=p=>p.schemaname+'.'+p.tablename+'.'+p.policyname;
 const oldPolicies=new Map(before.policies.map(p=>[policyKey(p),p]));
 const added=after.policies.filter(p=>!oldPolicies.has(policyKey(p)));
 assert.equal(added.length,1);assert.equal(policyKey(added[0]),'public.efg_coach_plan_drafts.guide_bound_draft_current');
 assert.equal(added[0].permissive,'RESTRICTIVE');assert.equal(added[0].cmd,'SELECT');assert.deepEqual(added[0].roles,['authenticated']);
 assert.equal(added[0].qual.replaceAll(/\s/g,''),'efg_private.guide_binding_current(student_id)');assert.equal(added[0].with_check,null);
 const changed=after.policies.filter(p=>oldPolicies.has(policyKey(p))&&JSON.stringify(p)!==JSON.stringify(oldPolicies.get(policyKey(p)))).map(policyKey).sort();
 assert.deepEqual(changed,['public.efg_coach_plan_drafts.coach_draft_read_own','public.efg_coach_relaunch_intakes.efg_coach_relaunch_owner_select','public.efg_coach_relaunch_intakes.efg_coach_relaunch_shared_coach_select','public.efg_pilot_participation_receipts.efg_pilot_participation_owner_read'].sort());
 assert.ok([...oldPolicies.keys()].every(k=>after.policies.some(p=>policyKey(p)===k)),'No policies dropped');
 const beforeTables=new Map(before.tables.map(x=>[x.name,x]));
 assert.deepEqual(after.tables.filter(x=>!beforeTables.has(x.name)).map(x=>x.name).sort(),[...newTables].sort(),'Complete new-table set');
 const beforeFns=new Map(before.functions.map(x=>[x.signature,x]));
 assert.deepEqual(after.functions.filter(x=>!beforeFns.has(x.signature)).map(x=>x.signature.replaceAll(', ',',' )).sort(),Object.keys(newFunctions).sort(),'Complete new-RPC/helper set');
 for(const t of after.tables){if(beforeTables.has(t.name)){assert.deepEqual([...t.acl].sort(),[...beforeTables.get(t.name).acl].sort(),`Existing table ACL ${t.name}`);continue;}assert.equal(t.rls,true);assert.deepEqual(actual(sql,'r',t.name),expected(sql,'r',t.name.split('.')[0],false),`Exact new table ACL ${t.name}`);}
 for(const f of after.functions){if(beforeFns.has(f.signature)){assert.deepEqual([...f.acl].sort(),[...beforeFns.get(f.signature).acl].sort(),`Existing function ACL ${f.signature}`);continue;}const key=f.signature.replaceAll(', ',',');assert.deepEqual(actual(sql,'f',key),expected(sql,'f',key.split('.')[0],newFunctions[key]),`Exact function ACL ${key}`);}
 return after;
}
