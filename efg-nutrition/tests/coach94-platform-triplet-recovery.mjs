// COACH94 isolated metadata fixture tests: no Supabase credentials, no real DB/receipts.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,writeFile,readFile,chmod,rm,unlink,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {validatePlatformSQLTriplet,validateLocalRestoreTarget,inspectPlatformTriplet}
 from '../scripts/coach94-platform-triplet-recovery.mjs';

const entities=['efg_profiles','efg_organizations','efg_goals','efg_food_plans','efg_daily_logs'];
const roles='-- Synthetic fake roles\nCREATE ROLE sample_fixture NOLOGIN;\n'.padEnd(110,' ');
const schema=entities.map(t=>'CREATE TABLE public.'+t+' (id uuid);').join('\n')+
 '\nCREATE POLICY sample_fixture_policy ON public.efg_goals USING (true);'+
 '\nCREATE FUNCTION public.sample_fixture() RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;';
const data=[...entities.map(t=>'COPY public.'+t+' (id) FROM stdin;\n\\.'), 
 'COPY auth.users (id) FROM stdin;\n\\.','COPY storage.objects (name) FROM stdin;\n\\.'].join('\n');
const sample={roles,schema,data};
assert.deepEqual(validatePlatformSQLTriplet(sample),{
 minimum_sql_triplet_checks_pass:true,storage_bytes_present:false,actual_restore_verified:false
});
for(const key of Object.keys(sample)){
 assert.throws(()=>validatePlatformSQLTriplet({...sample,[key]:'tiny'}),/COACH94 STOP/);
}
for(const table of entities){
 assert.throws(()=>validatePlatformSQLTriplet({...sample,schema:schema.replace('CREATE TABLE public.'+table,'CREATE VIEW public.'+table)}),/COACH94 STOP/);
 assert.throws(()=>validatePlatformSQLTriplet({...sample,data:data.replace('COPY public.'+table,'COPY missing.'+table)}),/COACH94 STOP/);
}
for(const type of ['auth.users','storage.objects']){
 assert.throws(()=>validatePlatformSQLTriplet({...sample,data:data.replace('COPY '+type,'COPY not.'+type.split('.')[1])}),/COACH94 STOP/);
}
for(const special of ['\\connect malicious','\\! curl https://bad.invalid','\\i /tmp/untrusted.sql','DROP DATABASE postgres;','ALTER SYSTEM SET logging_collector=off;']){
 assert.throws(()=>validatePlatformSQLTriplet({...sample,schema:schema+'\n'+special}),/COACH94 STOP/);
}
const env={EFG_COACH94_MANUAL_ACK:'LOCAL_PRIVATE_RESTORE_REHEARSAL',
 EFG_COACH94_RESTORE_ACK:'I_ACCEPT_ISOLATED_PG17_WRITES',PGHOST:'127.0.0.1',
 PGPORT:'5432',PGUSER:'postgres',PGDATABASE:'efg_coach94_disposable_restore'};
assert.equal(validateLocalRestoreTarget(env),true);
for(const over of [
 {CI:'true'},{GITHUB_ACTIONS:'true'},{PGHOST:'db.cyjvddhimbsfipjfctsl.supabase.co'},
 {PGHOST:'localhost'},{PGDATABASE:'postgres'},{PGPORT:'54322'},
 {EFG_COACH94_RESTORE_ACK:''},{EFG_COACH94_MANUAL_ACK:''},{PGSERVICE:'some.service'},
 {PGHOSTADDR:'1.2.3.4'}
])assert.throws(()=>validateLocalRestoreTarget({...env,...over}),/COACH94 STOP/);
const dir=await mkdtemp(join(tmpdir(),'coach94-private-fixture-'));
const payloads={'roles.sql':roles,'schema.sql':schema,'data.sql':data};
const hashes={};
try{
 for(const [file,contents] of Object.entries(payloads)){
  await writeFile(join(dir,file),contents,{mode:0o600});
  hashes[file]={bytes:Buffer.byteLength(contents),
   sha256:createHash('sha256').update(contents).digest('hex')};
 }
 let r=await inspectPlatformTriplet(dir,{requireManifest:false});
 assert.equal(r.result.actual_restore_verified,false);
 await assert.rejects(inspectPlatformTriplet(dir),/ENOENT/);
 const manifest={kind:'COACH94_SUPABASE_PLATFORM_TRIPLET_V1',
  project:'cyjvddhimbsfipjfctsl',files:hashes};
 await writeFile(join(dir,'coach94-private-manifest.json'),JSON.stringify(manifest).padEnd(110,' '),{mode:0o600});
 r=await inspectPlatformTriplet(dir);
 assert.equal(r.result.minimum_sql_triplet_checks_pass,true);
 // Silent equal-length tampering still invalidates SHA256 and must stop.
 await writeFile(join(dir,'roles.sql'),roles.replace('sample_fixture','another_fixture'),{mode:0o600});
 await assert.rejects(inspectPlatformTriplet(dir),/COACH94 STOP/);
 await writeFile(join(dir,'roles.sql'),roles,{mode:0o600});
 await unlink(join(dir,'data.sql'));
 await symlink(join(dir,'roles.sql'),join(dir,'data.sql'));
 await assert.rejects(inspectPlatformTriplet(dir),/COACH94 STOP/);
 await unlink(join(dir,'data.sql'));
 await writeFile(join(dir,'data.sql'),data,{mode:0o600});
 await chmod(dir,0o755);
 await assert.rejects(inspectPlatformTriplet(dir),/COACH94 STOP/);
 console.log('PASS COACH94 platform-aware synthetic: Auth/Storage/EFG required, manifest SHA256, symlink/mode/tamper reject, no production restore, no credentials.');
}finally{await rm(dir,{recursive:true,force:true});}
