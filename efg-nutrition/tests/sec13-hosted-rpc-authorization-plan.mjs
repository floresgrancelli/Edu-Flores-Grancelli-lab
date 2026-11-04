// SEC13: complete enumeration of pending dynamic JWT/tenant authorization tests.
// OFFLINE, no external API. PASS means only that no privileged RPC is omitted.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const baseline=load('./sql/sec12-hosted-privileged-rpc-baseline-20261030.json');
const plan=load('./sql/sec13-hosted-rpc-authorization-plan-20261030.json');
const requiredActors=['anonymous','student_A','student_B','coach_A','coach_B','admin_active','admin_inactive'];
const requiredDenials=['anonymous','admin_inactive','wrong_organization_or_owner'];
function missingCoverage(candidate){
 const errors=[];
 if(candidate.marker!=='SEC13_PENDING_DYNAMIC_AUTHORIZATION')errors.push('incorrect/green status marker');
 if(candidate.source_project!==baseline.hosted_project)errors.push('wrong hosted project');
 if(!candidate.scope?.includes('NOT EXECUTED'))errors.push('stage JWT status cannot be claimed');
 if(!candidate.limitationACK && !candidate.limitations?.includes('NOT confirmation of hosted authorization'))errors.push('missing limitations');
 if(!Array.isArray(candidate.actor_matrix)||requiredActors.some(r=>!candidate.actor_matrix.includes(r)))errors.push('missing signed JWT actor');
 if(!Array.isArray(candidate.rules)||candidate.rules.length!==19)return [...errors,'19 RPC cases required'];
 const actual=new Set(candidate.rules.map(r=>r.name));
 const expected=new Set(baseline.functions.map(r=>r.name));
 if(actual.size!==19||expected.size!==19||[...expected].some(x=>!actual.has(x))||
    [...actual].some(x=>!expected.has(x)))errors.push('privileged RPC baseline mismatch');
 for(const rule of candidate.rules){
  if(typeof rule.policy_class!=='string'||!rule.policy_class.endsWith('_only')&&
    !['owner_or_admin','payer_own_receipt_only','coach_own_receipt_only','invited_email_only','recipient_only'].includes(rule.policy_class))
   errors.push(rule.name+': no stated policy class');
  if(String(rule.positive_candidate||'').trim().length<35)errors.push(rule.name+': missing positive case');
  if(String(rule.negative_case||'').trim().length<12)errors.push(rule.name+': missing negative scenario');
  if(!requiredDenials.every(d=>rule.mandatory_denials?.includes(d)))errors.push(rule.name+': denied JWT/tenant actor incomplete');
  if(!requiredActors.includes(rule.negative_actor))errors.push(rule.name+': unknown negative actor');
  if(rule.requires_signed_jwt!==true||rule.requires_isolated_faithful_restore!==true||
     rule.effects_must_be_verified!==true||rule.qa_result!=='NOT_TESTED_ON_HOSTED_SHAPE')
   errors.push(rule.name+': unauthorized test result or missing safeguards');
 }
 if(!candidate.critical_review?.includes('efg_confirm_payment'))
  errors.push('inactivity permission review omitted');
 return errors;
}
assert.deepEqual(missingCoverage(plan),[]);
for(const [name,change] of [
 ['drop a function',p=>p.rules.pop()],
 ['silently approve without JWT',p=>p.rules[0].qa_result='PASS'],
 ['drop cross-organization denial',p=>p.rules[3].mandatory_denials=['anonymous','admin_inactive']],
 ['invent a different hosted project',p=>p.source_project='unknown'],
 ['invent a privileged function',p=>p.rules[0].name='efg_unknown'],
 ['omit disabled role',p=>p.actor_matrix=p.actor_matrix.filter(x=>x!=='admin_inactive')]
]){
 const mutated=structuredClone(plan);change(mutated);
 assert.ok(missingCoverage(mutated).length>0,name+' must FAIL CLOSED');
}
console.log('PASS SEC13: exact 19/19 privileged RPCs have explicit candidate allow/deny scenarios and staged JWT/tenant coverage; ALL 19 still NOT TESTED ON HOSTED-SHAPE restore. NOT release GO.');
