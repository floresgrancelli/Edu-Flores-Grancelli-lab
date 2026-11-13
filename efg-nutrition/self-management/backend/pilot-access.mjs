const fail=code=>{throw Object.assign(Error(code),{code});};
export function createPilotAccessManager(client,{now=()=>Date.now(),ownerEmail='floresgrancelli@gmail.com'}={}){
 return async(actor,body)=>{
  const {data:profile,error}=await client.from('efg_profiles').select('role,active').eq('user_id',actor).maybeSingle();
  if(error)fail('unavailable');
  if(profile?.role!=='admin'||profile.active!==true)fail('admin_required');
  if(body.action==='admin_status')return {authorized:true};
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  if(email.length>200||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))fail('invalid_request');
  let user=null;
  // Auth directory is server-only; return only the exact requested account.
  for(let page=1;page<=100;page++){
   const {data,error}=await client.auth.admin.listUsers({page,perPage:1000});
   if(error)fail('unavailable');
   user=data.users.find(u=>u.email?.toLowerCase()===email);
   if(user||data.users.length<1000)break;
   if(page===100)fail('unavailable');
  }
  if(!user||!user.email_confirmed_at||user.is_anonymous)fail('account_not_ready');
  const target=await client.from('efg_profiles').select('role,active').eq('user_id',user.id).maybeSingle();
  if(target.error)fail('unavailable');
  const ownerAccess=target.data?.role==='admin'&&target.data.active===true&&email===ownerEmail.toLowerCase();
  if(ownerAccess&&['admin_grant','admin_revoke'].includes(body.action))fail('owner_access_fixed');
  if(body.action==='admin_grant'&&target.data&&(!target.data.active||!['admin','coach'].includes(target.data.role)))fail('mode_mismatch');
  if(body.action==='admin_grant'){
   if(!Number.isInteger(body.days)||body.days<1||body.days>90)fail('invalid_request');
   const saved=await client.from('ncc_self_pilot_access').upsert({user_id:user.id,active:true,expires_at:new Date(now()+body.days*86400000).toISOString()});
   if(saved.error)fail('unavailable');
  }else if(body.action==='admin_revoke'){
   const saved=await client.from('ncc_self_pilot_access').update({active:false}).eq('user_id',user.id);
   if(saved.error)fail('unavailable');
  }
  const access=await client.from('ncc_self_pilot_access').select('active,expires_at').eq('user_id',user.id).maybeSingle();
  if(access.error)fail('unavailable');
  return {email,access:access.data,ownerAccess,eligible:!ownerAccess&&(!target.data||target.data.active&&['admin','coach'].includes(target.data.role))};
 };
}
