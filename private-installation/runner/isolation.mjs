// No network/database access until an explicitly reviewed disposable CI invocation.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const project='efg-nutrition-incremental-local';
const cmd=(bin,args)=>execFileSync(bin,args,{encoding:'utf8',timeout:20000,stdio:['ignore','pipe','pipe']}).trim();
export function assertRunner(){
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.EFG_QA_INCREMENTAL_INSTALL,'1');
 assert.match(process.env.GITHUB_RUN_ID||'',/^\d+$/);assert.match(process.env.GITHUB_SHA||'',/^[a-f0-9]{40}$/);
 for(const k of ['SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','PGHOSTADDR','PGSERVICE','PGSERVICEFILE','PGOPTIONS'])assert.ok(!process.env[k],`Unexpected ${k}`);
 const stack=realpathSync(process.env.EFG_INCREMENTAL_STACK||'');
 assert.ok(stack.startsWith(realpathSync(process.env.RUNNER_TEMP)+'/'));
 assert.equal(stack.split('/').at(-1),project);
 const config=readFileSync(stack+'/supabase/config.toml','utf8');
 assert.match(config,new RegExp('^project_id = "'+project+'"','m'));
 const selected=JSON.parse(cmd('python3',['-c','import tomllib,json,sys; d=tomllib.load(open(sys.argv[1],"rb")); print(json.dumps({"smtp":d.get("auth",{}).get("email",{}).get("smtp",{}).get("enabled",False),"api":d["api"]["port"],"db":d["db"]["port"]}))',stack+'/supabase/config.toml']));
 assert.equal(selected.smtp,false,'External SMTP forbidden');assert.equal(selected.api,54321);assert.equal(selected.db,54322);
 return {stack,configHash:createHash('sha256').update(config).digest('hex')};
}
export function attestDatabase(sql){
 const base=assertRunner(),name='supabase_db_'+project;
 const x=JSON.parse(cmd('docker',['inspect',name]))[0];assert.equal(x.Name,'/'+name);assert.equal(x.State.Running,true);
 const ports=x.NetworkSettings.Ports['5432/tcp']||[];
 assert.ok(ports.some(p=>p.HostPort==='54322'),'Expected local exposed DB port');
 const addr=sql('select inet_server_addr()::text');
 const ips=Object.values(x.NetworkSettings.Networks).flatMap(n=>[n.IPAddress,n.GlobalIPv6Address]).filter(Boolean);
 assert.ok(ips.includes(addr)||['127.0.0.1','::1'].includes(addr),'Database address must belong to inspected stack');
 const system=sql('select system_identifier::text from pg_control_system()');
 const inside=cmd('docker',['exec',name,'psql','-X','-Atq','-U','postgres','-d','postgres','-c','select system_identifier::text from pg_control_system()']);
 assert.equal(system,inside,'Loopback port must resolve to the exact inspected container');
 assert.equal(sql('select current_database()'),'postgres');
 return {...base,name,addr,system,containerId:x.Id};
}
