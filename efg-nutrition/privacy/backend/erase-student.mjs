// SERVER ONLY. No browser import, no credentials in source, no public HTTP handler.
// The SQL entry points grant EXECUTE to service_role only.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function failure(phase,error){
 const result=new Error('La eliminación no se confirmó. Fase: '+phase+'.');
 result.phase=phase;result.code=error?.code||'ERASURE_UNVERIFIED';return result;
}
function validManifest(plan,requestId){
 if(!plan||plan.request_id!==requestId||!UUID.test(plan.user_id||'')||plan.role!=='student'||
    plan.status!=='processing'||!Array.isArray(plan.files))throw failure('prepare');
 for(const file of plan.files){
  if(file.owner_id!==plan.user_id||!/^[a-zA-Z0-9_-]+$/.test(file.bucket_id||'')||
    typeof file.name!=='string'||!file.name||file.name.length>2048||file.name.includes('\0')||
    file.name.split('/').some(x=>!x||x==='.'||x==='..'))throw failure('file_ownership');
 }
 return plan;
}
export async function eraseStudentAccount(service,{requestId}={}){
 if(!UUID.test(requestId||''))throw failure('request_id');
 // The server derives the target from an existing verified request. No user ID parameter.
 const prepared=await service.rpc('ncc_prepare_student_erasure',{p_request_id:requestId});
 if(prepared.error)throw failure('prepare',prepared.error);
 const plan=validManifest(prepared.data,requestId);
 const banned=await service.auth.admin.updateUserById(plan.user_id,{ban_duration:'876600h'});
 if(banned.error)throw failure('restrict_auth',banned.error);
 const buckets=new Map();
 for(const f of plan.files){if(!buckets.has(f.bucket_id))buckets.set(f.bucket_id,new Set());buckets.get(f.bucket_id).add(f.name);}
 for(const [bucket,names] of buckets){
  const paths=[...names];
  for(let i=0;i<paths.length;i+=100){
   const removed=await service.storage.from(bucket).remove(paths.slice(i,i+100));
   if(removed.error)throw failure('storage',removed.error);
  }
 }
 // SQL verifies Storage is empty, rechecks references and schema, then removes
 // only target-owned relational data in one transaction. Auth is still present.
 const purged=await service.rpc('ncc_purge_student_data',{p_request_id:requestId});
 if(purged.error)throw failure('database',purged.error);
 if(purged.data?.user_id!==plan.user_id||purged.data?.request_id!==requestId||
    purged.data?.database_purged!==true||purged.data?.storage_purged!==true)throw failure('database_receipt');
 const deleted=await service.auth.admin.deleteUser(plan.user_id,false);
 // A timed-out delete may have succeeded. Verify independently before claiming success.
 const check=await service.auth.admin.getUserById(plan.user_id);
 const missing=check.error?.status===404||check.error?.code==='user_not_found';
 if(!missing||check.data?.user)throw failure('auth_verification',check.error||deleted.error);
 return {requestId,databaseRemoved:true,ownedFilesRemoved:true,accountRemoved:true};
}
