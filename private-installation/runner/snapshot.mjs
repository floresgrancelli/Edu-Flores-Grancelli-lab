import assert from 'node:assert/strict';
export const qi=x=>'"'+x.replaceAll('"','""')+'"';
export const q=x=>"'"+String(x).replaceAll("'","''")+"'";
export const rowSnapshot=(sql,tables)=>Object.fromEntries(tables.map(t=>[t,sql(`select coalesce(jsonb_agg(payload order by payload::text),'[]'::jsonb)::text from (select to_jsonb(t) payload from ${t} t) s`)]));
export function aclSnapshot(sql){return JSON.parse(sql(`select jsonb_build_object(
 'tables',(select jsonb_agg(to_jsonb(x) order by x.schema,x.name) from(select n.nspname schema,c.relname name,c.relrowsecurity rls,c.relforcerowsecurity force,c.relacl::text acl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','efg_private') and c.relkind='r' and (c.relname like 'efg_%' or n.nspname='efg_private'))x),
 'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p where schemaname in ('public','efg_private')),
 'functions',(select jsonb_agg(to_jsonb(x) order by signature) from(select p.oid::regprocedure::text signature,p.proacl::text acl,p.prosecdef definer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='efg_private' or n.nspname='public' and p.proname like 'efg_%')x))`));}
export function verifyObserved(sql,m){
 for(const c of m.structure.columns){
  const got=JSON.parse(sql(`select jsonb_build_object('data_type',data_type,'is_nullable',is_nullable,'column_default',column_default) from information_schema.columns where table_schema=${q(c.table_schema)} and table_name=${q(c.table_name)} and column_name=${q(c.column_name)}`));
  assert.deepEqual(got,{data_type:c.data_type,is_nullable:c.is_nullable,column_default:c.column_default},`column ${c.table_name}.${c.column_name}`);
 }
 for(const c of m.structure.constraints){assert.equal(sql(`set search_path=public,pg_catalog; select pg_get_constraintdef(oid) from pg_constraint where conrelid=${q(c.nspname+'.'+c.relname)}::regclass and conname=${q(c.conname)}`),c.definition,`constraint ${c.conname}`);}
 for(const p of m.structure.policies){
  const got=JSON.parse(sql(`select to_jsonb(p) from pg_policies p where schemaname=${q(p.schemaname)} and tablename=${q(p.tablename)} and policyname=${q(p.policyname)}`));
  for(const k of ['cmd','qual','roles','permissive','with_check'])assert.deepEqual(got[k],p[k],`policy ${p.policyname}.${k}`);
 }
 for(const f of m.functions.functions)verifyObservedFunction(sql,f);
}
export function observedFunctionIdentityQuery(f){
 return `select coalesce(jsonb_agg(jsonb_build_object('digest',md5(pg_get_functiondef(p.oid)))),'[]'::jsonb) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=${q(f.nspname)} and p.proname=${q(f.proname)} and pg_get_function_identity_arguments(p.oid)=${q(f.arguments)}`;
}
export function verifyObservedFunction(sql,f){
 const matches=JSON.parse(sql(observedFunctionIdentityQuery(f)));
 assert.equal(matches.length,1,`Unique exact identity required: ${f.nspname}.${f.proname}`);
 assert.equal(matches[0].digest,f.definition_digest,`function ${f.proname}`);
}
