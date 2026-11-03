// Construct an operator-reviewed, all-or-nothing SQL *candidate* from six
// audited scripts (including the existing signed six-meal entry status). NO database connection or deployment is possible here.
// Intentionally does not ingest real records, seed nutrition review or enable flags.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

export const RELEASE_SOURCES=Object.freeze([
  {
    "path": "efg-nutrition/migrations/20261031_coach_relaunch_owner_org_rls_fix_NOT_APPLIED.sql",
    "sha": "10b48a94c50dcaf74349bb5d80db0452ffe1cc1b",
    "key": "SEC09"
  },
  {
    "path": "efg-nutrition/migrations/20261031_coach_optional_sharing_NOT_APPLIED.sql",
    "sha": "9330f7de3cbad7cbe56cdd79415b198245397bb4",
    "key": "OPT01"
  },
  {
    "path": "efg-nutrition/migrations/20261031_coach_reviewed_food_url_constraint_fix_NOT_APPLIED.sql",
    "sha": "75416fd2f88275ad62f8ec813063ec14650af311",
    "key": "FOOD_URL"
  },
  {
    "path": "efg-nutrition/docs/COACH119_HOSTED_ATOMIC_RELEASE_CANDIDATE_NOT_APPLIED.sql",
    "sha": "9ac4f61a9c86bef16c1c542e21c747ecdc4271de",
    "key": "COACH119"
  },
  {
    "path": "efg-nutrition/migrations/20261030_coach116_legal_first_student_status.sql",
    "sha": "b551798c460a80c82dc156ca9fa4a3770250accc",
    "key": "COACH116"
  },
  {
    "path": "efg-nutrition/migrations/20261102_coach_shared_student_recipes_NOT_APPLIED.sql",
    "sha": "1944a69d47767ac0991030f480b8251904224ad6",
    "key": "GU06"
  }
]);
const root=new URL('../../',import.meta.url);
const hashGitBlob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');

