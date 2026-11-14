import {createReleaseJournal} from './professional-release-journal.mjs?v=ncc-dual-role-release-r5-20261107';
import {createCoachPlanDraftClient,validateCoachPlanProposal} from './coach-plan-draft-client.js?v=ncc-micro-restaurants-r1-20261114';
import {createCoachCalculatorPrefill} from './coach-intake-prefill.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
import {estimateMacros} from './macro-engine.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
import {generateFlexibleGuidedDay,removeFlexibleMeal,replaceFlexibleFood,guideFoodSignal} from './guided-day-v2.js?v=ncc-micro-restaurants-r1-20261114';
import {guideTotals,rebalanceGuidedDay} from './guided-day.js?v=ncc-micro-restaurants-r1-20261114';
import {applyCoachCatalog} from './coach-catalog-guide.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
import {readVerifiedCoachRestrictionScope} from './coach-guide-restriction-scope.js?v=ncc-micro-restaurants-r1-20261114';
import {buildNutritionReport} from './daily-report.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
import {validateReportPeriod} from './period-report.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
import {buildLuxuryPeriodReport,periodReportAsStoredText,parseLuxuryPeriodReport} from './coach-report-models.js?v=ncc-color-system-r1-20261112';
import {withReportTrendGoals,normalizeReportTrendGoals} from './report-trend-snapshot.js?v=ncc-weekly-preview-r11-20261106';
import {loadReportTrendGoals} from './report-trend-goals.js?v=ncc-weekly-preview-r11-20261106';
import {withReportFoodFrequency} from './report-food-frequency.js?v=ncc-weekly-preview-r11-20261106';
import {PERIOD_PDF_RENDERER_VERSION} from './period-report-pdf-version.js?v=ncc-report-gaps-r1-20261112';
export const PROFESSIONAL_COACH_TOOLS_ENABLED=false;
const fail=code=>{throw Object.assign(new Error(code),{code});};
const clone=x=>structuredClone(x);
const canonical=x=>{const sort=v=>v&&typeof v==='object'?Array.isArray(v)?v.map(sort):Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,sort(v[k])])):v;return JSON.stringify(sort(x));};
const slots=[['desayuno','Desayuno'],['media_manana','Media mañana'],['almuerzo','Almuerzo'],['media_tarde','Media tarde'],['merienda','Merienda'],['cena','Cena']];
const totals=log=>{const items=Object.entries(log.meals||{}).filter(([slot])=>!log.skipped?.[slot]).flatMap(([,rows])=>rows).concat(log.sports||[]);return Object.fromEntries(['k','p','c','f','fi'].map(k=>[k,items.reduce((sum,x)=>sum+(Number(x[k])||0),0)]));};
const value=async promise=>{const r=await promise;if(!r||r.error)throw Object.assign(Error('COACH_REQUEST_FAILED'),{code:r?.error?.code||'COACH_REQUEST_FAILED'});return r.data;};
const intakeKey=x=>JSON.stringify([x?.student_id,x?.organization_id,x?.revision,x?.updated_at,x?.shared_at]);
export function createProfessionalCoachTools({reader,enabled=PROFESSIONAL_COACH_TOOLS_ENABLED,journal,crypto=globalThis.crypto,loadSeedIds}={}){
 let client=null,epoch=0,disposed=false,storage=journal,state={status:'closed'},metadata={};
 const durable=()=>storage||=createReleaseJournal();
 function current(t=epoch){if(disposed||enabled!==true)fail(disposed?'DISPOSED':'FEATURE_DISABLED');if(t!==epoch||!client?.isCurrent())fail('STALE_COACH_TOOLS');}
 const scope=()=>client.scope;
 async function signed(t=epoch){current(t);await client.verify();current(t);}
 function snapshot(){if(enabled!==true)return {status:'disabled'};current();return clone(state);}
 const draftClient=()=>createCoachPlanDraftClient({sb:client.sdk,enabled:true,relaunchEnabled:true,versionedBackendVerified:true});
 async function freshIntake(t=epoch){await signed(t);const i=await value(client.sdk.from('efg_coach_relaunch_intakes').select('*').eq('completed_version','coach_major_2026_r1').not('shared_at','is',null).maybeSingle());current(t);if(!i||!Number.isSafeInteger(i.revision)||i.revision<1||!i.updated_at)fail('SHARED_INTAKE_REQUIRED');return i;}
 async function pending(){const t=epoch,out=[];for(const operation of ['savePlan','publishPlan','sendReport','reviewPayment']){const r=await durable().get(key(operation));current(t);if(r?.state==='uncertain')out.push({operation,id:r.id});}return out;}
 function key(operation){const s=scope(),namespace=JSON.stringify([s.backendOrigin,s.userId,s.organizationId]);return JSON.stringify([namespace,operation,s.studentId]);}
 async function record(operation,payload){const s=scope(),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(payload)))),x=>x.toString(16).padStart(2,'0')).join('');current();return {claimId:crypto.randomUUID(),key:key(operation),namespace:JSON.stringify([s.backendOrigin,s.userId,s.organizationId]),operation,id:crypto.randomUUID(),studentId:s.studentId,senderId:s.userId,digest};}
 async function mutate(operation,payload,write,verify){const t=epoch;await signed(t);let reserved=false,claim=null;try{const r=await record(operation,payload);claim=r;current(t);reserved=await durable().reserve(r);if(!reserved)fail('COACH_OPERATION_PENDING');await signed(t);const result=await write(r);current(t);const checked=await verify(result,r);current(t);await signed(t);if(!await durable().settle(r))fail('JOURNAL_FAILED');current(t);return checked;}catch(e){if(t===epoch&&reserved&&claim)state.pending=[...(state.pending||[]).filter(x=>x.operation!==operation),{operation,id:claim.id}];throw Object.assign(Error(e.code||e.message),{code:e.code||'COACH_OPERATION_FAILED',outcome:reserved||e.code==='COACH_OPERATION_PENDING'?'uncertain':'not_applied'});}}
 async function open(studentId,labels={}){if(disposed||enabled!==true)fail(disposed?'DISPOSED':'FEATURE_DISABLED');const t=++epoch;client=null;state={status:'loading'};metadata=clone(labels);const selected=await reader.studentClient(studentId);if(t!==epoch)fail('STALE_COACH_TOOLS');client=selected;const sb=client.sdk;
  const [intake,draft,goals,plan,payments,reports]=await Promise.all([
   value(sb.from('efg_coach_relaunch_intakes').select('*').eq('completed_version','coach_major_2026_r1').not('shared_at','is',null).maybeSingle()),
   value(sb.from('efg_coach_plan_drafts').select('*').maybeSingle()),value(sb.from('efg_goals').select('*').order('start_on',{ascending:false}).limit(100)),
   value(sb.from('efg_food_plans').select('*').maybeSingle()),value(sb.from('efg_payments').select('*').order('created_at',{ascending:false}).limit(100)),
   value(sb.from('efg_period_reports').select('*').order('created_at',{ascending:false}).limit(100))]);
  current(t);const freshDraft=draft&&intake&&draft.source_intake_revision===intake.revision&&draft.source_intake_updated_at===intake.updated_at;let restored=null;if(freshDraft&&draft.goal_proposal&&draft.guide_proposal)restored=validateCoachPlanProposal(draft.goal_proposal,draft.guide_proposal);state={status:'ready',scope:scope(),intake,draft:draft&&!freshDraft?{draft_revision:draft.draft_revision,status:'stale'}:draft,goals,plan,payments,reports,goal:restored?.goal||null,guide:restored?.guide||null,catalog:[],calculation:null,dirty:false,report:null,pending:await pending()};current(t);return snapshot();
 }
 function mutablePlan(){current();if(state.pending?.some(x=>['savePlan','publishPlan'].includes(x.operation)))fail('COACH_OPERATION_PENDING');}
 async function calculate(input){mutablePlan();const t=epoch,i=await freshIntake(t);if(intakeKey(i)!==intakeKey(state.intake))fail('INTAKE_CHANGED');const estimate=estimateMacros(input);current(t);state.calculation=estimate;state.goal={goal_type:estimate.goal,kcal:estimate.kcal,protein_g:estimate.protein,carb_g:estimate.carbs,fat_g:estimate.fat,fiber_g:estimate.fiber};state.guide=null;state.dirty=true;return snapshot();}
 function setGoal(goal){mutablePlan();if(!goal||!['fat_loss','recomp','muscle_gain','maintenance'].includes(goal.goal_type)||!['kcal','protein_g','carb_g','fat_g','fiber_g'].every(k=>Number.isSafeInteger(goal[k])))fail('INVALID_GOAL');state.goal=clone(goal);state.guide=null;state.dirty=true;return snapshot();}
 async function generate({windowId='regular'}={}){mutablePlan();const t=epoch;if(!state.goal)fail('GOAL_REQUIRED');const i=await freshIntake(t);if(intakeKey(i)!==intakeKey(state.intake))fail('INTAKE_CHANGED');
  const ids=loadSeedIds?await loadSeedIds():Object.keys((await(await fetch(new URL('../catalog/guide-catalog.json',import.meta.url))).json()).foods);current(t);
  if(!Array.isArray(ids)||ids.length<1||ids.length>2000||new Set(ids).size!==ids.length)fail('INVALID_CATALOG');
  let version=null;const foods=[];for(let start=0;start<ids.length;start+=90){const data=await value(client.sdk.rpc('efg_coach_guide_catalog',{p_student:scope().studentId,p_food_ids:ids.slice(start,start+90)}));current(t);applyCoachCatalog({meals:[]},data);const requested=ids.slice(start,start+90);if(data.foods.length!==requested.length||data.foods.some(f=>!requested.includes(f.id)))fail('CATALOG_INCOMPLETE');if(version&&version!==data.version)fail('CATALOG_CHANGED');version=data.version;foods.push(...data.foods);}
  let h=await value(client.sdk.rpc('efg_get_coach_health_intake',{p_student:scope().studentId}));current(t);
  if(h&&(h.student_id!==scope().studentId||h.organization_id!==scope().organizationId||h.viewer_id!==scope().userId))fail('HEALTH_SCOPE_MISMATCH');
  const health=readVerifiedCoachRestrictionScope(h,{studentId:scope().studentId,organizationId:scope().organizationId,coachId:scope().userId});
  const generated=generateFlexibleGuidedDay(foods,state.goal,{dietaryPattern:i.dietary_pattern,windowId,restrictionStatus:health.restrictionStatus,restrictions:health.restrictions,restrictionReviewNotes:health.reviewNotes,...(health.verified?{restrictionSource:{studentId:scope().studentId,organizationId:scope().organizationId,revision:h.revision,status:health.restrictionStatus}}:{})});
  const guide=applyCoachCatalog(generated,{version,foods});const clean=validateCoachPlanProposal(state.goal,guide);current(t);state.catalog=foods;state.profile={dietaryPattern:i.dietary_pattern,restrictionStatus:health.restrictionStatus,restrictions:health.restrictions};state.guide=clean.guide;state.goal=clean.goal;state.dirty=true;return snapshot();
 }
 function edit({kind,slot,index,foodId,qty,reviewed=false}){mutablePlan();if(!state.guide||!state.goal)fail('GUIDE_REQUIRED');let g=clone(state.guide);
  if(kind==='removeMeal')g=removeFlexibleMeal(g,slot,state.goal);
  else if(kind==='replace'){const food=state.catalog.find(x=>x.id===foodId);if(guideFoodSignal(food,state.profile||{restrictionStatus:'unknown'}).status!=='possible'&&!reviewed)fail('FOOD_REVIEW_REQUIRED');g=replaceFlexibleFood(g,slot,index,food,state.catalog,state.goal);}
  else if(kind==='quantity'){const item=g.meals.find(m=>m.slot===slot)?.items[index];if(!item||!Number.isFinite(qty)||qty<=0)fail('INVALID_QUANTITY');item.qty=qty;item.locked=true;g=rebalanceGuidedDay(g,state.goal);}
  else fail('INVALID_GUIDE_EDIT');state.guide=validateCoachPlanProposal(state.goal,g).guide;state.dirty=true;return snapshot();
 }
 async function save({reviewed=false}={}){mutablePlan();if(!reviewed||!state.goal||!state.guide)fail('PLAN_REVIEW_REQUIRED');const t=epoch;const clean=validateCoachPlanProposal(state.goal,state.guide),args={studentId:scope().studentId,sourceUpdatedAt:state.intake.updated_at,sourceRevision:state.intake.revision,expectedRevision:state.draft?.draft_revision??null,...clean};
  const saved=await mutate('savePlan',args,()=>draftClient().save(args),async result=>{const back=await draftClient().load(scope().studentId);current(t);if(!back||back.draft_revision!==result.revision||canonical(back.goal_proposal)!==canonical(clean.goal)||canonical(back.guide_proposal)!==canonical(clean.guide))fail('DRAFT_READBACK_MISMATCH');return back;});
  current(t);state.draft=saved;state.dirty=false;state.pending=await pending();return snapshot();
 }
 async function publicationReceipt(requestId,revision){const row=await value(client.sdk.rpc('ncc_professional_plan_receipt_v1',{p_org:scope().organizationId,p_student:scope().studentId,p_request_id:requestId}));if(!row||row.request_id!==requestId||row.student_id!==scope().studentId||row.coach_id!==scope().userId||row.organization_id!==scope().organizationId||(!Number.isSafeInteger(Number(row.draft_revision))||Number(row.draft_revision)<1||revision!==null&&Number(row.draft_revision)!==revision)||typeof row.goal_id!=='string')fail('PUBLICATION_UNRESOLVED');return row;}
 async function publish({confirmed=false}={}){current();if(!confirmed||state.dirty||state.draft?.status!=='draft')fail('PLAN_REVIEW_REQUIRED');const t=epoch,revision=Number(state.draft.draft_revision),payload={studentId:scope().studentId,expectedRevision:revision};
  const receipt=await mutate('publishPlan',payload,r=>draftClient().publish({...payload,requestId:r.id,confirmed:true}),async(result,r)=>{const row=await publicationReceipt(r.id,revision);if(row.goal_id!==result.goalId)fail('PUBLICATION_RECEIPT_MISMATCH');return row;});current(t);state.draft={...state.draft,status:'published'};state.pending=await pending();return clone(receipt);
 }
 async function reconcilePublication(){const t=epoch;await signed(t);const r=await durable().get(key('publishPlan'));current(t);if(!r||r.state!=='uncertain')fail('NO_PENDING_PUBLICATION');const row=await publicationReceipt(r.id,null);const expected=await record('publishPlan',{studentId:scope().studentId,expectedRevision:Number(row.draft_revision)});current(t);if(expected.digest!==r.digest)fail('PUBLICATION_RECEIPT_MISMATCH');await signed(t);if(!await durable().settle(r))fail('JOURNAL_FAILED');current(t);state.pending=await pending();return clone(row);}
 async function report({from,to,today}){const t=epoch;current();if(state.pending?.some(x=>x.operation==='sendReport'))fail('COACH_OPERATION_PENDING');validateReportPeriod(from,to,today);const rows=await value(client.sdk.from('efg_daily_logs').select('*').gte('log_day',from).lte('log_day',to).order('log_day').limit(91));
  const history=normalizeReportTrendGoals(await loadReportTrendGoals(client.sdk,scope().studentId,from,to,()=>current(t)));current(t);const days=rows.map(log=>buildNutritionReport([log],slots,totals,today,null).days[0]);const next=new Date(to+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);
  state.report=withReportTrendGoals(withReportFoodFrequency(buildLuxuryPeriodReport({from,to,friday:next.toISOString().slice(0,10),studentName:metadata.studentName,coachName:metadata.coachName,days,goals:history,logs:rows}),rows),history);current(t);return clone(state.report);
 }
 function reviewedReport({conclusion,flexibleNote}={}){current();if(!state.report)fail('REPORT_REQUIRED');const text=periodReportAsStoredText({...state.report,pdfRendererVersion:PERIOD_PDF_RENDERER_VERSION},conclusion??state.report.conclusion,flexibleNote??state.report.flexibleNote);const model=parseLuxuryPeriodReport(text);if(!model)fail('INVALID_REPORT');state.report=clone(model);return {text,model};}
 async function shareReport(serialized,{reviewed=false}={}){current();if(!reviewed)fail('REPORT_REVIEW_REQUIRED');const model=parseLuxuryPeriodReport(serialized);if(!model||!state.report||model.from!==state.report.from||model.to!==state.report.to||!model.daysRecorded)fail('REPORT_REVIEW_REQUIRED');const t=epoch,payload={period_from:model.from,period_to:model.to,report_text:serialized};
  const row=await mutate('sendReport',payload,r=>value(client.sdk.from('efg_period_reports').insert({id:r.id,student_id:scope().studentId,coach_id:scope().userId,...payload}).select('*').single()),async(result,r)=>{if(result?.id!==r.id||result.report_text!==serialized)fail('REPORT_RECEIPT_MISMATCH');return result;});current(t);state.reports.unshift(row);state.pending=await pending();return clone(row);
 }
 async function reconcileReport(){const t=epoch;await signed(t);const r=await durable().get(key('sendReport'));current(t);if(!r||r.state!=='uncertain')fail('NO_PENDING_REPORT');const row=await value(client.sdk.from('efg_period_reports').select('*').eq('id',r.id).maybeSingle());if(!row||!parseLuxuryPeriodReport(row.report_text))fail('REPORT_UNRESOLVED');const expected=await record('sendReport',{period_from:row.period_from,period_to:row.period_to,report_text:row.report_text});if(expected.digest!==r.digest)fail('REPORT_RECEIPT_MISMATCH');await signed(t);if(!await durable().settle(r))fail('JOURNAL_FAILED');current(t);state.pending=await pending();return clone(row);}
 async function confirmPayment(paymentId,status){const t=epoch;const row=await mutate('reviewPayment',{paymentId,status},()=>client.payment(paymentId,status),r=>r);current(t);state.payments=state.payments.map(x=>x.id===row.id?row:x);state.pending=await pending();return clone(row);}
 function assertCanLeave(){current();if(state.dirty)fail('UNSAVED_COACH_PLAN');}
 return Object.freeze({open,snapshot,calculate,setGoal,generate,edit,save,publish,reconcilePublication,report,reviewedReport,shareReport,reconcileReport,confirmPayment,receiptUrl:id=>client.receiptUrl(id),assertCanLeave,
  prefill(){current();return createCoachCalculatorPrefill({intake:state.intake,studentId:scope().studentId,coachAuthorized:true,requiredIntakeVersion:'coach_major_2026_r1'});},
  invalidate(){epoch++;client=null;state={status:'closed'};},dispose(){disposed=true;epoch++;client=null;state={status:'closed'};}});
}
