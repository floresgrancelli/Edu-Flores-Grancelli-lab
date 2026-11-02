// Private frontend proposal. OFF by default; callbacks are not installed here.
// This is presentation/state control, NEVER a server authorization boundary.
export const SERVER_COMPATIBILITY_ENABLED=false;
const copy=x=>structuredClone(x);
const fail=code=>{throw Object.assign(Error(code),{code});};
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const number=x=>typeof x==='number'&&Number.isFinite(x);
const text=x=>typeof x==='string'&&x.trim().length>0;
const stable=x=>JSON.stringify(x,(_,v)=>object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const rejectEvidence=x=>{if(object(x)&&['evidence','provenance','compatibility','verified','receipt','glutenEvidence','lactoseEvidence'].some(k=>Object.hasOwn(x,k)))fail('CLIENT_EVIDENCE_REJECTED');};
function scopeKey(s){
 if(!s||s.role!=='coach'||s.active!==true||s.userId!==s.profileId||!text(s.userId)||!text(s.sessionId)||
 !text(s.organizationId)||!text(s.studentId)||s.studentActive!==true||s.ownerId!==s.userId||
 s.studentOrganizationId!==s.organizationId||s.consent!==true||s.consentStudentId!==s.studentId||
 s.consentOrganizationId!==s.organizationId||!Number.isSafeInteger(s.sourceEpoch)||s.sourceEpoch<1)fail('NO_CURRENT_SCOPE');
 return stable([s.userId,s.sessionId,s.organizationId,s.studentId,s.sourceEpoch]);
}
// No source, URL, verdict, nutrient, condition or consent can enter this request.
export function recipeProjection(plan){
 rejectEvidence(plan);
 if(!object(plan)||!Array.isArray(plan.meals)||plan.meals.length!==5)fail('INVALID_RECIPE');
 const meals=plan.meals.map(m=>{
  rejectEvidence(m);
  if(!object(m)||!text(m.slot)||!Array.isArray(m.items)||!m.items.length)fail('INVALID_RECIPE');
  return {slot:m.slot,items:m.items.map(i=>{
   rejectEvidence(i);
   if(!object(i)||!text(i.id)||!number(i.qty)||i.qty<=0||!['g','ml'].includes(i.unit))fail('INVALID_RECIPE');
   // Whitelist discards locally recalculated nutrient values; server resolves them.
   return {id:i.id,qty:i.qty,unit:i.unit};
  })};
 });
 if(new Set(meals.map(m=>m.slot)).size!==5||meals.flatMap(m=>m.items).length>150)fail('INVALID_RECIPE');
 return {meals};
}
export const serverCompatibilityFrame=r=>({draft:r.draft_revision,intake:r.intake_revision,health:r.health_revision,catalog:r.catalog_digest,goal:r.goal,declaration:r.restriction_declaration,pattern:r.compatibility?.pattern});
function checkEnvelope(r,s){
 if(!object(r)||r.viewer_id!==s.userId||r.session_id!==s.sessionId||r.student_id!==s.studentId||r.organization_id!==s.organizationId||r.publishable!==false)fail('SERVER_SCOPE_MISMATCH');
 if(!['draft_revision','intake_revision','health_revision'].every(k=>Number.isSafeInteger(r[k])&&r[k]>0)||!text(r.catalog_digest)||!object(r.goal))fail('SERVER_VERSION_MISSING');
 if(!['none_declared','clinical_declared'].includes(r.restriction_declaration))fail('SERVER_DECLARATION_MISSING');
 return serverCompatibilityFrame(r);
}
export function createServerCompatibilityClient({enabled=false,readScope,readSaved=null,evaluateProposal=null,monotonicNow=()=>performance.now(),wallNow=()=>Date.now(),schedule=setTimeout,cancel=clearTimeout}={}){
 let generation=0,frame=null,scope=null,accepted=null,status='unavailable';
 const listeners=new Set();let timer=null,notificationQueued=false;
 const notify=()=>{if(notificationQueued)return;notificationQueued=true;queueMicrotask(()=>{notificationQueued=false;for(const fn of listeners)fn();});};
 const stopTimer=()=>{if(timer!==null){cancel(timer);timer=null;}};
 function expired(){return accepted&&(monotonicNow()>=accepted.expiresMonotonic||wallNow()>=accepted.expiresWall);}
 function checkFreshness(){
  if(accepted&&expired()){stopTimer();accepted=null;status='expired';generation++;notify();}
  if(scope){try{if(scopeKey(readScope())!==scope)invalidate();}catch{invalidate();}}
  return status;
 }
 function armTimer(){stopTimer();if(!accepted)return;const delay=Math.max(0,Math.min(accepted.expiresMonotonic-monotonicNow(),accepted.expiresWall-wallNow(),2147483647));timer=schedule(()=>{timer=null;checkFreshness();if(accepted)armTimer();},delay);}
 function invalidate(){const changed=frame!==null||scope!==null||accepted!==null||status!=='unavailable';stopTimer();generation++;frame=null;scope=null;accepted=null;status='unavailable';if(changed)notify();}
 function requireCurrent(){
  if(!enabled||!scope||scopeKey(readScope())!==scope){invalidate();fail('STALE_CONTEXT');}
 }
 function accept(r,plan,ticket,key,started,expectedRequest=null,startedWall=wallNow()){
  if(ticket!==generation||scopeKey(readScope())!==key)fail('STALE_RESPONSE');
  const s=readScope(),newFrame=checkEnvelope(r,s),projection=recipeProjection(plan);
  if(frame&&stable(frame)!==stable(newFrame))fail('SOURCE_REVISION_CHANGED');
  if(expectedRequest!==null&&(r.request_key!==expectedRequest||stable(r.recipe_projection)!==stable(projection)))fail('PROPOSAL_RESPONSE_MISMATCH');
  if(expectedRequest===null&&stable(recipeProjection(r.guide))!==stable(projection))fail('SAVED_RECIPE_MISMATCH');
  const a=r.compatibility;
  if(!object(a)||a.publishable!==false||a.actorId!==s.userId||a.studentId!==s.studentId||a.organizationId!==s.organizationId||
   a.draftRevision!==r.draft_revision||!text(a.binding)||typeof a.compatibilityReady!=='boolean'||!Array.isArray(a.decisions))fail('SERVER_DECISION_MISSING');
  const evaluatedAt=Date.parse(r.evaluated_at),deadline=Date.parse(a.validUntil),elapsed=Math.max(monotonicNow()-started,wallNow()-startedWall);
  if(!Number.isFinite(evaluatedAt)||!Number.isFinite(deadline)||elapsed<0||deadline-evaluatedAt<=elapsed)fail('SERVER_DECISION_EXPIRED');
  const rows=projection.meals.flatMap(m=>m.items.map((i,index)=>({slot:m.slot,index,...i})));
  if(a.decisions.length!==rows.length)fail('SERVER_DECISION_COUNT');
  const decisions=a.decisions.map((d,i)=>{
   const row=rows[i];
   if(!object(d)||d.foodId!==row.id||d.qty!==row.qty||d.unit!==row.unit||!['green','yellow','red','neutral'].includes(d.color)||
    typeof d.eligible!=='boolean'||!text(d.reason)||!Array.isArray(d.conditions)||!d.conditions.every(text)||
    (['red','yellow'].includes(d.color)&&d.eligible))fail('SERVER_DECISION_IDENTITY');
   return {slot:row.slot,index:row.index,id:row.id,qty:row.qty,color:d.color,reason:d.reason,eligible:d.eligible,conditions:copy(d.conditions)};
  });
  if(a.compatibilityReady&&!decisions.every(d=>d.eligible))fail('SERVER_DECISION_INCONSISTENT');
  frame=copy(newFrame);scope=key;accepted={projection:stable(projection),decisions,binding:a.binding,ready:a.compatibilityReady,
   expiresMonotonic:started+deadline-evaluatedAt,expiresWall:startedWall+deadline-evaluatedAt};status='available';armTimer();notify();return copy(r);
 }
 async function run(plan,{saved=false}={}){
  if(!enabled)fail('SERVER_COMPATIBILITY_OFF');
  stopTimer();accepted=null;status='unavailable';
  if(saved?typeof readSaved!=='function':typeof evaluateProposal!=='function'){generation++;notify();fail('SERVER_OPERATION_UNAVAILABLE');}
  if(!saved)requireCurrent();
  const projection=recipeProjection(plan),s=copy(readScope()),key=scopeKey(s),ticket=++generation,started=monotonicNow(),startedWall=wallNow();
  // Bind the pending request context before notifying the renderer. A pending
  // review must not invalidate its own first load merely because no decision exists.
  const requestKey='view-'+ticket;scope=key;accepted=null;status='pending';notify();
  try{
   const r=saved?await readSaved():await evaluateProposal({studentId:s.studentId,expected:copy(frame),context:{sessionId:s.sessionId,sourceEpoch:s.sourceEpoch,organizationId:s.organizationId},requestKey,recipe:projection});
   return accept(r,plan,ticket,key,started,saved?null:requestKey,startedWall);
  }catch(e){if(ticket===generation){accepted=null;status='unavailable';notify();}throw e;}
 }
 function currentAssessment(plan){
  checkFreshness();
  try{requireCurrent();}catch{return null;}
  if(!accepted||status!=='available'||stable(recipeProjection(plan))!==accepted.projection||monotonicNow()>=accepted.expiresMonotonic)return null;
  return accepted;
 }
 return {
  refreshSaved:plan=>run(plan,{saved:true}),
  assessSelection:plan=>run(plan),assessEdit:plan=>run(plan),assessReview:plan=>run(plan),
  matchesInput:r=>{requireCurrent();return stable(checkEnvelope(r,readScope()))===stable(frame);},
  review(local,plan){
   const a=currentAssessment(plan);
   // Preserve quantity, unit, source, macros, target, shape and pattern guards.
   const issues=(local.issues||[]).filter(i=>i.code!=='compatibility');
   if(!a)issues.push({code:'server_pending',message:status==='pending'?'Verificando compatibilidad con el servidor…':'Compatibilidad pendiente de verificar.'});
   else if(!a.ready)issues.push({code:'server_compatibility',message:'Hay alimentos o condiciones pendientes de revisión.'});
   return {...copy(local),decisions:a?copy(a.decisions):[],issues,readyForReview:issues.length===0&&!!a?.ready,publishable:false};
  },
  commitEdit(editor){
   if(editor.mode!=='editing')fail('EDIT_NOT_OPEN');
   const review=this.review(editor.review,editor.working);if(!review.readyForReview||!review.normalizedPlan)fail('SERVER_REVIEW_REQUIRED');
   return {...copy(editor),working:copy(review.normalizedPlan),committed:copy(review.normalizedPlan),mode:'view',origin:'edited_draft',revision:editor.revision+1,publishable:false};
  },
  invalidate,status:checkFreshness,checkFreshness,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},dispose(){invalidate();listeners.clear();},
  bindingFor:plan=>currentAssessment(plan)?.binding??null
 };
}