export function buildPilotCoach119Transaction(){
 const blocks=[];
 for(const item of RELEASE_SOURCES){
  const bytes=readFileSync(new URL(item.path,root));
  const observed=hashGitBlob(bytes);
  assert.equal(observed,item.sha,'SOURCE_CHANGED_'+item.key+': audited Git blob digest drift');
  let src=bytes.toString('utf8');
  const begins=(src.match(/^begin;\s*$/gim)||[]).length;
  const commits=(src.match(/^commit;\s*$/gim)||[]).length;
  // COACH116 is a CREATE OR REPLACE FUNCTION script without an outer SQL
  // transaction. It is inserted INSIDE this bundle's single transaction.
  // All previous audited scripts keep their exact BEGIN/COMMIT verification.
  if(item.key==='COACH116'){
   assert.equal(begins,0,'COACH116 must not open another transaction');
   assert.equal(commits,0,'COACH116 must not commit prematurely');
  }else{
   assert.equal(begins,1,'Need exactly one outer BEGIN '+item.key);
   assert.equal(commits,1,'Need exactly one outer COMMIT '+item.key);
   src=src.replace(/^begin;\s*\r?\n/gim,'').replace(/^commit;\s*\r?\n/gim,'');
  }
  assert.doesNotMatch(src,/\\(?:i|include|copy)\b|\bcreate\s+index\s+concurrently\b/i,
    'Cannot safely combine client-side includes or concurrent indexes');
  assert.doesNotMatch(src,/^begin;\s*$|^commit;\s*$/gim,'Unexpected remaining transaction wrapper');
  blocks.push('-- BEGIN AUDITED SOURCE '+item.key+' '+item.sha+'\n'+src.trim()+
    '\n-- END AUDITED SOURCE '+item.key);
 }
 const header=[
 '-- NUTRICION CON-CIENCIA: PILOT BACKEND DDL CANDIDATE -- DO NOT AUTO-APPLY.',
 '-- Source scripts pinned by exact Git blob SHA1; review again if sources change.',
 '-- No hosted writes until operator checks the current read-only preflight,',
 '-- isolated rehearsal and Edu explicitly authorizes production changes.',
 '-- Full backup/Storage restoration drill is deferred POST-GO by owner decision.',
 '-- Pilot TERMS, PRIVACY and reviewed foods are separate prerequisites before enabling.',
 '-- NOTE: schema transaction rollback protects DDL errors, NOT all customer data.',
 '-- COACH119 remains OFF after successful installation.',
 'begin;',
 "set local lock_timeout='5s';",
 "set local statement_timeout='300s';"
 ].join('\n');
 const gates=`
-- Abort the SINGLE transaction if minimum nonclinical structural gates fail.
do $ncc_release_post$
begin
 if to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)') is null
  or to_regclass('public.efg_coach_plan_publish_receipts') is null
  or to_regclass('efg_private.coach_guide_history') is null
  or to_regprocedure('efg_private.coach_pilot_share_active(uuid,uuid)') is null
 then raise exception 'NCC_ABORT: COACH119 RPC, receipts/history or sharing helper missing'; end if;
 if exists(select 1 from efg_private.coach_release_switches where enabled)
   or not exists(select 1 from efg_private.coach_release_switches
     where switch_key='pilot_coach_atomic_publication' and enabled is false)
 then raise exception 'NCC_ABORT: release flags must remain OFF'; end if;
 if not exists(select 1 from pg_policies where schemaname='public'
   and tablename='efg_coach_relaunch_intakes'
   and policyname='efg_coach_relaunch_owner_select'
   and qual like '%efg_coach_relaunch_intakes.organization_id%')
 or not exists(select 1 from pg_policies where schemaname='public'
   and tablename='efg_pilot_participation_receipts'
   and policyname='efg_pilot_participation_owner_read'
   and qual like '%efg_pilot_participation_receipts.organization_id%')
 then raise exception 'NCC_ABORT: owner organization RLS not qualified'; end if;
 if exists(select 1 from pg_constraint
  where conrelid=to_regclass('public.efg_pilot_participation_receipts')
    and conname='efg_pilot_participation_receipts_sharing_accepted_check')
 then raise exception 'NCC_ABORT: sharing still mandatory'; end if;
 if not exists(select 1 from pg_policies where schemaname='public'
   and tablename='efg_coach_relaunch_intakes'
   and policyname='efg_coach_relaunch_shared_coach_select'
   and qual like '%coach_pilot_share_active%')
 then raise exception 'NCC_ABORT: shared Coach SELECT is not scoped'; end if;
 if not exists(select 1 from pg_constraint
  where conrelid=to_regclass('efg_private.coach_reviewed_foods')
   and conname='coach_reviewed_foods_source_url_check'
   and pg_get_constraintdef(oid) like '%char_length%'
   and pg_get_constraintdef(oid) not like '%{8,1990}%')
 then raise exception 'NCC_ABORT: reviewed food URL constraint invalid'; end if;
 if not exists(select 1 from pg_proc p
  where p.oid=to_regprocedure('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)')
   and p.prosecdef
   and not has_function_privilege('anon',p.oid,'EXECUTE')
   and has_function_privilege('authenticated',p.oid,'EXECUTE'))
 then raise exception 'NCC_ABORT: atomic publish EXECUTE permissions unsafe'; end if;
 -- Six-meal approval must activate MI DIA on signed server status. A UI-only
 -- change cannot fix the older hosted five-meal-only status function.
 if to_regprocedure('public.efg_coach_pilot_entry_status()') is null
  or coalesce(pg_catalog.strpos(
   pg_catalog.pg_get_functiondef(to_regprocedure('public.efg_coach_pilot_entry_status()')),
   'flexible_meal_guide'),0)=0
  or coalesce(pg_catalog.strpos(
   pg_catalog.pg_get_functiondef(to_regprocedure('public.efg_coach_pilot_entry_status()')),
   'v_intake.age_years is null'),0)=0
 then raise exception 'NCC_ABORT: signed student entry must support complete intake and flexible 2-6 meal guide'; end if;
 -- Consent-scoped personal recipes can be read ONLY via the signed Coach RPC.
 -- No extra SELECT policy on the original student-owned table is permitted.
 if not exists(select 1 from pg_proc p
  where p.oid=to_regprocedure('public.efg_coach_shared_student_recipes(uuid)')
    and p.prosecdef
    and not has_function_privilege('anon',p.oid,'EXECUTE')
    and has_function_privilege('authenticated',p.oid,'EXECUTE'))
  or (select count(*) from pg_policies where schemaname='public'
      and tablename='efg_personal_recipes' and cmd='SELECT')<>1
  or not exists(select 1 from pg_policies where schemaname='public'
      and tablename='efg_personal_recipes' and cmd='SELECT'
      and policyname='Alumno lee sus recetas'
      and qual like '%student_id%' and qual like '%auth.uid()%')
 then raise exception 'NCC_ABORT: GU06 owner recipe RLS or scoped Coach RPC not verified'; end if;
end
$ncc_release_post$;
notify pgrst, 'reload schema';
commit;
`.trim();
 const result=header+'\n\n'+blocks.join('\n\n')+'\n\n'+gates+'\n';
 assert.equal((result.match(/^begin;\s*$/gim)||[]).length,1,'Must have one outer begin');
 assert.equal((result.match(/^commit;\s*$/gim)||[]).length,1,'Must have one outer commit');
 const digest=createHash('sha256').update(result).digest('hex');
 return {sql:result,sha256:digest,blocks:RELEASE_SOURCES.map(x=>x.key)};
}
const mode=process.argv[2]||'--check';
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const x=buildPilotCoach119Transaction();
 if(mode==='--check')console.log(JSON.stringify({status:'PREPARED_NOT_APPLIED',sha256:x.sha256,phases:x.blocks,transactions:1,productionWrites:0,flagsEnabled:0}));
 else if(mode==='--emit'&&process.argv[3]==='--ack=PREPARE_ONLY_NOT_GO')process.stdout.write(x.sql);
 else throw Error('Use --check or --emit --ack=PREPARE_ONLY_NOT_GO (operator review only)');
}
