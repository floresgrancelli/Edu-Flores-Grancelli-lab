// NCC P26 - manual signed-actor hosted RLS check. Never acquires JWTs or OTPs.
// READ-ONLY: GET /auth/v1/user + narrow PostgREST SELECTs, no RPC or writes.
// Test identities must be newly authorized fictitious actors in TEST orgs.
// Do not store tokens in source files, screenshots, logs or conversation.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const HOSTED_ORIGIN='https://cyjvddhimbsfipjfctsl.supabase.co';
export const ACK='NCC_SIGNED_FICTIONAL_ACTORS_READONLY';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const phases=Object.freeze({
  before_share:{intake:0,draft:0},
  after_share:{intake:1,draft:0},
  private_draft:{intake:1,draft:1},
  after_revoke:{intake:0,draft:0}
});

export function readTokenClaims(token){
  assert.equal(typeof token,'string','Missing signed test actor token');
  const sections=token.split('.');
  assert.equal(sections.length,3,'Signed JWT must have 3 sections');
  assert.ok(sections.every(x=>x.length>0),'Malformed signed JWT');
  try{return JSON.parse(Buffer.from(sections[1],'base64url').toString('utf8'));}
  catch {throw Error('Malformed signed test actor JWT claims');}
}

export function validateHostedActors(env,now=Math.floor(Date.now()/1000)){
  assert.equal(env.NCC_P26_ACK,ACK,'Explicit manual QA authorization missing');
  assert.equal(env.NCC_P26_URL,HOSTED_ORIGIN,'Refuse other hosted projects/URLs');
  assert.ok(typeof env.NCC_P26_PUBLIC_KEY==='string'&&
    (env.NCC_P26_PUBLIC_KEY.startsWith('sb_publishable_')||
      env.NCC_P26_PUBLIC_KEY.startsWith('eyJ'))&&
    env.NCC_P26_PUBLIC_KEY.length>20,'Missing public Supabase API key');
  assert.ok(!env.SUPABASE_SERVICE_ROLE_KEY&&!env.SUPABASE_SECRET_KEY,
    'Refuse privileged keys in manual QA environment');
  const phase=env.NCC_P26_PHASE;
  assert.ok(Object.hasOwn(phases,phase),'Invalid manual QA phase');
  const orgA=env.NCC_P26_ORG_A_ID,orgB=env.NCC_P26_ORG_B_ID;
  assert.ok(uuid.test(orgA||'')&&uuid.test(orgB||'')&&orgA!==orgB,
    'Two distinct fictional TEST organizations required');
  const actors=[
    {name:'student',id:env.NCC_P26_STUDENT_ID,token:env.NCC_P26_STUDENT_JWT},
    {name:'coachA',id:env.NCC_P26_COACH_A_ID,token:env.NCC_P26_COACH_A_JWT},
    {name:'coachB',id:env.NCC_P26_COACH_B_ID,token:env.NCC_P26_COACH_B_JWT}
  ];
  assert.ok(actors.every(x=>uuid.test(x.id||'')),'Three real fictional actor IDs required');
  assert.equal(new Set(actors.map(x=>x.id)).size,3,'Actors must be distinct');
  for(const actor of actors){
    const claim=readTokenClaims(actor.token);
    assert.equal(claim.role,'authenticated','Anon/service role JWT prohibited');
    assert.equal(claim.sub,actor.id,'Token identity differs from approved test actor');
    assert.ok(Number.isFinite(claim.exp)&&claim.exp>now+60,'Expired JWT');
    assert.notEqual(claim.is_anonymous,true,'Anonymous actor prohibited');
  }
  return {phase,orgA,orgB,actors,publicKey:env.NCC_P26_PUBLIC_KEY};
}

