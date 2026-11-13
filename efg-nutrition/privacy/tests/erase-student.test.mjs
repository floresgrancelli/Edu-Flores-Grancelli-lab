import test from 'node:test';
import assert from 'node:assert/strict';
import {eraseStudentAccount} from '../backend/erase-student.mjs';
const U='11111111-1111-4111-8111-111111111111',R='aaaaaaaa-aaaa-4aaa-8aaa-000000000001';
function fixture({failAt,files=[{bucket_id:'efg-receipts',name:U+'/a.webp',owner_id:U}],stillExists=false,deleteTimedOut=false}={}){
 const calls=[];
 const error=phase=>failAt===phase?{code:'QA_ERROR'}:null;
 const sdk={
  async rpc(name,args){calls.push(name);assert.deepEqual(args,{p_request_id:R});return name==='ncc_prepare_student_erasure'
   ?{error:error('prepare'),data:{request_id:R,user_id:U,role:'student',status:'processing',files}}
   :{error:error('database'),data:{request_id:R,user_id:U,database_purged:true,storage_purged:true}};},
  auth:{admin:{
   async updateUserById(id){assert.equal(id,U);calls.push('ban');return {error:error('ban')};},
   async deleteUser(id,soft){assert.equal(id,U);assert.equal(soft,false);calls.push('auth-delete');return {error:deleteTimedOut?{code:'TIMEOUT'}:null};},
   async getUserById(id){assert.equal(id,U);calls.push('auth-verify');return stillExists?{data:{user:{id:U}}}:failAt==='verify'?{error:{code:'NETWORK'}}:{data:{user:null},error:{status:404,code:'user_not_found'}};}
  }},
  storage:{from(bucket){assert.equal(bucket,'efg-receipts');return {async remove(paths){assert.ok(paths.length<=100);calls.push('storage-remove');return {error:error('storage')};}};}}
 };
 return {sdk,calls};
}
test('removes owned files, relational data and Auth in order, then verifies',async()=>{
 const f=fixture();assert.equal((await eraseStudentAccount(f.sdk,{requestId:R})).accountRemoved,true);
 assert.deepEqual(f.calls,['ncc_prepare_student_erasure','ban','storage-remove','ncc_purge_student_data','auth-delete','auth-verify']);
});
test('has no arbitrary user ID input and requires an existing request ID',async()=>{
 const f=fixture();await assert.rejects(eraseStudentAccount(f.sdk,{requestId:'bad'}));assert.equal(f.calls.length,0);
});
test('will not delete Auth if preparation, restriction, Storage or database fails',async()=>{
 for(const phase of ['prepare','ban','storage','database']){
  const f=fixture({failAt:phase});await assert.rejects(eraseStudentAccount(f.sdk,{requestId:R}));assert.ok(!f.calls.includes('auth-delete'),phase);
 }
});
test('rejects foreign owner and path traversal before any destructive operation',async()=>{
 for(const file of [{bucket_id:'efg-receipts',name:'other.webp',owner_id:'other'},
  {bucket_id:'efg-receipts',name:'../other.webp',owner_id:U}]){
  const f=fixture({files:[file]});await assert.rejects(eraseStudentAccount(f.sdk,{requestId:R}));assert.deepEqual(f.calls,['ncc_prepare_student_erasure']);
 }
});
test('does not equate timeout or unverifiable identity with success',async()=>{
 for(const config of [{stillExists:true},{failAt:'verify'}]){
  const f=fixture(config);await assert.rejects(eraseStudentAccount(f.sdk,{requestId:R}),/auth_verification/);
 }
});
test('accepts independently verified removal after an API timeout',async()=>{
 const f=fixture({deleteTimedOut:true});assert.equal((await eraseStudentAccount(f.sdk,{requestId:R})).accountRemoved,true);
});
test('chunks and deduplicates large owned-file manifests',async()=>{
 const files=Array.from({length:205},(_,i)=>({bucket_id:'efg-receipts',name:U+'/'+i+'.webp',owner_id:U}));
 const f=fixture({files:[...files,files[0]]});await eraseStudentAccount(f.sdk,{requestId:R});assert.equal(f.calls.filter(x=>x==='storage-remove').length,3);
});
