// Prepared real HTTP/JWT checks; no execution at import. Four existing fixture accounts only.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {q,rowSnapshot} from '../runner/snapshot.mjs';
import {yes,denied} from '../runner/local-context.mjs';
import {tables} from './install.mjs';
export async function verifyDomFixtureAccess({sql,rpc,request,users,orgs}){
 assert.equal(process.env.EFG_QA_DOM_FIXTURE,'1');
 const tracked=tables.map(t=>'public.'+t),empty=rowSnapshot(sql,tracked);
 for(const value of Object.values(empty))assert.deepEqual(JSON.parse(value),[],'No real/preexisting rows permitted');
 const seed={};
 for(const side of ['A','B']){
  const s=users['student'+side],c=users['coach'+side],org=orgs[side];
  seed[side]={
   efg_activities:{student_id:s.id,activity_day:'2026-11-01',steps:123},
   efg_weights:{student_id:s.id,measured_on:'2026-11-01',kg:70},
   efg_daily_logs:{student_id:s.id,log_day:'2026-11-01',meals:{},sports:[],skipped:{},totals:{}},
   efg_weekly_reports:{student_id:s.id,coach_id:c.id,week_ending:'2026-11-01',report_text:'TEST_ONLY '+side},
   efg_invitations:{id:randomUUID(),email:'test-'+side+'@example.invalid',nickname:'TEST_ONLY',role:'student',organization_id:org,invited_by:c.id},
   efg_payments:{id:randomUUID(),payer_id:s.id,recipient_id:c.id,organization_id:org,payment_kind:'student_coach',amount_ars:1,period_label:'TEST_ONLY',alias_snapshot:'TEST_ONLY',receipt_path:'TEST_ONLY/'+side},
   efg_personal_targets:{user_id:c.id,kcal:2000,protein_g:100,carb_g:250,fat_g:60,fiber_g:25}
  };
 }
 seed.A.efg_billing_settings={id:1,alias:'TEST_ONLY',additional_aliases:[]};
 try{
  for(const rows of Object.values(seed))for(const [table,row]of Object.entries(rows)){
   const keys=Object.keys(row);sql(`insert into public.${table}(${keys.join(',')}) select ${keys.map(k=>'x.'+k).join(',')} from jsonb_populate_record(null::public.${table},${q(JSON.stringify(row))}::jsonb) x;`);
  }
  // Schema cache only; missing endpoint is not an authorization PASS.
  sql("notify pgrst,'reload schema'");
  for(let n=0;n<40;n++){const r=await rpc('efg_claim_invitation',users.coachA.token);if(r.ok)break;assert.equal(r.data.code,'PGRST202');assert.ok(n<39);await new Promise(r=>setTimeout(r,250));}
  const before=rowSnapshot(sql,tracked),claimTables=['public.efg_profiles','public.efg_organizations','public.efg_consents','public.efg_invitations'];
  for(const [label,u] of Object.entries(users)){
   const beforeClaim=rowSnapshot(sql,claimTables),r=yes(await rpc('efg_claim_invitation',u.token),'existing account hydration');assert.equal(r.status,'existing');assert.equal(r.role,label.startsWith('coach')?'coach':'student');assert.deepEqual(rowSnapshot(sql,claimTables),beforeClaim);
  }
  denied(await rpc('efg_claim_invitation',undefined),'anonymous claim',['42501']);
  sql(`update public.efg_profiles set active=false where user_id=${q(users.coachA.id)}`);
  try{denied(await rpc('efg_claim_invitation',users.coachA.token),'inactive existing account',['42501']);}
  finally{sql(`update public.efg_profiles set active=true where user_id=${q(users.coachA.id)}`);}
  const absent=randomUUID();sql(`begin;set local role authenticated;set local request.jwt.claims=${q(JSON.stringify({sub:absent,role:'authenticated'}))};do $$begin
   begin perform public.efg_claim_invitation();raise exception 'Unexpected nonexisting account acceptance';exception when sqlstate '42501' then null;end;
   end$$;rollback;`);
  for(const [table,row]of Object.entries(seed.A)){
   const selected=yes(await request('/rest/v1/'+table+'?select=*',{token:users.coachA.token}),table+' authorized read');
   assert.equal(selected.length,1,table+' owner scope');
   const foreign=yes(await request('/rest/v1/'+table+'?select=*',{token:users.coachB.token}),table+' B read');
   if(table==='efg_billing_settings')assert.equal(foreign[0].alias,'TEST_ONLY');
   else {assert.equal(foreign.length,1);assert.ok(!JSON.stringify(foreign).includes(users.studentA.id)&&!JSON.stringify(foreign).includes(users.coachA.id),'No A identifiers in B scope');}
   denied(await request('/rest/v1/'+table+'?select=*'),'anonymous table',['42501']);
   for(const method of ['POST','PATCH','DELETE']){
    const filterKey=Object.keys(row)[0];
    const path='/rest/v1/'+table+(method==='POST'?'':'?'+filterKey+'=eq.'+encodeURIComponent(row[filterKey]));
    denied(await request(path,{method,token:users.coachA.token,...(method==='DELETE'?{}:{body:row})}),`${method} ${table}`,['42501']);
    assert.deepEqual(rowSnapshot(sql,tracked),before,'Rejected write must not mutate');
   }
  }
  const oa=yes(await request('/rest/v1/efg_organizations?select=id',{token:users.coachA.token}),'org A');assert.deepEqual(oa.map(x=>x.id),[orgs.A]);
  const ob=yes(await request('/rest/v1/efg_organizations?select=id',{token:users.coachB.token}),'org B');assert.deepEqual(ob.map(x=>x.id),[orgs.B]);
  return {status:'PASS_SYNTHETIC_DOM_READ_ONLY_ACL',tables:8,claim:'existing-only; no invitations claimed'};
 }finally{
  for(const table of [...tracked].reverse())sql(`delete from ${table}`);
  assert.deepEqual(rowSnapshot(sql,tracked),empty,'Seed-only records removed exactly');
 }
}