export async function runHostedSignedReadOnly(config,transport=fetch){
  const {phase,orgA,orgB,actors,publicKey}=config;
  assert.ok(Object.hasOwn(phases,phase),'Invalid phase');
  assert.equal(typeof transport,'function');
  const [student,coachA,coachB]=actors;
  const checks=[];
  async function get(actor,path){
    assert.ok(path.startsWith('/rest/v1/')||path==='/auth/v1/user',
      'Only signed GET identity and PostgREST reads are allowed');
    const url=new URL(path,HOSTED_ORIGIN);
    assert.equal(url.origin,HOSTED_ORIGIN);
    const response=await transport(url.toString(),{
      method:'GET',redirect:'error',signal:AbortSignal.timeout(12000),
      headers:{apikey:publicKey,Authorization:'Bearer '+actor.token,
        Accept:'application/json','Cache-Control':'no-store'}
    });
    assert.equal(response.status,200,'Signed GET failed for '+actor.name+' ('+response.status+')');
    return response.json();
  }
  for(const actor of actors){
    // This server-side response, unlike decoded JWT text, establishes identity.
    const user=await get(actor,'/auth/v1/user');
    assert.equal(user?.id,actor.id,'GoTrue actor identity mismatch');
    assert.ok(user?.email_confirmed_at||user?.confirmed_at,
      'Fictional test actor email not verified');
  }
  checks.push('GO_TRUE_SIGNED_IDENTITIES_3');
  const profilePath=id=>'/rest/v1/efg_profiles?select=user_id,role,active,organization_id&user_id=eq.'+id+'&limit=2';
  for(const actor of actors){
    const p=await get(actor,profilePath(actor.id));
    assert.ok(Array.isArray(p)&&p.length===1&&p[0].user_id===actor.id&&p[0].active===true,
      'Actor missing own active profile: '+actor.name);
    assert.equal(p[0].role,actor.name==='student'?'student':'coach',
      'Wrong role for test actor: '+actor.name);
    if(actor.name==='student')assert.equal(p[0].organization_id,orgA,
      'Student not linked to authorized test organization');
  }
  checks.push('ACTIVE_ROLES_BOUND_TO_SIGNED_USERS');
  for(const [actor,org]of [[coachA,orgA],[coachB,orgB]]){
    const rows=await get(actor,'/rest/v1/efg_organizations?select=id,coach_id,is_test&id=eq.'+org+'&limit=2');
    assert.ok(Array.isArray(rows)&&rows.length===1&&rows[0].id===org&&
      rows[0].is_test===true&&rows[0].coach_id===actor.id,
      'Coach not assigned to independently controlled TEST organization');
  }
  checks.push('TWO_DISTINCT_TEST_ORGS_COACH_ASSIGNED');
  const intakePath='/rest/v1/efg_coach_relaunch_intakes?select=student_id,organization_id,shared_at&student_id=eq.'+student.id+'&limit=2';
  const draftPath='/rest/v1/efg_coach_plan_drafts?select=student_id,organization_id,coach_id,status&student_id=eq.'+student.id+'&limit=2';
  const [ownIntake,coachIntake,foreignIntake,ownDraft,coachDraft,foreignDraft]=await Promise.all([
    get(student,intakePath),get(coachA,intakePath),get(coachB,intakePath),
    get(student,draftPath),get(coachA,draftPath),get(coachB,draftPath)
  ]);
  for(const rows of [ownIntake,coachIntake,foreignIntake,ownDraft,coachDraft,foreignDraft])
    assert.ok(Array.isArray(rows)&&rows.length<=1,'Unexpected signed RLS row count');
  assert.equal(foreignIntake.length,0,'Cross-org intake exposure');
  assert.equal(foreignDraft.length,0,'Cross-org private draft exposure');
  assert.equal(ownDraft.length,0,'Student must not see unpublished Coach draft');
  assert.equal(coachIntake.length,phases[phase].intake,'Active sharing scope mismatch');
  assert.equal(coachDraft.length,phases[phase].draft,'Private draft scope mismatch');
  if(coachIntake.length)assert.ok(coachIntake[0].shared_at&&coachIntake[0].organization_id===orgA);
  if(coachDraft.length)assert.ok(coachDraft[0].organization_id===orgA&&coachDraft[0].coach_id===coachA.id);
  checks.push('INTAKE_AND_DRAFT_RLS_PHASE_'+phase.toUpperCase());
  const accessPath='/rest/v1/efg_student_plan_access?select=student_id,status&student_id=eq.'+student.id+'&limit=2';
  const access=await get(student,accessPath);
  assert.ok(Array.isArray(access)&&access.length<=1&&access.every(x=>x.status!=='published'),
    'Student may already be published: abort pre-release check');
  const externalAccess=await get(coachB,accessPath);
  assert.ok(Array.isArray(externalAccess)&&externalAccess.length===0,'Cross-org student plan access exposure');
  const diaryPath='/rest/v1/efg_daily_logs?select=student_id&student_id=eq.'+student.id+'&limit=2';
  const foreignDiary=await get(coachB,diaryPath);
  assert.ok(Array.isArray(foreignDiary)&&foreignDiary.length===0,'Cross-org diary exposure');
  checks.push('NO_PUBLISHED_ACCESS_OR_FOREIGN_DIARY');
  return {status:'PASS_SIGNED_RLS_READ_ONLY',phase,checked:checks,
    otp_provenance:'REQUIRES_SEPARATE_HUMAN_BROWSER_EVIDENCE',
    diary_write_gate:'NOT_TESTED_NO_WRITE_PERMITTED',
    hosted_writes:0};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const config=validateHostedActors(process.env);
    const report=await runHostedSignedReadOnly(config);
    console.log(JSON.stringify(report)); // No JWTs, emails, UUIDs, or private rows.
  }catch(error){
    console.error('NCC P26 FAIL: '+String(error?.message||'unknown').slice(0,230));
    process.exitCode=1;
  }
}
