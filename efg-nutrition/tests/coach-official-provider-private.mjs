// RAM-only test provider. Session binding comes from the real UI scope, never overriding it.
export function createOfficialTestProvider(readScope,input){
 if(input?.synthetic!==true||!Array.isArray(input.catalog))throw Error('PRIVATE_INPUT_REQUIRED');
 let epoch=1,revoked=false,pending=null,held=false,celiac=false,explicit=true;
 const listeners=new Set();
 const notify=()=>{epoch++;for(const fn of listeners)fn();};
 const binding=()=>({sessionId:'PRIVATE-FIXTURE-SESSION',sourceEpoch:epoch});
 function bundle(s){
  const b={userId:s.userId,sessionId:s.sessionId,studentId:s.studentId,organizationId:s.organizationId,sourceEpoch:s.sourceEpoch};
  const wrap=data=>({status:revoked?'denied':'available',binding:b,data:{student_id:s.studentId,organization_id:s.organizationId,revision:1,...data}});
  return {synthetic:true,now:input.now,
   general:wrap({completed_version:'PRIVATE-1',shared_at:'2026-11-01T00:00:00Z',dietary_pattern:'omnivore',preferred_foods:'',disliked_foods:''}),
   health:wrap({shared_with_coach:true,document_id:'PRIVATE-HEALTH',processing_consent:true,followup_consent:true,
    conditions:celiac?{celiac:'confirmed'}:{},sibo_phase:'none',
    ...(!celiac&&explicit?{restriction_declaration:{version:1,kind:'none_declared',declared_by:s.studentId,source_revision:1,confirmed_at:'2026-11-01T00:00:00Z'}}:{})}),
   goals:wrap({confirmed_by:s.userId,source_intake_revision:1,goal:input.goal,pattern:input.context.pattern}),
   preferences:wrap({confirmed_by:s.userId,source_intake_revision:1,catalog_revision:1,preferred_text:'',disliked_text:'',preferred_ids:[],disliked_ids:[]}),
   catalog:wrap({origin:'private_official_capture_replay',foods:input.catalog,template:input.template})};
 }
 return {
  readBinding:binding,
  readBundle:s=>{const value=bundle(s);return held?new Promise(resolve=>{pending=()=>resolve(value);}):Promise.resolve(value);},
  subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},
  revoke(){revoked=true;notify();},
  changeStudent(){notify();},
  setCeliac(value){celiac=value;notify();},
  setExplicit(value){explicit=value;notify();},
  hasPending:()=>!!pending,
  hold(){held=true;},release(){held=false;pending?.();pending=null;},
  reset(){revoked=false;celiac=false;explicit=true;notify();},
  currentScope:()=>({...readScope(),...binding()})
 };
}
