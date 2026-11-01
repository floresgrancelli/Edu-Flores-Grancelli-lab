// SEC12: offline regression of the hosted public SECURITY DEFINER inventory.
// This does NOT connect to Supabase and is NOT a JWT/authorization test.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=new URL('./sql/sec12-hosted-privileged-rpc-baseline-20261030.json',import.meta.url);
const manifest=JSON.parse(readFileSync(file,'utf8'));
const expected=[
'efg_activate_paid_coach','efg_claim_invitation','efg_confirm_payment',
'efg_delete_pending_invitation','efg_invite_coach','efg_invite_student',
'efg_invite_test_student','efg_offer_coach','efg_revoke_invitation',
'efg_revoke_test_invitation','efg_set_coach_alias','efg_set_coach_plan',
'efg_set_platform_alias','efg_set_platform_aliases','efg_set_seats',
'efg_set_student_active','efg_submit_coach_payment','efg_submit_payment',
'efg_update_subscription'];
const expectedSHA={
 efg_activate_paid_coach:'c64b8974091aec80bbe9363b6cf79bb4',
 efg_claim_invitation:'035238c2ad10e3de407e39bb5dc44297',
 efg_confirm_payment:'8f1142f3ab4ba6480a3eb3c73d384ae0',
 efg_delete_pending_invitation:'ed9985dba33af6f833c29e6b097178f6',
 efg_invite_coach:'3fc2fa0f50500c8042ac70115013f481',
 efg_invite_student:'41bc3c0aebaa3de6cb988a8354b9bb5c',
 efg_invite_test_student:'2e5a80c4df2061359b1f82b90d872dee',
 efg_offer_coach:'cca1c2cf4e62e3ffc9139cf276641070',
 efg_revoke_invitation:'b9d0261304ed298dceda8aad58dde9f0',
 efg_revoke_test_invitation:'76427f32730cdd86d9b5e7482fcc2497',
 efg_set_coach_alias:'243f4eb24b255c0e6d529a47622a16b9',
 efg_set_coach_plan:'14fabf1fffdddf61cd8e0d455b012df5',
 efg_set_platform_alias:'cbd56ad74c99539d9030c0fafcd23fda',
 efg_set_platform_aliases:'63d11f480fb65e80a9bc40e2dc165c3f',
 efg_set_seats:'8ca7ab7eb10934610f81b6f39c6a2042',
 efg_set_student_active:'0a57dc499b6f3fb58d4e10cf9a12fc06',
 efg_submit_coach_payment:'fd2db1004b00e8eaea60a06a88b4255a',
 efg_submit_payment:'71d4af734748151433fa00c7c2d93d8f',
 efg_update_subscription:'c1d1ac8686c8b86ca52f7b3592e0725a'
};
function differences(base){
 const issues=[];
 if(base.hosted_project!=='cyjvddhimbsfipjfctsl')issues.push('project');
 if(!Array.isArray(base.functions)||base.functions.length!==19)return [...issues,'function count'];
 const names=base.functions.map(f=>f.name);
 if(new Set(names).size!==19||names.join('|')!==expected.join('|'))issues.push('unexpected functions');
 if(JSON.stringify(base.expected_names)!==JSON.stringify(expected))issues.push('name expectation drift');
 for(const f of base.functions){
  if(!f.security_definer||f.anon_execute||!f.authenticated_execute)issues.push(f.name+': role exposure');
  if(!f.explicit_search_path||f.configuration!=='search_path=""')issues.push(f.name+': search_path');
  if(!f.references_identity_or_admin)issues.push(f.name+': missing guard reference');
  if(f.definition_md5!==expectedSHA[f.name])issues.push(f.name+': changed function fingerprint');
  if(typeof f.args!=='string')issues.push(f.name+': signature');
 }
 if(!/^\s*select\b/i.test(base.discovery_sql)||/;\s*(drop|alter|insert|update|delete|grant|revoke|call|do)\b/i.test(base.discovery_sql))issues.push('query not read-only');
 return issues;
}
assert.deepEqual(differences(manifest),[]);
for(const [key,change] of [
 ['anon grant',f=>{f.anon_execute=true}],
 ['missing authorization reference',f=>{f.references_identity_or_admin=false}],
 ['privileged body drift',f=>{f.definition_md5='0'.repeat(32)}],
 ['unlocked search path',f=>{f.configuration='search_path=public'}]
]){
 const fake=structuredClone(manifest);change(fake.functions[0]);
 assert.ok(differences(fake).length>0,key+' must trigger a negative result');
}
console.log('PASS SEC12: 19 exact hosted RPC signatures, definer ACL/guard/path and definitions frozen; mutation tests detect exposure/drift. NOT signed JWT, authorization, restore or release GO.');
