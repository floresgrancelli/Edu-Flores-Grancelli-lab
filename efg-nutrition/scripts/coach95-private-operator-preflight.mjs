// COACH95 — private operator workstation PRE-FLIGHT. No database or network calls.
// Never use it for production SQL, credentials, Storage bytes or an actual restore.
import {execFileSync} from 'node:child_process';
import {lstat,mkdir,realpath,stat,statfs} from 'node:fs/promises';
import {isAbsolute,dirname,basename,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const stop=m=>{throw Error('COACH95 STOP: '+m);};
const inside=(child,parent)=>child===parent||child.startsWith(parent+sep);
const noSecrets=['SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD',
 'DATABASE_URL','SUPABASE_DB_URL','PGPASSWORD','PGPASSFILE','PGSERVICE',
 'PGHOST','PGPORT','PGUSER','PGDATABASE'];
export function assessWorkstation({node,psql,docker,supabase,freeBytes,env={}}={}){
 if(env.CI==='true'||env.GITHUB_ACTIONS==='true')
  stop('real recovery preparation prohibited in CI');
 if(env.EFG_COACH95_MANUAL_ACK!=='I_AM_ON_MY_PRIVATE_COMPUTER')
  stop('explicit manual private device acknowledgment required');
 if(noSecrets.some(k=>Boolean(env[k])))
  stop('database/Access Token environment detected; close that terminal and reopen a clean one');
 if(typeof node!=='string'||Number(node.split('.')[0])<20)
  stop('Node 20+ is required');
 if(!/^psql \(PostgreSQL\) 17\.\d+/.test(psql||''))
  stop('PostgreSQL 17 psql is required');
 if(!/^2\.\d+\.\d+/.test(supabase||''))
  stop('Supabase CLI 2.x is required');
 if(typeof docker!=='string'||docker.trim().length<2)
  stop('Docker engine must be running, not only installed');
 if(!Number.isSafeInteger(freeBytes)||freeBytes<1024*1024*1024)
  stop('need at least 1 GiB of local free space for preparatory files; backup may need far more');
 return {ready_for_manual_export_preparation:true,backup_created:false,
  encryption_checked:false,database_access_checked:false};
}
function version(cmd,args){
 try{return execFileSync(cmd,args,{encoding:'utf8',timeout:12000,
  maxBuffer:4096,stdio:['ignore','pipe','pipe']}).trim();}
 catch{stop('required command is unavailable or service not running: '+cmd);}
}
export function validatePrivateDirectoryPlacement(target,repo){
 if(inside(target,repo)||inside(repo,target))stop('backup cannot overlap repository');
 return true;
}
async function protectedDirectory(path,create){
 if(typeof path!=='string'||!isAbsolute(path))stop('absolute private directory path required');
 const repo=await realpath(fileURLToPath(new URL('../../',import.meta.url)));
 const parent=await realpath(dirname(resolve(path)));
 const candidate=resolve(parent,basename(resolve(path)));
 validatePrivateDirectoryPlacement(candidate,repo);
 if(create){
  try{await mkdir(path,{mode:0o700});}
  catch(e){if(e?.code!=='EEXIST')throw e;}
 }
 const st=await lstat(path);
 if(!st.isDirectory()||st.isSymbolicLink())stop('symlink/non-directory backup path rejected');
 const real=await realpath(path);
 validatePrivateDirectoryPlacement(real,repo);
 const info=await stat(real);
 if((info.mode&0o077)!==0)stop('backup directory must be private chmod 700');
 const disk=await statfs(real,{bigint:true});
 const free=disk.bavail*disk.bsize;
 return {freeBytes:free>BigInt(Number.MAX_SAFE_INTEGER)
  ?Number.MAX_SAFE_INTEGER:Number(free)};
}
async function main(){
 const [mode,dir]=process.argv.slice(2);
 if(!['--init','--check'].includes(mode)||!dir||process.argv.length!==4)
  stop('usage: --init|--check /absolute/path/to/private-directory');
 if(process.env.EFG_COACH95_MANUAL_ACK!=='I_AM_ON_MY_PRIVATE_COMPUTER'||
    process.env.CI==='true'||process.env.GITHUB_ACTIONS==='true')
  stop('manual private workstation only');
 // refuse credentials even before checking binaries; never print their values.
 if(noSecrets.some(k=>Boolean(process.env[k])))
  stop('remove database/access-token env from terminal before running');
 const disk=await protectedDirectory(dir,mode==='--init');
 const report=assessWorkstation({node:process.versions.node,
  psql:version('psql',['--version']),supabase:version('supabase',['--version']),
  docker:version('docker',['info','--format','{{.ServerVersion}}']),
  freeBytes:disk.freeBytes,env:process.env});
 console.log('COACH95 PREFLIGHT PASS: local private directory (0700), Node, PG17 client, Supabase CLI, Docker.');
 console.log('DO NOT upload any dumps or secrets. Disk encryption and real restore remain unverified.');
 console.log('RESULT:',report.ready_for_manual_export_preparation
   ?'READY FOR MANUAL EXPORT PREPARATION (NO BACKUP CREATED)':'NOT READY');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(()=>{console.error('COACH95 STOP: workstation preflight failed. Check tools and private directory locally.');process.exitCode=2;});
}
