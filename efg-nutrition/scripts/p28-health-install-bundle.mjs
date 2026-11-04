// Deterministic preparation only: never connects to any database.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const q=s=>"'"+s.replaceAll("'","''")+"'";
const columns={
 'public.efg_profiles':{user_id:'uuid',organization_id:'uuid',role:'text',active:'boolean'},
 'public.efg_organizations':{id:'uuid'},
 'public.efg_consents':{student_id:'uuid',organization_id:'uuid',accepted:'boolean'},
 'public.efg_coach_plan_drafts':{student_id:'uuid',organization_id:'uuid',coach_id:'uuid',guide_proposal:'jsonb',status:'text'},
 'efg_private.coach_release_switches':{switch_key:'text',enabled:'boolean',notes:'text'}
};
const functions={
 'auth.uid()':'uuid',
 'efg_private.coach_has_student(uuid)':'boolean',
 'public.efg_legal_current_status()':'TABLE(kind text, document_id uuid, version text, sha256 text, accepted boolean)',
 'public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)':'uuid'
};
const tables=['efg_coach_health_documents','efg_coach_health_intakes','efg_coach_health_revocations'].map(n=>'efg_private.'+n);
const newFunctions=['public.efg_current_coach_health_document()','public.efg_get_coach_health_intake(uuid)',
 'public.efg_declare_no_restrictions(uuid,text,integer,boolean,boolean)',
 'public.efg_submit_coach_health_intake(jsonb,uuid,text,integer,boolean,boolean)',
 'public.efg_revoke_coach_health_intake(integer)','efg_private.p28_require_current_health_source()'];
const checks=[];
for(const [table,cols] of Object.entries(columns))for(const [col,type] of Object.entries(cols))checks.push([table+'.'+col,`exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass(${q(table)}) and a.attname=${q(col)} and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)=${q(type)})`]);
for(const [sig,result] of Object.entries(functions))checks.push([sig,`exists(select 1 from pg_catalog.pg_proc p where p.oid=pg_catalog.to_regprocedure(${q(sig)}) and pg_catalog.pg_get_function_result(p.oid)=${q(result)})`]);
for(const name of tables)checks.push(['absent '+name,`pg_catalog.to_regclass(${q(name)}) is null`]);
for(const name of newFunctions)checks.push(['absent '+name,`pg_catalog.to_regprocedure(${q(name)}) is null`]);
checks.push(['no draft trigger',`not exists(select 1 from pg_catalog.pg_trigger where tgrelid=pg_catalog.to_regclass('public.efg_coach_plan_drafts') and not tgisinternal)`]);
checks.push(['switch insert defaults',`not exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=pg_catalog.to_regclass('efg_private.coach_release_switches') and a.attnum>0 and not a.attisdropped and a.attnotnull and a.attname not in ('switch_key','enabled','notes') and not a.atthasdef and a.attidentity='' and a.attgenerated='')`]);
// Switch table presence is checked above; no patient/clinical rows are read.
checks.push(['release switches OFF',`not exists(select 1 from efg_private.coach_release_switches where enabled is distinct from false)`]);
checks.push(['publication switch exists',`exists(select 1 from efg_private.coach_release_switches where switch_key='pilot_coach_atomic_publication' and enabled=false)`]);
checks.push(['new health switch absent',`not exists(select 1 from efg_private.coach_release_switches where switch_key='pilot_health_bound_publication')`]);
export const preflightSelect=`select check_id,passed from (values\n${checks.map(([id,expr])=>` (${q(id)},(${expr}))`).join(',\n')}\n) as checks(check_id,passed) order by check_id;`;
const preflightGuard=`do $p28_preflight$\ndeclare failures text;\nbegin\n select string_agg(check_id,', ') into failures from (${preflightSelect.slice(0,-1)}) c where passed is distinct from true;\n if failures is not null then raise exception 'P28 INSTALL STOP: %',failures using errcode='55000'; end if;\nend $p28_preflight$;`;
const health=read('../docs/CLIN_GUT_03_PRIVATE_HEALTH_INTAKE_STAGING_ONLY.sql');
const guard=read('../docs/P28_HEALTH_BOUND_PUBLICATION_STAGING_ONLY.sql');
function body(s,start){const a=s.indexOf(start),b=s.lastIndexOf('\ncommit;');if(a<0||b<a)throw Error('SQL source markers changed');return s.slice(a,b);}
export const installSql=`-- P28F prepared additive installation. Requires owner authorization for hosted execution.\n-- No documents, identities, historical changes or enabled flags. One transaction.\n-- Project intended: cyjvddhimbsfipjfctsl; operator must verify tool project_id.\nbegin;\nset local lock_timeout='3s';\nset local statement_timeout='30s';\n${preflightGuard}\n${body(health,'create table efg_private.efg_coach_health_documents(')}\n${body(guard,'insert into efg_private.coach_release_switches(')}\n-- Enforce safe initial state before committing the additive installation.\ndo $p28_post$\nbegin\n if exists(select 1 from efg_private.efg_coach_health_documents)\n or exists(select 1 from efg_private.efg_coach_health_intakes)\n or exists(select 1 from efg_private.efg_coach_health_revocations)\n or (select enabled from efg_private.coach_release_switches where switch_key='pilot_health_bound_publication') is distinct from false then\n  raise exception 'P28 INSTALL STOP: initial state not empty and OFF';\n end if;\nend $p28_post$;\nnotify pgrst, 'reload schema';\ncommit;\n`;
export const sourceSha256={health:createHash('sha256').update(health).digest('hex'),guard:createHash('sha256').update(guard).digest('hex'),bundle:createHash('sha256').update(installSql).digest('hex')};
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const mode=process.argv[2];
 if(mode==='--write'){
  writeFileSync(new URL('../docs/P28_PRIVATE_HEALTH_INSTALL_NOT_APPLIED.sql',import.meta.url),installSql);
  writeFileSync(new URL('../tests/sql/p28-health-install-readonly-preflight.sql',import.meta.url),preflightSelect+'\n');
 }else if(mode==='--check'){
  if(read('../docs/P28_PRIVATE_HEALTH_INSTALL_NOT_APPLIED.sql')!==installSql||read('../tests/sql/p28-health-install-readonly-preflight.sql')!==preflightSelect+'\n')throw Error('Generated package differs from tested sources');
 }else throw Error('Use --write or --check (no connection/execution supported)');
 console.log(JSON.stringify(sourceSha256));
}
