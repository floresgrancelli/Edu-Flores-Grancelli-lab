// Pure handler tests with synthetic dependencies. NOT browser or real-render QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {resolveCoachGuideWindow,assertGuideWindowApplied} from '../pilot/coach-guide-schedule.js';
import {readFileSync} from 'node:fs';
import {applyPilotReviewedSources,loadPilotReviewedGuide} from '../pilot/coach-reviewed-sources.js';
const source=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const extract=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
// Execute the real schedule resolver and guard, not a no-op test substitute.
const scheduleHelpers=extract('function coachGuideWindowScope(){','function currentCoachGuideProfile(){')+
 extract('function activeCoachGuideGoal(){','// PERSISTED_COACH_SCOPE_BEGIN');
function mountScheduleHelpers(context){
 Object.assign(context,{resolveCoachGuideWindow,assertGuideWindowApplied,COACH_ATOMIC_PLAN_UI_ENABLED:true});
 vm.runInContext(scheduleHelpers,context);
}
function fixture({confirm=true,fail=null,renderFail=false,stale=false}={}){
 const draft={status:'draft',draft_revision:1},intake={shared_at:'x'},guide={kind:'flexible_meal_guide',meals:[]};
 const state={selectedStudent:'student',session:{user:{id:'coach'}},consent:{accepted:true},coachPlanDraftRecord:draft,coachIntakeForms:{student:intake},pendingGoal:{kcal:2000},coachGuidedDraft:guide,tab:'coachIntake',coachPlanPublishRequestId:'same-key'};
 const trace={publishes:0,renders:0,removed:0,focused:0,notifications:[]},panel={isConnected:true,hidden:true};
 const context={state,COACH_ATOMIC_PLAN_UI_ENABLED:true,foods:[],root:{querySelector:s=>s==='#coachRosterSection'?{focus:()=>trace.focused++,scrollIntoView(){}}:panel},document:{getElementById:()=>({remove:()=>trace.removed++})},window:{confirm:()=>confirm},readGuidedEditor:()=>guide,approvedFoodGuide:g=>g,assessCoachDraftPublication:()=>({ready:true}),coachFoodChoicesFromDom:()=>[],coachDraftWorkspaceCurrent:()=>!stale,coachDraftClient:{publish:async()=>{trace.publishes++;if(fail)throw fail;}},render:async()=>{trace.renders++;if(renderFail)throw Error('view failed');},notify:s=>trace.notifications.push(s),coachGuidePreview:{},createCoachPublicationRequestId:()=> 'new-key'};
 vm.createContext(context);mountScheduleHelpers(context);vm.runInContext(extract('function coachPublicationFailureMessage','function activeCoachGuideGoal'),context);
 return {context,state,trace,panel};
}
test('cancel leaves draft, selection and request key unchanged',async()=>{const {context,state,trace}=fixture({confirm:false});const r=await context.publishCoachAtomicDraft();assert.equal(r.status,'cancelled');assert.equal(trace.publishes,0);assert.equal(state.selectedStudent,'student');assert.equal(state.coachPlanDraftRecord.status,'draft');assert.equal(state.coachPlanPublishRequestId,'same-key');});
test('nutrition rejection keeps draft and same key; no navigation',async()=>{const f=fixture({fail:Error('Guide foods are not independently reviewed and current')});await assert.rejects(f.context.publishCoachAtomicDraft());assert.equal(f.state.coachPlanDraftRecord.status,'draft');assert.equal(f.state.selectedStudent,'student');assert.equal(f.state.coachPlanPublishRequestId,'same-key');assert.equal(f.trace.renders,0);assert.match(f.panel.textContent,/No se publicó: falta completar/);});
test('unknown transport failure is not claimed as rejection or success',async()=>{const f=fixture({fail:Error('network')});await assert.rejects(f.context.publishCoachAtomicDraft());assert.match(f.panel.textContent,/No se confirmó/);assert.equal(f.state.coachPlanPublishRequestId,'same-key');});
test('legacy health-declaration rejection preserves draft and reports optional-policy mismatch',async()=>{const f=fixture({fail:Error('P28: current shared health declaration required')});await assert.rejects(f.context.publishCoachAtomicDraft());assert.match(f.panel.textContent,/circuito opcional de restricciones/);assert.equal(f.state.selectedStudent,'student');assert.equal(f.state.coachPlanDraftRecord.status,'draft');assert.equal(f.state.coachPlanPublishRequestId,'same-key');assert.equal(f.trace.renders,0);});
test('success moves to list only after receipt and disables draft resend',async()=>{const f=fixture();const r=await f.context.publishCoachAtomicDraft();assert.equal(r.status,'published');assert.equal(f.state.tab,'coachStudents');assert.equal(f.state.selectedStudent,null);assert.equal(f.state.coachPlanDraftRecord.status,'published');assert.equal(f.trace.removed,1);assert.equal(f.trace.focused,1);await assert.rejects(f.context.publishCoachAtomicDraft(),/No hay un borrador/);assert.equal(f.trace.publishes,1);});
test('render failure after commit remains published and cannot resend',async()=>{const f=fixture({renderFail:true});const r=await f.context.publishCoachAtomicDraft();assert.equal(r.status,'published');assert.equal(r.viewUpdated,false);assert.equal(f.state.coachPlanDraftRecord.status,'published');assert.match(f.trace.notifications[0],/No hace falta reenviar/);});
test('stale workspace cannot publish or navigate',async()=>{const f=fixture({stale:true});await assert.rejects(f.context.publishCoachAtomicDraft(),/Cambió la ficha/);assert.equal(f.trace.publishes,0);assert.equal(f.state.selectedStudent,'student');});
const guide={meals:[{items:[{id:'egg',name:'Huevo',unit:'g',qty:150,k:1,p:.1,c:.01,f:.08,fi:0}]}]};
const row={...guide.meals[0].items[0],scope:'pilot_real',sourceApprovalId:'synthetic_egg',sourceUrl:'https://example.invalid/egg',reviewedAt:'2026-01-01',expiresAt:'2030-01-01'};
test('approved references hydrate only a copy, preserve quantities',()=>{const before=JSON.stringify(guide);const result=applyPilotReviewedSources(guide,[row]);assert.equal(result.meals[0].items[0].sourceApprovalId,row.sourceApprovalId);assert.equal(result.meals[0].items[0].qty,150);assert.equal(JSON.stringify(guide),before);});
test('missing, expired, QA, mismatched units fail closed',()=>{for(const rows of [[],[{...row,expiresAt:'2020-01-01'}],[{...row,scope:'qa'}],[{...row,unit:'ml'}]])assert.throws(()=>applyPilotReviewedSources(guide,rows));});
test('source response after navigation rejected without modifying draft',async()=>{let current=true;const client={rpc:async()=>{current=false;return {data:[row],error:null};}};await assert.rejects(loadPilotReviewedGuide(client,{studentId:'synthetic',guide,isCurrent:()=>current}),/Cambió la sesión/);assert.equal(guide.meals[0].items[0].sourceApprovalId,undefined);});
test('real editor reader rounds edited 3.3 eggs to 3 before manual lock',()=>{
 const food={id:'egg',unit:'g',qty:100},input={dataset:{guideqty:'desayuno:0',guidedisplay:'2',guideoriginal:'100'},value:'3.3'};
 const c={state:{coachGuidedDraft:{meals:[{slot:'desayuno',items:[food]}]}},document:{querySelectorAll:()=>[input],getElementById:()=>null},guidePortion:()=>({grams:50}),guidedCountablePortion:()=>({grams:50,min:50,max:150}),recipeIngredientLimits:()=>null,guidedPortionBounds:()=>[50,150]};
 vm.createContext(c);mountScheduleHelpers(c);vm.runInContext(extract('function readGuidedEditor','function updateGuidedTotalsUI'),c);c.readGuidedEditor();assert.equal(food.qty,150);assert.equal(food.locked,true);assert.equal(input.value,'3');
});
test('navigation while publication is pending does not steal the current tab',async()=>{
 const f=fixture();f.context.coachDraftClient.publish=async()=>{f.state.tab='messages';f.trace.publishes++;};const r=await f.context.publishCoachAtomicDraft();assert.equal(r.status,'published');assert.equal(r.viewUpdated,false);assert.equal(f.state.tab,'messages');assert.equal(f.trace.renders,0);
});
test('real preview send handler displays cancelled outcome and re-enables buttons',async()=>{
 const button={disabled:false},error={hidden:false},status={textContent:''};const dialog={isConnected:true,querySelectorAll:()=>[button],querySelector:s=>s==='[data-coach-preview-error]'?error:status};const preview={studentId:'student',intake:{}};
 const c={coachGuideSendBusy:false,coachGuidePreview:preview,document:{getElementById:()=>dialog},coachGuidePreviewCurrent:()=>true,state:{coachGuidedDraft:{kind:'flexible_meal_guide'},pendingGoal:{}},foods:[],root:{},approvedFoodGuide:g=>g,assessCoachDraftPublication:()=>({ready:true}),publishCoachAtomicDraft:async()=>({status:'cancelled'})};vm.createContext(c);mountScheduleHelpers(c);vm.runInContext(extract('async function sendCoachGuidePreview','function createCoachPublicationRequestId'),c);await c.sendCoachGuidePreview();assert.match(status.textContent,/Envío cancelado/);assert.equal(button.disabled,false);assert.equal(c.coachGuideSendBusy,false);
});
for(const edited of ['note','egg'])test('source reply preserves uncommitted '+edited+' control edits',async()=>{
 const item={id:'egg',name:'Huevo',unit:'g',qty:150,k:1,p:.1,c:.01,f:.08,fi:0};const plan={kind:'flexible_meal_guide',meals:[{items:[item]}]};const goal={kcal:2000};const intake={shared_at:'x'};
 const controls=[{value:'Nota original',checked:false},{value:'3',checked:false}],editor={querySelectorAll:()=>controls};let rebalanced=0;
 const c={state:{selectedStudent:'synthetic',session:{user:{id:'coach'}},coachIntakeForms:{synthetic:intake},consent:{accepted:true},pendingGoal:goal,coachGuidedDraft:plan,tab:'coachStudents'},root:{querySelector:()=>editor},coachGuideSendBusy:false,COACH_ATOMIC_PLAN_UI_ENABLED:true,readGuidedEditor:()=>plan,validateGuidedDay(){},qaReviewedSourcesAllowed:()=>false,structuredClone,loadPilotReviewedGuide,rebalanceGuidedDay(){rebalanced++;},sb:{rpc:async()=>{controls[edited==='note'?0:1].value=edited==='note'?'Nota recién escrita':'3.3';return {data:[row],error:null};}}};
 vm.createContext(c);mountScheduleHelpers(c);vm.runInContext(extract('async function previewCoachGuide','function coachGuidePreviewCurrent'),c);
 await assert.rejects(c.previewCoachGuide(),/Cambió la sesión/);assert.equal(rebalanced,0);assert.equal(c.state.coachGuidedDraft,plan);assert.equal(controls[edited==='note'?0:1].value,edited==='note'?'Nota recién escrita':'3.3');assert.equal(c.coachGuideSendBusy,false);
});

