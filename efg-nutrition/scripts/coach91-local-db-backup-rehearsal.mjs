// COACH91: local-only PostgreSQL backup/archive rehearsal.
// NEVER upload backups, credentials or this tool's private output to the public repo.
// It performs no hosted mutations and cannot certify Supabase Storage bytes or Auth config.
import {open, lstat, realpath, stat, unlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {dirname, isAbsolute, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const PROJECT_ID='cyjvddhimbsfipjfctsl';
const HOST='db.'+PROJECT_ID+'.supabase.co';
const LOCAL_DB='efg_coach91_disposable_restore';
const REQUIRED=[
 'auth.users','storage.objects','public.efg_profiles','public.efg_organizations',
 'public.efg_goals','public.efg_food_plans','public.efg_daily_logs',
 'public.efg_weights','public.efg_activities','public.efg_habitual_meals',
 'public.efg_personal_recipes','public.efg_invitations','public.efg_messages',
 'public.efg_payments','public.efg_weekly_reports'
];
const stop=(message)=>{throw Error('COACH91 STOP: '+message);};
const within=(p,base)=>p===base||p.startsWith(base+sep);

export function validateArchiveTOC(toc){
 if(typeof toc!=='string')stop('unreadable PostgreSQL archive listing');
 const tables=new Set();
 let policies=0,triggers=0;
 for(const line of toc.split(/\r?\n/)){
  // pg_restore --list format: "123; 0 456 TABLE DATA public efg_daily_logs postgres".
  const item=line.match(/^\d+;\s+\d+\s+\d+\s+TABLE DATA\s+([a-z_][a-z_0-9]*)\s+([a-z_][a-z_0-9]*)\s+/i);
  if(item)tables.add(item[1]+'.'+item[2]);
  if(/^\d+;\s+\d+\s+\d+\s+POLICY\s+/i.test(line))policies++;
  if(/^\d+;\s+\d+\s+\d+\s+TRIGGER\s+/i.test(line))triggers++;
 }
 const missing=REQUIRED.filter(x=>!tables.has(x));
 if(missing.length)stop('archive missing essential Auth/EFG/Storage metadata tables');
 if(!policies||!triggers)stop('archive lacks RLS policies or triggers');
 // Archive contains storage.objects METADATA, not the private receipt BYTES.
 return {essential_table_data_present:REQUIRED.length,has_policies:true,has_triggers:true};
}
export function validateModeEnvironment(mode,env){
 if(env.CI==='true'||env.GITHUB_ACTIONS==='true')stop('never use real backup credentials in CI');
 if(env.EFG_COACH91_MANUAL_ACK!=='PRIVATE_LOCAL_BACKUP_ONLY')stop('explicit local manual acknowledgment required');
 for(const k of ['PGSERVICE','PGSERVICEFILE','PGHOSTADDR','PGOPTIONS','PGSYSCONFDIR']){
  if(env[k])stop('ambiguous PostgreSQL connection configuration');
 }
 if(mode==='capture'){
  if(env.PGHOST!==HOST||env.PGPORT!=='5432'||
     env.PGDATABASE!=='postgres'||env.PGUSER!=='postgres'||
     !['require','verify-ca','verify-full'].includes(env.PGSSLMODE))
   stop('source must be explicitly named production PostgreSQL, SSL required');
 }else if(mode==='restore'){
  if(env.PGHOST!=='127.0.0.1'||env.PGPORT!=='5432'||
     env.PGDATABASE!==LOCAL_DB||env.PGUSER!=='postgres'||
     env.EFG_COACH91_RESTORE_ACK!=='I_ACCEPT_DISPOSABLE_LOCAL_RESTORE')
   stop('destination must be the dedicated loopback PG17 database with explicit restore acknowledgment');
 }else if(mode!=='inspect')stop('unsupported mode');
 return true;
}
async function safeArchivePath(raw,requireExists){
 if(!isAbsolute(raw))stop('archive must use an absolute path');
 const repo=await realpath(fileURLToPath(new URL('../../',import.meta.url)));
 const parent=await realpath(dirname(raw));
 if(within(parent,repo))stop('never store private backups inside the repository');
 const dir=await stat(parent);
 if(!dir.isDirectory()||(dir.mode&0o077)!==0)stop('backup directory must be private (0700)');
 const path=resolve(raw);
 if(requireExists){
  const st=await lstat(path);
  if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
     (st.mode&0o077)!==0||st.size<128)
   stop('backup must be a non-linked private (0600) regular archive');
  const fh=await open(path,'r');
  try{const b=Buffer.alloc(5);await fh.read(b,0,5,0);
      if(b.toString()!=='PGDMP')stop('not a PostgreSQL custom archive');}
  finally{await fh.close();}
 }else{
  try{await lstat(path);stop('backup target already exists');}
  catch(e){if(e?.code!=='ENOENT')throw e;}
 }
 return path;
}
function command(name,args){
 try{return execFileSync(name,args,{encoding:'utf8',timeout:300000,
   maxBuffer:12*1024*1024,stdio:['ignore','pipe','pipe']});}
 catch{stop('PostgreSQL command failed; inspect privately without logging credentials/rows');}
}
async function inspect(path){
 await safeArchivePath(path,true);
 return validateArchiveTOC(command('pg_restore',['--list',path]));
}
async function main(){
 const [mode,path]=process.argv.slice(2);
 validateModeEnvironment(mode,process.env);
 if(!path)stop('usage: capture|inspect|restore /absolute/private/backup.dump');
 if(mode==='capture'){
  const target=await safeArchivePath(path,false);
  const file=await open(target,'wx',0o600);await file.close();
  try{
   // pg_dump is read-only. Credentials come from the local operator's PG environment/.pgpass.
   // --no-password prevents an interactive password request; no secrets in argv.
   command('pg_dump',['--no-password','--format=custom','--file='+target]);
   await inspect(target);
  }catch(e){await unlink(target).catch(()=>{});throw e;}
  console.log('COACH91: private custom archive captured and structural TOC checked. RESTORE NOT YET TESTED.');
 }else if(mode==='inspect'){
  const report=await inspect(path);
  console.log('COACH91: private archive TOC checked.',report.essential_table_data_present,
    'essential table-data entries; NOT a restore, Storage bytes or auth-login test.');
 }else{
  await inspect(path);
  const version=command('psql',['-X','-Atq','-v','ON_ERROR_STOP=1','-c','show server_version_num']).trim();
  const database=command('psql',['-X','-Atq','-v','ON_ERROR_STOP=1','-c','select current_database()']).trim();
  if(!/^17\d{4}$/.test(version)||database!==LOCAL_DB)stop('wrong PostgreSQL version or database');
  const objects=command('psql',['-X','-Atq','-v','ON_ERROR_STOP=1','-c',
    "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth','storage','efg_private') and c.relkind in ('r','p','v','m','f')"]).trim();
  if(objects!=='0')stop('local restore database must be completely empty');
  // Strict restore: preserve ACL/ownership/triggers rather than silently omitting them.
  command('pg_restore',['--exit-on-error','--single-transaction','--dbname='+LOCAL_DB,path]);
  const auth=command('psql',['-X','-Atq','-v','ON_ERROR_STOP=1','-c',
    "select count(*) from information_schema.tables where table_schema='auth' and table_name='users'"]).trim();
  if(auth!=='1')stop('restored Auth schema not found');
  console.log('COACH91: private local PG17 restore completed; Auth table exists.',
   'Still REQUIRED: hosted-shape preflight, signed JWT roles, user/history parity, Storage bytes and independent recovery review.');
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(()=>{console.error('COACH91 STOP: local backup or restore gate failed. Review privately.');process.exitCode=2;});
}
