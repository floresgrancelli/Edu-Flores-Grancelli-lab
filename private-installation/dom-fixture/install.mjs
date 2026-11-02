// Preparation only. Invoked BEFORE creating accounts, never on a populated DB.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {attestDatabase} from '../runner/isolation.mjs';
import {q} from '../runner/snapshot.mjs';
import {capturePermissions} from '../runner/acl-contract.mjs';
export const tables=['efg_activities','efg_billing_settings','efg_invitations','efg_payments','efg_personal_targets','efg_weights','efg_daily_logs','efg_weekly_reports'];
const sorted=x=>[...x].map(v=>JSON.stringify(Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))))).sort();
function acl(sql,kind,target){
 const object=kind==='r'?`select relacl a,relowner o from pg_class where oid=${q('public.'+target)}::regclass`:`select proacl a,proowner o from pg_proc where oid='public.efg_claim_invitation()'::regprocedure`;
 return JSON.parse(sql(`select coalesce(jsonb_agg(jsonb_build_object('role',case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end,'privilege',x.privilege_type,'grantable',x.is_grantable)),'[]') from (${object}) s cross join lateral aclexplode(coalesce(s.a,acldefault(${q(kind)},s.o))) x`));
}
function expectedNewAcl(sql,kind){
 const inherited=JSON.parse(sql(`with owner as(select oid from pg_roles where rolname='postgres'), a as(
 select coalesce((select defaclacl from pg_default_acl d,owner o where d.defaclrole=o.oid and d.defaclnamespace=0 and d.defaclobjtype=${q(kind)}),acldefault(${q(kind)},(select oid from owner))) acl
 union all select defaclacl from pg_default_acl d,owner o where d.defaclrole=o.oid and d.defaclnamespace='public'::regnamespace and d.defaclobjtype=${q(kind)})
 select coalesce(jsonb_agg(distinct jsonb_build_object('role',case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end,'privilege',x.privilege_type,'grantable',x.is_grantable)),'[]') from a cross join lateral aclexplode(a.acl) x`));
 return [...inherited.filter(x=>!['PUBLIC','anon','authenticated'].includes(x.role)),{role:'authenticated',privilege:kind==='r'?'SELECT':'EXECUTE',grantable:false}];
}
export function installDomFixture({sql,out}){
 assert.equal(process.env.EFG_QA_DOM_FIXTURE,'1');
 assert.ok(process.env.EFG_QA_DOM_FIXTURE_ONLY==='1'||process.env.EFG_QA_CLINICAL_BRIDGE_MODE==='rpc-dom'||process.env.EFG_QA_DIARY_FIXTURE==='1');
 const identity=attestDatabase(sql); // Docker identity, system ID, ports/config, no hosted override.
 assert.equal(sql('select count(*) from auth.users'),'0');
 assert.equal(sql('select count(*) from public.efg_profiles'),'0');assert.equal(sql('select count(*) from public.efg_organizations'),'0');
 for(const t of tables)assert.equal(sql(`select to_regclass(${q('public.'+t)}) is null`),'t');
 const before=capturePermissions(sql),orgBefore=acl(sql,'r','efg_organizations');
 const ddl=readFileSync(new URL('./minimal-dom-fixture.PROPOSAL.sql',import.meta.url),'utf8');
 sql("begin;set local efg.qa.dom_fixture='attested_empty_incremental';\n"+ddl+"\ncommit;");
 const after=capturePermissions(sql);
 assert.deepEqual(after.defaults,before.defaults);assert.deepEqual(after.columns,before.columns);
 const beforeNames=new Set(before.tables.map(t=>t.name));
 assert.deepEqual(after.tables.filter(t=>!beforeNames.has(t.name)).map(t=>t.name).sort(),tables.map(t=>'public.'+t).sort());
 for(const t of before.tables)if(t.name!=='public.efg_organizations')assert.deepEqual(after.tables.find(x=>x.name===t.name),t);
 assert.deepEqual(sorted(acl(sql,'r','efg_organizations')),sorted([...orgBefore,{role:'authenticated',privilege:'SELECT',grantable:false}]));
 for(const t of tables){
  assert.equal(after.tables.find(x=>x.name==='public.'+t).rls,true);
  assert.deepEqual(sorted(acl(sql,'r',t)),sorted(expectedNewAcl(sql,'r')));
  for(const role of ['anon','authenticated'])for(const privilege of ['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'])assert.equal(sql(`select has_table_privilege(${q(role)},${q('public.'+t)},${q(privilege)})`),'f');
 }
 const pk=p=>p.schemaname+'.'+p.tablename+'.'+p.policyname;
 for(const p of before.policies)assert.deepEqual(after.policies.find(x=>pk(x)===pk(p)),p);
 const added=after.policies.filter(p=>!before.policies.some(b=>pk(b)===pk(p)));
 assert.deepEqual(added.map(pk).sort(),[...tables.map(t=>'public.'+t+'.dom_fixture_read'),'public.efg_organizations.dom_fixture_org_read'].sort());
 for(const p of added){assert.equal(p.cmd,'SELECT');assert.deepEqual(p.roles,['authenticated']);assert.equal(p.permissive,'PERMISSIVE');assert.equal(p.with_check,null);assert.ok(p.qual);}
 for(const f of before.functions)assert.deepEqual(after.functions.find(x=>x.signature===f.signature),f);
 assert.deepEqual(after.functions.filter(f=>!before.functions.some(b=>b.signature===f.signature)).map(f=>f.signature),['public.efg_claim_invitation()']);
 assert.deepEqual(sorted(acl(sql,'f')),sorted(expectedNewAcl(sql,'f')));
 writeFileSync(out+'/dom-fixture-acl.json',JSON.stringify({before,after,containerId:identity.containerId,verified:true,limits:['Synthetic read-only fixture; not hosted policy restoration']},null,2));
 return after;
}

