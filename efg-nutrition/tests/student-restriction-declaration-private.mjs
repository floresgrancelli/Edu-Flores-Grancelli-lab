import assert from 'node:assert/strict';
import {createStudentRestrictionDeclaration} from '../pilot/student-restriction-declaration.js';
const user='11111111-1111-4111-8111-111111111111',org='22222222-2222-4222-8222-222222222222',session='33333333-3333-4333-8333-333333333333';
function fixture(){
 let scope={userId:user,organizationId:org,sessionId:session,role:'student',active:true,epoch:1};
 let row=null,hold=null;const calls=[];
 const sb={auth:{getUser:async()=>{if(hold)await hold();return {data:{user:{id:user}}};}},rpc:async(name,args)=>{
  calls.push({name,args});
  if(name==='efg_current_coach_health_document')return {data:{id:session,sha256:'b'.repeat(64),version:'TEST_ONLY',content:'Fictional consent for unit test only.'}};
  if(name==='efg_get_coach_health_intake')return {data:row};
  if(name==='efg_declare_no_restrictions'){const revision=(row?.revision??0)+1;
   row={student_id:user,organization_id:org,revision,conditions:{},restriction_declaration:{version:1,kind:'none_declared',
    source_revision:revision,declared_by:user,confirmed_at:new Date().toISOString()}};return {data:row.revision};}
  if(name==='efg_revoke_coach_health_intake'){row={revision:row.revision+1,revoked:true,conditions:{}};return {data:true};}
  throw Error('Unexpected RPC');
 }};
 return {client:createStudentRestrictionDeclaration({sb,readContext:()=>scope,enabled:true}),calls,
  change:()=>{scope={...scope,epoch:scope.epoch+1};},setRow:r=>row=r,hold:f=>hold=f};
}
{
 const f=fixture();const fresh=await f.client.load();assert.equal(fresh.declaration,'unknown');assert.equal(fresh.revision,0);
 for(const choice of [{},{noneDeclared:true},{noneDeclared:true,processing:true},{processing:true,sharing:true}])
  await assert.rejects(f.client.declare(choice));
 assert.equal(f.calls.filter(c=>c.name==='efg_declare_no_restrictions').length,0);
 const out=await f.client.declare({noneDeclared:true,processing:true,sharing:true});assert.equal(out.revision,1);
 assert.equal((await f.client.load()).declaration,'none_declared');
 assert.equal((await f.client.revoke()).revoked,true);
}
{
 const f=fixture();await f.client.load();f.hold(async()=>{f.change();});
 await assert.rejects(f.client.declare({noneDeclared:true,processing:true,sharing:true}),/cambiaron/);
 assert.equal(f.calls.filter(c=>c.name==='efg_declare_no_restrictions').length,0,'No write after context changes during Auth');
}
{
 const f=fixture();await f.client.load();f.client.invalidate();
 await assert.rejects(f.client.declare({noneDeclared:true,processing:true,sharing:true}));
 assert.equal(f.calls.filter(c=>c.name==='efg_declare_no_restrictions').length,0);
}
{
 const f=fixture();f.setRow({student_id:user,organization_id:session,revision:1,conditions:{}});
 await assert.rejects(f.client.load(),/no corresponde/);
}
{
 const f=fixture();f.setRow({student_id:user,organization_id:org,revision:1,conditions:{celiac:true}});
 assert.equal((await f.client.load()).declaration,'unknown');
}
{
 const f=fixture();f.setRow({student_id:user,organization_id:org,revision:1,conditions:{}});
 assert.equal((await f.client.load()).declaration,'unknown','Empty conditions never imply none');
}
console.log('PASS declaration component: separate choices, unknown, revoke, identity, invalidation, Auth-race no write. Synthetic unit transport only.');
