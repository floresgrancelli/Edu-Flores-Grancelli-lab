// COACH94 — Supabase platform-aware PRIVATE export validation and PG17 restore.
// Roles/schema/data must be exported by Supabase CLI, NOT generic pg_dump.
// No network operations, no remote DB writes, no secrets or row data logged.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lstat,open,readFile,realpath,stat} from 'node:fs/promises';
import {isAbsolute,join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const PROJECT='cyjvddhimbsfipjfctsl',DB='efg_coach94_disposable_restore';
const FILENAMES=['roles.sql','schema.sql','data.sql'];
const MANIFEST='coach94-private-manifest.json';
const stop=msg=>{throw Error('COACH94 STOP: '+msg);};
const within=(child,parent)=>child===parent||child.startsWith(parent+sep);
const relation=(verb,schema,table)=>new RegExp(
 '\\b'+verb+'\\s+"?'+schema+'"?\\s*\\.\\s*"?'+table+'"?(?=\\s|\\(|;|$)','i');

export function validatePlatformSQLTriplet({roles,schema,data}={}){
 if([roles,schema,data].some(v=>typeof v!=='string'||v.length<80))
  stop('three nonempty independent Supabase CLI dumps required');
 // Never allow shell/psql redirection to unexpected hosts or local programs.
 for(const file of [roles,schema,data]){
  if(/^\s*\\(?:!|connect|c\s|i\s|ir\s|include|o\s|gexec|copy\s|set\s)/im.test(file)||
      /\b(?:DROP\s+DATABASE|CREATE\s+DATABASE|ALTER\s+SYSTEM|COPY\s+.*\bPROGRAM\b)\b/i.test(file))
   stop('unexpected database or psql redirection command');
 }
 if(!/\b(?:CREATE|ALTER)\s+ROLE\b/i.test(roles))
  stop('missing Supabase role metadata');
 for(const table of ['efg_profiles','efg_organizations','efg_goals','efg_food_plans','efg_daily_logs']){
  if(!relation('CREATE\\s+TABLE(?:\\s+IF\\s+NOT\\s+EXISTS)?','public',table).test(schema))
   stop('schema missing required EFG table');
  if(!relation('COPY','public',table).test(data))
   stop('data dump missing required EFG table COPY');
 }
 if(!/\bCREATE\s+POLICY\b/i.test(schema)||
    !/\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b/i.test(schema))
  stop('schema lacks RLS policies or function definitions');
 if(!relation('COPY','auth','users').test(data)||
    !relation('COPY','storage','objects').test(data))
  stop('Auth users or Storage metadata omitted from data dump');
 // Storage objects here are metadata, NOT private physical receipt bytes.
 return {minimum_sql_triplet_checks_pass:true,storage_bytes_present:false,
  actual_restore_verified:false};
}
export function validateLocalRestoreTarget(env={}){
 if(env.CI==='true'||env.GITHUB_ACTIONS==='true')stop('real data prohibited in CI');
 if(env.EFG_COACH94_MANUAL_ACK!=='LOCAL_PRIVATE_RESTORE_REHEARSAL')
  stop('manual local acknowledgment required');
 for(const k of ['PGSERVICE','PGSERVICEFILE','PGHOSTADDR','PGOPTIONS','PGSYSCONFDIR']){
  if(env[k])stop('unexpected database connection override');
 }
 if(env.PGHOST!=='127.0.0.1'||env.PGPORT!=='5432'||
    env.PGDATABASE!==DB||env.PGUSER!=='postgres'||
    env.EFG_COACH94_RESTORE_ACK!=='I_ACCEPT_ISOLATED_PG17_WRITES')
  stop('only dedicated loopback disposable PG17 database is permitted');
 return true;
}
async function privateDir(root){
 if(!isAbsolute(root))stop('absolute private path required');
 const st=await lstat(root);
 if(!st.isDirectory()||st.isSymbolicLink())stop('real directory required');
 const d=await realpath(root),repo=await realpath(fileURLToPath(new URL('../../',import.meta.url)));
 if(within(d,repo)||within(repo,d))stop('backup must remain outside repository');
 const dir=await stat(d);
 if((dir.mode&0o077)!==0)stop('private directory must have 0700 permissions');
 return d;
}
async function privateFile(path){
 const st=await lstat(path);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
    (st.mode&0o077)!==0||st.size<80||st.size>1024*1024*1024)
  stop('private SQL file must be regular 0600 within size bounds');
 return readFile(path);
}
export async function inspectPlatformTriplet(root,{requireManifest=true}={}){
 const dir=await privateDir(root),contents=[],files={};
 for(const file of FILENAMES){
  const b=await privateFile(join(dir,file));
  contents.push(b.toString('utf8'));
  files[file]={bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};
 }
 const result=validatePlatformSQLTriplet({roles:contents[0],schema:contents[1],data:contents[2]});
 if(requireManifest){
  const m=JSON.parse((await privateFile(join(dir,MANIFEST))).toString('utf8'));
  if(m.kind!=='COACH94_SUPABASE_PLATFORM_TRIPLET_V1'||m.project!==PROJECT||
     JSON.stringify(m.files)!==JSON.stringify(files))
   stop('export changed or private manifest does not match');
 }
 return {dir,files,result};
}
function run(name,args){
 try{return execFileSync(name,args,{encoding:'utf8',timeout:300000,
  maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']}).trim();}
 catch{stop('private PostgreSQL command failed; investigate without logging data or credentials');}
}
async function main(){
 const [mode,raw]=process.argv.slice(2);
 if(!['seal','verify','restore'].includes(mode)||!raw)
  stop('usage: seal|verify|restore /absolute/private/export-directory');
 if(process.env.CI==='true'||process.env.GITHUB_ACTIONS==='true'||
    process.env.EFG_COACH94_MANUAL_ACK!=='LOCAL_PRIVATE_RESTORE_REHEARSAL')
  stop('manual private workstation only, never CI');
 if(mode==='restore')validateLocalRestoreTarget(process.env);
 const evidence=await inspectPlatformTriplet(raw,{requireManifest:mode!=='seal'});
 if(mode==='seal'){
  const manifest={kind:'COACH94_SUPABASE_PLATFORM_TRIPLET_V1',project:PROJECT,files:evidence.files};
  const file=await open(join(evidence.dir,MANIFEST),'wx',0o600);
  try{await file.writeFile(JSON.stringify(manifest,null,2)+'\n');}
  finally{await file.close();}
  console.log('COACH94: private local export manifest sealed. RESTORE NOT YET TESTED.');
 }else if(mode==='verify'){
  console.log('COACH94: three private export parts match sealed hashes. RESTORE NOT YET TESTED.');
 }else{
  const version=run('psql',['-X','-A','-t','-q','-v','ON_ERROR_STOP=1','-c','show server_version_num']);
  const db=run('psql',['-X','-A','-t','-q','-v','ON_ERROR_STOP=1','-c','select current_database()']);
  if(!/^17\d{4}$/.test(version)||db!==DB)stop('expected isolated PostgreSQL 17');
  const pre=run('psql',['-X','-A','-t','-q','-v','ON_ERROR_STOP=1','-c',
   "select (to_regclass('auth.users') is not null)::int || ',' || (to_regclass('storage.objects') is not null)::int || ',' || (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'efg_%' and c.relkind='r')"]);
  if(pre!=='1,1,0')stop('need clean preinitialized isolated Supabase Auth/Storage PG17');
  const users=run('psql',['-X','-A','-t','-q','-v','ON_ERROR_STOP=1','-c','select count(*) from auth.users']);
  const objects=run('psql',['-X','-A','-t','-q','-v','ON_ERROR_STOP=1','-c','select count(*) from storage.objects']);
  if(users!=='0'||objects!=='0')stop('destination already has Auth users or Storage objects');
  // Official Supabase self-hosted guide: roles, schema, trigger-suppressed COPY data
  // in ONE transaction. Outbound network isolation must be enforced by operator.
  run('psql',['-X','--single-transaction','-v','ON_ERROR_STOP=1',
   '-f',join(evidence.dir,'roles.sql'),'-f',join(evidence.dir,'schema.sql'),
   '-c','SET session_replication_role = replica',
   '-f',join(evidence.dir,'data.sql')]);
  const post=run('psql',['-X','-A','-t','-q','-v','ON_ERROR_STOP=1','-c',
   "select (to_regclass('public.efg_goals') is not null)::int || ',' || (to_regclass('auth.users') is not null)::int"]);
  if(post!=='1,1')stop('post-restore essential tables missing');
  console.log('COACH94: private PG17 triplet restore structurally completed.',
   'NOT YET PROVEN: historical parity, Auth/RLS, private receipt bytes, rollback.');
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(()=>{console.error('COACH94 STOP: private dump/restore gate failed; investigate privately.');process.exitCode=2;});
}
