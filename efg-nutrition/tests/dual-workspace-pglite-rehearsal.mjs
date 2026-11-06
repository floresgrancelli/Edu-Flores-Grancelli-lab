// Optional PostgreSQL 17 WASM rehearsal. Needs an ALREADY installed PGlite module.
// No install, network, persisted database, service credentials or JWT impersonation.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createSyntheticSignedClaims} from './synthetic-signed-claims.mjs';
if(!process.env.NCC_PGLITE_MODULE){
 console.error('NOT RUN: PostgreSQL/PGlite is not available. Set NCC_PGLITE_MODULE to an existing installation.');
 process.exit(2);
}
const {PGlite}=await import(pathToFileURL(process.env.NCC_PGLITE_MODULE));
const db=new PGlite();
const migration=readFileSync(new URL('../proposed/20261106_dual_workspace_STAGING_ONLY_NOT_APPLIED.sql',import.meta.url),'utf8');
const ids={admin:'00000000-0000-4000-8000-000000000001',mentor:'00000000-0000-4000-8000-000000000002',
 learner:'00000000-0000-4000-8000-000000000003',other:'00000000-0000-4000-8000-000000000004',
 original:'00000000-0000-4000-8000-000000000101'};
let sequence=0;
const uuid=()=>`00000000-0000-4000-9000-${String(++sequence).padStart(12,'0')}`;
const one=async(sql,params=[]) => (await db.query(sql,params)).rows[0];
const as=async actor=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[actor]);
try{
 console.log((await one('select version()')).version);
 assert.ok(String((await one('show server_version_num')).server_version_num).startsWith('17'));
 await assert.rejects(db.exec(migration),/STOP: disposable synthetic fixture required/);
 await db.exec('rollback');
 await db.exec(`
 create schema auth; create schema efg_private;
 create role anon; create role authenticated;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table auth.users(id uuid primary key,email text not null,email_confirmed_at timestamptz);
 create table public.efg_organizations(id uuid primary key default gen_random_uuid(),name text not null,coach_id uuid references auth.users(id),
   seat_limit integer not null check(seat_limit between 1 and 10000),status text not null,is_test boolean not null,license_fee_ars numeric);
 create table public.efg_profiles(user_id uuid primary key references auth.users(id),email text not null unique,nickname text not null,
   role text not null check(role in ('admin','coach','student')),active boolean not null default true,
   organization_id uuid references efg_organizations(id),
   constraint profile_org_role check((role='student' and organization_id is not null) or (role<>'student' and organization_id is null)));
 create table public.efg_invitations(id uuid primary key default gen_random_uuid(),email text not null,nickname text not null,role text not null,
   organization_id uuid references efg_organizations(id),invited_by uuid references auth.users(id),claimed_by uuid references auth.users(id),revoked_at timestamptz);
 create table public.efg_consents(student_id uuid primary key references efg_profiles(user_id),organization_id uuid references efg_organizations(id),accepted boolean not null);
 create table public.efg_daily_logs(student_id uuid references efg_profiles(user_id),body text not null);
 create function efg_private.is_admin() returns boolean language sql stable as $$select exists(select 1 from public.efg_profiles where user_id=auth.uid() and role='admin' and active)$$;
 create table efg_private.ncc_dual_workspace_fixture_marker(marker text primary key);
 insert into efg_private.ncc_dual_workspace_fixture_marker values('synthetic-v1');
 set ncc.dual_workspace_fixture='synthetic-v1';
 `);
 for(const role of ['admin','mentor','learner','other'])await db.query('insert into auth.users values($1,$2,now())',[ids[role],role+'@example.invalid']);
 await db.query("insert into efg_organizations values($1,'Original DEMO',$2,10,'trial',true,null)",[ids.original,ids.mentor]);
 for(const key of ['admin','mentor','learner','other'])await db.query('insert into efg_profiles values($1,$2,$3,$4,true,$5)',
   [ids[key],key+'@example.invalid',key+' DEMO',key==='admin'?'admin':key==='learner'?'student':'coach',key==='learner'?ids.original:null]);
 await db.query('insert into efg_consents values($1,$2,true)',[ids.learner,ids.original]);
 await db.query("insert into efg_daily_logs values($1,'HISTORIAL FICTICIO')",[ids.learner]);
 const before=await one('select jsonb_agg(to_jsonb(p) order by user_id) profiles from efg_profiles p');
 await db.exec(migration);
 await as(ids.admin);const createId=uuid();
 const orgCount=(await one('select count(*)::int n from efg_organizations')).n;
 for(const seats of [null,0,-1,10001])await assert.rejects(db.query('select ncc_pilot_workspace_create_v1($1,$2,$3,$4)',
  ['invalid-cap@example.invalid','Coach DEMO',seats,uuid()]),/Invalid synthetic account or seats/);
 await assert.rejects(db.query('select ncc_pilot_workspace_create_v1($1,$2,$3,$4)',
  ['not-synthetic@example.org','Coach DEMO',2,uuid()]),/Invalid synthetic account or seats/);
 assert.equal((await one('select count(*)::int n from efg_organizations')).n,orgCount,'Rejected input is atomic');
 const first=await one('select ncc_pilot_workspace_create_v1($1,$2,$3,$4) result',['learner@example.invalid','Coach DEMO',2,createId]);
 assert.equal(first.result.student_link_preserved,true);
 assert.deepEqual(await one('select jsonb_agg(to_jsonb(p) order by user_id) profiles from efg_profiles p'),before);
 assert.equal((await one('select count(*)::int n from efg_daily_logs')).n,1);
 assert.equal((await one('select accepted from efg_consents')).accepted,true);
 assert.deepEqual(await one('select ncc_pilot_workspace_create_v1($1,$2,$3,$4) result',['learner@example.invalid','Coach DEMO',2,createId]),first);
 await as(ids.learner);const contexts=(await one('select ncc_dual_workspace_contexts_v1() value')).value;
 assert.equal(contexts.student_context.organization_id,ids.original);assert.equal(contexts.coach_contexts.length,1);
 const org=first.result.organization_id;
 await assert.rejects(db.query('select ncc_pilot_workspace_invite_student_v1($1,$2,$3,$4)',[org,'before-terms@example.invalid','Alumno DEMO',uuid()]),/Wrong or inactive coach workspace/);
 await db.query('select ncc_pilot_workspace_accept_terms_v1($1,$2,$3,$4)',[org,'synthetic-terms-v1','synthetic-privacy-v1',uuid()]);
 for(let n=0;n<2;n++)await db.query('select ncc_pilot_workspace_invite_student_v1($1,$2,$3,$4)',[org,`pupil-${n}@example.invalid`,'Alumno DEMO',uuid()]);
 await assert.rejects(db.query('select ncc_pilot_workspace_invite_student_v1($1,$2,$3,$4)',[org,'overflow@example.invalid','Alumno DEMO',uuid()]),/Pilot seats exhausted/);
 await as(ids.other);
 await assert.rejects(db.query('select ncc_pilot_workspace_invite_student_v1($1,$2,$3,$4)',[org,'foreign@example.invalid','Alumno DEMO',uuid()]),/Wrong or inactive coach workspace/);
 await as(ids.admin);
 await assert.rejects(db.query('select ncc_pilot_workspace_set_seats_v1($1,$2,$3)',[org,1,uuid()]),/Occupied seats/);
 await db.query('select ncc_pilot_workspace_set_seats_v1($1,$2,$3)',[org,4,uuid()]);
 const pending=(await one('select ncc_pilot_workspace_create_v1($1,$2,$3,$4) result',['new@example.invalid','Nuevo DEMO',5,uuid()])).result;
 assert.equal(pending.state,'pending_verified_account');
 const newId='00000000-0000-4000-8000-000000000005';
 await db.query('insert into auth.users values($1,$2,now())',[newId,'new@example.invalid']);
 await as(newId);
 const claimed=(await one('select ncc_pilot_workspace_claim_v1($1) result',[uuid()])).result;
 assert.equal(claimed.organization_id,pending.organization_id);
 assert.equal((await one('select role from efg_profiles where user_id=$1',[newId])).role,'coach');
 const endpoints=['ncc_pilot_workspace_create_v1(text,text,integer,uuid)','ncc_pilot_workspace_claim_v1(uuid)',
  'ncc_pilot_workspace_set_seats_v1(uuid,integer,uuid)','ncc_pilot_workspace_invite_student_v1(uuid,text,text,uuid)',
  'ncc_pilot_workspace_accept_terms_v1(uuid,text,text,uuid)','ncc_pilot_workspace_roster_v1(uuid)',
  'ncc_dual_workspace_contexts_v1()','ncc_pilot_workspace_receipt_v1(uuid)'];
 for(const role of ['anon','authenticated'])for(const endpoint of endpoints)
  assert.equal((await one("select has_function_privilege($1,$2,'EXECUTE') allowed",[role,'public.'+endpoint])).allowed,false);
 console.log('PASS: isolated PostgreSQL proposal rehearsal, original ungranted RPC posture.');

 // ADDITIONAL TEST-ONLY grants/policies in this disposable in-memory database.
 // These are intentionally NOT part of the proposed migration or app integration.
 const pupil='00000000-0000-4000-8000-000000000006',foreign='00000000-0000-4000-8000-000000000007';
 const foreignOrg='00000000-0000-4000-8000-000000000102';
 await db.query("insert into efg_organizations values($1,'Foreign DEMO',$2,10,'trial',true,null)",[foreignOrg,ids.other]);
 for(const [subject,email,orgId] of [[pupil,'own-pupil@example.invalid',org],[foreign,'foreign-pupil@example.invalid',foreignOrg]]){
  await db.query('insert into auth.users values($1,$2,now())',[subject,email]);
  await db.query("insert into efg_profiles values($1,$2,'Alumno DEMO','student',true,$3)",[subject,email,orgId]);
  await db.query('insert into efg_consents values($1,$2,true)',[subject,orgId]);
  await db.query("insert into efg_daily_logs values($1,'SYNTHETIC PRIVATE ROW')",[subject]);
 }
 await db.exec(`
 create function efg_private.ncc_fixture_read_student_v1(p_student uuid) returns boolean
 language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.efg_profiles actor where actor.user_id=auth.uid() and actor.active
   and (p_student=actor.user_id or exists(
    select 1 from public.efg_profiles student join public.efg_organizations o on o.id=student.organization_id
    join public.efg_consents consent on consent.student_id=student.user_id and consent.organization_id=o.id
    where student.user_id=p_student and student.role='student' and student.active and consent.accepted
    and o.coach_id=actor.user_id and o.is_test and o.status in ('trial','active')
    and (actor.role='coach' or exists(select 1 from efg_private.ncc_coach_capabilities_v1 cap
     where cap.user_id=actor.user_id and cap.organization_id=o.id and cap.active
     and cap.terms_version='synthetic-terms-v1' and cap.privacy_version='synthetic-privacy-v1' and cap.terms_accepted_at is not null))
   )))
 $$;
 revoke all on function efg_private.ncc_fixture_read_student_v1(uuid) from public,anon;
 grant usage on schema public,efg_private to authenticated;
 grant execute on function efg_private.ncc_fixture_read_student_v1(uuid) to authenticated;
 alter table public.efg_daily_logs enable row level security;
 grant select on public.efg_daily_logs to authenticated;
 create policy ncc_fixture_private_read on public.efg_daily_logs for select to authenticated
  using(efg_private.ncc_fixture_read_student_v1(student_id));
 grant execute on function public.ncc_dual_workspace_contexts_v1() to authenticated;
 grant execute on function public.ncc_pilot_workspace_roster_v1(uuid) to authenticated;
 grant execute on function public.ncc_pilot_workspace_set_seats_v1(uuid,integer,uuid) to authenticated;
 `);
 const signed=createSyntheticSignedClaims();let databaseRequests=0;
 async function authenticated(token,query,parameters=[]){
  const claims=signed.verify(token);databaseRequests++;
  await db.exec('begin');
  try{
   await db.query("select set_config('request.jwt.claim.sub',$1,true)",[claims.sub]);
   await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(claims)]);
   await db.exec('set local role authenticated');
   return (await db.query(query,parameters)).rows;
  }finally{await db.exec('rollback');}
 }
 const read=subject=>authenticated(signed.token(subject),'select student_id from efg_daily_logs order by student_id');
 assert.deepEqual((await read(ids.mentor)).map(r=>r.student_id),[ids.learner],'Original coach retains authorized student');
 assert.deepEqual((await read(ids.learner)).map(r=>r.student_id),[ids.learner,pupil],'Dual user sees personal row and authorized own pupil');
 assert.deepEqual((await read(ids.other)).map(r=>r.student_id),[foreign],'Other coach sees only their own organization');
 assert.deepEqual(await read(ids.admin),[],'Admin has no general private-data access');
 assert.deepEqual((await read(pupil)).map(r=>r.student_id),[pupil],'Student sees only self');
 await assert.rejects(authenticated(signed.token(ids.learner),"update efg_profiles set role='admin' where user_id=$1",[ids.learner]),/permission denied/);
 await assert.rejects(authenticated(signed.token(ids.learner),'select ncc_pilot_workspace_set_seats_v1($1,$2,$3)',[org,10,uuid()]),/Admin required/);
 const current=(await authenticated(signed.token(ids.learner),'select ncc_dual_workspace_contexts_v1() value'))[0].value;
 assert.equal(current.profile_role,'student');assert.equal(current.student_context.organization_id,ids.original);assert.equal(current.coach_contexts[0].id,org);
 await db.query('update efg_consents set accepted=false where student_id=$1',[pupil]);
 assert.deepEqual((await read(ids.learner)).map(r=>r.student_id),[ids.learner],'Consent revocation is enforced by PostgreSQL RLS');
 await db.query('update efg_consents set accepted=true where student_id=$1',[pupil]);
 await db.query('update efg_private.ncc_coach_capabilities_v1 set active=false where user_id=$1',[ids.learner]);
 assert.deepEqual((await read(ids.learner)).map(r=>r.student_id),[ids.learner],'Capability revocation preserves personal data');
 assert.deepEqual((await read(ids.mentor)).map(r=>r.student_id),[ids.learner],'Capability revocation does not remove original coach relationship');
 await assert.rejects(authenticated(signed.token(ids.learner),'select ncc_pilot_workspace_roster_v1($1)',[org]),/Own active pilot/);
 const token=signed.token(ids.learner),parts=token.split('.');
 parts[1]=Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(parts[1],'base64url')),sub:ids.admin})).toString('base64url');
 const beforeRequests=databaseRequests;
 for(const bad of [parts.join('.'),signed.token(ids.learner,{exp:1}),signed.token(ids.learner,{aud:'wrong'}),signed.token(ids.learner,{iss:'wrong'})])
  await assert.rejects(authenticated(bad,'select 1'),/Synthetic JWT/);
 assert.equal(databaseRequests,beforeRequests,'Invalid synthetic JWT never reaches database');
 await db.query('update efg_profiles set active=false where user_id=$1',[ids.learner]);
 assert.deepEqual(await read(ids.learner),[],'Inactive identity cannot read personal or professional records');
 console.log('PASS: PostgreSQL RLS with authenticated test role and synthetic signed claims: A/B isolation, original relationship, consent/capability revocation, admin denial, escalation denial, inactive identity, invalid signature/expiry/audience/issuer rejection.');
 console.log('LIMIT: disposable policy model and custom test JWT bridge only; NOT Supabase GoTrue/PostgREST, hosted RLS/schema parity, browser, physical devices or multi-session concurrency.');
}finally{await db.close();}
