// SERVER ONLY. No browser import, credentials, HTTP listener or runtime installation.
import {createHash} from 'node:crypto';
import {evaluateGuideFood,patternConflict} from '../reference/guide-compatibility.mjs';
export const canonical=x=>JSON.stringify(sort(x));
function sort(x){if(Array.isArray(x))return x.map(sort);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])]));return x;}
export const digest=x=>createHash('sha256').update(typeof x==='string'?x:canonical(x)).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{code});};
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const text=x=>typeof x==='string'&&x.trim().length>0;
const numeric=x=>typeof x==='number'&&Number.isFinite(x);
export function contextRestrictions(c){
 if(!object(c)||!text(c.actorId)||!text(c.sessionId)||!text(c.organizationId)||!text(c.studentId)||
 c.actorId!==c.authorizedCoachId||c.organizationId!==c.studentOrganizationId||c.active!==true||
 c.processingConsent!==true||c.followupConsent!==true||c.shared!==true||c.documentCurrent!==true||c.revoked!==false)
 fail('DENIED');
 for(const key of ['healthRevision','intakeRevision','draftRevision'])if(!Number.isSafeInteger(c[key])||c[key]<1)fail('STALE_CONTEXT');
 if(!object(c.conditions))fail('MISSING_DECLARATION');
 const entries=Object.entries(c.conditions);
 if(!entries.length){if(c.declaration?.kind!=='none_declared'||c.declaration.declared_by!==c.studentId||c.declaration.source_revision!==c.healthRevision)fail('MISSING_DECLARATION');return [];}
 const restrictions=[];
 for(const [key,status] of entries){
  if(status==='not_reported')continue;
  if(!['confirmed','suspected'].includes(status))fail('UNSUPPORTED_DECLARATION');
  const mapped={celiac:'gluten',lactose_intolerance:'lactose_intolerance'}[key];
  if(!mapped)fail('UNSUPPORTED_DECLARATION');restrictions.push(mapped);
 }
 // An all-not_reported form is not an affirmative absence declaration.
 if(!restrictions.length)fail('MISSING_DECLARATION');
 return [...new Set(restrictions)].sort();
}
// Trusted manifest is loaded by repository from private server-managed storage,
// never supplied in request. Digest integrity does NOT by itself authenticate origin.
export function resolveEvidence(food,restriction,row,now,{testMode=false}={}){
 if(!row)return null;
 const {manifest,record,raw}=row;
 if(!object(manifest)||!object(record)||typeof raw!=='string'||manifest.active!==true||
 (!testMode&&manifest.environment!=='production')||
 !['official_product_capture','official_general_rule'].includes(manifest.captureMethod)||
 !text(manifest.sourceVersion)||!text(manifest.pipelineVersion)||
 !numeric(now)||!Number.isFinite(Date.parse(manifest.capturedAt))||Date.parse(manifest.capturedAt)>now||
 !Number.isFinite(Date.parse(manifest.reviewAfter))||Date.parse(manifest.reviewAfter)<=now||
 digest(raw)!==manifest.rawDigest||digest(record)!==manifest.normalizedDigest)return null;
 let url;try{url=new URL(manifest.sourceUrl);}catch{return null;}
 const expectedHosts=manifest.captureMethod==='official_product_capture'?['listadoalg.anmat.gob.ar']:['www.argentina.gob.ar','www.niddk.nih.gov'];
 if(url.protocol!=='https:'||url.username||url.password||!expectedHosts.includes(url.hostname))return null;
 if(record.foodId!==food.id||record.productId!==(food.productId??null)||record.preparation!==food.preparation||
 record.unit!==food.unit||record.restriction!==restriction||!text(record.id)||
 !numeric(record.minQty)||!numeric(record.maxQty)||record.minQty<=0||record.maxQty<record.minQty||
 !Array.isArray(record.conditions)||!record.conditions.length||!record.conditions.every(text))return null;
 if(record.basis==='verified_product'){
  // An ANMAT gluten listing is not evidence of lactose content.
  if(restriction!=='gluten'||manifest.captureMethod!=='official_product_capture'||!text(record.productId)||
   !text(record.rnpa)||record.listingStatus!=='Vigente'||record.verdict!=='compatible')return null;
 }else if(record.basis==='fresh_unseasoned'){
  if(restriction!=='gluten'||manifest.captureMethod!=='official_general_rule'||food.preparation!=='fresh_unseasoned'||
   food.productId!=null||record.verdict!=='compatible'||record.singleIngredient!==true)return null;
 }else if(record.basis==='documented_ingredient'){
  if(restriction!=='gluten'||record.verdict!=='contains'||manifest.captureMethod!=='official_general_rule')return null;
 }else return null;
 // Lactose-specific official product/label acquisition is not available yet.
 // A general NIDDK rule or ANMAT gluten entry cannot turn it green.
 return {status:'verified',id:record.id,url:manifest.sourceUrl,foodId:food.id,productId:food.productId??null,
 preparation:food.preparation,verdict:record.verdict,basis:record.basis,conditions:record.conditions,
 observedAt:manifest.capturedAt,expiresAt:manifest.reviewAfter,minQty:record.minQty,maxQty:record.maxQty,
 sourceVersion:manifest.sourceVersion,rawDigest:manifest.rawDigest,normalizedDigest:manifest.normalizedDigest};
}
function itemsFromPlan(plan){
 if(!object(plan)||!Array.isArray(plan.meals)||!plan.meals.length)fail('NO_SAVED_RECIPE');
 const items=plan.meals.flatMap(m=>Array.isArray(m.items)?m.items:[]);
 if(!items.length||items.length>150||items.some(i=>!text(i.id)||!numeric(i.qty)||i.qty<=0||!['g','ml'].includes(i.unit)))fail('INVALID_RECIPE');
 return items;
}
async function evaluate(tx,request,options){
 // Request has no source, conditions, verdict, actor, goal or nutrient fields.
 if(!object(request)||Object.keys(request).some(k=>!['studentId','draftRevision'].includes(k))||!text(request.studentId)||(!Number.isSafeInteger(request.draftRevision)||request.draftRevision<1))fail('INVALID_REQUEST');
 const c=await tx.context(request.studentId);const restrictions=contextRestrictions(c);
 if(c.studentId!==request.studentId||c.draftRevision!==request.draftRevision)fail('STALE_CONTEXT');
 const items=itemsFromPlan(c.plan),ids=[...new Set(items.map(i=>i.id))].sort();
 const rows=await tx.foods(ids),sources=await tx.evidence(ids,restrictions);
 const byId=new Map(rows.map(f=>[f.id,f]));if(byId.size!==rows.length)fail('DUPLICATE_IDENTITY');
 const decisions=[];let carbs=0;
 for(const item of items){
  const food=structuredClone(byId.get(item.id));
  if(!food||item.unit!==food.unit){decisions.push({foodId:item.id,qty:item.qty,color:'yellow',eligible:false,reason:'Falta identidad o unidad verificable.',conditions:[]});continue;}
  // Strip any evidence previously attached to food, including browser-like flags.
  delete food.glutenEvidence;delete food.lactoseEvidence;
  for(const restriction of restrictions){
   const matches=sources.filter(s=>s.record?.foodId===item.id&&s.record?.restriction===restriction);
   const e=matches.length===1?resolveEvidence(food,restriction,matches[0],c.now,options):null;
   if(e&&item.qty>=e.minQty&&item.qty<=e.maxQty)food[restriction==='gluten'?'glutenEvidence':'lactoseEvidence']=e;
  }
  const decision=evaluateGuideFood(food,{restrictions,dislikedIds:c.dislikedIds,pattern:c.pattern,goal:c.goal,qty:item.qty,now:c.now});
  decisions.push({foodId:item.id,qty:item.qty,unit:item.unit,...decision,evidenceIds:[food.glutenEvidence?.id,food.lactoseEvidence?.id].filter(Boolean)});
  if(numeric(food.c))carbs+=food.c*item.qty;
 }
 const conflict=patternConflict(c.goal,c.pattern);
 const dailyConflict=c.pattern?.kind==='keto'&&carbs>c.pattern.maxCarbG;
 const complete=decisions.every(d=>d.eligible)&&!conflict&&!dailyConflict;
 // Bind full persisted recipe/goal, original declaration, revisions, source and
 // composition values. Timestamp is excluded but expiry is reevaluated each time.
 const {now,...boundContext}=c;
 const binding=digest({context:boundContext,foods:rows,sources,decisions,conflict,dailyConflict});
 // Recheck after every data read before returning or storing; DB adapter holds locks.
 const again=await tx.context(request.studentId);contextRestrictions(again);
 const {now:ignored,...againBound}=again;if(canonical(againBound)!==canonical(boundContext))fail('STALE_CONTEXT');
 if(sources.some(s=>Date.parse(s.manifest?.reviewAfter)>c.now&&Date.parse(s.manifest?.reviewAfter)<=again.now)||rows.some(f=>Date.parse(f.composition?.expiresAt)>c.now&&Date.parse(f.composition?.expiresAt)<=again.now))fail('STALE_EVIDENCE');
 const deadlines=[...rows.map(f=>Date.parse(f.composition?.expiresAt)),...sources.map(s=>Date.parse(s.manifest?.reviewAfter))].filter(Number.isFinite);
 const validUntil=deadlines.length?Math.min(...deadlines):null;
 return {binding,validUntil,decisions,compatibilityReady:complete,conflict:conflict||(dailyConflict?'Revisar hidratos totales del día.':null),
 publishable:false,actorId:c.actorId,studentId:c.studentId,organizationId:c.organizationId,draftRevision:c.draftRevision};
}
export function createClinicalProvider(repository,{testMode=false}={}){
 const options={testMode};
 return {
  assess:request=>repository.transaction(tx=>evaluate(tx,request,options)),
  bindSavedDraft:request=>repository.transaction(async tx=>{const r=await evaluate(tx,request,options);await tx.putReceipt(r);return r;}),
  // MUST be invoked on the same transaction/connection as existing COACH119.
  // This only checks compatibility; it does NOT approve, publish or replace its gates.
  assertPublication:async(tx,request)=>{
   const r=await evaluate(tx,request,options),saved=await tx.receipt(request.studentId);
   if(!saved||saved.binding!==r.binding||saved.draftRevision!==r.draftRevision)fail('STALE_EVIDENCE');
   if(!r.compatibilityReady)fail('COMPATIBILITY_UNRESOLVED');
   const finalNow=await tx.clock(); // Actual server wall clock AFTER receipt await.
   if(!Number.isFinite(finalNow)||!Number.isFinite(r.validUntil)||finalNow>=r.validUntil)fail('STALE_EVIDENCE');
   return r;
  }
 };
}
