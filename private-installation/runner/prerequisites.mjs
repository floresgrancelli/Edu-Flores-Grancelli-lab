import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export function reviewedDependencies(root){
 // These definitions occur in observed policies/triggers but their bodies were
 // not supplied. Missing inputs stop BEFORE stack creation; never use stubs.
 const required=['efg_private.student_belongs_to_coach(uuid)','efg_private.coach_notify_shared_relaunch_intake()'];
 let items;try{items=JSON.parse(readFileSync(new URL('../required-dependencies-reviewed.json',root),'utf8'));}
 catch{throw Error('MISSING_REVIEWED_DEFINITIONS: '+required.join(', '));}
 assert.ok(Array.isArray(items));assert.deepEqual(items.map(x=>x.signature).sort(),[...required].sort());
 for(const d of items){
  assert.equal(d.project,'cyjvddhimbsfipjfctsl');assert.ok(d.observedAt&&d.reviewedAt);
  assert.equal(createHash('sha256').update(d.definition).digest('hex'),d.sha256);
  assert.equal(d.owner,'postgres');assert.ok(Array.isArray(d.acl));assert.ok(Array.isArray(d.proconfig));assert.equal(typeof d.prosecdef,'boolean');
  const name=d.signature.split('(')[0];assert.ok(d.definition.toLowerCase().startsWith('create or replace function '+name+'('));
  assert.ok(d.acl.every(a=>/^(postgres|authenticated|service_role|)=X\/postgres$/.test(a)));
 }
 // Shape validation is not proof of authorization. Exact file/hash must be in
 // the independently reviewed package before a future execution is approved.
 return items;
}
if(process.argv.includes('--check')){reviewedDependencies(import.meta.url);console.log('Required definitions present; use only the exact reviewed package');}