test('pending schedule change blocks actual publication handler before confirmation or transport',async()=>{
 const f=fixture();f.state.coachGuidedDraft.windowId='regular';
 f.state.coachGuideWindowSelection={scope:f.context.coachGuideWindowScope(),windowId:'16_8'};
 let confirmations=0;f.context.window.confirm=()=>{confirmations++;return true;};
 await assert.rejects(f.context.publishCoachAtomicDraft(),/Regenerá/);
 assert.equal(confirmations,0);assert.equal(f.trace.publishes,0);assert.equal(f.trace.renders,0);
 assert.equal(f.state.coachPlanDraftRecord.status,'draft');
 assert.equal(f.state.coachPlanPublishRequestId,'same-key');
 assert.equal(f.state.coachGuidedDraft.windowId,'regular','Pending selection must not relabel existing meals');
 f.state.coachGuideWindowSelection.windowId='regular';
 const result=await f.context.publishCoachAtomicDraft();
 assert.equal(result.status,'published');assert.equal(confirmations,1);assert.equal(f.trace.publishes,1);
});
test('real editor schedule guard preserves pending food input and existing quantities',()=>{
 const food={id:'egg',unit:'g',qty:100},input={dataset:{guideqty:'desayuno:0',guidedisplay:'2',guideoriginal:'100'},value:'3.3'};
 const state={selectedStudent:'student',coachGuidedDraft:{windowId:'regular',meals:[{slot:'desayuno',items:[food]}]}};
 const c={state,document:{querySelectorAll:()=>[input],getElementById:()=>null},guidePortion:()=>({grams:50}),guidedCountablePortion:()=>({grams:50,min:50,max:150}),recipeIngredientLimits:()=>null,guidedPortionBounds:()=>[50,150]};
 vm.createContext(c);mountScheduleHelpers(c);vm.runInContext(extract('function readGuidedEditor','function updateGuidedTotalsUI'),c);
 state.coachGuideWindowSelection={scope:c.coachGuideWindowScope(),windowId:'16_8'};
 assert.throws(()=>c.readGuidedEditor(),/Regenerá/);
 assert.equal(food.qty,100);assert.equal(food.locked,undefined);assert.equal(input.value,'3.3');
 state.coachGuideWindowSelection.windowId='regular';c.readGuidedEditor();
 assert.equal(food.qty,150);assert.equal(food.locked,true);assert.equal(input.value,'3');
});
