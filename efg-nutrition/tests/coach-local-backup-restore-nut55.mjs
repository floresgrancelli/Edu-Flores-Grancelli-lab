// NUT-55: REAL pg_dump/pg_restore for 3 Coach publication tables, LOCAL ONLY.
// Test rows are synthetic. This does NOT prove whole-database / production restoration.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";

assert.equal(process.env.SUPABASE_ACCESS_TOKEN,undefined,"No hosted management credentials permitted");
assert.equal(process.env.SUPABASE_DB_PASSWORD,undefined,"No hosted Supabase DB credentials permitted");
const statusFile=process.env.EFG_LOCAL_STATUS_ENV;
assert.ok(statusFile,"Local Supabase status file required");
const status=Object.fromEntries(readFileSync(statusFile,"utf8").split(/\r?\n/)
 .filter(s=>s.includes("=")).map(s=>{const i=s.indexOf("=");return [s.slice(0,i),s.slice(i+1).trim().replace(/^['"]|['"]$/g,"")];}));
const api=new URL(status.API_URL||"");
assert.equal(api.protocol,"http:");assert.equal(api.hostname,"127.0.0.1");assert.equal(api.port,"54321");
const env={...process.env,PGHOST:"127.0.0.1",PGPORT:"54322",PGUSER:"postgres",PGPASSWORD:"postgres",PGDATABASE:"postgres"};
function run(cmd,args,{input}={}){
 const r=spawnSync(cmd,args,{env,input,timeout:45000,maxBuffer:16*1024*1024,encoding:input===undefined&&cmd==="psql"?"utf8":undefined});
 if(r.error||r.status!==0)throw Error("Local process "+cmd+" failed: "+(r.error?.message||String(r.stderr||r.stdout).slice(0,1000)));
 return r.stdout;
}
function sql(q){return String(run("psql",["-X","-A","-t","-v","ON_ERROR_STOP=1","-c",q])).trim();}
const dockerNames=String(run("docker",["ps","--format","{{.Names}}"])).trim().split(/\r?\n/).filter(Boolean);
const dbs=dockerNames.filter(n=>/^supabase_db_/.test(n)&&n.includes("efg-nutrition-auth-local"));
assert.equal(dbs.length,1,"Expected exactly one local Supabase DB container");
const db=dbs[0];
const tables=[
 {table:"public.efg_coach_plan_drafts",key:"student_id"},
 {table:"public.efg_notifications",key:"id"},
 {table:"public.efg_coach_plan_publish_receipts",key:"request_id"}
];
function fingerprint({table,key}){
 const count=Number(sql("select count(*) from "+table));
 const hash=sql("select md5(coalesce((select jsonb_agg(to_jsonb(t) order by "+key+")::text from "+table+" t),'[]'))");
 return {count,hash};
}
const before=tables.map(fingerprint);
assert.deepEqual(before.map(x=>x.count),[1,1,1],"Fixture must contain one private draft, notice and receipt");
assert.equal(sql("select count(*) from public.efg_goals"),"1");
assert.equal(sql("select count(*) from public.efg_food_plans where guided_plan is not null"),"1");
const archive=run("docker",["exec","-e","PGPASSWORD=postgres",db,"pg_dump","-U","postgres","-h","127.0.0.1",
 "-d","postgres","--format=custom","--data-only","--no-owner","--no-acl",
 ...tables.flatMap(x=>["--table="+x.table])]);
assert.ok(Buffer.isBuffer(archive)&&archive.byteLength>100,"Expected a nonempty PostgreSQL custom backup");
assert.equal(archive.toString("ascii",0,5),"PGDMP","Must be a real pg_dump archive");
const archiveSummary=String(run("docker",["exec","-i",db,"pg_restore","--list"],{input:archive}));
for(const {table} of tables)assert.ok(archiveSummary.includes(table.split(".")[1]),"Dump missing "+table);
// Intentionally remove ONLY these 3 fictitious rows in the disposable local DB,
// then restore them using pg_restore. No cascade, no auth.users/production access.
sql("truncate table "+tables.map(x=>x.table).join(", "));
assert.deepEqual(tables.map(x=>Number(sql("select count(*) from "+x.table))),[0,0,0]);
run("docker",["exec","-i","-e","PGPASSWORD=postgres",db,"pg_restore","-U","postgres","-h","127.0.0.1",
 "-d","postgres","--data-only","--no-owner","--no-acl","--single-transaction","--exit-on-error"],{input:archive});
const after=tables.map(fingerprint);
assert.deepEqual(after,before,"Restored Coach rows differ from backup (counts/hash)");
assert.equal(sql("select count(*) from public.efg_goals"),"1","Active goals must remain intact");
assert.equal(sql("select count(*) from public.efg_food_plans where guided_plan is not null"),"1","Active guide must remain intact");
assert.equal(sql("select count(*) from public.efg_student_plan_access where status='published'"),"1");
assert.equal(sql("select count(*) from auth.users"),"5","GoTrue users must remain intact");
const rls=sql("select relrowsecurity from pg_class where oid='public.efg_coach_plan_drafts'::regclass");
assert.equal(rls,"t","RLS must remain enabled");
console.log("PASS NUT-55 LOCAL RECOVERY: pg_dump custom archive, intentional truncation of 3 synthetic tables, pg_restore single transaction, identical row counts+MD5, active goal/guide/access/Auth preserved, RLS on. NOT a full instance backup or production restore.");
